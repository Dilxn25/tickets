// ============================================
// EUPHORIA — Servicio de Productos (Frontend)
// ============================================
import api from './cliente-http.js'

export const servicioProductos = {
  listar(params = {}) { 
    return api.get('/productos', { params }) 
  },
  
  obtener(id) { 
    return api.get(`/productos/${id}`) 
  },
  
  // Categorías
  obtenerCategorias() { return api.get('/productos/categorias') },
  crearCategoria(datos) { return api.post('/productos/categorias', datos) },
  editarCategoria(id, datos) { return api.put(`/productos/categorias/${id}`, datos) },
  eliminarCategoria(id) { return api.delete(`/productos/categorias/${id}`) },
  
  // Para enviar imágenes usamos FormData en lugar de JSON
  crear(datosFormulario) { 
    return api.post('/productos', datosFormulario, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  editar(id, datosFormulario) { 
    return api.put(`/productos/${id}`, datosFormulario, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  cambiarPromo(id) { 
    return api.patch(`/productos/${id}/promo`) 
  },
  
  eliminar(id) { 
    return api.delete(`/productos/${id}`) 
  }
}
