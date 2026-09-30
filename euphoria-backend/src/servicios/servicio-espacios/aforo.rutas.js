// ============================================
// EUPHORIA — Servicio de Aforo en Tiempo Real (Fase C)
// El recepcionista escanea el QR de la entrada, valida el ingreso y el sistema
// lleva la cuenta viva de personas por zona, con alertas de saturacion.
// ============================================
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { emitirRecurso } = require('../../utilidades/config-runtime')
const { hoyBolivia } = require('../../utilidades/tiempo')
const { notificar } = require('../../utilidades/notificaciones')

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

// Ventana en la que una entrada es válida: SOLO el día del evento (con un
// margen antes para la llegada temprana / apertura de puertas). Evita que
// alguien use su entrada en otra fecha u otro evento.
// Hora y fecha del evento para los mensajes al recepcionista. Las fechas del evento
// se guardan tal como las escribe el admin (hora de Bolivia sin zona), así que se
// muestran en UTC: convertirlas a La Paz las corría 4 horas (20:00 salía 16:00).
const horaBolivia = (d) => new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
const fechaCortaBolivia = (d) => new Date(d).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const HORAS_ANTES = 4   // margen de apertura antes del inicio
const HORAS_DESPUES = 12 // duración por defecto si el evento no tiene fin
function ventanaEvento(evento, ahora = hoyBolivia()) {
  if (!evento || !evento.fecha_hora_inicio) {
    return { estado: 'vigente', inicio: null, fin: null } // sin fecha: no bloquear
  }
  const inicio = new Date(evento.fecha_hora_inicio)
  const fin = evento.fecha_hora_fin
    ? new Date(evento.fecha_hora_fin)
    : new Date(inicio.getTime() + HORAS_DESPUES * 3600 * 1000)
  const ventanaInicio = new Date(inicio.getTime() - HORAS_ANTES * 3600 * 1000)
  let estado = 'vigente'
  if (ahora < ventanaInicio) estado = 'proxima'
  else if (ahora > fin) estado = 'finalizada'
  return { estado, inicio, fin, ventanaInicio }
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

    // La entrada SOLO vale el día de su evento (con margen de apertura). Impide
    // usarla en otra fecha u otro evento.
    const ventana = ventanaEvento(entrada.zona.evento)

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
        fecha_evento: entrada.zona.evento ? entrada.zona.evento.fecha_hora_inicio : null,
        estado_fecha: ventana.estado, // proxima | vigente | finalizada
      })
    }

    // Rechazar admisión fuera del día del evento
    if (ventana.estado === 'proxima') {
      return res.status(409).json({
        // Mensaje accionable: dice a qué HORA abre la puerta, no solo el día (a las
        // 8 am del mismo día el recepcionista no entendía por qué no pasaba nada).
        error: `Todavía no es hora de ingreso. La puerta abre a las ${horaBolivia(ventana.ventanaInicio)} (el evento empieza a las ${horaBolivia(ventana.inicio)} del ${fechaCortaBolivia(ventana.inicio)}).`,
        fuera_de_fecha: true,
        estado_fecha: 'proxima',
      })
    }
    if (ventana.estado === 'finalizada') {
      return res.status(409).json({
        error: 'Esta entrada corresponde a un evento que ya terminó.',
        fuera_de_fecha: true,
        estado_fecha: 'finalizada',
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
          cantidad,
          fecha_hora: new Date(),
        },
      })
    })

    const nuevoIngresado = yaAdentro + cantidad
    const aforoNuevo = aforoPrevio + cantidad
    const resumen = resumenZona(entrada.zona, aforoNuevo)
    if (global.io) global.io.emit('aforo_actualizado', resumen)
    // El cliente ve su ticket actualizarse en vivo ("2 de 4 ya ingresaron")
    emitirRecurso('reservas', { id_cliente: entrada.id_usuario })

    // R5.3: al ingresar, sus pedidos PROGRAMADOS de esta entrada despiertan. Los que
    // ya dicen cómo recibirlos (la cortesía se elige con "a la mesa" o "en barra")
    // pasan a la barra. Los pagados sin esa elección esperan: el cliente la hace en
    // "Mis pedidos" o el mesero se acerca, le pregunta y la confirma por él.
    try {
      const activados = await prisma.comanda.updateMany({
        where: { id_entrada: entrada.id_entrada, estado_despacho: 'Programado', modo_entrega: { not: null } },
        data: { estado_despacho: 'Pendiente' },
      })
      if (activados.count > 0 && global.io) global.io.emit('nueva_comanda', { id_cliente: entrada.id_usuario })
      const porConfirmar = await prisma.comanda.count({
        where: { id_entrada: entrada.id_entrada, estado_despacho: 'Programado', modo_entrega: null },
      })
      if (porConfirmar > 0) {
        await notificar(entrada.id_usuario, {
          tipo: 'pedido',
          titulo: 'Tus pedidos te esperan',
          mensaje: `Ya estás adentro. Tienes ${porConfirmar} ${porConfirmar === 1 ? 'pedido pagado' : 'pedidos pagados'}: dinos si te los llevamos o pasas por la barra.`,
          url: '/cliente/pedidos',
        })
      }
    } catch (e) { console.warn('No se pudieron activar pedidos programados:', e.message) }
    // El mesero de la mesa se entera de que su cliente llegó (con lo que tenga pendiente)
    if (global.io && entrada.id_mesa) global.io.emit('cliente_ingreso', { id_mesa: entrada.id_mesa, id_cliente: entrada.id_usuario })

    // Combo de cortesía sin elegir: ahora que ya está adentro, se le recuerda.
    try {
      const cort = await prisma.entrada.findUnique({
        where: { id_entrada: entrada.id_entrada },
        select: { cortesia_estado: true },
      })
      if (cort?.cortesia_estado === 'pendiente') {
        await notificar(entrada.id_usuario, {
          tipo: 'cortesia',
          titulo: 'Tu combo de cortesía te espera',
          mensaje: 'Ya estás adentro: elige tu combo de regalo y te lo llevamos a la mesa.',
          url: '/cliente/mis-reservas',
        })
      }
    } catch (e) { console.warn('No se pudo recordar la cortesía:', e.message) }

    // Asignación de mesero: si la reserva tiene mesa, o ya está asignada (se informa
    // quién) o se sugiere el mesero con menos carga para que recepción confirme.
    let mesero_sugerido = null
    let mesa_ya_asignada = null
    if (entrada.id_mesa) {
      const existente = await prisma.asignacion_mesa.findFirst({
        where: { id_mesa: entrada.id_mesa, estado: { in: ['asignada', 'atendiendo'] } },
        include: { usuario: { select: { nombres: true, apellidos: true } } },
      })
      if (existente) {
        mesa_ya_asignada = { id_mesero: existente.id_mesero, nombre: `${existente.usuario.nombres} ${existente.usuario.apellidos || ''}`.trim() }
      } else {
        const sug = await meseroConMenosCarga(entrada.zona?.id_evento || await eventoDeMesa(entrada.id_mesa))
        if (sug) mesero_sugerido = { id_usuario: sug.id_usuario, nombre: `${sug.nombres} ${sug.apellidos || ''}`.trim(), carga: sug.carga }
      }
    }

    res.json({
      mensaje: nuevoIngresado >= total ? 'Ingreso completo' : 'Ingreso parcial registrado',
      cliente: `${entrada.usuario.nombres} ${entrada.usuario.apellidos}`,
      personas: cantidad,                 // entraron en esta tanda
      cantidad_personas: total,           // capacidad total del QR
      cantidad_ingresada: nuevoIngresado, // total acumulado dentro
      restantes: total - nuevoIngresado,  // cupos que aún quedan en el QR
      completo: nuevoIngresado >= total,
      mesa: entrada.mesa_espacio ? entrada.mesa_espacio.numero_nombre : null,
      id_mesa: entrada.id_mesa,
      id_entrada: entrada.id_entrada,
      mesero_sugerido,
      mesa_ya_asignada,
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

    const salieron = entrada.cantidad_ingresada || 0
    if (salieron <= 0) {
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
          cantidad: salieron,
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

// GET /api/aforo/flujo/:idEvento — a qué hora entró y salió la gente.
// Devuelve una fila por hora con ingresos, salidas y cuánta gente quedó dentro
// (acumulado). Es la base del gráfico del panel: de un vistazo se ve la hora
// pico y a qué hora se empieza a vaciar el local.
router.get('/flujo/:idEvento', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const movimientos = await prisma.registro_aforo.findMany({
      where: { zona: { id_evento } },
      select: { tipo_movimiento: true, cantidad: true, fecha_hora: true },
      orderBy: { fecha_hora: 'asc' },
    })
    if (!movimientos.length) return res.json({ horas: [], pico: null, total_ingresos: 0, total_salidas: 0 })

    // Agrupar por hora local de Bolivia (el servidor corre en UTC).
    const claveHora = (f) => new Date(f).toLocaleString('es-BO', { hour: '2-digit', hour12: false, timeZone: 'America/La_Paz' }).padStart(2, '0')
    const porHora = new Map()
    let totalIn = 0, totalOut = 0
    for (const m of movimientos) {
      const h = claveHora(m.fecha_hora)
      // los movimientos llegan en orden: la primera vez que aparece una hora fija su lugar
      if (!porHora.has(h)) porHora.set(h, { hora: h, ingresos: 0, salidas: 0, _orden: porHora.size })
      const fila = porHora.get(h)
      const n = Number(m.cantidad || 1)
      if (m.tipo_movimiento === 'salida') { fila.salidas += n; totalOut += n }
      else { fila.ingresos += n; totalIn += n }
    }

    // Orden cronológico REAL (por la hora del primer movimiento): sirve igual para una
    // noche (22, 23, 00, 01…) que para un evento de día. Suponer "noche" ponía las 12
    // antes que las 11 y el pico salía en 0.
    const horas = [...porHora.values()].sort((a, b) => a._orden - b._orden)
    let dentro = 0
    for (const f of horas) { dentro += f.ingresos - f.salidas; f.dentro = Math.max(0, dentro); delete f._orden }
    const pico = horas.reduce((a, b) => (b.dentro > (a?.dentro ?? -1) ? b : a), null)

    res.json({ horas, pico, total_ingresos: totalIn, total_salidas: totalOut })
  } catch (error) {
    console.error('Error en flujo horario de aforo:', error)
    res.status(500).json({ error: 'No se pudo calcular el flujo por hora' })
  }
})

// GET /api/aforo/estadias/:idEvento — cuánto se quedó cada grupo: a qué hora llegó
// (su primer ingreso en recepción), a qué hora se fue (cuando el mesero o recepción
// marcó que se retiraron), qué mesero lo atendió y cuánto consumió. Es el dato que
// le dice al local cuánto dura una mesa y cuándo rota.
router.get('/estadias/:idEvento', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const entradas = await prisma.entrada.findMany({
      where: { zona: { id_evento }, registro_aforo: { some: {} } },
      select: {
        id_entrada: true, id_usuario: true, id_mesa: true, cantidad_personas: true,
        usuario: { select: { nombres: true, apellidos: true } },
        mesa_espacio: { select: { numero_nombre: true } },
        zona: { select: { nombre_zona: true } },
        registro_aforo: { select: { tipo_movimiento: true, fecha_hora: true }, orderBy: { fecha_hora: 'asc' } },
        asignacion_mesa: { select: { usuario: { select: { nombres: true, apellidos: true } } }, orderBy: { fecha_asignacion: 'desc' }, take: 1 },
      },
    })
    const filas = []
    for (const e of entradas) {
      const ingresos = e.registro_aforo.filter(r => r.tipo_movimiento !== 'salida')
      const salidas = e.registro_aforo.filter(r => r.tipo_movimiento === 'salida')
      const llegada = ingresos[0]?.fecha_hora || null
      const salida = salidas.length ? salidas[salidas.length - 1].fecha_hora : null
      const consumo = await prisma.detalle_comanda.aggregate({
        _sum: { subtotal: true },
        where: {
          comanda: {
            id_cliente: e.id_usuario,
            estado_despacho: { notIn: ['Cancelada', 'Reembolsada'] },
            OR: [{ id_entrada: e.id_entrada }, ...(e.id_mesa ? [{ id_mesa: e.id_mesa }] : [])],
            ...(llegada ? { fecha_registro: { gte: new Date(new Date(llegada).getTime() - 12 * 3600 * 1000) } } : {}),
          },
        },
      })
      const mesero = e.asignacion_mesa[0]?.usuario
      filas.push({
        id_entrada: e.id_entrada,
        cliente: `${e.usuario.nombres} ${e.usuario.apellidos || ''}`.trim(),
        mesa: e.mesa_espacio?.numero_nombre || null,
        zona: e.zona?.nombre_zona || null,
        personas: e.cantidad_personas,
        llegada,
        salida,
        minutos: llegada && salida ? Math.max(0, Math.round((new Date(salida) - new Date(llegada)) / 60000)) : null,
        mesero: mesero ? `${mesero.nombres} ${mesero.apellidos || ''}`.trim() : null,
        consumo: Number(consumo._sum.subtotal || 0),
      })
    }
    filas.sort((a, b) => new Date(a.llegada || 0) - new Date(b.llegada || 0))
    const cerradas = filas.filter(f => f.minutos != null)
    res.json({
      estadias: filas,
      promedio_minutos: cerradas.length ? Math.round(cerradas.reduce((a, f) => a + f.minutos, 0) / cerradas.length) : null,
      adentro: filas.filter(f => !f.salida).length,
      se_fueron: cerradas.length,
    })
  } catch (error) {
    console.error('Error en estadías:', error)
    res.status(500).json({ error: 'No se pudo calcular las estadías' })
  }
})

// GET /api/aforo/evento/:idEvento — aforo en vivo de todas las zonas del evento
router.get('/evento/:idEvento', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const zonas = await prisma.zona.findMany({
      where: { id_evento },
      orderBy: { id_zona: 'asc' },
      include: { mesa_espacio: true },
    })

    const detalle = await Promise.all(zonas.map(async (z) => {
      const ocupado = await aforoActualZona(z.id_zona) // personas realmente dentro (ingresadas)
      const resAgg = await prisma.entrada.aggregate({ where: { id_zona: z.id_zona }, _sum: { cantidad_personas: true } })
      const reservado = resAgg._sum.cantidad_personas || 0 // cupos vendidos (con o sin ingresar)
      const capacidad = z.capacidad_maxima || 0
      const porcentaje = capacidad > 0 ? Math.round((ocupado / capacidad) * 100) : 0
      return {
        id_zona: z.id_zona,
        id_evento: z.id_evento,
        nombre_zona: z.nombre_zona,
        es_general: z.es_general,
        aforo_actual: ocupado,       // compat con el socket y el resumen actual
        ocupado,
        reservado,
        capacidad,
        porcentaje,
        reservado_pct: capacidad > 0 ? Math.round((reservado / capacidad) * 100) : 0,
        estado: estadoAforo(porcentaje),
        disponibles: Math.max(0, capacidad - reservado),
        proporcion: z.proporcion || 1.6,
        // Layout para el preview del mapa en vivo (mesas coloreadas por estado).
        mesas: (z.mesa_espacio || []).map(m => ({
          id_mesa: m.id_mesa,
          tipo_elemento: m.tipo_elemento,
          numero_nombre: m.numero_nombre,
          posicion_x: m.posicion_x, posicion_y: m.posicion_y,
          ancho: m.ancho, alto: m.alto, rotacion: m.rotacion, forma: m.forma,
          capacidad_sillas: m.capacidad_sillas,
          estado_ocupacion: m.estado_ocupacion,
          es_seleccionable: m.es_seleccionable,
        })),
      }
    }))

    const aforo_total = detalle.reduce((s, z) => s + z.ocupado, 0)
    const reservado_total = detalle.reduce((s, z) => s + z.reservado, 0)
    const capacidad_total = detalle.reduce((s, z) => s + z.capacidad, 0)
    const porcentaje_total = capacidad_total > 0 ? Math.round((aforo_total / capacidad_total) * 100) : 0

    res.json({
      id_evento,
      aforo_total,
      reservado_total,
      capacidad_total,
      disponibles_total: Math.max(0, capacidad_total - reservado_total),
      porcentaje_total,
      estado_total: estadoAforo(porcentaje_total),
      zonas: detalle,
    })
  } catch (error) {
    console.error('Error obteniendo aforo del evento:', error)
    res.status(500).json({ error: 'Error al obtener el aforo' })
  }
})

// GET /api/aforo/eventos — eventos que tienen zonas (para elegir cual monitorear
// o para que el bartender abra el mapa del evento en curso)
router.get('/eventos', soloRoles('Recepcionista', 'Administrador', 'Bartender', 'Mesero', 'Cajero'), async (req, res) => {
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

// ============================================
// Asignación de meseros a mesas (Fase B)
// ============================================
// SOLO los usuarios con rol Mesero atienden mesas. (Antes incluía 'Bartender'
// y recepción terminaba asignándole mesas al bartender — eso estaba mal:
// el bartender prepara en barra, no atiende mesas.)
const ROLES_MESERO = ['Mesero']

// Carga de un mesero = mesas que atiende en ESTE evento. Sin el filtro contaban
// asignaciones abiertas de noches pasadas y la sugerencia caía siempre en el mismo.
function filtroCarga(idMesero, idEvento) {
  return {
    id_mesero: idMesero,
    estado: { in: ['asignada', 'atendiendo'] },
    ...(idEvento ? { mesa_espacio: { zona: { id_evento: idEvento } } } : {}),
  }
}

// Evento al que pertenece una mesa (mesa -> zona -> evento)
async function eventoDeMesa(idMesa) {
  if (!idMesa) return null
  const m = await prisma.mesa_espacio.findUnique({ where: { id_mesa: Number(idMesa) }, select: { zona: { select: { id_evento: true } } } })
  return m?.zona?.id_evento || null
}

// Mesero activo con menos mesas asignadas en el evento (para sugerir al hacer check-in)
async function meseroConMenosCarga(idEvento = null) {
  const meseros = await prisma.usuario.findMany({
    where: { estado_cuenta: 'activo', rol: { nombre_rol: { in: ROLES_MESERO } } },
    select: { id_usuario: true, nombres: true, apellidos: true },
  })
  if (!meseros.length) return null
  const cargas = await Promise.all(meseros.map(async (m) => ({
    ...m,
    carga: await prisma.asignacion_mesa.count({ where: filtroCarga(m.id_usuario, idEvento) }),
  })))
  cargas.sort((a, b) => a.carga - b.carga)
  return cargas[0]
}

// GET /api/aforo/meseros — meseros activos con su carga (para elegir/cambiar).
// El bartender también puede consultar: él asigna mesero cuando recibe gente
// directo en barra. Orden: los MÁS LIBRES arriba (menos mesas primero).
router.get('/meseros', soloRoles('Recepcionista', 'Administrador', 'Bartender'), async (req, res) => {
  try {
    // ?evento=id o ?mesa=id: la carga se cuenta solo en ese evento
    const idEvento = Number(req.query.evento) || await eventoDeMesa(Number(req.query.mesa) || null)
    const meseros = await prisma.usuario.findMany({
      where: { estado_cuenta: 'activo', rol: { nombre_rol: { in: ROLES_MESERO } } },
      select: { id_usuario: true, nombres: true, apellidos: true },
      orderBy: { nombres: 'asc' },
    })
    const conCarga = await Promise.all(meseros.map(async (m) => ({
      id_usuario: m.id_usuario,
      nombre: `${m.nombres} ${m.apellidos || ''}`.trim(),
      carga: await prisma.asignacion_mesa.count({ where: filtroCarga(m.id_usuario, idEvento) }),
    })))
    // Los más libres arriba; a igual carga, alfabético
    conCarga.sort((a, b) => a.carga - b.carga || a.nombre.localeCompare(b.nombre))
    res.json(conCarga)
  } catch (e) {
    console.error('Error listando meseros:', e)
    res.status(500).json({ error: 'Error al listar meseros' })
  }
})

// POST /api/aforo/asignar-mesero — recepción (o el bartender, cuando recibe
// gente en barra) asigna o cambia el mesero de una mesa.
// Body: { id_mesa, id_entrada?, id_mesero }
router.post('/asignar-mesero', soloRoles('Recepcionista', 'Administrador', 'Bartender'), async (req, res) => {
  try {
    const { id_mesa, id_entrada, id_mesero } = req.body
    if (!id_mesa || !id_mesero) return res.status(400).json({ error: 'Faltan datos (mesa y mesero)' })
    // Validación dura: el asignado debe ser un MESERO real y activo. (Evita que
    // por error se asigne al bartender, a un cajero o a una cuenta desactivada.)
    const mesero = await prisma.usuario.findFirst({
      where: { id_usuario: Number(id_mesero), estado_cuenta: 'activo', rol: { nombre_rol: { in: ROLES_MESERO } } },
      select: { id_usuario: true },
    })
    if (!mesero) return res.status(400).json({ error: 'Ese usuario no es un mesero activo. Solo se puede asignar a meseros.' })
    // Cerrar la asignación activa previa de esa mesa (si la había), con rastro
    // de cuándo y quién la cerró (fue un cambio de mesero, no una salida).
    await prisma.asignacion_mesa.updateMany({
      where: { id_mesa: Number(id_mesa), estado: { in: ['asignada', 'atendiendo'] } },
      data: { estado: 'cerrada', fecha_cierre: new Date(), cerrada_por: req.usuario.id },
    })
    // Sin id_entrada, la asignación se liga a la reserva de esa mesa: así el mesero
    // ve el nombre del cliente en "Tus mesas" (antes le llegaba la mesa sin nombre).
    let idEntrada = id_entrada ? Number(id_entrada) : null
    if (!idEntrada) {
      const reserva = await prisma.entrada.findFirst({
        where: { id_mesa: Number(id_mesa) },
        orderBy: [{ estado_validacion: 'desc' }, { fecha_reserva: 'desc' }],
        select: { id_entrada: true },
      })
      idEntrada = reserva?.id_entrada || null
    }
    const asignacion = await prisma.asignacion_mesa.create({
      data: {
        id_mesa: Number(id_mesa),
        id_entrada: idEntrada,
        id_mesero: Number(id_mesero),
        estado: 'asignada',
        fecha_asignacion: new Date(),
      },
    })
    // Avisar al mesero en tiempo real
    if (global.io) global.io.emit('mesa_asignada', { id_mesero: Number(id_mesero), id_mesa: Number(id_mesa) })
    res.status(201).json({ ok: true, id_asignacion: asignacion.id_asignacion })
  } catch (e) {
    console.error('Error asignando mesero:', e)
    res.status(500).json({ error: 'Error al asignar el mesero' })
  }
})

// GET /api/aforo/buscar-codigo?q=6ADB — búsqueda INCREMENTAL del código de
// ingreso: mientras el recepcionista escribe, aparecen las coincidencias
// (código + cliente + cupos) de eventos no terminados. Elegir una = validarla.
router.get('/buscar-codigo', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toUpperCase()
    if (q.length < 2) return res.json([])
    const entradas = await prisma.entrada.findMany({
      where: {
        codigo_ingreso: { contains: q },
        zona: { evento: { estado: { not: 'terminado' } } },
      },
      take: 6,
      orderBy: { fecha_reserva: 'desc' },
      include: {
        usuario: { select: { nombres: true, apellidos: true } },
        mesa_espacio: { select: { numero_nombre: true } },
        zona: { select: { nombre_zona: true, evento: { select: { nombre_evento: true } } } },
      },
    })
    res.json(entradas.map(e => ({
      codigo: e.codigo_ingreso,
      cliente: `${e.usuario.nombres} ${e.usuario.apellidos || ''}`.trim(),
      mesa: e.mesa_espacio?.numero_nombre || null,
      zona: e.zona?.nombre_zona || null,
      evento: e.zona?.evento?.nombre_evento || null,
      restantes: Math.max(0, (e.cantidad_personas || 0) - (e.cantidad_ingresada || 0)),
    })))
  } catch (e) {
    console.error('Error buscando código:', e)
    res.status(500).json({ error: 'Error al buscar el código' })
  }
})

// GET /api/aforo/reparto/:idEvento — reparto de mesas entre los meseros que
// atienden el evento: total de mesas reservadas, meseros con carga, y el LÍMITE
// justo por mesero (mesas ÷ meseros presentes). Sirve para que ningún mesero
// acapare y todos lleven una carga pareja.
router.get('/reparto/:idEvento', soloRoles('Mesero', 'Bartender', 'Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const idEvento = Number(req.params.idEvento)
    if (!idEvento) return res.status(400).json({ error: 'Evento inválido' })
    // Mesas RESERVADAS del evento (las que hay que atender)
    const mesasAtender = await prisma.mesa_espacio.count({
      where: { zona: { id_evento: idEvento }, tipo_elemento: 'mesa', estado_ocupacion: { in: ['reservada', 'ocupada'] } },
    })
    // Meseros CON al menos una asignación activa en el evento (los presentes)
    const asignaciones = await prisma.asignacion_mesa.findMany({
      where: { estado: { in: ['asignada', 'atendiendo'] }, mesa_espacio: { zona: { id_evento: idEvento } } },
      select: { id_mesero: true },
    })
    const cargaPorMesero = new Map()
    for (const a of asignaciones) cargaPorMesero.set(a.id_mesero, (cargaPorMesero.get(a.id_mesero) || 0) + 1)
    const meserosPresentes = Math.max(cargaPorMesero.size, 1)
    // Límite justo (con un piso de 3 para que no sea asfixiante con pocos meseros)
    const limitePorMesero = Math.max(3, Math.ceil(mesasAtender / meserosPresentes))
    res.json({
      mesas_a_atender: mesasAtender,
      meseros_presentes: meserosPresentes,
      limite_por_mesero: limitePorMesero,
      mi_carga: cargaPorMesero.get(req.usuario.id) || 0,
    })
  } catch (e) {
    console.error('Error calculando reparto:', e)
    res.status(500).json({ error: 'Error al calcular el reparto de mesas' })
  }
})

// POST /api/aforo/mesa/:idMesa/cerrar-atencion — el MESERO marca que terminó de
// atender esa mesa: el grupo se fue, así que la asignación se cierra y la mesa
// queda LIBRE para el siguiente grupo. Es la rotación de grupos que distingue
// al grupo de las 21:00 del que llega a la 01:30 (antes nadie liberaba la mesa).
router.post('/mesa/:idMesa/cerrar-atencion', soloRoles('Mesero', 'Bartender', 'Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const idMesa = Number(req.params.idMesa)
    if (!idMesa) return res.status(400).json({ error: 'Mesa inválida' })

    // Quién estaba sentado ahí: las entradas de las asignaciones activas y, además,
    // cualquier entrada de esa mesa con gente adentro. Sin lo segundo, una mesa
    // ocupada sin mesero asignado (ingreso en vivo en recepción) se liberaba sin
    // registrar la salida: el aforo seguía contándolos y el reporte no tenía hora.
    const asignadas = await prisma.asignacion_mesa.findMany({
      where: { id_mesa: idMesa, estado: { in: ['asignada', 'atendiendo'] } },
      include: { entrada: { select: { id_entrada: true, id_zona: true, cantidad_ingresada: true } } },
    })
    const adentro = await prisma.entrada.findMany({
      where: { id_mesa: idMesa, cantidad_ingresada: { gt: 0 } },
      select: { id_entrada: true, id_zona: true, cantidad_ingresada: true },
    })
    const porEntrada = new Map()
    for (const e of [...asignadas.map(a => a.entrada).filter(Boolean), ...adentro]) porEntrada.set(e.id_entrada, e)
    const activas = [...porEntrada.values()].map(entrada => ({ entrada }))

    const ahora = new Date()
    const zonasTocadas = new Set()

    await prisma.$transaction(async (tx) => {
      // 1) Cerrar la asignación con rastro completo: fecha/hora de cierre y quién
      //    la cerró. El registro dice: esta mesa ESTUVO asignada a este cliente
      //    (id_entrada) con este mesero, de fecha_asignacion a fecha_cierre.
      //    Que el grupo se haya ido no borra que estuvo: eso es el historial.
      await tx.asignacion_mesa.updateMany({
        where: { id_mesa: idMesa, estado: { in: ['asignada', 'atendiendo'] } },
        data: { estado: 'cerrada', fecha_cierre: ahora, cerrada_por: req.usuario.id },
      })

      // 2) Registrar la SALIDA en el aforo: las personas de esa entrada ya no
      //    están dentro, así el contador del recepcionista baja en vivo.
      for (const a of activas) {
        const dentro = a.entrada?.cantidad_ingresada || 0
        if (!a.entrada || dentro <= 0) continue
        await tx.entrada.updateMany({
          where: { id_entrada: a.entrada.id_entrada, cantidad_ingresada: { gt: 0 } },
          data: { cantidad_ingresada: 0, estado_validacion: false },
        })
        await tx.registro_aforo.create({
          data: {
            id_zona: a.entrada.id_zona,
            id_entrada: a.entrada.id_entrada,
            id_recepcionista: req.usuario.id, // quién registró la salida (aquí: el mesero)
            tipo_movimiento: 'salida',
            cantidad: dentro,
            fecha_hora: ahora,
          },
        })
        zonasTocadas.add(a.entrada.id_zona)
      }

      // 3) La mesa queda libre para el siguiente grupo
      await tx.mesa_espacio.update({ where: { id_mesa: idMesa }, data: { estado_ocupacion: 'libre' } })
    })

    // Avisos en tiempo real: mesa libre + aforo actualizado por zona
    const mesa = await prisma.mesa_espacio.findUnique({ where: { id_mesa: idMesa }, select: { id_zona: true } })
    if (global.io && mesa) global.io.emit('mesa_actualizada', { id_zona: mesa.id_zona, id_mesa: idMesa, estado: 'libre' })
    for (const idZona of zonasTocadas) {
      const zona = await prisma.zona.findUnique({ where: { id_zona: idZona } })
      if (zona && global.io) {
        const aforoNuevo = await aforoActualZona(idZona)
        global.io.emit('aforo_actualizado', resumenZona(zona, aforoNuevo))
      }
    }
    emitirRecurso('reservas', { id_mesa: idMesa })
    emitirRecurso('aforo', { id_mesa: idMesa })
    res.json({ ok: true, salidas_registradas: zonasTocadas.size > 0 })
  } catch (e) {
    console.error('Error cerrando atención de mesa:', e)
    res.status(500).json({ error: 'No se pudo cerrar la atención de la mesa' })
  }
})

// GET /api/aforo/historial-atenciones?evento=&mesero= — control estricto de qué
// pasó con cada mesa: quién estaba (cliente de la entrada), qué mesero atendió,
// en qué evento, cuándo se asignó y cuándo se marcó la salida.
router.get('/historial-atenciones', soloRoles('Recepcionista', 'Administrador', 'Mesero', 'Bartender'), async (req, res) => {
  try {
    const idEvento = Number(req.query.evento) || null
    const idMesero = Number(req.query.mesero) || null
    const filas = await prisma.asignacion_mesa.findMany({
      where: {
        ...(idMesero ? { id_mesero: idMesero } : {}),
        ...(idEvento ? { mesa_espacio: { zona: { id_evento: idEvento } } } : {}),
      },
      orderBy: { fecha_asignacion: 'desc' },
      take: 120,
      include: {
        mesa_espacio: { select: { numero_nombre: true, zona: { select: { nombre_zona: true, evento: { select: { id_evento: true, nombre_evento: true } } } } } },
        usuario: { select: { nombres: true, apellidos: true } },
        entrada: { select: { usuario: { select: { nombres: true, apellidos: true } } } },
      },
    })
    res.json(filas.map(a => ({
      id_asignacion: a.id_asignacion,
      mesa: a.mesa_espacio?.numero_nombre || null,
      zona: a.mesa_espacio?.zona?.nombre_zona || null,
      evento: a.mesa_espacio?.zona?.evento?.nombre_evento || null,
      id_evento: a.mesa_espacio?.zona?.evento?.id_evento || null,
      mesero: `${a.usuario.nombres} ${a.usuario.apellidos || ''}`.trim(),
      cliente: a.entrada?.usuario ? `${a.entrada.usuario.nombres} ${a.entrada.usuario.apellidos || ''}`.trim() : null,
      estado: a.estado,
      fecha_asignacion: a.fecha_asignacion,
      fecha_cierre: a.fecha_cierre,
    })))
  } catch (e) {
    console.error('Error en historial de atenciones:', e)
    res.status(500).json({ error: 'Error al obtener el historial de atenciones' })
  }
})

// POST /api/aforo/salir-evento — el mesero marca su SALIDA del evento: todas sus
// mesas asignadas de ese evento se liberan al POOL para que otro mesero presente
// las tome (redistribución al irse). Body: { id_evento }
router.post('/salir-evento', soloRoles('Mesero', 'Bartender'), async (req, res) => {
  try {
    const idEvento = Number(req.body.id_evento)
    if (!idEvento) return res.status(400).json({ error: 'Falta el evento' })
    // Se CIERRAN las asignaciones del mesero en ese evento: las mesas quedan sin
    // mesero y recepción (o el reparto) las reasigna a otro presente. La reserva
    // del grupo NO se toca — solo cambia quién la atiende.
    const r = await prisma.asignacion_mesa.updateMany({
      where: {
        id_mesero: req.usuario.id, estado: { in: ['asignada', 'atendiendo'] },
        mesa_espacio: { zona: { id_evento: idEvento } },
      },
      data: { estado: 'cerrada' },
    })
    if (global.io) global.io.emit('mesas_liberadas', { id_evento: idEvento, cantidad: r.count })
    res.json({ ok: true, liberadas: r.count })
  } catch (e) {
    console.error('Error al salir del evento:', e)
    res.status(500).json({ error: 'No se pudo registrar tu salida' })
  }
})

// ============================================
// Ingreso de la noche (walk-in) — Fase H
// Gente que llega SIN reserva. El recepcionista elige el plano (zona) o una mesa;
// el precio ya vive en el mapa (mesa.precio o zona.precio_entrada_base) y se cobra
// en puerta. El ingreso al aforo es INMEDIATO (no es una reserva a futuro).
// ============================================

// Genera un código único para el qr_acceso de la entrada walk-in.
function generarCodigoWalkIn(idUsuario) {
  return `ENT-${idUsuario}-${crypto.randomBytes(9).toString('hex')}`
}

// Usuario genérico para ingresos anónimos de solo aforo (sin registrar cliente).
// Se busca/crea una única vez y se reutiliza.
async function usuarioIngresoGeneral() {
  const correo = 'ingreso.general@euphoria.local'
  let u = await prisma.usuario.findUnique({ where: { correo } })
  if (u) return u
  const rolCliente = await prisma.rol.findFirst({ where: { nombre_rol: 'Cliente' } })
  return prisma.usuario.create({
    data: {
      nombres: 'Ingreso',
      apellidos: 'General',
      correo,
      password_hash: crypto.randomBytes(16).toString('hex'), // no se usa para login
      id_rol: rolCliente ? rolCliente.id_rol : undefined,
      estado_cuenta: 'activo',
    },
  })
}

// GET /api/aforo/planos/:idEvento — planos (zonas) del evento con su precio de
// entrada y mesas, para armar el ingreso de la noche (recepción) o filtrar por
// mapa (bartender).
router.get('/planos/:idEvento', soloRoles('Recepcionista', 'Administrador', 'Bartender', 'Mesero', 'Cajero'), async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const zonas = await prisma.zona.findMany({
      where: { id_evento },
      orderBy: { id_zona: 'asc' },
      include: { mesa_espacio: true },
    })

    // VIVO por mesa: la reserva (cliente, cupos, cuántos ya entraron) y el
    // mesero asignado — el recepcionista debe poder decir "en la M5 está
    // Dilan con reserva de 10 y solo ingresaron 4, lo atiende Alan".
    const idsMesas = zonas.flatMap(z => (z.mesa_espacio || []).map(m => m.id_mesa))
    const [entradas, asignaciones] = await Promise.all([
      prisma.entrada.findMany({
        where: { id_mesa: { in: idsMesas } },
        orderBy: [{ estado_validacion: 'desc' }, { fecha_reserva: 'desc' }],
        select: {
          id_entrada: true, id_mesa: true, cantidad_personas: true, cantidad_ingresada: true,
          usuario: { select: { nombres: true, apellidos: true, es_vip: true } },
        },
      }),
      prisma.asignacion_mesa.findMany({
        where: { id_mesa: { in: idsMesas }, estado: { in: ['asignada', 'atendiendo'] } },
        orderBy: { fecha_asignacion: 'desc' },
        select: { id_mesa: true, usuario: { select: { nombres: true, apellidos: true } } },
      }),
    ])
    // La primera fila por mesa es la vigente (por el orden del query)
    const reservaPorMesa = new Map()
    for (const e of entradas) if (!reservaPorMesa.has(e.id_mesa)) reservaPorMesa.set(e.id_mesa, e)
    const meseroPorMesa = new Map()
    for (const a of asignaciones) if (!meseroPorMesa.has(a.id_mesa)) meseroPorMesa.set(a.id_mesa, a)

    const detalle = await Promise.all(zonas.map(async (z) => {
      const ocupado = await aforoActualZona(z.id_zona)
      const capacidad = z.capacidad_maxima || 0
      // R4.1: "libres" = cupos de VENTA (capacidad − reservado), no capacidad
      // menos ingresados — los reservados que aún no llegan también ocupan cupo.
      const reservado = (await prisma.entrada.aggregate({
        where: { id_zona: z.id_zona },
        _sum: { cantidad_personas: true },
      }))._sum.cantidad_personas || 0
      return {
        id_zona: z.id_zona,
        nombre_zona: z.nombre_zona,
        es_general: z.es_general,
        precio_entrada_base: Number(z.precio_entrada_base),
        capacidad,
        ocupado,
        reservado,
        disponibles: Math.max(0, capacidad - reservado),
        proporcion: z.proporcion || 1.6,
        mesas: (z.mesa_espacio || []).map(m => {
          const rsv = reservaPorMesa.get(m.id_mesa)
          const asg = meseroPorMesa.get(m.id_mesa)
          const enMesa = m.estado_ocupacion !== 'libre' && rsv ? rsv : null
          return {
            id_mesa: m.id_mesa,
            tipo_elemento: m.tipo_elemento,
            numero_nombre: m.numero_nombre,
            posicion_x: m.posicion_x, posicion_y: m.posicion_y,
            ancho: m.ancho, alto: m.alto, rotacion: m.rotacion, forma: m.forma,
            capacidad_sillas: m.capacidad_sillas,
            precio: m.precio != null ? Number(m.precio) : null,
            estado_ocupacion: m.estado_ocupacion,
            es_seleccionable: m.es_seleccionable,
            // — datos EN VIVO de la mesa (solo si no está libre) —
            cliente: enMesa?.usuario ? `${enMesa.usuario.nombres} ${enMesa.usuario.apellidos || ''}`.trim() : null,
            es_vip: enMesa?.usuario?.es_vip || false,
            reservados: enMesa?.cantidad_personas ?? null,
            ingresados: enMesa?.cantidad_ingresada ?? null,
            id_entrada: enMesa?.id_entrada ?? null,
            mesero: asg?.usuario ? `${asg.usuario.nombres} ${asg.usuario.apellidos || ''}`.trim() : null,
          }
        }),
      }
    }))
    res.json({ id_evento, zonas: detalle })
  } catch (e) {
    console.error('Error obteniendo planos del evento:', e)
    res.status(500).json({ error: 'Error al obtener los planos' })
  }
})

// POST /api/aforo/walk-in — registra un ingreso de la noche (sin reserva previa).
// Body: { id_zona, id_mesa?, cantidad, metodo_pago: 'efectivo'|'qr'|'cortesia', id_cliente? }
// - Con id_mesa: cobra mesa.precio y ocupa la mesa.
// - Sin mesa (zona general): cobra zona.precio_entrada_base * cantidad.
router.post('/walk-in', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const cantidad = Math.max(1, parseInt(req.body.cantidad) || 1)
    const metodo = ['efectivo', 'qr', 'cortesia'].includes(req.body.metodo_pago) ? req.body.metodo_pago : 'efectivo'
    const idMesa = req.body.id_mesa ? Number(req.body.id_mesa) : null

    // Resolver zona (por mesa o directa) y precio.
    let zona, mesa = null, precioUnitario, cantidadFinal = cantidad
    if (idMesa) {
      mesa = await prisma.mesa_espacio.findUnique({ where: { id_mesa: idMesa }, include: { zona: { include: { evento: true } } } })
      if (!mesa) return res.status(404).json({ error: 'La mesa no existe' })
      if (!mesa.es_seleccionable || (mesa.tipo_elemento !== 'mesa' && mesa.tipo_elemento !== 'silla')) {
        return res.status(400).json({ error: 'Ese elemento no admite ingreso' })
      }
      if (mesa.estado_ocupacion !== 'libre') {
        return res.status(409).json({ error: 'Esa mesa ya está ocupada. Elige otra.' })
      }
      zona = mesa.zona
      // Una mesa se cobra completa; su cupo son sus sillas.
      cantidadFinal = mesa.tipo_elemento === 'mesa' ? Math.max(cantidad, 1) : 1
      precioUnitario = mesa.precio != null ? Number(mesa.precio) : Number(zona.precio_entrada_base)
    } else {
      const id_zona = Number(req.body.id_zona)
      if (!id_zona) return res.status(400).json({ error: 'Elige un plano o una mesa.' })
      zona = await prisma.zona.findUnique({ where: { id_zona }, include: { evento: true } })
      if (!zona) return res.status(404).json({ error: 'El plano no existe' })
      precioUnitario = Number(zona.precio_entrada_base)
    }

    // El evento debe estar en su ventana (no terminado / no a futuro lejano).
    const ventana = ventanaEvento(zona.evento)
    if (ventana.estado === 'finalizada') return res.status(409).json({ error: 'Este evento ya terminó.' })
    if (ventana.estado === 'proxima') return res.status(409).json({ error: 'Este evento aún no abre sus puertas.' })

    // Cuántos entran AHORA MISMO (el resto del grupo entra después por tandas
    // con el código de la entrada — antes todos quedaban "adentro" de golpe y
    // el aforo no reflejaba la realidad).
    let ingresanAhora = req.body.cantidad_ahora != null
      ? Math.max(0, Math.min(parseInt(req.body.cantidad_ahora) || 0, cantidadFinal))
      : cantidadFinal

    // R4.1 — Cupo de venta = capacidad − RESERVADO (cupos vendidos de TODA la
    // zona, mesas incluidas, hayan entrado o no). Antes se validaba contra los
    // INGRESADOS y se podía sobrevender: con 270 lugares reservados en mesas y
    // 0 adentro, aceptaba 300 generales en una zona de 300.
    const capacidad = zona.capacidad_maxima || 0
    const reservadoPrevio = (await prisma.entrada.aggregate({
      where: { id_zona: zona.id_zona },
      _sum: { cantidad_personas: true },
    }))._sum.cantidad_personas || 0
    const aforoPrevio = await aforoActualZona(zona.id_zona)
    if (capacidad > 0 && reservadoPrevio + cantidadFinal > capacidad) {
      return res.status(409).json({
        error: `Sin cupo en ${zona.nombre_zona}: ${reservadoPrevio} de ${capacidad} lugares ya están vendidos (quedan ${Math.max(0, capacidad - reservadoPrevio)}).`,
        aforo_lleno: true,
      })
    }

    // Monto: mesa = precio de la mesa; zona = precio por persona. Cortesía = 0.
    const monto = metodo === 'cortesia'
      ? 0
      : (idMesa ? precioUnitario : precioUnitario * cantidadFinal)

    // Cliente: el registrado (si vino) o el usuario genérico de ingreso general.
    let idUsuario = req.body.id_cliente ? Number(req.body.id_cliente) : null
    if (idUsuario) {
      const c = await prisma.usuario.findUnique({ where: { id_usuario: idUsuario } })
      if (!c) idUsuario = null
    }
    if (!idUsuario) idUsuario = (await usuarioIngresoGeneral()).id_usuario

    const codigo = generarCodigoWalkIn(idUsuario)
    let entradaCreada
    try {
      entradaCreada = await prisma.$transaction(async (tx) => {
        if (idMesa) {
          const tomada = await tx.mesa_espacio.updateMany({
            where: { id_mesa: idMesa, estado_ocupacion: 'libre' },
            data: { estado_ocupacion: 'reservada' },
          })
          if (tomada.count === 0) throw new Error('MESA_OCUPADA')
        }
        const ent = await tx.entrada.create({
          data: {
            id_usuario: idUsuario,
            id_zona: zona.id_zona,
            id_mesa: idMesa,
            qr_acceso: codigo,
            codigo_ingreso: codigo.slice(-12).toUpperCase(),
            cantidad_personas: cantidadFinal,
            cantidad_ingresada: ingresanAhora, // los que faltan entran por tandas con el código
            monto_pagado: monto,
            estado_validacion: ingresanAhora > 0,
            fecha_reserva: new Date(),
          },
        })
        if (ingresanAhora > 0) {
          await tx.registro_aforo.create({
            data: {
              id_zona: zona.id_zona,
              id_entrada: ent.id_entrada,
              id_recepcionista: req.usuario.id,
              tipo_movimiento: 'ingreso',
              cantidad: ingresanAhora,
              fecha_hora: new Date(),
            },
          })
        }
        return ent
      })
    } catch (e) {
      if (e.message === 'MESA_OCUPADA') return res.status(409).json({ error: 'Alguien tomó esa mesa antes. Elige otra.' })
      throw e
    }

    const aforoNuevo = aforoPrevio + ingresanAhora
    const resumen = resumenZona(zona, aforoNuevo)
    if (global.io) {
      global.io.emit('aforo_actualizado', resumen)
      if (idMesa) global.io.emit('mesa_actualizada', { id_zona: zona.id_zona, id_mesa: idMesa, estado: 'reservada' })
    }

    // Si ingresó a una mesa, sugerir mesero (recepción confirma) igual que en el check-in.
    let mesero_sugerido = null
    if (idMesa) {
      const sug = await meseroConMenosCarga(await eventoDeMesa(idMesa))
      if (sug) mesero_sugerido = { id_usuario: sug.id_usuario, nombre: `${sug.nombres} ${sug.apellidos || ''}`.trim(), carga: sug.carga }
    }

    res.status(201).json({
      mensaje: 'Ingreso registrado',
      id_entrada: entradaCreada.id_entrada,
      id_mesa: idMesa,
      mesa: mesa ? mesa.numero_nombre : null,
      zona: zona.nombre_zona,
      personas: cantidadFinal,
      monto,
      metodo_pago: metodo,
      ingresaron_ahora: ingresanAhora,
      faltan: cantidadFinal - ingresanAhora,
      // Los que faltan del grupo entran después con este código (por tandas)
      codigo_ingreso: entradaCreada.codigo_ingreso,
      mesero_sugerido,
      aforo: resumen,
    })
  } catch (e) {
    console.error('Error en walk-in:', e)
    res.status(500).json({ error: 'Error al registrar el ingreso' })
  }
})

module.exports = router
