// Icono de respaldo para productos sin foto: se deduce de la categoría y del nombre.
// Devuelve el contenido interno de un <svg viewBox="0 0 24 24"> (paths sueltos).
const ICONOS = {
  cerveza: '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1-.14-5A3.5 3.5 0 0 1 8.5 2a3.5 3.5 0 0 1 3 1.5A3.5 3.5 0 0 1 18 5.5a2.5 2.5 0 0 1-.5 4.96"/>',
  botella: '<path d="M10 2h4"/><path d="M10 2v3.5a3 3 0 0 1-.6 1.8l-1.2 1.6A5 5 0 0 0 7 12v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8a5 5 0 0 0-1.2-3.1l-1.2-1.6a3 3 0 0 1-.6-1.8V2"/><path d="M7 14h10"/>',
  copa: '<path d="M8 22h8"/><path d="M12 15v7"/><path d="M4 3h16l-8 9z"/>',
  lata: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M7 8h10"/><path d="M7 16h10"/>',
  snack: '<path d="M6 2h12l1 6-2 14H7L5 8z"/><path d="M9 10h6"/><path d="M9 14h6"/>',
  caja: '<rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 7V4h6v3"/><path d="M9 12h6"/>',
  combo: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  hielo: '<path d="M12 2v20"/><path d="M2 12h20"/><path d="m5 5 14 14"/><path d="m19 5-14 14"/>',
}

export function iconoProducto(nombre = '', categoria = '') {
  const t = `${categoria} ${nombre}`.toLowerCase()
  if (/hielo/.test(t)) return ICONOS.hielo
  if (/cerveza|pacen|corona|stella|huari|pilsen/.test(t)) return ICONOS.cerveza
  if (/whisky|ron\b|vodka|tequila|licor|vino|singani|fernet|gin|abuelo|lengua/.test(t)) return ICONOS.botella
  if (/cóctel|coctel|mojito|colada|caipir|sunrise|tonic/.test(t)) return ICONOS.copa
  if (/snack|papas|frit|chips|maní|mani\b/.test(t)) return ICONOS.snack
  if (/cigarr|marlboro|camel|lucky/.test(t)) return ICONOS.caja
  if (/combo|pack/.test(t)) return ICONOS.combo
  if (/sin alcohol|bebida|gaseosa|agua|coca|sprite|pepsi|redbull|energy/.test(t)) return ICONOS.lata
  return ICONOS.copa
}
