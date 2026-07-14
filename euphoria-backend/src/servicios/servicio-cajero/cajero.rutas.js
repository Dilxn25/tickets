const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { generarIDUnico } = require('../servicio-billetera/qr-utilidades')
const { notificar } = require('../../utilidades/notificaciones')
const { subirImagenDocumento } = require('../../config/cloudinary')
const { hoyBolivia } = require('../../utilidades/tiempo')

// Todas las rutas de caja requieren sesion valida Y rol de Cajero o Administrador.
router.use(verificarToken)
router.use(soloRoles('Cajero', 'Administrador'))

// GET /api/cajero/buscar-cliente?q=87 - Autocompletado por teléfono o CI
// GET /api/cajero/qrs-cliente/:id — los MISMOS QRs que el cliente ve en su
// perfil (R1.2): mismos payloads y misma vigencia de 15 min, firmados igual
// que en GET /billetera/mis-qr. El cajero nunca genera QRs "propios".
router.get('/qrs-cliente/:id', async (req, res) => {
  try {
    const idUsuario = Number(req.params.id)
    const billetera = await prisma.billetera.findUnique({
      where: { id_usuario: idUsuario },
      include: { usuario: { select: { correo: true } } },
    })
    if (!billetera) return res.status(404).json({ error: 'El cliente no tiene billetera.' })
    const firmaSecreta = process.env.JWT_SECRETO_QR
    const base = { qr_publico: billetera.qr_publico, usuario: billetera.usuario.correo }
    res.json({
      qr_sin_pin: { token: jwt.sign({ tipo: 'pago_sin_pin', ...base }, firmaSecreta, { expiresIn: '15m' }), identificador: billetera.qr_publico },
      qr_con_pin: { token: jwt.sign({ tipo: 'pago_con_pin', requiere_pin: true, ...base }, firmaSecreta, { expiresIn: '15m' }), identificador: billetera.qr_publico },
    })
  } catch (error) {
    console.error('Error generando QRs del cliente:', error)
    res.status(500).json({ error: 'No se pudieron generar los QRs.' })
  }
})

// GET /api/cajero/pulso — cifras del turno de HOY (hora boliviana): cuánto se
// recargó, cuánto se retiró y cuántas billeteras nuevas. Solo números.
router.get('/pulso', async (req, res) => {
  try {
    const hoy = hoyBolivia()
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const [recargas, retiros] = await Promise.all([
      prisma.recarga_billetera.aggregate({
        where: { fecha_solicitud: { gte: inicioDia } },
        _sum: { monto_recarga: true },
        _count: true,
      }),
      prisma.solicitud_retiro.aggregate({
        where: { estado: 'pagado', fecha_pago: { gte: inicioDia } },
        _sum: { monto_entregado: true },
        _count: true,
      }),
    ])
    res.json({
      recargado: Number(recargas._sum.monto_recarga) || 0,
      retirado: Number(retiros._sum.monto_entregado) || 0,
      operaciones: (recargas._count || 0) + (retiros._count || 0),
    })
  } catch (error) {
    console.error('Error en pulso de caja:', error)
    res.status(500).json({ error: 'Error al calcular el pulso' })
  }
})

router.get('/buscar-cliente', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 1) return res.json([])

    const usuarios = await prisma.usuario.findMany({
      where: {
        rol: { nombre_rol: 'Cliente' }, // Solo se buscan clientes (antes el filtro era un no-op)
        OR: [
          // 'contains' porque el teléfono se guarda con prefijo +591 (ej. buscar 72285280 encuentra +59172285280)
          { telefono: { contains: q } },
          { ci_carnet: { contains: q } },
          { nombres: { contains: q } },
          { apellidos: { contains: q } },
          { correo: { contains: q } },
          // También por el CÓDIGO CORTO de la billetera (ej. "U15-4832"): el
          // cliente lo dicta y las coincidencias aparecen mientras se escribe.
          { billetera: { qr_publico: { contains: q } } },
        ]
      },
      select: {
        id_usuario: true,
        nombres: true,
        apellidos: true,
        telefono: true,
        ci_carnet: true,
        correo: true,
        billetera: { select: { saldo_actual: true, qr_publico: true } }
      },
      take: 8
    })

    res.json(usuarios)
  } catch (error) {
    console.error('Error buscando cliente:', error)
    res.status(500).json({ error: 'Error al buscar cliente' })
  }
})

// GET /api/cajero/mi-qr - Obtener QR del cajero logueado para cobro QR
router.get('/mi-qr', async (req, res) => {
  try {
    const idCajero = req.usuario?.id
    const billetera = await prisma.billetera.findUnique({
      where: { id_usuario: idCajero },
      select: { qr_publico: true, saldo_actual: true }
    })

    if (!billetera) {
      return res.status(404).json({ error: 'El cajero no tiene billetera registrada' })
    }

    res.json({ qr_publico: billetera.qr_publico })
  } catch (error) {
    console.error('Error obteniendo QR cajero:', error)
    res.status(500).json({ error: 'Error al obtener QR' })
  }
})
// GET /api/cajero/historial - Ver todas las recargas (pendientes, completadas, rechazadas)
router.get('/historial', async (req, res) => {
  try {
    const historial = await prisma.recarga_billetera.findMany({
      include: {
        usuario: { select: { nombres: true, apellidos: true, correo: true, telefono: true, ci_carnet: true } }
      },
      orderBy: { fecha_solicitud: 'desc' },
      take: 200 // Limitar a las últimas 200
    })
    res.json(historial)
  } catch (error) {
    console.error('Error obteniendo historial de recargas:', error)
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

// GET /api/cajero/consultar-billetera/:identificador
router.get('/consultar-billetera/:identificador', async (req, res) => {
  try {
    const { identificador } = req.params
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { telefono: identificador },
          { ci_carnet: identificador },
          { correo: { equals: identificador } },
          { correo: { equals: `${identificador}@euphoria.com` } },
          // Código corto de la billetera (U15-4832): el identificador natural en caja
          { billetera: { qr_publico: identificador } },
        ]
      },
      include: {
        billetera: true
      }
    })

    if (!usuario || !usuario.billetera) {
      return res.status(404).json({ error: 'No se encontró billetera para este usuario' })
    }

    const datosQR = {
      tipo: 'pago_con_pin',
      qr_publico: usuario.billetera.qr_publico,
      requiere_pin: true,
      usuario: usuario.correo
    }
    const tokenQR = jwt.sign(datosQR, process.env.JWT_SECRETO_QR)

    res.json({
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      telefono: usuario.telefono,
      ci_carnet: usuario.ci_carnet,
      saldo: parseFloat(usuario.billetera.saldo_actual),
      qr_publico: usuario.billetera.qr_publico,
      token_qr: tokenQR,
      estado: usuario.estado_cuenta,
      id_usuario: usuario.id_usuario
    })
  } catch (error) {
    console.error('Error al consultar billetera:', error)
    res.status(500).json({ error: 'Error interno' })
  }
})

// POST /api/cajero/resetear-pin
router.post('/resetear-pin', async (req, res) => {
  try {
    const { id_usuario, nuevo_pin } = req.body
    if (!nuevo_pin || nuevo_pin.length !== 4) return res.status(400).json({ error: 'PIN debe ser de 4 dígitos' })

    const { cifrarPin } = require('../../utilidades/pin-billetera')

    await prisma.billetera.update({
      where: { id_usuario },
      data: { pin_transaccional: cifrarPin(nuevo_pin) }
    })
    res.json({ mensaje: 'PIN actualizado exitosamente' })
  } catch (error) {
    console.error('Error reseteando PIN:', error)
    res.status(500).json({ error: 'Error al cambiar PIN' })
  }
})

// POST /api/cajero/resolver - Aprobar o rechazar recarga
router.post('/resolver', async (req, res) => {
  try {
    const { id_recarga, estado } = req.body
    
    if (!['completada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const recarga = await prisma.recarga_billetera.findUnique({
      where: { id_recarga }
    })

    if (!recarga) return res.status(404).json({ error: 'Recarga no encontrada' })
    if (recarga.estado !== 'pendiente') return res.status(400).json({ error: 'La recarga ya fue procesada' })

    // Se procesa de forma ATOMICA: solo se acredita si la recarga SIGUE pendiente.
    // updateMany con filtro de estado garantiza que dos aprobaciones simultaneas no dupliquen el saldo.
    const resultado = await prisma.$transaction(async (tx) => {
      const marcada = await tx.recarga_billetera.updateMany({
        where: { id_recarga, estado: 'pendiente' },
        data: { estado, fecha_confirmacion: new Date() }
      })
      if (marcada.count === 0) return { yaProcesada: true, billetera: null }

      let billetera = null
      if (estado === 'completada') {
        billetera = await tx.billetera.update({
          where: { id_usuario: recarga.id_usuario },
          data: {
            saldo_actual: { increment: recarga.monto_recarga },
            ultima_actualizacion: new Date()
          }
        })
      }
      return { yaProcesada: false, billetera }
    })

    if (resultado.yaProcesada) {
      return res.status(400).json({ error: 'La recarga ya fue procesada' })
    }

    // Sincronización en tiempo real (fuera de la transacción)
    if (estado === 'completada' && resultado.billetera && global.io) {
      global.io.emit('billetera_actualizada', { id_usuario: recarga.id_usuario })
    }

    res.json({ mensaje: `Recarga ${estado} exitosamente` })
  } catch (error) {
    console.error('Error resolviendo recarga:', error)
    res.status(500).json({ error: 'Error al resolver recarga' })
  }
})

// POST /api/cajero/recargar - Recarga manual directa
router.post('/recargar', async (req, res) => {
  try {
    const { identificador, monto, metodo } = req.body
    const montoFloat = parseFloat(monto)
    const idCajero = req.usuario?.id

    if (!identificador || !montoFloat || montoFloat <= 0) {
      return res.status(400).json({ error: 'Datos inválidos para recargar' })
    }

    // Limite maximo de recarga por operacion
    const MONTO_MAXIMO_RECARGA = 9999
    if (montoFloat > MONTO_MAXIMO_RECARGA) {
      return res.status(400).json({ error: `El monto maximo por recarga es Bs. ${MONTO_MAXIMO_RECARGA}` })
    }

    // Buscar billetera por qr_publico, correo, teléfono o CI
    let billetera = await prisma.billetera.findFirst({
      where: {
        OR: [
          { qr_publico: identificador },
          { usuario: { correo: identificador } },
          { usuario: { telefono: identificador } },
          { usuario: { ci_carnet: identificador } }
        ]
      },
      include: { usuario: true }
    })

    if (!billetera) return res.status(404).json({ error: 'Usuario o billetera no encontrado' })

    const numTransaccion = `CAJ-${Date.now()}`
    const ahora = new Date()

    // 1 y 2. Crear la recarga y aumentar el saldo de forma ATOMICA (o todo, o nada)
    const billeteraActualizada = await prisma.$transaction(async (tx) => {
      await tx.recarga_billetera.create({
        data: {
          id_usuario: billetera.id_usuario,
          id_billetera: billetera.id_billetera,
          monto_recarga: montoFloat,
          estado: 'completada',
          numero_transaccion: numTransaccion,
          fecha_confirmacion: ahora
        }
      })
      return tx.billetera.update({
        where: { id_usuario: billetera.id_usuario },
        data: {
          saldo_actual: { increment: montoFloat },
          ultima_actualizacion: ahora
        }
      })
    })

    // 3. Registrar transaccion contable (REGLA 5 — CONDICIONES.md)
    // Se hace en bloque separado para que un fallo aquí no bloquee la recarga
    try {
      await prisma.transaccion.create({
        data: {
          id_billetera: billetera.id_billetera,
          id_responsable: idCajero || billetera.id_usuario,
          tipo_operacion: `recarga_${(metodo || 'efectivo').substring(0, 20)}`,
          monto: montoFloat,
          fecha_hora: ahora
        }
      })
    } catch (errTrx) {
      console.error('Advertencia: no se pudo registrar transaccion contable:', errTrx.message)
    }

    // 4. Sincronización en tiempo real
    if (global.io) {
      global.io.emit('billetera_actualizada', { id_usuario: billetera.id_usuario })
      global.io.emit('recarga_registrada')
    }

    res.json({
      mensaje: 'Recarga completada con éxito',
      saldo_nuevo: parseFloat(billeteraActualizada.saldo_actual),
      numero_transaccion: numTransaccion
    })
  } catch (error) {
    console.error('Error en recarga manual — detalle completo:', JSON.stringify(error, null, 2))
    res.status(500).json({ error: 'Error interno al recargar' })
  }
})


// POST /api/cajero/resolver-qr — identifica al cliente a partir de CUALQUIER QR
// suyo: el token de pago (JWT con qr_publico) o un identificador directo.
router.post('/resolver-qr', async (req, res) => {
  try {
    let ident = String(req.body.texto || '').trim()
    if (!ident) return res.status(400).json({ error: 'El QR está vacío.' })
    // Si es un token JWT (a.b.c), sacamos el qr_publico de su interior.
    if (ident.split('.').length === 3) {
      let payload = null
      try { payload = jwt.verify(ident, process.env.JWT_SECRETO_QR) }
      catch { try { payload = jwt.decode(ident) } catch { /* no era JWT */ } }
      if (payload && payload.qr_publico) ident = payload.qr_publico
    }
    const billetera = await prisma.billetera.findFirst({
      where: { OR: [
        { qr_publico: ident },
        { usuario: { correo: ident } },
        { usuario: { telefono: ident } },
        { usuario: { ci_carnet: ident } },
      ] },
      include: { usuario: true },
    })
    if (!billetera) return res.status(404).json({ error: 'No encontramos una billetera con ese QR.' })
    const u = billetera.usuario
    res.json({
      id_usuario: u.id_usuario, nombres: u.nombres, apellidos: u.apellidos,
      telefono: u.telefono, ci_carnet: u.ci_carnet, correo: u.correo,
      billetera: { saldo_actual: Number(billetera.saldo_actual), qr_publico: billetera.qr_publico },
    })
  } catch (error) {
    console.error('Error resolviendo QR:', error)
    res.status(500).json({ error: 'No se pudo leer el QR.' })
  }
})

// ================= RETIROS DE BILLETERA (efectivo) =================

// GET /api/cajero/retiros?estado=pendiente — solicitudes de retiro de clientes.
router.get('/retiros', async (req, res) => {
  try {
    const estado = req.query.estado || 'pendiente'
    const solicitudes = await prisma.solicitud_retiro.findMany({
      where: estado === 'todas' ? {} : { estado },
      orderBy: { fecha: 'desc' },
      take: 100,
      include: {
        cliente: { select: { id_usuario: true, nombres: true, apellidos: true, telefono: true, correo: true, url_foto_perfil: true, billetera: { select: { saldo_actual: true } } } },
        cajero: { select: { nombres: true, apellidos: true } },
      },
    })
    res.json(solicitudes.map(s => ({
      id_solicitud: s.id_solicitud,
      id_cliente: s.id_cliente,
      cliente: `${s.cliente.nombres} ${s.cliente.apellidos || ''}`.trim(),
      foto_cliente: s.cliente.url_foto_perfil || null,  // para identificarlo en caja
      telefono: s.cliente.telefono,
      correo: s.cliente.correo,
      saldo_actual: Number(s.cliente.billetera?.saldo_actual || 0),
      saldo_al_solicitar: Number(s.saldo_al_solicitar),
      mensaje: s.mensaje,
      metodo: s.metodo,
      qr_imagen: s.qr_imagen,                          // el QR que ENVIÓ el cliente
      comprobante_pago: s.comprobante_pago || null,    // constancia del cajero
      motivo_rechazo: s.motivo_rechazo || null,
      atendido_por: s.cajero ? `${s.cajero.nombres} ${s.cajero.apellidos || ''}`.trim() : null,
      estado: s.estado,
      monto_retirado: s.monto_retirado != null ? Number(s.monto_retirado) : null,
      monto_entregado: s.monto_entregado != null ? Number(s.monto_entregado) : null,
      diferencia: s.diferencia != null ? Number(s.diferencia) : null,
      fecha: s.fecha,
      fecha_pago: s.fecha_pago,
    })))
  } catch (error) {
    console.error('Error listando retiros:', error)
    res.status(500).json({ error: 'Error al listar retiros' })
  }
})

// Procesa un retiro SIN COMISIÓN. El monto que sale de la billetera (retirado) es
// exacto; lo que recibe el cliente (entregado) depende del método:
//   - EFECTIVO: se redondea HACIA ARRIBA a 0.10 (recibe un poco más, nunca menos,
//     para no lidiar con centavos). Ese "de más" se registra como REDONDEO para
//     que la caja cuadre (pequeña fuga controlada, no es comisión).
//   - QR / transferencia: monto EXACTO (sin redondeo).
async function procesarRetiro({ id_cliente, monto_retirado, metodo, id_cajero }) {
  const retirado = Math.round(Number(monto_retirado) * 100) / 100
  if (!(retirado > 0)) return { error: 'El monto a retirar debe ser mayor a 0.', status: 400 }

  const esEfectivo = (metodo || 'persona') !== 'qr'
  const entregado = esEfectivo ? Math.ceil(retirado * 10) / 10 : retirado
  // redondeo = lo que el local entrega DE MÁS (>= 0). Se guarda para la caja.
  const redondeo = Math.round((entregado - retirado) * 100) / 100

  const billetera = await prisma.billetera.findUnique({ where: { id_usuario: id_cliente } })
  if (!billetera) return { error: 'El cliente no tiene billetera.', status: 404 }
  if (Number(billetera.saldo_actual) < retirado) return { error: 'El cliente no tiene saldo suficiente para ese retiro.', status: 400 }

  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    const desc = await tx.billetera.updateMany({
      where: { id_billetera: billetera.id_billetera, saldo_actual: { gte: retirado } },
      data: { saldo_actual: { decrement: retirado }, ultima_actualizacion: ahora },
    })
    if (desc.count === 0) throw new Error('SALDO_INSUFICIENTE')
    await tx.transaccion.create({
      data: { id_billetera: billetera.id_billetera, id_responsable: id_cajero, tipo_operacion: 'retiro', monto: retirado, fecha_hora: ahora },
    })
  })
  if (global.io) global.io.emit('billetera_actualizada', { id_usuario: id_cliente })
  // `diferencia` = redondeo entregado de más (para el reporte de caja).
  return { diferencia: redondeo, redondeo, retirado, entregado, esEfectivo, ahora }
}

// POST /api/cajero/retiros/:id/pagar — multipart opcional { comprobante }.
// Body: { monto_retirado }. En pagos por QR el comprobante del cajero es
// OBLIGATORIO: es la constancia de que el depósito se hizo (control de caja
// y respaldo para el cliente).
router.post('/retiros/:id/pagar', subirImagenDocumento.single('comprobante'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const sol = await prisma.solicitud_retiro.findUnique({ where: { id_solicitud: id } })
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (sol.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya fue procesada.' })
    if (sol.metodo === 'qr' && !req.file) {
      return res.status(400).json({ error: 'Adjunta el comprobante del depósito para completar el retiro por QR.' })
    }

    const r = await procesarRetiro({
      id_cliente: sol.id_cliente,
      monto_retirado: req.body.monto_retirado,
      metodo: sol.metodo,
      id_cajero: req.usuario.id,
    })
    if (r.error) return res.status(r.status).json({ error: r.error })

    await prisma.solicitud_retiro.update({
      where: { id_solicitud: id },
      data: {
        estado: 'pagado', monto_retirado: r.retirado, monto_entregado: r.entregado,
        diferencia: r.diferencia, id_cajero: req.usuario.id, fecha_pago: r.ahora,
        comprobante_pago: req.file ? req.file.path : null,
      },
    })
    const msgRetiro = r.esEfectivo
      ? `Se retiraron Bs ${r.retirado} de tu billetera. Recibiste Bs ${r.entregado} en efectivo.`
      : `Se retiraron Bs ${r.retirado} de tu billetera. Se transfirieron Bs ${r.entregado} a tu cuenta/QR.${req.file ? ' El comprobante del depósito está en tu billetera.' : ''}`
    await notificar(sol.id_cliente, { tipo: 'billetera', titulo: 'Retiro procesado', mensaje: msgRetiro, url: '/cliente/billetera' })
    if (global.io) global.io.emit('retiro_solicitado', { id_solicitud: id, estado: 'pagado' })
    res.json({ mensaje: 'Retiro pagado', retirado: r.retirado, entregado: r.entregado, diferencia: r.diferencia, comprobante: req.file ? req.file.path : null })
  } catch (error) {
    if (error.message === 'SALDO_INSUFICIENTE') return res.status(400).json({ error: 'El saldo cambió; el cliente ya no tiene ese monto.' })
    console.error('Error pagando retiro:', error)
    res.status(500).json({ error: 'Error al procesar el retiro' })
  }
})

// POST /api/cajero/retiros/:id/rechazar  Body: { motivo? } — el motivo queda en
// el registro (reporte de rechazados) y se le informa al cliente.
router.post('/retiros/:id/rechazar', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const motivo = req.body.motivo ? String(req.body.motivo).slice(0, 255) : null
    const sol = await prisma.solicitud_retiro.findUnique({ where: { id_solicitud: id } })
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (sol.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya fue procesada.' })
    await prisma.solicitud_retiro.update({
      where: { id_solicitud: id },
      data: { estado: 'rechazado', motivo_rechazo: motivo, id_cajero: req.usuario.id, fecha_pago: new Date() },
    })
    await notificar(sol.id_cliente, {
      tipo: 'billetera', titulo: 'Solicitud de retiro rechazada',
      mensaje: motivo ? `Motivo: ${motivo}` : 'El local no pudo procesar tu retiro. Acércate a caja para más detalles.',
      url: '/cliente/billetera',
    })
    if (global.io) global.io.emit('retiro_solicitado', { id_solicitud: id, estado: 'rechazado' })
    res.json({ mensaje: 'Solicitud rechazada' })
  } catch (error) {
    res.status(500).json({ error: 'Error al rechazar la solicitud' })
  }
})

// POST /api/cajero/retiro-directo — retiro sin solicitud previa (cliente presente).
// Body: { id_cliente, monto_retirado, monto_entregado }
router.post('/retiro-directo', async (req, res) => {
  try {
    const id_cliente = Number(req.body.id_cliente)
    if (!id_cliente) return res.status(400).json({ error: 'Falta el cliente.' })
    const cliente = await prisma.usuario.findUnique({ where: { id_usuario: id_cliente } })
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' })

    const metodo = req.body.metodo === 'qr' ? 'qr' : 'persona'
    const r = await procesarRetiro({ id_cliente, monto_retirado: req.body.monto_retirado, metodo, id_cajero: req.usuario.id })
    if (r.error) return res.status(r.status).json({ error: r.error })

    // Deja registro (como solicitud ya pagada) para el historial y el reporte.
    await prisma.solicitud_retiro.create({
      data: { id_cliente, metodo, estado: 'pagado', saldo_al_solicitar: r.retirado, monto_retirado: r.retirado, monto_entregado: r.entregado, diferencia: r.diferencia, id_cajero: req.usuario.id, fecha_pago: r.ahora },
    })
    const msgRetiro = r.esEfectivo
      ? `Se retiraron Bs ${r.retirado} de tu billetera. Recibiste Bs ${r.entregado} en efectivo.`
      : `Se retiraron Bs ${r.retirado} de tu billetera. Se transfirieron Bs ${r.entregado} a tu cuenta/QR.`
    await notificar(id_cliente, { tipo: 'billetera', titulo: 'Retiro procesado', mensaje: msgRetiro, url: '/cliente/billetera' })
    res.json({ mensaje: 'Retiro realizado', retirado: r.retirado, entregado: r.entregado, diferencia: r.diferencia })
  } catch (error) {
    if (error.message === 'SALDO_INSUFICIENTE') return res.status(400).json({ error: 'El saldo cambió.' })
    console.error('Error en retiro directo:', error)
    res.status(500).json({ error: 'Error al procesar el retiro' })
  }
})

// POST /api/cajero/abrir-billetera - Crear billetera para usuario nuevo
router.post('/abrir-billetera', async (req, res) => {
  try {
    const { identificador, monto_inicial } = req.body
    const montoFloat = parseFloat(monto_inicial || 0)

    if (!identificador) {
      return res.status(400).json({ error: 'El identificador (CI o Teléfono) es requerido' })
    }

    const correoTemporal = `${identificador}@euphoria.com`

    // Verificar si ya existe
    let usuario = await prisma.usuario.findUnique({
      where: { correo: correoTemporal }
    })

    if (usuario) {
      return res.status(400).json({ error: 'El usuario ya existe. Ve a la pestaña de recarga manual.' })
    }

    // 1. Crear el usuario temporal
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(identificador, salt)
    
    // Si envían un PIN personalizado lo usamos, si no, por defecto será 1234
    const pinFinal = req.body.pin || '1234'
    const { cifrarPin } = require('../../utilidades/pin-billetera')
    const pinHash = cifrarPin(pinFinal)
    
    // Obtener rol cliente
    const rolCliente = await prisma.rol.findFirst({ where: { nombre_rol: 'Cliente' } })

    usuario = await prisma.usuario.create({
      data: {
        nombres: `Cliente-${identificador}`,
        apellidos: 'Temporal',
        correo: correoTemporal,
        telefono: identificador,
        password_hash: passwordHash,
        id_rol: rolCliente ? rolCliente.id_rol : 1,
        estado_cuenta: 'activo'
      }
    })

    // 2. Crear Billetera
    // Formato amigable de 4 dígitos aleatorios
    const codigo4 = Math.floor(1000 + Math.random() * 9000)
    const qrPublico = `U${usuario.id_usuario}-${codigo4}`
    
    const billetera = await prisma.billetera.create({
      data: {
        id_usuario: usuario.id_usuario,
        saldo_actual: montoFloat,
        qr_publico: qrPublico,
        pin_transaccional: pinHash,
        ultima_actualizacion: new Date()
      }
    })

    // 3. Registrar transacción si hay saldo
    if (montoFloat > 0) {
      await prisma.recarga_billetera.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_billetera: billetera.id_billetera,
          monto_recarga: montoFloat,
          estado: 'completada',
          numero_transaccion: `CAJ-INIT-${Date.now()}`,
          fecha_confirmacion: new Date()
        }
      })

      // Transacción contable
      try {
        await prisma.transaccion.create({
          data: {
            id_billetera: billetera.id_billetera,
            id_responsable: req.usuario?.id || usuario.id_usuario,
            tipo_operacion: `apertura_${(req.body.metodo_pago || 'efectivo').substring(0, 20)}`,
            monto: montoFloat,
            fecha_hora: new Date()
          }
        })
      } catch (errTrx) {
        console.error('Advertencia: no se pudo registrar transaccion inicial:', errTrx.message)
      }
    }

    // 4. Generar el Token JWT para el QR como en Billetera
    const datosQRConPin = {
      tipo: 'pago_con_pin',
      qr_publico: billetera.qr_publico,
      requiere_pin: true,
      usuario: correoTemporal
    }
    const tokenQR = jwt.sign(datosQRConPin, process.env.JWT_SECRETO_QR)

    if (global.io) {
      global.io.emit('recarga_registrada')
    }

    res.json({
      mensaje: 'Billetera creada exitosamente',
      qr_publico: billetera.qr_publico,
      token_qr: tokenQR,
      saldo: parseFloat(billetera.saldo_actual),
      credenciales: {
        correo: correoTemporal,
        password: identificador
      }
    })

  } catch (error) {
    console.error('Error al abrir billetera:', error)
    res.status(500).json({ error: 'Error al abrir la billetera' })
  }
})

module.exports = router
