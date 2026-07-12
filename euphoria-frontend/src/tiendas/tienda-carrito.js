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
          stock: Number.isFinite(parseInt(item.stock)) ? parseInt(item.stock) : null,
          // Los combos guardan su composición (2-3 fotos solapadas, como su tarjeta)
          imagenes: Array.isArray(item.imagenes) && item.imagenes.length
            ? item.imagenes.filter(Boolean)
            : (item.imagen ? [item.imagen] : [])
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
      // imagenes_combo: composición del combo (hasta 3 fotos) para mostrarlo
      // en el carrito igual que en su tarjeta; productos simples llevan 1 foto.
      const imagenes = (Array.isArray(producto.imagenes_combo) && producto.imagenes_combo.length)
        ? producto.imagenes_combo.filter(Boolean).slice(0, 3)
        : (producto.url_imagen ? [producto.url_imagen] : [])
      items.value.push({
        id: producto.id_producto,
        nombre: producto.nombre_producto,
        precio: enPromo ? precioPromo : precioBase,
        cantidad: 1,
        stock: stockActual,
        imagen: imagenes[0] || '',
        imagenes,
        // Marca de combo/pack sugerido por la IA: el backend aplica el % de
        // descuento del config a estos ítems (validado en el servidor).
        combo: !!producto.combo
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

  // Sincroniza los precios/stock del carrito con el catálogo VIGENTE (el backend
  // cobra siempre el precio actual de la BD; así lo mostrado nunca difiere del cobro).
  // Devuelve true si algún precio cambió.
  function actualizarPrecios(productosVigentes) {
    let cambio = false
    for (const item of items.value) {
      const p = (productosVigentes || []).find(x => x.id_producto === item.id)
      if (!p) continue
      const precioVigente = (p.estado_promocion && parseFloat(p.precio_promocion) > 0)
        ? parseFloat(p.precio_promocion)
        : parseFloat(p.precio_base)
      if (Number.isFinite(precioVigente) && precioVigente !== item.precio) {
        item.precio = precioVigente
        cambio = true
      }
      const stockVigente = parseInt(p.stock_actual)
      if (Number.isFinite(stockVigente)) {
        item.stock = stockVigente
        if (item.cantidad > stockVigente) { item.cantidad = Math.max(1, stockVigente); cambio = true }
      }
    }
    if (cambio) guardarCarrito()
    return cambio
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
    actualizarPrecios,
    subtotal,
    total,
    totalItems
  }
})
