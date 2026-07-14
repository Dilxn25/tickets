<template>
  <div class="bar2 fade-in">
    <!-- ===== Pulso de la barra ===== -->
    <header class="b2-top">
      <div class="b2-filtros">
        <button v-if="eventos.length > 1" v-for="e in eventos" :key="e.id_evento" :class="['b2-chip', { activo: eventoFiltro === e.id_evento }]" @click="setEvento(e.id_evento)">{{ e.nombre }}</button>
        <button v-if="eventos.length > 1" :class="['b2-chip', { activo: eventoFiltro === null }]" @click="setEvento(null)">Todos</button>
      </div>
      <div class="b2-pulso">
        <span class="b2-kpi cola" title="Bebidas por preparar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg>
          <b>{{ bebidasEnCola }}</b>
        </span>
        <span class="b2-kpi espera" :class="{ critico: esperaMax >= 10 }" title="Espera del pedido más antiguo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <b>{{ esperaMax }}m</b>
        </span>
        <button class="b2-kpi" @click="mapaAbierto = true" title="Filtrar por mesa en el mapa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21"></polygon><line x1="8" y1="3" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="21"></line></svg>
          Mapa
        </button>
        <button class="b2-kpi" @click="historialAbierto = true" title="Historial de entregas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
        </button>
      </div>
    </header>
    <div v-if="filtroMesa" class="b2-filtro-mesa">
      Mesa {{ filtroMesa }}
      <button @click="filtroMesa = ''; recargar()" aria-label="Quitar filtro">×</button>
    </div>

    <div class="b2-carriles">
      <!-- ===== Carril AHORA: qué preparar ===== -->
      <section class="b2-carril">
        <h2 class="b2-carril-tit preparar">Preparar</h2>
        <p v-if="!enPreparacion && !cola.length" class="b2-vacio">Barra al día.</p>

        <!-- El pedido EN CURSO (o el siguiente): tarjeta grande -->
        <article v-if="alFrente" class="b2-ahora" :class="claseEdad(alFrente)">
          <header class="b2-ahora-cab">
            <b>#{{ alFrente.id_comanda }}</b>
            <span class="b2-crono">{{ crono(alFrente) }}</span>
          </header>
          <ul class="b2-items">
            <li v-for="(it, i) in alFrente.items" :key="i">
              <span class="b2-item-foto">
                <img v-if="it.imagen" :src="it.imagen" :alt="it.nombre" loading="lazy" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg>
              </span>
              <b class="b2-item-cant">{{ it.cantidad }}×</b>
              <span class="b2-item-nom">{{ it.nombre }}</span>
            </li>
          </ul>
          <footer class="b2-ahora-pie">
            <span class="b2-destino">
              <template v-if="alFrente.mesa">Mesa {{ alFrente.mesa }}</template>
              <template v-else>Barra</template>
              · {{ alFrente.cliente }}<span v-if="alFrente.es_vip_cliente" class="b2-vip">VIP</span>
            </span>
            <button class="b2-accion" :disabled="procesando === alFrente.id_comanda" @click="avanzar(alFrente)">
              {{ alFrente._estado === 'Preparando' ? 'Listo' : 'Preparar' }}
            </button>
          </footer>
        </article>

        <!-- Los siguientes, compactos -->
        <div v-if="siguientes.length" class="b2-cola">
          <button v-for="c in siguientes" :key="c.id_comanda" class="b2-cola-item" :class="claseEdad(c)" @click="ponerAlFrente(c)">
            <b>#{{ c.id_comanda }}</b>
            <span>{{ resumenItems(c) }}</span>
            <small>{{ crono(c) }}</small>
          </button>
        </div>
      </section>

      <!-- ===== Carril ENTREGA: lo listo, en mano ===== -->
      <section class="b2-carril">
        <h2 class="b2-carril-tit entregar">Entregar</h2>
        <p v-if="!listos.length" class="b2-vacio">Nada esperando entrega.</p>

        <article v-for="c in listos" :key="c.id_comanda" class="b2-listo">
          <header class="b2-listo-cab">
            <span class="b2-listo-dest" :class="{ barra: c.modo_entrega === 'barra' }">
              <svg v-if="c.modo_entrega === 'barra'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="8" width="18" height="4" rx="1"></rect><line x1="6" y1="12" x2="6" y2="19"></line><line x1="18" y1="12" x2="18" y2="19"></line></svg>
              <b v-if="c.modo_entrega === 'barra'">{{ c.cliente }}</b>
              <b v-else>Mesa {{ c.mesa }}<template v-if="c.mesero"> · {{ primerNombre(c.mesero) }}</template></b>
            </span>
            <span class="b2-listo-id">#{{ c.id_comanda }}</span>
          </header>
          <p class="b2-listo-items">{{ resumenItems(c) }}</p>

          <!-- Recoge el CLIENTE: escanear su QR -->
          <button v-if="c.modo_entrega === 'barra'" class="b2-accion entrega" :disabled="procesando === c.id_comanda" @click="abrirEscaner(c)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
            Escanear QR del cliente
          </button>
          <!-- Recoge el MESERO: handoff bidireccional -->
          <template v-else>
            <p v-if="c.estado_entrega === 'barra_entrego'" class="b2-espera">Esperando confirmación del mesero…</p>
            <p v-else-if="c.estado_entrega === 'mesero_confirma'" class="b2-espera ok">El mesero lo recogió · confirma</p>
            <button class="b2-accion entrega" :disabled="procesando === c.id_comanda || c.estado_entrega === 'barra_entrego'" @click="entregarMesero(c)">
              {{ c.estado_entrega === 'mesero_confirma' ? 'Confirmar entrega' : 'Entregué al mesero' }}
            </button>
          </template>
        </article>
      </section>
    </div>

    <!-- Escáner del QR del cliente -->
    <Teleport to="body">
      <div v-if="escanerAbierto" class="b2-overlay" @click.self="escanerAbierto = false">
        <div class="b2-modal">
          <CapturaCamara modo="qr" texto-guia="QR del cliente que recoge" @codigo="confirmarCliente" />
          <p v-if="errorEntrega" class="b2-error">{{ errorEntrega }}</p>
          <button class="b2-cerrar" @click="escanerAbierto = false">Cancelar</button>
        </div>
      </div>
    </Teleport>

    <!-- Mapa para filtrar por mesa (patrón verificado) -->
    <Teleport to="body">
      <div v-if="mapaAbierto" class="b2-overlay" @click.self="mapaAbierto = false">
        <div class="b2-modal mapa">
          <header class="b2-modal-cab">
            <b>Toca una mesa para ver sus pedidos</b>
            <button class="b2-cerrar-x" @click="mapaAbierto = false" aria-label="Cerrar">×</button>
          </header>
          <div v-if="eventosMapa.length > 1" class="b2-filtros" style="padding: 0 4px;">
            <button v-for="e in eventosMapa" :key="e.id_evento" :class="['b2-chip', { activo: mapaEventoId === e.id_evento }]" @click="setEventoMapa(e.id_evento)">{{ e.nombre }}</button>
          </div>
          <div class="b2-mapa-scroll">
            <p v-if="!planosMapa.length" class="b2-vacio">Sin planos con mesas.</p>
            <div v-for="z in planosMapa" :key="z.id_zona">
              <div class="b2-zona-tit">{{ z.nombre_zona }}</div>
              <div class="b2-plano" :style="{ aspectRatio: z.proporcion || 1.6 }">
                <button
                  v-for="m in z.mesas" :key="m.id_mesa" type="button"
                  class="b2-el" :class="{ deco: !(m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') }"
                  :style="estiloMapaElem(m)" @click="filtrarPorMesa(m)"
                ><span>{{ m.numero_nombre }}</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Historial -->
    <HistorialBarra v-if="historialAbierto" :filtro="paramsFiltro()" @cerrar="historialAbierto = false" />
  </div>
</template>

<script setup>
// Vista del BARTENDER: la barra en dos carriles — PREPARAR (qué hacer ahora,
// con cronómetro) y ENTREGAR (a quién, con confirmación por QR del cliente o
// handoff con el mesero). Filtra por evento y por mesa desde el mapa.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { servicioAforo } from '@/servicios-api/servicio-aforo.js'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'
import HistorialBarra from './paneles/HistorialBarra.vue'

// ---- Tablero ----
const columnas = ref({ Pendiente: [], Preparando: [], Listo: [] })
const eventos = ref([])
const eventoFiltro = ref(null)
const filtroMesa = ref('')
const procesando = ref(null)
const ahoraTick = ref(Date.now())
const frenteManual = ref(null) // el bartender puede traer otro pedido al frente

function paramsFiltro() {
  const p = {}
  if (eventoFiltro.value) p.evento = eventoFiltro.value
  if (filtroMesa.value.trim()) p.mesa = filtroMesa.value.trim()
  return p
}
async function recargar() {
  try {
    const r = await clienteHttp.get('/comandas/tablero', { params: paramsFiltro() })
    const c = r.columnas || {}
    columnas.value = {
      Pendiente: (c.Pendiente || []).map(x => ({ ...x, _estado: 'Pendiente' })),
      Preparando: (c.Preparando || []).map(x => ({ ...x, _estado: 'Preparando' })),
      Listo: (c.Listo || []).map(x => ({ ...x, _estado: 'Listo' })),
    }
    eventos.value = r.eventos || []
  } catch { /* siguiente refresco */ }
}
function setEvento(id) { eventoFiltro.value = id; recargar() }

// El pedido AL FRENTE: lo que está Preparando; si nada, el más antiguo en cola
// (o el que el bartender trajo al frente con un toque).
const enPreparacion = computed(() => columnas.value.Preparando[0] || null)
const cola = computed(() => columnas.value.Pendiente)
const alFrente = computed(() => {
  if (enPreparacion.value) return enPreparacion.value
  if (frenteManual.value) {
    const m = cola.value.find(c => c.id_comanda === frenteManual.value)
    if (m) return m
  }
  return cola.value[0] || null
})
const siguientes = computed(() => cola.value.filter(c => c.id_comanda !== alFrente.value?.id_comanda))
const listos = computed(() => columnas.value.Listo)
const bebidasEnCola = computed(() => cola.value.reduce((a, c) => a + (c.total_items || c.items?.reduce((x, i) => x + (i.cantidad || 1), 0) || 0), 0))
const esperaMax = computed(() => {
  const todos = [...cola.value, ...(enPreparacion.value ? [enPreparacion.value] : [])]
  return todos.length ? Math.max(...todos.map(c => minutos(c))) : 0
})

function minutos(c) {
  return Math.max(0, Math.floor((ahoraTick.value - new Date(c.fecha_registro).getTime()) / 60000))
}
// Cronómetro mm:ss en vivo (pedido del dueño: minutos Y segundos)
function crono(c) {
  const seg = Math.max(0, Math.floor((ahoraTick.value - new Date(c.fecha_registro).getTime()) / 1000))
  const m = Math.floor(seg / 60), s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
function claseEdad(c) {
  const m = minutos(c)
  return m >= 10 ? 'critico' : m >= 5 ? 'alerta' : ''
}
function resumenItems(c) {
  return (c.items || []).map(i => `${i.cantidad}× ${i.nombre}`).join(' · ')
}
function primerNombre(n) { return String(n || '').split(' ')[0] }
function ponerAlFrente(c) { if (!enPreparacion.value) frenteManual.value = c.id_comanda }

// Un toque: Pendiente → Preparando → Listo
async function avanzar(c) {
  if (procesando.value) return
  procesando.value = c.id_comanda
  try {
    const nuevo = c._estado === 'Preparando' ? 'Listo' : 'Preparando'
    await clienteHttp.patch(`/comandas/${c.id_comanda}/estado`, { estado: nuevo })
    frenteManual.value = null
    await recargar()
  } catch { /* siguiente refresco */ }
  finally { procesando.value = null }
}

// ---- Entrega en mano ----
const escanerAbierto = ref(false)
const errorEntrega = ref('')
let comandaEntrega = null
function abrirEscaner(c) { comandaEntrega = c; errorEntrega.value = ''; escanerAbierto.value = true }
async function confirmarCliente(qr) {
  if (!comandaEntrega || !qr) return
  procesando.value = comandaEntrega.id_comanda
  try {
    await clienteHttp.post(`/comandas/${comandaEntrega.id_comanda}/entregar-cliente`, { qr_cliente: qr })
    escanerAbierto.value = false
    await recargar()
  } catch (e) {
    errorEntrega.value = e?.error || 'Ese QR no es del cliente de este pedido.'
  } finally { procesando.value = null }
}
async function entregarMesero(c) {
  if (procesando.value) return
  procesando.value = c.id_comanda
  try {
    await clienteHttp.post(`/comandas/${c.id_comanda}/barra-entrego`)
    await recargar()
  } catch { /* refresco */ }
  finally { procesando.value = null }
}

// ---- Mapa (patrón verificado del plano fiel) ----
const mapaAbierto = ref(false)
const planosMapa = ref([])
const eventosMapa = ref([])
const mapaEventoId = ref(null)
async function cargarPlanosMapa() {
  if (!mapaEventoId.value) { planosMapa.value = []; return }
  try {
    const r = await servicioAforo.obtenerPlanos(mapaEventoId.value)
    planosMapa.value = (r.zonas || []).filter(z => (z.mesas || []).length)
  } catch { planosMapa.value = [] }
}
function setEventoMapa(id) { mapaEventoId.value = id; planosMapa.value = []; cargarPlanosMapa() }
async function prepararMapa() {
  let lista = []
  try {
    const evs = await servicioAforo.listarEventos()
    lista = (evs || []).filter(e => ['en_transcurso', 'lleno', 'promocion'].includes(e.estado))
    if (!lista.length && evs?.length) lista = [evs[0]]
  } catch { lista = [] }
  eventosMapa.value = lista.map(e => ({ ...e, nombre: e.nombre_evento || e.nombre }))
  mapaEventoId.value = eventoFiltro.value || eventosMapa.value[0]?.id_evento || null
  cargarPlanosMapa()
}
function estiloMapaElem(m) {
  return {
    left: `${m.posicion_x || 0}%`, top: `${m.posicion_y || 0}%`,
    width: `${m.ancho ?? 7}%`, height: `${m.alto ?? 10}%`,
    transform: `rotate(${m.rotacion || 0}deg)`,
    borderRadius: m.forma === 'redondo' ? '50%' : '8px',
  }
}
function filtrarPorMesa(m) {
  if (m.tipo_elemento !== 'mesa' && m.tipo_elemento !== 'silla') return
  filtroMesa.value = String(m.numero_nombre)
  if (mapaEventoId.value && eventos.value.some(e => e.id_evento === mapaEventoId.value)) eventoFiltro.value = mapaEventoId.value
  mapaAbierto.value = false
  recargar()
}

// ---- Historial ----
const historialAbierto = ref(false)

let socket = null, tick = null
onMounted(() => {
  recargar()
  prepararMapa()
  tick = setInterval(() => { ahoraTick.value = Date.now() }, 1000)
  socket = io({ path: '/socket.io' })
  for (const ev of ['nueva_comanda', 'pedido_listo', 'pedido_pool', 'pedido_tomado', 'pedido_recogido', 'pedido_entrega']) socket.on(ev, recargar)
})
onUnmounted(() => { if (socket) socket.disconnect(); clearInterval(tick) })
</script>

<style scoped>
.bar2 { min-height: 100dvh; background: var(--fondo-app, #0b0618); display: flex; flex-direction: column; }

/* ===== Pulso ===== */
.b2-top {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  width: 100%; max-width: 1180px; margin: 0 auto; padding: 14px 16px 0; box-sizing: border-box;
}
.b2-filtros { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.b2-chip { padding: 7px 14px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.b2-chip.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.12); color: var(--texto-principal); }
.b2-pulso { display: flex; gap: 8px; margin-left: auto; }
.b2-kpi { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: none; font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); cursor: pointer; }
.b2-kpi b { font-weight: 800; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.b2-kpi.cola { background: rgba(168,85,247,0.08); cursor: default; }
.b2-kpi.espera { background: rgba(245,158,11,0.08); cursor: default; }
.b2-kpi.espera.critico { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.5); }
.b2-kpi.espera.critico b { color: var(--color-error); }
.b2-filtro-mesa {
  width: fit-content; max-width: 1180px; margin: 10px auto 0; padding: 6px 8px 6px 14px;
  display: flex; align-items: center; gap: 8px; border-radius: 999px;
  background: rgba(168,85,247,0.12); border: 1px solid var(--borde-activo);
  color: var(--texto-principal); font-weight: 800; font-size: 0.82rem;
}
.b2-filtro-mesa button { width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(255,255,255,0.1); color: var(--texto-principal); cursor: pointer; font-size: 1rem; line-height: 1; }

/* ===== Carriles ===== */
.b2-carriles {
  flex: 1; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 18px;
  width: 100%; max-width: 1180px; margin: 0 auto; padding: 16px 16px 40px; box-sizing: border-box;
  align-items: start;
}
.b2-carril { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.b2-carril-tit { margin: 0; font-family: var(--fuente-titulo); font-size: 0.95rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 8px; border-bottom: 2px solid transparent; }
.b2-carril-tit.preparar { color: var(--color-alerta); border-color: rgba(245,158,11,0.5); }
.b2-carril-tit.entregar { color: var(--color-exito); border-color: rgba(34,197,94,0.5); }
.b2-vacio { margin: 0; text-align: center; padding: 2rem 0; font-size: 0.86rem; color: var(--texto-desactivado); }

/* La tarjeta AHORA */
.b2-ahora {
  border: 1.5px solid rgba(245,158,11,0.45); border-radius: 20px; padding: 16px;
  background: var(--fondo-tarjeta); box-shadow: 0 10px 34px rgba(10,6,26,0.5);
  display: flex; flex-direction: column; gap: 12px;
}
.b2-ahora.alerta { border-color: rgba(245,158,11,0.8); }
.b2-ahora.critico { border-color: rgba(239,68,68,0.8); box-shadow: 0 0 24px rgba(239,68,68,0.18); }
.b2-ahora-cab { display: flex; align-items: center; justify-content: space-between; }
.b2-ahora-cab b { font-family: var(--fuente-titulo); font-size: 1.25rem; color: var(--texto-principal); }
.b2-crono { font-weight: 800; font-variant-numeric: tabular-nums; font-size: 0.9rem; padding: 4px 12px; border-radius: 999px; background: rgba(245,158,11,0.14); color: #FCD34D; }
.b2-ahora.critico .b2-crono { background: rgba(239,68,68,0.16); color: #FCA5A5; }
.b2-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.b2-items li { display: flex; align-items: center; gap: 12px; }
.b2-item-foto { flex-shrink: 0; width: 52px; height: 52px; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.1); color: var(--morado-hover); }
.b2-item-foto img { width: 100%; height: 100%; object-fit: cover; }
.b2-item-cant { flex-shrink: 0; font-size: 1.25rem; font-weight: 800; color: var(--morado-hover); min-width: 40px; font-variant-numeric: tabular-nums; }
.b2-item-nom { color: var(--texto-principal); font-weight: 700; font-size: 0.98rem; }
.b2-ahora-pie { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.b2-destino { font-size: 0.82rem; color: var(--texto-secundario); display: inline-flex; align-items: center; gap: 6px; }
.b2-vip { font-size: 0.58rem; font-weight: 800; letter-spacing: 0.08em; color: #FACC15; background: rgba(250,204,21,0.12); border: 1px solid rgba(250,204,21,0.4); padding: 1px 7px; border-radius: 999px; }
.b2-accion { padding: 13px 26px; border: none; border-radius: 14px; background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 0.95rem; cursor: pointer; }
.b2-accion:disabled { opacity: 0.5; cursor: wait; }
.b2-accion.entrega { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }

/* La cola compacta */
.b2-cola { display: flex; flex-direction: column; gap: 6px; }
.b2-cola-item {
  display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 10px 12px; border-radius: 12px; cursor: pointer;
  background: rgba(255,255,255,0.02); border: 1px solid var(--borde-sutil); color: var(--texto-secundario);
}
.b2-cola-item:hover { border-color: var(--borde-activo); }
.b2-cola-item b { flex-shrink: 0; color: var(--texto-principal); font-size: 0.84rem; }
.b2-cola-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; }
.b2-cola-item small { flex-shrink: 0; font-weight: 800; font-variant-numeric: tabular-nums; }
.b2-cola-item.alerta small { color: #FCD34D; }
.b2-cola-item.critico { border-color: rgba(239,68,68,0.5); }
.b2-cola-item.critico small { color: var(--color-error); }

/* Tarjetas de ENTREGA */
.b2-listo { border: 1px solid rgba(34,197,94,0.35); border-radius: 16px; padding: 13px; background: var(--fondo-tarjeta); display: flex; flex-direction: column; gap: 8px; }
.b2-listo-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.b2-listo-dest { display: inline-flex; align-items: center; gap: 8px; color: var(--color-exito); min-width: 0; }
.b2-listo-dest.barra { color: var(--morado-hover); }
.b2-listo-dest b { color: var(--texto-principal); font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.b2-listo-id { flex-shrink: 0; font-size: 0.78rem; font-weight: 800; color: var(--texto-desactivado); }
.b2-listo-items { margin: 0; font-size: 0.8rem; color: var(--texto-secundario); }
.b2-espera { margin: 0; font-size: 0.76rem; font-weight: 700; text-align: center; padding: 7px 8px; border-radius: 10px; background: rgba(245,158,11,0.14); color: var(--color-alerta); }
.b2-espera.ok { background: rgba(34,197,94,0.14); color: var(--color-exito); }

/* Overlays */
.b2-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
.b2-modal { width: min(480px, 94vw); margin: auto; background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: 22px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.b2-modal.mapa { width: min(680px, 96vw); max-height: 90dvh; }
.b2-modal-cab { display: flex; align-items: center; justify-content: space-between; }
.b2-modal-cab b { color: var(--texto-principal); }
.b2-cerrar { padding: 12px; border-radius: 13px; border: 1px solid var(--borde-sutil); background: rgba(255,255,255,0.05); color: var(--texto-principal); font-weight: 700; cursor: pointer; }
.b2-cerrar-x { width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: var(--texto-principal); font-size: 1.3rem; line-height: 1; cursor: pointer; }
.b2-error { margin: 0; font-size: 0.84rem; color: var(--color-error); }
.b2-mapa-scroll { overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.b2-zona-tit { font-size: 0.78rem; font-weight: 800; color: var(--texto-secundario); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
.b2-plano {
  position: relative; width: 100%;
  background:
    linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 100% 9%,
    linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 9% 100%,
    var(--fondo-app, #0b0618);
  border: 1px solid var(--borde-sutil); border-radius: 12px; overflow: hidden;
}
.b2-el { position: absolute; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--morado-brillante); background: rgba(168,85,247,0.4); font-size: 0.62rem; font-weight: 700; color: #fff; cursor: pointer; padding: 0; }
.b2-el:hover { background: rgba(168,85,247,0.8); }
.b2-el span { pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92%; }
.b2-el.deco { background: rgba(80,80,100,0.25); border-color: transparent; cursor: default; }

@media (max-width: 900px) {
  .b2-carriles { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .b2-top { padding: 10px 12px 0; }
  .b2-pulso { margin-left: 0; width: 100%; justify-content: space-between; }
  .b2-carriles { padding: 12px 12px 30px; }
  .b2-overlay { padding: 0; align-items: stretch; }
  .b2-modal.mapa { width: 100%; max-height: none; height: 100dvh; border-radius: 0; border: none; }
}
</style>
