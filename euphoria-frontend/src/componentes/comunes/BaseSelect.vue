<template>
  <div class="bs-raiz" :class="{ 'bs-abierto': abierto, 'bs-deshabilitado': disabled }">
    <!-- Disparador -->
    <button
      ref="disparador"
      type="button"
      class="bs-disparador"
      :class="{ 'bs-con-valor': tieneValor }"
      :disabled="disabled"
      :aria-expanded="abierto"
      aria-haspopup="listbox"
      @click="alternar"
      @keydown="alTeclearDisparador"
    >
      <span class="bs-valor">
        <span
          v-if="opcionSeleccionada && opcionSeleccionada.color"
          class="bs-punto"
          :style="{ background: opcionSeleccionada.color }"
        />
        <span class="bs-texto">{{ etiquetaVisible }}</span>
      </span>
      <svg class="bs-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Panel de opciones (teleportado al body para escapar overflow/transform) -->
    <Teleport to="body">
      <transition name="bs-fade">
        <ul
          v-if="abierto"
          ref="panel"
          class="bs-panel"
          role="listbox"
          :style="estiloPanel"
          @keydown="alTeclearPanel"
          tabindex="-1"
        >
          <li
            v-for="(op, i) in opcionesNorm"
            :key="i"
            class="bs-opcion"
            :class="{ 'bs-sel': op.value === modelValue, 'bs-activa': i === indiceActivo, 'bs-op-deshabilitada': op.disabled }"
            role="option"
            :aria-selected="op.value === modelValue"
            :aria-disabled="op.disabled || undefined"
            @click="elegir(op)"
            @mouseenter="!op.disabled && (indiceActivo = i)"
          >
            <span v-if="op.color" class="bs-punto" :style="{ background: op.color }" />
            <span class="bs-opcion-texto">{{ op.label }}</span>
            <svg v-if="op.value === modelValue" class="bs-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </li>
          <li v-if="!opcionesNorm.length" class="bs-vacio">Sin opciones</li>
        </ul>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  /* Cada opción: { value, label, color? }  — o strings sueltos */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Seleccionar…' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const disparador = ref(null)
const panel = ref(null)
const abierto = ref(false)
const indiceActivo = ref(-1)
const estiloPanel = ref({})

const opcionesNorm = computed(() =>
  props.options.map(o =>
    typeof o === 'object' && o !== null
      ? { value: o.value, label: o.label ?? String(o.value), color: o.color || null, disabled: !!o.disabled }
      : { value: o, label: String(o), color: null, disabled: false }
  )
)
const opcionSeleccionada = computed(() =>
  opcionesNorm.value.find(o => o.value === props.modelValue) || null
)
// "Tiene valor" = hay una opción realmente seleccionada (incluye value null/0
// si esa opción existe); si no, mostramos el placeholder atenuado.
const tieneValor = computed(() => !!opcionSeleccionada.value)
const etiquetaVisible = computed(() =>
  opcionSeleccionada.value ? opcionSeleccionada.value.label : props.placeholder
)

function posicionar() {
  const el = disparador.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const espacioAbajo = window.innerHeight - r.bottom
  const abrirArriba = espacioAbajo < 240 && r.top > espacioAbajo
  estiloPanel.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    ...(abrirArriba
      ? { bottom: `${window.innerHeight - r.top + 6}px` }
      : { top: `${r.bottom + 6}px` }),
  }
}

function abrir() {
  if (props.disabled) return
  abierto.value = true
  indiceActivo.value = opcionesNorm.value.findIndex(o => o.value === props.modelValue)
  posicionar()
  nextTick(() => {
    panel.value?.focus?.()
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

function elegir(op) {
  if (op.disabled) return
  emit('update:modelValue', op.value)
  cerrar()
  disparador.value?.focus?.()
}

function alClickFuera(e) {
  if (disparador.value?.contains(e.target)) return
  if (panel.value?.contains(e.target)) return
  cerrar()
}

function alTeclearDisparador(e) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault()
    if (!abierto.value) abrir()
  } else if (e.key === 'Escape') {
    cerrar()
  }
}
function alTeclearPanel(e) {
  const n = opcionesNorm.value.length
  if (!n) return
  if (e.key === 'ArrowDown') { e.preventDefault(); indiceActivo.value = (indiceActivo.value + 1) % n }
  else if (e.key === 'ArrowUp') { e.preventDefault(); indiceActivo.value = (indiceActivo.value - 1 + n) % n }
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const op = opcionesNorm.value[indiceActivo.value]
    if (op) elegir(op)
  } else if (e.key === 'Escape') {
    e.preventDefault(); cerrar(); disparador.value?.focus?.()
  } else if (e.key === 'Home') { e.preventDefault(); indiceActivo.value = 0 }
  else if (e.key === 'End') { e.preventDefault(); indiceActivo.value = n - 1 }
}

onBeforeUnmount(cerrar)
</script>

<style scoped>
.bs-raiz { position: relative; width: 100%; }

/* Disparador: mismo lenguaje que .campo pero con acabado propio */
.bs-disparador {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .6rem;
  padding: .6rem .85rem;
  min-height: 42px;
  background: var(--fondo-tarjeta-alt, rgba(255,255,255,.03));
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md, 10px);
  color: var(--texto-principal);
  font-family: inherit;
  font-size: .875rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
}
.bs-disparador:hover:not(:disabled) { border-color: var(--morado-brillante, #a855f7); }
.bs-disparador:focus-visible {
  outline: none;
  border-color: var(--morado-brillante, #a855f7);
  box-shadow: 0 0 0 3px rgba(168,85,247,.22);
}
.bs-abierto .bs-disparador {
  border-color: var(--morado-brillante, #a855f7);
  box-shadow: 0 0 0 3px rgba(168,85,247,.22);
}
.bs-deshabilitado .bs-disparador,
.bs-disparador:disabled { opacity: .55; cursor: not-allowed; }

.bs-valor { display: inline-flex; align-items: center; gap: .5rem; min-width: 0; }
.bs-texto { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bs-disparador:not(.bs-con-valor) .bs-texto { color: var(--texto-desactivado); font-weight: 400; }

.bs-chevron { width: 16px; height: 16px; flex-shrink: 0; color: var(--texto-secundario); transition: transform .22s var(--ease-suave, ease); }
.bs-abierto .bs-chevron { transform: rotate(180deg); color: var(--morado-brillante, #a855f7); }

.bs-punto { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
</style>

<!-- El panel se teletransporta al body: sus estilos NO pueden ser scoped -->
<style>
.bs-panel {
  z-index: 3000;
  list-style: none;
  margin: 0;
  padding: 6px;
  max-height: 300px;
  overflow-y: auto;
  background: var(--fondo-tarjeta, #17141f);
  border: 1px solid var(--borde-medio, rgba(168,85,247,.28));
  border-radius: var(--radio-lg, 14px);
  box-shadow: 0 18px 44px rgba(0,0,0,.55), 0 0 0 1px rgba(168,85,247,.08), inset 0 1px 0 rgba(255,255,255,.05);
  backdrop-filter: blur(14px);
}
.bs-opcion {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .55rem .7rem;
  border-radius: var(--radio-md, 10px);
  color: var(--texto-secundario, #b9b3c7);
  font-size: .875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color .14s ease, color .14s ease;
  user-select: none;
}
.bs-opcion-texto { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bs-opcion.bs-activa { background: rgba(168,85,247,.16); color: var(--texto-principal, #fff); }
.bs-opcion.bs-op-deshabilitada { opacity: .4; cursor: not-allowed; pointer-events: none; }
.bs-opcion.bs-sel { color: var(--texto-principal, #fff); font-weight: 600; }
.bs-check { width: 15px; height: 15px; flex-shrink: 0; color: var(--morado-brillante, #a855f7); }
.bs-vacio { padding: .7rem; text-align: center; color: var(--texto-desactivado); font-size: .82rem; }

.bs-fade-enter-active, .bs-fade-leave-active { transition: opacity .16s ease, transform .16s var(--ease-suave, ease); }
.bs-fade-enter-from, .bs-fade-leave-to { opacity: 0; transform: translateY(-6px) scale(.98); }

@media (prefers-reduced-motion: reduce) {
  .bs-chevron, .bs-fade-enter-active, .bs-fade-leave-active { transition: none; }
}
</style>
