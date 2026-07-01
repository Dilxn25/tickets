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
const crypto = require('crypto')

// POST /api/comandas/validar-comprobante (IA OCR Real para comprobantes)
router.post('/validar-comprobante', verificarToken, upload.single('comprobante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Comprobante no proporcionado' })
    
    const montoEsperado = parseFloat(req.body.monto_esperado || 0)
    if (!montoEsperado || isNaN(montoEsperado)) {
      return res.status(400).json({ error: 'Monto esperado de la comanda no especificado' })
    }

    console.log(`[OCR] Procesando comprobante con Tesseract.js. URL del archivo: ${req.file.path}`)
    console.log(`[OCR] Monto esperado a validar: Bs. ${montoEsperado}`)

    // 1. Ejecutar OCR usando Tesseract.js en español + inglés
    //    (los comprobantes bancarios bolivianos están en español; usar 'spa+eng'
    //    mejora mucho la precisión frente a solo 'eng').
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'spa+eng')

    const cleanedText = text.replace(/\s+/g, ' ')
    console.log(`[OCR] Texto extraído:`, cleanedText)

    // Guardar el texto del OCR a un archivo solo en modo depuración (DEBUG_OCR=true en .env).
    // Evita choques entre peticiones simultáneas y no deja archivos sueltos en producción.
    if (process.env.DEBUG_OCR === 'true') {
      const fs = require('fs')
      const path = require('path')
      fs.writeFileSync(path.join(process.cwd(), 'comprobante.txt'), text)
    }

    // 2. Buscar monto esperado en el texto
    const montoEsperadoStr = String(montoEsperado)
    const montoEsperadoConDecimales = montoEsperado.toFixed(2)
    const montoEsperadoConComa = montoEsperadoConDecimales.replace('.', ',')
    const montoEsperadoEntero = String(Math.floor(montoEsperado))

    const contieneMonto = 
      cleanedText.includes(montoEsperadoStr) || 
      cleanedText.includes(montoEsperadoConDecimales) || 
      cleanedText.includes(montoEsperadoConComa) ||
      (montoEsperado % 1 === 0 && cleanedText.includes(montoEsperadoEntero))

    // 3. Buscar ID de transacción de forma extremadamente inteligente y priorizada
    let transaccionId = null

    // 3.1. Intentar buscar bancarizacion o codigo de procesamiento / operacion (prioritario)
    const regexBanc = /(?:bancarizaci[oó]n|operaci[oó]n|nro\s*de\s*operaci[oó]n|c[oó]digo\s*de\s*procesamiento)\s*[:\-\.#]?\s*([a-z0-9\-]+)/i
    const matchBanc = cleanedText.match(regexBanc)
    if (matchBanc && /\d/.test(matchBanc[1])) {
      transaccionId = matchBanc[1]
    }

    // 3.2. Si no, intentar buscar transaccion, referencia o id que contenga dígitos
    if (!transaccionId) {
      const regexTrans = /(?:transacci[oó]n|referencia|nro|id)\s*[:\-\.#]?\s*([a-z0-9\-]+)/i
      const matchTrans = cleanedText.match(regexTrans)
      if (matchTrans && /\d/.test(matchTrans[1])) {
        transaccionId = matchTrans[1]
      }
    }

    // 3.3. Si sigue sin encontrarse, buscar cualquier palabra alfanumérica de 6 a 15 caracteres que tenga números
    if (!transaccionId) {
      const regexSecuencias = /\b[a-z0-9\-]{6,15}\b/gi
      const coincidencias = cleanedText.match(regexSecuencias) || []
      for (const c of coincidencias) {
        // Ignorar secuencias puramente alfabéticas o que no tengan dígitos para evitar falsos positivos
        if (/\d/.test(c) && /[a-z]/i.test(c)) {
          transaccionId = c
          break
        }
      }
    }

    // 3.4. Si aún no, buscar cualquier número largo de 6 a 15 dígitos
    if (!transaccionId) {
      const regexDigitos = /\b[0-9]{6,15}\b/g
      const coincidencias = cleanedText.match(regexDigitos) || []
      if (coincidencias.length > 0) {
        transaccionId = coincidencias[0]
      }
    }

    // Si no se pudo leer el ID, generamos un hash único de la firma del texto para prevenir fraude de duplicado de imagen
    if (!transaccionId) {
      const hashTexto = crypto.createHash('md5').update(cleanedText).digest('hex').substring(0, 12).toUpperCase()
      transaccionId = `HASH-${hashTexto}`
    }

    console.log(`[OCR] Datos extraídos -> Monto Válido: ${contieneMonto}, ID Transacción: ${transaccionId}`)

    // 4. VALIDACIÓN DE SEGURIDAD 1: Evitar comprobantes ya usados (Duplicidad)
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

    // 5. VALIDACIÓN DE SEGURIDAD 2: Verificar la cuenta / referencia (Consumo Euphoria)
    // El OCR suele tener errores tipográficos menores (m por rn, ph por f, o por 0, etc.)
    const txtNorm = cleanedText.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const referenciaValida = 
      txtNorm.includes('consumoeuphoria') || 
      txtNorm.includes('consumoeuforia') ||
      /c[o0]ns[uv]?[mn][o0]?e[uv][pfb][hn]?[o0]r[il1]a/.test(txtNorm) ||
      // Si la foto está cortada o borrosa, al menos aceptamos la palabra clave con errores típicos
      txtNorm.includes('euphoria') || 
      txtNorm.includes('euforia') ||
      txtNorm.includes('eupboria') ||
      txtNorm.includes('eupnoria');

    if (!referenciaValida) {
      return res.status(400).json({ 
        valido: false, 
        error: `El comprobante no es válido. La referencia debe decir 'Consumo Euphoria'. Asegúrate de que el texto sea legible.` 
      })
    }

    // 6. VALIDACIÓN DE SEGURIDAD 3: Verificar Fecha y Hora (debe ser de hoy)
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = hoy.getFullYear();
    const yy = String(yyyy).slice(-2);
    // Verificar si la fecha de hoy aparece en formatos DD/MM/YYYY o DD-MM-YYYY
    const regexFechaHoy = new RegExp(`(${dd}[/-]${mm}[/-]${yyyy})|(${dd}[/-]${mm}[/-]${yy})`);
    
    if (!regexFechaHoy.test(cleanedText)) {
      return res.status(400).json({ 
        valido: false, 
        error: `El comprobante está caducado o es de un día anterior. Debe tener la fecha de hoy (${dd}/${mm}/${yyyy}).` 
      })
    }

    // 6. VALIDACIÓN DE SEGURIDAD 3: Verificar que el monto coincide
    if (!contieneMonto) {
      // Intentar extraer algún monto diferente en el comprobante para dar feedback descriptivo al usuario
      const regexMontos = /\b[0-9]+(?:[\.,][0-9]{1,2})?\b/g
      const todosMontos = cleanedText.match(regexMontos) || []
      let montoLeido = null
      
      for (const m of todosMontos) {
        const val = parseFloat(m.replace(',', '.'))
        if (val > 10 && val !== montoEsperado) { // Evitar números pequeños como horas o fechas
          montoLeido = val
          break
        }
      }

      const errorMsg = montoLeido 
        ? `El monto del comprobante (Bs. ${montoLeido}) no coincide con el total de la orden (Bs. ${montoEsperado}).`
        : `No se pudo encontrar el monto esperado de Bs. ${montoEsperado} en el comprobante. Por favor, asegúrate de subir una imagen nítida de la transferencia.`

      return res.status(400).json({ 
        valido: false, 
        error: errorMsg 
      })
    }

    // Validación exitosa
    res.json({ 
      valido: true, 
      mensaje: 'Comprobante verificado correctamente mediante IA', 
      url_comprobante: `${req.file.path}|TX:${transaccionId}|M:${montoEsperado}`,
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
      const precioUnitario = enPromocion ? Number(prodBD.precio_promocion) : Number(prodBD.precio_base)

      const sub = precioUnitario * cantidad
      total_calculado += sub

      detalles_crear.push({
        id_producto: item.id_producto,
        cantidad: cantidad,
        precio_cobrado: precioUnitario,
        subtotal: sub
      })
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
      
      // Validación de PIN solo si el QR es privado (pago_con_pin)
      if (billetera.pin_transaccional && esPrivado) {
        if (!pin) return res.status(403).json({ error: 'PIN requerido' }) // El frontend capturará esto y pedirá el PIN
        const bcrypt = require('bcryptjs')
        const pinValido = await bcrypt.compare(pin, billetera.pin_transaccional)
        if (!pinValido) return res.status(401).json({ error: 'PIN incorrecto' })
      }
      
      // Chequeo rápido (mejora la experiencia); la garantía real es el descuento condicional atómico de abajo.
      if (Number(billetera.saldo_actual) < total_calculado) {
        return res.status(400).json({ error: 'Saldo insuficiente en la billetera' })
      }

      let saldo_nuevo
      try {
        // Transacción atómica: descontar saldo SOLO si sigue habiendo saldo suficiente.
        // updateMany con filtro saldo_actual >= total evita el doble gasto y el saldo negativo
        // aunque lleguen dos cobros al mismo tiempo.
        saldo_nuevo = await prisma.$transaction(async (tx) => {
          const descuento = await tx.billetera.updateMany({
            where: {
              id_billetera: billetera.id_billetera,
              saldo_actual: { gte: total_calculado }
            },
            data: { saldo_actual: { decrement: total_calculado } }
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
              detalle_comanda: { create: detalles_crear }
            }
          })

          // Registrar movimiento
          await tx.transaccion.create({
            data: {
              id_billetera: billetera.id_billetera,
              id_comanda: nuevaComanda.id_comanda,
              id_responsable: req.usuario.id,
              tipo_operacion: 'Consumo',
              monto: total_calculado,
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
        throw e
      }

      // Sincronización en tiempo real del saldo del cliente
      if (global.io) {
        global.io.emit('billetera_actualizada', {
          id_usuario: billetera.id_usuario,
          saldo_nuevo
        })
      }

      return res.status(201).json({
        mensaje: 'Cobro de billetera exitoso',
        saldo_restante: saldo_nuevo,
        nombres_cliente: billetera.usuario.nombres
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
router.get('/', verificarToken, async (req, res) => {
  try {
    let whereClause = {}
    if (req.query.fecha) {
      const dateParts = req.query.fecha.split('-')
      const y = Number(dateParts[0])
      const m = Number(dateParts[1]) - 1
      const d = Number(dateParts[2])
      const fechaInicio = new Date(y, m, d, 0, 0, 0, 0)
      const fechaFin = new Date(y, m, d, 23, 59, 59, 999)
      whereClause.fecha_registro = { gte: fechaInicio, lte: fechaFin }
    }

    const comandas = await prisma.comanda.findMany({
      where: whereClause,
      include: {
        detalle_comanda: { 
          include: { 
            producto: { select: { nombre_producto: true, precio_base: true } }
          }
        },
        usuario_comanda_id_clienteTousuario: { select: { nombres: true, apellidos: true } },
        usuario_comanda_id_meseroTousuario: { select: { nombres: true, apellidos: true, id_rol: true } },
        mesa_espacio: true
      },
      orderBy: { fecha_registro: 'desc' }
    })
    res.json(comandas)
  } catch (error) {
    console.error('Error obteniendo comandas:', error)
    res.status(500).json({ error: 'Error al obtener comandas' })
  }
})

// GET /api/comandas/pendientes (Para barra)
router.get('/pendientes', verificarToken, async (req, res) => {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { 
        estado_despacho: { in: ['Pendiente', 'Preparando'] } 
      },
      include: {
        detalle_comanda: { include: { producto: true } },
        usuario_comanda_id_meseroTousuario: { select: { nombres: true, apellidos: true, id_rol: true } },
        usuario_comanda_id_clienteTousuario: { select: { nombres: true, apellidos: true } },
        mesa_espacio: true
      },
      orderBy: { fecha_registro: 'asc' }
    })

    res.json(comandas)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comandas' })
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

// PATCH /api/comandas/:id/estado (Cambiar estado de una comanda)
router.patch('/:id/estado', verificarToken, async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    if (!['Pendiente', 'Preparando', 'Listo', 'Completada', 'Cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Usa: Pendiente, Preparando, Listo, Completada, Cancelada' })
    }

    const comanda = await prisma.comanda.update({
      where: { id_comanda: parseInt(id) },
      data: { estado_despacho: estado }
    })

    // Emitir eventos por websocket
    if (global.io) {
      if (estado === 'Listo') {
        global.io.emit('pedido_listo', { id_comanda: comanda.id_comanda, id_mesero: comanda.id_mesero })
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

module.exports = router
