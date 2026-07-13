<template>
  <div class="mov">
    <p v-if="cargando" class="mov-estado">Cargando…</p>
    <p v-else-if="!items.length" class="mov-estado">Sin movimientos registrados.</p>
    <ul v-else class="mov-lista">
      <li v-for="m in items" :key="m.id_recarga" class="mov-item">
        <span :class="['mov-ic', esQr(m) ? 'qr' : 'efe']">
          <svg v-if="esQr(m)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
        </span>
        <span class="mov-txt">
          <b>Recarga {{ esQr(m) ? 'por QR' : 'en efectivo' }}</b>
          <small>{{ fechaCorta(m.fecha_solicitud) }}</small>
        </span>
        <b class="mov-monto">+Bs {{ Number(m.monto_recarga ?? m.monto).toFixed(2) }}</b>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const props = defineProps({ cliente: { type: Object, required: true } })
const items = ref([])
const cargando = ref(true)

function esQr(m) {
  const t = `${m.metodo || m.metodo_pago || m.tipo_operacion || ''}`.toLowerCase()
  return t.includes('qr') || t.includes('transfer')
}
function fechaCorta(f) {
  if (!f) return ''
  return new Date(f).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
onMounted(async () => {
  try {
    const todos = await clienteHttp.get('/cajero/historial')
    // El historial es global: aquí solo los del cliente abierto
    items.value = (todos || []).filter(m =>
      m.usuario?.correo === props.cliente.correo ||
      (props.cliente.ci_carnet && m.usuario?.ci_carnet === props.cliente.ci_carnet)
    ).slice(0, 30)
  } catch { items.value = [] } finally { cargando.value = false }
})
</script>

<style scoped>
.mov-estado { margin: 0; font-size: 0.85rem; color: var(--texto-desactivado); text-align: center; padding: 1.4rem 0; }
.mov-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto; }
.mov-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--borde-sutil); }
.mov-ic { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; }
.mov-ic.efe { background: linear-gradient(135deg, #16A34A, #059669); }
.mov-ic.qr { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.mov-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.mov-txt b { color: var(--texto-principal); font-size: 0.85rem; }
.mov-txt small { color: var(--texto-desactivado); font-size: 0.72rem; }
.mov-monto { flex-shrink: 0; color: var(--color-exito); font-weight: 800; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
</style>
