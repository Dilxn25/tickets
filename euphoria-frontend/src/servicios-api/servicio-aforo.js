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

  /** Validar/consultar el ingreso. { token|codigo, consultar?, cantidad? }
   *  consultar:true → solo devuelve el estado (cupos) sin admitir a nadie.
   *  cantidad → personas que ingresan en esta tanda (QR multi-uso). */
  async validar({ token, codigo, consultar, cantidad }) {
    return api.post('/aforo/validar', { token, codigo, consultar, cantidad })
  },

  /** Registrar la salida (libera aforo) */
  async salida({ token, codigo, id_entrada }) {
    return api.post('/aforo/salida', { token, codigo, id_entrada })
  },
}
