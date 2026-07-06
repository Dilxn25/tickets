// ============================================
// EUPHORIA — Historial de precios (Fase 8)
// Registro best-effort: si el log falla, la operación principal NUNCA se rompe.
// origen: creacion | edicion | promo_activada | promo_desactivada | combo_ia | registro_inicial
// ============================================
const prisma = require('../config/base-de-datos')

async function registrarPrecio({ idProducto, idUsuario = null, tipo, precioAnterior = null, precioNuevo, origen }) {
  try {
    if (precioNuevo === null || precioNuevo === undefined) return
    await prisma.historial_precio.create({
      data: {
        id_producto:     idProducto,
        id_usuario:      idUsuario,
        tipo,
        precio_anterior: precioAnterior !== null && precioAnterior !== undefined ? parseFloat(precioAnterior) : null,
        precio_nuevo:    parseFloat(precioNuevo),
        origen,
      },
    })
  } catch (e) {
    console.warn('No se pudo registrar el historial de precio:', e.message)
  }
}

// Compara el estado anterior y el nuevo de un producto y registra lo que cambió.
// Devuelve la cantidad de registros creados (útil para pruebas).
async function registrarCambios({ anterior, nuevo, idUsuario, origen = 'edicion' }) {
  let n = 0
  const baseAntes = anterior ? parseFloat(anterior.precio_base) : null
  const baseAhora = parseFloat(nuevo.precio_base)
  if (baseAntes === null || baseAntes !== baseAhora) {
    await registrarPrecio({
      idProducto: nuevo.id_producto, idUsuario, tipo: 'base',
      precioAnterior: baseAntes, precioNuevo: baseAhora,
      origen: baseAntes === null ? 'creacion' : origen,
    })
    n++
  }
  const promoAntes = anterior?.precio_promocion !== null && anterior?.precio_promocion !== undefined
    ? parseFloat(anterior.precio_promocion) : null
  const promoAhora = nuevo.precio_promocion !== null && nuevo.precio_promocion !== undefined
    ? parseFloat(nuevo.precio_promocion) : null
  if (promoAhora !== null && promoAntes !== promoAhora) {
    await registrarPrecio({
      idProducto: nuevo.id_producto, idUsuario, tipo: 'promocion',
      precioAnterior: promoAntes, precioNuevo: promoAhora,
      origen: anterior ? origen : 'creacion',
    })
    n++
  }
  return n
}

module.exports = { registrarPrecio, registrarCambios }
