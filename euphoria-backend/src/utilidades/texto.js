// ============================================
// EUPHORIA — Utilidades de Texto
// Helpers compartidos para manipulación de strings
// ============================================

/**
 * Normaliza un texto: quita espacios, convierte a minúsculas y elimina acentos.
 * Usar para comparar respuestas de seguridad de forma tolerante.
 * @param {string} texto
 * @returns {string}
 */
function normalizarRespuesta(texto) {
  if (!texto) return ''
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
}

module.exports = { normalizarRespuesta }
