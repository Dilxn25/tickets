<template>
  <div class="bf-raiz" :class="{ 'bf-abierto': abierto }">
    <button
      ref="disparador"
      type="button"
      class="bf-disparador"
      :class="{ 'bf-con-valor': !!modelValue }"
      :disabled="disabled"
      @click="alternar"
    >
      <svg class="bf-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span class="bf-texto">{{ parteFecha ? textoDisparador : (placeholder || (conHora ? 'Elegir fecha y hora' : 'Elegir fecha')) }}</span>
      <button v-if="modelValue && clearable" type="button" class="bf-limpiar" title="Quitar fecha" @click.stop="limpiar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </button>

    <Teleport to="body">
      <transition name="bf-fade">
        <div v-if="abierto" ref="panel" class="bf-panel" :style="estiloPanel">
          <div class="bf-cab">
            <button type="button" class="bf-nav" @click="cambiarMes(-1)" aria-label="Mes anterior">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span class="bf-mes">{{ etiquetaMes }}</span>
            <button type="button" class="bf-nav" @click="cambiarMes(1)" aria-label="Mes siguiente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div class="bf-semana">
            <span v-for="d in ['L','M','X','J','V','S','D']" :key="d">{{ d }}</span>
          </div>
          <div class="bf-grid">
            <button
              v-for="(dia, i) in dias"
              :key="i"
              type="button"
              class="bf-dia"
              :class="{ 'bf-vacio': !dia, 'bf-sel': dia && iso(dia) === modelValue, 'bf-hoy': dia && iso(dia) === isoHoy, 'bf-fuera': dia && fueraRango(dia) }"
              :disabled="!dia || fueraRango(dia)"
              @click="dia && elegir(dia)"
            >{{ dia ? dia.getDate() : '' }}</button>
          </div>
          <!-- Selector de hora (solo cuando conHora): reloj propio de horas/minutos -->
          <div v-if="conHora" class="bf-hora">
            <svg class="bf-hora-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
            <div class="bf-hora-campos">
              <select class="bf-hora-sel" :value="hora" @change="setHora($event.target.value)" aria-label="Hora">
                <option v-for="h in horasOpc" :key="h" :value="h">{{ h }}</option>
              </select>
              <span class="bf-hora-sep">:</span>
              <select class="bf-hora-sel" :value="minuto" @change="setMinuto($event.target.value)" aria-label="Minutos">
                <option v-for="m in minutosOpc" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>
          <div class="bf-pie">
            <button type="button" class="bf-hoy-btn" @click="irHoy">Hoy</button>
            <button v-if="conHora && parteFecha" type="button" class="bf-hoy-btn" @click="cerrar">Listo</button>
            <button v-if="clearable" type="button" class="bf-limpiar-btn" @click="limpiar">Limpiar</button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  // Sin conHora: 'YYYY-MM-DD'. Con conHora: 'YYYY-MM-DDTHH:mm' (compatible datetime-local)
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  conHora: { type: Boolean, default: false },        // muestra selector de hora
  horaPorDefecto: { type: String, default: '20:00' }, // hora inicial al elegir un día sin hora previa
})
const emit = defineEmits(['update:modelValue'])

// Partes del valor: fecha ('YYYY-MM-DD') y hora ('HH:mm')
const parteFecha = computed(() => (props.modelValue || '').split('T')[0] || '')
const parteHora = computed(() => {
  const t = (props.modelValue || '').split('T')[1]
  return t ? t.slice(0, 5) : ''
})
const hora = computed(() => (parteHora.value || props.horaPorDefecto).slice(0, 2))
const minuto = computed(() => (parteHora.value || props.horaPorDefecto).slice(3, 5))
const horasOpc = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutosOpc = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

const textoDisparador = computed(() => {
  if (!parteFecha.value) return ''
  const f = textoFecha(parteFecha.value)
  return props.conHora ? `${f} · ${parteHora.value || props.horaPorDefecto}` : f
})

// Construye el valor emitido según haya hora o no
function componer(fechaIso, horaStr) {
  return props.conHora ? `${fechaIso}T${horaStr || props.horaPorDefecto}` : fechaIso
}
function setHora(h) {
  const base = parteFecha.value || isoHoy
  emit('update:modelValue', `${base}T${h}:${minuto.value}`)
}
function setMinuto(m) {
  const base = parteFecha.value || isoHoy
  emit('update:modelValue', `${base}T${hora.value}:${m}`)
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const disparador = ref(null)
const panel = ref(null)
const abierto = ref(false)
const estiloPanel = ref({})

// Mes visible (primer día del mes). Arranca en el valor o en hoy.
const hoy = new Date()
const isoHoy = iso(hoy)
const mesVisible = ref(inicioMes(props.modelValue ? desdeIso((props.modelValue).split('T')[0]) : hoy))

function pad(n) { return String(n).padStart(2, '0') }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function desdeIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
function inicioMes(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function textoFecha(s) { const d = desdeIso(s); return `${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}` }

const etiquetaMes = computed(() => `${MESES[mesVisible.value.getMonth()]} ${mesVisible.value.getFullYear()}`)

// Rejilla de días con huecos iniciales (semana empieza en lunes).
const dias = computed(() => {
  const y = mesVisible.value.getFullYear()
  const m = mesVisible.value.getMonth()
  const primer = new Date(y, m, 1)
  const offset = (primer.getDay() + 6) % 7 // 0 = lunes
  const total = new Date(y, m + 1, 0).getDate()
  const arr = []
  for (let i = 0; i < offset; i++) arr.push(null)
  for (let d = 1; d <= total; d++) arr.push(new Date(y, m, d))
  return arr
})

function fueraRango(d) {
  const s = iso(d)
  if (props.min && s < props.min) return true
  if (props.max && s > props.max) return true
  return false
}

function posicionar() {
  const el = disparador.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const espacioAbajo = window.innerHeight - r.bottom
  const abrirArriba = espacioAbajo < 340 && r.top > espacioAbajo
  estiloPanel.value = {
    position: 'fixed',
    left: `${Math.min(r.left, window.innerWidth - 296)}px`,
    ...(abrirArriba ? { bottom: `${window.innerHeight - r.top + 6}px` } : { top: `${r.bottom + 6}px` }),
  }
}
function abrir() {
  if (props.disabled) return
  mesVisible.value = inicioMes(parteFecha.value ? desdeIso(parteFecha.value) : hoy)
  abierto.value = true
  posicionar()
  nextTick(() => {
    window.addEventListener('scroll', posicionar, true)
    window.addEventListener('resize', posicionar)
    document.addEventListener('mousedown', alClickFuera, true)
  })
}
function cerrar() {
  abierto.value = false
  window.removeEventListener('scroll', posicionar, true)
  window.removeEventListener('resize', posicionar)
  document.removeEventListener('mousedown', alClickFuera, true)
}
function alternar() { abierto.value ? cerrar() : abrir() }
function alClickFuera(e) {
  if (disparador.value?.contains(e.target) || panel.value?.contains(e.target)) return
  cerrar()
}

function cambiarMes(delta) {
  mesVisible.value = new Date(mesVisible.value.getFullYear(), mesVisible.value.getMonth() + delta, 1)
}
function elegir(d) {
  emit('update:modelValue', componer(iso(d), parteHora.value))
  // Con hora, dejamos el panel abierto para ajustar la hora; sin hora, cerramos
  if (!props.conHora) cerrar()
}
function irHoy() {
  mesVisible.value = inicioMes(hoy)
  if (!fueraRango(hoy)) elegir(hoy)
}
function limpiar() {
  emit('update:modelValue', '')
  cerrar()
}

onBeforeUnmount(cerrar)
</script>

<style scoped>
.bf-raiz { position: relative; width: 100%; }
.bf-disparador {
  width: 100%;
  display: flex; align-items: center; gap: .55rem;
  padding: .6rem .8rem; min-height: 42px;
  background: var(--fondo-tarjeta-alt, rgba(255,255,255,.03));
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md, 10px);
  color: var(--texto-principal); font-family: inherit; font-size: .875rem; font-weight: 500;
  cursor: pointer; text-align: left;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.bf-disparador:hover:not(:disabled) { border-color: var(--morado-brillante, #a855f7); }
.bf-abierto .bf-disparador { border-color: var(--morado-brillante, #a855f7); box-shadow: 0 0 0 3px rgba(168,85,247,.22); }
.bf-disparador:disabled { opacity: .55; cursor: not-allowed; }
.bf-icono { width: 16px; height: 16px; flex-shrink: 0; color: var(--morado-hover, #c084fc); }
.bf-texto { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bf-disparador:not(.bf-con-valor) .bf-texto { color: var(--texto-desactivado); font-weight: 400; }
.bf-limpiar { flex-shrink: 0; display: inline-flex; background: none; border: none; color: var(--texto-desactivado); cursor: pointer; padding: 2px; border-radius: 4px; }
.bf-limpiar:hover { color: var(--color-error, #ef4444); }
.bf-limpiar svg { width: 14px; height: 14px; }
</style>

<!-- Panel teleportado al body: no scoped -->
<style>
.bf-panel {
  z-index: 3000; width: 284px; padding: 12px;
  background: var(--fondo-tarjeta, #17141f);
  border: 1px solid var(--borde-medio, rgba(168,85,247,.28));
  border-radius: var(--radio-lg, 14px);
  box-shadow: 0 18px 44px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05);
  backdrop-filter: blur(14px);
}
.bf-cab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.bf-mes { font-weight: 700; font-size: .9rem; color: var(--texto-principal); }
.bf-nav { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta-alt, rgba(255,255,255,.03)); color: var(--texto-secundario); cursor: pointer; transition: border-color .15s ease, color .15s ease; }
.bf-nav:hover { border-color: var(--morado-brillante, #a855f7); color: var(--texto-principal); }
.bf-nav svg { width: 15px; height: 15px; }
.bf-semana { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; }
.bf-semana span { text-align: center; font-size: .68rem; font-weight: 700; color: var(--texto-desactivado); text-transform: uppercase; }
.bf-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.bf-dia { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--texto-secundario); font-size: .82rem; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background .14s ease, color .14s ease; }
.bf-dia:hover:not(:disabled):not(.bf-sel) { background: rgba(168,85,247,.16); color: var(--texto-principal); }
.bf-dia.bf-vacio { visibility: hidden; }
.bf-dia.bf-hoy { color: var(--morado-hover, #c084fc); box-shadow: inset 0 0 0 1px rgba(168,85,247,.5); }
.bf-dia.bf-sel { background: var(--gradiente-marca, linear-gradient(135deg,#a855f7,#ec4899)); color: #fff; box-shadow: 0 4px 12px rgba(168,85,247,.4); }
.bf-dia.bf-fuera { opacity: .3; cursor: not-allowed; }
/* Selector de hora (conHora) */
.bf-hora { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--borde-sutil); }
.bf-hora-icono { width: 16px; height: 16px; color: var(--morado-hover, #c084fc); flex-shrink: 0; }
.bf-hora-campos { display: flex; align-items: center; gap: 4px; }
.bf-hora-sel {
  appearance: none; -webkit-appearance: none;
  background: var(--fondo-tarjeta-alt, rgba(255,255,255,.04));
  border: 1px solid var(--borde-sutil); border-radius: 8px;
  color: var(--texto-principal); font-family: inherit; font-size: .9rem; font-weight: 700;
  padding: 6px 10px; cursor: pointer; text-align: center; text-align-last: center;
  transition: border-color .15s ease;
}
.bf-hora-sel:hover, .bf-hora-sel:focus { border-color: var(--morado-brillante, #a855f7); outline: none; }
.bf-hora-sel option { background: var(--fondo-tarjeta, #17141f); color: var(--texto-principal); }
.bf-hora-sep { font-weight: 800; color: var(--texto-secundario); }
.bf-pie { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--borde-sutil); }
.bf-hoy-btn, .bf-limpiar-btn { background: none; border: none; font-size: .8rem; font-weight: 700; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.bf-hoy-btn { color: var(--morado-hover, #c084fc); }
.bf-hoy-btn:hover { background: rgba(168,85,247,.14); }
.bf-limpiar-btn { color: var(--texto-desactivado); }
.bf-limpiar-btn:hover { color: var(--color-error, #ef4444); }

.bf-fade-enter-active, .bf-fade-leave-active { transition: opacity .16s ease, transform .16s ease; }
.bf-fade-enter-from, .bf-fade-leave-to { opacity: 0; transform: translateY(-6px) scale(.98); }
</style>
