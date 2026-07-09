<template>
  <div class="bar-vista">
    <!-- Encabezado -->
    <header class="bar-head">
      <div class="bar-head-txt">
        <h1><span class="bh-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg></span> Estación de barra</h1>
        <p>Prepara y despacha en tiempo real. Filtra por evento, mesa o cliente para ubicar cualquier pedido.</p>
      </div>
      <button class="bar-refrescar" :class="{ girando: cargando }" @click="recargar" title="Actualizar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
      </button>
    </header>

    <!-- Pestañas -->
    <nav class="bar-tabs">
      <button class="bar-tab" :class="{ activo: pestana === 'tablero' }" @click="pestana = 'tablero'">Tablero</button>
      <button class="bar-tab" :class="{ activo: pestana === 'historial' }" @click="irHistorial">Historial de entregas</button>
    </nav>

    <!-- Filtros -->
    <div class="bar-filtros">
      <div v-if="eventos.length > 1" class="bf-eventos">
        <button class="bf-chip" :class="{ activo: eventoFiltro === null }" @click="setEvento(null)">Todos los eventos</button>
        <button v-for="e in eventos" :key="e.id_evento" class="bf-chip" :class="{ activo: eventoFiltro === e.id_evento }" @click="setEvento(e.id_evento)">{{ e.nombre }}</button>
      </div>
      <div class="bf-buscar">
        <input v-model="busquedaMesa" @input="recargarDebounce" class="bf-input" placeholder="Buscar mesa…" />
        <input v-model="busquedaCliente" @input="recargarDebounce" class="bf-input" placeholder="Buscar cliente…" />
      </div>
    </div>

    <!-- ===== TABLERO KANBAN ===== -->
    <div v-if="pestana === 'tablero'" class="kanban">
      <section v-for="col in columnasDef" :key="col.key" class="kb-col" :class="'col-' + col.key.toLowerCase()">
        <header class="kb-col-head">
          <span class="kb-col-tit">{{ col.titulo }}</span>
          <span class="kb-col-n">{{ (columnas[col.key] || []).length }}</span>
        </header>
        <p v-if="col.key === 'Pendiente' && totalPreparar" class="kb-col-sub">{{ totalPreparar }} bebida(s) por preparar</p>

        <div class="kb-col-body">
          <div v-if="!(columnas[col.key] || []).length" class="kb-vacia">Sin pedidos</div>
          <transition-group name="kb">
            <article
              v-for="c in columnas[col.key]" :key="c.id_comanda"
              class="kb-card" :class="{ critico: colorTiempo(c) === 'rojo', alerta: colorTiempo(c) === 'amarillo' }"
            >
              <div class="kb-card-top">
                <span class="kb-id">#{{ c.id_comanda }}</span>
                <span class="kb-time" :class="colorTiempo(c)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {{ formatoEspera(col.key === 'Listo' && c.minutos_listo != null ? c.minutos_listo : c.minutos_espera) }}
                </span>
              </div>

              <div class="kb-chips">
                <span v-if="c.prioridad_zona >= 2" class="kb-chip vip">★ Zona VIP</span>
                <span v-else-if="c.prioridad_zona === 1" class="kb-chip alta">Prioridad</span>
                <span v-if="c.es_vip_cliente" class="kb-chip cvip">Cliente VIP</span>
                <span class="kb-chip entrega">{{ c.modo_entrega === 'barra' ? 'Recoge en barra' : (c.mesa ? 'A la mesa' : 'Barra/App') }}</span>
              </div>

              <ul class="kb-items">
                <li v-for="(it, i) in c.items" :key="i"><span class="kb-cant">{{ it.cantidad }}×</span> {{ it.nombre }}</li>
              </ul>

              <div class="kb-dest">
                <span v-if="c.mesa" class="kb-mesa">Mesa {{ c.mesa }}</span>
                <span v-if="c.evento" class="kb-ev">{{ c.evento }}</span>
                <span class="kb-cli">{{ c.cliente }}</span>
              </div>
              <div class="kb-meta">
                <span v-if="c.mesero">Asignado a {{ c.mesero }}</span>
                <span class="kb-hora">{{ formatoHora(c.fecha_registro) }}</span>
              </div>

              <button v-if="col.accion" class="kb-btn" :class="col.key.toLowerCase()" :disabled="procesando === c.id_comanda" @click="avanzar(c, col.accion)">
                {{ procesando === c.id_comanda ? '…' : col.accionTexto }}
              </button>
            </article>
          </transition-group>
        </div>
      </section>
    </div>

    <!-- ===== HISTORIAL ===== -->
    <div v-else class="bar-hist">
      <div v-if="cargandoHist" class="bar-cargando"><div class="spinner"></div></div>
      <div v-else-if="!historial.length" class="kb-vacia grande">No hay entregas con estos filtros.</div>
      <div v-else class="hist-lista">
        <article v-for="c in historial" :key="c.id_comanda" class="hist-card">
          <div class="hist-top">
            <span class="kb-id">#{{ c.id_comanda }}</span>
            <span class="hist-hora">{{ formatoFechaHora(c.fecha_registro) }}</span>
          </div>
          <ul class="kb-items">
            <li v-for="(it, i) in c.items" :key="i"><span class="kb-cant">{{ it.cantidad }}×</span> {{ it.nombre }}</li>
          </ul>
          <div class="hist-meta">
            <span v-if="c.mesa" class="kb-mesa">Mesa {{ c.mesa }}</span>
            <span v-if="c.evento" class="kb-ev">{{ c.evento }}</span>
            <span class="kb-cli">{{ c.cliente }}</span>
            <span v-if="c.mesero" class="hist-mesero">Atendió {{ c.mesero }}</span>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()

const pestana = ref('tablero')
const columnas = ref({ Pendiente: [], Preparando: [], Listo: [] })
const eventos = ref([])
const historial = ref([])
const cargando = ref(false)
const cargandoHist = ref(false)
const procesando = ref(null)
const eventoFiltro = ref(null)
const busquedaMesa = ref('')
const busquedaCliente = ref('')
const ahoraTick = ref(Date.now())

let socket = null, intervalo = null, tickTimer = null, debounce = null

const columnasDef = [
  { key: 'Pendiente', titulo: 'En cola', accion: 'Preparando', accionTexto: 'Empezar a preparar' },
  { key: 'Preparando', titulo: 'Preparando', accion: 'Listo', accionTexto: 'Marcar listo' },
  { key: 'Listo', titulo: 'Listo / entrega', accion: 'Completada', accionTexto: 'Marcar entregado' },
]

const totalPreparar = computed(() =>
  (columnas.value.Pendiente || []).reduce((a, c) => a + (c.total_items || 0), 0)
)

function paramsFiltro() {
  const p = {}
  if (eventoFiltro.value) p.evento = eventoFiltro.value
  if (busquedaMesa.value.trim()) p.mesa = busquedaMesa.value.trim()
  if (busquedaCliente.value.trim()) p.cliente = busquedaCliente.value.trim()
  return p
}

async function cargarTablero() {
  cargando.value = true
  try {
    const r = await clienteHttp.get('/comandas/tablero', { params: paramsFiltro() })
    columnas.value = r.columnas || { Pendiente: [], Preparando: [], Listo: [] }
    eventos.value = r.eventos || []
  } catch { /* deja lo previo */ }
  finally { cargando.value = false }
}

async function cargarHistorial() {
  cargandoHist.value = true
  try { historial.value = await clienteHttp.get('/comandas/historial-bartender', { params: paramsFiltro() }) }
  catch { historial.value = [] }
  finally { cargandoHist.value = false }
}

function recargar() { pestana.value === 'tablero' ? cargarTablero() : cargarHistorial() }
function recargarDebounce() { clearTimeout(debounce); debounce = setTimeout(recargar, 350) }
function setEvento(id) { eventoFiltro.value = id; recargar() }
function irHistorial() { pestana.value = 'historial'; cargarHistorial() }

async function avanzar(c, nuevoEstado) {
  procesando.value = c.id_comanda
  try {
    await clienteHttp.patch(`/comandas/${c.id_comanda}/estado`, { estado: nuevoEstado })
    await cargarTablero()
  } catch {
    notif.error('No se pudo actualizar la orden.')
  } finally { procesando.value = null }
}

// Cronómetro: color según minutos (base para Fase L: 2 amarillo, 6 rojo)
function colorTiempo(c) {
  const min = (c.minutos_listo != null && c.estado === 'Listo') ? c.minutos_listo : c.minutos_espera
  if (min >= 6) return 'rojo'
  if (min >= 2) return 'amarillo'
  return ''
}
function formatoEspera(min) {
  if (min == null) return ''
  if (min < 60) return `${min} min`
  if (min < 1440) return `${Math.floor(min / 60)} h`
  return `${Math.floor(min / 1440)} d`
}
function formatoHora(f) { try { return new Date(f).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
function formatoFechaHora(f) { try { return new Date(f).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

onMounted(() => {
  cargarTablero()
  intervalo = setInterval(cargarTablero, 12000)
  tickTimer = setInterval(() => { ahoraTick.value = Date.now() }, 1000)
  const urlBackend = import.meta.env.VITE_URL_BACKEND || 'http://localhost:3000'
  socket = io(urlBackend)
  socket.on('nueva_comanda', () => cargarTablero())
  socket.on('pedido_listo', () => cargarTablero())
  socket.on('pedido_pool', () => cargarTablero())
  socket.on('pedido_tomado', () => cargarTablero())
})
onUnmounted(() => {
  if (intervalo) clearInterval(intervalo)
  if (tickTimer) clearInterval(tickTimer)
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.bar-vista { padding: var(--esp-5); max-width: 1320px; margin: 0 auto; }
.bar-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--esp-4); margin-bottom: var(--esp-4); }
.bar-head h1 { display: flex; align-items: center; gap: 12px; font-family: var(--fuente-titulo); font-size: 1.6rem; font-weight: 800; color: var(--texto-principal); }
.bh-ic { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radio-md); background: var(--gradiente-marca); color: #fff; box-shadow: 0 6px 18px rgba(168,85,247,0.4); }
.bar-head p { color: var(--texto-secundario); font-size: 0.9rem; margin-top: 6px; max-width: 60ch; }
.bar-refrescar { flex-shrink: 0; width: 44px; height: 44px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: rgba(168,85,247,0.1); color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.bar-refrescar:hover { background: rgba(168,85,247,0.2); }
.girando svg { animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

.bar-tabs { display: flex; gap: 8px; margin-bottom: var(--esp-4); }
.bar-tab { padding: 10px 20px; border-radius: var(--radio-full); border: 1px solid var(--borde-sutil); background: rgba(168,85,247,0.08); color: var(--texto-secundario); font-weight: 700; font-size: 0.88rem; cursor: pointer; }
.bar-tab.activo { background: var(--gradiente-marca); border-color: transparent; color: #fff; }

.bar-filtros { display: flex; flex-direction: column; gap: 10px; margin-bottom: var(--esp-5); }
.bf-eventos { display: flex; flex-wrap: wrap; gap: 8px; }
.bf-chip { padding: 6px 14px; border-radius: var(--radio-full); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta); color: var(--texto-secundario); font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.bf-chip.activo { border-color: var(--morado-brillante); color: var(--texto-principal); background: rgba(168,85,247,0.12); }
.bf-buscar { display: flex; gap: 10px; flex-wrap: wrap; }
.bf-input { flex: 1; min-width: 160px; background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 10px 14px; border-radius: var(--radio-md); font-size: 0.88rem; outline: none; }
.bf-input:focus { border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }

/* Kanban */
.kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--esp-4); align-items: start; }
@media (max-width: 900px) { .kanban { grid-template-columns: 1fr; } }
.kb-col { background: rgba(14,8,33,0.4); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: var(--esp-3); min-height: 120px; }
.kb-col-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 10px; border-bottom: 2px solid transparent; margin-bottom: 10px; }
.col-pendiente .kb-col-head { border-color: var(--color-alerta); }
.col-preparando .kb-col-head { border-color: var(--rosa-acento); }
.col-listo .kb-col-head { border-color: var(--color-exito); }
.kb-col-tit { font-weight: 800; color: var(--texto-principal); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; }
.kb-col-n { background: rgba(168,85,247,0.2); color: var(--morado-hover); font-weight: 800; border-radius: 999px; padding: 2px 10px; font-size: 0.8rem; }
.kb-col-sub { font-size: 0.75rem; color: var(--texto-secundario); padding: 0 8px 8px; }
.kb-col-body { display: flex; flex-direction: column; gap: 10px; }
.kb-vacia { text-align: center; color: var(--texto-desactivado); font-size: 0.84rem; padding: 20px 0; }
.kb-vacia.grande { padding: 3rem; }

.kb-card { background: var(--gradiente-sutil); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); padding: 12px 13px; box-shadow: 0 6px 18px rgba(10,6,26,0.35); }
.kb-card.alerta { border-color: rgba(245,158,11,0.4); }
.kb-card.critico { border-color: rgba(239,68,68,0.5); box-shadow: 0 0 18px rgba(239,68,68,0.15); }
.kb-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.kb-id { font-family: var(--fuente-titulo); font-weight: 800; color: var(--texto-principal); font-size: 1.05rem; }
.kb-time { display: inline-flex; align-items: center; gap: 4px; font-size: 0.74rem; font-weight: 700; color: var(--texto-secundario); background: rgba(168,85,247,0.1); padding: 3px 8px; border-radius: 999px; }
.kb-time.amarillo { color: #FCD34D; background: rgba(245,158,11,0.15); }
.kb-time.rojo { color: #FCA5A5; background: rgba(239,68,68,0.18); }
.kb-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.kb-chip { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; padding: 2px 7px; border-radius: 999px; }
.kb-chip.vip { background: linear-gradient(135deg, #FBBF24, #F59E0B); color: #1a1206; }
.kb-chip.alta { background: rgba(168,85,247,0.2); color: #E9D5FF; }
.kb-chip.cvip { background: rgba(236,72,153,0.16); color: #F9A8D4; }
.kb-chip.entrega { background: rgba(255,255,255,0.06); color: var(--texto-secundario); border: 1px solid var(--borde-sutil); }
.kb-items { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.kb-items li { font-size: 0.88rem; color: var(--texto-principal); }
.kb-cant { color: var(--morado-hover); font-weight: 800; }
.kb-dest { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 6px; }
.kb-mesa { background: var(--gradiente-marca); color: #fff; font-weight: 700; font-size: 0.72rem; padding: 2px 9px; border-radius: 999px; }
.kb-ev { background: rgba(99,102,241,0.16); color: #C7D2FE; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.kb-cli { font-size: 0.78rem; color: var(--texto-secundario); }
.kb-meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.7rem; color: var(--texto-desactivado); margin-bottom: 10px; }
.kb-btn { width: 100%; padding: 9px; border-radius: var(--radio-md); border: none; font-weight: 700; font-size: 0.84rem; cursor: pointer; }
.kb-btn.pendiente { background: rgba(245,158,11,0.16); color: var(--color-alerta); border: 1px solid rgba(245,158,11,0.4); }
.kb-btn.pendiente:hover:not(:disabled) { background: var(--color-alerta); color: #1a0f3d; }
.kb-btn.preparando { background: var(--gradiente-marca); color: #fff; }
.kb-btn.listo { background: rgba(34,197,94,0.16); color: var(--color-exito); border: 1px solid rgba(34,197,94,0.4); }
.kb-btn.listo:hover:not(:disabled) { background: var(--color-exito); color: #052e16; }
.kb-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.kb-enter-active, .kb-leave-active { transition: all 0.35s ease; }
.kb-enter-from { opacity: 0; transform: translateY(10px); }
.kb-leave-to { opacity: 0; transform: scale(0.94); }

/* Historial */
.bar-cargando { display: flex; justify-content: center; padding: 3rem; }
.spinner { width: 34px; height: 34px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
.hist-lista { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: var(--esp-4); }
.hist-card { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: var(--esp-4); }
.hist-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--borde-sutil); }
.hist-hora { font-size: 0.78rem; color: var(--texto-secundario); }
.hist-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
.hist-mesero { font-size: 0.74rem; color: var(--texto-desactivado); }
</style>
