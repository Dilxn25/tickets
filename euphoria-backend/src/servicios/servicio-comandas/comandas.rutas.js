// ============================================
// EUPHORIA — Servicio de Comandas
// ============================================
const express = require('express')
const router = express.Router()
const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('cloudinary').v2
const prisma = require('../../config/base-de-datos')
const { verificarToken } = require('../../middlewares/autenticacion')

// Configuración de Multer para comprobantes
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'euphoria_comprobantes' }
})
const upload = multer({ storage })

const Tesseract = require('tesseract.js')
const { analizarComprobante, TITULAR_POR_DEFECTO } = require('../../utilidades/ocr-comprobantes')
const { leerConfigPremio } = require('../../utilidades/premio-perfil')

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

// POST /api/comandas/validar-comprobante (IA OCR Real para comprobantes)
router.post('/validar-comprobante', verificarToken, upload.single('comprobante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Comprobante no proporcionado' })
    
    const montoEsperado = parseFloat(req.body.monto_esperado || 0)
    if (!montoEsperado || isNaN(montoEsperado)) {
      return res.status(400).json({ error: 'Monto esperado de la comanda no especificado' })
    }

    // 1. Ejecutar OCR usando Tesseract.js en español + inglés
    //    (los comprobantes bancarios bolivianos están en español; usar 'spa+eng'
    //    mejora mucho la precisión frente a solo 'eng').
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'spa+eng')

    const cleanedText = text.replace(/\s+/g, ' ')

    // El texto del comprobante trae datos personales (nombres, cuentas): solo se
    // registra en logs/archivo bajo depuración explícita (DEBUG_OCR=true en .env).
    if (process.env.DEBUG_OCR === 'true') {
      console.log(`[OCR] Monto esperado: Bs. ${montoEsperado}`)
      console.log(`[OCR] Texto extraído:`, cleanedText)
      const fs = require('fs')
      const path = require('path')
      fs.writeFileSync(path.join(process.cwd(), 'comprobante.txt'), text)
    }

    // 2. Analizar contra las plantillas de bancos soportados (BCP/BNB/BISA/Yape):
    //    reconoce el banco emisor, extrae monto y nro. de transacción DE SUS
    //    etiquetas (no por aparición suelta) y exige fecha de hoy.
    //    Reglas calibradas con comprobantes reales — ver utilidades/ocr-comprobantes.js
    const titular = await obtenerTitularDestino()
    const analisis = analizarComprobante(cleanedText, montoEsperado, new Date(), { titular })
    // Resumen sin datos personales (seguro para logs de operación)
    console.log(`[OCR] banco: ${analisis.banco || '?'} | ok: ${analisis.ok} | TX: ${analisis.transaccionId || '-'}`)

    if (!analisis.ok) {
      return res.status(400).json({ valido: false, banco: analisis.banco, error: analisis.error })
    }

    const transaccionId = analisis.transaccionId

    // 3. VALIDACIÓN DE SEGURIDAD: evitar comprobantes ya usados (duplicidad)
    const duplicadoComanda = await prisma.comanda.findFirst({
      where: { comprobante_url: { contains: `|TX:${transaccionId}` } }
    })
    if (duplicadoComanda) {
      return res.status(400).json({ valido: false, error: `Este comprobante ya fue utilizado para pagar la comanda #${duplicadoComanda.id_comanda}. ID Transacción duplicado: #${transaccionId}` })
    }

    const duplicadoRecarga = await prisma.recarga_billetera.findFirst({
      where: { comprobante_url: { contains: `|TX:${transaccionId}` } }
    })
    if (duplicadoRecarga) {
      return res.status(400).json({ valido: false, error: `Este comprobante ya fue utilizado para una recarga de billetera. ID Transacción duplicado: #${transaccionId}` })
    }

    // Validación exitosa
    res.json({
      valido: true,
      banco: analisis.banco,
      mensaje: `Comprobante ${analisis.nombreBanco} verificado correctamente`,
      url_comprobante: `${req.file.path}|TX:${transaccionId}|M:${montoEsperado}|B:${analisis.banco}`,
      transaccionId
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

    // Calcular total verificando precios reales en BD para mayor seguridad
    let total_calculado = 0
    const detalles_crear = []
    
    for (const item of productosJSON) {
      const prodBD = await prisma.producto.findUnique({ where: { id_producto: item.id_producto } })
      if (!prodBD) return res.status(400).json({ error: `Producto ID ${item.id_producto} no encontrado` })

      const cantidad = Number(item.cantidad)
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

      // Precio dinámico: si el mesero envía un precio ajustado, se acepta SOLO dentro de un
      // rango seguro (±) del precio base. Fuera de rango se ignora (evita manipulación).
      if (item.precio_unitario != null) {
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

    // Origen del pedido según quién lo crea
    const origenComanda = req.usuario?.rol === 'Cliente' ? 'app'
      : (req.usuario?.rol === 'Cajero' ? 'caja' : 'mesero')

    // Vínculo con la reserva (y de ahí mesa + evento).
    let idEntradaVinculada = null
    if (origenComanda === 'app') {
      // AUTOSERVICIO: el cliente solo puede pedir si YA ingresó al evento (recepción validó su QR).
      const ingresada = await prisma.entrada.findFirst({
        where: { id_usuario: req.usuario.id, cantidad_ingresada: { gt: 0 } },
        orderBy: { fecha_reserva: 'desc' },
        select: { id_entrada: true },
      })
      if (!ingresada) {
        return res.status(403).json({ error: 'Para pedir desde la app primero debes ingresar al evento (recepción valida tu QR).' })
      }
      idEntradaVinculada = ingresada.id_entrada
    } else if (id_mesa) {
      // Mesero/caja: si la mesa tiene reserva activa, se liga a ella (walk-in queda null)
      const reserva = await prisma.entrada.findFirst({
        where: { id_mesa: Number(id_mesa) },
        orderBy: { fecha_reserva: 'desc' },
        select: { id_entrada: true },
      })
      idEntradaVinculada = reserva?.id_entrada || null
    }
    // Modo de entrega (solo aplica al autoservicio del cliente: 'barra' recoge / 'llevar')
    const modoEntrega = origenComanda === 'app'
      ? (['barra', 'llevar'].includes(req.body.modo_entrega) ? req.body.modo_entrega : 'barra')
      : null

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
      }
      
      // PREMIO POR PERFIL COMPLETO: si el dueño de la billetera paga su propio
      // pedido y tiene el premio pendiente, se aplica un % de descuento (con
      // tope en Bs) por única vez. % y tope los define el admin en el panel
      // (utilidades/premio-perfil.js). Se marca 'usado' DENTRO de la transacción
      // con un updateMany condicional para que no pueda usarse dos veces en paralelo.
      let premioDescuento = 0
      if (pagaElDueno) {
        const duenoPremio = await prisma.usuario.findUnique({
          where: { id_usuario: billetera.id_usuario },
          select: { premio_perfil: true },
        })
        if (duenoPremio?.premio_perfil === 'pendiente') {
          const { pct, max } = await leerConfigPremio()
          premioDescuento = Math.min(Math.round(total_calculado * (pct / 100) * 100) / 100, max)
        }
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
          if (premioDescuento > 0) {
            const premio = await tx.usuario.updateMany({
              where: { id_usuario: billetera.id_usuario, premio_perfil: 'pendiente' },
              data: { premio_perfil: 'usado' },
            })
            // Otro cobro simultáneo ya lo usó: se cobra el total sin descuento
            if (premio.count === 0) throw new Error('PREMIO_YA_USADO')
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
              id_mesero: req.usuario.id,
              id_mesa: id_mesa ? Number(id_mesa) : null,
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

      return res.status(201).json({
        mensaje: 'Cobro de billetera exitoso',
        saldo_restante: saldo_nuevo,
        nombres_cliente: billetera.usuario.nombres,
        ...(premioDescuento > 0 && {
          premio_aplicado: premioDescuento,
          total_cobrado: total_cobrar,
        }),
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
    items: c.detalle_comanda.map(d => ({ nombre: d.producto?.nombre_producto || '', cantidad: d.cantidad })),
    total_items: c.detalle_comanda.reduce((a, d) => a + d.cantidad, 0),
  }
}

const INCLUDE_BARTENDER = {
  detalle_comanda: { include: { producto: { select: { nombre_producto: true } } } },
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
    const asignaciones = await prisma.asignacion_mesa.findMany({
      where: { id_mesero: req.usuario.id, estado: { in: ['asignada', 'atendiendo'] } },
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
// Reembolso = total menos la comisión, redondeado hacia abajo a Bs entero.
function calcularReembolso(total, comisionPct) {
  return Math.floor(total * (1 - comisionPct / 100))
}

// GET /api/comandas/config-reembolso — el cliente ve la comisión vigente.
router.get('/config-reembolso', verificarToken, async (req, res) => {
  try {
    res.json({ comision_pct: await obtenerComisionReembolso() })
  } catch { res.status(500).json({ error: 'Error' }) }
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
        mesa_espacio: { select: { numero_nombre: true, zona: { select: { id_evento: true, evento: { select: { nombre_evento: true } } } } } },
        entrada: { select: { zona: { select: { id_evento: true, evento: { select: { nombre_evento: true } } } } } },
      },
    })
    const comisionPct = await obtenerComisionReembolso()
    let lista = comandas.map(c => {
      const zonaEv = c.entrada?.zona || c.mesa_espacio?.zona || null
      const total = c.detalle_comanda.reduce((a, d) => a + Number(d.subtotal), 0)
      const estado = c.estado_despacho
      const entregado = c.estado_entrega === 'entregado' || estado === 'Completada'
      const cerrado = ['Cancelada', 'Reembolsada'].includes(estado)
      // Reembolsable: pagado con billetera, no consumido, no cancelado/reembolsado.
      const puede_reembolso = c.metodo_pago === 'Billetera' && !entregado && !cerrado && total > 0
      return {
        id_comanda: c.id_comanda,
        fecha: c.fecha_registro,
        estado,
        estado_entrega: c.estado_entrega,
        fecha_listo: c.fecha_listo,
        metodo_pago: c.metodo_pago,
        origen: c.origen,
        modo_entrega: c.modo_entrega,
        mesa: c.mesa_espacio?.numero_nombre || null,
        id_evento: zonaEv?.id_evento || null,
        evento: zonaEv?.evento?.nombre_evento || null,
        total,
        entregado,
        puede_reembolso,
        reembolso_estimado: puede_reembolso ? calcularReembolso(total, comisionPct) : 0,
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

// POST /api/comandas/:id/solicitar-reembolso — el cliente pide la devolución de un
// pedido pagado con billetera que no consumió. Se le devuelve el total menos la
// comisión del local, se repone el stock y la comanda queda 'Reembolsada'.
router.post('/:id/solicitar-reembolso', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const c = await prisma.comanda.findUnique({ where: { id_comanda: id }, include: { detalle_comanda: true } })
    if (!c) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (c.id_cliente !== req.usuario.id) return res.status(403).json({ error: 'Este pedido no es tuyo' })
    if (['Cancelada', 'Reembolsada'].includes(c.estado_despacho)) return res.status(409).json({ error: 'Este pedido ya fue devuelto o cancelado.' })
    if (c.estado_entrega === 'entregado' || c.estado_despacho === 'Completada') return res.status(409).json({ error: 'Este pedido ya fue consumido: no aplica devolución.' })
    if (c.metodo_pago !== 'Billetera') return res.status(400).json({ error: 'Solo se devuelven a la billetera los pedidos pagados con billetera.' })

    const total = c.detalle_comanda.reduce((s, d) => s + Number(d.subtotal || 0), 0)
    const comisionPct = await obtenerComisionReembolso()
    const reembolso = calcularReembolso(total, comisionPct)

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
      comision_pct: comisionPct,
      comision_retenida: total - reembolso,
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
        if (actual.metodo_pago === 'Billetera' && actual.id_cliente && total > 0) {
          const bill = await tx.billetera.findUnique({ where: { id_usuario: actual.id_cliente } })
          if (bill) {
            await tx.billetera.update({
              where: { id_billetera: bill.id_billetera },
              data: { saldo_actual: { increment: total }, ultima_actualizacion: new Date() },
            })
            await tx.transaccion.create({
              data: {
                id_billetera: bill.id_billetera,
                id_comanda: actual.id_comanda,
                id_responsable: req.usuario.id,
                tipo_operacion: 'reembolso',
                monto: total,
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

    // Emitir eventos por websocket
    if (global.io) {
      if (estado === 'Listo') {
        global.io.emit('pedido_listo', {
          id_comanda: comanda.id_comanda,
          id_mesero: comanda.id_mesero,
          id_cliente: comanda.id_cliente,        // el cliente escucha su aviso
          modo_entrega: comanda.modo_entrega,    // barra = "pásalo a recoger"
        })
      } else if (estado === 'Pendiente') {
        global.io.emit('nueva_comanda', { id_comanda: comanda.id_comanda })
      }
    }

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

module.exports = router
