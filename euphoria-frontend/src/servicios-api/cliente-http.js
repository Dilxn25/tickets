// ============================================
// EUPHORIA — Cliente HTTP para el Backend
// Usa Axios con interceptores para JWT
// ============================================
import axios from 'axios'

const api = axios.create({
  baseURL: '/api', // Usa proxy de Vite o ruta relativa
  timeout: 45000, // Aumentado a 45s para permitir tareas pesadas como OCR
  headers: { 'Content-Type': 'application/json' },
})

// ---- Interceptor de SOLICITUD: añade el token JWT ----
api.interceptors.request.use(config => {
  const token = localStorage.getItem('euphoria_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Si el cuerpo es FormData (subida de archivos), eliminar el Content-Type JSON
  // por defecto para que el navegador ponga 'multipart/form-data' con su boundary.
  // Sin esto, las imágenes (foto de perfil, productos, eventos, comprobantes) no
  // llegan al backend y req.file queda vacío.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
}, error => Promise.reject(error))

// Mensaje de respaldo por código HTTP, para que ninguna falla llegue muda a la vista.
function mensajePorEstado(status) {
  switch (status) {
    case 400: return 'Los datos enviados no son válidos. Revisa el formulario.'
    case 401: return 'Tu sesión venció. Vuelve a iniciar sesión.'
    case 403: return 'No tienes permiso para hacer esto.'
    case 404: return 'No se encontró lo que buscabas.'
    case 409: return 'La operación choca con el estado actual. Actualiza y vuelve a intentar.'
    case 413: return 'El archivo es demasiado pesado.'
    case 422: return 'Hay un dato que no se pudo procesar.'
    case 429: return 'Demasiados intentos seguidos. Espera un momento.'
    case 500: return 'Ocurrió un error en el servidor. Intenta de nuevo en unos segundos.'
    case 502: case 503: case 504: return 'El servidor no responde por ahora. Intenta de nuevo en unos segundos.'
    default: return 'No se pudo completar la operación.'
  }
}

// ---- Interceptor de RESPUESTA: maneja errores globales ----
api.interceptors.response.use(
  response => response.data,
  async error => {
    const original = error.config

    // Si el error es 401 pero NO es la ruta de login, intentar renovar
    if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/login')) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('euphoria_refresh')
        if (!refresh) throw new Error('Sin refresh token')

        const { data } = await axios.post('/api/auth/renovar', { refresh })
        localStorage.setItem('euphoria_token',   data.token)
        localStorage.setItem('euphoria_refresh', data.refresh)
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch (err) {
        localStorage.removeItem('euphoria_token')
        localStorage.removeItem('euphoria_refresh')
        localStorage.removeItem('euphoria_usuario')
        
        // Mensaje personalizado para el usuario expulsado
        const msgExpulsion = err.response?.data?.error || error.response?.data?.error || ''
        if (msgExpulsion.toLowerCase().includes('bloqueada') || msgExpulsion.toLowerCase().includes('inactiva') || msgExpulsion.toLowerCase().includes('inválido')) {
          sessionStorage.setItem('mensaje_expulsion', 'El administrador desactivó su cuenta. Para más información contáctese con el administrador.')
        }

        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(error.response?.data || error)
      }
    }

    // Se adjunta el status HTTP al objeto rechazado: las vistas pueden distinguir
    // 409 (conflicto: mesa tomada), 400, etc. sin depender de err.response
    const data = error.response?.data
    if (data && typeof data === 'object') {
      data.__status = error.response.status
      // Toda respuesta fallida llega a la vista con un `error` legible: si el
      // servidor no mandó texto, se pone uno según el código.
      if (!data.error) data.error = mensajePorEstado(error.response.status)
      return Promise.reject(data)
    }
    // Sin respuesta (servidor caído, sin internet, tiempo agotado): nunca se
    // rechaza con un objeto mudo; la vista siempre tiene algo que mostrar.
    const sinRed = error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response
    return Promise.reject({
      error: sinRed
        ? 'No hay conexión con el servidor. Revisa tu internet y vuelve a intentar.'
        : mensajePorEstado(error.response?.status),
      __status: error.response?.status ?? 0,
      __sin_red: sinRed,
    })
  }
)

export default api
