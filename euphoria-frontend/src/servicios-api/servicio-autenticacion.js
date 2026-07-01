// ============================================
// EUPHORIA — Servicio de Autenticación (Frontend)
// Conecta el login con el backend real
// ============================================
import api from './cliente-http.js'

export const servicioAuth = {
  /**
   * Iniciar sesión con correo y contraseña
   * @returns { token, refresh, usuario }
   */
  async login(correo, password) {
    return api.post('/auth/login', { correo, password })
  },
  
  async registro(datos) {
    return api.post('/auth/registro', datos)
  },

  /**
   * Renovar el token de acceso con el refresh token
   */
  async renovar(refresh) {
    return api.post('/auth/renovar', { refresh })
  },
}
