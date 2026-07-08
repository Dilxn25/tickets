// ============================================
// EUPHORIA — Servicio de Billetera Digital
// ============================================
import api from './cliente-http.js'

export const servicioBilletera = {
  /**
   * Obtener saldo actual
   */
  async obtenerSaldo() {
    return api.get('/billetera/saldo')
  },

  /**
   * Actualizar PIN transaccional
   */
  async actualizarPin(nuevo_pin, pin_actual) {
    return api.post('/billetera/pin', { nuevo_pin, ...(pin_actual ? { pin_actual } : {}) })
  },

  /**
   * Iniciar una recarga de billetera
   * @param {number} monto - Monto a recargar
   * @param {string} comprobante_url - URL del comprobante extraído con OCR
   */
  async iniciarRecarga(monto, comprobante_url) {
    return api.post('/billetera/recargar', { monto, comprobante_url })
  },

  /**
   * Confirmar recarga con comprobante OCR
   * @param {number} id_recarga - ID de la recarga
   * @param {string} numero_transaccion - Número de transacción del comprobante
   * @param {number} id_unico_qr - ID único del QR usado
   */
  async confirmarRecarga(id_recarga, numero_transaccion, id_unico_qr) {
    return api.post('/billetera/confirmar-recarga', {
      id_recarga,
      numero_transaccion,
      id_unico_qr
    })
  },

  /**
   * Obtener historial de recargas
   */
  async obtenerHistorial() {
    return api.get('/billetera/historial')
  },

  /**
   * Movimientos unificados (recargas + consumos + reservas), más recientes primero
   */
  async obtenerMovimientos() {
    return api.get('/billetera/movimientos')
  },

  /**
   * Detalle de un consumo: productos, precios y quién atendió
   */
  async detalleConsumo(id_comanda) {
    return api.get(`/billetera/movimientos/comanda/${id_comanda}`)
  },

  /**
   * Config del premio por perfil completo (% y tope) para el estimado del carrito
   */
  async obtenerConfigPremio() {
    return api.get('/billetera/config-premio')
  },

  /**
   * "Ojito": revela el PIN del dueño confirmando su contraseña de cuenta.
   * La respuesta trae un ticket de 5 minutos: mientras viva, se puede volver
   * a llamar con { ticket } (sin contraseña) aunque el usuario haya navegado.
   */
  async revelarPin({ password, ticket } = {}) {
    return api.post('/billetera/pin/revelar', ticket ? { ticket } : { password })
  },

  /**
   * Generar QRs de pago (Público y Privado)
   */
  async generarQRsPago() {
    return api.get('/billetera/qrs-pago')
  }
}
