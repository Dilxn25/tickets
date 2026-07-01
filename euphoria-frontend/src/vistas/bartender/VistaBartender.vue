<template>
  <div class="bartender-container fade-in">
    <!-- Header: Estadísticas rápidas -->
    <header class="bartender-header">
      <div class="header-left">
        <h1 class="header-titulo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg> Euphoria Bar Station</h1>
        
        <nav class="bartender-tabs">
          <button :class="{ activo: pestana === 'pendientes' }" @click="cambiarPestana('pendientes')">En Cola</button>
          <button :class="{ activo: pestana === 'historial' }" @click="cambiarPestana('historial')">Historial</button>
        </nav>
      </div>

      <div class="stats-panel" v-if="pestana === 'pendientes'">
        <div class="stat-card">
          <span class="stat-numero">{{ comandasSinIniciar }}</span>
          <span class="stat-etiq">Sin iniciar</span>
        </div>
        <div class="stat-card">
          <span class="stat-numero">{{ comandasEnPreparacion }}</span>
          <span class="stat-etiq">En preparación</span>
        </div>
        <button class="btn-refresh" @click="cargarComandas(true)" :class="{'girar': cargando}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        </button>
      </div>
    </header>

    <div class="contenido-barra">
      <!-- Vista EN COLA -->
      <div v-if="pestana === 'pendientes'">
        <div v-if="errorCarga" class="aviso-error fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {{ errorCarga }}
        </div>
        <div v-if="cargando && primerCarga && comandas.length === 0" class="mensaje-vacio">
          Cargando pedidos...
        </div>
        
        <div v-else-if="comandas.length === 0" class="mensaje-vacio fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" width="60" height="60" style="margin-bottom:10px; stroke: var(--color-exito);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <h3>No hay pedidos pendientes</h3>
          <p>¡Buen trabajo! La barra está al día.</p>
        </div>

        <!-- Lista de Comandas (Tarjetas) -->
        <div v-else class="comandas-grid">
          <transition-group name="list">
            <div v-for="comanda in comandas" :key="comanda.id_comanda" class="comanda-card">
              
              <div class="comanda-header">
                <div class="comanda-id">Orden #{{ comanda.id_comanda }}</div>
                <div class="comanda-tiempo" :class="{'tiempo-critico': minutosTranscurridos(comanda.fecha_registro) > 10}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Hace {{ minutosTranscurridos(comanda.fecha_registro) }} min
                </div>
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
                    Empezar a Preparar
                  </span>
                </button>

                <button v-if="comanda.estado_despacho === 'Preparando'" class="btn-completar" @click="cambiarEstado(comanda.id_comanda, 'Listo')" :disabled="procesandoId === comanda.id_comanda">
                  <span v-if="procesandoId === comanda.id_comanda">Procesando...</span>
                  <span v-else>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Marcar como Listo
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

        <div v-if="cargandoHistorial" class="mensaje-vacio">
          Buscando historial de fecha seleccionada...
        </div>
        
        <div v-else-if="historial.length === 0" class="mensaje-vacio">
          <h3>Aún no hay pedidos en esta fecha</h3>
          <p>Los pedidos que se prepararon aparecerán aquí.</p>
        </div>
        
        <div v-else class="historial-grid">
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
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
  min-height: calc(100dvh - 60px);
}

.bartender-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
  border-bottom: 2px solid rgba(255,255,255,0.05);
  padding-bottom: 15px;
}

.header-titulo {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 5px 0;
  background: linear-gradient(90deg, var(--rosa-acento), var(--morado-medio));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-sub {
  color: var(--texto-secundario);
  margin: 0;
  font-size: 0.95rem;
}

.stats-panel {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-card {
  background: rgba(114, 9, 183, 0.1);
  border: 1px solid rgba(114, 9, 183, 0.3);
  padding: 10px 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-numero {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--rosa-acento);
}

.stat-etiq {
  font-size: 0.75rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-refresh {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  width: 45px;
  height: 45px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-refresh:hover {
  background: rgba(255,255,255,0.1);
}

.girar svg {
  animation: girar 1s linear infinite;
}

@keyframes girar {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mensaje-vacio {
  text-align: center;
  padding: 60px 20px;
  color: var(--texto-secundario);
  background: rgba(255,255,255,0.02);
  border-radius: 20px;
  border: 1px dashed rgba(255,255,255,0.1);
}

.mensaje-vacio h3 {
  color: white;
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.aviso-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-error);
  background: rgba(239, 71, 111, 0.1);
  border: 1px solid rgba(239, 71, 111, 0.25);
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.comandas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: 20px;
}

.comanda-card {
  background: var(--fondo-tarjeta);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}

.comanda-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(114, 9, 183, 0.15);
  border-color: rgba(114, 9, 183, 0.3);
}

.comanda-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.comanda-id {
  font-weight: 800;
  font-size: 1.2rem;
  color: white;
}

.comanda-tiempo {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  color: var(--texto-secundario);
  background: rgba(255,255,255,0.05);
  padding: 4px 10px;
  border-radius: 20px;
}

.tiempo-critico {
  color: var(--color-error);
  background: rgba(239, 71, 111, 0.1);
}

.comanda-destino {
  background: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.destino-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.9rem;
}

.destino-row:last-child {
  margin-bottom: 0;
}

.destino-etiq {
  color: var(--texto-secundario);
}

.destino-val {
  color: white;
  text-align: right;
}

.mesa-badge {
  background: var(--rosa-acento);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.comanda-productos {
  flex-grow: 1;
  margin-bottom: 20px;
}

.prod-titulo {
  font-size: 0.9rem;
  color: var(--texto-secundario);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.prod-lista {
  list-style: none;
  padding: 0;
  margin: 0;
}

.prod-lista li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
}

.prod-cant {
  background: var(--morado-medio);
  color: white;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9rem;
  min-width: 30px;
  text-align: center;
}

.prod-nombre {
  font-size: 1rem;
  color: white;
  line-height: 1.3;
}

.comanda-acciones {
  margin-top: auto;
}

.btn-preparar {
  width: 100%;
  background: var(--color-alerta);
  color: #000;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-preparar:hover:not(:disabled) {
  background: #e6a500;
  transform: scale(1.02);
}

.btn-completar {
  width: 100%;
  background: var(--color-exito);
  color: #000;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-completar:hover:not(:disabled) {
  background: #05b586;
  transform: scale(1.02);
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
    font-size: clamp(1.4rem, 4vw, 2rem);
  }
}

@media (min-width: 481px) and (max-width: 1024px) {
  .bartender-container {
    padding: 16px;
  }

  .bartender-header {
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
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .stats-panel {
    width: 100%;
    justify-content: space-between;
  }

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
  gap: 10px;
  margin-top: 15px;
}
.bartender-tabs button {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--texto-secundario);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
}
.bartender-tabs button:hover {
  background: rgba(255,255,255,0.1);
}
.bartender-tabs button.activo {
  background: var(--morado-medio);
  color: white;
  border-color: var(--morado-medio);
}

/* Filtros de Fecha Historial */
.filtros-historial {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  align-items: center;
}
.btn-filtro {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--texto-secundario);
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: bold;
}
.btn-filtro:hover {
  background: rgba(255,255,255,0.1);
}
.btn-filtro.activo {
  background: linear-gradient(90deg, var(--rosa-acento), var(--morado-medio));
  color: white;
  border: none;
}

.date-picker-container {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 15px;
  border-radius: 8px;
  transition: all 0.3s;
}
.date-picker-container.activo {
  border-color: var(--rosa-acento);
  box-shadow: 0 0 10px rgba(247, 37, 133, 0.3);
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
  color: white;
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
  gap: 20px;
}

.historial-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}
.historial-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255,255,255,0.1);
  transform: translateY(-3px);
}

.hist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 12px;
  margin-bottom: 15px;
}
.hist-orden {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 800;
  color: white;
}
.hist-orden svg {
  width: 18px; height: 18px;
  color: var(--texto-secundario);
}
.hist-estado {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
}
.hist-estado svg {
  width: 14px; height: 14px;
}
.est-completada {
  background: rgba(6, 214, 160, 0.1);
  color: var(--color-exito);
  border: 1px solid rgba(6, 214, 160, 0.2);
}
.est-listo {
  background: rgba(247, 37, 133, 0.1);
  color: var(--rosa-acento);
  border: 1px solid rgba(247, 37, 133, 0.2);
}
.est-cancelada {
  background: rgba(239, 71, 111, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(239, 71, 111, 0.2);
}

.hist-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
  background: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 8px;
}
.info-bloque {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-label {
  font-size: 0.75rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.info-valor {
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  font-size: 0.9rem;
}
.info-valor svg {
  width: 14px; height: 14px;
  color: var(--rosa-acento);
}

.hist-prods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hist-prod-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.03);
  padding: 8px 12px;
  border-radius: 8px;
}
.hp-cant {
  background: var(--morado-medio);
  color: white;
  font-weight: 800;
  font-size: 0.85rem;
  padding: 2px 8px;
  border-radius: 4px;
  min-width: 25px;
  text-align: center;
}
.hp-nom {
  color: white;
  font-size: 0.95rem;
}
</style>
