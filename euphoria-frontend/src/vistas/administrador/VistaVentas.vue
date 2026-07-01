<template>
  <div class="vista-ventas fade-in">
    <div class="vista-cabecera">
      <div>
        <h2 class="vista-titulo">Gestión de Ventas</h2>
        <p class="vista-subtitulo">Monitorea todas las comandas, transacciones y comprobantes de pago</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <span v-if="actualizando" style="font-size: 0.85rem; color: var(--texto-secundario);">Actualizando...</span>
        <button v-if="ventaSeleccionada" class="btn btn-secundario" @click="ventaSeleccionada = null">Cerrar</button>
      </div>
    </div>

    <!-- Si no hay venta seleccionada, mostrar tabla -->
    <template v-if="!ventaSeleccionada">
      <div class="filtros-barra">
        <input v-model="busqueda" class="campo" placeholder="Buscar por cliente, comanda..." style="max-width:300px" />
        <select v-model="filtroEstado" class="campo" style="max-width:180px">
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendientes</option>
          <option value="Preparando">Preparando</option>
          <option value="Listo">Listos</option>
          <option value="Completada">Completadas</option>
          <option value="Cancelada">Canceladas</option>
        </select>
        <input v-model="filtroFecha" type="date" class="campo" style="max-width:180px" />
      </div>

      <div class="tarjeta tabla-wrapper">
        <div v-if="cargando" style="padding: 2rem; text-align: center; color: var(--texto-secundario);">
          Cargando ventas...
        </div>
        <table v-else class="tabla">
          <thead><tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Atendido Por</th>
            <th>Monto</th>
            <th>Pago</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            <tr v-if="!ventasFiltradas.length">
              <td colspan="8" class="celda-vacia">Sin resultados</td>
            </tr>
            <tr v-for="venta in ventasFiltradas" :key="venta.id_comanda" class="fila-tabla">
              <td class="texto-fuerte">#{{ venta.id_comanda }}</td>
              <td class="texto-sec">{{ venta.cliente_nombre }}</td>
              <td class="texto-sec">{{ venta.mesero_nombre }}</td>
              <td><span class="badge badge-exito">Bs. {{ venta.monto_total.toFixed(2) }}</span></td>
              <td><span class="badge" :class="getBadgeClasePago(venta.metodo_pago)">{{ venta.metodo_pago }}</span></td>
              <td><span class="badge" :class="getBadgeClaseEstado(venta.estado)">{{ venta.estado }}</span></td>
              <td class="texto-sec">{{ formatearFecha(venta.fecha_comanda) }}</td>
              <td>
                <div class="acciones">
                  <button class="btn btn-sm btn-primario" @click="abrirDetalle(venta)">Ver</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Detalle de venta -->
    <template v-else>
      <div class="tarjeta detalle-venta fade-in">
        <div class="detalle-cabecera">
          <div>
            <h3>Comanda #{{ ventaSeleccionada.id_comanda }}</h3>
            <p class="texto-sec">{{ formatearFechaCompleta(ventaSeleccionada.fecha_comanda) }}</p>
          </div>
          <span :class="getBadgeClaseEstado(ventaSeleccionada.estado)" class="badge badge-grande">
            {{ ventaSeleccionada.estado }}
          </span>
        </div>

        <div class="detalle-grid">
          <!-- Información de la Comanda -->
          <div class="detalle-seccion">
            <h4 class="seccion-titulo">Información de Comanda</h4>
            <div class="campo-detalle">
              <span class="etiqueta">ID Comanda:</span>
              <span class="valor código">#{{ ventaSeleccionada.id_comanda }}</span>
            </div>
            <div class="campo-detalle">
              <span class="etiqueta">Fecha/Hora:</span>
              <span class="valor">{{ formatearFechaCompleta(ventaSeleccionada.fecha_comanda) }}</span>
            </div>
            <div class="campo-detalle">
              <span class="etiqueta">Estado:</span>
              <span class="valor badge" :class="getBadgeClaseEstado(ventaSeleccionada.estado)">{{ ventaSeleccionada.estado }}</span>
            </div>
          </div>

          <!-- Información del Cliente -->
          <div class="detalle-seccion">
            <h4 class="seccion-titulo">Cliente (Quién pidió)</h4>
            <div class="campo-detalle">
              <span class="etiqueta">Nombre:</span>
              <span class="valor">{{ ventaSeleccionada.cliente_nombre }}</span>
            </div>
            <div v-if="ventaSeleccionada.cliente_id" class="campo-detalle">
              <span class="etiqueta">ID Cliente:</span>
              <span class="valor código">#{{ ventaSeleccionada.cliente_id }}</span>
            </div>
          </div>

          <!-- Información del Mesero -->
          <div class="detalle-seccion">
            <h4 class="seccion-titulo">Atendido Por (Mesero/Personal)</h4>
            <div class="campo-detalle">
              <span class="etiqueta">Nombre:</span>
              <span class="valor">{{ ventaSeleccionada.mesero_nombre }}</span>
            </div>
            <div class="campo-detalle">
              <span class="etiqueta">ID Personal:</span>
              <span class="valor código">#{{ ventaSeleccionada.mesero_id }}</span>
            </div>
          </div>

          <!-- Información del Pago -->
          <div class="detalle-seccion">
            <h4 class="seccion-titulo">Detalles del Pago</h4>
            <div class="campo-detalle">
              <span class="etiqueta">Método:</span>
              <span class="valor badge" :class="getBadgeClasePago(ventaSeleccionada.metodo_pago)">
                {{ ventaSeleccionada.metodo_pago }}
              </span>
            </div>
            <div class="campo-detalle">
              <span class="etiqueta">Total a Pagar:</span>
              <span class="valor texto-fuerte" style="color: var(--color-exito); font-size: 1.1rem;">Bs. {{ ventaSeleccionada.monto_total.toFixed(2) }}</span>
            </div>
            <div v-if="ventaSeleccionada.monto_recibido" class="campo-detalle">
              <span class="etiqueta">Monto Recibido:</span>
              <span class="valor">Bs. {{ ventaSeleccionada.monto_recibido.toFixed(2) }}</span>
            </div>
            <div v-if="ventaSeleccionada.cambio_dado" class="campo-detalle">
              <span class="etiqueta">Cambio Dado:</span>
              <span class="valor">Bs. {{ ventaSeleccionada.cambio_dado.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Productos de la Comanda -->
        <div class="detalle-seccion">
          <h4 class="seccion-titulo">Productos</h4>
          <table class="tabla-detalles">
            <thead><tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Subtotal</th>
            </tr></thead>
            <tbody>
              <tr v-for="prod in ventaSeleccionada.productos_detalles" :key="prod.id_producto_comanda">
                <td>{{ prod.nombre_producto }}</td>
                <td class="centro">{{ prod.cantidad }}</td>
                <td class="derecha">Bs. {{ prod.precio_unitario.toFixed(2) }}</td>
                <td class="derecha texto-fuerte">Bs. {{ prod.subtotal.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Comprobante de Pago -->
        <div v-if="ventaSeleccionada.url_comprobante" class="detalle-seccion">
          <h4 class="seccion-titulo">Comprobante de Pago</h4>
          <div class="comprobante-container">
            <img v-if="esImagen(ventaSeleccionada.url_comprobante)" 
                 :src="ventaSeleccionada.url_comprobante" 
                 alt="Comprobante" 
                 class="comprobante-imagen" />
            <div v-else class="comprobante-pdf">
              <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p>PDF: {{ ventaSeleccionada.url_comprobante.split('/').pop() }}</p>
              <a :href="ventaSeleccionada.url_comprobante" target="_blank" class="btn btn-sm btn-primario">
                Descargar
              </a>
            </div>
          </div>
        </div>

        <!-- Detalles de la Transacción -->
        <div v-if="ventaSeleccionada.bancarizacion" class="detalle-seccion">
          <h4 class="seccion-titulo">Transacción Bancaria</h4>
          <div class="campo-detalle">
            <span class="etiqueta">ID Bancarización:</span>
            <span class="valor código">{{ ventaSeleccionada.bancarizacion }}</span>
          </div>
          <div v-if="ventaSeleccionada.qr_billetera" class="campo-detalle">
            <span class="etiqueta">Billetera QR:</span>
            <span class="valor código">{{ ventaSeleccionada.qr_billetera.substring(0, 25) }}...</span>
          </div>
        </div>

        <!-- Acciones -->
        <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
          <button class="btn btn-secundario" @click="ventaSeleccionada = null">Volver</button>
          <button v-if="ventaSeleccionada.estado === 'Pendiente'" class="btn btn-exito" @click="marcarCompletada" :disabled="cambiandoEstado">
            Marcar Completada
          </button>
          <button v-if="ventaSeleccionada.estado !== 'Cancelada'" class="btn btn-peligro" @click="cancelarVenta" :disabled="cambiandoEstado">
            Cancelar Venta
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { servicioComandas } from '@/servicios-api/servicio-comandas.js'

const ventas = ref([])
const ventaSeleccionada = ref(null)
const busqueda = ref('')
const filtroEstado = ref('')
const filtroFecha = ref('')
const cargando = ref(false)
const actualizando = ref(false)
const cambiandoEstado = ref(false)
let intervaloActualizacion = null

onMounted(() => {
  cargarVentas()
  // Polling cada 5 segundos para actualización en tiempo real
  intervaloActualizacion = setInterval(() => {
    actualizarVentas()
  }, 5000)
})

onUnmounted(() => {
  if (intervaloActualizacion) clearInterval(intervaloActualizacion)
})

async function cargarVentas() {
  cargando.value = true
  try {
    const res = await servicioComandas.listarTodas()
    const comandas = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : res || [])
    
    // Mapear comandas al formato de ventas con todos los detalles
    ventas.value = comandas.map(cmd => ({
      id_comanda: cmd.id_comanda,
      cliente_nombre: cmd.usuario_comanda_id_clienteTousuario ? 
        `${cmd.usuario_comanda_id_clienteTousuario.nombres} ${cmd.usuario_comanda_id_clienteTousuario.apellidos}`.trim() : 
        'Cliente Anónimo',
      cliente_id: cmd.id_cliente,
      mesero_nombre: cmd.usuario_comanda_id_meseroTousuario?.nombres || 'No asignado',
      mesero_id: cmd.id_mesero,
      monto_total: cmd.detalle_comanda.reduce((sum, d) => sum + parseFloat(d.subtotal || 0), 0),
      metodo_pago: cmd.metodo_pago || 'Efectivo',
      estado: cmd.estado_despacho || 'Pendiente',
      fecha_comanda: cmd.fecha_registro,
      monto_recibido: cmd.monto_recibido ? parseFloat(cmd.monto_recibido) : null,
      cambio_dado: cmd.cambio_dado ? parseFloat(cmd.cambio_dado) : null,
      url_comprobante: cmd.comprobante_url,
      qr_billetera: cmd.qr_billetera,
      bancarizacion: cmd.comprobante_url?.split('|TX:')?.[1]?.split('|')?.[0],
      productos_detalles: cmd.detalle_comanda.map(det => ({
        id_producto_comanda: det.id_detalle,
        nombre_producto: det.producto?.nombre_producto || 'Producto desconocido',
        cantidad: det.cantidad,
        precio_unitario: parseFloat(det.precio_cobrado),
        subtotal: parseFloat(det.subtotal)
      }))
    }))
  } catch (error) {
    console.error('Error cargando ventas:', error)
  } finally {
    cargando.value = false
  }
}

async function actualizarVentas() {
  if (cargando.value) return
  
  actualizando.value = true
  try {
    const res = await servicioComandas.listarTodas()
    const comandas = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : res || [])
    
    // Mapear comandas nuevamente
    const nuevasVentas = comandas.map(cmd => ({
      id_comanda: cmd.id_comanda,
      cliente_nombre: cmd.usuario_comanda_id_clienteTousuario ? 
        `${cmd.usuario_comanda_id_clienteTousuario.nombres} ${cmd.usuario_comanda_id_clienteTousuario.apellidos}`.trim() : 
        'Cliente Anónimo',
      cliente_id: cmd.id_cliente,
      mesero_nombre: cmd.usuario_comanda_id_meseroTousuario?.nombres || 'No asignado',
      mesero_id: cmd.id_mesero,
      monto_total: cmd.detalle_comanda.reduce((sum, d) => sum + parseFloat(d.subtotal || 0), 0),
      metodo_pago: cmd.metodo_pago || 'Efectivo',
      estado: cmd.estado_despacho || 'Pendiente',
      fecha_comanda: cmd.fecha_registro,
      monto_recibido: cmd.monto_recibido ? parseFloat(cmd.monto_recibido) : null,
      cambio_dado: cmd.cambio_dado ? parseFloat(cmd.cambio_dado) : null,
      url_comprobante: cmd.comprobante_url,
      qr_billetera: cmd.qr_billetera,
      bancarizacion: cmd.comprobante_url?.split('|TX:')?.[1]?.split('|')?.[0],
      productos_detalles: cmd.detalle_comanda.map(det => ({
        id_producto_comanda: det.id_detalle,
        nombre_producto: det.producto?.nombre_producto || 'Producto desconocido',
        cantidad: det.cantidad,
        precio_unitario: parseFloat(det.precio_cobrado),
        subtotal: parseFloat(det.subtotal)
      }))
    }))
    
    ventas.value = nuevasVentas
    
    // Actualizar si hay venta seleccionada
    if (ventaSeleccionada.value) {
      const ventaActualizada = nuevasVentas.find(v => v.id_comanda === ventaSeleccionada.value.id_comanda)
      if (ventaActualizada) ventaSeleccionada.value = ventaActualizada
    }
  } catch (error) {
    console.error('Error actualizando ventas:', error)
  } finally {
    actualizando.value = false
  }
}

const ventasFiltradas = computed(() => {
  return ventas.value.filter(venta => {
    const coincideBusqueda = !busqueda.value || 
      venta.id_comanda.toString().includes(busqueda.value) ||
      (venta.cliente_nombre?.toLowerCase() || '').includes(busqueda.value.toLowerCase())
    
    const coincideEstado = !filtroEstado.value || venta.estado === filtroEstado.value
    
    const coincideFecha = !filtroFecha.value || 
      new Date(venta.fecha_comanda).toISOString().split('T')[0] === filtroFecha.value
    
    return coincideBusqueda && coincideEstado && coincideFecha
  })
})

function abrirDetalle(venta) {
  ventaSeleccionada.value = { ...venta }
}

function getBadgeClaseEstado(estado) {
  const clases = {
    'Completada': 'badge-exito',
    'Pendiente': 'badge-advertencia',
    'Preparando': 'badge-info',
    'Listo': 'badge-primaria',
    'Cancelada': 'badge-error'
  }
  return clases[estado] || 'badge-info'
}

function getBadgeClasePago(metodo) {
  const clases = {
    'Transferencia': 'badge-info',
    'Efectivo': 'badge-exito',
    'Tarjeta': 'badge-advertencia',
    'Billetera': 'badge-primaria'
  }
  return clases[metodo] || 'badge-sec'
}

function formatearFecha(fecha) {
  try {
    const date = new Date(fecha)
    return date.toLocaleDateString('es-BO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    })
  } catch {
    return '-'
  }
}

function formatearFechaCompleta(fecha) {
  try {
    const date = new Date(fecha)
    return date.toLocaleDateString('es-BO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '-'
  }
}

function esImagen(url) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
}

async function marcarCompletada() {
  if (!ventaSeleccionada.value) return
  cambiandoEstado.value = true
  try {
    await servicioComandas.cambiarEstado(ventaSeleccionada.value.id_comanda, 'Completada')
    ventaSeleccionada.value.estado = 'Completada'
    const idx = ventas.value.findIndex(v => v.id_comanda === ventaSeleccionada.value.id_comanda)
    if (idx >= 0) ventas.value[idx].estado = 'Completada'
  } catch (error) {
    console.error('Error actualizando estado:', error)
    alert('Error al actualizar estado')
  } finally {
    cambiandoEstado.value = false
  }
}

async function cancelarVenta() {
  if (!ventaSeleccionada.value) return
  if (!confirm('¿Estás seguro de cancelar esta venta?')) return
  
  cambiandoEstado.value = true
  try {
    await servicioComandas.cambiarEstado(ventaSeleccionada.value.id_comanda, 'Cancelada')
    ventaSeleccionada.value.estado = 'Cancelada'
    const idx = ventas.value.findIndex(v => v.id_comanda === ventaSeleccionada.value.id_comanda)
    if (idx >= 0) ventas.value[idx].estado = 'Cancelada'
  } catch (error) {
    console.error('Error cancelando venta:', error)
    alert('Error al cancelar venta')
  } finally {
    cambiandoEstado.value = false
  }
}
</script>

<style scoped>
.vista-ventas {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.vista-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.vista-titulo {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin: 0;
}

.vista-subtitulo {
  color: var(--texto-secundario);
  margin: 0.5rem 0 0 0;
  font-size: 0.95rem;
}

.filtros-barra {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.campo {
  padding: 0.75rem 1rem;
  border: 1px solid var(--borde-claro);
  border-radius: var(--radio-md);
  font-size: 0.95rem;
  font-family: inherit;
  background: var(--fondo-tarjeta);
  color: var(--texto-principal);
}

.campo:focus {
  outline: none;
  border-color: var(--color-primario);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tarjeta {
  background: var(--fondo-tarjeta);
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde-claro);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.tabla-wrapper {
  overflow-x: auto;
  padding: 0;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla th {
  background: var(--fondo-hover);
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--texto-principal);
  border-bottom: 2px solid var(--borde-claro);
}

.tabla td {
  padding: 1rem;
  border-bottom: 1px solid var(--borde-claro);
}

.fila-tabla:hover {
  background: var(--fondo-hover);
}

.celda-vacia {
  text-align: center;
  color: var(--texto-secundario);
  padding: 2rem !important;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radio-sm);
  font-size: 0.8rem;
  font-weight: 600;
}

.badge-exito {
  background: #d1fae5;
  color: #065f46;
}

.badge-error {
  background: #fee2e2;
  color: #991b1b;
}

.badge-advertencia {
  background: #fef3c7;
  color: #92400e;
}

.badge-info {
  background: #dbeafe;
  color: #1e40af;
}

.badge-primaria {
  background: #e9d5ff;
  color: #6b21a8;
}

.badge-sec {
  background: var(--fondo-hover);
  color: var(--texto-secundario);
}

.badge-grande {
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

.acciones {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radio-md);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-primario {
  background: var(--color-primario);
  color: white;
}

.btn-primario:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secundario {
  background: var(--fondo-hover);
  color: var(--texto-principal);
}

.btn-secundario:hover:not(:disabled) {
  background: var(--borde-claro);
}

.btn-peligro {
  background: var(--color-error);
  color: white;
}

.btn-peligro:hover:not(:disabled) {
  background: #dc2626;
}

.btn-exito {
  background: var(--color-exito);
  color: white;
}

.btn-exito:hover:not(:disabled) {
  background: #059669;
}

.texto-fuerte {
  font-weight: 700;
  color: var(--texto-principal);
}

.texto-sec {
  color: var(--texto-secundario);
  font-size: 0.9rem;
}

/* Detalle de Venta */
.detalle-venta {
  padding: 2rem;
}

.detalle-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--borde-claro);
}

.detalle-cabecera h3 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--texto-principal);
}

.detalle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.detalle-seccion {
  margin-bottom: 2rem;
}

.seccion-titulo {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--texto-principal);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--borde-claro);
}

.campo-detalle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--fondo-hover);
}

.etiqueta {
  color: var(--texto-secundario);
  font-weight: 600;
  font-size: 0.85rem;
}

.valor {
  color: var(--texto-principal);
  font-weight: 500;
  text-align: right;
}

.valor.código {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.8rem;
  background: var(--fondo-hover);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radio-sm);
}

.tabla-detalles {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.tabla-detalles th {
  background: var(--fondo-hover);
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--texto-principal);
  border-bottom: 2px solid var(--borde-claro);
  font-size: 0.85rem;
}

.tabla-detalles td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--borde-claro);
}

.tabla-detalles .centro {
  text-align: center;
}

.tabla-detalles .derecha {
  text-align: right;
}

.comprobante-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1.5rem;
  background: var(--fondo-hover);
  border-radius: var(--radio-md);
}

.comprobante-imagen {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radio-md);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.comprobante-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: var(--fondo-tarjeta);
  border-radius: var(--radio-md);
  border: 2px dashed var(--borde-claro);
}

.comprobante-pdf svg {
  color: var(--texto-secundario);
}

.comprobante-pdf p {
  margin: 0;
  color: var(--texto-secundario);
  font-size: 0.9rem;
}

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .vista-ventas {
    padding: 1.5rem;
  }
  
  .detalle-grid {
    grid-template-columns: 1fr;
  }
  
  .tabla {
    font-size: 0.85rem;
  }
  
  .btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 640px) {
  .vista-ventas {
    padding: 1rem;
  }
  
  .vista-cabecera {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filtros-barra {
    flex-direction: column;
  }
  
  .campo {
    width: 100%;
  }
  
  .tabla {
    font-size: 0.75rem;
  }
  
  .tabla th, .tabla td {
    padding: 0.5rem;
  }
  
  .detalle-cabecera {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .acciones {
    flex-direction: column;
    width: 100%;
  }
  
  .acciones .btn {
    width: 100%;
  }
}
</style>
