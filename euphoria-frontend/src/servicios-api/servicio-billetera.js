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
  async actualizarPin(nuevo_pin) {
    return api.post('/billetera/pin', { nuevo_pin })
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
   * Generar QRs de pago (Público y Privado)
   */
  async generarQRsPago() {
    return api.get('/billetera/qrs-pago')
  }
}
