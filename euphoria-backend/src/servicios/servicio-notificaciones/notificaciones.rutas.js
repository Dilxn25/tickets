// ============================================
// EUPHORIA — Centro de notificaciones por usuario
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken } = require('../../middlewares/autenticacion')

router.use(verificarToken)

// GET /api/notificaciones — últimas notificaciones del usuario
router.get('/', async (req, res) => {
  try {
    const lista = await prisma.notificacion.findMany({
      where: { id_usuario: req.usuario.id },
      orderBy: { fecha: 'desc' },
      take: 30,
    })
    const no_leidas = await prisma.notificacion.count({ where: { id_usuario: req.usuario.id, leida: false } })
    res.json({ notificaciones: lista, no_leidas })
  } catch (e) {
    console.error('Error listando notificaciones:', e)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// PATCH /api/notificaciones/leer-todas
router.patch('/leer-todas', async (req, res) => {
  try {
    await prisma.notificacion.updateMany({ where: { id_usuario: req.usuario.id, leida: false }, data: { leida: true } })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Error' }) }
})

// PATCH /api/notificaciones/:id/leida
router.patch('/:id/leida', async (req, res) => {
  try {
    await prisma.notificacion.updateMany({ where: { id_notificacion: Number(req.params.id), id_usuario: req.usuario.id }, data: { leida: true } })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Error' }) }
})

module.exports = router
