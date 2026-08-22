<template>
  <div class="combo-img" :class="'n-' + Math.min(visibles.length, 3)">
    <template v-for="(c, i) in visibles" :key="c.id_producto_hijo ?? i">
      <div class="combo-img-cell" :title="c.nombre_producto">
        <img v-if="c.url_imagen" :src="c.url_imagen" :alt="c.nombre_producto" />
        <div v-else class="combo-img-ph" :aria-label="c.nombre_producto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" v-html="iconoProducto(c.nombre_producto)"></svg>
        </div>
      </div>
      <span v-if="i < visibles.length - 1" class="combo-img-mas" aria-hidden="true">+</span>
    </template>
    <span v-if="extra > 0" class="combo-img-extra">+{{ extra }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { iconoProducto } from '@/utilidades/iconos-producto.js'

const props = defineProps({
  // [{ id_producto_hijo, nombre_producto, url_imagen, cantidad }]
  componentes: { type: Array, default: () => [] },
  // Cuántas fotos mostrar antes de resumir con "+N"
  max: { type: Number, default: 3 },
})

const visibles = computed(() => props.componentes.slice(0, props.max))
const extra = computed(() => Math.max(0, props.componentes.length - props.max))
</script>

<style scoped>
.combo-img {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4%;
  padding: 10%;
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(168,85,247,0.14), transparent 60%),
    rgba(0,0,0,0.25);
}
.combo-img-cell {
  flex: 0 1 auto;
  aspect-ratio: 1;
  min-width: 0;
  height: 62%;
  border-radius: 16%;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--glass-borde, rgba(255,255,255,0.1));
  box-shadow: 0 6px 16px rgba(10, 6, 26, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.combo-img-cell img { width: 100%; height: 100%; object-fit: cover; }
.combo-img-ph { width: 50%; height: 50%; color: var(--texto-desactivado); opacity: 0.6; }
.combo-img-ph svg { width: 100%; height: 100%; }

.combo-img-mas {
  flex: 0 0 auto;
  font-weight: 800;
  font-size: clamp(1rem, 6cqw, 1.6rem);
  line-height: 1;
  color: var(--rosa-acento, #ec4899);
  text-shadow: 0 0 12px rgba(236,72,153,0.5);
}
.combo-img-extra {
  flex: 0 0 auto;
  align-self: flex-end;
  margin-bottom: 8%;
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  background: var(--gradiente-marca, linear-gradient(135deg,#a855f7,#ec4899));
  padding: 2px 8px;
  border-radius: 999px;
}
/* Con solo 2 fotos, dales un poco más de tamaño */
.combo-img.n-2 .combo-img-cell { height: 70%; }
.combo-img.n-1 .combo-img-cell { height: 78%; }
</style>
