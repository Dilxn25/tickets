<template>
  <div class="vista-aforo-admin">
    <div class="encabezado aparecer-subir">
      <div>
        <h1 class="titulo">Aforo en tiempo real</h1>
        <p class="subtitulo">Monitorea la ocupación de cada zona en vivo</p>
      </div>
      <select v-if="eventos.length" v-model="idEventoSel" class="selector-evento" @change="cargarAforo">
        <option v-for="e in eventos" :key="e.id_evento" :value="e.id_evento">{{ e.nombre_evento }}</option>
      </select>
    </div>

    <div v-if="cargando" class="cargando"><div class="spinner"></div></div>

    <div v-else-if="!eventos.length" class="vacio aparecer-zoom">
      <div class="vacio-icono" aria-hidden="true">
        <span class="dot"></span>
      </div>
      <p class="vacio-titulo">Sin zonas para monitorear</p>
      <p>Aún no hay eventos con zonas configuradas.</p>
    </div>

    <template v-else>
      <!-- Resumen general -->
      <div class="resumen aparecer-subir">
        <div class="anillo" :class="estadoTotal">
          <svg viewBox="0 0 120 120">
            <circle class="anillo-fondo" cx="60" cy="60" r="52" />
            <circle class="anillo-valor" cx="60" cy="60" r="52"
              :stroke-dasharray="circunferencia"
              :stroke-dashoffset="circunferencia * (1 - Math.min(100, porcentajeTotal) / 100)" />
          </svg>
          <div class="anillo-centro">
            <span class="pct">{{ porcentajeTotal }}%</span>
            <span class="lbl">ocupado</span>
          </div>
        </div>
        <div class="resumen-datos">
          <div class="dato-grande">
            <span class="num">{{ aforoTotal }}</span>
            <span class="lbl">personas dentro</span>
          </div>
          <div class="dato-chico"><b>{{ capacidadTotal }}</b> capacidad total</div>
          <div class="dato-chico"><b>{{ Math.max(0, capacidadTotal - aforoTotal) }}</b> lugares libres</div>
          <div class="estado-chip" :class="estadoTotal">{{ textoEstado(estadoTotal) }}</div>
        </div>
      </div>

      <!-- Zonas -->
      <div class="grid-zonas escalonar">
        <div v-for="z in zonas" :key="z.id_zona" class="zona-card hover-elevar" :class="z.estado">
          <div class="zona-top">
            <span class="zona-nombre">{{ z.nombre_zona }}</span>
            <span class="zona-estado" :class="z.estado">{{ textoEstado(z.estado) }}</span>
          </div>
          <div class="zona-num"><b>{{ z.aforo_actual }}</b> / {{ z.capacidad }}</div>
          <div class="barra">
            <div class="barra-relleno" :class="z.estado" :style="{ width: Math.min(100, z.porcentaje) + '%' }"></div>
          </div>
          <div class="zona-pie">
            <span>{{ z.porcentaje }}%</span>
            <span>{{ z.disponibles }} libres</span>
          </div>
        </div>
      </div>

      <p class="live-nota">
        <span class="dot"></span> Actualización automática en vivo
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { servicioAforo } from '@/servicios-api/servicio-aforo.js'

const eventos = ref([])
const idEventoSel = ref(null)
const zonas = ref([])
const aforoTotal = ref(0)
const capacidadTotal = ref(0)
const porcentajeTotal = ref(0)
const estadoTotal = ref('ok')
const cargando = ref(true)

const circunferencia = 2 * Math.PI * 52
let socket = null

function textoEstado(e) {
  if (e === 'lleno') return 'Lleno'
  if (e === 'alerta') return 'Casi lleno'
  return 'Disponible'
}

function aplicar(data) {
  zonas.value = data.zonas || []
  aforoTotal.value = data.aforo_total || 0
  capacidadTotal.value = data.capacidad_total || 0
  porcentajeTotal.value = data.porcentaje_total || 0
  estadoTotal.value = data.estado_total || 'ok'
}

function recomputar() {
  aforoTotal.value = zonas.value.reduce((s, z) => s + z.aforo_actual, 0)
  capacidadTotal.value = zonas.value.reduce((s, z) => s + z.capacidad, 0)
  porcentajeTotal.value = capacidadTotal.value > 0 ? Math.round((aforoTotal.value / capacidadTotal.value) * 100) : 0
  estadoTotal.value = porcentajeTotal.value >= 100 ? 'lleno' : (porcentajeTotal.value >= 85 ? 'alerta' : 'ok')
}

async function cargarAforo() {
  if (!idEventoSel.value) return
  cargando.value = true
  try {
    aplicar(await servicioAforo.obtenerAforoEvento(idEventoSel.value))
  } catch (err) {
    console.error('Error cargando aforo:', err)
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  try {
    eventos.value = await servicioAforo.listarEventos()
    if (eventos.value.length) {
      idEventoSel.value = eventos.value[0].id_evento
      await cargarAforo()
    } else {
      cargando.value = false
    }
  } catch (err) {
    console.error('Error cargando eventos:', err)
    cargando.value = false
  }

  socket = io()
  socket.on('aforo_actualizado', (resumen) => {
    if (resumen.id_evento !== idEventoSel.value) return
    const i = zonas.value.findIndex(z => z.id_zona === resumen.id_zona)
    if (i >= 0) zonas.value[i] = { ...zonas.value[i], ...resumen }
    recomputar()
  })
})

onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.vista-aforo-admin { padding: var(--esp-6); max-width: 1400px; margin: 0 auto; }

.encabezado { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--esp-4); margin-bottom: var(--esp-6); flex-wrap: wrap; }
.titulo { font-family: var(--fuente-titulo); font-size: 1.65rem; font-weight: 800; letter-spacing: -0.025em; line-height: 1.1; color: var(--texto-principal); text-wrap: balance; }
.subtitulo { font-size: 0.9rem; color: var(--texto-secundario); margin-top: 2px; }
.selector-evento { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 10px 14px; border-radius: var(--radio-md); font-size: 0.9rem; font-weight: 600; min-width: 220px; transition: var(--trans-normal); cursor: pointer; }
.selector-evento:hover { border-color: var(--borde-activo); box-shadow: var(--sombra-glow); }
.selector-evento:focus-visible { outline: none; border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }

.cargando { display: flex; justify-content: center; padding: 4rem; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(139,92,246,0.15); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 0.9s cubic-bezier(0.5,0.15,0.5,0.85) infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.vacio { display: flex; flex-direction: column; align-items: center; text-align: center; color: var(--texto-secundario); padding: 4.5rem 2rem; }
.vacio-icono { display: grid; place-items: center; width: 64px; height: 64px; border-radius: var(--radio-full); background: rgba(155,89,182,0.12); border: 1px solid var(--borde-sutil); margin-bottom: var(--esp-4); }
.vacio-icono .dot { width: 12px; height: 12px; background: var(--morado-brillante); animation: latido 1.8s infinite; }
.vacio-titulo { font-family: var(--fuente-titulo); font-size: 1.05rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 4px; }

/* Resumen */
.resumen { display: flex; align-items: center; gap: 2rem; background: var(--gradiente-sutil); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); padding: var(--esp-6); margin-bottom: var(--esp-5); flex-wrap: wrap; box-shadow: var(--sombra-tarjeta); }
.anillo { position: relative; width: 140px; height: 140px; flex-shrink: 0; }
.anillo svg { transform: rotate(-90deg); width: 140px; height: 140px; }
.anillo-fondo { fill: none; stroke: var(--fondo-app); stroke-width: 10; }
.anillo-valor { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
.anillo.ok .anillo-valor { stroke: var(--morado-brillante); filter: drop-shadow(0 0 6px rgba(168,85,247,0.5)); }
.anillo.alerta .anillo-valor { stroke: #eab308; filter: drop-shadow(0 0 6px rgba(234,179,8,0.45)); }
.anillo.lleno .anillo-valor { stroke: #ef4444; filter: drop-shadow(0 0 6px rgba(239,68,68,0.45)); }
.anillo-centro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.anillo-centro .pct { font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.anillo-centro .lbl { font-size: 0.72rem; color: var(--texto-secundario); }

.resumen-datos { display: flex; flex-direction: column; gap: 6px; }
.dato-grande { display: flex; flex-direction: column; }
.dato-grande .num { font-size: 2.3rem; font-weight: 800; letter-spacing: -0.03em; color: var(--texto-principal); line-height: 1; font-variant-numeric: tabular-nums; }
.dato-grande .lbl { font-size: 0.82rem; color: var(--texto-secundario); margin-top: 2px; }
.dato-chico { font-size: 0.85rem; color: var(--texto-secundario); font-variant-numeric: tabular-nums; }
.dato-chico b { color: var(--texto-principal); }
.estado-chip { display: inline-block; width: fit-content; margin-top: var(--esp-2); font-size: 0.78rem; font-weight: 700; padding: 4px 12px; border-radius: var(--radio-full); }
.estado-chip.ok { background: rgba(155,89,182,0.18); color: var(--morado-brillante); }
.estado-chip.alerta { background: rgba(234,179,8,0.15); color: #eab308; }
.estado-chip.lleno { background: rgba(239,68,68,0.15); color: #ef4444; }

/* Zonas */
.grid-zonas { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--esp-4); }
.zona-card { position: relative; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: var(--esp-5); transition: var(--trans-normal); overflow: hidden; }
.zona-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 2px; background: var(--gradiente-marca); opacity: 0; transition: opacity 0.25s ease; }
.zona-card:hover { border-color: var(--borde-activo); }
.zona-card:hover::before { opacity: 1; }
.zona-card.alerta { border-color: rgba(234,179,8,0.4); }
.zona-card.lleno { border-color: rgba(239,68,68,0.45); }
.zona-top { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-2); margin-bottom: 0.7rem; }
.zona-nombre { font-size: 0.95rem; font-weight: 700; color: var(--texto-principal); letter-spacing: -0.01em; }
.zona-estado { flex-shrink: 0; font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: var(--radio-full); }
.zona-estado.ok { background: rgba(155,89,182,0.18); color: var(--morado-brillante); }
.zona-estado.alerta { background: rgba(234,179,8,0.15); color: #eab308; }
.zona-estado.lleno { background: rgba(239,68,68,0.15); color: #ef4444; }
.zona-num { font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-secundario); margin-bottom: 0.7rem; font-variant-numeric: tabular-nums; }
.zona-num b { color: var(--rosa-acento); }
.barra { height: 10px; background: var(--fondo-app); border-radius: var(--radio-full); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.35); }
.barra-relleno { height: 100%; border-radius: var(--radio-full); transition: width 0.6s cubic-bezier(0.22,1,0.36,1); }
.barra-relleno.ok { background: linear-gradient(90deg, var(--morado-brillante), var(--rosa-acento)); }
.barra-relleno.alerta { background: linear-gradient(90deg, #eab308, #f59e0b); }
.barra-relleno.lleno { background: linear-gradient(90deg, #ef4444, #dc2626); }
.zona-pie { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--texto-secundario); margin-top: 8px; font-variant-numeric: tabular-nums; }

.live-nota { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: var(--esp-6); font-size: 0.8rem; color: var(--texto-secundario); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.6); animation: latido 1.4s infinite; }
@keyframes latido { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

@media (prefers-reduced-motion: reduce) {
  .spinner, .dot, .vacio-icono .dot { animation: none; }
  .barra-relleno, .anillo-valor, .zona-card, .selector-evento { transition: none; }
}
</style>
