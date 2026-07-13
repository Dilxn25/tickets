<template>
  <div class="caja2 fade-in">
    <!-- ===== Pulso del turno (el header global ya trae logo y Salir) ===== -->
    <header class="c2-top">
      <span class="c2-rol">Caja</span>
      <div class="c2-pulso" v-if="pulso">
        <button class="c2-kpi" @click="panelInicio = 'historial'" title="Recargado hoy · ver transacciones">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <b>Bs {{ formatoMonto(pulso.recargado) }}</b>
        </button>
        <button class="c2-kpi salida" @click="panelInicio = 'retiros'" title="Retirado hoy · ver retiros">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="19 12 12 19 5 12"></polyline><line x1="12" y1="5" x2="12" y2="19"></line></svg>
          <b>Bs {{ formatoMonto(pulso.retirado) }}</b>
        </button>
        <span class="c2-kpi neutro" title="Operaciones de hoy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          <b>{{ pulso.operaciones }}</b>
        </span>
      </div>
    </header>

    <div class="c2-cuerpo" :class="{ enfocado: clienteActivo || creando }">
      <!-- ===== Columna principal: buscador + ficha / asistente ===== -->
      <main class="c2-main">
        <!-- Buscador gigante: el cliente es lo primero -->
        <section v-if="!clienteActivo && !creando" class="c2-busqueda">
          <h1 class="c2-pregunta">¿A quién atiendes?</h1>
          <div class="c2-buscador" :class="{ enfocado: buscadorEnfocado }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              ref="inputBusqueda" v-model="busqueda" @input="buscarDebounce"
              @focus="buscadorEnfocado = true" @blur="buscadorEnfocado = false"
              type="text" placeholder="QR, CI, teléfono, código o nombre" autocomplete="off" />
            <button class="c2-btn-qr" @click="escanerAbierto = true" title="Escanear QR del cliente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
            </button>
          </div>

          <!-- Resultados como tarjetas -->
          <div class="c2-resultados fade-in" v-if="busqueda.trim()">
            <button v-for="c in resultados" :key="c.id_usuario" class="c2-res-card" @click="abrirCliente(c)">
              <span class="c2-avatar">{{ iniciales(c) }}</span>
              <span class="c2-res-txt">
                <b>{{ c.nombres }} {{ c.apellidos }}</b>
                <small>{{ c.billetera?.qr_publico || c.ci_carnet || c.telefono }}</small>
              </span>
              <span v-if="c.billetera" class="c2-res-saldo">Bs {{ formatoMonto(c.billetera.saldo_actual) }}</span>
              <span v-else class="c2-res-sin">sin billetera</span>
            </button>
            <!-- Cliente nuevo: crear billetera con lo escrito -->
            <button key="_crear" class="c2-res-card crear" @click="iniciarCreacion">
              <span class="c2-avatar mas">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </span>
              <span class="c2-res-txt">
                <b>Crear billetera</b>
                <small>{{ pareceIdentificador ? `para «${busqueda.trim()}»` : 'cliente nuevo' }}</small>
              </span>
            </button>
          </div>
        </section>

        <!-- Ficha del cliente (consultar + acciones) -->
        <FichaCliente
          v-if="clienteActivo"
          :cliente="clienteActivo"
          @cerrar="cerrarCliente"
          @refrescar="refrescarCliente"
        />

        <!-- Asistente de nueva billetera (3 pasos) -->
        <AsistenteBilletera
          v-if="creando"
          :identificador-inicial="pareceIdentificador ? busqueda.trim() : ''"
          @cerrar="creando = false"
          @creada="alCrearBilletera"
        />
      </main>

      <!-- ===== Columna lateral: lo vivo de la caja ===== -->
      <aside class="c2-lado" v-if="!clienteActivo && !creando">
        <div class="c2-lado-tabs">
          <button :class="['c2-lado-tab', { activo: panelInicio === 'retiros' }]" @click="panelInicio = 'retiros'">
            Retiros
            <span v-if="retirosPendientes" class="c2-badge">{{ retirosPendientes }}</span>
          </button>
          <button :class="['c2-lado-tab', { activo: panelInicio === 'historial' }]" @click="panelInicio = 'historial'">Historial</button>
        </div>
        <PanelRetiros v-if="panelInicio === 'retiros'" @pendientes="retirosPendientes = $event" @pagado="cargarPulso" />
        <HistorialCaja v-else />
      </aside>
    </div>

    <!-- Escáner QR del cliente -->
    <Teleport to="body">
      <div v-if="escanerAbierto" class="c2-overlay" @click.self="escanerAbierto = false">
        <div class="c2-modal-escaner">
          <CapturaCamara modo="qr" texto-guia="Apunta al QR del cliente" @codigo="alEscanear" />
          <button class="c2-cerrar-escaner" @click="escanerAbierto = false">Cancelar</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'
import FichaCliente from './paneles/FichaCliente.vue'
import AsistenteBilletera from './paneles/AsistenteBilletera.vue'
import PanelRetiros from './paneles/PanelRetiros.vue'
import HistorialCaja from './paneles/HistorialCaja.vue'

// ---- Búsqueda ----
const busqueda = ref('')
const resultados = ref([])
const buscadorEnfocado = ref(false)
const inputBusqueda = ref(null)
let debounce = null
function buscarDebounce() {
  clearTimeout(debounce)
  const q = busqueda.value.trim()
  if (!q) { resultados.value = []; return }
  debounce = setTimeout(async () => {
    try { resultados.value = await clienteHttp.get(`/cajero/buscar-cliente?q=${encodeURIComponent(q)}`) }
    catch { resultados.value = [] }
  }, 220)
}
// Si lo escrito parece CI/teléfono/código, sirve directo para crear la billetera
const pareceIdentificador = computed(() => /^[A-Za-z0-9+\-]{5,}$/.test(busqueda.value.trim()) && /\d/.test(busqueda.value))

function iniciales(c) {
  return `${(c.nombres || '?')[0] || ''}${(c.apellidos || '')[0] || ''}`.toUpperCase()
}
function formatoMonto(v) {
  const n = Number(v) || 0
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ---- Cliente activo (ficha) ----
const clienteActivo = ref(null)
async function abrirCliente(c) {
  // La ficha necesita el detalle completo (saldo fresco + token del QR)
  const idf = c.billetera?.qr_publico || c.ci_carnet || c.telefono || c.correo
  try {
    const detalle = await clienteHttp.get(`/cajero/consultar-billetera/${encodeURIComponent(idf)}`)
    clienteActivo.value = { ...c, ...detalle }
  } catch {
    // Sin billetera: la ficha ofrece crearla
    clienteActivo.value = { ...c, sin_billetera: true }
  }
}
function cerrarCliente() {
  clienteActivo.value = null
  busqueda.value = ''
  resultados.value = []
  cargarPulso()
}
async function refrescarCliente() {
  if (clienteActivo.value) await abrirCliente(clienteActivo.value)
}

// ---- Crear billetera ----
const creando = ref(false)
function iniciarCreacion() { creando.value = true }
function alCrearBilletera() {
  creando.value = false
  busqueda.value = ''
  resultados.value = []
  cargarPulso()
}

// ---- Escáner ----
const escanerAbierto = ref(false)
async function alEscanear(codigo) {
  escanerAbierto.value = false
  if (!codigo) return
  try {
    const r = await clienteHttp.post('/cajero/resolver-qr', { qr: codigo })
    if (r?.qr_publico || r?.id_usuario) {
      busqueda.value = r.qr_publico || ''
      await abrirCliente({ id_usuario: r.id_usuario, nombres: r.nombres, apellidos: r.apellidos, billetera: { qr_publico: r.qr_publico, saldo_actual: r.saldo } })
    }
  } catch {
    busqueda.value = String(codigo).slice(0, 24)
    buscarDebounce()
  }
}

// ---- Panel lateral: retiros + historial + pulso ----
const panelInicio = ref('retiros')
const retirosPendientes = ref(0)
const pulso = ref(null)
async function cargarPulso() {
  try { pulso.value = await clienteHttp.get('/cajero/pulso') } catch { /* sin pulso no pasa nada */ }
}

let socket = null
onMounted(() => {
  cargarPulso()
  inputBusqueda.value?.focus()
  socket = io({ path: '/socket.io' })
  socket.on('retiro_solicitado', () => { retirosPendientes.value++ })
})
onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.caja2 { min-height: 100dvh; display: flex; flex-direction: column; background: var(--fondo-app, #0b0618); }

/* ===== Barra superior ===== */
.c2-top {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  width: 100%; max-width: 1180px; margin: 0 auto; padding: 14px 16px 0;
}
.c2-rol {
  font-size: 0.66rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--morado-hover); background: rgba(168,85,247,0.14);
  border: 1px solid var(--borde-activo); padding: 3px 10px; border-radius: 999px;
}
.c2-pulso { display: flex; gap: 8px; }
.c2-kpi {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
  border-radius: 999px; border: 1px solid var(--borde-sutil);
  background: rgba(34,197,94,0.08); color: var(--color-exito);
  font-size: 0.8rem; cursor: pointer;
}
.c2-kpi.salida { background: rgba(245,158,11,0.08); color: #FCD34D; }
.c2-kpi.neutro { background: rgba(168,85,247,0.08); color: var(--morado-hover); cursor: default; }
.c2-kpi b { font-weight: 800; font-variant-numeric: tabular-nums; }

/* ===== Cuerpo: main + lateral ===== */
.c2-cuerpo {
  flex: 1; display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px;
  width: 100%; max-width: 1180px; margin: 0 auto; padding: 22px 16px 40px;
  box-sizing: border-box;
}
/* min-width:0: los items de grid no encogen bajo su contenido intrínseco sin
   esto, y en celular el contenido se cortaba contra el borde derecho */
.c2-main { min-width: 0; }
@media (min-width: 1100px) {
  .c2-cuerpo { grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr); align-items: start; }
  /* Con la ficha o el asistente abiertos, el foco es uno solo y centrado */
  .c2-cuerpo.enfocado { grid-template-columns: minmax(0, 760px); justify-content: center; }
}

/* ===== Buscador gigante ===== */
.c2-pregunta {
  font-family: var(--fuente-titulo); font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800;
  color: var(--texto-principal); margin: 8px 0 16px; letter-spacing: -0.02em;
}
.c2-buscador {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 8px 6px 18px; border-radius: 20px;
  background: var(--fondo-tarjeta, #17092F); border: 1.5px solid var(--borde-sutil);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  color: var(--texto-desactivado);
}
.c2-buscador.enfocado { border-color: var(--morado-brillante); box-shadow: 0 0 24px rgba(168,85,247,0.18); }
.c2-buscador input {
  flex: 1; min-width: 0; background: none; border: none; outline: none;
  color: var(--texto-principal); font-size: 1.05rem; padding: 14px 0; font-weight: 600;
}
.c2-buscador input::placeholder { color: var(--texto-desactivado); font-weight: 500; }
.c2-btn-qr {
  flex-shrink: 0; width: 46px; height: 46px; border-radius: 14px; border: none;
  background: var(--gradiente-marca, linear-gradient(135deg, #8B5CF6, #EC4899));
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.c2-btn-qr:hover { filter: brightness(1.1); }

/* Resultados */
.c2-resultados { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.c2-res-card {
  display: flex; align-items: center; gap: 14px; text-align: left;
  padding: 12px 14px; border-radius: 16px; cursor: pointer;
  background: var(--fondo-tarjeta, #17092F); border: 1px solid var(--borde-sutil);
  transition: border-color 0.18s ease, transform 0.15s ease;
}
.c2-res-card:hover { border-color: var(--borde-activo); transform: translateY(-1px); }
.c2-res-card.crear { border-style: dashed; background: rgba(168,85,247,0.05); }
.c2-avatar {
  flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(168,85,247,0.16); color: var(--morado-hover);
  font-weight: 800; font-size: 0.95rem;
}
.c2-avatar.mas { background: rgba(168,85,247,0.1); border: 1.5px dashed var(--borde-activo); }
.c2-res-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.c2-res-txt b { color: var(--texto-principal); font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c2-res-txt small { color: var(--texto-desactivado); font-size: 0.76rem; }
.c2-res-saldo { flex-shrink: 0; font-weight: 800; color: var(--color-exito); font-size: 0.9rem; font-variant-numeric: tabular-nums; }
.c2-res-sin { flex-shrink: 0; font-size: 0.72rem; color: var(--texto-desactivado); font-style: italic; }
.c2-res-enter-active, .c2-res-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.c2-res-enter-from, .c2-res-leave-to { opacity: 0; transform: translateY(6px); }

/* ===== Lateral ===== */
.c2-lado { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.c2-lado-tabs { display: flex; gap: 6px; padding: 4px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 999px; align-self: flex-start; }
.c2-lado-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 16px; border: none; background: none; border-radius: 999px;
  color: var(--texto-secundario); font-weight: 700; font-size: 0.84rem; cursor: pointer;
}
.c2-lado-tab.activo { background: var(--gradiente-marca); color: #fff; }
.c2-badge {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
  background: var(--color-error); color: #fff; font-size: 0.68rem; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}

/* Escáner */
.c2-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.c2-modal-escaner { width: min(480px, 94vw); display: flex; flex-direction: column; gap: 12px; }
.c2-cerrar-escaner { padding: 12px; border-radius: 14px; border: 1px solid var(--borde-sutil); background: rgba(255,255,255,0.05); color: var(--texto-principal); font-weight: 700; cursor: pointer; }

@media (max-width: 560px) {
  .c2-top { padding: 8px 12px; gap: 8px; flex-wrap: wrap; }
  .c2-pulso { order: 3; width: 100%; justify-content: space-between; margin-left: 0; }
  .c2-hola { display: none; }
  .c2-cuerpo { padding: 14px 12px 30px; }
}
</style>
