// ============================================
// EUPHORIA — Servicio de Comandas
// ============================================
const express = require('express')
const router = express.Router()
const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('cloudinary').v2
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { emitirConfigActualizada, emitirRecurso } = require('../../utilidades/config-runtime')

// Configuración de Multer para comprobantes
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'euphoria_comprobantes' }
})
const upload = multer({ storage })

const Tesseract = require('tesseract.js')
const { analizarComprobante, analizarComprobanteRobusto, TITULAR_POR_DEFECTO } = require('../../utilidades/ocr-comprobantes')
const { leerConfigPremio } = require('../../utilidades/premio-perfil')
const { notificar } = require('../../utilidades/notificaciones')

// Titular de la cuenta receptora, editable en la tabla configuracion
// (clave 'ocr_titular_destino'; admite varios nombres separados por |).
// Se auto-siembra en el primer uso para que aparezca en la BD.
async function obtenerTitularDestino() {
  try {
    const fila = await prisma.configuracion.findUnique({ where: { clave: 'ocr_titular_destino' } })
    if (fila?.valor) return fila.valor
    await prisma.configuracion.create({
      data: {
        clave: 'ocr_titular_destino',
        valor: TITULAR_POR_DEFECTO,
        descripcion: 'Titular(es) de la cuenta receptora para validar comprobantes OCR (separar alias con |)',
      },
    }).catch(() => {})
  } catch (e) { /* respaldo abajo */ }
  return TITULAR_POR_DEFECTO
}

// ---- Worker de OCR REUTILIZABLE ----
// Tesseract.recognize() creaba un motor nuevo y cargaba los modelos de idioma
// (varios MB) EN CADA comprobante -> ese era el costo real (no el tamaño de la
// imagen). Reutilizando un worker, el modelo se carga UNA sola vez y las
// siguientes lecturas son mucho más rápidas.
let _ocrWorker = null
let _ocrWorkerPromise = null
async function obtenerWorkerOCR() {
  if (_ocrWorker) return _ocrWorker
  if (!_ocrWorkerPromise) {
    _ocrWorkerPromise = Tesseract.createWorker('spa+eng')
      .then(w => { _ocrWorker = w; return w })
      .catch(e => { _ocrWorkerPromise = null; throw e })
  }
  return _ocrWorkerPromise
}

// Distancia de edición (Levenshtein) para tolerar 1-2 errores del OCR al comparar
// números de transacción (ej. 0/O, 8/B, 1/I) y no dejar reusar el MISMO comprobante.
function distanciaEdicion(a, b) {
  a = String(a || ''); b = String(b || '')
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c)
    }
  }
  return dp[m][n]
}

// POST /api/comandas/validar-comprobante (IA OCR Real para comprobantes)
router.post('/validar-comprobante', verificarToken, upload.single('comprobante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Comprobante no proporcionado' })
    
    const montoEsperado = parseFloat(req.body.monto_esperado || 0)
    if (!montoEsperado || isNaN(montoEsperado)) {
      return res.status(400).json({ error: 'Monto esperado de la comanda no especificado' })
    }

    // 1. OCR ROBUSTO multi-pasada con el worker REUTILIZABLE (spa+eng): varias
    //    lecturas con preprocesamientos distintos (gris/contraste, binarizada,
    //    ampliada) y fusión de campos entre pasadas. Prioridad del negocio:
    //    que FUNCIONE aunque tarde. La imagen se descarga UNA vez de Cloudinary
    //    (multer la subió ahí) porque el preprocesamiento necesita los bytes.
    const worker = await obtenerWorkerOCR()
    const titular = await obtenerTitularDestino()
    let analisis
    try {
      const resp = await fetch(req.file.path)
      if (!resp.ok) throw new Error(`descarga ${resp.status}`)
      const bufferImg = Buffer.from(await resp.arrayBuffer())
      analisis = await analizarComprobanteRobusto(bufferImg, montoEsperado, worker, new Date(), { titular })
    } catch (e) {
      // Respaldo: si la descarga falla, una sola pasada directa desde la URL
      console.warn('[OCR] sin bytes para multi-pasada, pasada única:', e.message)
      const { data: { text } } = await worker.recognize(req.file.path)
      analisis = analizarComprobante(text.replace(/\s+/g, ' '), montoEsperado, new Date(), { titular })
    }

    if (process.env.DEBUG_OCR === 'true') {
      console.log(`[OCR] Monto esperado: Bs. ${montoEsperado} · pasada: ${analisis.pasada || 'única'} · fusionado: ${!!analisis.fusionado}`)
    }

    // Pasos que ve el cliente, en orden: banco → monto → transacción → fecha →
    // destino (→ no repetido al final). El paso 'banco' SIEMPRE va en ok:true:
    // identificar el banco no es un fallo, y la genérica también es válida (solo
    // cambia la etiqueta). Los campos en null (no aplican al banco) se omiten.
    const campos = analisis.campos || {}
    const pasos = [{
      clave: 'banco',
      etiqueta: analisis.banco ? `Banco: ${analisis.nombreBanco}` : 'Banco no registrado · validación genérica',
      ok: true,
    }]
    const agregarPaso = (clave, etiqueta) => {
      if (campos[clave] !== null && campos[clave] !== undefined) pasos.push({ clave, etiqueta, ok: !!campos[clave] })
    }
    agregarPaso('monto', 'Monto correcto')
    agregarPaso('transaccion', 'N° de transacción')
    agregarPaso('fecha', 'Comprobante de hoy')
    // En bancos sin motivo (Yape) el destino solo puede ser el destinatario.
    agregarPaso('destino', analisis.sinMotivo ? 'Destinatario correcto' : 'Pago a Euphoria')
    console.log(`[OCR] banco:${analisis.banco || '-'} ok:${analisis.ok} TX:${analisis.transaccionId || '-'} | ${pasos.map(p => p.clave + '=' + (p.ok ? 1 : 0)).join(' ')}`)

    if (!analisis.ok) {
      return res.status(400).json({ valido: false, error: analisis.error, pasos })
    }
    const transaccionId = analisis.transaccionId

    // 3. NO REUSAR el mismo comprobante: mismo MONTO + N° de transacción casi
    //    idéntico (tolera 2 errores del OCR, que hacían pasar el mismo comprobante
    //    varias veces por leerse un poco distinto entre foto y foto).
    const marcaMonto = `|M:${montoEsperado}`
    const [comSim, recSim] = await Promise.all([
      prisma.comanda.findMany({ where: { comprobante_url: { contains: marcaMonto } }, select: { comprobante_url: true } }),
      prisma.recarga_billetera.findMany({ where: { comprobante_url: { contains: marcaMonto } }, select: { comprobante_url: true } }),
    ])
    const txDeUrl = (url) => (String(url || '').match(/\|TX:([^|]+)/)?.[1] || '')
    const duplicado = [...comSim, ...recSim].some(r => {
      const otro = txDeUrl(r.comprobante_url)
      return otro && distanciaEdicion(otro.toUpperCase(), transaccionId.toUpperCase()) <= 2
    })
    pasos.push({ clave: 'no_repetido', etiqueta: 'Comprobante no repetido', ok: !duplicado })
    if (duplicado) {
      return res.status(400).json({ valido: false, error: 'Este comprobante ya fue utilizado. No se puede usar dos veces.', pasos })
    }

    // Validación exitosa (banco 'OTRO' en la marca cuando validó la genérica)
    res.json({
      valido: true,
      banco: analisis.banco,
      monto: analisis.monto,
      mensaje: 'Comprobante verificado correctamente',
      url_comprobante: `${req.file.path}|TX:${transaccionId}|M:${montoEsperado}|B:${analisis.banco || 'OTRO'}`,
      transaccionId,
      pasos,
    })

  } catch (error) {
    console.error('Error en el motor de validación OCR:', error)
    res.status(500).json({ error: 'Error en el motor de validación de comprobantes: ' + error.message })
  }
})

// POST /api/comandas/verificar-billetera
router.post('/verificar-billetera', verificarToken, async (req, res) => {
  try {
    const { qr_billetera } = req.body
    if (!qr_billetera) return res.status(400).json({ error: 'Falta el código QR o ID' })
    
    let identBusqueda = qr_billetera
    let esPrivado = false
    try {
      const jwt = require('jsonwebtoken')
      const payload = jwt.verify(qr_billetera, process.env.JWT_SECRETO_QR)
      identBusqueda = payload.identificador || payload.qr_publico || qr_billetera
      if (payload.tipo === 'pago_con_pin') {
        esPrivado = true
      }
    } catch (e) {
      // Usamos string crudo
    }

    const billetera = await prisma.billetera.findFirst({ 
      where: { 
        OR: [
          { qr_publico: identBusqueda },
          { qr_publico: { endsWith: `-${identBusqueda}` } },
          { usuario: { ci_carnet: identBusqueda } },
          { usuario: { telefono: identBusqueda } }
        ]
      },
      include: { usuario: true }
    })

    if (!billetera) return res.status(404).json({ error: 'Billetera no encontrada' })

    res.json({
      valido: true,
      nombre_usuario: `${billetera.usuario.nombres} ${billetera.usuario.apellidos || ''}`.trim(),
      requiere_pin: (!!billetera.pin_transaccional && esPrivado),
      identificador_real: billetera.qr_publico,
      saldo_actual: Number(billetera.saldo_actual)
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar billetera' })
  }
})

// POST /api/comandas/crear
router.post('/crear', verificarToken, upload.single('comprobante'), async (req, res) => {
  try {
    const { metodo_pago, qr_billetera, pin, monto_recibido, cambio_dado, id_cliente, id_mesa } = req.body
    const productosJSON = JSON.parse(req.body.productos || '[]')
    
    if (!productosJSON.length) return res.status(400).json({ error: 'La orden está vacía' })
    
    let url_comprobante = null
    if (req.file) {
      url_comprobante = req.file.path
    }

    // Descuento de combo (config, controlado por el admin). Se aplica SOLO a los
    // ítems marcados como combo por el cliente (recomendación de la IA) y solo si
    // hay al menos 2 ítems de combo (un paquete real). El servidor valida el
    // precio contra el base y este %, así el cliente nunca puede descontar de más.
    const cfgDescCombo = await prisma.configuracion.findUnique({ where: { clave: 'ia_descuento_combos' } })
    const descComboPct = Math.min(Math.max(parseFloat(cfgDescCombo?.valor) || 10, 0), 90)
    // Los ítems de cortesía NO cuentan para armar el paquete de combo (son gratis)
    const nItemsCombo = productosJSON.filter(i => i.combo === true && i.cortesia !== true).reduce((a, i) => a + (Number(i.cantidad) || 0), 0)
    const comboHabilitado = nItemsCombo >= 2

    // Calcular total verificando precios reales en BD para mayor seguridad
    let total_calculado = 0
    const detalles_crear = []
    // CORTESÍA (premio 'prod:ID' que da el admin): el cliente canjea 1 unidad
    // GRATIS de ese producto. Aquí solo se detecta y se cobra a Bs 0; la
    // validación del premio y su marcado como 'usado' van en el flujo Billetera.
    let cortesiaItem = null

    for (const item of productosJSON) {
      const prodBD = await prisma.producto.findUnique({ where: { id_producto: item.id_producto } })
      if (!prodBD) return res.status(400).json({ error: `Producto ID ${item.id_producto} no encontrado` })

      const esCortesia = item.cortesia === true
      if (esCortesia && cortesiaItem) {
        return res.status(400).json({ error: 'Solo puedes canjear una cortesía por pedido' })
      }

      // La cortesía siempre es 1 sola unidad (si piden más, se fuerza a 1)
      const cantidad = esCortesia ? 1 : Number(item.cantidad)
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: `Cantidad inválida para ${prodBD.nombre_producto}` })
      }

      // Validar stock disponible (evita dejar el stock en negativo)
      if (prodBD.stock_actual < cantidad) {
        return res.status(400).json({ error: `Stock insuficiente de ${prodBD.nombre_producto} (disponible: ${prodBD.stock_actual})` })
      }

      // Usar el precio de promoción si el producto está en promoción (si no, el precio base)
      const enPromocion = prodBD.estado_promocion && prodBD.precio_promocion != null
      let precioUnitario = enPromocion ? Number(prodBD.precio_promocion) : Number(prodBD.precio_base)

      // COMBO: si el ítem viene marcado como combo (recomendación de la IA) y hay
      // paquete real (>=2), se aplica el % de descuento del config sobre el PRECIO
      // BASE de la BD. El precio se recalcula en el servidor (no se confía en el
      // cliente): así el descuento es exactamente el configurado, ni más ni menos.
      if (esCortesia) {
        // CORTESÍA: cuesta Bs 0 y punto. No recibe combo ni precio dinámico
        // (se ignora item.precio_unitario). El stock SÍ se descuenta normal.
        precioUnitario = 0
        cortesiaItem = { id_producto: item.id_producto, nombre: prodBD.nombre_producto }
      } else if (item.combo === true && comboHabilitado) {
        const base = Number(prodBD.precio_base)
        // Se HONRA el precio con descuento MOSTRADO al cliente (incluye el redondeo
        // "atractivo" de la IA), siempre que sea un descuento de combo razonable:
        // no más barato que (config% + 10%, tope 60%) ni más caro que el base. Si
        // no, se recalcula al precio de combo del config.
        const maxDescuento = Math.min(descComboPct + 10, 60)
        const piso = Math.round(base * (1 - maxDescuento / 100) * 100) / 100
        const pu = Number(item.precio_unitario)
        precioUnitario = (!Number.isNaN(pu) && pu >= piso && pu <= base)
          ? pu
          : Math.round(base * (1 - descComboPct / 100) * 100) / 100
      } else if (item.precio_unitario != null) {
        // Precio dinámico (mesero): se acepta SOLO dentro de un rango seguro del
        // precio base. Fuera de rango se ignora (evita manipulación).
        const base = Number(prodBD.precio_base)
        const min = base * 0.85
        const max = base * 1.20
        const pu = Number(item.precio_unitario)
        if (!Number.isNaN(pu) && pu >= min && pu <= max) precioUnitario = pu
      }

      const sub = precioUnitario * cantidad
      total_calculado += sub

      detalles_crear.push({
        id_producto: item.id_producto,
        cantidad: cantidad,
        precio_cobrado: precioUnitario,
        subtotal: sub
      })
    }

    // La cortesía solo se canjea en el flujo Billetera (el cliente desde su app):
    // con otro método de pago no hay premio contra el cual validarla.
    if (cortesiaItem && metodo_pago !== 'Billetera') {
      return res.status(400).json({ error: 'La cortesía solo se canjea pagando con tu billetera' })
    }

    // Origen del pedido según quién lo crea
    const origenComanda = req.usuario?.rol === 'Cliente' ? 'app'
      : (req.usuario?.rol === 'Cajero' ? 'caja' : 'mesero')

    // Vínculo con la reserva (y de ahí mesa + evento).
    let idEntradaVinculada = null
    if (origenComanda === 'app') {
      // AUTOSERVICIO: el cliente puede pedir en cuanto tiene una RESERVA del evento
      // (ingresada o no). Si envía id_entrada (eligió a qué evento va), se valida que sea suya.
      if (req.body.id_entrada) {
        const elegida = await prisma.entrada.findFirst({
          where: { id_entrada: Number(req.body.id_entrada), id_usuario: req.usuario.id },
          select: { id_entrada: true },
        })
        if (elegida) idEntradaVinculada = elegida.id_entrada
      }
      if (!idEntradaVinculada) {
        const reserva = await prisma.entrada.findFirst({
          where: { id_usuario: req.usuario.id, zona: { evento: { estado: { not: 'terminado' } } } },
          orderBy: { fecha_reserva: 'desc' },
          select: { id_entrada: true },
        })
        if (!reserva) {
          return res.status(403).json({ error: 'Primero reserva tu lugar en un evento para poder pedir desde la app.' })
        }
        idEntradaVinculada = reserva.id_entrada
      }
    } else if (id_mesa) {
      // Mesero/caja: si la mesa tiene reserva activa, se liga a ella (walk-in queda null)
      const reserva = await prisma.entrada.findFirst({
        where: { id_mesa: Number(id_mesa) },
        orderBy: { fecha_reserva: 'desc' },
        select: { id_entrada: true },
      })
      idEntradaVinculada = reserva?.id_entrada || null
    }
    // Modo de entrega: SOLO se define si el cliente YA ingresó al evento (recepción
    // validó su QR). Si aún no ingresó, queda null y lo elige al ingresar.
    let modoEntrega = null
    // Pedido de APP que va a la MESA: se ata a la mesa de la reserva y, si esa
    // mesa ya tiene un mesero asignado, la comanda nace a su nombre; si no,
    // caerá al POOL de meseros al quedar Listo. Así deja de aparecer "a nombre
    // del cliente" (que no es mesero) y el mesero ve "a dónde llevar".
    let idMesaComanda = id_mesa ? Number(id_mesa) : null
    let idMeseroComanda = req.usuario.id
    if (origenComanda === 'app' && idEntradaVinculada) {
      const entVinc = await prisma.entrada.findUnique({
        where: { id_entrada: idEntradaVinculada },
        select: { cantidad_ingresada: true, id_mesa: true },
      })
      // Solo se asigna si el cliente eligió explícitamente (barra/llevar);
      // si no eligió, queda null y lo define después (en Mis pedidos).
      if ((entVinc?.cantidad_ingresada || 0) > 0) {
        modoEntrega = ['barra', 'llevar'].includes(req.body.modo_entrega) ? req.body.modo_entrega : null
      }
      if (modoEntrega === 'llevar' && entVinc?.id_mesa) {
        idMesaComanda = entVinc.id_mesa
        const asig = await prisma.asignacion_mesa.findFirst({
          where: { id_mesa: entVinc.id_mesa, estado: { in: ['asignada', 'atendiendo'] } },
          orderBy: { fecha_asignacion: 'desc' },
          select: { id_mesero: true },
        })
        if (asig) idMeseroComanda = asig.id_mesero  // el mesero de la mesa lo recibe
      }
    }

    // SI EL METODO ES BILLETERA
    if (metodo_pago === 'Billetera') {
      if (!qr_billetera) return res.status(400).json({ error: 'Falta el código QR o ID de la billetera' })
      
      let identBusqueda = qr_billetera
      let esPrivado = false
      try {
        const jwt = require('jsonwebtoken')
        const payload = jwt.verify(qr_billetera, process.env.JWT_SECRETO_QR)
        identBusqueda = payload.identificador || payload.qr_publico || qr_billetera
        if (payload.tipo === 'pago_con_pin') {
          esPrivado = true
        }
      } catch (e) {
        // No es JWT, usamos el string directamente
      }

      const billetera = await prisma.billetera.findFirst({ 
        where: { 
          OR: [
            { qr_publico: identBusqueda },
            { qr_publico: { endsWith: `-${identBusqueda}` } },
            { usuario: { ci_carnet: identBusqueda } },
            { usuario: { telefono: identBusqueda } }
          ]
        },
        include: { usuario: true }
      })

      if (!billetera) return res.status(404).json({ error: 'Billetera no encontrada con ese código' })
      
      // Validación de PIN: si el QR es privado (pago_con_pin) O si el dueño de la
      // billetera es quien paga desde su propia sesión y tiene PIN configurado
      // (antes el pago del carrito lo bypasseaba mandando el qr_publico plano).
      const pagaElDueno = billetera.id_usuario === req.usuario.id
      if (billetera.pin_transaccional && (esPrivado || pagaElDueno)) {
        if (!pin) return res.status(403).json({ error: 'PIN requerido', requiere_pin: true })
        const { verificarPin } = require('../../utilidades/pin-billetera')
        const pinValido = await verificarPin(pin, billetera.pin_transaccional)
        // 400 (no 401): un 401 dispara el refresh de token del front y reintenta el cobro
        if (!pinValido) return res.status(400).json({ error: 'PIN incorrecto', requiere_pin: true })
      } else if (pin && billetera.pin_transaccional) {
        // DEFENSA EN PROFUNDIDAD: si el POS envió un PIN, JAMÁS se ignora.
        // El flujo del mesero perdía la marca de "QR privado" (reenviaba el
        // identificador plano en vez del token firmado) y un PIN INCORRECTO
        // pasaba de largo cobrando igual. Llegó un PIN => se valida, punto.
        const { verificarPin } = require('../../utilidades/pin-billetera')
        const pinValido = await verificarPin(pin, billetera.pin_transaccional)
        if (!pinValido) return res.status(400).json({ error: 'PIN incorrecto', requiere_pin: true })
      }
      
      // PREMIO POR PERFIL COMPLETO: si el dueño de la billetera paga su propio
      // pedido y tiene el premio pendiente, se aplica un % de descuento (con
      // tope en Bs) por única vez. % y tope los define el admin en el panel
      // (utilidades/premio-perfil.js). Se marca 'usado' DENTRO de la transacción
      // con un updateMany condicional para que no pueda usarse dos veces en paralelo.
      // El premio puede ser: 'pendiente' (perfil completo, % y tope de config) o
      // 'desc:N' (descuento de fidelización de N% que fija el admin). 'prod:ID'
      // es una cortesía de producto y NO aplica descuento aquí.
      let premioDescuento = 0
      let premioActual = null
      let premioPerfilDueno = null
      if (pagaElDueno) {
        const duenoPremio = await prisma.usuario.findUnique({
          where: { id_usuario: billetera.id_usuario },
          select: { premio_perfil: true },
        })
        premioPerfilDueno = duenoPremio?.premio_perfil || null
        const pp = premioPerfilDueno
        if (pp === 'pendiente') {
          const { pct, max } = await leerConfigPremio()
          premioDescuento = Math.min(Math.round(total_calculado * (pct / 100) * 100) / 100, max)
          premioActual = 'pendiente'
        } else if (pp && pp.startsWith('desc:')) {
          const pct = Math.min(Math.max(parseFloat(pp.slice(5)) || 0, 0), 50)
          premioDescuento = Math.round(total_calculado * (pct / 100) * 100) / 100
          premioActual = pp
        }
      }

      // CORTESÍA: solo la canjea el DUEÑO de la billetera y solo si su premio es
      // exactamente 'prod:ID' de ese producto. Se corta ANTES de descontar nada
      // (el ítem ya viene a Bs 0 en los detalles, sería regalarlo sin premio).
      if (cortesiaItem && (!pagaElDueno || premioPerfilDueno !== `prod:${cortesiaItem.id_producto}`)) {
        return res.status(400).json({ error: 'No tienes esa cortesía disponible' })
      }

      const total_cobrar = Math.max(0, Math.round((total_calculado - premioDescuento) * 100) / 100)

      // Chequeo rápido (mejora la experiencia); la garantía real es el descuento condicional atómico de abajo.
      if (Number(billetera.saldo_actual) < total_cobrar) {
        return res.status(400).json({ error: 'Saldo insuficiente en la billetera' })
      }

      let saldo_nuevo
      let idComandaBilletera = null
      try {
        // Transacción atómica: descontar saldo SOLO si sigue habiendo saldo suficiente.
        // updateMany con filtro saldo_actual >= total evita el doble gasto y el saldo negativo
        // aunque lleguen dos cobros al mismo tiempo.
        saldo_nuevo = await prisma.$transaction(async (tx) => {
          if (premioDescuento > 0 && premioActual) {
            const premio = await tx.usuario.updateMany({
              where: { id_usuario: billetera.id_usuario, premio_perfil: premioActual },
              data: { premio_perfil: 'usado' },
            })
            // Otro cobro simultáneo ya lo usó: se cobra el total sin descuento
            if (premio.count === 0) throw new Error('PREMIO_YA_USADO')
          }

          // CORTESÍA: se marca 'usado' de forma condicional y atómica (mismo
          // patrón que el descuento). Si otro cobro simultáneo ya la canjeó,
          // count === 0 y se aborta todo: no se regala el producto dos veces.
          if (cortesiaItem) {
            const canje = await tx.usuario.updateMany({
              where: { id_usuario: billetera.id_usuario, premio_perfil: `prod:${cortesiaItem.id_producto}` },
              data: { premio_perfil: 'usado' },
            })
            if (canje.count === 0) throw new Error('PREMIO_YA_USADO')
          }

          const descuento = await tx.billetera.updateMany({
            where: {
              id_billetera: billetera.id_billetera,
              saldo_actual: { gte: total_cobrar }
            },
            data: { saldo_actual: { decrement: total_cobrar } }
          })

          // Si count === 0, otro cobro simultáneo dejó el saldo insuficiente: abortamos todo.
          if (descuento.count === 0) {
            throw new Error('SALDO_INSUFICIENTE')
          }

          // Crear comanda
          const nuevaComanda = await tx.comanda.create({
            data: {
              id_cliente: id_cliente ? Number(id_cliente) : null,
              id_mesero: idMeseroComanda,
              id_mesa: idMesaComanda,
              estado_despacho: 'Pendiente',
              fecha_registro: new Date(),
              metodo_pago: 'Billetera',
              id_entrada: idEntradaVinculada,
              origen: origenComanda,
              modo_entrega: modoEntrega,
              detalle_comanda: { create: detalles_crear }
            }
          })
          idComandaBilletera = nuevaComanda.id_comanda

          // Registrar movimiento (por lo realmente cobrado, con premio aplicado)
          await tx.transaccion.create({
            data: {
              id_billetera: billetera.id_billetera,
              id_comanda: nuevaComanda.id_comanda,
              id_responsable: req.usuario.id,
              tipo_operacion: 'Consumo',
              monto: total_cobrar,
              fecha_hora: new Date()
            }
          })

          // Descontar stock de forma condicional (solo si sigue habiendo existencias)
          for (const item of detalles_crear) {
            const bajaStock = await tx.producto.updateMany({
              where: { id_producto: item.id_producto, stock_actual: { gte: item.cantidad } },
              data: { stock_actual: { decrement: item.cantidad } }
            })
            if (bajaStock.count === 0) throw new Error('SIN_STOCK')
          }

          // Leer el saldo real ya actualizado dentro de la transacción
          const actualizada = await tx.billetera.findUnique({
            where: { id_billetera: billetera.id_billetera },
            select: { saldo_actual: true }
          })
          return Number(actualizada.saldo_actual)
        })
      } catch (e) {
        if (e.message === 'SALDO_INSUFICIENTE') {
          return res.status(400).json({ error: 'Saldo insuficiente en la billetera' })
        }
        if (e.message === 'SIN_STOCK') {
          return res.status(400).json({ error: 'Un producto se quedó sin stock durante el cobro. Revisa la orden.' })
        }
        if (e.message === 'PREMIO_YA_USADO') {
          return res.status(409).json({ error: 'Tu premio ya fue usado. Vuelve a intentar el pago.' })
        }
        throw e
      }

      // Sincronización en tiempo real: saldo del cliente + aviso de nueva comanda a la barra
      if (global.io) {
        global.io.emit('billetera_actualizada', { id_usuario: billetera.id_usuario })
        global.io.emit('nueva_comanda', { id_comanda: idComandaBilletera })
      }
      emitirRecurso('ventas', { id: idComandaBilletera })

      return res.status(201).json({
        mensaje: 'Cobro de billetera exitoso',
        saldo_restante: saldo_nuevo,
        nombres_cliente: billetera.usuario.nombres,
        ...(premioDescuento > 0 && {
          premio_aplicado: premioDescuento,
          total_cobrado: total_cobrar,
        }),
        // Nombre del producto canjeado gratis (para que el front lo confirme)
        ...(cortesiaItem && { cortesia_canjeada: cortesiaItem.nombre }),
      })
    }
    
    // SI ES EFECTIVO O TRANSFERENCIA
    const url_final_comprobante = req.body.url_comprobante_ya_subido || url_comprobante

    // Lo envolvemos en una transacción también para asegurar que el stock baje correctamente junto con la comanda
    const nuevaComanda = await prisma.$transaction(async (tx) => {
      const comanda = await tx.comanda.create({
        data: {
          id_cliente: id_cliente ? Number(id_cliente) : null,
          id_mesero: req.usuario.id,
          id_mesa: id_mesa ? Number(id_mesa) : null,
          estado_despacho: 'Pendiente',
          fecha_registro: new Date(),
          metodo_pago: metodo_pago,
          monto_recibido: monto_recibido ? Number(monto_recibido) : null,
          cambio_dado: cambio_dado ? Number(cambio_dado) : null,
          comprobante_url: url_final_comprobante,
          id_entrada: idEntradaVinculada,
          origen: origenComanda,
          modo_entrega: modoEntrega,
          detalle_comanda: { create: detalles_crear }
        }
      })
      
      // Descontar stock de forma condicional (evita stock negativo)
      for (const item of detalles_crear) {
        const bajaStock = await tx.producto.updateMany({
          where: { id_producto: item.id_producto, stock_actual: { gte: item.cantidad } },
          data: { stock_actual: { decrement: item.cantidad } }
        })
        if (bajaStock.count === 0) throw new Error('SIN_STOCK')
      }

      return comanda
    })

    if (global.io) {
      global.io.emit('nueva_comanda', { id_comanda: nuevaComanda.id_comanda })
    }
    emitirRecurso('ventas', { id: nuevaComanda.id_comanda })
    res.status(201).json({ mensaje: 'Orden creada exitosamente', id_comanda: nuevaComanda.id_comanda })

  } catch (error) {
    if (error.message === 'SIN_STOCK') {
      return res.status(400).json({ error: 'Un producto se quedó sin stock. Revisa la orden e intenta de nuevo.' })
    }
    console.error('Error al procesar cobro:', error)
    res.status(500).json({ error: 'Error interno del servidor al procesar el pago' })
  }
})

// GET /api/comandas (Para reportes del Admin)
// GET /api/comandas/filtros — opciones para los filtros de ventas (métodos + cajeros con ventas)
router.get('/filtros', verificarToken, async (req, res) => {
  try {
    const [metodos, meseros] = await Promise.all([
      prisma.comanda.findMany({ distinct: ['metodo_pago'], select: { metodo_pago: true } }),
      prisma.comanda.findMany({
        distinct: ['id_mesero'],
        // Los CLIENTES que compran desde su celular no son cajeros: fuera del filtro
        where: { usuario_comanda_id_meseroTousuario: { rol: { nombre_rol: { not: 'Cliente' } } } },
        select: { id_mesero: true, usuario_comanda_id_meseroTousuario: { select: { nombres: true, apellidos: true } } },
      }),
    ])
    res.json({
      metodos: metodos.map(m => m.metodo_pago).filter(Boolean),
      cajeros: meseros.map(m => ({
        id: m.id_mesero,
        nombre: `${m.usuario_comanda_id_meseroTousuario?.nombres || ''} ${m.usuario_comanda_id_meseroTousuario?.apellidos || ''}`.trim() || `Usuario ${m.id_mesero}`,
      })),
    })
  } catch (error) {
    console.error('Error obteniendo filtros de ventas:', error)
    res.status(500).json({ error: 'Error al obtener filtros' })
  }
})

router.get('/', verificarToken, async (req, res) => {
  try {
    let whereClause = {}
    // Filtro por RANGO de fechas (desde/hasta) o por un solo día (fecha, compatibilidad)
    if (req.query.desde || req.query.hasta) {
      const rango = {}
      if (req.query.desde) {
        const [y, m, d] = req.query.desde.split('-').map(Number)
        rango.gte = new Date(y, m - 1, d, 0, 0, 0, 0)
      }
      if (req.query.hasta) {
        const [y, m, d] = req.query.hasta.split('-').map(Number)
        rango.lte = new Date(y, m - 1, d, 23, 59, 59, 999)
      }
      whereClause.fecha_registro = rango
    } else if (req.query.fecha) {
      const [y, m, d] = req.query.fecha.split('-').map(Number)
      whereClause.fecha_registro = {
        gte: new Date(y, m - 1, d, 0, 0, 0, 0),
        lte: new Date(y, m - 1, d, 23, 59, 59, 999)
      }
    }
    if (req.query.estado) whereClause.estado_despacho = req.query.estado
    if (req.query.metodo) whereClause.metodo_pago = req.query.metodo
    if (req.query.cajero) whereClause.id_mesero = Number(req.query.cajero)

    // Filtro por EVENTO: ventas dentro de la ventana horaria del evento
    // (incluye barra; pisa el rango desde/hasta si ambos vienen)
    if (req.query.evento) {
      const ev = await prisma.evento.findUnique({ where: { id_evento: Number(req.query.evento) } })
      if (ev) {
        whereClause.fecha_registro = {
          gte: ev.fecha_hora_inicio,
          lte: ev.fecha_hora_fin || new Date()
        }
      }
    }

    const incluir = {
      detalle_comanda: {
        include: {
          producto: { select: { nombre_producto: true, precio_base: true } }
        }
      },
      usuario_comanda_id_clienteTousuario: { select: { nombres: true, apellidos: true } },
      usuario_comanda_id_meseroTousuario: { select: { nombres: true, apellidos: true, id_rol: true } },
      mesa_espacio: true
    }

    // Paginación: si viene ?limite (o ?pagina), se devuelve un objeto paginado.
    // Sin esos parámetros, se mantiene el comportamiento anterior (array) por compatibilidad.
    if (req.query.limite || req.query.pagina) {
      const limite = Math.min(Math.max(parseInt(req.query.limite) || 20, 1), 500)
      const pagina = Math.max(parseInt(req.query.pagina) || 1, 1)
      const [datos, total] = await Promise.all([
        prisma.comanda.findMany({
          where: whereClause,
          include: incluir,
          orderBy: { fecha_registro: 'desc' },
          skip: (pagina - 1) * limite,
          take: limite
        }),
        prisma.comanda.count({ where: whereClause })
      ])
      return res.json({ datos, total, pagina, limite, paginas: Math.ceil(total / limite) })
    }

    const comandas = await prisma.comanda.findMany({
      where: whereClause,
      include: incluir,
      orderBy: { fecha_registro: 'desc' }
    })
    res.json(comandas)
  } catch (error) {
    console.error('Error obteniendo comandas:', error)
    res.status(500).json({ error: 'Error al obtener comandas' })
  }
})

// GET /api/comandas/resumen-ventas — Agregados para el dashboard (rápido, en SQL)
// Reemplaza el traer TODAS las comandas al cliente. Excluye Canceladas. Filtro opcional desde/hasta.
router.get('/resumen-ventas', verificarToken, async (req, res) => {
  try {
    const cond = ["c.estado_despacho <> 'Cancelada'"]
    const params = []
    if (req.query.evento) {
      // Reporte POR EVENTO: la ventana horaria del evento define sus ventas
      const ev = await prisma.evento.findUnique({ where: { id_evento: Number(req.query.evento) } })
      if (ev) {
        cond.push('c.fecha_registro >= ?'); params.push(ev.fecha_hora_inicio)
        cond.push('c.fecha_registro <= ?'); params.push(ev.fecha_hora_fin || new Date())
      }
    } else {
      // Se compara por DATE() (misma extracción que el gráfico por_dia con DATE_FORMAT),
      // así el rango filtrado y las columnas por día usan exactamente el mismo criterio de "día".
      if (req.query.desde) {
        cond.push('DATE(c.fecha_registro) >= ?'); params.push(req.query.desde)
      }
      if (req.query.hasta) {
        cond.push('DATE(c.fecha_registro) <= ?'); params.push(req.query.hasta)
      }
    }
    const W = 'WHERE ' + cond.join(' AND ')

    const [totales, porMetodo, porCategoria, ranking, porMesero, tendencia, porDia, porHora] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT COUNT(DISTINCT c.id_comanda) num, COALESCE(SUM(d.subtotal),0) ingresos
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda ${W}`, ...params),
      prisma.$queryRawUnsafe(
        `SELECT c.metodo_pago metodo, COUNT(DISTINCT c.id_comanda) cantidad, COALESCE(SUM(d.subtotal),0) total
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda ${W} GROUP BY c.metodo_pago`, ...params),
      prisma.$queryRawUnsafe(
        `SELECT cat.nombre_categoria categoria, COALESCE(SUM(d.subtotal),0) total
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda
         JOIN producto p ON p.id_producto=d.id_producto
         JOIN categoria cat ON cat.id_categoria=p.id_categoria ${W}
         GROUP BY cat.nombre_categoria ORDER BY total DESC`, ...params),
      prisma.$queryRawUnsafe(
        `SELECT p.id_producto, p.nombre_producto, SUM(d.cantidad) veces, COALESCE(SUM(d.subtotal),0) ingresos
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda
         JOIN producto p ON p.id_producto=d.id_producto ${W}
         GROUP BY p.id_producto, p.nombre_producto ORDER BY veces DESC LIMIT 20`, ...params),
      prisma.$queryRawUnsafe(
        `SELECT CONCAT(u.nombres,' ',COALESCE(u.apellidos,'')) nombre, COUNT(DISTINCT c.id_comanda) cantidad, COALESCE(SUM(d.subtotal),0) total
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda
         JOIN usuario u ON u.id_usuario=c.id_mesero
         JOIN rol r ON r.id_rol=u.id_rol AND r.nombre_rol <> 'Cliente' ${W}
         GROUP BY c.id_mesero, nombre ORDER BY total DESC LIMIT 10`, ...params),
      prisma.$queryRawUnsafe(
        `SELECT c.id_comanda, c.fecha_registro, COALESCE(SUM(d.subtotal),0) total
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda ${W}
         GROUP BY c.id_comanda, c.fecha_registro ORDER BY c.fecha_registro DESC LIMIT 7`, ...params),
      // Ventas por día (últimos 14 días con actividad) para el gráfico de columnas
      prisma.$queryRawUnsafe(
        `SELECT DATE_FORMAT(c.fecha_registro, '%Y-%m-%d') dia, COUNT(DISTINCT c.id_comanda) cantidad, COALESCE(SUM(d.subtotal),0) total
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda ${W}
         GROUP BY dia ORDER BY dia DESC LIMIT 14`, ...params),
      // Ingresos por hora del día (para detectar las horas pico del local)
      prisma.$queryRawUnsafe(
        `SELECT HOUR(c.fecha_registro) hora, COUNT(DISTINCT c.id_comanda) cantidad, COALESCE(SUM(d.subtotal),0) total
         FROM comanda c JOIN detalle_comanda d ON d.id_comanda=c.id_comanda ${W}
         GROUP BY hora ORDER BY total DESC`, ...params),
    ])

    // Los BigInt/Decimal de MySQL se normalizan a Number
    const num = (v) => v == null ? 0 : Number(v)
    res.json({
      totales: { ingresos: num(totales[0]?.ingresos), num_comandas: num(totales[0]?.num) },
      por_metodo:   porMetodo.map(r => ({ metodo: r.metodo, cantidad: num(r.cantidad), total: num(r.total) })),
      por_categoria: porCategoria.map(r => ({ categoria: r.categoria, total: num(r.total) })),
      ranking_productos: ranking.map(r => ({ id_producto: num(r.id_producto), nombre: r.nombre_producto, veces: num(r.veces), ingresos: num(r.ingresos) })),
      por_mesero:   porMesero.map(r => ({ nombre: r.nombre, cantidad: num(r.cantidad), total: num(r.total) })),
      tendencia:    tendencia.map(r => ({ id_comanda: num(r.id_comanda), total: num(r.total), fecha: r.fecha_registro })),
      por_dia:      porDia.map(r => ({ dia: r.dia, cantidad: num(r.cantidad), total: num(r.total) })).reverse(),
      por_hora:     porHora.map(r => ({ hora: num(r.hora), cantidad: num(r.cantidad), total: num(r.total) })),
    })
  } catch (error) {
    console.error('Error en resumen de ventas:', error)
    res.status(500).json({ error: 'Error al generar el resumen de ventas' })
  }
})

// GET /api/comandas/pendientes (Para barra) — cola priorizada
// Puntaje = prioridad de la ZONA * PESO + minutos esperando. El VIP arranca arriba,
// pero un normal sube con la espera hasta superar a un VIP recién llegado (anti-inanición).
// El VIP del cliente es solo una etiqueta visual: NO afecta el orden (lo decide la zona).
const PESO_PRIORIDAD = 10 // minutos de ventaja por cada nivel de prioridad de zona
router.get('/pendientes', verificarToken, async (req, res) => {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { estado_despacho: { in: ['Pendiente', 'Preparando'] } },
      include: {
        detalle_comanda: { include: { producto: true } },
        usuario_comanda_id_meseroTousuario: { select: { nombres: true, apellidos: true, id_rol: true } },
        usuario_comanda_id_clienteTousuario: { select: { nombres: true, apellidos: true, es_vip: true } },
        mesa_espacio: { include: { zona: { select: { prioridad: true, nombre_zona: true } } } },
      },
    })
    const ahora = Date.now()
    const conPuntaje = comandas.map(c => {
      const prioridad_zona = c.mesa_espacio?.zona?.prioridad || 0
      const minutos_espera = Math.max(0, Math.floor((ahora - new Date(c.fecha_registro).getTime()) / 60000))
      return {
        ...c,
        prioridad_zona,
        zona_nombre: c.mesa_espacio?.zona?.nombre_zona || null,
        es_vip_cliente: c.usuario_comanda_id_clienteTousuario?.es_vip || false,
        minutos_espera,
        puntaje: prioridad_zona * PESO_PRIORIDAD + minutos_espera,
      }
    })
    // "Preparando" (ya en curso) arriba; el resto por puntaje desc
    conPuntaje.sort((a, b) => {
      if (a.estado_despacho !== b.estado_despacho) {
        if (a.estado_despacho === 'Preparando') return -1
        if (b.estado_despacho === 'Preparando') return 1
      }
      return b.puntaje - a.puntaje
    })
    res.json(conPuntaje)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comandas' })
  }
})

// ===== Tablero del bartender (Fase K) =====
// Vista Kanban con las comandas activas en columnas (Pendiente/Preparando/Listo),
// con evento, mesa, cliente, mesero, tiempo de espera y prioridad. Filtros
// opcionales por evento, mesa o cliente para responder "¿la mesa X dónde va?".

function nombrePersona(u) { return u ? `${u.nombres} ${u.apellidos || ''}`.trim() : null }

// Normaliza una comanda para el tablero/historial del bartender.
function comandaBartender(c, ahora) {
  const zonaEv = c.entrada?.zona || c.mesa_espacio?.zona || null
  const minutos_espera = Math.max(0, Math.floor((ahora - new Date(c.fecha_registro).getTime()) / 60000))
  const minutos_listo = c.fecha_listo ? Math.max(0, Math.floor((ahora - new Date(c.fecha_listo).getTime()) / 60000)) : null
  const prioridad_zona = zonaEv?.prioridad || 0
  return {
    id_comanda: c.id_comanda,
    estado: c.estado_despacho,
    estado_entrega: c.estado_entrega,
    modo_entrega: c.modo_entrega,
    origen: c.origen,
    mesa: c.mesa_espacio?.numero_nombre || null,
    id_mesa: c.id_mesa,
    zona: zonaEv?.nombre_zona || null,
    prioridad_zona,
    id_evento: zonaEv?.id_evento || null,
    evento: zonaEv?.evento?.nombre_evento || null,
    cliente: nombrePersona(c.usuario_comanda_id_clienteTousuario) || 'Sin registro',
    es_vip_cliente: c.usuario_comanda_id_clienteTousuario?.es_vip || false,
    mesero: nombrePersona(c.usuario_comanda_id_meseroTousuario),
    id_mesero: c.id_mesero,
    fecha_registro: c.fecha_registro,
    fecha_listo: c.fecha_listo,
    minutos_espera,
    minutos_listo,
    puntaje: prioridad_zona * PESO_PRIORIDAD + minutos_espera,
    items: c.detalle_comanda.map(d => ({
      nombre: d.producto?.nombre_producto || '',
      cantidad: d.cantidad,
      imagen: d.producto?.url_imagen || null,  // para que el bartender VEA qué preparar
    })),
    total_items: c.detalle_comanda.reduce((a, d) => a + d.cantidad, 0),
  }
}

const INCLUDE_BARTENDER = {
  detalle_comanda: { include: { producto: { select: { nombre_producto: true, url_imagen: true } } } },
  usuario_comanda_id_meseroTousuario: { select: { nombres: true, apellidos: true } },
  usuario_comanda_id_clienteTousuario: { select: { nombres: true, apellidos: true, es_vip: true } },
  mesa_espacio: { include: { zona: { select: { prioridad: true, nombre_zona: true, id_evento: true, evento: { select: { nombre_evento: true } } } } } },
  entrada: { select: { zona: { select: { prioridad: true, nombre_zona: true, id_evento: true, evento: { select: { nombre_evento: true } } } } } },
}

// GET /api/comandas/tablero?evento=&mesa=&cliente= — comandas activas para el Kanban
router.get('/tablero', verificarToken, async (req, res) => {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { estado_despacho: { in: ['Pendiente', 'Preparando', 'Listo'] } },
      include: INCLUDE_BARTENDER,
    })
    const ahora = Date.now()
    let lista = comandas.map(c => comandaBartender(c, ahora))
    // Filtros opcionales
    if (req.query.evento) lista = lista.filter(c => c.id_evento === Number(req.query.evento))
    if (req.query.mesa) {
      const q = String(req.query.mesa).toLowerCase()
      lista = lista.filter(c => (c.mesa || '').toLowerCase().includes(q))
    }
    if (req.query.cliente) {
      const q = String(req.query.cliente).toLowerCase()
      lista = lista.filter(c => (c.cliente || '').toLowerCase().includes(q))
    }
    // Dentro de cada estado, ordena por puntaje (prioridad + espera) desc
    lista.sort((a, b) => b.puntaje - a.puntaje)
    // Eventos presentes (para el filtro del front)
    const eventos = []
    const vistos = new Set()
    for (const c of lista) if (c.id_evento && !vistos.has(c.id_evento)) { vistos.add(c.id_evento); eventos.push({ id_evento: c.id_evento, nombre: c.evento }) }
    res.json({
      columnas: {
        Pendiente: lista.filter(c => c.estado === 'Pendiente'),
        Preparando: lista.filter(c => c.estado === 'Preparando'),
        Listo: lista.filter(c => c.estado === 'Listo'),
      },
      eventos,
    })
  } catch (error) {
    console.error('Error tablero bartender:', error)
    res.status(500).json({ error: 'Error al obtener el tablero' })
  }
})

// GET /api/comandas/historial-bartender?evento=&mesa=&cliente= — entregas del presente al pasado
router.get('/historial-bartender', verificarToken, async (req, res) => {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { estado_despacho: { in: ['Completada', 'Entregado'] } },
      include: INCLUDE_BARTENDER,
      orderBy: { fecha_registro: 'desc' },
      take: 100,
    })
    const ahora = Date.now()
    let lista = comandas.map(c => comandaBartender(c, ahora))
    if (req.query.evento) lista = lista.filter(c => c.id_evento === Number(req.query.evento))
    if (req.query.mesa) { const q = String(req.query.mesa).toLowerCase(); lista = lista.filter(c => (c.mesa || '').toLowerCase().includes(q)) }
    if (req.query.cliente) { const q = String(req.query.cliente).toLowerCase(); lista = lista.filter(c => (c.cliente || '').toLowerCase().includes(q)) }
    res.json(lista)
  } catch (error) {
    console.error('Error historial bartender:', error)
    res.status(500).json({ error: 'Error al obtener el historial' })
  }
})

// GET /api/comandas/mis-listos (Para el mesero)
router.get('/mis-listos', verificarToken, async (req, res) => {
  try {
    const comandas = await prisma.comanda.findMany({
      where: {
        id_mesero: req.usuario.id,
        estado_despacho: 'Listo'
      },
      include: {
        detalle_comanda: { include: { producto: true } },
        mesa_espacio: true,
        usuario_comanda_id_clienteTousuario: { select: { nombres: true, apellidos: true } }
      },
      orderBy: { fecha_registro: 'asc' }
    })
    res.json(comandas)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comandas listas' })
  }
})

// GET /api/comandas/mis-mesas (mesas asignadas al mesero, con el cliente de la reserva)
router.get('/mis-mesas', verificarToken, async (req, res) => {
  try {
    // Filtra a las mesas del EVENTO que el mesero atiende (?evento=id): así no
    // se le mezclan mesas de otro evento activo. La mesa pertenece a un evento
    // vía su zona (mesa_espacio -> zona -> id_evento).
    const idEvento = Number(req.query.evento) || null
    const asignaciones = await prisma.asignacion_mesa.findMany({
      where: {
        id_mesero: req.usuario.id,
        estado: { in: ['asignada', 'atendiendo'] },
        ...(idEvento ? { mesa_espacio: { zona: { id_evento: idEvento } } } : {}),
      },
      orderBy: { fecha_asignacion: 'desc' },
      include: {
        mesa_espacio: { select: { id_mesa: true, numero_nombre: true } },
        entrada: { select: { id_entrada: true, usuario: { select: { id_usuario: true, nombres: true, apellidos: true, es_vip: true } } } },
      },
    })
    res.json(asignaciones.map(a => ({
      id_asignacion: a.id_asignacion,
      id_mesa: a.id_mesa,
      mesa: a.mesa_espacio?.numero_nombre || null,
      estado: a.estado,
      id_entrada: a.entrada?.id_entrada || null,
      id_cliente: a.entrada?.usuario?.id_usuario || null,
      cliente: a.entrada?.usuario ? `${a.entrada.usuario.nombres} ${a.entrada.usuario.apellidos || ''}`.trim() : null,
      es_vip: a.entrada?.usuario?.es_vip || false,
    })))
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mis mesas asignadas' })
  }
})

// Comisión de cancelación/devolución que retiene el local (configurable por admin).
const COMISION_REEMBOLSO_DEFECTO = 10
async function obtenerComisionReembolso() {
  try {
    const fila = await prisma.configuracion.findUnique({ where: { clave: 'comision_cancelacion_pct' } })
    const v = parseFloat(fila?.valor)
    if (Number.isFinite(v) && v >= 0 && v <= 90) return v
    if (!fila) {
      await prisma.configuracion.create({
        data: { clave: 'comision_cancelacion_pct', valor: String(COMISION_REEMBOLSO_DEFECTO), descripcion: 'Comisión (%) que retiene el local al devolver un pedido no consumido' },
      }).catch(() => {})
    }
  } catch { /* respaldo abajo */ }
  return COMISION_REEMBOLSO_DEFECTO
}
// Reembolso = total menos la comisión, a 2 decimales (la comisión efectiva
// coincide EXACTAMENTE con el % configurado, sin distorsión por redondeo).
function calcularReembolso(total, comisionPct) {
  return Math.round(total * (1 - comisionPct / 100) * 100) / 100
}
// Regla de 24 h: si faltan MÁS de 24 h para el evento, se devuelve el TOTAL sin
// comisión; dentro de las 24 h previas (o ya empezado/pasado) se cobra comisión.
function comisionSegunFecha(fechaEvento, comisionPct) {
  if (!fechaEvento) return comisionPct
  const faltanMs = new Date(fechaEvento).getTime() - Date.now()
  return faltanMs > 24 * 3600 * 1000 ? 0 : comisionPct
}
// LO REALMENTE PAGADO por una comanda: el monto de su transacción 'Consumo'
// (la fila creada al cobrar, con premios/descuentos ya aplicados). Es la ÚNICA
// base correcta del reembolso: los detalles guardan precios plenos y devolver
// sobre ellos regala dinero (ej. pagó 47 con descuento y se devolvían 55).
// Respaldo (pedidos viejos o en efectivo, sin transacción): total de detalles.
async function obtenerPagadoReal(idComanda, totalDetalles) {
  const t = await prisma.transaccion.findFirst({
    where: { id_comanda: idComanda, tipo_operacion: 'Consumo' },
    select: { monto: true },
  })
  return t ? Number(t.monto) : totalDetalles
}

// GET /api/comandas/config-reembolso — el cliente ve la comisión vigente.
router.get('/config-reembolso', verificarToken, async (req, res) => {
  try {
    res.json({ comision_pct: await obtenerComisionReembolso() })
  } catch { res.status(500).json({ error: 'Error' }) }
})

// PUT /api/comandas/config-comision — el admin ajusta la comisión de devolución.
// (Se administra desde Ventas, no desde el Panel IA: no es una decisión de IA.)
router.put('/config-comision', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const v = parseFloat(req.body.comision_pct)
    if (!Number.isFinite(v) || v < 0 || v > 90) {
      return res.status(400).json({ error: 'La comisión debe ser un número entre 0 y 90.' })
    }
    const valor = String(Math.round(v * 100) / 100)
    await prisma.configuracion.upsert({
      where: { clave: 'comision_cancelacion_pct' },
      update: { valor },
      create: { clave: 'comision_cancelacion_pct', valor, descripcion: 'Comisión (%) que retiene el local al devolver un pedido/reserva no consumido' },
    })
    emitirConfigActualizada({ comision_cancelacion_pct: valor })
    res.json({ comision_pct: v })
  } catch { res.status(500).json({ error: 'No se pudo guardar la comisión.' }) }
})

// GET /api/comandas/mis-pedidos (pedidos del cliente; ?evento=id filtra por evento)
router.get('/mis-pedidos', verificarToken, async (req, res) => {
  try {
    const idEvento = req.query.evento ? Number(req.query.evento) : null
    const comandas = await prisma.comanda.findMany({
      where: { id_cliente: req.usuario.id },
      orderBy: { fecha_registro: 'desc' },
      take: 80,
      include: {
        detalle_comanda: { include: { producto: { select: { nombre_producto: true } } } },
        mesa_espacio: { select: { numero_nombre: true, zona: { select: { id_evento: true, evento: { select: { nombre_evento: true, fecha_hora_inicio: true } } } } } },
        entrada: { select: { cantidad_ingresada: true, zona: { select: { id_evento: true, evento: { select: { nombre_evento: true, fecha_hora_inicio: true } } } } } },
      },
    })
    const comisionBase = await obtenerComisionReembolso()
    // LO REALMENTE PAGADO por comanda (base del reembolso estimado): la
    // transacción 'Consumo' del cobro ya trae premios/descuentos aplicados.
    // UNA sola query para todas las comandas (sin N+1) y se mapea por id.
    const consumos = await prisma.transaccion.findMany({
      where: { id_comanda: { in: comandas.map(c => c.id_comanda) }, tipo_operacion: 'Consumo' },
      select: { id_comanda: true, monto: true },
    })
    const pagadoPorComanda = new Map(consumos.map(t => [t.id_comanda, Number(t.monto)]))
    let lista = comandas.map(c => {
      const zonaEv = c.entrada?.zona || c.mesa_espacio?.zona || null
      const fechaEvento = zonaEv?.evento?.fecha_hora_inicio || null
      const total = c.detalle_comanda.reduce((a, d) => a + Number(d.subtotal), 0)
      // Sin transacción (pedidos viejos/efectivo) el respaldo es el total pleno
      const total_pagado = pagadoPorComanda.has(c.id_comanda) ? pagadoPorComanda.get(c.id_comanda) : total
      const estado = c.estado_despacho
      const entregado = c.estado_entrega === 'entregado' || estado === 'Completada'
      const cerrado = ['Cancelada', 'Reembolsada'].includes(estado)
      // Reembolsable: pagado con billetera, no consumido, no cancelado/reembolsado.
      const puede_reembolso = c.metodo_pago === 'Billetera' && !entregado && !cerrado && total > 0
      const comisionPct = comisionSegunFecha(fechaEvento, comisionBase)
      return {
        id_comanda: c.id_comanda,
        fecha: c.fecha_registro,
        estado,
        estado_entrega: c.estado_entrega,
        fecha_listo: c.fecha_listo,
        metodo_pago: c.metodo_pago,
        origen: c.origen,
        modo_entrega: c.modo_entrega,
        // ¿El cliente ya ingresó al evento? (recepción validó su QR). Solo entonces
        // tiene sentido ofrecerle elegir cómo recibir el pedido (barra/llevar).
        ingresado: (c.entrada?.cantidad_ingresada || 0) > 0,
        mesa: c.mesa_espacio?.numero_nombre || null,
        id_evento: zonaEv?.id_evento || null,
        evento: zonaEv?.evento?.nombre_evento || null,
        total,
        // Lo que el cliente pagó de verdad (con premio/descuento aplicado)
        total_pagado,
        entregado,
        puede_reembolso,
        comision_pct: comisionPct,
        sin_comision: comisionPct === 0,
        reembolso_estimado: puede_reembolso ? calcularReembolso(total_pagado, comisionPct) : 0,
        items: c.detalle_comanda.map(d => ({ nombre: d.producto?.nombre_producto || '', cantidad: d.cantidad, subtotal: Number(d.subtotal) })),
      }
    })
    if (idEvento) lista = lista.filter(p => p.id_evento === idEvento)
    res.json(lista)
  } catch (error) {
    console.error('Error mis-pedidos:', error)
    res.status(500).json({ error: 'Error al obtener tus pedidos' })
  }
})

// POST /api/comandas/:id/modo-entrega — el cliente define cómo recibir un pedido
// que pagó antes de ingresar. Solo si ya ingresó al evento del pedido.
router.post('/:id/modo-entrega', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const modo = ['barra', 'llevar'].includes(req.body.modo) ? req.body.modo : null
    if (!modo) return res.status(400).json({ error: 'Elige recoger en barra o que te lo lleven.' })
    const c = await prisma.comanda.findUnique({ where: { id_comanda: id }, select: { id_cliente: true, id_entrada: true, estado_despacho: true } })
    if (!c || c.id_cliente !== req.usuario.id) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (['Cancelada', 'Reembolsada', 'Completada'].includes(c.estado_despacho)) return res.status(409).json({ error: 'Este pedido ya se cerró.' })
    // Debe haber ingresado (su entrada vinculada tiene gente dentro)
    if (c.id_entrada) {
      const ent = await prisma.entrada.findUnique({ where: { id_entrada: c.id_entrada }, select: { cantidad_ingresada: true } })
      if ((ent?.cantidad_ingresada || 0) <= 0) return res.status(403).json({ error: 'Podrás elegir la entrega cuando ingreses al evento.' })
    }
    await prisma.comanda.update({ where: { id_comanda: id }, data: { modo_entrega: modo } })
    res.json({ ok: true, modo })
  } catch (e) {
    console.error('Error modo-entrega:', e)
    res.status(500).json({ error: 'No se pudo definir la entrega' })
  }
})

// POST /api/comandas/:id/solicitar-reembolso — el cliente pide la devolución de un
// pedido pagado con billetera que no consumió. Se le devuelve el total menos la
// comisión del local, se repone el stock y la comanda queda 'Reembolsada'.
router.post('/:id/solicitar-reembolso', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const c = await prisma.comanda.findUnique({
      where: { id_comanda: id },
      include: {
        detalle_comanda: true,
        entrada: { select: { zona: { select: { evento: { select: { fecha_hora_inicio: true } } } } } },
        mesa_espacio: { select: { zona: { select: { evento: { select: { fecha_hora_inicio: true } } } } } },
      },
    })
    if (!c) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (c.id_cliente !== req.usuario.id) return res.status(403).json({ error: 'Este pedido no es tuyo' })
    if (['Cancelada', 'Reembolsada'].includes(c.estado_despacho)) return res.status(409).json({ error: 'Este pedido ya fue devuelto o cancelado.' })
    if (c.estado_entrega === 'entregado' || c.estado_despacho === 'Completada') return res.status(409).json({ error: 'Este pedido ya fue consumido: no aplica devolución.' })
    if (c.metodo_pago !== 'Billetera') return res.status(400).json({ error: 'Solo se devuelven a la billetera los pedidos pagados con billetera.' })

    const total = c.detalle_comanda.reduce((s, d) => s + Number(d.subtotal || 0), 0)
    // Base del reembolso: LO REALMENTE PAGADO (los detalles guardan precios
    // plenos; si pagó con premio/descuento, devolver el total pleno regala dinero).
    const pagadoReal = await obtenerPagadoReal(c.id_comanda, total)
    // Regla de 24 h: más de 24 h antes del evento no cobra comisión.
    const fechaEvento = c.entrada?.zona?.evento?.fecha_hora_inicio || c.mesa_espacio?.zona?.evento?.fecha_hora_inicio || null
    const comisionPct = comisionSegunFecha(fechaEvento, await obtenerComisionReembolso())
    const reembolso = calcularReembolso(pagadoReal, comisionPct)

    await prisma.$transaction(async (tx) => {
      // Reponer stock
      for (const d of c.detalle_comanda) {
        await tx.producto.update({ where: { id_producto: d.id_producto }, data: { stock_actual: { increment: d.cantidad } } })
      }
      // Devolver a billetera (total - comisión)
      if (reembolso > 0) {
        const bill = await tx.billetera.findUnique({ where: { id_usuario: c.id_cliente } })
        if (bill) {
          await tx.billetera.update({ where: { id_billetera: bill.id_billetera }, data: { saldo_actual: { increment: reembolso }, ultima_actualizacion: new Date() } })
          await tx.transaccion.create({
            data: { id_billetera: bill.id_billetera, id_comanda: c.id_comanda, id_responsable: req.usuario.id, tipo_operacion: 'reembolso', monto: reembolso, fecha_hora: new Date() },
          })
        }
      }
      await tx.comanda.update({ where: { id_comanda: id }, data: { estado_despacho: 'Reembolsada', estado_entrega: 'reembolsado' } })
    })

    if (global.io) global.io.emit('billetera_actualizada', { id_usuario: c.id_cliente })
    res.json({
      mensaje: 'Devolución procesada',
      total,
      total_pagado: pagadoReal,
      comision_pct: comisionPct,
      // La comisión se retiene sobre lo pagado, no sobre el total pleno
      comision_retenida: Math.round((pagadoReal - reembolso) * 100) / 100,
      reembolsado: reembolso,
    })
  } catch (e) {
    console.error('Error en solicitar-reembolso:', e)
    res.status(500).json({ error: 'No se pudo procesar la devolución' })
  }
})

// PATCH /api/comandas/:id/estado (Cambiar estado de una comanda)
router.patch('/:id/estado', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { estado } = req.body

    if (!['Pendiente', 'Preparando', 'Listo', 'Completada', 'Cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Usa: Pendiente, Preparando, Listo, Completada, Cancelada' })
    }

    const actual = await prisma.comanda.findUnique({
      where: { id_comanda: id },
      include: { detalle_comanda: true },
    })
    if (!actual) return res.status(404).json({ error: 'Comanda no encontrada' })

    // CANCELACIÓN: repone stock y, si se pagó con billetera, reembolsa al cliente.
    // Solo se ejecuta al pasar de un estado NO cancelado a Cancelada (evita doble reembolso).
    if (estado === 'Cancelada' && actual.estado_despacho !== 'Cancelada') {
      const total = actual.detalle_comanda.reduce((s, d) => s + Number(d.subtotal || 0), 0)
      // Se devuelve LO REALMENTE PAGADO (con premio/descuento aplicado), no el
      // total pleno de los detalles: devolver de más regala dinero del local.
      const pagadoReal = await obtenerPagadoReal(actual.id_comanda, total)
      let reembolsado = false
      await prisma.$transaction(async (tx) => {
        // 1) Reponer stock de cada producto
        for (const d of actual.detalle_comanda) {
          await tx.producto.update({
            where: { id_producto: d.id_producto },
            data: { stock_actual: { increment: d.cantidad } },
          })
        }
        // 2) Reembolso a la billetera si el pago fue con Billetera
        if (actual.metodo_pago === 'Billetera' && actual.id_cliente && pagadoReal > 0) {
          const bill = await tx.billetera.findUnique({ where: { id_usuario: actual.id_cliente } })
          if (bill) {
            await tx.billetera.update({
              where: { id_billetera: bill.id_billetera },
              data: { saldo_actual: { increment: pagadoReal }, ultima_actualizacion: new Date() },
            })
            await tx.transaccion.create({
              data: {
                id_billetera: bill.id_billetera,
                id_comanda: actual.id_comanda,
                id_responsable: req.usuario.id,
                tipo_operacion: 'reembolso',
                monto: pagadoReal,
                fecha_hora: new Date(),
              },
            })
            reembolsado = true
          }
        }
        // 3) Marcar cancelada
        await tx.comanda.update({ where: { id_comanda: id }, data: { estado_despacho: 'Cancelada' } })
      })

      if (global.io && reembolsado) {
        global.io.emit('billetera_actualizada', { id_usuario: actual.id_cliente })
      }
      const comanda = await prisma.comanda.findUnique({ where: { id_comanda: id } })
      return res.json({
        mensaje: 'Venta cancelada. Se repuso el stock' + (reembolsado ? ' y se reembolsó el saldo al cliente.' : '.'),
        comanda,
      })
    }

    const comanda = await prisma.comanda.update({
      where: { id_comanda: id },
      data: {
        estado_despacho: estado,
        // Marca cuándo quedó Listo (para medir la espera de recojo en el pool)
        ...(estado === 'Listo' && !actual.fecha_listo ? { fecha_listo: new Date() } : {}),
      },
    })

    // Pedido de APP "que me lo lleven" cuya mesa NO tiene mesero asignado: al
    // quedar Listo cae al POOL para que CUALQUIER mesero del evento lo tome
    // (antes quedaba "a nombre del cliente" y ningún mesero lo veía).
    if (estado === 'Listo' && comanda.origen === 'app' && comanda.modo_entrega === 'llevar') {
      const tieneMesero = comanda.id_mesa
        ? await prisma.asignacion_mesa.findFirst({ where: { id_mesa: comanda.id_mesa, estado: { in: ['asignada', 'atendiendo'] } }, select: { id_asignacion: true } })
        : null
      if (!tieneMesero) {
        await prisma.comanda.update({ where: { id_comanda: id }, data: { estado_entrega: 'en_pool' } })
        comanda.estado_entrega = 'en_pool'
        if (global.io) global.io.emit('pedido_pool', { id_comanda: id })
      }
    }

    // Emitir eventos por websocket
    if (global.io) {
      if (estado === 'Listo') {
        global.io.emit('pedido_listo', {
          id_comanda: comanda.id_comanda,
          id_mesero: comanda.id_mesero,
          id_cliente: comanda.id_cliente,        // el cliente escucha su aviso
          modo_entrega: comanda.modo_entrega,    // barra = "pásalo a recoger"
        })
        if (comanda.id_cliente) {
          notificar(comanda.id_cliente, {
            tipo: 'pedido',
            titulo: 'Tu pedido está listo',
            mensaje: comanda.modo_entrega === 'barra' ? 'Pásalo a recoger en la barra.' : 'En un momento te lo llevan a tu lugar.',
            url: '/cliente/pedidos',
          })
        }
      } else if (estado === 'Pendiente') {
        global.io.emit('nueva_comanda', { id_comanda: comanda.id_comanda })
      }
    }

    emitirRecurso('ventas', { id: comanda.id_comanda })
    res.json({ mensaje: 'Estado actualizado', comanda })
  } catch (error) {
    console.error('Error actualizando estado de comanda:', error)
    res.status(500).json({ error: 'Error al actualizar estado de comanda' })
  }
})

// ===== Reasignación por tiempo (Fase E): pool de pedidos listos sin recoger =====

// GET /api/comandas/pool — pedidos listos liberados que cualquier mesero puede tomar
router.get('/pool', verificarToken, async (req, res) => {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { estado_despacho: 'Listo', estado_entrega: 'en_pool' },
      orderBy: { fecha_listo: 'asc' },
      include: {
        detalle_comanda: { include: { producto: { select: { nombre_producto: true } } } },
        mesa_espacio: { select: { id_mesa: true, numero_nombre: true } },
        usuario_comanda_id_clienteTousuario: { select: { nombres: true } },
      },
    })
    res.json(comandas.map(c => ({
      id_comanda: c.id_comanda,
      id_mesa: c.mesa_espacio?.id_mesa || null,
      mesa: c.mesa_espacio?.numero_nombre || null,
      cliente: c.usuario_comanda_id_clienteTousuario?.nombres || null,
      fecha_listo: c.fecha_listo,
      items: c.detalle_comanda.map(d => ({ nombre: d.producto?.nombre_producto || '', cantidad: d.cantidad })),
    })))
  } catch (e) { res.status(500).json({ error: 'Error al obtener el pool' }) }
})

// POST /api/comandas/:id/liberar — el mesero suelta su pedido al pool (que lo lleve otro)
router.post('/:id/liberar', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    await prisma.comanda.update({ where: { id_comanda: id }, data: { estado_entrega: 'en_pool' } })
    if (global.io) global.io.emit('pedido_pool', { id_comanda: id })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'No se pudo liberar el pedido' }) }
})

// HANDOFF BARRA <-> MESERO (confirmación mutua). El traspaso del pedido de la
// barra al mesero solo se da por hecho cuando AMBOS lo confirman: así no queda
// inconsistente que el bartender diga "ya se lo di al mesero" mientras el mesero
// no lo recogió (o al revés). estado_entrega:
//   'pendiente'      -> listo en barra, nadie confirmó
//   'barra_entrego'  -> el bartender confirmó; falta el mesero
//   'mesero_confirma'-> el mesero confirmó; falta el bartender
//   'recogido'       -> AMBOS confirmaron; el pedido está con el mesero (lo lleva)

// POST /api/comandas/:id/recogido — el MESERO confirma que recogió de la barra.
router.post('/:id/recogido', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const c = await prisma.comanda.findUnique({
      where: { id_comanda: id },
      select: { estado_despacho: true, estado_entrega: true, id_cliente: true },
    })
    if (!c) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (c.estado_despacho !== 'Listo') return res.status(409).json({ error: 'Ese pedido no está listo.' })
    if (['recogido', 'entregado', 'reembolsado'].includes(c.estado_entrega)) {
      return res.status(409).json({ error: 'Ese pedido ya fue recogido o entregado.' })
    }
    // Si el bartender YA confirmó su entrega, ambos coinciden -> queda recogido.
    const cierra = c.estado_entrega === 'barra_entrego'
    await prisma.comanda.update({
      where: { id_comanda: id },
      data: { estado_entrega: cierra ? 'recogido' : 'mesero_confirma', id_mesero: req.usuario.id },
    })
    if (global.io) global.io.emit('pedido_recogido', { id_comanda: id, id_mesero: req.usuario.id, estado_entrega: cierra ? 'recogido' : 'mesero_confirma' })
    res.json({ ok: true, confirmado: cierra, esperando: cierra ? null : 'bartender' })
  } catch (e) { res.status(500).json({ error: 'No se pudo marcar como recogido' }) }
})

// POST /api/comandas/:id/barra-entrego — el BARTENDER confirma que le pasó el
// pedido al mesero (modo LLEVAR). Solo se da por recogido si el mesero ya lo
// confirmó; si no, queda esperando su confirmación.
router.post('/:id/barra-entrego', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const c = await prisma.comanda.findUnique({
      where: { id_comanda: id },
      select: { estado_despacho: true, estado_entrega: true, modo_entrega: true, id_mesero: true },
    })
    if (!c) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (c.estado_despacho !== 'Listo') return res.status(409).json({ error: 'El pedido aún no está listo.' })
    if (['recogido', 'entregado', 'reembolsado'].includes(c.estado_entrega)) {
      return res.status(409).json({ error: 'Ese pedido ya se entregó.' })
    }
    const cierra = c.estado_entrega === 'mesero_confirma'
    await prisma.comanda.update({
      where: { id_comanda: id },
      data: { estado_entrega: cierra ? 'recogido' : 'barra_entrego' },
    })
    if (global.io) global.io.emit('pedido_entrega', { id_comanda: id, id_mesero: c.id_mesero, estado_entrega: cierra ? 'recogido' : 'barra_entrego' })
    res.json({ ok: true, confirmado: cierra, esperando: cierra ? null : 'mesero' })
  } catch (e) {
    console.error('Error en barra-entrego:', e)
    res.status(500).json({ error: 'No se pudo registrar la entrega' })
  }
})

// POST /api/comandas/:id/entregar-cliente — modo BARRA (el cliente recoge en la
// barra): el bartender ENTREGA al cliente tras validar su QR (protege al cliente
// de un "entregado" falso). Body: { qr_cliente }. Cierra el pedido.
router.post('/:id/entregar-cliente', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const c = await prisma.comanda.findUnique({
      where: { id_comanda: id },
      select: { estado_despacho: true, estado_entrega: true, id_cliente: true },
    })
    if (!c) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (c.estado_despacho !== 'Listo') return res.status(409).json({ error: 'El pedido aún no está listo.' })
    if (['entregado', 'reembolsado'].includes(c.estado_entrega)) return res.status(409).json({ error: 'Ese pedido ya se entregó.' })

    // Validar que el QR escaneado corresponde al cliente DE ESTE pedido: así el
    // bartender no puede marcar entregado sin que el cliente esté presente.
    if (c.id_cliente) {
      const qr = String(req.body.qr_cliente || '').trim()
      if (!qr) return res.status(400).json({ error: 'Escanea el QR del cliente para confirmar la entrega.' })
      let ident = qr
      try {
        const jwt = require('jsonwebtoken')
        const payload = jwt.verify(qr, process.env.JWT_SECRETO_QR)
        ident = payload.identificador || payload.qr_publico || qr
      } catch { /* string crudo */ }
      const bill = await prisma.billetera.findFirst({
        where: { OR: [{ qr_publico: ident }, { qr_publico: { endsWith: `-${ident}` } }, { usuario: { ci_carnet: ident } }, { usuario: { telefono: ident } }] },
        select: { id_usuario: true },
      })
      if (!bill || bill.id_usuario !== c.id_cliente) {
        return res.status(400).json({ error: 'Ese QR no es del cliente de este pedido.' })
      }
    }
    await prisma.comanda.update({ where: { id_comanda: id }, data: { estado_despacho: 'Completada', estado_entrega: 'entregado' } })
    if (global.io) global.io.emit('pedido_entrega', { id_comanda: id, estado_entrega: 'entregado' })
    emitirRecurso('ventas', { id })
    res.json({ ok: true })
  } catch (e) {
    console.error('Error en entregar-cliente:', e)
    res.status(500).json({ error: 'No se pudo registrar la entrega' })
  }
})

// POST /api/comandas/:id/tomar — otro mesero toma un pedido del pool (atómico)
router.post('/:id/tomar', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const r = await prisma.comanda.updateMany({
      where: { id_comanda: id, estado_entrega: 'en_pool' },
      data: { estado_entrega: 'pendiente', id_mesero: req.usuario.id },
    })
    if (r.count === 0) return res.status(409).json({ error: 'Ese pedido ya lo tomó otro mesero.' })
    if (global.io) global.io.emit('pedido_tomado', { id_comanda: id, id_mesero: req.usuario.id })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'No se pudo tomar el pedido' }) }
})

// ===== Auto-liberación al pool (Fase L) =====
// Un pedido que quedó "Listo" y nadie recoge/lleva en UMBRAL_AUTOPOOL_MIN minutos
// se manda solo al pool para que cualquier mesero lo lleve (anti-inanición).
const UMBRAL_AUTOPOOL_MIN = 7

async function revisarAutoPool() {
  try {
    const limite = new Date(Date.now() - UMBRAL_AUTOPOOL_MIN * 60 * 1000)
    const candidatas = await prisma.comanda.findMany({
      where: {
        estado_despacho: 'Listo',
        fecha_listo: { not: null, lte: limite },
        estado_entrega: { notIn: ['en_pool', 'reembolsado', 'entregado', 'recogido'] },
      },
      select: { id_comanda: true },
    })
    for (const c of candidatas) {
      const r = await prisma.comanda.updateMany({
        where: { id_comanda: c.id_comanda, estado_entrega: { notIn: ['en_pool', 'reembolsado', 'entregado', 'recogido'] } },
        data: { estado_entrega: 'en_pool' },
      })
      if (r.count > 0 && global.io) global.io.emit('pedido_pool', { id_comanda: c.id_comanda, auto: true })
    }
  } catch (e) { console.error('Error en auto-pool:', e.message) }
}

// Corre cada minuto (no en entorno de test para no dejar timers colgados)
if (process.env.NODE_ENV !== 'test') {
  setInterval(revisarAutoPool, 60 * 1000)
}

module.exports = router
