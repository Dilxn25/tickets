<template>
  <!-- Leyenda compacta del semáforo: una sola línea, discreta. -->
  <div class="leyenda-estados" role="list" aria-label="Significado de los colores">
    <span v-for="k in claves" :key="k" class="le-item" role="listitem" :title="SEMAFORO[k].detalle">
      <i class="le-punto" :style="{ background: SEMAFORO[k].color }" aria-hidden="true"></i>
      {{ SEMAFORO[k].label }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { SEMAFORO, ORDEN_SEMAFORO } from '@/utilidades/estado-pedido.js'

const props = defineProps({
  /** Qué estados mostrar (por defecto, todos). */
  solo: { type: Array, default: null },
})
const claves = computed(() => props.solo || ORDEN_SEMAFORO)
</script>

<style scoped>
.leyenda-estados {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px;
  font-size: 0.72rem; color: var(--texto-desactivado); line-height: 1;
}
.le-item { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.le-punto { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: none; }
</style>
