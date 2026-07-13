<template>
  <Teleport to="body">
    <div class="gg-overlay" @click.self="$emit('cerrar')">
      <div class="gg-sheet fade-in">
        <header class="gg-cab">
          <b>Grupos grandes</b>
          <button class="gg-x" @click="$emit('cerrar')" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <p v-if="!solicitudes.length" class="gg-vacio">Sin solicitudes pendientes.</p>

        <div v-for="s in solicitudes" :key="s.id_solicitud" class="gg-card">
          <div class="gg-quien">
            <span class="gg-avatar">{{ (s.cliente || '?')[0] }}</span>
            <div class="gg-quien-txt">
              <b>{{ s.cliente }}</b>
              <small>{{ s.cantidad_personas }} personas<template v-if="s.telefono"> · {{ s.telefono }}</template></small>
            </div>
            <span :class="['gg-estado', s.estado]">{{ s.estado === 'propuesta' ? 'propuesta enviada' : 'pendiente' }}</span>
          </div>
          <p v-if="s.motivo" class="gg-motivo">“{{ s.motivo }}”</p>
          <!-- Sus lugares tentativos, con disponibilidad -->
          <div v-if="s.mesas_tentativas?.length" class="gg-tent">
            <span v-for="t in s.mesas_tentativas" :key="t.id_mesa" :class="['gg-mesa', { ocupada: !t.libre }]">{{ t.nombre }}</span>
          </div>
          <div class="gg-acciones">
            <button class="gg-proponer" @click="$emit('proponer', s)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              {{ s.estado === 'propuesta' ? 'Rehacer en el mapa' : 'Elegir en el mapa' }}
            </button>
            <button class="gg-rechazar" :disabled="trabajando === s.id_solicitud" @click="rechazar(s)">Sin disponibilidad</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

defineProps({
  solicitudes: { type: Array, default: () => [] },
  evento: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'proponer', 'refrescar'])

const trabajando = ref(null)
async function rechazar(s) {
  trabajando.value = s.id_solicitud
  try {
    await clienteHttp.post(`/reservas/solicitudes-grupo/${s.id_solicitud}/rechazar`, {})
    emit('refrescar')
  } catch { /* se reintenta desde la lista */ }
  finally { trabajando.value = null }
}
</script>

<style scoped>
.gg-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
.gg-sheet { width: min(480px, 94vw); max-height: 88dvh; overflow-y: auto; margin: auto; background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: 22px; padding: 18px 16px; display: flex; flex-direction: column; gap: 12px; }
.gg-cab { display: flex; align-items: center; justify-content: space-between; }
.gg-cab b { color: var(--texto-principal); font-size: 1.05rem; font-family: var(--fuente-titulo); }
.gg-x { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.07); color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.gg-vacio { margin: 0; text-align: center; padding: 1.8rem 0; font-size: 0.86rem; color: var(--texto-desactivado); }
.gg-card { border: 1px solid var(--borde-sutil); border-radius: 16px; padding: 13px; display: flex; flex-direction: column; gap: 9px; background: rgba(255,255,255,0.02); }
.gg-quien { display: flex; align-items: center; gap: 10px; }
.gg-avatar { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #EC4899, #A855F7); color: #fff; font-weight: 800; }
.gg-quien-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.gg-quien-txt b { color: var(--texto-principal); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gg-quien-txt small { color: var(--texto-desactivado); font-size: 0.74rem; }
.gg-estado { flex-shrink: 0; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 9px; border-radius: 999px; }
.gg-estado.pendiente { color: #FCD34D; background: rgba(245,158,11,0.12); }
.gg-estado.propuesta { color: var(--morado-hover); background: rgba(168,85,247,0.12); }
.gg-motivo { margin: 0; font-size: 0.8rem; font-style: italic; color: var(--texto-principal); }
.gg-tent { display: flex; flex-wrap: wrap; gap: 6px; }
.gg-mesa { font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; background: rgba(34,197,94,0.12); color: var(--color-exito); border: 1px solid rgba(34,197,94,0.3); }
.gg-mesa.ocupada { background: rgba(239,68,68,0.1); color: var(--color-error); border-color: rgba(239,68,68,0.3); text-decoration: line-through; }
.gg-acciones { display: flex; gap: 8px; }
.gg-proponer { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border: none; border-radius: 12px; background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 0.84rem; cursor: pointer; }
.gg-rechazar { padding: 11px 13px; border: 1px solid rgba(239,68,68,.4); border-radius: 12px; background: rgba(239,68,68,.07); color: var(--color-error); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.gg-rechazar:disabled { opacity: 0.5; }
</style>
