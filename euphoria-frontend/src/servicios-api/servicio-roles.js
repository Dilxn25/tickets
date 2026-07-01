import api from './cliente-http.js'

export const servicioRoles = {
  listar() { return api.get('/roles') },
  crear(datos) { return api.post('/roles', datos) },
  editar(id, datos) { return api.put(`/roles/${id}`, datos) },
  eliminar(id) { return api.delete(`/roles/${id}`) }
}
