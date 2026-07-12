// ============================================
// EUPHORIA — Rutas de Billetera Digital
// Recarga, pago con billetera, generación de QR
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { generarQRRecarga, generarIDUnico } = require('./qr-utilidades')
const QRCode = require('qrcode')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { cifrarPin, descifrarPin, verificarPin } = require('../../utilidades/pin-billetera')
const { subirFotoPerfil } = require('../../config/cloudinary')
const { notificar } = require('../../utilidades/notificaciones')

// ============ GET /api/billetera/saldo ============
// Obtener saldo actual del cliente
router.get('/saldo', verificarToken, async (req, res) => {
  try {
    const billetera = await prisma.billetera.findUnique({
      where: { id_usuario: req.usuario.id }
    })

    if (!billetera) {
      // Cliente nuevo: aún no tiene billetera (se crea con la primera recarga).
      // 200 con flag para que el front lo muestre bien, sin errores engañosos.
      return res.json({ sin_billetera: true, saldo_actual: 0, tiene_pin: false })
    }

    res.json({
      id_billetera: billetera.id_billetera,
      saldo_actual: parseFloat(billetera.saldo_actual),
      qr_publico: billetera.qr_publico,
      tiene_pin: !!billetera.pin_transaccional
    })
  } catch (error) {
    console.error('Error obteniendo saldo:', error)
    res.status(500).json({ error: 'Error al obtener saldo' })
  }
})

// ============ GET /api/billetera/config-premio ============
// El carrito necesita el % y el tope del premio para mostrar el estimado
// correcto (el cobro real lo calcula el backend de comandas). Autenticado.
router.get('/config-premio', verificarToken, async (req, res) => {
  try {
    const { leerConfigPremio } = require('../../utilidades/premio-perfil')
    res.json(await leerConfigPremio())
  } catch (error) {
    res.json({ pct: 10, max: 50 })
  }
})

// ============ POST /api/billetera/recargar ============
// Iniciar recarga de billetera
// Body: { monto: 1000 }
router.post('/recargar', verificarToken, async (req, res) => {
  try {
    const { monto, comprobante_url } = req.body
    const id_usuario = req.usuario.id

    if (!monto || monto < 10 || monto > 100000) {
      return res.status(400).json({ error: 'Monto debe estar entre 10 y 100,000 Bs' })
    }

    // Obtener o crear billetera del usuario
    let billetera = await prisma.billetera.findUnique({
      where: { id_usuario }
    })

    if (!billetera) {
      billetera = await prisma.billetera.create({
        data: {
          id_usuario,
          saldo_actual: 0,
          qr_publico: `QR_${id_usuario}_${Date.now()}`,
          ultima_actualizacion: new Date()
        }
      })
    }

    // Crear registro de recarga y completarla inmediatamente (ya validada por OCR)
    const recarga = await prisma.recarga_billetera.create({
      data: {
        id_usuario,
        id_billetera: billetera.id_billetera,
        monto_recarga: monto,
        estado: 'completada', // Instántaneamente completada
        numero_transaccion: `RECARGA-${generarIDUnico()}-${Date.now()}`,
        comprobante_url: comprobante_url || null,
        fecha_solicitud: new Date(),
        fecha_confirmacion: new Date()
      }
    })

    // Actualizar saldo de billetera
    const billeteraActualizada = await prisma.billetera.update({
      where: { id_billetera: billetera.id_billetera },
      data: {
        saldo_actual: {
          increment: monto
        },
        ultima_actualizacion: new Date()
      }
    })

    // Registrar transacción
    await prisma.transaccion.create({
      data: {
        id_billetera: billetera.id_billetera,
        id_responsable: id_usuario,
        tipo_operacion: 'RECARGA',
        monto: monto,
        fecha_hora: new Date()
      }
    })

    // Emitir evento por WebSockets para actualizar en tiempo real
    if (global.io) {
      // Privacidad: solo se emite el id; el saldo se refetchea autenticado
      global.io.emit('billetera_actualizada', { id_usuario })
    }

    res.json({
      mensaje: 'Recarga completada exitosamente',
      id_recarga: recarga.id_recarga,
      numero_transaccion: recarga.numero_transaccion,
      monto: monto,
      saldo_nuevo: parseFloat(billeteraActualizada.saldo_actual)
    })
  } catch (error) {
    console.error('Error creando recarga:', error)
    res.status(500).json({ error: 'Error al procesar la recarga instantánea' })
  }
})

// ============ POST /api/billetera/confirmar-recarga ============
// Confirmar recarga con comprobante OCR
// Body: { id_recarga, comprobante_archivo, id_unico_qr }
router.post('/confirmar-recarga', verificarToken, async (req, res) => {
  try {
    const { id_recarga, numero_transaccion, id_unico_qr } = req.body
    const id_usuario = req.usuario.id

    // Validar recarga existe y pertenece al usuario
    const recarga = await prisma.recarga_billetera.findUnique({
      where: { id_recarga },
      include: { billetera: true, qr_recarga: true }
    })

    if (!recarga || recarga.id_usuario !== id_usuario) {
      return res.status(404).json({ error: 'Recarga no encontrada' })
    }

    if (recarga.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Esta recarga ya fue procesada' })
    }

    // Validar que el QR pertenece a esta recarga
    const qrValido = recarga.qr_recarga.some(qr => qr.id_unico_numerico === id_unico_qr)
    if (!qrValido) {
      return res.status(400).json({ error: 'QR inválido para esta recarga' })
    }

    // Actualizar saldo de billetera
    const billeteraActualizada = await prisma.billetera.update({
      where: { id_billetera: recarga.id_billetera },
      data: {
        saldo_actual: {
          increment: recarga.monto_recarga
        },
        ultima_actualizacion: new Date()
      }
    })

    // Registrar transacción
    await prisma.transaccion.create({
      data: {
        id_billetera: recarga.id_billetera,
        id_responsable: id_usuario,
        tipo_operacion: 'RECARGA',
        monto: recarga.monto_recarga,
        fecha_hora: new Date()
      }
    })

    res.json({
      mensaje: 'Recarga confirmada exitosamente',
      saldo_anterior: parseFloat(recarga.billetera.saldo_actual),
      monto_recargado: parseFloat(recarga.monto_recarga),
      saldo_nuevo: parseFloat(billeteraActualizada.saldo_actual)
    })
  } catch (error) {
    console.error('Error confirmando recarga:', error)
    res.status(500).json({ error: 'Error al confirmar recarga' })
  }
})

// ============ GET /api/billetera/historial ============
// Obtener historial de recargas del usuario
router.get('/historial', verificarToken, async (req, res) => {
  try {
    const recargas = await prisma.recarga_billetera.findMany({
      where: { id_usuario: req.usuario.id },
      include: { qr_recarga: true },
      orderBy: { fecha_solicitud: 'desc' }
    })

    res.json(recargas.map(r => ({
      id_recarga: r.id_recarga,
      monto: parseFloat(r.monto_recarga),
      estado: r.estado,
      fecha_solicitud: r.fecha_solicitud,
      fecha_confirmacion: r.fecha_confirmacion,
      numero_transaccion: r.numero_transaccion,
      qr_generados: r.qr_recarga.length
    })))
  } catch (error) {
    console.error('Error obteniendo historial:', error)
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

// ============ GET /api/billetera/movimientos ============
// Historial UNIFICADO para el cliente: recargas (entra dinero) y gastos
// (consumos en barra y reservas de espacios), ordenado del más reciente.
// Cada movimiento dice lo que al cliente le importa: qué fue, cuánto,
// cuándo y cómo; el detalle fino de un consumo se pide por comanda.
router.get('/movimientos', verificarToken, async (req, res) => {
  try {
    const id_usuario = req.usuario.id
    const billetera = await prisma.billetera.findUnique({ where: { id_usuario } })
    if (!billetera) return res.json({ movimientos: [] })

    const [recargas, transacciones, entradas] = await Promise.all([
      prisma.recarga_billetera.findMany({
        where: { id_usuario },
        orderBy: { fecha_solicitud: 'desc' },
        take: 100,
      }),
      prisma.transaccion.findMany({
        where: { id_billetera: billetera.id_billetera, tipo_operacion: { in: ['Consumo', 'Reserva', 'reembolso', 'retiro', 'Retiro'] } },
        include: {
          usuario: { select: { nombres: true, apellidos: true, rol: { select: { nombre_rol: true } } } },
          comanda: { select: { id_comanda: true, metodo_pago: true, origen: true, modo_entrega: true, detalle_comanda: { select: { subtotal: true } }, _count: { select: { detalle_comanda: true } } } },
        },
        orderBy: { fecha_hora: 'desc' },
        take: 100,
      }),
      prisma.entrada.findMany({
        where: { id_usuario },
        include: {
          zona: { select: { nombre_zona: true, evento: { select: { nombre_evento: true } } } },
          mesa_espacio: { select: { numero_nombre: true, tipo_elemento: true } },
        },
        orderBy: { fecha_reserva: 'desc' },
        take: 100,
      }),
    ])

    const movimientos = []

    for (const r of recargas) {
      // El banco quedó etiquetado en la URL del comprobante (|B:BCP) por el OCR
      const banco = (r.comprobante_url || '').match(/\|B:([A-Z]+)/)?.[1] || null
      movimientos.push({
        id: `R-${r.id_recarga}`,
        tipo: 'recarga',
        titulo: 'Recarga de saldo',
        detalle: banco ? `Vía ${banco}` : 'Vía transferencia',
        monto: parseFloat(r.monto_recarga),
        fecha: r.fecha_solicitud,
        estado: r.estado,
        numero_transaccion: r.numero_transaccion,
      })
    }

    for (const t of transacciones) {
      const tipoOp = (t.tipo_operacion || '').toLowerCase()

      // DEVOLUCIONES (entra dinero) — con el desglose (original, retenido, devuelto)
      if (tipoOp === 'reembolso') {
        let detalle = 'Devolución a tu billetera'
        const devuelto = Number(t.monto)
        let totalOriginal = devuelto
        let comisionRetenida = 0
        let comisionPct = 0
        if (t.comanda?.detalle_comanda?.length) {
          totalOriginal = t.comanda.detalle_comanda.reduce((a, d) => a + Number(d.subtotal), 0)
          if (totalOriginal > devuelto + 0.5) {
            comisionRetenida = Math.round((totalOriginal - devuelto) * 100) / 100
            comisionPct = Math.round((1 - devuelto / totalOriginal) * 100)
            detalle = `Retuvimos ${comisionPct}% de comisión sobre Bs ${totalOriginal.toFixed(2)}`
          } else {
            detalle = 'Devolución completa · sin comisión'
          }
        }
        movimientos.push({
          id: `T-${t.id_transaccion}`, tipo: 'reembolso', titulo: 'Devolución',
          detalle, monto: parseFloat(t.monto), fecha: t.fecha_hora, estado: 'completada',
          // Desglose para el "Ver detalle" de la devolución
          total_original: Math.round(totalOriginal * 100) / 100,
          comision_retenida: comisionRetenida,
          comision_pct: comisionPct,
          devuelto: Math.round(devuelto * 100) / 100,
        })
        continue
      }

      // RETIROS / vaciado (sale dinero, lo hace el cajero)
      if (tipoOp === 'retiro') {
        movimientos.push({
          id: `T-${t.id_transaccion}`, tipo: 'retiro', titulo: 'Retiro de saldo',
          detalle: 'Retiraste tu dinero en caja', monto: -parseFloat(t.monto), fecha: t.fecha_hora, estado: 'completada',
        })
        continue
      }

      const esConsumo = t.tipo_operacion === 'Consumo'
      const responsable = t.usuario ? `${t.usuario.nombres} ${t.usuario.apellidos}`.trim() : null
      const esAutoservicio = t.usuario?.rol?.nombre_rol === 'Cliente'
      let entradaAsociada = null
      if (!esConsumo) {
        // La transacción de reserva no guarda la entrada: se asocia por
        // cercanía de fecha y monto (misma operación atómica, segundos de diferencia)
        entradaAsociada = entradas.find(e =>
          Math.abs(new Date(e.fecha_reserva) - new Date(t.fecha_hora)) < 60000 &&
          Number(e.monto_pagado) === Number(t.monto)
        )
      }
      // Título y detalle del consumo según ORIGEN y cómo se entregó REALMENTE.
      // Antes todo consumo decía "Pedido en barra" aunque fuera desde la app.
      const origenComanda = t.comanda?.origen
      const modoEntrega = t.comanda?.modo_entrega
      const tituloConsumo = origenComanda === 'app' ? 'Pedido en la app' : 'Pedido en barra'
      const entregaTxt = modoEntrega === 'llevar' ? 'Te lo llevaron a tu lugar'
        : (modoEntrega === 'barra' ? 'Recogido en barra' : null)
      const baseConsumo = esAutoservicio ? 'Pedido desde tu app' : (responsable ? `Te atendió ${responsable}` : 'Pago con billetera')
      movimientos.push({
        id: `T-${t.id_transaccion}`,
        tipo: esConsumo ? 'consumo' : 'reserva',
        titulo: esConsumo ? tituloConsumo : 'Reserva de espacio',
        detalle: esConsumo
          ? (entregaTxt ? `${baseConsumo} · ${entregaTxt}` : baseConsumo)
          : (entradaAsociada
              ? `${entradaAsociada.mesa_espacio ? `${entradaAsociada.mesa_espacio.tipo_elemento === 'silla' ? 'Silla' : 'Mesa'} ${entradaAsociada.mesa_espacio.numero_nombre}` : 'Entrada general'} · ${entradaAsociada.zona?.evento?.nombre_evento || entradaAsociada.zona?.nombre_zona || 'Evento'}`
              : 'Pago de reserva'),
        monto: -parseFloat(t.monto),
        fecha: t.fecha_hora,
        estado: 'completada',
        id_comanda: esConsumo ? t.id_comanda : null,
        items: esConsumo ? (t.comanda?._count?.detalle_comanda ?? null) : null,
      })
    }

    movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    res.json({ movimientos: movimientos.slice(0, 120) })
  } catch (error) {
    console.error('Error obteniendo movimientos:', error)
    res.status(500).json({ error: 'Error al obtener los movimientos' })
  }
})

// ============ GET /api/billetera/movimientos/comanda/:id ============
// Detalle de un consumo: qué productos fueron, a qué precio y quién atendió.
router.get('/movimientos/comanda/:id', verificarToken, async (req, res) => {
  try {
    const id_comanda = Number(req.params.id)
    const comanda = await prisma.comanda.findUnique({
      where: { id_comanda },
      include: {
        detalle_comanda: { include: { producto: { select: { nombre_producto: true, url_imagen: true } } } },
        usuario_comanda_id_meseroTousuario: { select: { nombres: true, apellidos: true, rol: { select: { nombre_rol: true } } } },
      },
    })
    if (!comanda || comanda.id_cliente !== req.usuario.id) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    const atendio = comanda.usuario_comanda_id_meseroTousuario
    const esAutoservicio = atendio?.rol?.nombre_rol === 'Cliente'
    const items = comanda.detalle_comanda.map(d => ({
      nombre: d.producto?.nombre_producto || 'Producto',
      imagen: d.producto?.url_imagen || null,
      cantidad: d.cantidad,
      precio: parseFloat(d.precio_cobrado),
      subtotal: parseFloat(d.subtotal),
    }))

    res.json({
      id_comanda,
      fecha: comanda.fecha_registro,
      metodo_pago: comanda.metodo_pago,
      estado: comanda.estado_despacho,
      atendido_por: esAutoservicio ? 'Pedido desde tu app' : (atendio ? `${atendio.nombres} ${atendio.apellidos}`.trim() : null),
      items,
      total: items.reduce((s, i) => s + i.subtotal, 0),
    })
  } catch (error) {
    console.error('Error obteniendo detalle de consumo:', error)
    res.status(500).json({ error: 'Error al obtener el detalle del pedido' })
  }
})

// ============ GET /api/billetera/qrs-pago ============
// Obtener los QRs de pago (Público y Privado)
router.get('/qrs-pago', verificarToken, async (req, res) => {
  try {
    const billetera = await prisma.billetera.findUnique({
      where: { id_usuario: req.usuario.id }
    })

    if (!billetera) {
      return res.status(404).json({ error: 'El usuario no tiene billetera' })
    }

    const datosQRSinPin = {
      tipo: 'pago_sin_pin',
      qr_publico: billetera.qr_publico,
      usuario: req.usuario.correo
    }

    const datosQRConPin = {
      tipo: 'pago_con_pin',
      qr_publico: billetera.qr_publico,
      requiere_pin: true,
      usuario: req.usuario.correo
    }

    // Asegurar los datos del QR usando JWT para que no puedan ser modificados por un malware.
    // EXPIRAN en 15 minutos: un QR de pago capturado en pantalla no vale para siempre
    // (el front los regenera al abrir el modal, así que el cliente nunca lo nota).
    const firmaSecreta = process.env.JWT_SECRETO_QR
    const tokenSinPin = jwt.sign(datosQRSinPin, firmaSecreta, { expiresIn: '15m' })
    const tokenConPin = jwt.sign(datosQRConPin, firmaSecreta, { expiresIn: '15m' })

    // El QR se DIBUJA en el celular (el front tiene la librería 'qrcode'); aquí
    // solo firmamos el token. Antes generábamos 2 imágenes PNG por cada clic, lo
    // que en la CPU del plan gratis tardaba ~2.5 s. Ahora la respuesta es instantánea.
    res.json({
      qr_sin_pin: { token: tokenSinPin, identificador: billetera.qr_publico },
      qr_con_pin: { token: tokenConPin, identificador: billetera.qr_publico }
    })
  } catch (error) {
    console.error('Error generando QRs de pago:', error)
    res.status(500).json({ error: 'Error al generar QRs de pago' })
  }
})

// ============ POST /api/billetera/pin ============
// Actualizar el PIN transaccional del usuario.
// Si ya existe un PIN, se verifica la identidad del dueño con su CONTRASEÑA de
// cuenta (así puede cambiarlo aunque haya OLVIDADO el PIN anterior). Se mantiene
// compatibilidad con "pin_actual" si algún cliente antiguo lo sigue enviando.
router.post('/pin', verificarToken, async (req, res) => {
  try {
    const { nuevo_pin, pin_actual, password } = req.body

    if (!nuevo_pin || String(nuevo_pin).length !== 4 || !/^\d{4}$/.test(String(nuevo_pin))) {
      return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos' })
    }

    const billetera = await prisma.billetera.findUnique({ where: { id_usuario: req.usuario.id } })
    if (!billetera) {
      return res.status(400).json({ error: 'Aún no tienes billetera: se crea con tu primera recarga. Después puedes configurar tu PIN.' })
    }

    // Si aún no hay PIN, se fija sin verificación extra (es la primera vez).
    // Si ya existe, se exige contraseña de cuenta (preferido) o PIN actual (legado).
    if (billetera.pin_transaccional) {
      if (password) {
        const usuario = await prisma.usuario.findUnique({ where: { id_usuario: req.usuario.id } })
        const passwordValido = usuario && await bcrypt.compare(String(password), usuario.password_hash)
        if (!passwordValido) return res.status(400).json({ error: 'Contraseña incorrecta.' })
      } else if (pin_actual) {
        const actualValido = await verificarPin(pin_actual, billetera.pin_transaccional)
        if (!actualValido) return res.status(400).json({ error: 'El PIN actual es incorrecto.', requiere_pin_actual: true })
      } else {
        return res.status(400).json({ error: 'Confirma tu contraseña para cambiar el PIN.', requiere_password: true })
      }
    }

    // Se guarda cifrado (reversible con la clave del servidor) para que el
    // dueño pueda VERLO con el ojito de la tarjeta confirmando su contraseña.
    await prisma.billetera.update({
      where: { id_usuario: req.usuario.id },
      data: { pin_transaccional: cifrarPin(nuevo_pin) }
    })

    res.json({ mensaje: 'PIN actualizado exitosamente' })
  } catch (error) {
    console.error('Error actualizando PIN:', error)
    res.status(500).json({ error: 'Error al actualizar el PIN' })
  }
})

// ============ POST /api/billetera/pin/revelar ============
// "Ojito" de la tarjeta: muestra el PIN al dueño si confirma su contraseña
// de la cuenta (así, si lo olvidó, lo ve sin tener que cambiarlo).
// Devuelve además un TICKET de 5 minutos: mientras sea válido, el cliente
// puede volver a ver su PIN (incluso tras navegar) sin reingresar la
// contraseña — se envía { ticket } en lugar de { password }.
router.post('/pin/revelar', verificarToken, async (req, res) => {
  try {
    const { password, ticket } = req.body

    let autorizado = false
    if (ticket) {
      try {
        const datos = jwt.verify(String(ticket), process.env.JWT_SECRETO)
        autorizado = datos.uso === 'ver-pin' && datos.id === req.usuario.id
      } catch (e) { /* expirado o inválido: cae a pedir contraseña */ }
      if (!autorizado) return res.status(400).json({ error: 'Confirma tu contraseña para ver el PIN.', ticket_vencido: true })
    } else {
      if (!password) return res.status(400).json({ error: 'Confirma tu contraseña para ver el PIN.' })
      const usuario = await prisma.usuario.findUnique({ where: { id_usuario: req.usuario.id } })
      autorizado = usuario && await bcrypt.compare(String(password), usuario.password_hash)
      if (!autorizado) return res.status(400).json({ error: 'Contraseña incorrecta.' })
    }

    const billetera = await prisma.billetera.findUnique({ where: { id_usuario: req.usuario.id } })
    if (!billetera?.pin_transaccional) {
      return res.status(400).json({ error: 'Aún no tienes un PIN configurado.' })
    }

    const pin = descifrarPin(billetera.pin_transaccional)
    if (!pin) {
      // PIN guardado con el formato antiguo (hash irreversible)
      return res.status(400).json({
        error: 'Tu PIN fue guardado con el formato anterior y no puede mostrarse. Configúralo de nuevo y desde ahí podrás verlo.',
        requiere_reconfigurar: true,
      })
    }

    const ticketNuevo = jwt.sign({ id: req.usuario.id, uso: 'ver-pin' }, process.env.JWT_SECRETO, { expiresIn: '5m' })
    res.json({ pin, ticket: ticketNuevo })
  } catch (error) {
    console.error('Error revelando PIN:', error)
    res.status(500).json({ error: 'Error al revelar el PIN' })
  }
})

// ============ GET /api/billetera/admin/reporte-completo ============
// Reporte completo de billetera para el Admin
// GET /api/billetera/admin/flujo-dinero — resumen del dinero: entró, consumido,
// devuelto, retirado y retenido por normas. Filtro opcional ?desde=&hasta=.
router.get('/admin/flujo-dinero', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const rango = {}
    if (req.query.desde) rango.gte = new Date(req.query.desde + 'T00:00:00')
    if (req.query.hasta) rango.lte = new Date(req.query.hasta + 'T23:59:59')
    const whereFecha = (req.query.desde || req.query.hasta) ? { fecha_hora: rango } : {}

    const porTipo = await prisma.transaccion.groupBy({
      by: ['tipo_operacion'],
      where: whereFecha,
      _sum: { monto: true },
      _count: { _all: true },
    })
    const suma = (pred) => porTipo.filter(t => pred(t.tipo_operacion)).reduce((a, t) => a + Number(t._sum.monto || 0), 0)
    const cuenta = (pred) => porTipo.filter(t => pred(t.tipo_operacion)).reduce((a, t) => a + t._count._all, 0)

    const esRecarga = t => t.toLowerCase().startsWith('recarga')
    const entro = suma(esRecarga)
    const consumido = suma(t => t === 'Consumo' || t === 'Reserva')
    const devuelto = suma(t => t === 'reembolso')
    const retirado = suma(t => t === 'retiro')

    // Redondeo entregado DE MÁS en los retiros en efectivo (se da un poco más para
    // no lidiar con centavos). Se reporta para que la CAJA cuadre: el efectivo
    // entregado = retirado + redondeo. No es comisión (los retiros no cobran).
    const whereRetiro = (req.query.desde || req.query.hasta)
      ? { estado: 'pagado', fecha_pago: rango }
      : { estado: 'pagado' }
    const retAgg = await prisma.solicitud_retiro.aggregate({ where: whereRetiro, _sum: { diferencia: true, monto_entregado: true } })
    const redondeo = Number(retAgg._sum.diferencia || 0)
    const entregado_efectivo = Number(retAgg._sum.monto_entregado || 0)

    res.json({
      entro: Math.round(entro * 100) / 100,
      consumido: Math.round(consumido * 100) / 100,
      devuelto: Math.round(devuelto * 100) / 100,
      retirado: Math.round(retirado * 100) / 100,
      entregado_efectivo: Math.round(entregado_efectivo * 100) / 100,
      // Redondeo entregado de más en efectivo (para cuadrar caja). Alias `retenido`
      // por compatibilidad con la UI existente.
      redondeo: Math.round(redondeo * 100) / 100,
      retenido: Math.round(redondeo * 100) / 100,
      saldo_neto: Math.round((entro - retirado) * 100) / 100,
      conteos: {
        recargas: cuenta(esRecarga),
        consumos: cuenta(t => t === 'Consumo' || t === 'Reserva'),
        devoluciones: cuenta(t => t === 'reembolso'),
        retiros: cuenta(t => t === 'retiro'),
      },
    })
  } catch (error) {
    console.error('Error en flujo de dinero:', error)
    res.status(500).json({ error: 'Error al generar el flujo de dinero' })
  }
})

router.get('/admin/reporte-completo', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    // ---- Filtro opcional por rango de fechas (aplica a los FLUJOS: recargas y ventas) ----
    // Sin parámetros = histórico completo (compatibilidad hacia atrás).
    const { desde, hasta } = req.query
    let rangoFecha = null
    if (req.query.evento) {
      // Reporte POR EVENTO: la ventana horaria del evento define el periodo (igual que resumen-ventas)
      const ev = await prisma.evento.findUnique({ where: { id_evento: Number(req.query.evento) } })
      if (ev) {
        rangoFecha = { gte: ev.fecha_hora_inicio, lte: ev.fecha_hora_fin || new Date() }
      }
    } else if (desde || hasta) {
      rangoFecha = {}
      if (desde) rangoFecha.gte = new Date(desde)
      if (hasta) {
        // Si viene solo la fecha (YYYY-MM-DD), incluir todo el día hasta las 23:59:59.
        rangoFecha.lte = hasta.length === 10 ? new Date(hasta + 'T23:59:59.999') : new Date(hasta)
      }
    }
    const filtroRecarga = rangoFecha ? { fecha_solicitud: rangoFecha } : {}
    // Las ventas nunca cuentan comandas Canceladas; y opcionalmente se filtran por fecha.
    const filtroComandaVenta = {
      metodo_pago: 'Billetera',
      estado_despacho: { not: 'Cancelada' },
      ...(rangoFecha ? { fecha_registro: rangoFecha } : {})
    }

    // 1. Total de billeteras activas (con saldo > 0)
    const billeterasActivas = await prisma.billetera.count({
      where: { saldo_actual: { gt: 0 } }
    })

    // 2. Total de billeteras registradas
    const billeterasTotales = await prisma.billetera.count()

    // 3. Saldo acumulado en todas las billeteras
    const saldoAgregado = await prisma.billetera.aggregate({
      _sum: { saldo_actual: true }
    })

    // 4. Recargas: cantidad y monto total
    const recargasTotal = await prisma.recarga_billetera.aggregate({
      where: filtroRecarga,
      _count: { id_recarga: true },
      _sum: { monto_recarga: true }
    })

    // 5. Desglose de recargas por método (quién hizo la recarga: usuario o cajero)
    const recargas = await prisma.recarga_billetera.findMany({
      where: filtroRecarga,
      include: {
        usuario: { select: { id_rol: true, nombres: true, apellidos: true } }
      },
      orderBy: { fecha_solicitud: 'desc' }
    })

    const recargasPropia = recargas.filter(r => r.numero_transaccion?.startsWith('RECARGA-') || !r.numero_transaccion?.startsWith('CAJ-')).length
    const recargasCajero = recargas.filter(r => r.numero_transaccion?.startsWith('CAJ-')).length

    // 6. Pedidos pagados con billetera (excluye Canceladas; opcionalmente por fecha)
    const pedidosBilletera = await prisma.comanda.count({
      where: filtroComandaVenta
    })

    const montoPedidosBilletera = await prisma.detalle_comanda.aggregate({
      where: {
        comanda: filtroComandaVenta
      },
      _sum: { subtotal: true }
    })

    // 7. Top 5 recargas más grandes
    const topRecargas = await prisma.recarga_billetera.findMany({
      where: filtroRecarga,
      orderBy: { monto_recarga: 'desc' },
      take: 5,
      include: {
        usuario: { select: { nombres: true, apellidos: true, id_rol: true } }
      }
    })

    // 8. Historial de recargas recientes (últimas 20)
    const recargasRecientes = await prisma.recarga_billetera.findMany({
      where: filtroRecarga,
      orderBy: { fecha_solicitud: 'desc' },
      take: 20,
      include: {
        usuario: { select: { nombres: true, apellidos: true, id_rol: true } }
      }
    })

    // 9. Clientes con más saldo
    const topClientes = await prisma.billetera.findMany({
      orderBy: { saldo_actual: 'desc' },
      take: 5,
      include: {
        usuario: { select: { nombres: true, apellidos: true, correo: true } }
      }
    })

    // 10. Distribución de métodos de recarga por cajero
    const transaccionesCajeros = await prisma.transaccion.groupBy({
      by: ['id_responsable'],
      where: {
        tipo_operacion: { contains: 'recarg' }
      },
      _count: { id_transaccion: true },
      _sum: { monto: true },
      orderBy: { _count: { id_transaccion: 'desc' } },
      take: 20
    })

    // Enriquecer con nombres (solo cajeros/staff, id_rol != 5)
    const cajeroIds = transaccionesCajeros.map(c => c.id_responsable)
    const cajeroUsuarios = await prisma.usuario.findMany({
      where: {
        id_usuario: { in: cajeroIds },
        id_rol: { not: 5 } // Solo staff (Cajeros, Admins, etc.)
      },
      select: { id_usuario: true, nombres: true, apellidos: true, id_rol: true }
    })

    const cajeroEnriquecido = transaccionesCajeros
      .filter(c => cajeroUsuarios.some(u => u.id_usuario === c.id_responsable))
      .map(c => {
        const u = cajeroUsuarios.find(u => u.id_usuario === c.id_responsable)
        return {
          id: c.id_responsable,
          nombre: u ? `${u.nombres} ${u.apellidos}` : 'Desconocido',
          rol: u?.id_rol,
          cantidad: c._count.id_transaccion,
          monto_total: parseFloat(c._sum.monto || 0)
        }
      })
      .slice(0, 5) // Solo mostrar el Top 5

    res.json({
      billeteras: {
        total: billeterasTotales,
        activas: billeterasActivas,
        saldo_circulante: parseFloat(saldoAgregado._sum.saldo_actual || 0)
      },
      recargas: {
        total_operaciones: recargasTotal._count.id_recarga,
        monto_total: parseFloat(recargasTotal._sum.monto_recarga || 0),
        por_cuenta_propia: recargasPropia,
        por_cajero: recargasCajero
      },
      uso_billetera: {
        pedidos_pagados: pedidosBilletera,
        monto_consumido: parseFloat(montoPedidosBilletera._sum.subtotal || 0)
      },
      top_clientes: topClientes.map(b => ({
        nombre: b.usuario ? `${b.usuario.nombres} ${b.usuario.apellidos}` : '?',
        correo: b.usuario?.correo,
        saldo: parseFloat(b.saldo_actual)
      })),
      top_recargas: topRecargas.map(r => ({
        monto: parseFloat(r.monto_recarga),
        nombre: r.usuario ? `${r.usuario.nombres} ${r.usuario.apellidos}` : '?',
        rol: r.usuario?.id_rol,
        fecha: r.fecha_solicitud
      })),
      recientes: recargasRecientes.map(r => ({
        id: r.id_recarga,
        monto: parseFloat(r.monto_recarga),
        nombre: r.usuario ? `${r.usuario.nombres} ${r.usuario.apellidos}` : '?',
        rol: r.usuario?.id_rol,
        fecha: r.fecha_solicitud,
        estado: r.estado
      })),
      actividad_cajeros: cajeroEnriquecido
    })
  } catch (error) {
    console.error('Error en reporte de billetera:', error)
    res.status(500).json({ error: 'Error al generar reporte de billetera' })
  }
})

// ============ RETIRO DE BILLETERA (el cliente solicita, el cajero paga) ============

// POST /api/billetera/retiro/solicitar — multipart opcional { imagen (QR) }, body { mensaje, metodo }
router.post('/retiro/solicitar', verificarToken, subirFotoPerfil.single('imagen'), async (req, res) => {
  try {
    const id_cliente = req.usuario.id
    const metodo = req.body.metodo === 'qr' ? 'qr' : 'persona'
    const mensaje = req.body.mensaje ? String(req.body.mensaje).slice(0, 400) : null

    const billetera = await prisma.billetera.findUnique({ where: { id_usuario: id_cliente } })
    if (!billetera) return res.status(400).json({ error: 'No tienes billetera.' })
    if (Number(billetera.saldo_actual) <= 0) return res.status(400).json({ error: 'No tienes saldo para retirar.' })

    // Una solicitud pendiente a la vez.
    const pendiente = await prisma.solicitud_retiro.findFirst({ where: { id_cliente, estado: 'pendiente' } })
    if (pendiente) return res.status(409).json({ error: 'Ya tienes una solicitud de retiro pendiente.' })

    const solicitud = await prisma.solicitud_retiro.create({
      data: {
        id_cliente,
        metodo,
        mensaje,
        qr_imagen: req.file ? req.file.path : null,
        estado: 'pendiente',
        saldo_al_solicitar: billetera.saldo_actual,
      },
    })
    if (global.io) global.io.emit('retiro_solicitado', { id_solicitud: solicitud.id_solicitud })
    res.status(201).json({ mensaje: 'Solicitud de retiro enviada. El cajero te contactará.', id_solicitud: solicitud.id_solicitud })
  } catch (error) {
    console.error('Error solicitando retiro:', error)
    res.status(500).json({ error: 'No se pudo registrar la solicitud.' })
  }
})

// GET /api/billetera/retiro/mias — solicitudes de retiro del cliente.
router.get('/retiro/mias', verificarToken, async (req, res) => {
  try {
    const solicitudes = await prisma.solicitud_retiro.findMany({
      where: { id_cliente: req.usuario.id },
      orderBy: { fecha: 'desc' },
      take: 20,
    })
    res.json(solicitudes.map(s => ({
      id_solicitud: s.id_solicitud,
      metodo: s.metodo,
      mensaje: s.mensaje,
      estado: s.estado,
      saldo_al_solicitar: Number(s.saldo_al_solicitar),
      monto_retirado: s.monto_retirado != null ? Number(s.monto_retirado) : null,
      monto_entregado: s.monto_entregado != null ? Number(s.monto_entregado) : null,
      diferencia: s.diferencia != null ? Number(s.diferencia) : null,
      fecha: s.fecha,
      fecha_pago: s.fecha_pago,
    })))
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus solicitudes' })
  }
})

// DELETE /api/billetera/retiro/:id — el cliente cancela su solicitud pendiente.
router.delete('/retiro/:id', verificarToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const sol = await prisma.solicitud_retiro.findUnique({ where: { id_solicitud: id } })
    if (!sol || sol.id_cliente !== req.usuario.id) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (sol.estado !== 'pendiente') return res.status(409).json({ error: 'Ya fue procesada, no se puede cancelar.' })
    await prisma.solicitud_retiro.delete({ where: { id_solicitud: id } })
    res.json({ mensaje: 'Solicitud cancelada' })
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cancelar' })
  }
})

module.exports = router
