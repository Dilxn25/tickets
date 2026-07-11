<template>
  <div class="pedidos-vista">
    <header class="ped-header">
      <button class="ped-volver" @click="$router.back()" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <h1>Mis pedidos</h1>
    </header>

    <!-- Aviso: pedido listo para recoger en barra -->
    <transition name="slide">
      <div v-if="avisoRecoger" class="ped-aviso" @click="avisoRecoger = null">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"></path></svg>
        <span><b>¡Tu pedido está listo!</b> Pásalo a recoger en la barra.</span>
      </div>
    </transition>

    <!-- Pestañas -->
    <div class="ped-tabs">
      <button class="ped-tab" :class="{ activo: tab === 'activos' }" @click="tab = 'activos'">
        Activos <span v-if="activos.length" class="ped-tab-n">{{ activos.length }}</span>
      </button>
      <button class="ped-tab" :class="{ activo: tab === 'historial' }" @click="tab = 'historial'">Historial</button>
    </div>

    <!-- Filtro por evento -->
    <div v-if="eventosDisponibles.length > 1" class="ped-filtro">
      <button class="pf-chip" :class="{ activo: eventoFiltro === null }" @click="eventoFiltro = null">Todos</button>
      <button v-for="e in eventosDisponibles" :key="e.id" class="pf-chip" :class="{ activo: eventoFiltro === e.id }" @click="eventoFiltro = e.id">{{ e.nombre }}</button>
    </div>

    <div v-if="cargando" class="ped-estado"><div class="spinner"></div></div>

    <div v-else-if="!listaVisible.length" class="ped-vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="46" height="46"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      <p>{{ tab === 'activos' ? 'No tienes pedidos en curso.' : 'Aún no hay pedidos en tu historial.' }}</p>
    </div>

    <ul v-else class="ped-lista">
      <li v-for="p in listaVisible" :key="p.id_comanda" class="ped-item" :class="{ listo: esListoBarra(p) }">
        <div class="ped-top">
          <span class="ped-fecha">{{ formatearFecha(p.fecha) }}</span>
          <span class="ped-estado-chip" :class="claseEstado(p)">{{ etiquetaEstado(p) }}</span>
        </div>
        <ul class="ped-items">
          <li v-for="(it, i) in p.items" :key="i"><span class="ped-cant">{{ it.cantidad }}×</span> {{ it.nombre }}</li>
        </ul>
        <div class="ped-meta">
          <span v-if="p.evento" class="ped-badge evento">{{ p.evento }}</span>
          <span class="ped-badge" :class="'origen-' + p.origen">{{ etiquetaOrigen(p.origen) }}</span>
          <span class="ped-badge metodo">{{ p.metodo_pago }}</span>
          <span v-if="p.modo_entrega" class="ped-badge entrega">{{ p.modo_entrega === 'llevar' ? 'A la mesa' : 'En barra' }}</span>
          <span v-if="p.mesa" class="ped-badge">Mesa {{ p.mesa }}</span>
          <span class="ped-total">Bs. {{ p.total.toFixed(2) }}</span>
        </div>
        <!-- Definir entrega: pedido activo, sin modo aún, Y el cliente YA ingresó al evento -->
        <div v-if="!p.modo_entrega && esActivo(p) && p.ingresado" class="ped-entrega">
          <span class="pe-lbl">¿Cómo lo recibes?</span>
          <div class="pe-btns">
            <button class="pe-btn" :disabled="definiendo === p.id_comanda" @click="definirEntrega(p, 'barra')">Recojo en barra</button>
            <button class="pe-btn" :disabled="definiendo === p.id_comanda" @click="definirEntrega(p, 'llevar')">Que me lo lleven</button>
          </div>
        </div>
        <!-- Aún no ingresa al evento: nota breve, no intrusiva (no se ofrece entrega todavía) -->
        <p v-else-if="!p.modo_entrega && esActivo(p) && !p.ingresado" class="ped-nota-ingreso">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Cuando ingreses al evento eliges cómo y cuándo recibirlo.
        </p>
        <!-- Devolución -->
        <div v-if="p.puede_reembolso" class="ped-reembolso">
          <span class="pr-info">
            ¿No vas a consumirlo? Te devolvemos <b>Bs {{ p.reembolso_estimado.toFixed(2) }}</b> a tu billetera.
            <em v-if="p.sin_comision" class="pr-full">Sin comisión (faltan +24 h).</em>
            <em v-else class="pr-com">Dentro de 24 h: comisión {{ p.comision_pct }}%.</em>
          </span>
          <button class="pr-btn" :disabled="reembolsando === p.id_comanda" @click="pedirDevolucion(p)">
            {{ reembolsando === p.id_comanda ? 'Procesando…' : 'Pedir devolución' }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const auth = useTiendaAutenticacion()
const notif = useNotificaciones()

const pedidos = ref([])
const cargando = ref(true)
const tab = ref('activos')
const eventoFiltro = ref(null)
const comisionPct = ref(10)
const reembolsando = ref(null)
const definiendo = ref(null)
const avisoRecoger = ref(null)
let socket = null

const ESTADOS_ACTIVOS = ['Pendiente', 'Preparando', 'Listo']
function esActivo(p) { return ESTADOS_ACTIVOS.includes(p.estado) && !p.entregado }

async function definirEntrega(p, modo) {
  definiendo.value = p.id_comanda
  try {
    await clienteHttp.post(`/comandas/${p.id_comanda}/modo-entrega`, { modo })
    p.modo_entrega = modo
    notif.exito(modo === 'barra' ? 'Recogerás tu pedido en la barra' : 'Te lo llevarán a tu lugar')
  } catch (err) {
    const data = err?.response?.data || err
    notif.error(data?.error || 'No se pudo definir la entrega')
  } finally { definiendo.value = null }
}

const activos = computed(() => pedidos.value.filter(p => ESTADOS_ACTIVOS.includes(p.estado) && !p.entregado))
const historial = computed(() => pedidos.value.filter(p => !activos.value.includes(p)))

const eventosDisponibles = computed(() => {
  const map = new Map()
  for (const p of pedidos.value) if (p.id_evento && !map.has(p.id_evento)) map.set(p.id_evento, p.evento || 'Evento')
  return [...map.entries()].map(([id, nombre]) => ({ id, nombre }))
})

const listaVisible = computed(() => {
  let base = tab.value === 'activos' ? activos.value : historial.value
  if (eventoFiltro.value !== null) base = base.filter(p => p.id_evento === eventoFiltro.value)
  return base
})

function esListoBarra(p) { return p.estado === 'Listo' && p.modo_entrega === 'barra' }

function formatearFecha(f) {
  try { return new Date(f).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}
function etiquetaOrigen(o) { return o === 'app' ? 'Desde tu app' : (o === 'caja' ? 'En caja' : 'Con el mesero') }
function etiquetaEstado(p) {
  if (esListoBarra(p)) return 'Listo para recoger'
  const map = { Pendiente: 'En cola', Preparando: 'Preparando', Listo: 'Listo', Completada: 'Consumido', Cancelada: 'Cancelado', Reembolsada: 'Devuelto' }
  return map[p.estado] || p.estado
}
function claseEstado(p) {
  if (esListoBarra(p)) return 'recoger'
  const s = p.estado
  if (s === 'Listo' || s === 'Completada') return 'ok'
  if (s === 'Cancelada' || s === 'Reembolsada') return 'cancel'
  return 'proceso'
}

async function cargar() {
  cargando.value = true
  try {
    const [ped, cfg] = await Promise.all([
      clienteHttp.get('/comandas/mis-pedidos'),
      clienteHttp.get('/comandas/config-reembolso').catch(() => ({ comision_pct: 10 })),
    ])
    pedidos.value = ped
    comisionPct.value = cfg.comision_pct ?? 10
  } catch { pedidos.value = [] }
  finally { cargando.value = false }
}

async function pedirDevolucion(p) {
  const mensaje = p.sin_comision
    ? `Faltan más de 24 h para el evento: te devolvemos el TOTAL de Bs ${p.total.toFixed(2)} a tu billetera. ¿Confirmas?`
    : `Estás dentro de las 24 h previas: te devolvemos Bs ${p.reembolso_estimado.toFixed(2)} (el local retiene ${p.comision_pct}% de Bs ${p.total.toFixed(2)}). ¿Confirmas?`
  const ok = await notif.confirmar({
    titulo: 'Pedir devolución',
    mensaje,
    textoConfirmar: 'Sí, devolver',
  })
  if (!ok) return
  reembolsando.value = p.id_comanda
  try {
    const r = await clienteHttp.post(`/comandas/${p.id_comanda}/solicitar-reembolso`, {})
    notif.exito(`Devolución hecha: Bs ${Number(r.reembolsado).toFixed(2)} a tu billetera`)
    await cargar()
  } catch (err) {
    const data = err?.response?.data || err
    notif.error(data?.error || 'No se pudo procesar la devolución')
  } finally { reembolsando.value = null }
}

onMounted(() => {
  cargar()
  socket = io()
  socket.on('pedido_listo', (d) => {
    if (d.id_cliente && auth.usuario && d.id_cliente === auth.usuario.id) {
      if (d.modo_entrega === 'barra') {
        avisoRecoger.value = d.id_comanda
        setTimeout(() => { if (avisoRecoger.value === d.id_comanda) avisoRecoger.value = null }, 12000)
      }
      cargar()
    }
  })
  socket.on('billetera_actualizada', (d) => {
    if (d.id_usuario && auth.usuario && d.id_usuario === auth.usuario.id) cargar()
  })
})
onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.pedidos-vista { max-width: 720px; margin: 0 auto; padding: 16px 16px 100px; }
.ped-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.ped-volver { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-principal); cursor: pointer; }
.ped-header h1 { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; margin: 0; color: var(--texto-principal); }

.ped-aviso { display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin-bottom: 14px; border-radius: 14px; background: linear-gradient(135deg, rgba(34,197,94,0.22), rgba(16,185,129,0.14)); border: 1px solid rgba(34,197,94,0.4); color: #BBF7D0; cursor: pointer; }
.ped-aviso svg { width: 22px; height: 22px; flex-shrink: 0; }
.ped-aviso b { color: #fff; }

.ped-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.ped-tab { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--radio-full); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta); color: var(--texto-secundario); font-weight: 700; font-size: 0.86rem; cursor: pointer; }
.ped-tab.activo { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.ped-tab-n { background: rgba(255,255,255,0.25); border-radius: 999px; padding: 1px 7px; font-size: 0.72rem; }

.ped-filtro { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.pf-chip { padding: 6px 14px; border-radius: var(--radio-full); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta); color: var(--texto-secundario); font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.pf-chip.activo { border-color: var(--morado-brillante); color: var(--texto-principal); background: rgba(168,85,247,0.12); }

.ped-estado { display: flex; justify-content: center; padding: 3rem; }
.spinner { width: 34px; height: 34px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.ped-vacio { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 3rem 1rem; color: var(--texto-secundario); text-align: center; }
.ped-vacio svg { color: var(--morado-brillante); opacity: 0.6; }

.ped-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.ped-item { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: 14px 16px; }
.ped-item.listo { border-color: rgba(34,197,94,0.5); box-shadow: 0 0 20px rgba(34,197,94,0.15); }
.ped-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
.ped-fecha { font-size: 0.8rem; color: var(--texto-secundario); }
.ped-estado-chip { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 10px; border-radius: var(--radio-full); white-space: nowrap; }
.ped-estado-chip.ok { background: rgba(34,197,94,0.16); color: #86EFAC; }
.ped-estado-chip.recoger { background: rgba(34,197,94,0.28); color: #fff; animation: pulso 1.6s ease-in-out infinite; }
.ped-estado-chip.proceso { background: rgba(168,85,247,0.16); color: #E9D5FF; }
.ped-estado-chip.cancel { background: rgba(239,68,68,0.16); color: #FCA5A5; }
@keyframes pulso { 0%,100% { opacity: 1; } 50% { opacity: 0.65; } }
.ped-items { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.ped-items li { font-size: 0.9rem; color: var(--texto-principal); }
.ped-cant { color: var(--morado-hover); font-weight: 800; }
.ped-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.ped-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 9px; border-radius: var(--radio-full); background: rgba(255,255,255,0.06); color: var(--texto-secundario); border: 1px solid var(--borde-sutil); }
.ped-badge.evento { background: rgba(99,102,241,0.16); color: #C7D2FE; border-color: transparent; }
.ped-badge.origen-app { background: rgba(168,85,247,0.18); color: #E9D5FF; border-color: transparent; }
.ped-badge.metodo { background: rgba(236,72,153,0.14); color: #F9A8D4; border-color: transparent; }
.ped-total { margin-left: auto; font-family: var(--fuente-titulo); font-weight: 800; color: var(--rosa-acento); font-variant-numeric: tabular-nums; }

.ped-entrega { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--borde-sutil); }
.ped-nota-ingreso {
  margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--borde-sutil);
  display: flex; align-items: center; gap: 6px;
  font-size: 0.76rem; color: var(--texto-secundario); line-height: 1.3;
}
.ped-nota-ingreso svg { flex-shrink: 0; color: var(--morado-hover); }
.pe-lbl { font-size: 0.8rem; font-weight: 700; color: var(--texto-principal); }
.pe-btns { display: flex; gap: 8px; margin-top: 8px; }
.pe-btn { flex: 1; padding: 9px; border-radius: 10px; border: 1px solid var(--borde-activo); background: rgba(168,85,247,0.1); color: var(--morado-hover); font-weight: 700; font-size: 0.82rem; cursor: pointer; }
.pe-btn:hover:not(:disabled) { background: rgba(168,85,247,0.2); color: #fff; }
.pe-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ped-reembolso { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--borde-sutil); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pr-info { font-size: 0.8rem; color: var(--texto-secundario); }
.pr-info b { color: var(--color-exito); }
.pr-full, .pr-com { display: block; font-style: normal; font-size: 0.72rem; margin-top: 2px; }
.pr-full { color: #86EFAC; }
.pr-com { color: #FCD34D; }
.pr-btn { flex-shrink: 0; padding: 8px 14px; border-radius: var(--radio-full); border: 1px solid var(--borde-activo); background: rgba(168,85,247,0.1); color: var(--morado-hover); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.pr-btn:hover:not(:disabled) { background: rgba(168,85,247,0.2); color: #fff; }
.pr-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.slide-enter-active, .slide-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
