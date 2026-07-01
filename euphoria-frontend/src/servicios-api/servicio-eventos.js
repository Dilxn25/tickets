// ============================================
// EUPHORIA — Servicio de Eventos (Frontend)
// Conecta el cliente y admin con la API
// ============================================
import api from './cliente-http.js'

export const servicioEventos = {
  // ---- Para Administradores ----
  listarTodos() { return api.get('/eventos') },
  
  crear(formData) { 
    return api.post('/eventos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }) 
  },
  
  editar(id, formData) { 
    return api.put(`/eventos/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }) 
  },
  
  cambiarEstado(id, estado) { 
    return api.patch(`/eventos/${id}/estado`, { estado }) 
  },

  // ---- Para Clientes y Público ----
  listarDisponibles() { return api.get('/eventos/disponibles') },
  obtenerDisponible(id) { return api.get(`/eventos/disponibles/${id}`) },
  reservarEspacio(datos) { return api.post('/eventos/reservar', datos) }
}
