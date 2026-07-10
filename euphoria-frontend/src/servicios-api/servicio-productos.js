// ============================================
// EUPHORIA — Servicio de Productos (Frontend)
// ============================================
import api from './cliente-http.js'

// ---- Caché corto del catálogo completo ----
// Muchas vistas (Inicio, Catálogo, mesero, cajero) piden `listar()` sin filtros
// al montar. Si el usuario navega entre pantallas, se repetía la MISMA llamada
// una y otra vez. Guardamos el resultado por un tiempo breve para no repetirla,
// pero lo invalidamos apenas cambia el catálogo (mutaciones o aviso del admin)
// para no mostrar datos viejos.
let _cacheCatalogo = null     // último resultado (array de productos)
let _cacheVence = 0           // marca de tiempo (ms) en que expira el caché
let _promesaCatalogo = null   // llamada en vuelo: evita que varias vistas disparen la misma
const TTL_CATALOGO = 20000    // 20 s: suficiente para navegar sin re-pedir; corto para no quedar desactualizado

function invalidarCatalogo() {
  _cacheCatalogo = null
  _cacheVence = 0
  _promesaCatalogo = null
}

export const servicioProductos = {
  listar(params = {}) {
    // Solo cacheamos el catálogo COMPLETO (sin filtros). Con params se pide fresco.
    const sinFiltros = !params || Object.keys(params).length === 0
    if (!sinFiltros) return api.get('/productos', { params })

    // Caché fresco → se devuelve al instante, sin tocar el servidor.
    if (_cacheCatalogo && Date.now() < _cacheVence) return Promise.resolve(_cacheCatalogo)
    // Ya hay una petición en curso → se reusa (no se dispara otra en paralelo).
    if (_promesaCatalogo) return _promesaCatalogo

    _promesaCatalogo = api.get('/productos')
      .then(data => {
        _cacheCatalogo = data
        _cacheVence = Date.now() + TTL_CATALOGO
        _promesaCatalogo = null
        return data
      })
      .catch(err => { _promesaCatalogo = null; throw err })
    return _promesaCatalogo
  },

  // Permite a las vistas forzar datos frescos (ej. al recibir el aviso
  // 'catalogo_actualizado' por socket, o tras editar como admin).
  invalidarCatalogo,

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
    invalidarCatalogo()
    return api.post('/productos', datosFormulario, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  editar(id, datosFormulario) {
    invalidarCatalogo()
    return api.put(`/productos/${id}`, datosFormulario, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  cambiarPromo(id) {
    invalidarCatalogo()
    return api.patch(`/productos/${id}/promo`)
  },

  eliminar(id) {
    invalidarCatalogo()
    return api.delete(`/productos/${id}`)
  }
}
