<template>
  <div class="bar-vista">
    <!-- Encabezado -->
    <header class="bar-head">
      <!-- El tablero se actualiza solo por socket (nueva_comanda / pedido_listo / pool / tomado). -->
      <div class="bar-head-txt">
        <h1><span class="bh-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg></span> Estación de barra</h1>
      </div>
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
        <input v-model="busquedaMesa" @input="recargarDebounce" class="bf-input" placeholder="Buscar mesa por texto…" />
        <input v-model="busquedaCliente" @input="recargarDebounce" class="bf-input" placeholder="Buscar cliente…" />
        <button class="bf-mapa-btn" @click="abrirMapa" title="Buscar mesa en el mapa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
          Mapa
        </button>
        <button v-if="busquedaMesa" class="bf-limpiar" @click="busquedaMesa = ''; recargar()">Quitar filtro de mesa</button>
      </div>
    </div>

    <!-- Modal de mapa para filtrar por mesa -->
    <Teleport to="body">
      <div v-if="mapaAbierto" class="bmapa-overlay" @click.self="mapaAbierto = false">
        <div class="bmapa-modal">
          <header class="bmapa-cab">
            <b>Toca una mesa para ver sus pedidos</b>
            <button class="bmapa-cerrar" @click="mapaAbierto = false" aria-label="Cerrar">×</button>
          </header>
          <div v-if="!planosMapa.length" class="bmapa-vacia">No hay planos con mesas en este evento.</div>
          <div class="bmapa-scroll">
            <div v-for="z in planosMapa" :key="z.id_zona" class="bmapa-zona">
              <div class="bmapa-zona-tit">{{ z.nombre_zona }}</div>
              <div class="bmapa-plano" :style="{ aspectRatio: z.proporcion || 1.6 }">
                <button
                  v-for="m in z.mesas" :key="m.id_mesa" type="button"
                  class="bmapa-elem" :class="{ deco: !(m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') }"
                  :style="estiloMapaElem(m)"
                  @click="filtrarPorMesa(m)"
                ><span>{{ m.numero_nombre }}</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <transition name="fade-tab" mode="out-in">
    <!-- ===== TABLERO KANBAN ===== -->
    <div v-if="pestana === 'tablero'" key="tablero" class="kanban">
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
              class="kb-card" :class="{ critico: ['rojo','critico'].includes(colorTiempo(c)), alerta: colorTiempo(c) === 'amarillo' }"
            >
              <div class="kb-card-top">
                <span class="kb-id">#{{ c.id_comanda }}</span>
                <span class="kb-time" :class="colorTiempo(c)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {{ cronoVivo(c) }}
                </span>
              </div>

              <div class="kb-chips">
                <span v-if="c.prioridad_zona >= 2" class="kb-chip vip">★ Zona VIP</span>
                <span v-else-if="c.prioridad_zona === 1" class="kb-chip alta">Prioridad</span>
                <span v-if="c.es_vip_cliente" class="kb-chip cvip">Cliente VIP</span>
                <span class="kb-chip entrega">{{ c.modo_entrega === 'barra' ? 'Recoge en barra' : (c.mesa ? 'A la mesa' : 'Barra/App') }}</span>
              </div>

              <ul class="kb-items">
                <li v-for="(it, i) in c.items" :key="i" class="kb-item">
                  <span class="kb-item-foto">
                    <img v-if="it.imagen" :src="it.imagen" :alt="it.nombre" loading="lazy" />
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="20" height="20"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg>
                  </span>
                  <span class="kb-cant">{{ it.cantidad }}×</span>
                  <span class="kb-item-nom">{{ it.nombre }}</span>
                </li>
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

              <!-- Pendiente / Preparando: avanzar normal -->
              <button v-if="col.accion && col.key !== 'Listo'" class="kb-btn" :class="col.key.toLowerCase()" :disabled="procesando === c.id_comanda" @click="avanzar(c, col.accion)">
                {{ procesando === c.id_comanda ? '…' : col.accionTexto }}
              </button>
              <!-- Listo: la entrega depende de cómo lo recibe el pedido -->
              <template v-else-if="col.key === 'Listo'">
                <!-- El cliente recoge en barra: se confirma escaneando SU QR -->
                <button v-if="c.modo_entrega === 'barra'" class="kb-btn listo" :disabled="procesando === c.id_comanda" @click="entregarCliente(c)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="3" y1="12" x2="21" y2="12"></line></svg>
                  Entregar al cliente
                </button>
                <!-- Va a la mesa (mesero): handoff con confirmación mutua -->
                <template v-else>
                  <div v-if="c.estado_entrega === 'barra_entrego'" class="kb-espera">Esperando que el mesero confirme…</div>
                  <div v-else-if="c.estado_entrega === 'mesero_confirma'" class="kb-espera ok">El mesero recogió · confirma la entrega</div>
                  <button class="kb-btn listo" :disabled="procesando === c.id_comanda || c.estado_entrega === 'barra_entrego'" @click="entregarMesero(c)">
                    {{ c.estado_entrega === 'mesero_confirma' ? 'Confirmar entrega' : 'Entregué al mesero' }}
                  </button>
                </template>
              </template>
            </article>
          </transition-group>
        </div>
      </section>
    </div>

    <!-- ===== HISTORIAL ===== -->
    <div v-else key="hist" class="bar-hist">
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
    </transition>

    <!-- Entregar al cliente: escanear SU QR para confirmar (protege al cliente) -->
    <Teleport to="body">
      <div v-if="modalQrCliente" class="bmapa-overlay" @click.self="modalQrCliente = false">
        <div class="qrcli-modal">
          <header class="qrcli-cab">
            <b>Escanea el QR del cliente</b>
            <button class="bmapa-cerrar" @click="modalQrCliente = false" aria-label="Cerrar">×</button>
          </header>
          <p class="qrcli-sub">Pídele al cliente su QR para confirmar que él recibe el pedido #{{ comandaEntrega?.id_comanda }}.</p>
          <CapturaCamara modo="qr" texto-guia="Apunta al QR del cliente" @codigo="alEscanearQrCliente" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { servicioAforo } from '@/servicios-api/servicio-aforo.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'

const notif = useNotificaciones()

// Entrega al CLIENTE (modo barra): se confirma escaneando SU QR
const modalQrCliente = ref(false)
const comandaEntrega = ref(null)
function entregarCliente(c) { comandaEntrega.value = c; modalQrCliente.value = true }
async function alEscanearQrCliente(qr) {
  const c = comandaEntrega.value
  modalQrCliente.value = false
  if (!c) return
  procesando.value = c.id_comanda
  try {
    await clienteHttp.post(`/comandas/${c.id_comanda}/entregar-cliente`, { qr_cliente: qr })
    await cargarTablero()
    notif.exito('Entregado al cliente')
  } catch (e) {
    notif.error(e?.response?.data?.error || e?.error || 'No se pudo confirmar la entrega')
  } finally { procesando.value = null; comandaEntrega.value = null }
}

// Entrega al MESERO (modo llevar): handoff con confirmación mutua
async function entregarMesero(c) {
  procesando.value = c.id_comanda
  try {
    const r = await clienteHttp.post(`/comandas/${c.id_comanda}/barra-entrego`)
    await cargarTablero()
    notif.exito(r.confirmado ? 'Pedido entregado al mesero' : 'Marcado. Esperando que el mesero confirme.')
  } catch (e) {
    notif.error(e?.response?.data?.error || e?.error || 'No se pudo registrar la entrega')
  } finally { procesando.value = null }
}

// Filtro por mapa
const mapaAbierto = ref(false)
const planosMapa = ref([])
async function abrirMapa() {
  mapaAbierto.value = true
  planosMapa.value = []
  let idEv = eventoFiltro.value || eventos.value[0]?.id_evento
  // Si no hay evento en el tablero, usa el evento en curso (con zonas)
  if (!idEv) {
    try {
      const evs = await servicioAforo.listarEventos()
      idEv = (evs || []).find(e => e.estado === 'en_transcurso' || e.estado === 'lleno' || e.estado === 'promocion')?.id_evento || evs?.[0]?.id_evento
    } catch { /* sin eventos */ }
  }
  if (!idEv) return
  try {
    const r = await servicioAforo.obtenerPlanos(idEv)
    planosMapa.value = (r.zonas || []).filter(z => (z.mesas || []).length)
  } catch { planosMapa.value = [] }
}
function estiloMapaElem(m) {
  return {
    left: (m.posicion_x || 0) + '%', top: (m.posicion_y || 0) + '%',
    width: (m.ancho || 8) + '%', height: (m.alto || 8) + '%',
    transform: `translate(-50%, -50%) rotate(${m.rotacion || 0}deg)`,
    borderRadius: m.forma === 'redondo' ? '50%' : '8px',
  }
}
function filtrarPorMesa(m) {
  if (m.tipo_elemento !== 'mesa' && m.tipo_elemento !== 'silla') return
  busquedaMesa.value = String(m.numero_nombre)
  mapaAbierto.value = false
  recargar()
}

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

// Merge suave: conserva los objetos existentes (por id) para que transition-group
// no re-anime todas las tarjetas en cada refresco (evita el "parpadeo" de recarga).
function mergeColumna(vieja, nueva) {
  const mapa = new Map((vieja || []).map(c => [c.id_comanda, c]))
  return (nueva || []).map(n => {
    const v = mapa.get(n.id_comanda)
    if (v) { Object.assign(v, n); return v }
    return n
  })
}

async function cargarTablero(conSpinner = false) {
  if (conSpinner) cargando.value = true
  try {
    const r = await clienteHttp.get('/comandas/tablero', { params: paramsFiltro() })
    const c = r.columnas || { Pendiente: [], Preparando: [], Listo: [] }
    columnas.value = {
      Pendiente: mergeColumna(columnas.value.Pendiente, c.Pendiente),
      Preparando: mergeColumna(columnas.value.Preparando, c.Preparando),
      Listo: mergeColumna(columnas.value.Listo, c.Listo),
    }
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

// Cronómetro EN VIVO: cuenta desde que el pedido entró (o quedó listo), con el
// tick de 1s. Formato s / m:s / h:m:s. Color: 2 min amarillo, 5 rojo, 7 crítico.
function fechaBase(c) {
  return (c.estado === 'Listo' && c.fecha_listo) ? c.fecha_listo : c.fecha_registro
}
function segundosVivo(c) {
  const f = fechaBase(c)
  if (!f) return 0
  return Math.max(0, Math.floor((ahoraTick.value - new Date(f).getTime()) / 1000))
}
function cronoVivo(c) {
  const s = segundosVivo(c)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  if (m > 0) return `${m}:${String(sec).padStart(2, '0')}`
  return `${sec}s`
}
function colorTiempo(c) {
  const min = Math.floor(segundosVivo(c) / 60)
  if (min >= 7) return 'critico'
  if (min >= 5) return 'rojo'
  if (min >= 2) return 'amarillo'
  return ''
}
function formatoHora(f) { try { return new Date(f).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
function formatoFechaHora(f) { try { return new Date(f).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

onMounted(() => {
  cargarTablero(true)
  intervalo = setInterval(() => cargarTablero(false), 10000)
  tickTimer = setInterval(() => { ahoraTick.value = Date.now() }, 1000)
  // Mismo origen (en producción el backend sirve el frontend; en dev Vite hace
  // proxy de /socket.io). Antes usaba localhost:3000 y no conectaba en producción.
  socket = io({ path: '/socket.io' })
  socket.on('nueva_comanda', () => cargarTablero())
  socket.on('pedido_listo', () => cargarTablero())
  socket.on('pedido_pool', () => cargarTablero())
  socket.on('pedido_tomado', () => cargarTablero())
  // Handoff: el mesero recogió/confirmó -> refrescar para ver el estado de espera
  socket.on('pedido_recogido', () => cargarTablero())
  socket.on('pedido_entrega', () => cargarTablero())
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
/* Handoff: aviso de "esperando confirmación" del otro lado */
.kb-espera { font-size: 0.74rem; font-weight: 700; text-align: center; padding: 6px 8px; border-radius: var(--radio-md); margin-bottom: 6px; background: rgba(245,158,11,0.14); color: var(--color-alerta); }
.kb-espera.ok { background: rgba(34,197,94,0.14); color: var(--color-exito); }
/* Modal QR del cliente */
.qrcli-modal { width: 100%; max-width: 460px; background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: var(--radio-xl); box-shadow: 0 30px 70px rgba(0,0,0,0.6); padding: 18px; }
.qrcli-cab { display: flex; align-items: center; justify-content: space-between; }
.qrcli-cab b { font-family: var(--fuente-titulo); font-size: 1.1rem; }
.qrcli-sub { font-size: 0.82rem; color: var(--texto-secundario); margin: 6px 0 14px; }
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
.bf-mapa-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: var(--radio-md); border: 1px solid var(--borde-activo); background: rgba(168,85,247,0.1); color: var(--morado-hover); font-weight: 700; font-size: 0.84rem; cursor: pointer; white-space: nowrap; }
.bf-mapa-btn:hover { background: rgba(168,85,247,0.2); color: var(--texto-principal); }
.bf-limpiar { padding: 10px 14px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.bf-limpiar:hover { color: var(--color-error); border-color: rgba(239,68,68,0.4); }

/* Modal de mapa (filtrar por mesa) */
.bmapa-overlay { position: fixed; inset: 0; z-index: 1200; background: rgba(6,4,16,0.78); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.bmapa-modal { width: min(680px, 96vw); max-height: 90vh; display: flex; flex-direction: column; background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: var(--radio-xl); overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.6); }
.bmapa-cab { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--borde-sutil); }
.bmapa-cab b { color: var(--texto-principal); }
.bmapa-cerrar { width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: var(--texto-principal); font-size: 1.3rem; line-height: 1; cursor: pointer; }
.bmapa-vacia { padding: 2rem; text-align: center; color: var(--texto-desactivado); }
.bmapa-scroll { overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 18px; }
.bmapa-zona-tit { font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
.bmapa-plano { position: relative; width: 100%; background: var(--fondo-app); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); overflow: hidden; }
.bmapa-elem { position: absolute; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--morado-brillante); background: rgba(168,85,247,0.4); font-size: 0.62rem; font-weight: 700; color: #fff; cursor: pointer; padding: 0; }
.bmapa-elem:hover { background: rgba(168,85,247,0.8); }
.bmapa-elem span { pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92%; }
.bmapa-elem.deco { background: rgba(80,80,100,0.25); border-color: transparent; cursor: default; }

/* Transición suave entre Tablero e Historial (evita el salto brusco) */
.fade-tab-enter-active, .fade-tab-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-tab-enter-from { opacity: 0; transform: translateY(6px); }
.fade-tab-leave-to { opacity: 0; transform: translateY(-6px); }

/* Kanban */
.kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--esp-4); align-items: start; min-height: 280px; }
@media (max-width: 1000px) { .kanban { grid-template-columns: 1fr; } }
.bar-hist { min-height: 280px; }
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
.kb-time { display: inline-flex; align-items: center; gap: 4px; font-size: 0.76rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--texto-secundario); background: rgba(168,85,247,0.1); padding: 3px 9px; border-radius: 999px; min-width: 52px; justify-content: center; }
.kb-time.amarillo { color: #FCD34D; background: rgba(245,158,11,0.15); }
.kb-time.rojo { color: #FCA5A5; background: rgba(239,68,68,0.18); }
.kb-time.critico { color: #fff; background: rgba(239,68,68,0.85); animation: kbCronoPulso 1s ease-in-out infinite; }
@keyframes kbCronoPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 4px rgba(239,68,68,0); } }
.kb-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.kb-chip { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; padding: 2px 7px; border-radius: 999px; }
.kb-chip.vip { background: linear-gradient(135deg, #FBBF24, #F59E0B); color: #1a1206; }
.kb-chip.alta { background: rgba(168,85,247,0.2); color: #E9D5FF; }
.kb-chip.cvip { background: rgba(236,72,153,0.16); color: #F9A8D4; }
.kb-chip.entrega { background: rgba(255,255,255,0.06); color: var(--texto-secundario); border: 1px solid var(--borde-sutil); }
.kb-items { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.kb-item { display: flex; align-items: center; gap: 9px; }
.kb-item-foto {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: var(--radio-md); overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: rgba(168,85,247,0.1); border: 1px solid var(--borde-sutil); color: var(--morado-hover);
}
.kb-item-foto img { width: 100%; height: 100%; object-fit: cover; }
.kb-cant { color: var(--morado-hover); font-weight: 800; font-size: 1.05rem; flex-shrink: 0; }
.kb-item-nom { font-size: 0.9rem; color: var(--texto-principal); line-height: 1.2; }
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
