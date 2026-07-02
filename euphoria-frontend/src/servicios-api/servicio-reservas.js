// ============================================
// EUPHORIA — Servicio de Reservas (Fase B)
// El cliente ve el mapa de un evento y reserva una mesa pagando con billetera.
// ============================================
import api from './cliente-http.js'

export const servicioReservas = {
  /** Eventos con mesas reservables (incluye conteo de mesas libres/totales) */
  async listarEventos() {
    return api.get('/reservas/eventos')
  },

  /** Zonas de un evento con su mapa (elementos) para elegir mesa */
  async obtenerMapaEvento(idEvento) {
    return api.get(`/reservas/eventos/${idEvento}/zonas`)
  },

  /**
   * Reservar una mesa y pagar con billetera.
   * @param {number} id_mesa
   * @param {number} cantidad_personas
   * @param {string} [pin] - solo si la billetera tiene PIN configurado
   */
  async reservarMesa(id_mesa, cantidad_personas, pin) {
    return api.post('/reservas/mesa', { id_mesa, cantidad_personas, pin })
  },

  /**
   * Comprar una entrada general / de pie (campo) en una zona general.
   * @param {number} id_zona
   * @param {string} [pin] - solo si la billetera tiene PIN configurado
   */
  async comprarCampo(id_zona, pin) {
    return api.post('/reservas/campo', { id_zona, pin })
  },

  /** Reservas del cliente con su QR */
  async misReservas() {
    return api.get('/reservas/mias')
  },
}
