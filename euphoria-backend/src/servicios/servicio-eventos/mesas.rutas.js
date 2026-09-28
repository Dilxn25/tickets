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
// Con ?evento=id solo trae las mesas del evento que atiende el mesero. Cada mesa lleva
// quién la reservó (reserva_cliente), para que el mesero la reconozca por el nombre
// del cliente y al elegirla el sistema lo identifique solo.
router.get('/', async (req, res) => {
  try {
    const idEvento = Number(req.query.evento) || null
    const mesas = await prisma.mesa_espacio.findMany({
      where: {
        zona: idEvento
          ? { id_evento: idEvento }
          : {
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
    const ids = mesas.map(m => m.id_mesa)
    const reservas = ids.length
      ? await prisma.entrada.findMany({
          where: { id_mesa: { in: ids } },
          orderBy: [{ estado_validacion: 'desc' }, { fecha_reserva: 'desc' }],
          select: { id_mesa: true, estado_validacion: true, usuario: { select: { id_usuario: true, nombres: true, apellidos: true } } },
        })
      : []
    const titular = new Map()
    for (const r of reservas) if (!titular.has(r.id_mesa)) titular.set(r.id_mesa, r)
    res.json(mesas.map(m => {
      const r = titular.get(m.id_mesa)
      return r
        ? { ...m, reserva_cliente: `${r.usuario.nombres} ${r.usuario.apellidos}`.trim(), reserva_id_cliente: r.usuario.id_usuario, reserva_ingreso: !!r.estado_validacion }
        : m
    }))
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
    // El mesero elige a QUÉ evento atiende: con ?evento=id solo se devuelven las
    // zonas de ESE evento (antes se mezclaban los mapas de los 2 eventos activos).
    const idEvento = Number(req.query.evento) || null
    const zonas = await prisma.zona.findMany({
      where: idEvento
        ? { id_evento: idEvento }
        : { evento: { estado: { in: ['promocion', 'en_transcurso', 'lleno'] } } },
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

    // El cliente se recupera de la RESERVA real (tabla entrada), no de una comanda:
    // antes se buscaba una comanda activa, así que si el cliente reservó pero aún
    // no había pedido nada, el mesero no lo recuperaba (bug: "reservó la S5 pero no
    // aparece el cliente"). Tomamos la reserva más reciente de esa mesa; si ya
    // ingresó (estado_validacion true) tiene prioridad sobre una sin ingresar.
    const entrada = await prisma.entrada.findFirst({
      where: { id_mesa: id },
      orderBy: [{ estado_validacion: 'desc' }, { fecha_reserva: 'desc' }],
      include: {
        usuario: { select: { id_usuario: true, nombres: true, apellidos: true, telefono: true, es_vip: true } },
      },
    })

    if (entrada && entrada.usuario) {
      return res.json({
        cliente: entrada.usuario,
        id_entrada: entrada.id_entrada,
        ingresado: !!entrada.estado_validacion,
        cantidad_personas: entrada.cantidad_personas,
      })
    }

    // Respaldo: alguna comanda abierta con cliente (walk-in atendido antes)
    const comanda = await prisma.comanda.findFirst({
      where: { id_mesa: id, estado_despacho: { not: 'pagado' }, id_cliente: { not: null } },
      orderBy: { fecha_registro: 'desc' },
      include: {
        usuario_comanda_id_clienteTousuario: {
          select: { id_usuario: true, nombres: true, apellidos: true, telefono: true, es_vip: true },
        },
      },
    })
    if (comanda && comanda.usuario_comanda_id_clienteTousuario) {
      return res.json({ cliente: comanda.usuario_comanda_id_clienteTousuario })
    }
    res.json({ cliente: null })
  } catch (error) {
    console.error('Error al obtener reserva de mesa:', error)
    res.status(500).json({ error: 'Error al obtener reserva' })
  }
})

module.exports = router
