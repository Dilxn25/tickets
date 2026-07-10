// EUPHORIA — Difusión de cambios en tiempo real (websockets).
// Cuando algo cambia en el backend emitimos por socket para que TODAS las
// interfaces abiertas se actualicen al instante, sin recargar la página.

function emitirConfigActualizada(cambios = {}) {
  if (global.io) global.io.emit('config_actualizada', cambios)
}

// El catálogo (productos/precios/stock/promos/combos) cambió: mesero, cajero y
// cliente refrescan su lista al instante, sin recargar.
function emitirCatalogoActualizado(motivo = 'cambio') {
  if (global.io) global.io.emit('catalogo_actualizado', { motivo })
}

// Emisor GENÉRICO por tipo de recurso. Cada vista se suscribe a los tipos que le
// interesan (usuarios, eventos, ventas, reservas, recargas, aforo…) y refresca.
// tipo: string · extra: datos opcionales (id afectado, motivo, etc.)
function emitirRecurso(tipo, extra = {}) {
  if (global.io && tipo) global.io.emit('recurso_actualizado', { tipo, ...extra })
}

module.exports = { emitirConfigActualizada, emitirCatalogoActualizado, emitirRecurso }
