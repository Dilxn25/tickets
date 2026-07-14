<template>
  <div class="rec2 fade-in">
    <!-- ===== Barra del evento: chip + pulso en vivo ===== -->
    <header class="r2-top">
      <button class="r2-evento" @click="modalEvento = true" title="Cambiar de evento">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span class="r2-evento-txt">{{ eventoActivo?.nombre_evento || 'Elegir evento' }}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div class="r2-pulso">
        <span class="r2-kpi dentro" title="Personas adentro / capacidad">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          <b>{{ totalDentro }}</b><small>/{{ totalCapacidad }}</small>
        </span>
        <span class="r2-kpi mirando" title="Clientes viendo el mapa para reservar AHORA">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <b>{{ interesados }}</b>
        </span>
        <button class="r2-kpi grupos" :class="{ conPendientes: solicitudes.length }" @click="panelGrupos = true" title="Solicitudes de grupos grandes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <b>{{ solicitudes.length }}</b>
        </button>
      </div>
    </header>

    <!-- Banner del modo propuesta (grupos): tocar mesas del mapa -->
    <div v-if="modoPropuesta" class="r2-prop-banner">
      <span>
        <b>{{ modoPropuesta.cliente }}</b> · {{ modoPropuesta.cantidad_personas }} personas ·
        elegidas <b>{{ cupoPropuesta }}</b> / {{ modoPropuesta.cantidad_personas }}
      </span>
      <div class="r2-prop-acciones">
        <button class="r2-prop-ok" :disabled="cupoPropuesta < modoPropuesta.cantidad_personas || proponiendo" @click="enviarPropuesta">
          {{ proponiendo ? '…' : 'Proponer' }}
        </button>
        <button class="r2-prop-x" @click="salirModoPropuesta">Cancelar</button>
      </div>
    </div>

    <!-- ===== EL MAPA EN VIVO (la interfaz) ===== -->
    <main class="r2-mapa">
      <div class="r2-leyenda">
        <span class="lg libre">Libre</span>
        <span class="lg reservada">Reservada</span>
        <span class="lg ocupada">Ocupada</span>
        <input v-model="filtroMapa" class="r2-filtro" type="text" placeholder="Buscar mesa o cliente…" />
      </div>
      <p v-if="cargandoPlanos" class="r2-vacio">Cargando el plano…</p>
      <p v-else-if="!zonas.length" class="r2-vacio">Este evento no tiene planos con mesas.</p>
      <section v-for="z in zonas" :key="z.id_zona" class="r2-zona">
        <div class="r2-zona-cab">
          <b>{{ z.nombre_zona }}</b>
          <span class="r2-zona-aforo">{{ z.ocupado }}/{{ z.capacidad }}</span>
        </div>
        <div class="r2-plano" :style="{ aspectRatio: z.proporcion || 1.6 }">
          <button
            v-for="m in z.mesas" :key="m.id_mesa" type="button"
            class="r2-el" :class="claseMesa(m)"
            :style="estiloElem(m)"
            @click="tocarMesa(m, z)"
          >
            <span class="r2-el-nom">{{ m.numero_nombre }}</span>
            <span v-if="m.cliente && !modoPropuesta" class="r2-el-cli">{{ primerNombre(m.cliente) }}</span>
            <span v-if="m.ingresados != null && m.reservados && !modoPropuesta" class="r2-el-num">{{ m.ingresados }}/{{ m.reservados }}</span>
            <span v-if="miradasPorMesa[m.id_mesa] && !modoPropuesta" class="r2-el-ojo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="10" height="10"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              {{ miradasPorMesa[m.id_mesa] }}
            </span>
          </button>
        </div>
      </section>
    </main>

    <!-- ===== Acciones fijas: ingreso + entrada general =====
         (Teleport al body: un ancestro con transform del fade-in atrapaba el
         position:fixed y los botones quedaban fuera de la pantalla) -->
    <Teleport to="body">
      <div class="r2-acciones">
        <button class="r2-cta principal" @click="panelIngreso = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
          Registrar ingreso
        </button>
        <button class="r2-cta" @click="panelGeneral = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
          Entrada general
        </button>
      </div>
    </Teleport>

    <!-- ===== Paneles ===== -->
    <IngresoEvento v-if="panelIngreso" :evento="eventoActivo" @cerrar="panelIngreso = false" @ingreso="alIngresar" />
    <EntradaGeneral v-if="panelGeneral" :zonas="zonas" @cerrar="panelGeneral = false" @hecho="alOperarMapa" />
    <TarjetaMesa
      v-if="mesaTocada"
      :mesa="mesaTocada.mesa" :zona="mesaTocada.zona" :evento="eventoActivo"
      @cerrar="mesaTocada = null" @hecho="alOperarMapa"
    />
    <GruposGrandes
      v-if="panelGrupos"
      :solicitudes="solicitudes" :evento="eventoActivo"
      @cerrar="panelGrupos = false" @proponer="iniciarModoPropuesta" @refrescar="cargarSolicitudes"
    />

    <!-- Selector de evento -->
    <Teleport to="body">
      <div v-if="modalEvento" class="r2-overlay" @click.self="eventoActivo && (modalEvento = false)">
        <div class="r2-sheet fade-in">
          <h3>¿Qué evento atiendes?</h3>
          <button v-for="e in eventos" :key="e.id_evento" class="r2-ev-item" :class="{ activo: e.id_evento === eventoActivo?.id_evento }" @click="elegirEvento(e)">
            <span class="r2-ev-estado" :class="e.estado"></span>
            <b>{{ e.nombre_evento }}</b>
            <small>{{ etiquetaEstado(e.estado) }}</small>
          </button>
          <p v-if="!eventos.length" class="r2-vacio">Sin eventos con planos.</p>
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
import IngresoEvento from './paneles/IngresoEvento.vue'
import EntradaGeneral from './paneles/EntradaGeneral.vue'
import TarjetaMesa from './paneles/TarjetaMesa.vue'
import GruposGrandes from './paneles/GruposGrandes.vue'

// ---- Evento activo ----
const eventos = ref([])
const eventoActivo = ref(null)
const modalEvento = ref(false)
function etiquetaEstado(e) {
  return { promocion: 'Próximo', en_transcurso: 'En curso', lleno: 'Lleno' }[e] || e
}
async function cargarEventos() {
  try {
    const evs = await servicioAforo.listarEventos()
    eventos.value = (evs || []).filter(e => ['promocion', 'en_transcurso', 'lleno'].includes(e.estado))
    const guardado = Number(localStorage.getItem('euphoria_recep_evento'))
    eventoActivo.value = eventos.value.find(e => e.id_evento === guardado)
      || eventos.value.find(e => e.estado === 'en_transcurso')
      || eventos.value[0] || null
    if (!eventoActivo.value && eventos.value.length > 1) modalEvento.value = true
  } catch { eventos.value = [] }
}
function elegirEvento(e) {
  eventoActivo.value = e
  localStorage.setItem('euphoria_recep_evento', String(e.id_evento))
  modalEvento.value = false
  cargarPlanos()
  entrarSala()
}

// ---- Mapa en vivo ----
const zonas = ref([])
const cargandoPlanos = ref(false)
const filtroMapa = ref('')
async function cargarPlanos() {
  if (!eventoActivo.value) return
  cargandoPlanos.value = true
  try {
    const r = await servicioAforo.obtenerPlanos(eventoActivo.value.id_evento)
    zonas.value = (r.zonas || []).filter(z => (z.mesas || []).length)
  } catch { zonas.value = [] } finally { cargandoPlanos.value = false }
}
const totalDentro = computed(() => zonas.value.reduce((s, z) => s + (z.ocupado || 0), 0))
const totalCapacidad = computed(() => zonas.value.reduce((s, z) => s + (z.capacidad || 0), 0))

function primerNombre(n) { return String(n).split(' ')[0] }
function estiloElem(m) {
  return {
    left: `${m.posicion_x || 0}%`, top: `${m.posicion_y || 0}%`,
    width: `${m.ancho ?? 7}%`, height: `${m.alto ?? 10}%`,
    transform: `rotate(${m.rotacion || 0}deg)`,
    borderRadius: m.forma === 'redondo' ? '50%' : '8px',
  }
}
const coincideFiltro = (m) => {
  const q = filtroMapa.value.trim().toLowerCase()
  if (!q) return true
  return String(m.numero_nombre).toLowerCase().includes(q) || (m.cliente || '').toLowerCase().includes(q)
}
// R4.2: la pista (y los elementos de zona general) SÍ se tocan — son la
// entrada general. Solo escenario/barra/paredes quedan decorativos.
function esGeneral(m) {
  return ['pista', 'area', 'zona'].includes(String(m.tipo_elemento || '').toLowerCase())
}
function claseMesa(m) {
  const esLugar = (m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') && m.es_seleccionable
  if (esGeneral(m)) return 'general'
  if (!esLugar) return 'deco'
  if (modoPropuesta.value) {
    if (idsPropuesta.value.includes(m.id_mesa)) return 'prop-elegida'
    return m.estado_ocupacion === 'libre' ? 'prop-libre' : 'prop-bloqueada'
  }
  const base = m.estado_ocupacion === 'libre' ? 'libre'
    : (m.ingresados > 0 ? 'ocupada' : 'reservada')
  return [base, coincideFiltro(m) ? '' : 'atenuada', m.es_vip ? 'vip' : ''].join(' ')
}

// ---- Tocar mesa ----
const mesaTocada = ref(null)
function tocarMesa(m, z) {
  // Tocar la pista/zona general = registrar entrada general en esa zona
  if (esGeneral(m) && !modoPropuesta.value) { panelGeneral.value = true; return }
  const esLugar = (m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') && m.es_seleccionable
  if (!esLugar) return
  if (modoPropuesta.value) {
    if (m.estado_ocupacion !== 'libre') return
    const i = idsPropuesta.value.indexOf(m.id_mesa)
    if (i >= 0) idsPropuesta.value.splice(i, 1)
    else idsPropuesta.value.push(m.id_mesa)
    return
  }
  mesaTocada.value = { mesa: m, zona: z }
}
function alOperarMapa() {
  mesaTocada.value = null
  panelGeneral.value = false
  cargarPlanos()
}
function alIngresar() { cargarPlanos() }

// ---- Grupos grandes: modo propuesta sobre el mapa ----
const panelGrupos = ref(false)
const solicitudes = ref([])
const modoPropuesta = ref(null)
const idsPropuesta = ref([])
const proponiendo = ref(false)
async function cargarSolicitudes() {
  try {
    const todas = await clienteHttp.get('/reservas/solicitudes-grupo')
    solicitudes.value = (todas || []).filter(s => !eventoActivo.value || s.id_evento === eventoActivo.value.id_evento)
  } catch { solicitudes.value = [] }
}
function iniciarModoPropuesta(s) {
  panelGrupos.value = false
  modoPropuesta.value = s
  // Arranca con sus mesas tentativas que sigan libres
  idsPropuesta.value = (s.mesas_tentativas || []).filter(t => t.libre).map(t => t.id_mesa)
}
function salirModoPropuesta() {
  modoPropuesta.value = null
  idsPropuesta.value = []
}
const cupoPropuesta = computed(() => {
  const porId = new Map()
  for (const z of zonas.value) for (const m of z.mesas) porId.set(m.id_mesa, m)
  return idsPropuesta.value.reduce((s, id) => s + (porId.get(id)?.capacidad_sillas || 1), 0)
})
async function enviarPropuesta() {
  if (!modoPropuesta.value || proponiendo.value) return
  proponiendo.value = true
  try {
    const porId = new Map()
    for (const z of zonas.value) for (const m of z.mesas) porId.set(m.id_mesa, m)
    await clienteHttp.post(`/reservas/solicitudes-grupo/${modoPropuesta.value.id_solicitud}/proponer`, {
      mesas: idsPropuesta.value.map(id => ({ id_mesa: id, nombre: String(porId.get(id)?.numero_nombre || '') })),
    })
    salirModoPropuesta()
    cargarSolicitudes()
    cargarPlanos()
  } catch (e) {
    console.error(e)
  } finally { proponiendo.value = false }
}

// ---- Paneles ----
const panelIngreso = ref(false)
const panelGeneral = ref(false)

// ---- Tiempo real ----
const interesados = ref(0)
const miradasPorMesa = ref({}) // id_mesa -> nº de clientes mirándola
const miradasPorSocket = new Map()
let socket = null
function entrarSala() {
  if (socket && eventoActivo.value) {
    miradasPorSocket.clear()
    miradasPorMesa.value = {}
    socket.emit('entrar_mapa', { id_evento: eventoActivo.value.id_evento, observador: true })
  }
}
function recontarMiradas() {
  const conteo = {}
  for (const idMesa of miradasPorSocket.values()) conteo[idMesa] = (conteo[idMesa] || 0) + 1
  miradasPorMesa.value = conteo
}
onMounted(async () => {
  await cargarEventos()
  await cargarPlanos()
  cargarSolicitudes()
  socket = io({ path: '/socket.io' })
  socket.on('connect', entrarSala)
  socket.on('interesados_evento', (d) => {
    if (d?.id_evento === eventoActivo.value?.id_evento) interesados.value = d.total
  })
  socket.on('viendo_mesa', (d) => { if (d?.id_mesa != null) { miradasPorSocket.set(d.socketId, d.id_mesa); recontarMiradas() } })
  socket.on('dejar_mesa', (d) => { if (d?.socketId) { miradasPorSocket.delete(d.socketId); recontarMiradas() } })
  socket.on('aforo_actualizado', cargarPlanos)
  socket.on('recurso_actualizado', (d) => {
    if (d?.tipo === 'reservas') cargarPlanos()
  })
  socket.on('solicitud_grupo', cargarSolicitudes)
})
onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.rec2 { min-height: 100dvh; display: flex; flex-direction: column; background: var(--fondo-app, #0b0618); padding-bottom: 92px; }

/* ===== Barra del evento ===== */
.r2-top {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  width: 100%; max-width: 1180px; margin: 0 auto; padding: 14px 16px 0; box-sizing: border-box;
}
.r2-evento {
  display: inline-flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden;
  padding: 9px 14px; border-radius: 999px; cursor: pointer;
  background: rgba(168,85,247,0.14); border: 1px solid var(--borde-activo);
  color: var(--texto-principal); font-weight: 800; font-size: 0.88rem;
}
.r2-evento-txt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r2-evento svg { flex-shrink: 0; color: var(--morado-hover); }
.r2-pulso { display: flex; gap: 8px; }
.r2-kpi {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px;
  border-radius: 999px; border: 1px solid var(--borde-sutil); background: none;
  font-size: 0.82rem; color: var(--texto-secundario);
}
.r2-kpi b { font-weight: 800; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.r2-kpi small { color: var(--texto-desactivado); }
.r2-kpi.dentro { background: rgba(34,197,94,0.08); color: var(--color-exito); }
.r2-kpi.dentro b { color: var(--color-exito); }
.r2-kpi.mirando { background: rgba(168,85,247,0.08); color: var(--morado-hover); }
.r2-kpi.mirando b { color: var(--morado-hover); }
.r2-kpi.grupos { cursor: pointer; }
.r2-kpi.grupos.conPendientes { background: rgba(236,72,153,0.12); border-color: rgba(236,72,153,0.5); color: var(--rosa-acento); }
.r2-kpi.grupos.conPendientes b { color: var(--rosa-acento); }

/* Banner del modo propuesta */
.r2-prop-banner {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  width: 100%; max-width: 1180px; margin: 10px auto 0; padding: 10px 14px; box-sizing: border-box;
  background: rgba(236,72,153,0.12); border: 1px solid rgba(236,72,153,0.4); border-radius: 14px;
  color: var(--texto-principal); font-size: 0.85rem;
}
.r2-prop-acciones { display: flex; gap: 8px; }
.r2-prop-ok { padding: 9px 16px; border: none; border-radius: 10px; background: var(--gradiente-marca); color: #fff; font-weight: 800; cursor: pointer; }
.r2-prop-ok:disabled { opacity: 0.5; cursor: not-allowed; }
.r2-prop-x { padding: 9px 14px; border: 1px solid var(--borde-sutil); border-radius: 10px; background: none; color: var(--texto-secundario); font-weight: 700; cursor: pointer; }

/* ===== Mapa ===== */
.r2-mapa { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 14px 16px 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; }
.r2-leyenda { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lg { display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-secundario); }
.lg::before { content: ''; width: 10px; height: 10px; border-radius: 3px; }
.lg.libre::before { background: #22C55E; }
.lg.reservada::before { background: #F59E0B; }
.lg.ocupada::before { background: #EF4444; }
.r2-filtro {
  margin-left: auto; min-width: 200px; padding: 9px 13px; border-radius: 12px; outline: none;
  background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1px solid var(--borde-sutil);
  color: var(--texto-principal); font-size: 0.85rem;
}
.r2-filtro:focus { border-color: var(--morado-brillante); }
.r2-vacio { margin: 0; text-align: center; padding: 2.4rem 0; font-size: 0.88rem; color: var(--texto-desactivado); }
.r2-zona-cab { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.r2-zona-cab b { color: var(--texto-principal); font-size: 0.95rem; }
.r2-zona-aforo { font-size: 0.78rem; font-weight: 800; color: var(--texto-secundario); font-variant-numeric: tabular-nums; }
.r2-plano {
  position: relative; width: 100%;
  background:
    linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 100% 9%,
    linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 9% 100%,
    var(--fondo-tarjeta, #12081F);
  border: 1px solid var(--borde-sutil); border-radius: 16px; overflow: hidden;
}
.r2-el {
  position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; padding: 0; border: 1.5px solid transparent; cursor: pointer;
  font-size: 0.6rem; color: #fff; overflow: hidden;
  transition: filter 0.15s ease, opacity 0.2s ease;
}
.r2-el:hover { filter: brightness(1.25); }
.r2-el-nom { font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.6); pointer-events: none; }
.r2-el-cli, .r2-el-num { font-size: 0.52rem; font-weight: 700; opacity: 0.9; pointer-events: none; max-width: 94%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r2-el-ojo {
  position: absolute; top: 2px; right: 2px; display: inline-flex; align-items: center; gap: 2px;
  font-size: 0.5rem; font-weight: 800; padding: 1px 4px; border-radius: 999px;
  background: rgba(168,85,247,0.9); color: #fff; pointer-events: none;
}
.r2-el.libre { background: rgba(34,197,94,0.32); border-color: rgba(34,197,94,0.75); }
.r2-el.reservada { background: rgba(245,158,11,0.35); border-color: rgba(245,158,11,0.8); }
.r2-el.ocupada { background: rgba(239,68,68,0.35); border-color: rgba(239,68,68,0.8); }
.r2-el.vip { box-shadow: 0 0 10px rgba(250,204,21,0.5); }
.r2-el.atenuada { opacity: 0.22; }
.r2-el.deco { background: rgba(80,80,100,0.22); border-color: transparent; cursor: default; color: var(--texto-desactivado); }
.r2-el.general { background: rgba(99,102,241,0.18); border: 1.5px dashed rgba(99,102,241,0.6); color: #C7D2FE; cursor: pointer; }
.r2-el.general:hover { background: rgba(99,102,241,0.32); }
.r2-el.prop-libre { background: rgba(168,85,247,0.2); border-color: rgba(168,85,247,0.55); }
.r2-el.prop-elegida { background: var(--gradiente-marca); border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
.r2-el.prop-bloqueada { background: rgba(80,80,100,0.25); border-color: transparent; cursor: not-allowed; opacity: 0.4; }

/* ===== Acciones fijas ===== */
.r2-acciones {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
  display: flex; gap: 10px; justify-content: center;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent, rgba(6,3,18,0.92) 35%);
}
.r2-cta {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 14px 22px; border-radius: 16px; cursor: pointer;
  background: var(--fondo-tarjeta); border: 1.5px solid var(--borde-activo);
  color: var(--texto-principal); font-weight: 800; font-size: 0.92rem;
}
.r2-cta.principal { background: var(--gradiente-marca); border-color: transparent; color: #fff; box-shadow: 0 10px 30px rgba(168,85,247,0.35); }

/* Selector de evento */
.r2-overlay { position: fixed; inset: 0; z-index: 1300; background: rgba(6,3,18,0.8); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.r2-sheet {
  width: min(440px, 94vw); background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3));
  border-radius: 22px; padding: 20px 16px; display: flex; flex-direction: column; gap: 10px;
}
.r2-sheet h3 { margin: 0 0 4px; font-family: var(--fuente-titulo); font-size: 1.15rem; color: var(--texto-principal); }
.r2-ev-item {
  display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 13px 14px; border-radius: 14px; cursor: pointer;
  background: rgba(255,255,255,0.02); border: 1.5px solid var(--borde-sutil); color: var(--texto-principal);
}
.r2-ev-item:hover { border-color: var(--borde-activo); }
.r2-ev-item.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); }
.r2-ev-item b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.92rem; }
.r2-ev-item small { color: var(--texto-desactivado); font-size: 0.72rem; }
.r2-ev-estado { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--texto-desactivado); }
.r2-ev-estado.en_transcurso { background: #22C55E; box-shadow: 0 0 8px rgba(34,197,94,0.7); }
.r2-ev-estado.promocion { background: #F59E0B; }
.r2-ev-estado.lleno { background: #EF4444; }

@media (max-width: 560px) {
  .r2-top { padding: 10px 12px 0; }
  .r2-pulso { width: 100%; justify-content: space-between; }
  .r2-mapa { padding: 12px 12px 0; }
  .r2-filtro { min-width: 0; width: 100%; margin-left: 0; }
  .r2-cta { flex: 1; justify-content: center; padding: 13px 10px; font-size: 0.84rem; }
}
</style>
