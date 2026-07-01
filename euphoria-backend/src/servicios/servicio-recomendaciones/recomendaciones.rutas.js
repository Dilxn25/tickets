// ============================================
// EUPHORIA — Servicio de Recomendaciones (IA)
// Reenvía la petición al microservicio Python (FastAPI) y devuelve las sugerencias.
// ============================================
const express = require('express')
const router = express.Router()
const { verificarToken } = require('../../middlewares/autenticacion')

// POST /api/recomendaciones
// Body: { productos_en_mesa: number[], k?: number }
router.post('/', verificarToken, async (req, res) => {
  try {
    const { productos_en_mesa = [], k = 3 } = req.body
    const urlIA = process.env.URL_SERVICIO_IA || 'http://localhost:8000'

    // Fecha/hora actual en formato "YYYY-MM-DD HH:mm:ss" (contexto del modelo)
    const ahora = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const fecha_hora = `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())} ` +
                       `${p(ahora.getHours())}:${p(ahora.getMinutes())}:${p(ahora.getSeconds())}`

    const respuesta = await fetch(`${urlIA}/recomendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos_en_mesa, fecha_hora, k }),
      signal: AbortSignal.timeout(4000), // no bloquear la toma de pedidos si la IA tarda
    })

    if (!respuesta.ok) throw new Error(`IA respondió ${respuesta.status}`)
    const datos = await respuesta.json()
    res.json(datos)
  } catch (error) {
    // Degradación elegante: si la IA no está disponible, se devuelve vacío
    // (la toma de pedidos sigue funcionando, solo sin sugerencias).
    console.error('Recomendaciones IA no disponibles:', error.message)
    res.json({ recomendaciones: [], promociones: [], error: 'Servicio de recomendación no disponible' })
  }
})

module.exports = router
