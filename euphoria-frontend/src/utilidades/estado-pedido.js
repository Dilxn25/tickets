// ============================================
// EUPHORIA — Semáforo de estados de pedido
// Un solo criterio de color para cliente, mesero, bartender y admin:
// el personal y el cliente miran el color, no leen el texto.
// ============================================

export const SEMAFORO = {
  pendiente:  { clave: 'pendiente',  color: '#ef4444', label: 'Pendiente',  detalle: 'En cola, la barra aún no lo tomó',   pulsa: true },
  preparando: { clave: 'preparando', color: '#f59e0b', label: 'Preparando', detalle: 'La barra lo está preparando',          pulsa: true },
  listo:      { clave: 'listo',      color: '#3b82f6', label: 'Listo',      detalle: 'Preparado: en camino o para recoger', pulsa: false },
  entregado:  { clave: 'entregado',  color: '#22c55e', label: 'Entregado',  detalle: 'Ya está en la mesa o fue recogido',   pulsa: false },
  cerrado:    { clave: 'cerrado',    color: '#6b7280', label: 'Cancelado',  detalle: 'Cancelado o devuelto',                pulsa: false },
}

// Orden en que se muestra la leyenda (de menos a más avanzado)
export const ORDEN_SEMAFORO = ['pendiente', 'preparando', 'listo', 'entregado', 'cerrado']

/**
 * Resuelve el color de un pedido a partir de sus campos reales.
 * Acepta tanto el objeto de la API (estado_despacho / estado_entrega) como
 * los resúmenes del front (estado / entregado).
 */
export function semaforoDe(p) {
  if (!p) return SEMAFORO.pendiente
  const despacho = p.estado_despacho || p.estado || ''
  const entrega = p.estado_entrega || ''
  if (['Cancelada', 'Reembolsada'].includes(despacho)) return SEMAFORO.cerrado
  if (despacho === 'Completada' || entrega === 'entregado' || p.entregado === true) return SEMAFORO.entregado
  if (despacho === 'Listo') return SEMAFORO.listo
  if (despacho === 'Preparando') return SEMAFORO.preparando
  // Pendiente y Programado (aún no ingresa al evento) se ven igual: nadie lo tomó.
  return SEMAFORO.pendiente
}
