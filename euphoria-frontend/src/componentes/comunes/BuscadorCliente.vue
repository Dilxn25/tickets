<template>
  <div class="bcli">
    <div class="bcli-campo">
      <svg class="bcli-lupa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        :value="texto"
        @input="alEscribir"
        @focus="abierto = true"
        type="text"
        class="bcli-input"
        :placeholder="placeholder"
        autocomplete="off"
      />
      <button v-if="modelValue || texto" type="button" class="bcli-limpiar" @click="limpiar" aria-label="Limpiar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div v-if="abierto && resultados.length && !modelValue" class="bcli-lista">
      <button v-for="u in resultados" :key="u.id_usuario" type="button" class="bcli-item" @click="seleccionar(u)">
        <span class="bcli-avatar">{{ iniciales(u) }}</span>
        <span class="bcli-datos">
          <span class="bcli-nombre">{{ u.nombres }} {{ u.apellidos || '' }}</span>
          <span class="bcli-sub">{{ u.telefono ? '+591 ' + soloDigitos(u.telefono) : (u.ci_carnet || u.correo) }}</span>
        </span>
      </button>
    </div>

    <div v-if="modelValue" class="bcli-chip">
      <span class="bcli-avatar ok">{{ iniciales(modelValue) }}</span>
      <span class="bcli-datos">
        <span class="bcli-nombre">{{ modelValue.nombres }} {{ modelValue.apellidos || '' }}</span>
        <span class="bcli-sub">{{ modelValue.telefono ? '+591 ' + soloDigitos(modelValue.telefono) : (modelValue.ci_carnet || modelValue.correo) }}</span>
      </span>
      <button type="button" class="bcli-cambiar" @click="limpiar">Cambiar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const props = defineProps({
  modelValue: { type: Object, default: null },
  placeholder: { type: String, default: 'Busca por nombre, teléfono o CI' },
})
const emit = defineEmits(['update:modelValue', 'seleccionado'])

const texto = ref('')
const resultados = ref([])
const abierto = ref(false)
let timer = null

watch(() => props.modelValue, (v) => { if (v) texto.value = '' })

function alEscribir(e) {
  texto.value = e.target.value
  if (props.modelValue) emit('update:modelValue', null)
  clearTimeout(timer)
  if (!texto.value.trim()) { resultados.value = []; return }
  timer = setTimeout(async () => {
    try {
      const res = await clienteHttp.get(`/cajero/buscar-cliente?q=${encodeURIComponent(texto.value.trim())}`)
      resultados.value = Array.isArray(res) ? res : []
      abierto.value = true
    } catch { resultados.value = [] }
  }, 250)
}
function seleccionar(u) {
  emit('update:modelValue', u)
  emit('seleccionado', u)
  resultados.value = []
  abierto.value = false
}
function limpiar() {
  emit('update:modelValue', null)
  texto.value = ''
  resultados.value = []
}
const soloDigitos = (t) => String(t || '').replace(/\D/g, '').replace(/^591/, '').slice(-8)
const iniciales = (u) => `${(u?.nombres || '?').charAt(0)}${(u?.apellidos || '').charAt(0)}`.toUpperCase()
</script>

<style scoped>
.bcli { position: relative; }
.bcli-campo { display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); background: var(--fondo-input, rgba(255,255,255,.04)); transition: border-color .15s ease; }
.bcli-campo:focus-within { border-color: var(--color-primario); }
.bcli-lupa { color: var(--texto-desactivado); flex-shrink: 0; }
.bcli-input { flex: 1; border: none; background: transparent; color: var(--texto-principal); font-size: 0.95rem; padding: 11px 0; }
.bcli-input:focus { outline: none; }
.bcli-limpiar { background: none; border: none; color: var(--texto-desactivado); cursor: pointer; display: flex; padding: 4px; }
.bcli-lista { position: absolute; z-index: 30; top: calc(100% + 6px); left: 0; right: 0; max-height: 280px; overflow-y: auto; border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); background: var(--fondo-tarjeta); box-shadow: 0 16px 40px rgba(0,0,0,.4); }
.bcli-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: none; background: transparent; cursor: pointer; text-align: left; border-bottom: 1px solid var(--borde-sutil); }
.bcli-item:last-child { border-bottom: none; }
.bcli-item:hover { background: color-mix(in srgb, var(--color-primario) 10%, transparent); }
.bcli-avatar { display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: var(--gradiente-marca, linear-gradient(135deg,#8b5cf6,#ec4899)); color: #fff; font-weight: 800; font-size: 0.82rem; }
.bcli-avatar.ok { background: linear-gradient(135deg,#16a34a,#22c55e); }
.bcli-datos { display: flex; flex-direction: column; min-width: 0; }
.bcli-nombre { font-weight: 700; color: var(--texto-principal); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bcli-sub { font-size: 0.78rem; color: var(--texto-secundario); }
.bcli-chip { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 10px 12px; border: 1px solid rgba(34,197,94,.3); border-radius: var(--radio-md); background: rgba(34,197,94,.08); }
.bcli-chip .bcli-datos { flex: 1; }
.bcli-cambiar { background: none; border: none; color: var(--color-primario); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
</style>
