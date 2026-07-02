<template>
  <div class="vista-ventas fade-in">
    <div class="vista-cabecera">
      <div class="cabecera-titulo">
        <span class="titulo-medallon" aria-hidden="true">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path d="M3 3h18v4H3zM5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"></path>
            <path d="M9 12h6"></path>
          </svg>
        </span>
        <div>
          <h2 class="vista-titulo">Gestión de ventas</h2>
          <p class="vista-subtitulo">Comandas, transacciones y comprobantes de pago</p>
        </div>
      </div>
      <div class="cabecera-acciones">
        <span v-if="actualizando" class="indicador-actualizando"><span class="punto-vivo"></span>Actualizando</span>
        <button v-if="ventaSeleccionada" class="btn btn-secundario" @click="ventaSeleccionada = null">Cerrar</button>
      </div>
    </div>

    <!-- Si no hay venta seleccionada, mostrar tabla -->
    <template v-if="!ventaSeleccionada">
      <div class="filtros-panel superficie">
        <div class="filtros-barra">
          <label class="campo-busqueda">
            <svg class="icono-busqueda" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>
            </svg>
            <input v-model="busqueda" class="campo campo-con-icono" placeholder="Buscar por cliente, comanda..." />
          </label>
          <div style="flex:0 1 180px;min-width:150px"><BaseSelect v-model="filtroEstado" :options="opcionesEstadoVenta" placeholder="Todos los estados" /></div>
          <input v-model="filtroFecha" type="date" class="campo" style="max-width:180px" />
        </div>
        <div class="filtros-meta">
          <span class="chip-conteo"><strong>{{ ventasTotal }}</strong> comandas</span>
        </div>
      </div>

      <div class="panel-tabla superficie tabla-wrapper">
        <div v-if="cargando" class="estado-carga">
          <div class="fila-esqueleto" v-for="n in 6" :key="n">
            <span class="esqueleto" style="width: 12%"></span>
            <span class="esqueleto" style="width: 22%"></span>
            <span class="esqueleto" style="width: 18%"></span>
            <span class="esqueleto" style="width: 14%"></span>
            <span class="esqueleto" style="width: 16%"></span>
          </div>
        </div>
        <table v-else class="tabla responsiva">
          <thead><tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Atendido por</th>
            <th>Monto</th>
            <th>Pago</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            <tr v-if="!ventasFiltradas.length">
              <td colspan="8" class="celda-vacia">
                <div class="estado-vacio">
                  <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3h18v4H3zM5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"></path>
                    <path d="M9 12h6"></path>
                  </svg>
                  <p class="estado-vacio-titulo">Sin ventas por aquí</p>
                  <span class="estado-vacio-texto">Ajusta los filtros o espera nuevas comandas.</span>
                </div>
              </td>
            </tr>
            <tr v-for="venta in ventasFiltradas" :key="venta.id_comanda" class="fila-tabla">
              <td class="texto-fuerte sin-label"><span class="celda-id">#{{ venta.id_comanda }}</span></td>
              <td class="texto-sec" data-label="Cliente">{{ venta.cliente_nombre }}</td>
              <td class="texto-sec" data-label="Atendido por">{{ venta.mesero_nombre }}</td>
              <td data-label="Monto"><span class="monto-tabla">Bs. {{ venta.monto_total.toFixed(2) }}</span></td>
              <td data-label="Pago"><span class="badge" :class="getBadgeClasePago(venta.metodo_pago)">{{ venta.metodo_pago }}</span></td>
              <td data-label="Estado"><span class="badge" :class="getBadgeClaseEstado(venta.estado)">{{ venta.estado }}</span></td>
              <td class="texto-sec" data-label="Fecha">{{ formatearFecha(venta.fecha_comanda) }}</td>
              <td class="sin-label">
                <div class="acciones">
                  <button class="btn btn-sm btn-primario" @click="abrirDetalle(venta)">Ver</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Paginacion
        :total="ventasTotal" :pagina="pagina" :limite="limite"
        @update:pagina="irPagina"
        @update:limite="cambiarLimite"
      />
    </template>

    <!-- Detalle de venta -->
    <template v-else>
      <div class="detalle-venta superficie fade-in">
        <div class="detalle-cabecera">
          <div>
            <h3>Comanda #{{ ventaSeleccionada.id_comanda }}</h3>
            <p class="texto-sec">{{ formatearFechaCompleta(ventaSeleccionada.fecha_comanda) }}</p>
          </div>
          <span :class="getBadgeClaseEstado(ventaSeleccionada.estado)" class="badge badge-grande">
            {{ ventaSeleccionada.estado }}
          </span>
        </div>

        <!-- Resumen de montos destacado -->
        <div class="resumen-montos bezel">
          <div class="bezel-core resumen-core textura-grano">
            <div class="monto-principal">
              <span class="monto-label">Total a pagar</span>
              <span class="monto-cifra">Bs. {{ ventaSeleccionada.monto_total.toFixed(2) }}</span>
              <span class="badge monto-metodo" :class="getBadgeClasePago(ventaSeleccionada.metodo_pago)">{{ ventaSeleccionada.metodo_pago }}</span>
            </div>
            <div v-if="ventaSeleccionada.monto_recibido || ventaSeleccionada.cambio_dado" class="monto-secundarios">
              <div v-if="ventaSeleccionada.monto_recibido" class="monto-mini">
                <span class="monto-mini-label">Recibido</span>
                <span class="monto-mini-cifra">Bs. {{ ventaSeleccionada.monto_recibido.toFixed(2) }}</span>
              </div>
              <div v-if="ventaSeleccionada.cambio_dado" class="monto-mini">
                <span class="monto-mini-label">Cambio</span>
                <span class="monto-mini-cifra">Bs. {{ ventaSeleccionada.cambio_dado.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="detalle-grid">
          <!-- Información de la Comanda -->
          <div class="detalle-seccion">
            <h4 class="seccion-titulo">Información de comanda</h4>
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
            <h4 class="seccion-titulo">Cliente</h4>
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
            <h4 class="seccion-titulo">Atendido por</h4>
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
            <h4 class="seccion-titulo">Detalles del pago</h4>
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
              <th class="centro">Cantidad</th>
              <th class="derecha">Precio unitario</th>
              <th class="derecha">Subtotal</th>
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
          <h4 class="seccion-titulo">Comprobante de pago</h4>
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
          <h4 class="seccion-titulo">Transacción bancaria</h4>
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
            Marcar completada
          </button>
          <button v-if="ventaSeleccionada.estado !== 'Cancelada'" class="btn btn-peligro" @click="cancelarVenta" :disabled="cambiandoEstado">
            Cancelar venta
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { servicioComandas } from '@/servicios-api/servicio-comandas.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import Paginacion from '@/componentes/comunes/Paginacion.vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()

const opcionesEstadoVenta = [
  { value: '', label: 'Todos los estados' },
  { value: 'Pendiente', label: 'Pendientes' },
  { value: 'Preparando', label: 'Preparando' },
  { value: 'Listo', label: 'Listos' },
  { value: 'Completada', label: 'Completadas' },
  { value: 'Cancelada', label: 'Canceladas' },
]

const ventas = ref([])
const ventaSeleccionada = ref(null)
const busqueda = ref('')
const filtroEstado = ref('')
const filtroFecha = ref('')
const cargando = ref(false)
const actualizando = ref(false)
const cambiandoEstado = ref(false)

// Paginación en servidor
const pagina = ref(1)
const limite = ref(20)
const ventasTotal = ref(0)
let intervaloActualizacion = null

onMounted(() => {
  cargarVentas()
  // Refresco en vivo (endpoint paginado y ligero)
  intervaloActualizacion = setInterval(() => {
    actualizarVentas()
  }, 15000)
})

onUnmounted(() => {
  if (intervaloActualizacion) clearInterval(intervaloActualizacion)
})

function mapearComanda(cmd) {
  return {
    id_comanda: cmd.id_comanda,
    cliente_nombre: cmd.usuario_comanda_id_clienteTousuario
      ? `${cmd.usuario_comanda_id_clienteTousuario.nombres} ${cmd.usuario_comanda_id_clienteTousuario.apellidos}`.trim()
      : 'Cliente Anónimo',
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
  }
}

function construirParams() {
  const params = new URLSearchParams()
  params.append('pagina', pagina.value)
  params.append('limite', limite.value)
  if (filtroEstado.value) params.append('estado', filtroEstado.value)
  if (filtroFecha.value) params.append('fecha', filtroFecha.value)
  return params.toString()
}

async function cargarVentas(silencioso = false) {
  if (silencioso) actualizando.value = true
  else cargando.value = true
  try {
    const res = await clienteHttp.get(`/comandas?${construirParams()}`)
    ventas.value = (res.datos || []).map(mapearComanda)
    ventasTotal.value = res.total || 0
    if (ventaSeleccionada.value) {
      const act = ventas.value.find(v => v.id_comanda === ventaSeleccionada.value.id_comanda)
      if (act) ventaSeleccionada.value = act
    }
  } catch (error) {
    console.error('Error cargando ventas:', error)
  } finally {
    cargando.value = false
    actualizando.value = false
  }
}

function irPagina(n) { pagina.value = n; cargarVentas() }
function cambiarLimite(l) { limite.value = l; pagina.value = 1; cargarVentas() }

// Al cambiar filtros de servidor, volver a la página 1 y recargar
watch([filtroEstado, filtroFecha], () => { pagina.value = 1; cargarVentas() })

async function actualizarVentas() {
  if (cargando.value) return
  await cargarVentas(true)
}

const ventasFiltradas = computed(() => {
  // estado y fecha se filtran en el servidor; aquí solo la búsqueda por texto de la página actual
  if (!busqueda.value) return ventas.value
  const q = busqueda.value.toLowerCase()
  return ventas.value.filter(venta =>
    venta.id_comanda.toString().includes(busqueda.value) ||
    (venta.cliente_nombre?.toLowerCase() || '').includes(q)
  )
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
    notif.error('Error al actualizar estado')
  } finally {
    cambiandoEstado.value = false
  }
}

async function cancelarVenta() {
  if (!ventaSeleccionada.value) return
  const ok = await notif.confirmar({
    variante: 'peligro',
    titulo: 'Cancelar venta',
    mensaje: 'Esta acción marcará la comanda como cancelada. ¿Deseas continuar?',
    textoConfirmar: 'Sí, cancelar venta',
    textoCancelar: 'No',
  })
  if (!ok) return

  cambiandoEstado.value = true
  try {
    await servicioComandas.cambiarEstado(ventaSeleccionada.value.id_comanda, 'Cancelada')
    ventaSeleccionada.value.estado = 'Cancelada'
    const idx = ventas.value.findIndex(v => v.id_comanda === ventaSeleccionada.value.id_comanda)
    if (idx >= 0) ventas.value[idx].estado = 'Cancelada'
    notif.exito('Venta cancelada')
  } catch (error) {
    console.error('Error cancelando venta:', error)
    notif.error('Error al cancelar venta')
  } finally {
    cambiandoEstado.value = false
  }
}
</script>

<style scoped>
.vista-ventas {
  padding: var(--esp-6);
  max-width: 1400px;
  margin: 0 auto;
}

.vista-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--esp-4);
  margin-bottom: var(--esp-6);
  flex-wrap: wrap;
}

.cabecera-titulo {
  display: flex;
  align-items: center;
  gap: var(--esp-4);
}

.titulo-medallon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--radio-md);
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px rgba(168,85,247,0.18);
}

.vista-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
  margin: 0;
}

.vista-subtitulo {
  color: var(--texto-secundario);
  margin: 5px 0 0 0;
  font-size: 0.9rem;
  max-width: 60ch;
  line-height: 1.5;
}

.cabecera-acciones {
  display: flex;
  gap: var(--esp-3);
  align-items: center;
}

.indicador-actualizando {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--morado-hover);
  padding: 5px 12px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-sutil);
}

.punto-vivo {
  width: 7px;
  height: 7px;
  border-radius: var(--radio-full);
  background: var(--morado-hover);
  box-shadow: 0 0 8px rgba(192, 132, 252, 0.8);
  animation: latido 1.4s ease-in-out infinite;
}

@keyframes latido {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
}

/* Panel de filtros de vidrio */
.filtros-panel {
  display: flex;
  align-items: center;
  gap: var(--esp-4);
  flex-wrap: wrap;
  padding: var(--esp-4);
  margin-bottom: var(--esp-5);
}

.filtros-barra {
  display: flex;
  gap: var(--esp-3);
  flex-wrap: wrap;
  flex: 1 1 auto;
}

.filtros-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.chip-conteo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radio-full);
  font-size: 0.82rem;
  color: var(--texto-secundario);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--glass-borde);
  white-space: nowrap;
}
.chip-conteo strong {
  color: var(--texto-principal);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Campos con la estética global (tema oscuro) */
.campo {
  padding: 12px 16px;
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
  font-size: 0.9rem;
  font-family: var(--fuente-principal);
  background: var(--fondo-input);
  color: var(--texto-principal);
  transition: var(--trans-rapida);
}

.campo::placeholder { color: var(--texto-desactivado); }

.campo:focus {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco);
}

/* Buscador con icono embebido */
.campo-busqueda {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 260px;
  max-width: 340px;
}
.icono-busqueda {
  position: absolute;
  left: 14px;
  color: var(--texto-desactivado);
  pointer-events: none;
}
.campo-con-icono {
  width: 100%;
  padding-left: 40px;
}
.campo-busqueda:focus-within .icono-busqueda { color: var(--morado-hover); }

/* Panel de tabla (superficie de vidrio) */
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
  background: rgba(168, 85, 247, 0.1);
  padding: 14px 16px;
  text-align: left;
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--texto-secundario);
  border-bottom: 1px solid var(--glass-borde);
  position: sticky;
  top: 0;
  z-index: 1;
  backdrop-filter: blur(8px);
}

.tabla td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.tabla tbody tr:last-child td { border-bottom: none; }

.fila-tabla {
  transition: background var(--trans-rapida), box-shadow var(--trans-rapida);
}
.fila-tabla:hover {
  background: rgba(168, 85, 247, 0.1);
  box-shadow: inset 2px 0 0 var(--morado-brillante), inset 0 0 40px rgba(168,85,247,0.05);
}

/* Identificador de comanda con acento monoespaciado */
.celda-id {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--radio-sm);
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--glass-borde);
}

/* Monto en tabla: cifra destacada, no un badge */
.monto-tabla {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-exito);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.celda-vacia {
  text-align: center;
  color: var(--texto-desactivado);
  padding: var(--esp-7) !important;
}

.estado-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--esp-2);
}

.estado-vacio svg { color: var(--morado-claro); opacity: 0.85; margin-bottom: var(--esp-2); }

.estado-vacio-titulo {
  margin: 0;
  font-weight: 700;
  font-size: 1rem;
  color: var(--texto-principal);
}

.estado-vacio-texto {
  font-size: 0.85rem;
  color: var(--texto-secundario);
}

/* Esqueleto de carga (respeta la forma final de la tabla) */
.estado-carga {
  padding: var(--esp-3) var(--esp-4);
}

.fila-esqueleto {
  display: flex;
  gap: var(--esp-5);
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--borde-sutil);
}
.fila-esqueleto:last-child { border-bottom: none; }

.esqueleto {
  height: 12px;
  border-radius: var(--radio-full);
  background: linear-gradient(
    90deg,
    rgba(168, 85, 247, 0.08) 25%,
    rgba(168, 85, 247, 0.2) 50%,
    rgba(168, 85, 247, 0.08) 75%
  );
  background-size: 200% 100%;
  animation: brillar 1.4s ease-in-out infinite;
}

@keyframes brillar {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

/* Badges tematizados (tema oscuro, estados con rgba) */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: var(--radio-full);
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.1px;
  line-height: 1.4;
  border: 1px solid transparent;
  font-variant-numeric: tabular-nums;
}

.badge-exito {
  background: rgba(34, 197, 94, 0.14);
  color: var(--color-exito);
  border-color: rgba(34, 197, 94, 0.3);
}

.badge-error {
  background: rgba(239, 68, 68, 0.14);
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.3);
}

.badge-advertencia {
  background: rgba(245, 158, 11, 0.14);
  color: var(--color-alerta);
  border-color: rgba(245, 158, 11, 0.3);
}

.badge-info {
  background: rgba(56, 189, 248, 0.14);
  color: var(--color-info);
  border-color: rgba(56, 189, 248, 0.3);
}

.badge-primaria {
  background: rgba(168, 85, 247, 0.16);
  color: var(--morado-hover);
  border-color: var(--borde-sutil);
}

.badge-sec {
  background: rgba(168, 85, 247, 0.08);
  color: var(--texto-secundario);
  border-color: var(--borde-sutil);
}

.badge-grande {
  font-size: 0.95rem;
  padding: 8px 16px;
}

.acciones {
  display: flex;
  gap: var(--esp-2);
}

/* Botones locales alineados a la marca */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radio-full);
  font-family: var(--fuente-principal);
  font-weight: 500;
  cursor: pointer;
  font-size: 0.9rem;
  transition: var(--trans-normal);
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
}

.btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 0.8rem;
}

.btn-primario {
  background: var(--gradiente-marca);
  color: #fff;
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.35);
}

.btn-primario:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(236, 72, 153, 0.45), var(--glow-morado);
}

.btn-secundario {
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid var(--borde-activo);
  color: var(--morado-hover);
}

.btn-secundario:hover:not(:disabled) {
  background: rgba(168, 85, 247, 0.16);
  border-color: var(--morado-brillante);
  color: var(--texto-principal);
  transform: translateY(-2px);
}

.btn-peligro {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: var(--color-error);
}

.btn-peligro:hover:not(:disabled) {
  background: var(--color-error);
  color: #fff;
}

.btn-exito {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: var(--color-exito);
}

.btn-exito:hover:not(:disabled) {
  background: var(--color-exito);
  color: #062e16;
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
  padding: var(--esp-6);
}

.detalle-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-4);
  margin-bottom: var(--esp-6);
  padding-bottom: var(--esp-5);
  border-bottom: 1px solid var(--borde-sutil);
  flex-wrap: wrap;
}

.detalle-cabecera h3 {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}

/* Resumen de montos destacado (hardware look) */
.resumen-montos {
  margin-bottom: var(--esp-6);
}

.resumen-core {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--esp-5);
  padding: var(--esp-5) var(--esp-6);
  overflow: hidden;
}

.monto-principal {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.monto-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--texto-secundario);
}

.monto-cifra {
  font-family: var(--fuente-titulo);
  font-size: clamp(2rem, 5vw, 2.7rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--color-exito);
  text-shadow: 0 0 26px rgba(34, 197, 94, 0.28);
  font-variant-numeric: tabular-nums;
}

.monto-metodo {
  align-self: flex-start;
  margin-top: 4px;
}

.monto-secundarios {
  position: relative;
  z-index: 1;
  display: flex;
  gap: var(--esp-3);
  flex-wrap: wrap;
}

.monto-mini {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 18px;
  border-radius: var(--radio-md);
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid var(--glass-borde);
  min-width: 110px;
}

.monto-mini-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--texto-secundario);
}

.monto-mini-cifra {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.detalle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--esp-5);
  margin-bottom: var(--esp-5);
}

.detalle-seccion {
  margin-bottom: var(--esp-6);
  background: rgba(46, 26, 102, 0.28);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-lg);
  padding: var(--esp-5);
  transition: border-color var(--trans-normal), box-shadow var(--trans-normal), transform var(--trans-normal);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.detalle-grid .detalle-seccion:hover {
  border-color: var(--borde-activo);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 26px rgba(10, 6, 26, 0.4);
  transform: translateY(-2px);
}

.detalle-grid .detalle-seccion { margin-bottom: 0; }

.seccion-titulo {
  margin: 0 0 var(--esp-4) 0;
  font-family: var(--fuente-titulo);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--texto-principal);
  padding-bottom: var(--esp-3);
  border-bottom: 1px solid var(--borde-sutil);
}

.campo-detalle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-4);
  padding: 10px 0;
  border-bottom: 1px solid var(--borde-sutil);
}
.campo-detalle:last-child { border-bottom: none; }

.etiqueta {
  color: var(--texto-secundario);
  font-weight: 600;
  font-size: 0.85rem;
}

.valor {
  color: var(--texto-principal);
  font-weight: 500;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.valor.código {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.8rem;
  background: rgba(168, 85, 247, 0.1);
  color: var(--morado-hover);
  padding: 3px 8px;
  border-radius: var(--radio-sm);
}

.tabla-detalles {
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--esp-3);
  font-size: 0.9rem;
}

.tabla-detalles th {
  background: rgba(168, 85, 247, 0.06);
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: var(--texto-secundario);
  border-bottom: 1px solid var(--borde-sutil);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.tabla-detalles td {
  padding: 12px;
  border-bottom: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.tabla-detalles tbody tr { transition: background var(--trans-rapida); }
.tabla-detalles tbody tr:hover { background: rgba(168, 85, 247, 0.06); }
.tabla-detalles tbody tr:last-child td { border-bottom: none; }

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
  gap: var(--esp-4);
  margin-top: var(--esp-3);
  padding: var(--esp-5);
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
}

.comprobante-imagen {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-tarjeta);
}

.comprobante-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--esp-4);
  padding: var(--esp-6);
  background: var(--fondo-tarjeta);
  border-radius: var(--radio-md);
  border: 2px dashed var(--borde-sutil);
}

.comprobante-pdf svg {
  color: var(--morado-hover);
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

/* Entrada escalonada de las secciones del detalle */
.detalle-grid .detalle-seccion {
  animation: subirSeccion 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.detalle-grid .detalle-seccion:nth-child(1) { animation-delay: 0.02s; }
.detalle-grid .detalle-seccion:nth-child(2) { animation-delay: 0.08s; }
.detalle-grid .detalle-seccion:nth-child(3) { animation-delay: 0.14s; }
.detalle-grid .detalle-seccion:nth-child(4) { animation-delay: 0.20s; }

@keyframes subirSeccion {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .fade-in,
  .detalle-grid .detalle-seccion,
  .punto-vivo,
  .esqueleto {
    animation: none;
  }
  .fila-tabla,
  .btn,
  .detalle-seccion,
  .tabla-detalles tbody tr {
    transition: none;
  }
}

@media (max-width: 1024px) {
  .vista-ventas {
    padding: var(--esp-5);
  }

  .detalle-grid {
    grid-template-columns: 1fr;
  }

  .tabla {
    font-size: 0.85rem;
  }

  .btn {
    padding: 8px 16px;
    font-size: 0.8rem;
  }
}

@media (max-width: 640px) {
  .vista-ventas {
    padding: var(--esp-4);
  }

  .vista-cabecera {
    flex-direction: column;
    gap: var(--esp-4);
  }

  .filtros-barra {
    flex-direction: column;
    width: 100%;
  }

  .filtros-meta {
    margin-left: 0;
    width: 100%;
  }

  .chip-conteo { width: 100%; justify-content: center; }

  .campo-busqueda {
    max-width: none;
    flex-basis: auto;
  }

  .resumen-core {
    padding: var(--esp-5);
  }

  .monto-secundarios { width: 100%; }

  .monto-mini { flex: 1 1 auto; }

  .campo {
    width: 100%;
  }

  .tabla {
    font-size: 0.75rem;
  }

  .tabla th, .tabla td {
    padding: 10px;
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
    justify-content: center;
  }
}
</style>
