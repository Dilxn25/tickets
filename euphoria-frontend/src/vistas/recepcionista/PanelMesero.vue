<template>
  <div class="asignar-mesero">
    <div class="am-cab">
      <b>Asignar mesero</b>
      <span>{{ asignacion.mesa ? 'Mesa ' + asignacion.mesa : 'Mesa reservada' }}{{ asignacion.cliente ? ' · ' + asignacion.cliente : '' }}</span>
    </div>
    <BaseSelect :model-value="modelValue" :options="opciones" placeholder="Elige un mesero" @update:model-value="$emit('update:modelValue', $event)" />
    <div class="am-acciones">
      <button class="btn-sec" type="button" @click="$emit('cerrar')">Ahora no</button>
      <button class="btn-primario" type="button" :disabled="cargando || !modelValue" @click="$emit('confirmar')">
        {{ cargando ? 'Asignando…' : 'Confirmar mesero' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'

const props = defineProps({
  asignacion: { type: Object, required: true },
  meseros: { type: Array, default: () => [] },
  modelValue: { type: [Number, null], default: null },
  cargando: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'confirmar', 'cerrar'])

const opciones = computed(() => props.meseros.map(m => ({
  value: m.id_usuario,
  label: `${m.nombre} (${m.carga} mesa${m.carga === 1 ? '' : 's'})`,
})))
</script>

<style scoped>
.asignar-mesero { padding: var(--esp-4); border-radius: var(--radio-md); background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.35); display: flex; flex-direction: column; gap: var(--esp-3); animation: aparecer 0.3s ease both; }
.am-cab { display: flex; flex-direction: column; gap: 2px; }
.am-cab b { font-size: 0.95rem; color: var(--texto-principal); }
.am-cab span { font-size: 0.82rem; color: var(--texto-secundario); }
.am-acciones { display: flex; gap: var(--esp-3); }
.am-acciones .btn-primario, .am-acciones .btn-sec { flex: 1; }
.btn-primario { background: var(--gradiente-marca); color: #fff; border: none; padding: 12px; border-radius: var(--radio-md); font-weight: 700; cursor: pointer; }
.btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sec { background: rgba(168,85,247,0.08); border: 1px solid var(--borde-activo); color: var(--morado-hover); padding: 12px; border-radius: var(--radio-md); font-weight: 600; cursor: pointer; }
@keyframes aparecer { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
</style>
