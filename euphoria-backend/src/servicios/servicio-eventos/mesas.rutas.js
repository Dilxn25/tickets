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
