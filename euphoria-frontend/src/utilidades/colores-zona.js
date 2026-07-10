// EUPHORIA — Color por ZONA derivado del precio (sin tocar la BD).
// La zona más cara = dorado (VIP); las siguientes toman la paleta en orden.
// Así el color es consistente en el editor, el mapa del cliente y las reservas.

export const PALETA_ZONAS = [
  '#F5B301', // dorado (VIP / la más cara)
  '#EC4899', // rosa
  '#A855F7', // morado
  '#3B82F6', // azul
  '#22C55E', // verde
  '#F97316', // naranja
]

// Recibe una lista de precios y devuelve un Map precio(Number) -> color,
// ordenando de más caro a más barato.
export function mapaColorPorPrecio(precios) {
  const distintos = [...new Set(
    (precios || []).map(Number).filter(p => Number.isFinite(p) && p > 0)
  )].sort((a, b) => b - a)
  const map = new Map()
  distintos.forEach((p, i) => map.set(p, PALETA_ZONAS[i % PALETA_ZONAS.length]))
  return map
}

// Color de un precio según el mapa (null si no tiene precio → zona general/sin nivel).
export function colorPorPrecio(precio, map) {
  const p = Number(precio)
  if (!Number.isFinite(p) || p <= 0) return null
  return map.get(p) || null
}
