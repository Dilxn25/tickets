// ============================================
// EUPHORIA — Utilidades para QR
// Generación de IDs únicos numéricos
// ============================================

// Contador interno para IDs (en producción usar BD)
let contadorID = 1000000

/**
 * Genera un ID único numérico
 * Formato: 7 dígitos (ej: 1000001)
 */
function generarIDUnico() {
  contadorID++
  return contadorID
}

/**
 * Genera datos para un QR de recarga
 * @param {Object} datos - { id_recarga, monto, tipo, usuario, pin }
 */
function generarQRRecarga(datos) {
  return {
    id_recarga: datos.id_recarga,
    id_unico: datos.id_unico,
    tipo: datos.tipo || 'sin_pin', // 'con_pin' o 'sin_pin'
    monto: datos.monto,
    usuario: datos.usuario,
    pin: datos.pin || null,
    fecha_creacion: new Date().toISOString(),
    descripcion: `Recarga de Billetera Euphoria: Bs. ${datos.monto}`
  }
}

/**
 * Valida un código PIN
 */
function validarPIN(pin, esperado) {
  return pin === esperado
}

module.exports = {
  generarIDUnico,
  generarQRRecarga,
  validarPIN
}
