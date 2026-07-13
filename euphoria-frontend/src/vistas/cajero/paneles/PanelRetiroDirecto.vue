<template>
  <div class="ret">
    <!-- Cuánto retira de la billetera -->
    <div class="ret-monto">
      <span class="ret-bs">Retira Bs.</span>
      <input v-model="montoTexto" @input="limpiar" type="text" inputmode="decimal" :placeholder="String(saldo)" class="ret-input" />
      <button type="button" class="ret-chip" @click="montoTexto = String(saldo)">Todo</button>
    </div>

    <!-- Cómo recibe el dinero -->
    <div class="ret-metodos">
      <button type="button" :class="['metodo-card', { seleccionado: metodo === 'persona' }]" @click="metodo = 'persona'">
        <span class="metodo-ic efectivo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
        </span>
        <span class="metodo-txt"><b>Efectivo</b><small>Le entregas en caja</small></span>
        <svg class="metodo-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
      <button type="button" :class="['metodo-card', { seleccionado: metodo === 'qr' }]" @click="metodo = 'qr'">
        <span class="metodo-ic qr">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
        </span>
        <span class="metodo-txt"><b>Traspaso</b><small>A su QR / cuenta</small></span>
        <svg class="metodo-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
    </div>

    <!-- Resumen de lo que recibirá (redondeo a favor del cliente en efectivo) -->
    <div v-if="monto > 0" class="ret-resumen fade-in">
      <span>{{ metodo === 'qr' ? 'Transfieres (exacto)' : 'Entregas en efectivo' }}</span>
      <b>Bs {{ entregar.toFixed(2) }}</b>
      <small v-if="redondeo > 0">redondeo +Bs {{ redondeo.toFixed(2) }} a su favor</small>
    </div>

    <p v-if="error" class="ret-error">{{ error }}</p>

    <button class="ret-cta" :disabled="!puede || cargando" @click="retirar">
      {{ cargando ? 'Procesando…' : 'Registrar retiro' }}
    </button>

    <Teleport to="body">
      <div v-if="exito" class="ret-exito-overlay" @click.self="cerrar">
        <div class="ret-exito fade-in">
          <span class="ret-exito-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="30" height="30"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
          <b>Retiro hecho</b>
          <p>Salió de la billetera <b>Bs {{ exito.retirado }}</b></p>
          <p>{{ metodo === 'qr' ? 'Transferiste' : 'Entregaste' }} <b>Bs {{ exito.entregado }}</b></p>
          <button class="ret-cta" @click="cerrar">Listo</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const props = defineProps({ cliente: { type: Object, required: true } })
const emit = defineEmits(['hecho'])

const montoTexto = ref('')
const metodo = ref('persona')
const cargando = ref(false)
const error = ref('')
const exito = ref(null)

const saldo = computed(() => Number(props.cliente.saldo) || 0)
const monto = computed(() => { const n = parseFloat(montoTexto.value); return Number.isFinite(n) && n > 0 ? n : 0 })
// Regla establecida: efectivo redondea HACIA ARRIBA a 0.10 (el cliente nunca
// recibe menos); traspaso es exacto. Igual que procesarRetiro del backend.
const entregar = computed(() => {
  if (!monto.value) return 0
  return metodo.value === 'qr' ? Math.round(monto.value * 100) / 100 : Math.ceil(monto.value * 10) / 10
})
const redondeo = computed(() => Math.round((entregar.value - monto.value) * 100) / 100)
const puede = computed(() => monto.value > 0 && monto.value <= saldo.value)

function limpiar() { montoTexto.value = (montoTexto.value || '').replace(/[^0-9.]/g, '').match(/^\d*\.?\d{0,2}/)?.[0] || '' }

async function retirar() {
  if (!puede.value || cargando.value) return
  cargando.value = true
  error.value = ''
  try {
    const r = await clienteHttp.post('/cajero/retiro-directo', {
      id_cliente: props.cliente.id_usuario,
      monto_retirado: monto.value,
      metodo: metodo.value,
    })
    exito.value = r
  } catch (e) {
    error.value = e?.error || 'No se pudo procesar el retiro.'
  } finally { cargando.value = false }
}
function cerrar() {
  exito.value = null
  montoTexto.value = ''
  emit('hecho')
}
</script>

<style scoped>
.ret { display: flex; flex-direction: column; gap: 14px; }
.ret-monto { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 16px; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil); }
.ret-monto:focus-within { border-color: var(--morado-brillante); }
.ret-bs { font-weight: 800; color: var(--texto-desactivado); font-size: 0.85rem; flex-shrink: 0; }
.ret-input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--texto-principal); font-size: 1.4rem; font-weight: 800; font-variant-numeric: tabular-nums; padding: 8px 0; }
.ret-chip { flex-shrink: 0; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: rgba(168,85,247,0.07); color: var(--texto-principal); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.ret-metodos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 560px) { .ret-metodos { grid-template-columns: 1fr; } }

.metodo-card { display: flex; align-items: center; gap: 12px; text-align: left; padding: 12px; border-radius: 16px; border: 1.5px solid var(--borde-sutil); background: rgba(255,255,255,0.02); color: var(--texto-secundario); cursor: pointer; transition: border-color 0.2s ease, background 0.2s ease; }
.metodo-card:hover { border-color: var(--borde-activo); }
.metodo-card .metodo-ic { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
.metodo-card .metodo-ic.efectivo { background: linear-gradient(135deg, #16A34A, #059669); }
.metodo-card .metodo-ic.qr { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.metodo-card .metodo-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.metodo-card .metodo-txt b { color: var(--texto-principal); font-size: 0.9rem; }
.metodo-card .metodo-txt small { font-size: 0.7rem; color: var(--texto-desactivado); }
.metodo-card .metodo-check { flex-shrink: 0; color: var(--morado-brillante); opacity: 0; transform: scale(0.6); transition: 0.2s ease; }
.metodo-card.seleccionado { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); }
.metodo-card.seleccionado .metodo-check { opacity: 1; transform: scale(1); }

.ret-resumen { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 14px; background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.25); font-size: 0.85rem; color: var(--texto-secundario); }
.ret-resumen b { color: #FCD34D; font-size: 1.1rem; font-variant-numeric: tabular-nums; }
.ret-resumen small { color: var(--texto-desactivado); }
.ret-error { margin: 0; font-size: 0.84rem; color: var(--color-error); }
.ret-cta { padding: 14px; border: none; border-radius: 16px; cursor: pointer; background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 0.95rem; }
.ret-cta:disabled { opacity: 0.5; cursor: not-allowed; }

.ret-exito-overlay { position: fixed; inset: 0; z-index: 1500; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
.ret-exito { width: min(360px, 92vw); margin: auto; text-align: center; background: var(--fondo-tarjeta); border: 1px solid rgba(34,197,94,0.35); border-radius: 24px; padding: 2rem 1.6rem; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.ret-exito-ic { width: 64px; height: 64px; border-radius: 50%; background: rgba(34,197,94,0.12); border: 2px solid rgba(34,197,94,0.35); color: var(--color-exito); display: flex; align-items: center; justify-content: center; }
.ret-exito b { color: var(--texto-principal); }
.ret-exito p { margin: 0; color: var(--texto-secundario); font-size: 0.9rem; }
.ret-exito p b { color: var(--color-exito); }
.ret-exito .ret-cta { width: 100%; margin-top: 8px; }
</style>
