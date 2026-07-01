// ============================================
// EUPHORIA — Servicio de Recomendaciones (IA)
// Reenvía la petición al microservicio Python (FastAPI) y devuelve las sugerencias.
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken } = require('../../middlewares/autenticacion')

// GET /api/recomendaciones/combos — Combos populares (pares más co-comprados) para promociones.
// Se calcula en SQL a partir del historial real. Cada combo trae precio normal y con descuento.
// Redondea a un precio "atractivo" que termina en .90/.40/.50/.60/.00 (un decimal)
function precioAtractivo(p) {
  const entero = Math.floor(p)
  const dec = p - entero
  const opciones = [0, 0.4, 0.5, 0.6, 0.9]
  let mejor = 0, dmin = Infinity
  for (const o of opciones) {
    const d = Math.abs(dec - o)
    if (d < dmin) { dmin = d; mejor = o }
  }
  return Math.round((entero + mejor) * 100) / 100
}

router.get('/combos', verificarToken, async (req, res) => {
  try {
    const DESCUENTO = 0.10 // 10%
    const pares = await prisma.$queryRawUnsafe(`
      SELECT p1.id_producto id1, p1.nombre_producto n1, p1.precio_base pr1, p1.url_imagen img1,
             p2.id_producto id2, p2.nombre_producto n2, p2.precio_base pr2, p2.url_imagen img2,
             COUNT(*) veces
      FROM detalle_comanda d1
      JOIN detalle_comanda d2 ON d1.id_comanda = d2.id_comanda AND d1.id_producto < d2.id_producto
      JOIN comanda c ON c.id_comanda = d1.id_comanda AND c.estado_despacho <> 'Cancelada'
      JOIN producto p1 ON p1.id_producto = d1.id_producto
      JOIN producto p2 ON p2.id_producto = d2.id_producto
      GROUP BY p1.id_producto, p1.nombre_producto, p1.precio_base, p1.url_imagen,
               p2.id_producto, p2.nombre_producto, p2.precio_base, p2.url_imagen
      ORDER BY veces DESC LIMIT 6
    `)
    const combos = pares.map(r => {
      const normal = Number(r.pr1) + Number(r.pr2)
      return {
        productos: [
          { id_producto: Number(r.id1), nombre: r.n1, url_imagen: r.img1 },
          { id_producto: Number(r.id2), nombre: r.n2, url_imagen: r.img2 },
        ],
        nombre: `${r.n1} + ${r.n2}`,
        precio_normal: Math.round(normal * 100) / 100,
        precio_combo: precioAtractivo(normal * (1 - DESCUENTO)),
        descuento_pct: DESCUENTO * 100,
        veces: Number(r.veces),
      }
    })
    res.json({ combos })
  } catch (error) {
    console.error('Error obteniendo combos:', error)
    res.json({ combos: [] }) // degradación elegante
  }
})

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
