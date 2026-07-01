const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { generarIDUnico } = require('../servicio-billetera/qr-utilidades')

// Todas las rutas de caja requieren sesion valida Y rol de Cajero o Administrador.
router.use(verificarToken)
router.use(soloRoles('Cajero', 'Administrador'))

// GET /api/cajero/buscar-cliente?q=87 - Autocompletado por teléfono o CI
router.get('/buscar-cliente', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 1) return res.json([])

    const usuarios = await prisma.usuario.findMany({
      where: {
        id_rol: { not: { in: [] } },
        OR: [
          { telefono: { startsWith: q } },
          { ci_carnet: { startsWith: q } },
          { nombres: { contains: q } }
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
          { correo: { equals: `${identificador}@euphoria.com` } }
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
    
    const bcrypt = require('bcryptjs')
    const pinHash = await bcrypt.hash(nuevo_pin, 10)
    
    await prisma.billetera.update({
      where: { id_usuario },
      data: { pin_transaccional: pinHash }
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
      global.io.emit('billetera_actualizada', {
        id_usuario: recarga.id_usuario,
        saldo_nuevo: parseFloat(resultado.billetera.saldo_actual)
      })
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
      global.io.emit('billetera_actualizada', {
        id_usuario: billetera.id_usuario,
        saldo_nuevo: parseFloat(billeteraActualizada.saldo_actual)
      })
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
    const pinHash = await bcrypt.hash(pinFinal, 10)
    
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
