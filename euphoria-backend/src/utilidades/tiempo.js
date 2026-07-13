// ============================================
// EUPHORIA — Utilidades de tiempo (zona horaria de Bolivia)
// ============================================
// El servidor de producción (Render) corre en UTC; Bolivia es America/La_Paz
// (UTC-4). Las fechas de eventos se guardan tal como las escribe el admin
// (hora boliviana "naive"), así que TODA comparación contra "ahora" debe
// hacerse con la hora boliviana, no con la del servidor. De noche, comparar
// contra UTC hacía que los eventos "terminaran" 4 horas antes y que los
// comprobantes del día se rechazaran por fecha ("allá ya es mañana").

function hoyBolivia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }))
}

module.exports = { hoyBolivia }
