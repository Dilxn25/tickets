// ============================================
// EUPHORIA — Servicio de Mesas
// Rutas: GET    /api/mesas
//        GET    /api/mesas/:id/reserva
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken } = require('../../middlewares/autenticacion')

router.use(verificarToken)

// ---- GET /api/mesas (Para el POS - listar mesas de eventos activos) ----
router.get('/', async (req, res) => {
  try {
    const mesas = await prisma.mesa_espacio.findMany({
      where: {
        zona: {
          evento: {
            // Eventos públicos / en curso (Promoción, En transcurso, Lleno)
            estado: { in: ['promocion', 'en_transcurso', 'lleno'] }
          }
        }
      },
      orderBy: {
        numero_nombre: 'asc'
      }
    })
    res.json(mesas)
  } catch (error) {
    console.error('Error al obtener mesas:', error)
    res.status(500).json({ error: 'Error al obtener mesas' })
  }
})

// ---- GET /api/mesas/mapa (Para el POS - mapa por zonas de eventos activos) ----
// Devuelve las zonas de los eventos en curso con sus elementos posicionados,
// para que el mesero pueda elegir una mesa tocándola en el plano.
router.get('/mapa', async (req, res) => {
  try {
    const zonas = await prisma.zona.findMany({
      where: {
        evento: { estado: { in: ['promocion', 'en_transcurso', 'lleno'] } },
      },
      orderBy: { id_zona: 'asc' },
      include: {
        evento: { select: { id_evento: true, nombre_evento: true } },
        mesa_espacio: { orderBy: { id_mesa: 'asc' } },
      },
    })
    // Solo se exponen las zonas con al menos un elemento posicionado (mapa real)
    const salida = zonas
      .filter(z => (z.mesa_espacio || []).length > 0)
      .map(z => ({
        id_zona: z.id_zona,
        nombre_zona: z.nombre_zona,
        proporcion: z.proporcion || 1,
        evento: z.evento?.nombre_evento || null,
        id_evento: z.id_evento,
        elementos: z.mesa_espacio,
      }))
    res.json(salida)
  } catch (error) {
    console.error('Error al obtener el mapa de mesas:', error)
    res.status(500).json({ error: 'Error al obtener el mapa' })
  }
})

// ---- GET /api/mesas/:id/reserva (Ver si la mesa tiene reserva y devolver cliente) ----
router.get('/:id/reserva', async (req, res) => {
  try {
    const id = Number(req.params.id)
    
    // Por ahora las reservas las sacamos buscando una comanda abierta para esa mesa
    // o asumiendo que la mesa misma al estar "reservada" debe tener alguien asignado (en la BD actual `comanda` liga el cliente a la mesa)
    // Buscamos la ultima comanda activa en esa mesa
    const reserva = await prisma.comanda.findFirst({
      where: {
        id_mesa: id,
        estado_despacho: { not: 'pagado' } // o un estado de reserva que manejes
      },
      orderBy: {
        fecha_registro: 'desc'
      },
      include: {
        // Solo se exponen campos publicos del cliente (NUNCA password_hash ni datos sensibles)
        usuario_comanda_id_clienteTousuario: {
          select: {
            id_usuario: true,
            nombres: true,
            apellidos: true,
            telefono: true
          }
        }
      }
    })

    if (reserva && reserva.usuario_comanda_id_clienteTousuario) {
      res.json({ cliente: reserva.usuario_comanda_id_clienteTousuario })
    } else {
      res.json({ cliente: null })
    }
  } catch (error) {
    console.error('Error al obtener reserva de mesa:', error)
    res.status(500).json({ error: 'Error al obtener reserva' })
  }
})

module.exports = router
