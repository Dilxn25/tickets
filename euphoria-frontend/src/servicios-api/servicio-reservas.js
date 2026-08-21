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

  /** Entrada de pie tocando un área/pista del mapa (zona mixta) */
  async comprarPie(id_mesa, pin) {
    return api.post('/reservas/pie', { id_mesa, pin })
  },

  /** Reservas del cliente con su QR */
  async misReservas() {
    return api.get('/reservas/mias')
  },

  // ---- Combo de cortesía por reserva ----
  /** Cortesías del cliente (pendientes y elegidas) + los combos para elegir */
  async misCortesias() {
    return api.get('/reservas/cortesias')
  },

  /** Elegir el combo de regalo de una reserva (crea el pedido a Bs 0 para la barra) */
  async elegirCortesia(idCortesia, idProducto) {
    return api.post(`/reservas/cortesias/${idCortesia}/elegir`, { id_producto: idProducto })
  },

  /** Cancelar una reserva (devuelve a billetera según la regla de 24 h) */
  async cancelarReserva(idEntrada, opciones = {}) {
    // opciones.cancelar_pedidos = true → "Cancelar todo" (devuelve pedidos + reserva)
    return api.post(`/reservas/${idEntrada}/cancelar`, opciones)
  },

  // ---- Recepción: reservas gestionadas para grupos grandes ----
  /** Buscar un cliente por nombre/correo/CI (solo recepción/admin) */
  async buscarCliente(q) {
    return api.get('/reservas/buscar-cliente', { params: { q } })
  },

  /** Asignar una mesa a un cliente sin el tope de autoservicio (recepción/admin) */
  async reservaGestionada({ id_cliente, id_mesa, metodo_pago }) {
    return api.post('/reservas/gestionada', { id_cliente, id_mesa, metodo_pago })
  },

  // ---- Solicitudes de grupo grande (cliente) ----
  /** El cliente envía una solicitud de grupo grande con lugares tentativos */
  async solicitarGrupo({ id_evento, cantidad_personas, motivo, mesas_tentativas }) {
    return api.post('/reservas/solicitudes-grupo', { id_evento, cantidad_personas, motivo, mesas_tentativas })
  },

  /** Solicitudes de grupo del propio cliente (para ver su estado) */
  async misSolicitudesGrupo() {
    return api.get('/reservas/mis-solicitudes-grupo')
  },

  /** Eventos donde el cliente ya ingresó (gate del carrito + elegir evento del pedido) */
  async misIngresos() {
    return api.get('/reservas/mis-ingresos')
  },

  /** El cliente responde a la contrapropuesta de recepción (acepta/rechaza) */
  async responderPropuestaGrupo(idSolicitud, acepta) {
    return api.post(`/reservas/solicitudes-grupo/${idSolicitud}/responder`, { acepta })
  },

  // ---- Recepción: gestión de solicitudes de grupo ----
  async solicitudesGrupo() {
    return api.get('/reservas/solicitudes-grupo')
  },
  async confirmarSolicitudGrupo(idSolicitud) {
    return api.post(`/reservas/solicitudes-grupo/${idSolicitud}/confirmar`, {})
  },
  async proponerSolicitudGrupo(idSolicitud, mesas) {
    return api.post(`/reservas/solicitudes-grupo/${idSolicitud}/proponer`, { mesas })
  },
}
