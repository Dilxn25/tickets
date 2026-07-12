// ============================================
// EUPHORIA — Utilidades de formato (moneda, monto con signo, fecha)
// Criterio ÚNICO es-BO para toda la app: evita que el mismo saldo se vea
// distinto entre vistas (antes: 1234.50 en Inicio/Carrito vs 1,234.50 en
// Billetera/Movimientos). Reemplaza las copias byte a byte dispersas.
// ============================================

// Bs con separador de miles y 2 decimales (SIN el prefijo "Bs.").
export function formatoMoneda(valor) {
  const n = parseFloat(valor)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Igual que formatoMoneda pero con el prefijo "Bs." delante.
export function formatoBs(valor) {
  return `Bs. ${formatoMoneda(valor)}`
}

// Monto de movimiento con signo (+ recargas / − consumos y reservas).
export function formatoMonto(monto) {
  const n = Number(monto) || 0
  return `${n > 0 ? '+' : n < 0 ? '−' : ''} Bs. ${formatoMoneda(Math.abs(n))}`
}

// Fecha + hora separadas por "·" (criterio global del proyecto).
export function formatoFecha(fecha) {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('es-BO')} · ${d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`
}

// Solo fecha (sin hora) para listados compactos.
export function formatoSoloFecha(fecha) {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-BO')
}
