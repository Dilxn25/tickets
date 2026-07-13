<template>
  <div class="hist">
    <input v-model="filtroTexto" class="hist-buscar" type="text" placeholder="Filtrar por cliente…" />
    <p v-if="cargando" class="hist-estado">Cargando…</p>
    <p v-else-if="!filtradas.length" class="hist-estado">Sin transacciones.</p>
    <ul v-else class="hist-lista">
      <li v-for="t in filtradas" :key="t.id_recarga" class="hist-item">
        <span :class="['hist-ic', esQr(t) ? 'qr' : 'efe']">
          <svg v-if="esQr(t)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
        </span>
        <span class="hist-txt">
          <b>{{ t.usuario?.nombres }} {{ t.usuario?.apellidos }}</b>
          <small>{{ fechaCorta(t.fecha_solicitud) }}</small>
        </span>
        <span class="hist-der">
          <b class="hist-monto">+Bs {{ Number(t.monto_recarga ?? t.monto).toFixed(2) }}</b>
          <small :class="['hist-estado-chip', t.estado_solicitud || t.estado]">{{ etiquetaEstado(t) }}</small>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const items = ref([])
const cargando = ref(true)
const filtroTexto = ref('')

function esQr(t) {
  const m = `${t.metodo || t.metodo_pago || t.tipo_operacion || ''}`.toLowerCase()
  return m.includes('qr') || m.includes('transfer')
}
function etiquetaEstado(t) {
  const e = `${t.estado_solicitud || t.estado || ''}`.toLowerCase()
  if (e.includes('pend')) return 'pendiente'
  if (e.includes('rech')) return 'rechazada'
  return 'completada'
}
function fechaCorta(f) {
  if (!f) return ''
  return new Date(f).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const filtradas = computed(() => {
  const q = filtroTexto.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(t => `${t.usuario?.nombres} ${t.usuario?.apellidos} ${t.usuario?.correo}`.toLowerCase().includes(q))
})

onMounted(async () => {
  try { items.value = await clienteHttp.get('/cajero/historial') }
  catch { items.value = [] } finally { cargando.value = false }
})
</script>

<style scoped>
.hist { display: flex; flex-direction: column; gap: 10px; }
.hist-buscar { width: 100%; box-sizing: border-box; padding: 11px 14px; border-radius: 12px; outline: none; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-size: 0.88rem; }
.hist-buscar:focus { border-color: var(--morado-brillante); }
.hist-estado { margin: 0; text-align: center; padding: 1.6rem 0; font-size: 0.85rem; color: var(--texto-desactivado); }
.hist-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto; }
.hist-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); }
.hist-ic { flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; }
.hist-ic.efe { background: linear-gradient(135deg, #16A34A, #059669); }
.hist-ic.qr { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.hist-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.hist-txt b { color: var(--texto-principal); font-size: 0.84rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hist-txt small { color: var(--texto-desactivado); font-size: 0.7rem; }
.hist-der { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.hist-monto { color: var(--color-exito); font-weight: 800; font-size: 0.86rem; font-variant-numeric: tabular-nums; }
.hist-estado-chip { font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-desactivado); }
</style>
