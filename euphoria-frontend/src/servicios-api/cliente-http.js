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
  return config
}, error => Promise.reject(error))

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

    return Promise.reject(error.response?.data || error)
  }
)

export default api
