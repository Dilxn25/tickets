// ============================================
// EUPHORIA — Servicio de Eventos
// Rutas: GET    /api/eventos
//        GET    /api/eventos/disponibles (Público/Cliente)
//        POST   /api/eventos
//        PUT    /api/eventos/:id
//        PATCH  /api/eventos/:id/estado
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { subirImagenEvento } = require('../../config/cloudinary')

// Modelo de la Fase 3: tipos y estados (identificadores internos).
const TIPOS_EVENTO = ['estandar', 'especial', 'externo']
const ESTADOS_EVENTO = ['planificacion', 'promocion', 'en_transcurso', 'lleno', 'terminado']
// Estados en que un evento es visible/reservable para el cliente.
const ESTADOS_PUBLICOS = ['promocion', 'en_transcurso', 'lleno']

// Mueve los estados que dependen del reloj, sin intervención del admin:
//  - "En transcurso": eventos ya publicados (Promoción/Lleno) que ya iniciaron y siguen vigentes.
//  - "Terminado": eventos cuya fecha de fin ya pasó.
// Devuelve cuántos se terminaron (para el aviso del panel).
async function sincronizarEstadosPorTiempo() {
  const ahora = new Date()
  const terminados = await prisma.evento.updateMany({
    where: { fecha_hora_fin: { lt: ahora }, estado: { not: 'terminado' } },
    data: { estado: 'terminado' },
  })
  await prisma.evento.updateMany({
    where: {
      fecha_hora_inicio: { lte: ahora },
      estado: { in: ['promocion', 'lleno'] },
      OR: [{ fecha_hora_fin: null }, { fecha_hora_fin: { gt: ahora } }],
    },
    data: { estado: 'en_transcurso' },
  })
  return terminados.count
}

// ---- GET /api/eventos/disponibles (Accesible para clientes y público) ----
router.get('/disponibles', async (req, res) => {
  try {
    await sincronizarEstadosPorTiempo()
    const eventos = await prisma.evento.findMany({
      where: { estado: { in: ESTADOS_PUBLICOS } },
      orderBy: { fecha_hora_inicio: 'asc' },
      include: {
        zona: true // Para mostrar precios y aforo al cliente
      }
    })
    res.json(eventos)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener eventos disponibles' })
  }
})

// ---- GET /api/eventos/disponibles/:id (Accesible para clientes y público) ----
router.get('/disponibles/:id', async (req, res) => {
  try {
    await sincronizarEstadosPorTiempo()
    const id = Number(req.params.id)
    const evento = await prisma.evento.findUnique({
      where: { id_evento: id },
      include: {
        zona: {
          include: {
            mesa_espacio: true
          }
        }
      }
    })

    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' })
    if (!ESTADOS_PUBLICOS.includes(evento.estado)) return res.status(403).json({ error: 'Este evento no está disponible actualmente' })

    res.json(evento)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los detalles del evento' })
  }
})

// ---- POST /api/eventos/reservar — RETIRADO ----
// Este stub bloqueaba mesas sin cobrar, sin entrada y sin QR (quedaban huérfanas).
// El flujo REAL y completo vive en POST /api/reservas/mesa (pago atómico + QR).
router.post('/reservar', verificarToken, (req, res) => {
  res.status(410).json({ error: 'Este flujo fue reemplazado. Reserva desde el mapa del evento.' })
})

// === RUTAS PROTEGIDAS (Solo Administrador) ===
router.use(verificarToken)
router.use(soloRoles('Administrador'))

// ---- GET /api/eventos (Todos para el admin, con validación de cierre automático) ----
router.get('/', async (req, res) => {
  try {
    // 1. Estados automáticos por tiempo (En transcurso / Terminado)
    const cerrados = await sincronizarEstadosPorTiempo()

    let notificacionCierre = null
    if (cerrados > 0) {
      notificacionCierre = `Sistema Automático: Se han finalizado ${cerrados} evento(s) que superaron su fecha límite de cierre.`
    }

    // 2. Obtener lista de eventos con zonas, entradas y comandas en mesas
    const eventosRaw = await prisma.evento.findMany({
      orderBy: { id_evento: 'desc' },
      include: {
        zona: {
          include: {
            entrada: true,
            mesa_espacio: {
              include: {
                comanda: {
                  include: {
                    detalle_comanda: true
                  }
                }
              }
            }
          }
        }
      }
    })

    const eventos = eventosRaw.map(ev => {
      let asistenciaReal = 0
      let ventasReales = 0

      ev.zona.forEach(z => {
        // Asistencia y ventas de entradas de la zona
        z.entrada.forEach(ent => {
          if (ent.estado_validacion) {
            asistenciaReal += ent.cantidad_personas
          }
          const precio = Number(z.precio_entrada_base) || 0
          ventasReales += ent.cantidad_personas * precio
        })

        // Ventas de comandas en mesas asociadas a esta zona
        z.mesa_espacio.forEach(m => {
          m.comanda.forEach(c => {
            c.detalle_comanda.forEach(det => {
              ventasReales += Number(det.subtotal) || 0
            })
          })
        })
      })

      const { zona, ...resto } = ev
      return {
        ...resto,
        asistenciaReal,
        ventasReales,
        cantidadZonas: zona.length
      }
    })

    // Calcular asistencia real sumando entradas validadas globales
    const totalAsist = await prisma.entrada.aggregate({
      _sum: { cantidad_personas: true },
      where: { estado_validacion: true }
    })
    
    res.json({ 
      eventos, 
      notificacionCierre, 
      asistenciaTotal: totalAsist._sum.cantidad_personas || 0 
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la lista de eventos' })
  }
})

// ---- POST /api/eventos (Crear evento) ----
router.post('/', subirImagenEvento.single('imagen'), async (req, res) => {
  try {
    const { nombre_evento, descripcion, fecha_hora_inicio, fecha_hora_fin, tipo_evento } = req.body

    if (!nombre_evento || !fecha_hora_inicio) {
      return res.status(400).json({ error: 'El nombre y la fecha de inicio son requeridos' })
    }

    const nuevoEvento = await prisma.evento.create({
      data: {
        nombre_evento,
        descripcion,
        fecha_hora_inicio: new Date(fecha_hora_inicio),
        fecha_hora_fin: fecha_hora_fin ? new Date(fecha_hora_fin) : null,
        url_portada: req.file ? req.file.path : null,
        tipo_evento: TIPOS_EVENTO.includes(tipo_evento) ? tipo_evento : 'estandar',
        estado: 'planificacion' // Todo evento nace en Planificación.
      }
    })

    res.status(201).json({ mensaje: 'Evento creado en Planificación', evento: nuevoEvento })
  } catch (error) {
    console.error('Error al crear evento:', error)
    res.status(500).json({ error: 'Error interno al crear el evento' })
  }
})

// ---- PUT /api/eventos/:id (Editar evento) ----
router.put('/:id', subirImagenEvento.single('imagen'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nombre_evento, descripcion, fecha_hora_inicio, fecha_hora_fin, tipo_evento } = req.body

    // Evento actual: necesario para validar la integridad temporal aunque solo se edite UNA fecha
    const eventoActual = await prisma.evento.findUnique({ where: { id_evento: id } })
    if (!eventoActual) return res.status(404).json({ error: 'Evento no encontrado' })

    // Valores efectivos tras el merge (lo que llega, o lo que ya estaba)
    const inicioEfectivo = fecha_hora_inicio ? new Date(fecha_hora_inicio) : eventoActual.fecha_hora_inicio
    const finEfectivo = fecha_hora_fin !== undefined
      ? (fecha_hora_fin ? new Date(fecha_hora_fin) : null)
      : eventoActual.fecha_hora_fin
    if (inicioEfectivo && finEfectivo && finEfectivo <= inicioEfectivo) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio' })
    }

    const datosAct = {
      ...(nombre_evento && { nombre_evento }),
      // Permite BORRAR la descripción (enviar '' la vacía); solo se ignora si no se envía
      ...(descripcion !== undefined && { descripcion: descripcion || null }),
      ...(fecha_hora_inicio && { fecha_hora_inicio: new Date(fecha_hora_inicio) }),
      // Permite BORRAR la fecha de fin (enviar '' la pone en null)
      ...(fecha_hora_fin !== undefined && { fecha_hora_fin: fecha_hora_fin ? new Date(fecha_hora_fin) : null }),
      ...(TIPOS_EVENTO.includes(tipo_evento) && { tipo_evento }),
    }

    if (req.file) {
      datosAct.url_portada = req.file.path
      // TODO: Eliminar imagen anterior de Cloudinary si existe
    }

    const actualizado = await prisma.evento.update({
      where: { id_evento: id },
      data: datosAct
    })

    res.json({ mensaje: 'Evento actualizado', evento: actualizado })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Evento no encontrado' })
    res.status(500).json({ error: 'Error al actualizar evento' })
  }
})

// ---- PATCH /api/eventos/:id/estado (Activar / Finalizar evento) ----
router.patch('/:id/estado', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { estado } = req.body // planificacion | promocion | en_transcurso | lleno | terminado

    if (!ESTADOS_EVENTO.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const actual = await prisma.evento.findUnique({ where: { id_evento: id } })
    if (!actual) return res.status(404).json({ error: 'Evento no encontrado' })

    // Un evento Terminado no puede revivir a un estado previo (cierre definitivo).
    if (actual.estado === 'terminado' && estado !== 'terminado') {
      return res.status(400).json({ error: 'Un evento terminado no puede volver a un estado anterior.' })
    }

    // Un evento cuya fecha ya pasó no puede volver a Planificación ni Promoción
    // (misma regla que el frontend, validada también aquí por seguridad).
    const fechaRef = actual.fecha_hora_fin || actual.fecha_hora_inicio
    const expirado = fechaRef && new Date(fechaRef).getTime() < Date.now()
    if (expirado && (estado === 'planificacion' || estado === 'promocion') && estado !== actual.estado) {
      return res.status(400).json({ error: 'La fecha del evento ya pasó: no puede volver a Planificación ni Promoción.' })
    }

    const actualizado = await prisma.evento.update({
      where: { id_evento: id },
      data: { estado }
    })

    res.json({ mensaje: 'Estado del evento actualizado', evento: actualizado })
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del evento' })
  }
})

module.exports = router
