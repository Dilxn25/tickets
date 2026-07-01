// ============================================
// EUPHORIA — Servicio de Comandas (Mesero/Barra)
// ============================================
import api from './cliente-http.js'

export const servicioComandas = {
  async crear(datos) {
    // datos incluye: productos (id, cantidad, subtotal), metodo_pago, qr_billetera, pin, comprobante (si es file), monto_recibido, cambio
    const form = new FormData()
    form.append('productos', JSON.stringify(datos.productos))
    form.append('metodo_pago', datos.metodo_pago)
    
    if (datos.qr_billetera) form.append('qr_billetera', datos.qr_billetera)
    if (datos.pin) form.append('pin', datos.pin)
    if (datos.monto_recibido) form.append('monto_recibido', datos.monto_recibido)
    if (datos.cambio_dado) form.append('cambio_dado', datos.cambio_dado)
    if (datos.comprobante) form.append('comprobante', datos.comprobante)
    if (datos.url_comprobante_ya_subido) form.append('url_comprobante_ya_subido', datos.url_comprobante_ya_subido)
    if (datos.id_cliente) form.append('id_cliente', datos.id_cliente)
    if (datos.id_mesa) form.append('id_mesa', datos.id_mesa)

    return api.post('/comandas/crear', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  async listarPendientes() {
    return api.get('/comandas/pendientes')
  },
  
  async listarTodas(filtros = {}) {
    const params = new URLSearchParams()
    if (filtros.fecha) params.append('fecha', filtros.fecha)
    return api.get(`/comandas?${params.toString()}`)
  },
  
  async cambiarEstado(id, estado) {
    return api.patch(`/comandas/${id}/estado`, { estado })
  }
}
