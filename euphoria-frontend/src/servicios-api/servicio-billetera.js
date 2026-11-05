// ============================================
// EUPHORIA — Servicio de Billetera Digital
// ============================================
import api from './cliente-http.js'
import QRCode from 'qrcode'

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
   * Recargar la billetera con un comprobante ya validado.
   * El monto lo toma el servidor del análisis; si supera el tope de recarga
   * instantánea, la respuesta llega con { pendiente: true }.
   * @param {string} id_analisis - id que devolvió la validación del comprobante
   */
  async iniciarRecarga(id_analisis) {
    return api.post('/billetera/recargar', { id_analisis })
  },

  /**
   * Obtener historial de recargas
   */
  async obtenerHistorial() {
    return api.get('/billetera/historial')
  },

  /**
   * Movimientos unificados (recargas + consumos + reservas), más recientes primero.
   * Con { evento: id } trae solo los de esa noche (ventana horaria del evento).
   */
  async obtenerMovimientos(params = {}) {
    return api.get('/billetera/movimientos', { params })
  },

  /**
   * Eventos a los que ESTE cliente asistió (para el filtro por evento del historial)
   */
  async misEventos() {
    return api.get('/billetera/mis-eventos')
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
   * Generar QRs de pago (Público y Privado).
   * El backend devuelve solo el TOKEN firmado (instantáneo); el QR se DIBUJA
   * aquí, en el celular, con la librería 'qrcode'. Se rellena `imagen` (data URL)
   * para que las vistas la usen igual que antes.
   */
  async generarQRsPago() {
    const res = await api.get('/billetera/qrs-pago')
    for (const clave of ['qr_sin_pin', 'qr_con_pin']) {
      const q = res?.[clave]
      if (q?.token) {
        try {
          q.imagen = await QRCode.toDataURL(q.token, { errorCorrectionLevel: 'H', width: 300, margin: 1 })
        } catch (e) {
          console.error('No se pudo dibujar el QR de pago:', e)
        }
      }
    }
    return res
  }
}
