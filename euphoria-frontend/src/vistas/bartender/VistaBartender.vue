<template>
  <div class="bartender-container fade-in">
    <!-- Header: Estación + KPIs -->
    <header class="bartender-header superficie">
      <div class="header-top">
        <div class="header-left">
          <h1 class="header-titulo"><span class="titulo-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg></span> Euphoria bar station</h1>
          <p class="header-sub">Prepara y despacha los pedidos de la barra en tiempo real.</p>
        </div>

        <div class="stats-panel" v-if="pestana === 'pendientes'">
          <div class="stat-card stat-total">
            <span class="stat-numero">{{ comandas.length }}</span>
            <span class="stat-etiq">Órdenes activas</span>
          </div>
          <div class="stat-card stat-cola">
            <span class="stat-numero">{{ comandasSinIniciar }}</span>
            <span class="stat-etiq">Sin iniciar</span>
          </div>
          <div class="stat-card stat-prep">
            <span class="stat-numero">{{ comandasEnPreparacion }}</span>
            <span class="stat-etiq">En preparación</span>
          </div>
          <button class="btn-refresh hover-crecer" @click="cargarComandas(true)" :class="{'girar': cargando}" title="Actualizar lista" aria-label="Actualizar lista de pedidos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
        </div>
      </div>

      <nav class="bartender-tabs">
        <button :class="{ activo: pestana === 'pendientes' }" @click="cambiarPestana('pendientes')">En cola</button>
        <button :class="{ activo: pestana === 'historial' }" @click="cambiarPestana('historial')">Historial</button>
      </nav>
    </header>

    <div class="contenido-barra">
      <!-- Vista EN COLA -->
      <div v-if="pestana === 'pendientes'">
        <div v-if="errorCarga" class="aviso-error fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {{ errorCarga }}
        </div>
        <div v-if="cargando && primerCarga && comandas.length === 0" class="skeleton-grid" aria-hidden="true">
          <div class="comanda-skeleton" v-for="n in 3" :key="n">
            <div class="sk-line sk-titulo"></div>
            <div class="sk-bloque"></div>
            <div class="sk-line sk-corta"></div>
            <div class="sk-line"></div>
            <div class="sk-line"></div>
            <div class="sk-boton"></div>
          </div>
        </div>

        <div v-else-if="comandas.length === 0" class="mensaje-vacio aparecer-subir">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" width="60" height="60" style="margin-bottom:10px; stroke: var(--color-exito);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <h3>No hay pedidos pendientes</h3>
          <p>Buen trabajo. La barra está al día.</p>
        </div>

        <!-- Lista de Comandas (Tarjetas) -->
        <div v-else class="comandas-grid escalonar">
          <transition-group name="list">
            <div v-for="comanda in comandas" :key="comanda.id_comanda" class="comanda-card" :class="'estado-' + comanda.estado_despacho.toLowerCase()">

              <div class="comanda-header">
                <div class="comanda-id-wrap">
                  <span class="comanda-id-hash">#</span>
                  <span class="comanda-id">{{ comanda.id_comanda }}</span>
                </div>
                <div class="comanda-tiempo" :class="{'tiempo-critico': minutosTranscurridos(comanda.fecha_registro) > 10}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span class="tiempo-num">{{ minutosTranscurridos(comanda.fecha_registro) }}</span> min
                </div>
              </div>

              <div class="comanda-estado-fila">
                <span class="estado-pill" :class="'pill-' + comanda.estado_despacho.toLowerCase()">
                  <span class="estado-punto"></span>
                  {{ comanda.estado_despacho === 'Preparando' ? 'En preparación' : 'En cola' }}
                </span>
              </div>

              <!-- Información del Destino / Entrega -->
              <div class="comanda-destino">
                <div class="destino-row">
                  <span class="destino-etiq">Entrega a:</span>
                  <strong class="destino-val">
                    <span v-if="esPedidoDeCliente(comanda)">
                      Cliente (Recoger en Barra)
                    </span>
                    <span v-else>
                      Mesero: {{ comanda.usuario_comanda_id_meseroTousuario?.nombres }} {{ comanda.usuario_comanda_id_meseroTousuario?.apellidos || '' }}
                    </span>
                  </strong>
                </div>
                <div class="destino-row" v-if="comanda.mesa_espacio">
                  <span class="destino-etiq">Llevar a:</span>
                  <strong class="destino-val mesa-badge">{{ comanda.mesa_espacio.nombre_mesa }}</strong>
                </div>
                <div class="destino-row" v-else>
                  <span class="destino-etiq">Cliente:</span>
                  <span class="destino-val">
                    {{ comanda.usuario_comanda_id_clienteTousuario ? `${comanda.usuario_comanda_id_clienteTousuario.nombres} ${comanda.usuario_comanda_id_clienteTousuario.apellidos || ''}` : 'Sin Registro / VIP' }}
                  </span>
                </div>
              </div>

              <!-- Lista de Bebidas/Productos -->
              <div class="comanda-productos">
                <h4 class="prod-titulo">Preparar:</h4>
                <ul class="prod-lista">
                  <li v-for="det in comanda.detalle_comanda" :key="det.id_detalle">
                    <div class="prod-cant">{{ det.cantidad }}x</div>
                    <div class="prod-nombre">{{ det.producto?.nombre_producto }}</div>
                  </li>
                </ul>
              </div>

              <!-- Acciones -->
              <div class="comanda-acciones">
                <button v-if="comanda.estado_despacho === 'Pendiente'" class="btn-preparar" @click="cambiarEstado(comanda.id_comanda, 'Preparando')" :disabled="procesandoId === comanda.id_comanda">
                  <span v-if="procesandoId === comanda.id_comanda">Procesando...</span>
                  <span v-else>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    Empezar a preparar
                  </span>
                </button>

                <button v-if="comanda.estado_despacho === 'Preparando'" class="btn-completar brillo-hover" @click="cambiarEstado(comanda.id_comanda, 'Listo')" :disabled="procesandoId === comanda.id_comanda">
                  <span v-if="procesandoId === comanda.id_comanda">Procesando...</span>
                  <span v-else>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Marcar como listo
                  </span>
                </button>
              </div>

            </div>
          </transition-group>
        </div>
      </div>

      <!-- Vista HISTORIAL -->
      <div v-if="pestana === 'historial'" class="fade-in">
        
        <!-- Filtros de Fecha -->
        <div class="filtros-historial">
          <button class="btn-filtro" :class="{ activo: filtroFecha === 'hoy' }" @click="seleccionarFiltro('hoy')">Hoy</button>
          <button class="btn-filtro" :class="{ activo: filtroFecha === 'ayer' }" @click="seleccionarFiltro('ayer')">Ayer</button>
          <div class="date-picker-container" :class="{ activo: filtroFecha === 'custom' }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <input type="date" class="date-picker" v-model="fechaPersonalizada" @change="seleccionarFiltro('custom')" />
          </div>
        </div>

        <div v-if="cargandoHistorial" class="skeleton-grid" aria-hidden="true">
          <div class="comanda-skeleton" v-for="n in 3" :key="n">
            <div class="sk-line sk-titulo"></div>
            <div class="sk-bloque"></div>
            <div class="sk-line sk-corta"></div>
            <div class="sk-line"></div>
          </div>
        </div>

        <div v-else-if="historial.length === 0" class="mensaje-vacio aparecer-subir">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" width="56" height="56" style="margin-bottom:10px; stroke: var(--morado-hover);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <h3>Aún no hay pedidos en esta fecha</h3>
          <p>Los pedidos que se prepararon aparecerán aquí.</p>
        </div>

        <div v-else class="historial-grid escalonar">
          <transition-group name="list">
            <div v-for="comanda in historial" :key="comanda.id_comanda" class="historial-card">
              
              <div class="hist-header">
                <div class="hist-orden">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  #{{ comanda.id_comanda }}
                </div>
                <div class="hist-estado" :class="'est-' + comanda.estado_despacho.toLowerCase()">
                  <svg v-if="comanda.estado_despacho === 'Completada'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <svg v-else-if="comanda.estado_despacho === 'Cancelada'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {{ etiquetaEstadoHistorial(comanda.estado_despacho) }}
                </div>
              </div>

              <div class="hist-info">
                <div class="info-bloque">
                  <span class="info-label">Atendió</span>
                  <strong class="info-valor">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    {{ comanda.usuario_comanda_id_meseroTousuario?.nombres }}
                  </strong>
                </div>
                <div class="info-bloque">
                  <span class="info-label">Destino</span>
                  <strong class="info-valor" v-if="comanda.mesa_espacio">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                    Mesa {{ comanda.mesa_espacio.nombre_mesa }}
                  </strong>
                  <strong class="info-valor" v-else>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                    Barra / App
                  </strong>
                </div>
              </div>

              <div class="hist-prods">
                <div v-for="det in comanda.detalle_comanda" :key="det.id_detalle" class="hist-prod-item">
                  <span class="hp-cant">{{ det.cantidad }}</span>
                  <span class="hp-nom">{{ det.producto?.nombre_producto }}</span>
                </div>
              </div>

            </div>
          </transition-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'

const pestana = ref('pendientes')

const comandas = ref([])
const historial = ref([])
const cargando = ref(false)
const cargandoHistorial = ref(false)
const procesandoId = ref(null)
const primerCarga = ref(true)
const errorCarga = ref('')

const filtroFecha = ref('hoy')
const fechaPersonalizada = ref('')

let intervalo = null
let socket = null

// Separar la cola real: las que aún no se han empezado a preparar vs. las ya en curso
const comandasSinIniciar = computed(
  () => comandas.value.filter(c => c.estado_despacho === 'Pendiente').length
)
const comandasEnPreparacion = computed(
  () => comandas.value.filter(c => c.estado_despacho === 'Preparando').length
)

// Detecta si el pedido va directo al cliente (recojo en barra).
// Se prioriza el nombre del rol; se mantiene el id 4 como respaldo legacy.
function esPedidoDeCliente(comanda) {
  const usuario = comanda.usuario_comanda_id_meseroTousuario
  if (!usuario) return false
  if (usuario.nombre_rol) return usuario.nombre_rol === 'Cliente'
  return usuario.id_rol === 4
}

// Mapea cada estado del historial a una etiqueta clara y no engañosa
function etiquetaEstadoHistorial(estado) {
  if (estado === 'Completada') return 'Entregado'
  if (estado === 'Cancelada') return 'Cancelada'
  if (estado === 'Listo') return 'Esperando Recojo'
  return estado
}

async function cargarComandas(fuerzaVisual = false) {
  if (primerCarga.value || fuerzaVisual) cargando.value = true
  try {
    const res = await clienteHttp.get('/comandas/pendientes')
    comandas.value = res
    errorCarga.value = ''
  } catch (err) {
    console.error('Error al cargar comandas:', err)
    errorCarga.value = 'No se pudo actualizar la lista de pedidos. Reintentando...'
  } finally {
    cargando.value = false
    primerCarga.value = false
  }
}

async function cargarHistorial() {
  cargandoHistorial.value = true
  try {
    let dateObj = new Date()
    
    if (filtroFecha.value === 'ayer') {
      dateObj.setDate(dateObj.getDate() - 1)
    } else if (filtroFecha.value === 'custom' && fechaPersonalizada.value) {
      const parts = fechaPersonalizada.value.split('-')
      dateObj = new Date(parts[0], parts[1] - 1, parts[2])
    }

    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    
    const res = await clienteHttp.get(`/comandas?fecha=${y}-${m}-${d}`)
    historial.value = res.filter(c => c.estado_despacho === 'Completada' || c.estado_despacho === 'Listo' || c.estado_despacho === 'Cancelada')
  } catch (err) {
    console.error(err)
  } finally {
    cargandoHistorial.value = false
  }
}

function seleccionarFiltro(tipo) {
  filtroFecha.value = tipo
  cargarHistorial()
}

function cambiarPestana(p) {
  pestana.value = p
  if (p === 'historial') cargarHistorial()
}

async function cambiarEstado(id, nuevoEstado) {
  procesandoId.value = id
  try {
    await clienteHttp.patch(`/comandas/${id}/estado`, { estado: nuevoEstado })
    if (nuevoEstado === 'Listo') {
      // Remover de la vista si ya está listo (se va para el mesero)
      comandas.value = comandas.value.filter(c => c.id_comanda !== id)
      // Re-sincronizar con la BD para evitar divergencias entre bartenders
      cargarComandas()
    } else {
      // Actualizar estado localmente
      const cmd = comandas.value.find(c => c.id_comanda === id)
      if (cmd) cmd.estado_despacho = nuevoEstado
    }
  } catch (err) {
    console.error('Error al cambiar estado:', err)
    alert('No se pudo actualizar la orden. Intenta de nuevo.')
  } finally {
    procesandoId.value = null
  }
}

function minutosTranscurridos(fechaUtc) {
  const ahora = new Date()
  const registro = new Date(fechaUtc)
  const diffMs = ahora - registro
  const diffMins = Math.floor(diffMs / 60000)
  return diffMins >= 0 ? diffMins : 0
}

onMounted(() => {
  cargarComandas()
  // Recarga automática cada 10 segundos (respaldo del socket)
  intervalo = setInterval(cargarComandas, 10000)

  // Websocket para refresco inmediato de la barra en tiempo real
  const urlBackend = import.meta.env.VITE_URL_BACKEND || 'http://localhost:3000'
  socket = io(urlBackend)
  socket.on('nueva_comanda', () => cargarComandas())
  socket.on('pedido_listo', () => cargarComandas())
})

onUnmounted(() => {
  if (intervalo) clearInterval(intervalo)
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.bartender-container {
  padding: var(--esp-5);
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
  min-height: calc(100dvh - 60px);
}

.bartender-header {
  padding: var(--esp-5);
  margin-bottom: var(--esp-6);
  position: relative;
  overflow: hidden;
}
.bartender-header::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -6%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(168,85,247,0.18), transparent 62%);
  pointer-events: none;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--esp-5);
  position: relative;
  z-index: 1;
}

.header-titulo {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  font-family: var(--fuente-titulo);
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.05;
  text-wrap: balance;
  margin: 0 0 var(--esp-2) 0;
  color: var(--texto-principal);
}
.titulo-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: var(--radio-md);
  color: #fff;
  background: var(--gradiente-marca);
  box-shadow: 0 6px 18px rgba(168,85,247,0.4);
}

.header-sub {
  color: var(--texto-secundario);
  margin: 0;
  font-size: 0.92rem;
  max-width: 52ch;
  text-wrap: pretty;
}

.stats-panel {
  display: flex;
  align-items: stretch;
  gap: var(--esp-3);
  flex-shrink: 0;
}

.stat-card {
  background: rgba(14,8,33,0.5);
  border: 1px solid var(--borde-sutil);
  padding: var(--esp-3) var(--esp-4);
  border-radius: var(--radio-md);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 92px;
  position: relative;
  overflow: hidden;
  transition: var(--trans-normal);
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--morado-brillante);
}
.stat-card:hover { border-color: var(--borde-activo); transform: translateY(-2px); }
.stat-total::before { background: var(--morado-hover); }
.stat-cola::before { background: var(--color-alerta); }
.stat-prep::before { background: var(--rosa-acento); }

.stat-numero {
  font-family: var(--fuente-titulo);
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}
.stat-cola .stat-numero { color: var(--color-alerta); }
.stat-prep .stat-numero { color: var(--rosa-suave); }

.stat-etiq {
  font-size: 0.68rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-top: 5px;
  white-space: nowrap;
}

.btn-refresh {
  background: rgba(168,85,247,0.1);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  width: 46px;
  align-self: stretch;
  border-radius: var(--radio-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--trans-normal);
}

.btn-refresh:hover {
  background: rgba(168,85,247,0.2);
  border-color: var(--borde-activo);
  color: var(--morado-hover);
}
.btn-refresh:active { transform: scale(0.94); }
.btn-refresh:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
  border-color: var(--borde-activo);
}

.girar svg {
  animation: girar 1s linear infinite;
}

@keyframes girar {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mensaje-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 72px 24px 60px;
  color: var(--texto-secundario);
  background: rgba(168,85,247,0.03);
  border-radius: var(--radio-xl);
  border: 1px dashed var(--borde-sutil);
}

.mensaje-vacio h3 {
  font-family: var(--fuente-titulo);
  color: var(--texto-principal);
  font-size: 1.4rem;
  letter-spacing: -0.01em;
  margin-bottom: var(--esp-2);
}
.mensaje-vacio p {
  margin: 0;
  max-width: 42ch;
  text-wrap: pretty;
}

.aviso-error {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: var(--esp-3) var(--esp-4);
  border-radius: var(--radio-md);
  margin-bottom: var(--esp-5);
  font-size: 0.9rem;
  font-weight: 600;
}

.comandas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: var(--esp-5);
}

.comanda-card {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: var(--esp-5) var(--esp-5) var(--esp-4);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(10, 6, 26, 0.45);
  transition: transform var(--trans-normal), box-shadow var(--trans-normal), border-color var(--trans-normal);
}
/* Cinta de estado superior tipo ticket de cocina */
.comanda-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: var(--morado-brillante);
}
.comanda-card.estado-pendiente::before {
  background: linear-gradient(90deg, var(--color-alerta), #fbbf24);
}
.comanda-card.estado-preparando::before {
  background: var(--gradiente-marca);
}
.comanda-card.estado-preparando {
  border-color: rgba(236, 72, 153, 0.35);
}

.comanda-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(10, 6, 26, 0.6), var(--sombra-glow);
  border-color: var(--borde-activo);
}

.comanda-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--esp-3);
}

.comanda-id-wrap {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-family: var(--fuente-titulo);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}
.comanda-id-hash {
  font-size: 1.1rem;
  color: var(--morado-hover);
}
.comanda-id {
  font-size: 1.75rem;
  line-height: 1;
}

.comanda-tiempo {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: var(--texto-secundario);
  background: rgba(168,85,247,0.1);
  border: 1px solid var(--borde-sutil);
  padding: 5px 11px;
  border-radius: var(--radio-full);
  transition: color var(--trans-normal), background var(--trans-normal), border-color var(--trans-normal);
}
.tiempo-num { font-variant-numeric: tabular-nums; font-weight: 800; color: var(--texto-principal); }

.tiempo-critico {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.35);
  animation: pulsoCritico 1.8s ease-in-out infinite;
}
.tiempo-critico .tiempo-num { color: var(--color-error); }
@keyframes pulsoCritico {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.0); }
  50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12); }
}

/* Píldora de estado del ticket */
.comanda-estado-fila {
  margin-bottom: var(--esp-4);
  padding-bottom: var(--esp-4);
  border-bottom: 1px dashed var(--borde-sutil);
}
.estado-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px;
  border-radius: var(--radio-full);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.estado-punto {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.pill-pendiente {
  color: var(--color-alerta);
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.35);
}
.pill-preparando {
  color: var(--rosa-suave);
  background: rgba(236, 72, 153, 0.14);
  border: 1px solid rgba(236, 72, 153, 0.35);
}
.pill-preparando .estado-punto { animation: parpadeoPunto 1.2s ease-in-out infinite; }
@keyframes parpadeoPunto {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.comanda-destino {
  background: rgba(14,8,33,0.5);
  border: 1px solid var(--borde-sutil);
  padding: var(--esp-3) var(--esp-4);
  border-radius: var(--radio-md);
  margin-bottom: var(--esp-4);
}

.destino-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-3);
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.destino-row:last-child {
  margin-bottom: 0;
}

.destino-etiq {
  color: var(--texto-secundario);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  flex-shrink: 0;
}

.destino-val {
  color: var(--texto-principal);
  text-align: right;
  font-weight: 600;
}

.mesa-badge {
  background: var(--gradiente-marca);
  color: #fff;
  padding: 3px 12px;
  border-radius: var(--radio-full);
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(168,85,247,0.35);
}

.comanda-productos {
  flex-grow: 1;
  margin-bottom: var(--esp-5);
}

.prod-titulo {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  font-size: 0.72rem;
  color: var(--texto-secundario);
  margin-bottom: var(--esp-3);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
}
.prod-titulo::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--borde-sutil);
}

.prod-lista {
  list-style: none;
  padding: 0;
  margin: 0;
}

.prod-lista li {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  margin-bottom: var(--esp-2);
  padding: var(--esp-3);
  background: rgba(168,85,247,0.06);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
  transition: background var(--trans-normal), border-color var(--trans-normal), transform var(--trans-rapida);
}
.prod-lista li:last-child { margin-bottom: 0; }
.prod-lista li:hover {
  background: rgba(168,85,247,0.12);
  border-color: var(--borde-activo);
  transform: translateX(2px);
}

.prod-cant {
  background: var(--gradiente-marca);
  color: #fff;
  font-family: var(--fuente-titulo);
  font-weight: 800;
  padding: 4px 9px;
  border-radius: var(--radio-sm);
  font-size: 1rem;
  min-width: 38px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 3px 10px rgba(168,85,247,0.3);
}

.prod-nombre {
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--texto-principal);
  line-height: 1.25;
}

.comanda-acciones {
  margin-top: auto;
}

.btn-preparar {
  width: 100%;
  background: rgba(245, 158, 11, 0.16);
  color: var(--color-alerta);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: var(--esp-3);
  border-radius: var(--radio-md);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: var(--trans-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--esp-2);
}

.btn-preparar:hover:not(:disabled) {
  background: var(--color-alerta);
  color: #1A0F3D;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);
}
.btn-preparar:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
  box-shadow: 0 3px 10px rgba(245, 158, 11, 0.25);
}
.btn-preparar:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35);
}
.btn-preparar:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-completar {
  width: 100%;
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  padding: var(--esp-3);
  border-radius: var(--radio-md);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: var(--trans-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--esp-2);
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.3);
}

.btn-completar:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(236, 72, 153, 0.45), var(--glow-morado);
}
.btn-completar:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
  box-shadow: 0 4px 14px rgba(236, 72, 153, 0.35);
}
.btn-completar:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.4), var(--glow-morado);
}

.btn-completar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animaciones de lista Vue */
.list-enter-active, .list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

/* Responsive */

/* Tablet y pantallas medianas (481px - 1024px) */
@media (max-width: 1024px) {
  .header-titulo {
    font-size: 1.5rem;
  }
}

@media (min-width: 481px) and (max-width: 1024px) {
  .bartender-container {
    padding: 16px;
  }

  .header-top {
    flex-wrap: wrap;
    gap: 15px;
  }

  .header-left {
    flex: 1 1 auto;
    min-width: 0;
  }

  .comandas-grid,
  .historial-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .bartender-header {
    padding: var(--esp-4);
  }

  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .stats-panel {
    width: 100%;
    justify-content: space-between;
  }
  .stat-card { flex: 1 1 0; }

  .bartender-tabs button { flex: 1; text-align: center; }

  .comandas-grid {
    grid-template-columns: 1fr;
  }

  .filtros-historial {
    flex-wrap: wrap;
    gap: 10px;
  }

  .date-picker-container {
    flex: 1 1 100%;
    justify-content: center;
  }
}

/* Celular (<=480px) */
@media (max-width: 480px) {
  .bartender-container {
    padding: 14px;
  }

  .header-titulo {
    font-size: 1.4rem;
  }

  .bartender-tabs button,
  .btn-filtro {
    flex: 1;
    text-align: center;
    padding: 10px 12px;
  }

  .filtros-historial .btn-filtro {
    min-width: 0;
  }

  .hist-info {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .comanda-card,
  .historial-card {
    padding: 16px;
  }

  .btn-preparar,
  .btn-completar {
    padding: 14px;
    font-size: 1.05rem;
  }
}

/* Pestañas */
.bartender-tabs {
  display: flex;
  gap: var(--esp-2);
  margin-top: var(--esp-5);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--borde-sutil);
  position: relative;
  z-index: 1;
}
.bartender-tabs button {
  background: rgba(168,85,247,0.08);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario);
  padding: var(--esp-3) var(--esp-5);
  border-radius: var(--radio-md);
  cursor: pointer;
  transition: var(--trans-normal);
  font-weight: 600;
}
.bartender-tabs button:hover {
  background: rgba(168,85,247,0.16);
  color: var(--texto-principal);
}
.bartender-tabs button:active { transform: scale(0.97); }
.bartender-tabs button:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
}
.bartender-tabs button.activo {
  background: var(--gradiente-marca);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
}

/* Filtros de Fecha Historial */
.filtros-historial {
  display: flex;
  gap: var(--esp-3);
  margin-bottom: var(--esp-5);
  align-items: center;
}
.btn-filtro {
  background: rgba(168,85,247,0.08);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario);
  padding: var(--esp-3) var(--esp-5);
  border-radius: var(--radio-md);
  cursor: pointer;
  transition: var(--trans-normal);
  font-weight: 600;
}
.btn-filtro:hover {
  background: rgba(168,85,247,0.16);
  color: var(--texto-principal);
}
.btn-filtro:active { transform: scale(0.97); }
.btn-filtro:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
}
.btn-filtro.activo {
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
}

.date-picker-container {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  background: rgba(168,85,247,0.08);
  border: 1px solid var(--borde-sutil);
  padding: var(--esp-2) var(--esp-4);
  border-radius: var(--radio-md);
  transition: var(--trans-normal);
}
.date-picker-container.activo,
.date-picker-container:focus-within {
  border-color: var(--borde-activo);
  box-shadow: var(--sombra-glow);
}
.date-picker-container svg {
  color: var(--texto-secundario);
}
.date-picker-container.activo svg {
  color: var(--rosa-acento);
}
.date-picker {
  background: transparent;
  border: none;
  color: var(--texto-principal);
  font-family: inherit;
  font-size: 1rem;
  outline: none;
}
.date-picker::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
  opacity: 0.6;
  transition: 0.2s;
}
.date-picker::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

/* Historial Modernizado */
.historial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: var(--esp-5);
}

.historial-card {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: var(--esp-5);
  display: flex;
  flex-direction: column;
  transition: var(--trans-normal);
}
.historial-card:hover {
  border-color: var(--borde-activo);
  transform: translateY(-3px);
  box-shadow: var(--sombra-tarjeta);
}

.hist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--borde-sutil);
  padding-bottom: var(--esp-3);
  margin-bottom: var(--esp-4);
}
.hist-orden {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  font-family: var(--fuente-titulo);
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}
.hist-orden svg {
  width: 18px; height: 18px;
  color: var(--texto-secundario);
}
.hist-estado {
  display: flex;
  align-items: center;
  gap: var(--esp-1);
  padding: 4px 10px;
  border-radius: var(--radio-full);
  font-size: 0.78rem;
  font-weight: 600;
}
.hist-estado svg {
  width: 14px; height: 14px;
}
.est-completada {
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-exito);
  border: 1px solid rgba(34, 197, 94, 0.25);
}
.est-listo {
  background: rgba(236, 72, 153, 0.12);
  color: var(--rosa-suave);
  border: 1px solid rgba(236, 72, 153, 0.25);
}
.est-cancelada {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.hist-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--esp-4);
  margin-bottom: var(--esp-5);
  background: rgba(14,8,33,0.4);
  padding: var(--esp-3);
  border-radius: var(--radio-md);
}
.info-bloque {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
}
.info-label {
  font-size: 0.7rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.info-valor {
  display: flex;
  align-items: center;
  gap: var(--esp-1);
  color: var(--texto-principal);
  font-size: 0.9rem;
}
.info-valor svg {
  width: 14px; height: 14px;
  color: var(--rosa-suave);
}

.hist-prods {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
}
.hist-prod-item {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  background: rgba(168,85,247,0.06);
  border: 1px solid var(--borde-sutil);
  padding: var(--esp-2) var(--esp-3);
  border-radius: var(--radio-md);
}
.hp-cant {
  background: var(--gradiente-marca);
  color: #fff;
  font-weight: 700;
  font-size: 0.82rem;
  padding: 2px 8px;
  border-radius: var(--radio-sm);
  min-width: 26px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.hp-nom {
  color: var(--texto-principal);
  font-size: 0.95rem;
}

/* Skeletons de carga (misma forma que las tarjetas) */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: var(--esp-5);
}
.comanda-skeleton {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: var(--esp-5);
  box-shadow: var(--sombra-tarjeta);
}
.sk-line,
.sk-bloque,
.sk-boton {
  background: linear-gradient(90deg,
    rgba(168,85,247,0.08) 25%,
    rgba(168,85,247,0.18) 37%,
    rgba(168,85,247,0.08) 63%);
  background-size: 400% 100%;
  border-radius: var(--radio-sm);
  animation: skShimmer 1.4s ease infinite;
}
.sk-line { height: 12px; margin-bottom: var(--esp-3); }
.sk-titulo { height: 20px; width: 45%; margin-bottom: var(--esp-4); }
.sk-corta { width: 60%; }
.sk-bloque { height: 56px; border-radius: var(--radio-md); margin-bottom: var(--esp-4); }
.sk-boton { height: 44px; border-radius: var(--radio-md); margin-top: var(--esp-4); }

@keyframes skShimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}

/* Respeto por usuarios con movimiento reducido */
@media (prefers-reduced-motion: reduce) {
  .comanda-card,
  .historial-card,
  .btn-preparar,
  .btn-completar,
  .btn-refresh,
  .bartender-tabs button,
  .btn-filtro {
    transition: none;
  }
  .comanda-card:hover,
  .historial-card:hover,
  .btn-preparar:hover:not(:disabled),
  .btn-completar:hover:not(:disabled) {
    transform: none;
  }
  .girar svg { animation: none; }
  .sk-line, .sk-bloque, .sk-boton { animation: none; }
  .list-enter-active, .list-leave-active { transition: none; }
  .tiempo-critico { animation: none; }
  .pill-preparando .estado-punto { animation: none; }
  .prod-lista li:hover { transform: none; }
  .stat-card:hover { transform: none; }
}
</style>
