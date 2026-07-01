// ============================================
// EUPHORIA — Servicio de Aforo en Tiempo Real (Fase C)
// El recepcionista escanea el QR de la entrada, valida el ingreso y el sistema
// lleva la cuenta viva de personas por zona, con alertas de saturacion.
// ============================================
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')

router.use(verificarToken)

// Umbrales de saturacion (porcentaje de ocupacion de la zona)
const UMBRAL_ALERTA = 85
const UMBRAL_LLENO = 100

// Estado textual segun el porcentaje de ocupacion
function estadoAforo(porcentaje) {
  if (porcentaje >= UMBRAL_LLENO) return 'lleno'
  if (porcentaje >= UMBRAL_ALERTA) return 'alerta'
  return 'ok'
}

// Aforo actual de una zona = suma de personas de las entradas ya validadas (dentro)
async function aforoActualZona(id_zona, tx = prisma) {
  const r = await tx.entrada.aggregate({
    where: { id_zona, estado_validacion: true },
    _sum: { cantidad_personas: true },
  })
  return r._sum.cantidad_personas || 0
}

// Resuelve la entrada a partir del cuerpo: token QR (firmado) o codigo de ingreso manual.
async function resolverEntrada(body) {
  const { token, codigo } = body

  if (token) {
    let datos
    try {
      datos = jwt.verify(token, process.env.JWT_SECRETO_QR)
    } catch {
      throw { status: 400, error: 'QR invalido o alterado' }
    }
    if (datos.t !== 'entrada' || !datos.ie) throw { status: 400, error: 'Este QR no es una entrada' }
    const entrada = await prisma.entrada.findUnique({
      where: { id_entrada: Number(datos.ie) },
      include: { zona: { include: { evento: true } }, mesa_espacio: true, usuario: true },
    })
    if (!entrada) throw { status: 404, error: 'La entrada no existe' }
    if (entrada.qr_acceso !== datos.qr) throw { status: 400, error: 'QR no coincide con la entrada' }
    return entrada
  }

  if (codigo) {
    const entrada = await prisma.entrada.findFirst({
      where: { codigo_ingreso: String(codigo).trim().toUpperCase() },
      include: { zona: { include: { evento: true } }, mesa_espacio: true, usuario: true },
    })
    if (!entrada) throw { status: 404, error: 'No se encontro una entrada con ese codigo' }
    return entrada
  }

  throw { status: 400, error: 'Escanea un QR o ingresa un codigo' }
}

// Arma la respuesta de aforo para una zona
function resumenZona(zona, aforo) {
  const capacidad = zona.capacidad_maxima || 0
  const porcentaje = capacidad > 0 ? Math.round((aforo / capacidad) * 100) : 0
  return {
    id_zona: zona.id_zona,
    id_evento: zona.id_evento,
    nombre_zona: zona.nombre_zona,
    aforo_actual: aforo,
    capacidad,
    porcentaje,
    estado: estadoAforo(porcentaje),
    disponibles: Math.max(0, capacidad - aforo),
  }
}

// ---------- VALIDAR INGRESO ----------

// POST /api/aforo/validar — el recepcionista escanea el QR y registra el ingreso
// Body: { token } (QR firmado) o { codigo } (codigo de ingreso manual)
router.post('/validar', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const entrada = await resolverEntrada(req.body)

    if (entrada.estado_validacion) {
      return res.status(409).json({
        error: 'Esta entrada ya fue validada (la persona ya ingreso).',
        ya_ingreso: true,
        cliente: `${entrada.usuario.nombres} ${entrada.usuario.apellidos}`,
      })
    }

    const capacidad = entrada.zona.capacidad_maxima || 0
    const aforoPrevio = await aforoActualZona(entrada.id_zona)

    // Si la zona ya esta llena, no se deja pasar (proteccion de aforo)
    if (capacidad > 0 && aforoPrevio + entrada.cantidad_personas > capacidad) {
      return res.status(409).json({
        error: `Aforo lleno en ${entrada.zona.nombre_zona}. No se puede validar el ingreso.`,
        aforo_lleno: true,
        aforo_actual: aforoPrevio,
        capacidad,
      })
    }

    // Validacion atomica: marcar ingreso SOLO si sigue sin validar (evita doble escaneo)
    await prisma.$transaction(async (tx) => {
      const marca = await tx.entrada.updateMany({
        where: { id_entrada: entrada.id_entrada, estado_validacion: false },
        data: { estado_validacion: true },
      })
      if (marca.count === 0) throw { status: 409, error: 'La entrada ya fue validada en otro punto.' }

      await tx.registro_aforo.create({
        data: {
          id_zona: entrada.id_zona,
          id_entrada: entrada.id_entrada,
          id_recepcionista: req.usuario.id,
          tipo_movimiento: 'ingreso',
          fecha_hora: new Date(),
        },
      })
    })

    const aforoNuevo = aforoPrevio + entrada.cantidad_personas
    const resumen = resumenZona(entrada.zona, aforoNuevo)

    // Tiempo real: avisar a los paneles de aforo (admin/recepcion)
    if (global.io) global.io.emit('aforo_actualizado', resumen)

    res.json({
      mensaje: 'Ingreso validado',
      cliente: `${entrada.usuario.nombres} ${entrada.usuario.apellidos}`,
      personas: entrada.cantidad_personas,
      mesa: entrada.mesa_espacio ? entrada.mesa_espacio.numero_nombre : null,
      evento: entrada.zona.evento ? entrada.zona.evento.nombre_evento : null,
      aforo: resumen,
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.error })
    console.error('Error validando ingreso:', e)
    res.status(500).json({ error: 'Error al validar el ingreso' })
  }
})

// ---------- REGISTRAR SALIDA ----------

// POST /api/aforo/salida — registra que una persona/grupo salio (libera aforo)
// Body: { token } o { codigo } o { id_entrada }
router.post('/salida', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    let entrada
    if (req.body.id_entrada) {
      entrada = await prisma.entrada.findUnique({
        where: { id_entrada: Number(req.body.id_entrada) },
        include: { zona: { include: { evento: true } }, usuario: true },
      })
      if (!entrada) return res.status(404).json({ error: 'La entrada no existe' })
    } else {
      entrada = await resolverEntrada(req.body)
    }

    if (!entrada.estado_validacion) {
      return res.status(409).json({ error: 'Esta entrada no esta marcada como dentro.' })
    }

    await prisma.$transaction(async (tx) => {
      const marca = await tx.entrada.updateMany({
        where: { id_entrada: entrada.id_entrada, estado_validacion: true },
        data: { estado_validacion: false },
      })
      if (marca.count === 0) throw { status: 409, error: 'La salida ya fue registrada.' }

      await tx.registro_aforo.create({
        data: {
          id_zona: entrada.id_zona,
          id_entrada: entrada.id_entrada,
          id_recepcionista: req.usuario.id,
          tipo_movimiento: 'salida',
          fecha_hora: new Date(),
        },
      })
    })

    const aforoNuevo = await aforoActualZona(entrada.id_zona)
    const resumen = resumenZona(entrada.zona, aforoNuevo)
    if (global.io) global.io.emit('aforo_actualizado', resumen)

    res.json({
      mensaje: 'Salida registrada',
      cliente: `${entrada.usuario.nombres} ${entrada.usuario.apellidos}`,
      aforo: resumen,
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.error })
    console.error('Error registrando salida:', e)
    res.status(500).json({ error: 'Error al registrar la salida' })
  }
})

// ---------- PANEL DE AFORO ----------

// GET /api/aforo/evento/:idEvento — aforo en vivo de todas las zonas del evento
router.get('/evento/:idEvento', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const zonas = await prisma.zona.findMany({
      where: { id_evento },
      orderBy: { id_zona: 'asc' },
    })

    const detalle = await Promise.all(zonas.map(async (z) => {
      const aforo = await aforoActualZona(z.id_zona)
      return resumenZona(z, aforo)
    }))

    const aforo_total = detalle.reduce((s, z) => s + z.aforo_actual, 0)
    const capacidad_total = detalle.reduce((s, z) => s + z.capacidad, 0)
    const porcentaje_total = capacidad_total > 0 ? Math.round((aforo_total / capacidad_total) * 100) : 0

    res.json({
      id_evento,
      aforo_total,
      capacidad_total,
      porcentaje_total,
      estado_total: estadoAforo(porcentaje_total),
      zonas: detalle,
    })
  } catch (error) {
    console.error('Error obteniendo aforo del evento:', error)
    res.status(500).json({ error: 'Error al obtener el aforo' })
  }
})

// GET /api/aforo/eventos — eventos que tienen zonas (para elegir cual monitorear)
router.get('/eventos', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: { zona: { some: {} } },
      orderBy: { fecha_hora_inicio: 'desc' },
      select: { id_evento: true, nombre_evento: true, fecha_hora_inicio: true, estado: true },
    })
    res.json(eventos)
  } catch (error) {
    console.error('Error listando eventos con aforo:', error)
    res.status(500).json({ error: 'Error al obtener los eventos' })
  }
})

module.exports = router
