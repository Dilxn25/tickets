import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTiendaAutenticacion = defineStore('autenticacion', () => {
  let initialUser = null
  try {
    const stored = localStorage.getItem('euphoria_usuario')
    initialUser = stored && stored !== 'undefined' ? JSON.parse(stored) : null
  } catch (e) {
    localStorage.removeItem('euphoria_usuario')
  }
  
  const usuario  = ref(initialUser)
  const token    = ref(localStorage.getItem('euphoria_token') || null)

  const estaAutenticado = computed(() => !!token.value)

  const rolRuta = computed(() => {
    const mapa = {
      'Administrador': 'administrador',
      'Cajero':        'cajero',
      'Mesero':        'mesero',
      'Recepcionista': 'recepcionista',
      'Bartender':     'bartender',
      'Cliente':       'cliente',
    }
    return mapa[usuario.value?.rol] || 'login'
  })

  function iniciarSesion(datos) {
    usuario.value = datos.usuario
    token.value   = datos.token
    localStorage.setItem('euphoria_usuario', JSON.stringify(datos.usuario))
    localStorage.setItem('euphoria_token',   datos.token)
  }

  function cerrarSesion() {
    usuario.value = null
    token.value   = null
    localStorage.removeItem('euphoria_usuario')
    localStorage.removeItem('euphoria_token')
  }

  return { usuario, token, estaAutenticado, rolRuta, iniciarSesion, cerrarSesion }
})
