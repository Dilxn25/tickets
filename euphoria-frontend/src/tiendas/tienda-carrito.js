import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Clave única de LÍNEA del carrito: el mismo producto puede estar dos veces
// (a precio normal y como parte de un combo con descuento, o como cortesía).
// Cada variante es una línea separada; el 'id' se conserva para el backend.
function claveLinea(id, combo, cortesia) {
  return `${id}${combo ? '-c' : ''}${cortesia ? '-g' : ''}`
}

export const useTiendaCarrito = defineStore('carrito', () => {
  let carritoInicial = []
  try {
    const dataStr = localStorage.getItem('euphoria_carrito')
    if (dataStr) {
      const parsed = JSON.parse(dataStr)
      if (Array.isArray(parsed)) {
        // Sanitizar datos antiguos para evitar crashes en .toFixed()
        carritoInicial = parsed.map(item => {
          const combo = item.combo === true
          const cortesia = item.cortesia === true
          return {
            ...item,
            // Las cortesías son regalo del local: precio 0 y 1 unidad, siempre
            precio: cortesia ? 0 : (parseFloat(item.precio) || 0),
            cantidad: cortesia ? 1 : (parseInt(item.cantidad) || 1),
            stock: Number.isFinite(parseInt(item.stock)) ? parseInt(item.stock) : null,
            combo,
            cortesia,
            linea: claveLinea(item.id, combo, cortesia),
            // Los combos guardan su composición (2-3 fotos solapadas, como su tarjeta)
            imagenes: Array.isArray(item.imagenes) && item.imagenes.length
              ? item.imagenes.filter(Boolean)
              : (item.imagen ? [item.imagen] : [])
          }
        })
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

  // Encuentra la línea a la que apunta una clave. Acepta la clave 'linea'
  // (id + flags) o, por retrocompatibilidad, un id de producto a secas: en ese
  // caso gana la línea sin flags de ese id y, si no existe, la primera del id
  // (así las vistas que aún pasan solo el id no se rompen).
  function buscarLinea(clave) {
    return items.value.find(i => i.linea === clave)
      || items.value.find(i => i.id === clave && !i.combo && !i.cortesia)
      || items.value.find(i => i.id === clave)
  }

  function agregarItem(producto) {
    const esCombo = producto.combo === true
    const esCortesia = producto.cortesia === true
    // Misma línea = mismo producto CON los mismos flags; el mismo producto a
    // precio normal y como combo/cortesía viven en líneas separadas (antes se
    // fusionaban por id y el combo heredaba el precio viejo sin descuento).
    const linea = claveLinea(producto.id_producto, esCombo, esCortesia)
    const itemExistente = items.value.find(i => i.linea === linea)
    const stockActual = Number.isFinite(parseInt(producto.stock_actual))
      ? parseInt(producto.stock_actual)
      : null

    if (itemExistente) {
      // Mantener el stock más reciente conocido
      if (stockActual !== null) {
        itemExistente.stock = stockActual
      }
      // Las cortesías son SIEMPRE 1 unidad: reagregarla no suma cantidad
      if (esCortesia) {
        guardarCarrito()
        return { ok: true }
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
        linea,
        nombre: producto.nombre_producto,
        // Cortesía: regalo del local, va a 0 y en una línea propia
        precio: esCortesia ? 0 : (enPromo ? precioPromo : precioBase),
        cantidad: 1,
        stock: stockActual,
        imagen: imagenes[0] || '',
        imagenes,
        // Marca de combo/pack sugerido por la IA: el backend aplica el % de
        // descuento del config a estos ítems (validado en el servidor).
        combo: esCombo,
        cortesia: esCortesia
      })
    }
    guardarCarrito()
    return { ok: true }
  }

  // Recibe la clave 'linea' (o un id, por retrocompatibilidad)
  function aumentarCantidad(clave) {
    const item = buscarLinea(clave)
    if (item) {
      // Las cortesías van de a una: no se puede aumentar la cantidad
      if (item.cortesia) {
        return { ok: false, mensaje: 'La cortesía es una por pedido' }
      }
      if (item.stock !== null && item.stock !== undefined && item.cantidad >= item.stock) {
        return { ok: false, mensaje: `Máximo disponible: ${item.stock}` }
      }
      item.cantidad++
      guardarCarrito()
      return { ok: true }
    }
    return { ok: false }
  }

  function disminuirCantidad(clave) {
    const item = buscarLinea(clave)
    if (item && item.cantidad > 1) {
      item.cantidad--
      guardarCarrito()
    }
  }

  function eliminarItem(clave) {
    const item = buscarLinea(clave)
    if (!item) return
    // Se elimina SOLO esa línea (el mismo producto puede seguir en otra línea
    // como combo o cortesía)
    items.value = items.value.filter(i => i !== item)
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
      // Las cortesías son regalo del local (precio 0, 1 unidad): nada que sincronizar
      if (item.cortesia) continue
      const p = (productosVigentes || []).find(x => x.id_producto === item.id)
      if (!p) continue
      // Las líneas de combo/pack llevan el precio CON descuento de la sugerencia
      // (el backend lo valida contra el % del config): NO se pisa con el precio
      // de catálogo (antes esto revertía 46.6 -> 55 al entrar al carrito).
      if (!item.combo) {
        const precioVigente = (p.estado_promocion && parseFloat(p.precio_promocion) > 0)
          ? parseFloat(p.precio_promocion)
          : parseFloat(p.precio_base)
        if (Number.isFinite(precioVigente) && precioVigente !== item.precio) {
          item.precio = precioVigente
          cambio = true
        }
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
