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

// Aforo actual de una zona = suma de personas realmente ingresadas (por tandas).
// Con el QR multi-uso, una entrada puede tener 3 de 8 dentro; contamos ingresados.
async function aforoActualZona(id_zona, tx = prisma) {
  const r = await tx.entrada.aggregate({
    where: { id_zona },
    _sum: { cantidad_ingresada: true },
  })
  return r._sum.cantidad_ingresada || 0
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

// POST /api/aforo/validar — el recepcionista escanea el QR y registra el ingreso.
// QR MULTI-USO POR TANDAS: una entrada vale para N personas (ej. mesa de 8) y se
// puede usar varias veces hasta completar N (ej. entran 3 ahora y 5 despues).
// Body: { token } | { codigo }  y opcional { cantidad } = personas que entran ahora.
router.post('/validar', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const entrada = await resolverEntrada(req.body)

    const total = entrada.cantidad_personas
    const yaAdentro = entrada.cantidad_ingresada || 0
    const restantes = total - yaAdentro

    // Modo CONSULTA: solo devuelve el estado de la entrada, sin admitir a nadie.
    // Permite al recepcionista ver cuántos cupos quedan y elegir cuántos entran.
    if (req.body.consultar) {
      return res.json({
        consulta: true,
        cliente: `${entrada.usuario.nombres} ${entrada.usuario.apellidos}`,
        cantidad_personas: total,
        cantidad_ingresada: yaAdentro,
        restantes,
        completo: restantes <= 0,
        mesa: entrada.mesa_espacio ? entrada.mesa_espacio.numero_nombre : null,
        zona: entrada.zona.nombre_zona,
        id_zona: entrada.id_zona,
        evento: entrada.zona.evento ? entrada.zona.evento.nombre_evento : null,
      })
    }

    // Si ya ingresaron todos los cupos de esta entrada
    if (restantes <= 0) {
      return res.status(409).json({
        error: `Esta entrada ya ingresó completa (${yaAdentro}/${total}).`,
        ya_ingreso: true,
        cliente: `${entrada.usuario.nombres} ${entrada.usuario.apellidos}`,
        cantidad_personas: total,
        cantidad_ingresada: yaAdentro,
      })
    }

    // Cuántas personas entran en esta tanda (por defecto, todas las restantes)
    let cantidad = req.body.cantidad != null ? parseInt(req.body.cantidad) : restantes
    if (!Number.isFinite(cantidad) || cantidad < 1) cantidad = 1
    if (cantidad > restantes) {
      return res.status(400).json({
        error: `Solo quedan ${restantes} cupo(s) en esta entrada.`,
        cantidad_personas: total,
        cantidad_ingresada: yaAdentro,
        restantes,
      })
    }

    const capacidad = entrada.zona.capacidad_maxima || 0
    const aforoPrevio = await aforoActualZona(entrada.id_zona)
    if (capacidad > 0 && aforoPrevio + cantidad > capacidad) {
      return res.status(409).json({
        error: `Aforo lleno en ${entrada.zona.nombre_zona}. No se puede validar el ingreso.`,
        aforo_lleno: true,
        aforo_actual: aforoPrevio,
        capacidad,
      })
    }

    // Incremento ATÓMICO: solo suma si aún caben (evita doble escaneo simultáneo).
    await prisma.$transaction(async (tx) => {
      const inc = await tx.$executeRaw`
        UPDATE entrada SET cantidad_ingresada = cantidad_ingresada + ${cantidad}
        WHERE id_entrada = ${entrada.id_entrada}
          AND cantidad_ingresada + ${cantidad} <= cantidad_personas`
      if (inc === 0) throw { status: 409, error: 'Otro punto registró ingresos; vuelve a escanear.' }

      // estado_validacion = true cuando ya ingresaron todos los cupos
      await tx.$executeRaw`
        UPDATE entrada SET estado_validacion = (cantidad_ingresada >= cantidad_personas)
        WHERE id_entrada = ${entrada.id_entrada}`

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

    const nuevoIngresado = yaAdentro + cantidad
    const aforoNuevo = aforoPrevio + cantidad
    const resumen = resumenZona(entrada.zona, aforoNuevo)
    if (global.io) global.io.emit('aforo_actualizado', resumen)

    res.json({
      mensaje: nuevoIngresado >= total ? 'Ingreso completo' : 'Ingreso parcial registrado',
      cliente: `${entrada.usuario.nombres} ${entrada.usuario.apellidos}`,
      personas: cantidad,                 // entraron en esta tanda
      cantidad_personas: total,           // capacidad total del QR
      cantidad_ingresada: nuevoIngresado, // total acumulado dentro
      restantes: total - nuevoIngresado,  // cupos que aún quedan en el QR
      completo: nuevoIngresado >= total,
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

    if ((entrada.cantidad_ingresada || 0) <= 0) {
      return res.status(409).json({ error: 'Esta entrada no tiene personas marcadas como dentro.' })
    }

    await prisma.$transaction(async (tx) => {
      // Registra la salida del grupo: libera todos los cupos ingresados de esta entrada.
      const marca = await tx.entrada.updateMany({
        where: { id_entrada: entrada.id_entrada, cantidad_ingresada: { gt: 0 } },
        data: { cantidad_ingresada: 0, estado_validacion: false },
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
