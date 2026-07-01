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

// ---- GET /api/eventos/disponibles (Accesible para clientes y público) ----
router.get('/disponibles', async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: { estado: 'activo' },
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
    if (evento.estado !== 'activo') return res.status(403).json({ error: 'Este evento no está disponible actualmente' })

    res.json(evento)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los detalles del evento' })
  }
})

// ---- POST /api/eventos/reservar (Para Clientes) ----
router.post('/reservar', verificarToken, async (req, res) => {
  try {
    const { id_evento, id_zona, id_mesa, tipo } = req.body

    // Si es VIP y envían una mesa, bloquearla
    if (tipo === 'vip' && id_mesa) {
      const mesa = await prisma.mesa_espacio.findUnique({ where: { id_mesa: Number(id_mesa) } })
      if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' })

      // Bloqueo ATÓMICO: solo reserva si la mesa SIGUE libre.
      // updateMany con filtro estado_ocupacion='libre' evita que dos clientes
      // reserven la misma mesa al mismo tiempo (condición de carrera).
      const bloqueada = await prisma.mesa_espacio.updateMany({
        where: { id_mesa: Number(id_mesa), estado_ocupacion: 'libre' },
        data: { estado_ocupacion: 'reservada' }
      })
      if (bloqueada.count === 0) {
        return res.status(400).json({ error: 'La mesa ya ha sido reservada por otro usuario' })
      }
    }

    // TODO: Aquí se podría crear el registro en la tabla 'entrada'

    res.json({ mensaje: 'Reserva confirmada exitosamente' })
  } catch (error) {
    console.error('Error en reserva:', error)
    res.status(500).json({ error: 'Error interno al procesar la reserva' })
  }
})

// === RUTAS PROTEGIDAS (Solo Administrador) ===
router.use(verificarToken)
router.use(soloRoles('Administrador'))

// ---- GET /api/eventos (Todos para el admin, con validación de cierre automático) ----
router.get('/', async (req, res) => {
  try {
    const ahora = new Date()

    // 1. Cierre automático de eventos expirados
    // Buscamos eventos que ya pasaron su fecha de fin y siguen 'planificado' o 'activo'
    const eventosExpirados = await prisma.evento.findMany({
      where: {
        fecha_hora_fin: { lt: ahora },
        estado: { not: 'finalizado' }
      }
    })

    let notificacionCierre = null
    if (eventosExpirados.length > 0) {
      const idsExpirados = eventosExpirados.map(e => e.id_evento)
      
      // Cerrarlos automáticamente
      await prisma.evento.updateMany({
        where: { id_evento: { in: idsExpirados } },
        data: { estado: 'finalizado' }
      })

      notificacionCierre = `Sistema Automático: Se han finalizado ${eventosExpirados.length} evento(s) que superaron su fecha límite de cierre.`
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
    const { nombre_evento, descripcion, fecha_hora_inicio, fecha_hora_fin } = req.body

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
        estado: 'planificado' // planificado, activo, finalizado
      }
    })

    res.status(201).json({ mensaje: 'Evento planificado correctamente', evento: nuevoEvento })
  } catch (error) {
    console.error('Error al crear evento:', error)
    res.status(500).json({ error: 'Error interno al crear el evento' })
  }
})

// ---- PUT /api/eventos/:id (Editar evento) ----
router.put('/:id', subirImagenEvento.single('imagen'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nombre_evento, descripcion, fecha_hora_inicio, fecha_hora_fin } = req.body

    const datosAct = {
      ...(nombre_evento && { nombre_evento }),
      ...(descripcion && { descripcion }),
      ...(fecha_hora_inicio && { fecha_hora_inicio: new Date(fecha_hora_inicio) }),
      ...(fecha_hora_fin && { fecha_hora_fin: new Date(fecha_hora_fin) }),
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
    const { estado } = req.body // 'activo', 'planificado', 'finalizado'

    if (!['activo', 'planificado', 'finalizado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const actualizado = await prisma.evento.update({
      where: { id_evento: id },
      data: { estado }
    })

    res.json({ mensaje: `Evento marcado como ${estado}`, evento: actualizado })
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del evento' })
  }
})

module.exports = router
