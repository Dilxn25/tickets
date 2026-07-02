<template>
  <div class="paginacion">
    <div class="pag-info">
      <span v-if="total > 0">{{ desde }}–{{ hasta }} de <strong>{{ total }}</strong></span>
      <span v-else>Sin resultados</span>
    </div>

    <div class="pag-derecha">
      <div class="pag-selector">
        <span class="pag-label">Ver</span>
        <div class="pag-select-mini">
          <BaseSelect
            :model-value="limite"
            :options="opciones"
            @update:model-value="v => $emit('update:limite', v)"
          />
        </div>
      </div>

      <div class="pag-botones">
        <button class="pag-btn" :disabled="pagina <= 1" @click="$emit('update:pagina', pagina - 1)" title="Anterior" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span class="pag-actual">{{ pagina }} <span class="pag-de">/ {{ totalPaginas }}</span></span>
        <button class="pag-btn" :disabled="pagina >= totalPaginas" @click="$emit('update:pagina', pagina + 1)" title="Siguiente" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'

const props = defineProps({
  total:   { type: Number, default: 0 },
  pagina:  { type: Number, default: 1 },
  limite:  { type: Number, default: 20 },
  opciones: { type: Array, default: () => [10, 20, 50, 100, 200] },
})
defineEmits(['update:pagina', 'update:limite'])

const totalPaginas = computed(() => Math.max(1, Math.ceil(props.total / props.limite)))
const desde = computed(() => props.total === 0 ? 0 : (props.pagina - 1) * props.limite + 1)
const hasta = computed(() => Math.min(props.pagina * props.limite, props.total))
</script>

<style scoped>
.paginacion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 12px 16px;
  margin-top: 14px;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: 14px;
}
.pag-info {
  color: var(--texto-secundario);
  font-size: 0.85rem;
}
.pag-info strong { color: var(--texto-principal); }

.pag-derecha {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.pag-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pag-label {
  color: var(--texto-secundario);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pag-select-mini { width: 96px; }

.pag-botones {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pag-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  cursor: pointer;
  transition: all 0.18s;
}
.pag-btn svg { width: 18px; height: 18px; }
.pag-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border-color: transparent;
  transform: translateY(-1px);
}
.pag-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.pag-actual {
  min-width: 58px;
  text-align: center;
  font-weight: 700;
  color: var(--texto-principal);
  font-size: 0.9rem;
}
.pag-de { color: var(--texto-desactivado); font-weight: 600; }

@media (max-width: 560px) {
  .paginacion { justify-content: center; }
  .pag-derecha { width: 100%; justify-content: space-between; }
}
</style>
