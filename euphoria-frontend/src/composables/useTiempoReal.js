// EUPHORIA — Suscripción sencilla a cambios en tiempo real.
// Uso en cualquier vista:
//   import { useTiempoReal } from '@/composables/useTiempoReal'
//   useTiempoReal(['usuarios', 'eventos'], (tipo, datos) => recargar())
// Se conecta al montar y se desconecta solo al desmontar la vista.
import { onMounted, onBeforeUnmount } from 'vue'
import { io } from 'socket.io-client'

export function useTiempoReal(tipos, callback) {
  let socket = null
  const lista = Array.isArray(tipos) ? tipos : [tipos]

  onMounted(() => {
    socket = io({ path: '/socket.io' })
    socket.on('recurso_actualizado', (data) => {
      if (data && lista.includes(data.tipo)) callback(data.tipo, data)
    })
  })
  onBeforeUnmount(() => { if (socket) { socket.disconnect(); socket = null } })
}
