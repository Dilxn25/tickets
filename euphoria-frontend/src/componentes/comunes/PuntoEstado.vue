<template>
  <!-- Punto de color del semáforo. Sin texto visible: el significado va en el
       tooltip (title) y para lectores de pantalla (aria-label). -->
  <span
    class="punto-estado"
    :class="[`pe-${s.clave}`, { 'pe-pulsa': s.pulsa, 'pe-grande': grande }]"
    :style="{ '--pe-color': s.color }"
    :title="`${s.label} · ${s.detalle}`"
    :aria-label="s.label"
    role="img"
  ></span>
</template>

<script setup>
import { computed } from 'vue'
import { semaforoDe } from '@/utilidades/estado-pedido.js'

const props = defineProps({
  /** El pedido (objeto de la API o resumen del front). */
  pedido: { type: Object, default: null },
  /** Tamaño mayor para tarjetas grandes. */
  grande: { type: Boolean, default: false },
})
const s = computed(() => semaforoDe(props.pedido))
</script>

<style scoped>
.punto-estado {
  display: inline-block; flex: none;
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--pe-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pe-color) 22%, transparent);
}
.pe-grande { width: 16px; height: 16px; box-shadow: 0 0 0 4px color-mix(in srgb, var(--pe-color) 22%, transparent); }
.pe-pulsa { animation: pe-latido 1.6s ease-in-out infinite; }
@keyframes pe-latido {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--pe-color) 22%, transparent); }
  50%      { box-shadow: 0 0 0 7px color-mix(in srgb, var(--pe-color) 10%, transparent); }
}
@media (prefers-reduced-motion: reduce) { .pe-pulsa { animation: none; } }
</style>
