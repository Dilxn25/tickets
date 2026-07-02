<template>
  <div class="vista-aforo-admin">
    <div class="vista-cabecera aparecer-subir">
      <div class="cabecera-titulo">
        <span class="titulo-medallon" :class="!cargando && eventos.length ? estadoTotal : ''" aria-hidden="true">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path d="M12 21a9 9 0 1 0-9-9" />
            <path d="M12 12l4-3" stroke-linecap="round" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <div>
          <h1 class="vista-titulo">Aforo en tiempo real</h1>
          <p class="vista-subtitulo">Monitorea la ocupación de cada zona en vivo</p>
        </div>
      </div>
      <div class="cabecera-acciones">
        <span v-if="!cargando && eventos.length" class="pulso-vivo"><span class="dot"></span>En vivo</span>
        <select v-if="eventos.length" v-model="idEventoSel" class="selector-evento" @change="cargarAforo">
          <option v-for="e in eventos" :key="e.id_evento" :value="e.id_evento">{{ e.nombre_evento }}</option>
        </select>
      </div>
    </div>

    <div v-if="cargando" class="cargando"><div class="spinner"></div></div>

    <div v-else-if="!eventos.length" class="vacio superficie aparecer-zoom">
      <div class="vacio-icono" aria-hidden="true">
        <span class="dot"></span>
      </div>
      <p class="vacio-titulo">Sin zonas para monitorear</p>
      <p>Aún no hay eventos con zonas configuradas.</p>
    </div>

    <template v-else>
      <!-- Resumen general -->
      <section class="resumen superficie aparecer-subir" :class="estadoTotal">
        <div class="resumen-gauge">
          <div class="anillo" :class="estadoTotal">
            <svg viewBox="0 0 120 120">
              <circle class="anillo-pista" cx="60" cy="60" r="52" />
              <circle class="anillo-fondo" cx="60" cy="60" r="52" />
              <circle class="anillo-valor" cx="60" cy="60" r="52"
                :stroke-dasharray="circunferencia"
                :stroke-dashoffset="circunferencia * (1 - Math.min(100, porcentajeTotal) / 100)" />
            </svg>
            <div class="anillo-centro">
              <span class="pct">{{ porcentajeTotal }}<i>%</i></span>
              <span class="lbl">ocupado</span>
            </div>
          </div>
          <div class="estado-chip" :class="estadoTotal">
            <span class="chip-dot"></span>{{ textoEstado(estadoTotal) }}
          </div>
        </div>

        <div class="resumen-datos">
          <div class="kpi kpi-hero">
            <span class="kpi-num">{{ aforoTotal }}</span>
            <span class="kpi-lbl">personas dentro</span>
          </div>
          <div class="kpi-fila">
            <div class="kpi">
              <span class="kpi-num sm">{{ capacidadTotal }}</span>
              <span class="kpi-lbl">capacidad total</span>
            </div>
            <div class="kpi">
              <span class="kpi-num sm acento-libre">{{ Math.max(0, capacidadTotal - aforoTotal) }}</span>
              <span class="kpi-lbl">lugares libres</span>
            </div>
            <div class="kpi">
              <span class="kpi-num sm">{{ zonas.length }}</span>
              <span class="kpi-lbl">zonas activas</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Zonas -->
      <div class="zonas-encabezado aparecer-subir">
        <h2 class="seccion-h2">Ocupación por zona</h2>
        <ul class="leyenda" aria-hidden="true">
          <li class="ok"><span class="ll-dot"></span>Disponible</li>
          <li class="alerta"><span class="ll-dot"></span>Casi lleno</li>
          <li class="lleno"><span class="ll-dot"></span>Lleno</li>
        </ul>
      </div>

      <div class="grid-zonas escalonar">
        <div v-for="z in zonas" :key="z.id_zona" class="zona-card superficie hover-elevar" :class="z.estado">
          <div class="zona-top">
            <span class="zona-nombre">{{ z.nombre_zona }}</span>
            <span class="zona-estado" :class="z.estado"><span class="ze-dot"></span>{{ textoEstado(z.estado) }}</span>
          </div>
          <div class="zona-num"><b>{{ z.aforo_actual }}</b><i>/ {{ z.capacidad }}</i></div>
          <div class="barra">
            <div class="barra-relleno" :class="z.estado" :style="{ width: Math.min(100, z.porcentaje) + '%' }"></div>
          </div>
          <div class="zona-pie">
            <span class="zp-pct">{{ z.porcentaje }}%</span>
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

/* Estado -> color de acento (una fuente de verdad) */
.ok    { --c: var(--morado-brillante); --c-rgb: 168,85,247; --c2: var(--rosa-acento); }
.alerta{ --c: #f5c518; --c-rgb: 245,197,24;  --c2: #f59e0b; }
.lleno { --c: #f4586a; --c-rgb: 244,88,106;  --c2: #dc2626; }

/* Cabecera de vista */
.vista-cabecera { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-4); margin-bottom: var(--esp-6); flex-wrap: wrap; }
.cabecera-titulo { display: flex; align-items: center; gap: var(--esp-4); min-width: 0; }
.titulo-medallon { display: grid; place-items: center; width: 48px; height: 48px; flex-shrink: 0; border-radius: var(--radio-lg); color: var(--morado-brillante); background: linear-gradient(150deg, rgba(168,85,247,0.22), rgba(236,72,153,0.12)); border: 1px solid rgba(168,85,247,0.35); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 22px rgba(168,85,247,0.22); transition: var(--trans-normal); }
.titulo-medallon.alerta { color: #f5c518; background: linear-gradient(150deg, rgba(245,197,24,0.2), rgba(245,158,11,0.1)); border-color: rgba(245,197,24,0.4); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 22px rgba(245,197,24,0.2); }
.titulo-medallon.lleno { color: #f4586a; background: linear-gradient(150deg, rgba(244,88,106,0.22), rgba(220,38,38,0.12)); border-color: rgba(244,88,106,0.42); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 22px rgba(244,88,106,0.22); }
.vista-titulo { font-family: var(--fuente-titulo); font-size: 1.7rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; color: var(--texto-principal); text-wrap: balance; }
.vista-subtitulo { font-size: 0.9rem; color: var(--texto-secundario); margin-top: 2px; }

.cabecera-acciones { display: flex; align-items: center; gap: var(--esp-3); flex-wrap: wrap; }
.pulso-vivo { display: inline-flex; align-items: center; gap: 7px; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.01em; color: #7ef0b0; padding: 7px 13px; border-radius: var(--radio-full); background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.28); }
.selector-evento { background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 11px 15px; border-radius: var(--radio-md); font-size: 0.9rem; font-weight: 600; min-width: 220px; transition: var(--trans-normal); cursor: pointer; }
.selector-evento:hover { border-color: var(--borde-activo); box-shadow: var(--sombra-glow); }
.selector-evento:focus-visible { outline: none; border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }

.cargando { display: flex; justify-content: center; padding: 4rem; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(139,92,246,0.15); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 0.9s cubic-bezier(0.5,0.15,0.5,0.85) infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.vacio { display: flex; flex-direction: column; align-items: center; text-align: center; color: var(--texto-secundario); padding: 4.5rem 2rem; }
.vacio-icono { display: grid; place-items: center; width: 64px; height: 64px; border-radius: var(--radio-full); background: rgba(155,89,182,0.12); border: 1px solid var(--borde-sutil); margin-bottom: var(--esp-4); }
.vacio-icono .dot { width: 12px; height: 12px; background: var(--morado-brillante); box-shadow: 0 0 10px rgba(168,85,247,0.7); animation: latido 1.8s infinite; }
.vacio-titulo { font-family: var(--fuente-titulo); font-size: 1.05rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 4px; }

/* Resumen (panel hero: gauge + KPIs) */
.resumen { position: relative; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: clamp(1.5rem, 4vw, 3.5rem); padding: clamp(1.5rem, 3vw, 2.5rem); margin-bottom: var(--esp-6); overflow: hidden; }
.resumen::before { content: ''; position: absolute; top: -40%; left: -10%; width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle, rgba(var(--c-rgb, 168,85,247), 0.22), transparent 70%); pointer-events: none; filter: blur(6px); transition: opacity 0.6s ease; }

.resumen-gauge { display: flex; flex-direction: column; align-items: center; gap: var(--esp-4); position: relative; z-index: 1; }
.anillo { position: relative; width: 168px; height: 168px; flex-shrink: 0; }
.anillo svg { transform: rotate(-90deg); width: 168px; height: 168px; }
.anillo-pista { fill: none; stroke: rgba(255,255,255,0.04); stroke-width: 14; }
.anillo-fondo { fill: none; stroke: rgba(0,0,0,0.35); stroke-width: 11; }
.anillo-valor { fill: none; stroke-width: 11; stroke-linecap: round; stroke: var(--c, var(--morado-brillante)); filter: drop-shadow(0 0 8px rgba(var(--c-rgb, 168,85,247), 0.6)); transition: stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease; }
.anillo-centro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.anillo-centro .pct { font-family: var(--fuente-titulo); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.anillo-centro .pct i { font-style: normal; font-size: 1.1rem; font-weight: 700; color: var(--c, var(--morado-brillante)); margin-left: 1px; }
.anillo-centro .lbl { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: var(--texto-secundario); margin-top: 5px; }

.estado-chip { display: inline-flex; align-items: center; gap: 7px; font-size: 0.8rem; font-weight: 700; padding: 6px 15px; border-radius: var(--radio-full); color: var(--c, var(--morado-brillante)); background: rgba(var(--c-rgb, 168,85,247), 0.14); border: 1px solid rgba(var(--c-rgb, 168,85,247), 0.32); }
.chip-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }

.resumen-datos { position: relative; z-index: 1; display: flex; flex-direction: column; gap: var(--esp-5); min-width: 0; }
.kpi { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kpi-num { font-family: var(--fuente-titulo); font-weight: 800; letter-spacing: -0.03em; line-height: 0.95; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.kpi-hero .kpi-num { font-size: clamp(2.8rem, 6vw, 3.8rem); }
.kpi-num.sm { font-size: 1.7rem; }
.kpi-num.acento-libre { color: var(--rosa-acento); }
.kpi-lbl { font-size: 0.8rem; color: var(--texto-secundario); }
.kpi-hero .kpi-lbl { font-size: 0.9rem; font-weight: 600; }
.kpi-fila { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--esp-4); padding-top: var(--esp-5); border-top: 1px solid var(--borde-sutil); }

/* Encabezado de sección de zonas */
.zonas-encabezado { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-4); margin-bottom: var(--esp-4); flex-wrap: wrap; }
.seccion-h2 { font-family: var(--fuente-titulo); font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); }
.leyenda { display: flex; align-items: center; gap: var(--esp-4); flex-wrap: wrap; }
.leyenda li { display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; font-weight: 600; color: var(--texto-secundario); }
.leyenda .ll-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px rgba(var(--c-rgb), 0.55); }

/* Zonas */
.grid-zonas { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: var(--esp-4); }
.zona-card { position: relative; padding: var(--esp-5); overflow: hidden; }
.zona-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--c), var(--c2, var(--c))); opacity: 0.9; }
.zona-top { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-2); margin-bottom: var(--esp-3); }
.zona-nombre { font-size: 0.98rem; font-weight: 700; color: var(--texto-principal); letter-spacing: -0.01em; }
.zona-estado { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; font-size: 0.7rem; font-weight: 700; padding: 4px 11px; border-radius: var(--radio-full); color: var(--c); background: rgba(var(--c-rgb), 0.14); border: 1px solid rgba(var(--c-rgb), 0.3); }
.zona-estado .ze-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.zona-num { display: flex; align-items: baseline; gap: 6px; margin-bottom: var(--esp-3); font-variant-numeric: tabular-nums; }
.zona-num b { font-family: var(--fuente-titulo); font-size: 1.85rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--texto-principal); }
.zona-num i { font-style: normal; font-size: 0.95rem; font-weight: 600; color: var(--texto-secundario); }
.barra { height: 10px; background: rgba(0,0,0,0.4); border-radius: var(--radio-full); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.45); }
.barra-relleno { height: 100%; border-radius: var(--radio-full); background: linear-gradient(90deg, var(--c), var(--c2, var(--c))); box-shadow: 0 0 12px rgba(var(--c-rgb), 0.5); transition: width 0.7s cubic-bezier(0.22,1,0.36,1); }
.zona-pie { display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--texto-secundario); margin-top: var(--esp-3); font-variant-numeric: tabular-nums; }
.zp-pct { font-weight: 700; color: var(--c); }

.live-nota { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: var(--esp-6); font-size: 0.8rem; color: var(--texto-secundario); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.6); animation: latido 1.4s infinite; }
@keyframes latido { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

@media (max-width: 720px) {
  .resumen { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: var(--esp-5); }
  .resumen-datos { align-items: center; width: 100%; }
  .kpi-hero { align-items: center; }
  .kpi-fila { width: 100%; gap: var(--esp-3); }
  .kpi-num.sm { font-size: 1.4rem; }
}

@media (prefers-reduced-motion: reduce) {
  .spinner, .dot, .vacio-icono .dot { animation: none; }
  .barra-relleno, .anillo-valor, .zona-card, .selector-evento, .titulo-medallon { transition: none; }
}
</style>
