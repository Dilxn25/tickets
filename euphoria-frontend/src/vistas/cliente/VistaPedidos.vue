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
      <BaseSelect
        :model-value="eventoFiltro ?? ''"
        :options="opcionesEvento"
        placeholder="Todos tus eventos"
        @update:model-value="eventoFiltro = $event === '' ? null : Number($event)"
      />
    </div>

    <div v-if="cargando" class="ped-estado"><span class="spinner"></span></div>

    <!-- Error: la carga falló (no ocultarlo tras un "no hay pedidos") -->
    <div v-else-if="error" class="ped-estado-panel">
      <div class="ped-halo error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="34" height="34"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <h3 class="ped-estado-titulo">No pudimos cargar tus pedidos</h3>
      <p class="ped-estado-sub">Revisa tu conexión e inténtalo de nuevo.</p>
      <button class="ped-reintentar" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="!listaVisible.length" class="ped-estado-panel">
      <div class="ped-halo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="34" height="34"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      </div>
      <h3 class="ped-estado-titulo">{{ tab === 'activos' ? 'Sin pedidos en curso' : 'Historial vacío' }}</h3>
      <p class="ped-estado-sub">{{ tab === 'activos' ? 'Lo que pidas en el evento aparecerá aquí.' : 'Aún no hay pedidos completados.' }}</p>
    </div>

    <template v-else>
    <!-- Semáforo: el cliente mira el color, no lee el estado -->
    <LeyendaEstados class="ped-leyenda" />
    <ul class="ped-lista">
      <li v-for="p in listaVisible" :key="p.id_comanda" class="ped-item" :class="{ listo: esListoBarra(p), cortesia: p.metodo_pago === 'Cortesía' }" :style="{ '--sem-color': semaforoDe(p).color }">
        <div class="ped-top">
          <span class="ped-fecha">{{ formatoFecha(p.fecha) }}</span>
          <span class="ped-sem">
            <span v-if="esListoBarra(p)" class="ped-recoger">Recoger en barra</span>
            <PuntoEstado :pedido="p" grande />
          </span>
        </div>
        <ul class="ped-items">
          <li v-for="(it, i) in p.items" :key="i"><span class="ped-cant">{{ it.cantidad }}×</span> {{ it.nombre }}</li>
        </ul>
        <div class="ped-meta">
          <span v-if="p.evento" class="ped-badge evento">{{ p.evento }}</span>
          <span v-if="p.metodo_pago === 'Cortesía'" class="ped-badge cortesia">Cortesía de la casa</span>
          <template v-else>
            <span class="ped-badge" :class="'origen-' + p.origen">{{ etiquetaOrigen(p.origen) }}</span>
            <span class="ped-badge metodo">{{ p.metodo_pago }}</span>
          </template>
          <span v-if="p.modo_entrega" class="ped-badge entrega">{{ p.modo_entrega === 'llevar' ? 'A la mesa' : 'En barra' }}</span>
          <span v-if="p.mesa" class="ped-badge">Mesa {{ p.mesa }}</span>
          <!-- Devolución honesta: si pagó menos que el total pleno (premio/descuento),
               se muestra el total tachado y lo realmente pagado destacado -->
          <span class="ped-total">
            <template v-if="p.metodo_pago === 'Cortesía'"><b class="pt-gratis">Gratis</b></template>
            <template v-else-if="pagoDistinto(p)">
              <s class="pt-pleno">{{ formatoBs(p.total) }}</s>
              <b class="pt-pagado">Pagaste {{ formatoBs(p.total_pagado) }}</b>
            </template>
            <template v-else>{{ formatoBs(p.total) }}</template>
          </span>
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
        <p v-else-if="!p.modo_entrega && esActivo(p) && !p.ingresado" class="ped-nota-ingreso" title="Cuando ingreses al evento eliges cómo y cuándo recibirlo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 7v5l3 2"></path></svg>
          Eliges la entrega al ingresar
        </p>
        <!-- Devolución -->
        <div v-if="p.puede_reembolso" class="ped-reembolso">
          <span class="pr-info">
            <span class="pr-lbl">Te devolvemos</span>
            <b class="pr-monto">{{ formatoBs(p.reembolso_estimado) }}</b>
            <em v-if="p.sin_comision" class="pr-tag pr-full">sin comisión</em>
            <em v-else class="pr-tag pr-com">−{{ p.comision_pct }}%</em>
          </span>
          <button class="pr-btn" :disabled="reembolsando === p.id_comanda" @click="pedirDevolucion(p)">
            {{ reembolsando === p.id_comanda ? 'Procesando…' : 'Pedir devolución' }}
          </button>
        </div>
      </li>
    </ul>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import { formatoFecha, formatoBs } from '@/utilidades/formato.js'
import { semaforoDe } from '@/utilidades/estado-pedido.js'
import PuntoEstado from '@/componentes/comunes/PuntoEstado.vue'
import LeyendaEstados from '@/componentes/comunes/LeyendaEstados.vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'

const auth = useTiendaAutenticacion()
const notif = useNotificaciones()

const pedidos = ref([])
const cargando = ref(true)
const error = ref(false)
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

// Opciones del desplegable de eventos (menos texto que una fila de chips).
const opcionesEvento = computed(() => [
  { value: '', label: 'Todos tus eventos' },
  ...eventosDisponibles.value.map(e => ({ value: e.id, label: e.nombre })),
])

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

// Devolución honesta: el backend informa total_pagado (lo realmente cobrado,
// con premio/descuentos). Si existe y difiere del total pleno, se muestra lo pagado.
function pagoDistinto(p) {
  if (p.total_pagado === null || p.total_pagado === undefined) return false
  const pagado = Number(p.total_pagado)
  return Number.isFinite(pagado) && Math.abs(pagado - Number(p.total)) > 0.009
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
  error.value = false
  try {
    const [ped, cfg] = await Promise.all([
      clienteHttp.get('/comandas/mis-pedidos'),
      clienteHttp.get('/comandas/config-reembolso').catch(() => ({ comision_pct: 10 })),
    ])
    pedidos.value = ped
    comisionPct.value = cfg.comision_pct ?? 10
  } catch { error.value = true }
  finally { cargando.value = false }
}

async function pedirDevolucion(p) {
  // Se devuelve sobre lo realmente pagado (con premio/descuentos), no el total pleno
  const base = pagoDistinto(p) ? p.total_pagado : p.total
  const mensaje = p.sin_comision
    ? `Faltan más de 24 h para el evento: te devolvemos el TOTAL de ${formatoBs(base)} a tu billetera. ¿Confirmas?`
    : `Estás dentro de las 24 h previas: te devolvemos ${formatoBs(p.reembolso_estimado)} (el local retiene ${p.comision_pct}% de ${formatoBs(base)}). ¿Confirmas?`
  const ok = await notif.confirmar({
    titulo: 'Pedir devolución',
    mensaje,
    textoConfirmar: 'Sí, devolver',
  })
  if (!ok) return
  reembolsando.value = p.id_comanda
  try {
    const r = await clienteHttp.post(`/comandas/${p.id_comanda}/solicitar-reembolso`, {})
    notif.exito(`Devolución hecha: ${formatoBs(r.reembolsado)} a tu billetera`)
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

.ped-filtro { max-width: 320px; margin-bottom: 14px; }
@media (max-width: 560px) { .ped-filtro { max-width: 100%; } }

.ped-estado { display: flex; justify-content: center; padding: 3rem; }

/* Estados vacío / error — panel premium (halo + título + subtítulo) */
.ped-estado-panel {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: var(--esp-7) var(--esp-5); margin-top: 8px; text-align: center;
}
.ped-halo {
  display: inline-flex; align-items: center; justify-content: center;
  width: 80px; height: 80px; margin-bottom: 2px; border-radius: var(--radio-full);
  color: var(--morado-hover);
  background: radial-gradient(circle at 50% 38%, rgba(168,85,247,0.26), rgba(168,85,247,0.04));
  border: 1px solid var(--borde-sutil); box-shadow: inset 0 0 22px rgba(168,85,247,0.14);
}
.ped-halo.error {
  color: #FCA5A5;
  background: radial-gradient(circle at 50% 38%, rgba(239,68,68,0.22), rgba(239,68,68,0.04));
  border-color: rgba(239,68,68,0.3); box-shadow: inset 0 0 22px rgba(239,68,68,0.12);
}
.ped-estado-titulo { font-family: var(--fuente-titulo); font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); }
.ped-estado-sub { font-size: 0.88rem; line-height: 1.5; color: var(--texto-secundario); max-width: 34ch; }
.ped-reintentar {
  margin-top: 6px; padding: 11px 26px; border-radius: var(--radio-full);
  border: none; background: var(--gradiente-marca); color: #fff;
  font-size: 0.9rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 6px 18px rgba(168,85,247,0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ped-reintentar:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236,72,153,0.4); }
.ped-reintentar:active { transform: scale(0.98); }

.ped-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.ped-item {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-tarjeta);
  padding: 14px 16px;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.ped-item:hover { border-color: var(--borde-activo); transform: translateY(-2px); box-shadow: 0 12px 30px rgba(10, 6, 26, 0.5); }
.ped-item.listo { border-color: rgba(34,197,94,0.5); box-shadow: 0 0 20px rgba(34,197,94,0.15); }
.ped-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
.ped-fecha { font-size: 0.8rem; color: var(--texto-secundario); }
/* Semáforo: borde lateral + punto del color del estado (sin texto) */
.ped-leyenda { margin: 0 0 10px 2px; }
.ped-item { border-left: 4px solid var(--sem-color, var(--borde-sutil)); }
.ped-sem { display: inline-flex; align-items: center; gap: 10px; }
.ped-recoger { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #fff; background: rgba(59,130,246,0.35); padding: 3px 10px; border-radius: var(--radio-full); animation: pulso 1.6s ease-in-out infinite; }
.ped-item.cortesia { background: linear-gradient(135deg, rgba(236,72,153,0.10), transparent 60%); }
.ped-badge.cortesia { background: rgba(236,72,153,0.18); color: #F9A8D4; font-weight: 800; }
.pt-gratis { color: #F9A8D4; }
@keyframes pulso { 0%,100% { opacity: 1; } 50% { opacity: 0.65; } }
.ped-items { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.ped-items li { font-size: 0.9rem; color: var(--texto-principal); }
.ped-cant { color: var(--morado-hover); font-weight: 800; }
.ped-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.ped-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 9px; border-radius: var(--radio-full); background: rgba(255,255,255,0.06); color: var(--texto-secundario); border: 1px solid var(--borde-sutil); }
.ped-badge.evento { background: rgba(99,102,241,0.16); color: #C7D2FE; border-color: transparent; }
.ped-badge.origen-app { background: rgba(168,85,247,0.18); color: #E9D5FF; border-color: transparent; }
.ped-badge.metodo { background: rgba(236,72,153,0.14); color: #F9A8D4; border-color: transparent; }
.ped-total { margin-left: auto; display: inline-flex; align-items: baseline; gap: 7px; font-family: var(--fuente-titulo); font-weight: 800; color: var(--rosa-acento); font-variant-numeric: tabular-nums; }
/* Pagó menos que el total pleno (premio/descuento): pleno tachado, pagado destacado */
.pt-pleno { text-decoration: line-through; color: var(--texto-desactivado); font-weight: 600; font-size: 0.78rem; }
.pt-pagado { color: var(--rosa-acento); white-space: nowrap; }

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
.pr-info { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; font-size: 0.8rem; color: var(--texto-secundario); }
.pr-lbl { font-size: 0.74rem; color: var(--texto-desactivado); }
.pr-monto { font-family: var(--fuente-titulo); font-size: 1.12rem; font-weight: 800; color: var(--color-exito); font-variant-numeric: tabular-nums; }
.pr-tag { font-style: normal; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; letter-spacing: .02em; }
.pr-full { color: #86EFAC; background: rgba(34,197,94,.15); }
.pr-com { color: #FCD34D; background: rgba(245,158,11,.15); }
.pr-btn { flex-shrink: 0; padding: 8px 14px; border-radius: var(--radio-full); border: 1px solid var(--borde-activo); background: rgba(168,85,247,0.1); color: var(--morado-hover); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.pr-btn:hover:not(:disabled) { background: rgba(168,85,247,0.2); color: #fff; }
.pr-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.slide-enter-active, .slide-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
