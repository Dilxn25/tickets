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

// ============ GET /api/billetera/saldo ============
// Obtener saldo actual del cliente
router.get('/saldo', verificarToken, async (req, res) => {
  try {
    const billetera = await prisma.billetera.findUnique({
      where: { id_usuario: req.usuario.id }
    })

    if (!billetera) {
      return res.status(404).json({ error: 'El usuario no tiene billetera' })
    }

    res.json({
      id_billetera: billetera.id_billetera,
      saldo_actual: parseFloat(billetera.saldo_actual),
      qr_publico: billetera.qr_publico
    })
  } catch (error) {
    console.error('Error obteniendo saldo:', error)
    res.status(500).json({ error: 'Error al obtener saldo' })
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
      global.io.emit('billetera_actualizada', {
        id_usuario: id_usuario,
        saldo_nuevo: parseFloat(billeteraActualizada.saldo_actual)
      })
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

    // Asegurar los datos del QR usando JWT para que no puedan ser modificados por un malware
    const firmaSecreta = process.env.JWT_SECRETO_QR
    const tokenSinPin = jwt.sign(datosQRSinPin, firmaSecreta)
    const tokenConPin = jwt.sign(datosQRConPin, firmaSecreta)

    const imagenQRSinPin = await QRCode.toDataURL(tokenSinPin, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300
    })

    const imagenQRConPin = await QRCode.toDataURL(tokenConPin, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300
    })

    res.json({
      qr_sin_pin: {
        imagen: imagenQRSinPin,
        identificador: billetera.qr_publico
      },
      qr_con_pin: {
        imagen: imagenQRConPin,
        identificador: billetera.qr_publico
      }
    })
  } catch (error) {
    console.error('Error generando QRs de pago:', error)
    res.status(500).json({ error: 'Error al generar QRs de pago' })
  }
})

// ============ POST /api/billetera/pin ============
// Actualizar el PIN transaccional del usuario
router.post('/pin', verificarToken, async (req, res) => {
  try {
    const { nuevo_pin } = req.body

    if (!nuevo_pin || nuevo_pin.length !== 4) {
      return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos' })
    }

    // Hashear el PIN por seguridad
    const salt = await bcrypt.genSalt(10)
    const pinHasheado = await bcrypt.hash(nuevo_pin, salt)

    await prisma.billetera.update({
      where: { id_usuario: req.usuario.id },
      data: { pin_transaccional: pinHasheado }
    })

    res.json({ mensaje: 'PIN actualizado exitosamente' })
  } catch (error) {
    console.error('Error actualizando PIN:', error)
    res.status(500).json({ error: 'Error al actualizar el PIN' })
  }
})

// ============ GET /api/billetera/admin/reporte-completo ============
// Reporte completo de billetera para el Admin
router.get('/admin/reporte-completo', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    // ---- Filtro opcional por rango de fechas (aplica a los FLUJOS: recargas y ventas) ----
    // Sin parámetros = histórico completo (compatibilidad hacia atrás).
    const { desde, hasta } = req.query
    let rangoFecha = null
    if (desde || hasta) {
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

module.exports = router
