<template>
  <Teleport to="body">
    <div class="hb-overlay" @click.self="$emit('cerrar')">
      <div class="hb-sheet fade-in">
        <header class="hb-cab">
          <b>Entregas de la barra</b>
          <button class="hb-x" @click="$emit('cerrar')" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <p v-if="cargando" class="hb-estado">Cargando…</p>
        <p v-else-if="!items.length" class="hb-estado">Sin entregas todavía.</p>
        <article v-for="c in items" :key="c.id_comanda" class="hb-card">
          <div class="hb-top">
            <b>#{{ c.id_comanda }}</b>
            <small>{{ hora(c.fecha_registro) }}</small>
          </div>
          <p class="hb-items">{{ (c.items || []).map(i => `${i.cantidad}× ${i.nombre}`).join(' · ') }}</p>
          <div class="hb-meta">
            <span v-if="c.mesa" class="hb-tag">Mesa {{ c.mesa }}</span>
            <span v-if="c.evento" class="hb-tag ev">{{ c.evento }}</span>
            <span class="hb-cli">{{ c.cliente }}</span>
          </div>
        </article>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const props = defineProps({ filtro: { type: Object, default: () => ({}) } })
defineEmits(['cerrar'])

const items = ref([])
const cargando = ref(true)
function hora(f) {
  return new Date(f).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
onMounted(async () => {
  try { items.value = await clienteHttp.get('/comandas/historial-bartender', { params: props.filtro }) }
  catch { items.value = [] } finally { cargando.value = false }
})
</script>

<style scoped>
.hb-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
.hb-sheet { width: min(520px, 94vw); max-height: 88dvh; overflow-y: auto; margin: auto; background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: 22px; padding: 18px 16px; display: flex; flex-direction: column; gap: 10px; }
.hb-cab { display: flex; align-items: center; justify-content: space-between; }
.hb-cab b { color: var(--texto-principal); font-size: 1.05rem; font-family: var(--fuente-titulo); }
.hb-x { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.07); color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.hb-estado { margin: 0; text-align: center; padding: 1.8rem 0; font-size: 0.86rem; color: var(--texto-desactivado); }
.hb-card { border: 1px solid var(--borde-sutil); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 6px; }
.hb-top { display: flex; align-items: center; justify-content: space-between; }
.hb-top b { color: var(--texto-principal); font-size: 0.9rem; }
.hb-top small { color: var(--texto-desactivado); font-size: 0.72rem; }
.hb-items { margin: 0; font-size: 0.82rem; color: var(--texto-secundario); }
.hb-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.hb-tag { font-size: 0.68rem; font-weight: 800; padding: 3px 9px; border-radius: 999px; background: rgba(168,85,247,0.12); color: var(--morado-hover); }
.hb-tag.ev { background: rgba(236,72,153,0.1); color: var(--rosa-acento); }
.hb-cli { font-size: 0.74rem; color: var(--texto-desactivado); }
</style>
