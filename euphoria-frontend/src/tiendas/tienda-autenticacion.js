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
  const refresh  = ref(localStorage.getItem('euphoria_refresh') || null)

  const estaAutenticado = computed(() => !!token.value)

  const MAPA_ROLES = {
    'Administrador': 'administrador',
    'Cajero':        'cajero',
    'Mesero':        'mesero',
    'Recepcionista': 'recepcionista',
    'Bartender':     'bartender',
    'Cliente':       'cliente',
  }

  const rolValido = computed(() => !!MAPA_ROLES[usuario.value?.rol])

  const rolRuta = computed(() => MAPA_ROLES[usuario.value?.rol] || null)

  function iniciarSesion(datos) {
    usuario.value = datos.usuario
    token.value   = datos.token
    localStorage.setItem('euphoria_usuario', JSON.stringify(datos.usuario))
    localStorage.setItem('euphoria_token',   datos.token)
    if (datos.refresh) {
      refresh.value = datos.refresh
      localStorage.setItem('euphoria_refresh', datos.refresh)
    }
  }

  function actualizarToken(nuevoToken, nuevoRefresh) {
    token.value = nuevoToken
    localStorage.setItem('euphoria_token', nuevoToken)
    if (nuevoRefresh !== undefined && nuevoRefresh !== null) {
      refresh.value = nuevoRefresh
      localStorage.setItem('euphoria_refresh', nuevoRefresh)
    }
  }

  function cerrarSesion() {
    usuario.value = null
    token.value   = null
    refresh.value = null
    localStorage.removeItem('euphoria_usuario')
    localStorage.removeItem('euphoria_token')
    localStorage.removeItem('euphoria_refresh')
  }

  return { usuario, token, refresh, estaAutenticado, rolValido, rolRuta, iniciarSesion, actualizarToken, cerrarSesion }
})
