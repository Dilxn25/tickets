// ============================================
// EUPHORIA — Servicio de Aforo en Tiempo Real (Fase C)
// ============================================
import api from './cliente-http.js'

export const servicioAforo = {
  /** Eventos que tienen zonas (para elegir cuál monitorear) */
  async listarEventos() {
    return api.get('/aforo/eventos')
  },

  /** Aforo en vivo de todas las zonas de un evento */
  async obtenerAforoEvento(idEvento) {
    return api.get(`/aforo/evento/${idEvento}`)
  },

  /** Validar el ingreso escaneando el QR (token firmado) o un código manual */
  async validar({ token, codigo }) {
    return api.post('/aforo/validar', { token, codigo })
  },

  /** Registrar la salida (libera aforo) */
  async salida({ token, codigo, id_entrada }) {
    return api.post('/aforo/salida', { token, codigo, id_entrada })
  },
}
