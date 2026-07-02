import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTiendaCarrito = defineStore('carrito', () => {
  let carritoInicial = []
  try {
    const dataStr = localStorage.getItem('euphoria_carrito')
    if (dataStr) {
      const parsed = JSON.parse(dataStr)
      if (Array.isArray(parsed)) {
        // Sanitizar datos antiguos para evitar crashes en .toFixed()
        carritoInicial = parsed.map(item => ({
          ...item,
          precio: parseFloat(item.precio) || 0,
          cantidad: parseInt(item.cantidad) || 1,
          stock: Number.isFinite(parseInt(item.stock)) ? parseInt(item.stock) : null
        }))
      } else {
        localStorage.removeItem('euphoria_carrito')
      }
    }
  } catch (e) {
    console.warn('Error leyendo carrito de localstorage', e)
    localStorage.removeItem('euphoria_carrito')
  }

  const items = ref(carritoInicial)
  const eventoActivoId = ref(localStorage.getItem('euphoria_evento_activo') || null)

  function guardarCarrito() {
    localStorage.setItem('euphoria_carrito', JSON.stringify(items.value))
    if (eventoActivoId.value) {
      localStorage.setItem('euphoria_evento_activo', eventoActivoId.value)
    } else {
      localStorage.removeItem('euphoria_evento_activo')
    }
  }

  function setEventoActivo(idEvento) {
    // Si cambia de evento, vaciamos el carrito
    if (eventoActivoId.value !== idEvento) {
      items.value = []
    }
    eventoActivoId.value = idEvento
    guardarCarrito()
  }

  function agregarItem(producto) {
    const itemExistente = items.value.find(i => i.id === producto.id_producto)
    const stockActual = Number.isFinite(parseInt(producto.stock_actual))
      ? parseInt(producto.stock_actual)
      : null

    if (itemExistente) {
      // Mantener el stock más reciente conocido
      if (stockActual !== null) {
        itemExistente.stock = stockActual
      }
      if (itemExistente.stock !== null && itemExistente.cantidad >= itemExistente.stock) {
        return { ok: false, mensaje: `Máximo disponible: ${itemExistente.stock}` }
      }
      itemExistente.cantidad++
    } else {
      if (stockActual !== null && stockActual < 1) {
        return { ok: false, mensaje: 'Sin stock disponible' }
      }
      const precioBase = parseFloat(producto.precio_base) || 0
      const precioPromo = parseFloat(producto.precio_promocion) || 0
      // Solo aplicamos el precio de promo si es válido (mayor a 0 y menor al base);
      // si la promo está activa pero sin precio válido, cobramos el base (nunca 0).
      const enPromo = producto.estado_promocion && precioPromo > 0 && precioPromo < precioBase
      items.value.push({
        id: producto.id_producto,
        nombre: producto.nombre_producto,
        precio: enPromo ? precioPromo : precioBase,
        cantidad: 1,
        stock: stockActual,
        imagen: producto.url_imagen || ''
      })
    }
    guardarCarrito()
    return { ok: true }
  }

  function aumentarCantidad(id) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      if (item.stock !== null && item.stock !== undefined && item.cantidad >= item.stock) {
        return { ok: false, mensaje: `Máximo disponible: ${item.stock}` }
      }
      item.cantidad++
      guardarCarrito()
      return { ok: true }
    }
    return { ok: false }
  }

  function disminuirCantidad(id) {
    const item = items.value.find(i => i.id === id)
    if (item && item.cantidad > 1) {
      item.cantidad--
      guardarCarrito()
    }
  }

  function eliminarItem(id) {
    items.value = items.value.filter(i => i.id !== id)
    guardarCarrito()
  }

  function vaciarCarrito() {
    items.value = []
    guardarCarrito()
  }

  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  })

  const total = computed(() => {
    return subtotal.value
  })

  const totalItems = computed(() => {
    return items.value.reduce((sum, item) => sum + item.cantidad, 0)
  })

  return {
    items,
    eventoActivoId,
    setEventoActivo,
    agregarItem,
    aumentarCantidad,
    disminuirCantidad,
    eliminarItem,
    vaciarCarrito,
    subtotal,
    total,
    totalItems
  }
})
