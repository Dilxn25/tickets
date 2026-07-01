// ============================================
// EUPHORIA — Servicio de Usuarios (Frontend)
// CRUD completo conectado al backend
// ============================================
import api from './cliente-http.js'

export const servicioUsuarios = {
  listar(params = {})         { return api.get('/usuarios', { params }) },
  obtener(id)                 { return api.get(`/usuarios/${id}`) },
  crear(datos)                { return api.post('/usuarios', datos) },
  editar(id, datos)           { return api.put(`/usuarios/${id}`, datos) },
  cambiarEstado(id, estado)   { return api.patch(`/usuarios/${id}/estado`, { estado_cuenta: estado }) },
  resetearPassword(id)        { return api.patch(`/usuarios/${id}/reset-password`) },
}
