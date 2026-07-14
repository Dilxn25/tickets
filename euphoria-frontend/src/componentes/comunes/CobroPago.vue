<template>
  <div class="cp">
    <!-- Métodos como tarjetas (R8.1) -->
    <div class="cp-metodos" :style="{ gridTemplateColumns: `repeat(${metodos.length}, 1fr)` }">
      <button v-for="m in metodos" :key="m" type="button" :class="['cp-metodo', { activo: metodo === m }]" @click="metodo = m">
        <span class="cp-ic" :class="m" v-html="ICONOS[m]"></span>
        {{ ETIQUETAS[m] }}
      </button>
    </div>

    <!-- EFECTIVO: recibido + chips + cambio (el estándar del POS) -->
    <div v-if="metodo === 'efectivo' && total > 0" class="cp-bloque fade-in">
      <div class="cp-recibido">
        <span>Recibí Bs.</span>
        <input v-model="recibidoTexto" @input="limpiar" type="text" inputmode="decimal" :placeholder="total.toFixed(2)" />
      </div>
      <div class="cp-chips">
        <button v-for="b in [10, 20, 50, 100, 200]" :key="b" type="button" class="cp-chip" @click="sumar(b)">+{{ b }}</button>
        <button type="button" class="cp-chip exacto" @click="recibidoTexto = total.toFixed(2)">Exacto</button>
        <button type="button" class="cp-chip limpiar" @click="recibidoTexto = ''" :disabled="!recibidoTexto">Limpiar</button>
      </div>
      <p v-if="recibido > 0" :class="['cp-cambio', cambio >= 0 ? 'ok' : 'falta']">
        {{ cambio >= 0 ? 'Cambio' : 'Falta' }} <b>Bs {{ Math.abs(cambio).toFixed(2) }}</b>
      </p>
    </div>

    <!-- QR: el QR del local + comprobante (foto o archivo) + validación OCR -->
    <div v-else-if="metodo === 'qr' && total > 0" class="cp-bloque fade-in">
      <div class="cp-qr-cobro">
        <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR de pago Euphoria" class="cp-qr-img" @click="qrGrande = true" />
        <span>Paga a este QR y sube el comprobante</span>
      </div>
      <CapturaCamara v-if="!ocrOk" modo="foto" texto-guia="Comprobante dentro del marco" @archivo="validar" />
      <ul v-if="pasos.length" class="cp-pasos">
        <li v-for="p in pasos" :key="p.clave" :class="{ mal: !p.ok }">
          <svg v-if="p.ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="13" height="13"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          {{ p.etiqueta }}
        </li>
      </ul>
      <p v-if="validando" class="cp-nota">Validando comprobante…</p>
      <p v-if="errorOcr" class="cp-error">{{ errorOcr }}</p>
    </div>

    <Teleport to="body">
      <div v-if="qrGrande" class="qr-fullscreen" @click="qrGrande = false">
        <p class="qr-fs-titulo">Bs. {{ total.toFixed(2) }}</p>
        <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR de pago Euphoria" class="qr-fs-img" />
        <p class="qr-fs-hint">Muestra la pantalla al cliente · Toca para cerrar</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
// R8.1 — Cobro ESTÁNDAR del sistema (una sola implementación):
//   efectivo → recibido + chips de billetes + Exacto + cambio calculado
//   qr       → QR del local + comprobante por foto O archivo + validación OCR asíncrona
//   cortesia → sin cobro (solo puerta/invitaciones)
// Emite 'cambio' con { metodo, valido, recibido, url_comprobante, transaccionId }.
import { ref, computed, watch } from 'vue'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'
import { validarComprobanteAsync } from '@/utilidades/validar-comprobante.js'

const props = defineProps({
  total: { type: Number, required: true },
  metodos: { type: Array, default: () => ['efectivo', 'qr'] },
})
const emit = defineEmits(['cambio'])

const ETIQUETAS = { efectivo: 'Efectivo', qr: 'QR', cortesia: 'Cortesía', billetera: 'Billetera' }
const ICONOS = {
  efectivo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>',
  qr: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>',
  cortesia: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>',
  billetera: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M2 11h20"></path></svg>',
}

const metodo = ref(props.metodos[0])
const recibidoTexto = ref('')
const qrGrande = ref(false)
const ocrOk = ref(false)
const validando = ref(false)
const pasos = ref([])
const errorOcr = ref('')
const urlComprobante = ref('')
const transaccionId = ref('')

const recibido = computed(() => { const n = parseFloat(recibidoTexto.value); return Number.isFinite(n) && n > 0 ? n : 0 })
const cambio = computed(() => recibido.value - props.total)
function limpiar() { recibidoTexto.value = (recibidoTexto.value || '').replace(/[^0-9.]/g, '').match(/^\d*\.?\d{0,2}/)?.[0] || '' }
function sumar(b) { recibidoTexto.value = String(Math.round((recibido.value + b) * 100) / 100) }

async function validar(archivo) {
  if (!archivo || !props.total) return
  validando.value = true
  errorOcr.value = ''
  pasos.value = [{ clave: 'banco', etiqueta: 'Identificando banco…', ok: true }]
  try {
    const fd = new FormData()
    fd.append('comprobante', archivo)
    fd.append('monto_esperado', String(props.total))
    const r = await validarComprobanteAsync(fd, (etapa) => { pasos.value = [{ clave: 'banco', etiqueta: etapa, ok: true }] })
    pasos.value = r.pasos || []
    ocrOk.value = !!r.valido
    urlComprobante.value = r.url_comprobante || ''
    transaccionId.value = r.transaccionId || ''
  } catch (e) {
    pasos.value = e?.pasos || pasos.value
    errorOcr.value = e?.error || 'No se pudo validar el comprobante.'
    ocrOk.value = false
  } finally { validando.value = false }
}

const valido = computed(() => {
  if (metodo.value === 'cortesia' || props.total <= 0) return true
  if (metodo.value === 'efectivo') return recibido.value >= props.total
  if (metodo.value === 'qr') return ocrOk.value
  return true // billetera valida en su propio flujo (PIN)
})

watch([metodo, valido, recibido, urlComprobante], () => {
  // Cambiar de método invalida el comprobante anterior
  emit('cambio', {
    metodo: metodo.value,
    valido: valido.value,
    recibido: recibido.value,
    cambio: cambio.value,
    url_comprobante: metodo.value === 'qr' ? urlComprobante.value : '',
    transaccionId: metodo.value === 'qr' ? transaccionId.value : '',
  })
}, { immediate: true })
watch(metodo, () => { ocrOk.value = false; pasos.value = []; errorOcr.value = '' })
watch(() => props.total, () => { ocrOk.value = false; pasos.value = []; errorOcr.value = '' })
</script>

<style scoped>
.cp { display: flex; flex-direction: column; gap: 12px; }
.cp-metodos { display: grid; gap: 8px; }
.cp-metodo { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 11px 4px; border-radius: 13px; border: 1.5px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-weight: 700; font-size: 0.74rem; cursor: pointer; transition: border-color 0.18s ease, background 0.18s ease; }
.cp-metodo.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); color: var(--texto-principal); }
.cp-ic { display: flex; }
.cp-bloque { display: flex; flex-direction: column; gap: 10px; }
.cp-recibido { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 13px; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil); }
.cp-recibido:focus-within { border-color: var(--morado-brillante); }
.cp-recibido span { font-size: 0.8rem; font-weight: 800; color: var(--texto-desactivado); flex-shrink: 0; }
.cp-recibido input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--texto-principal); font-size: 1.2rem; font-weight: 800; padding: 7px 0; font-variant-numeric: tabular-nums; }
.cp-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.cp-chip { padding: 8px 13px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: rgba(168,85,247,0.07); color: var(--texto-principal); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.cp-chip:hover { border-color: var(--borde-activo); }
.cp-chip.limpiar { background: none; color: var(--texto-desactivado); }
.cp-cambio { margin: 0; font-size: 0.86rem; color: var(--texto-secundario); }
.cp-cambio.ok b { color: var(--color-exito); }
.cp-cambio.falta b { color: var(--color-error); }
.cp-qr-cobro { display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--texto-secundario); }
.cp-qr-img { width: 62px; height: 62px; border-radius: 10px; cursor: zoom-in; background: #fff; object-fit: contain; flex-shrink: 0; }
.cp-pasos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.cp-pasos li { display: flex; align-items: center; gap: 8px; font-size: 0.84rem; color: var(--color-exito); font-weight: 600; }
.cp-pasos li.mal { color: var(--color-error); }
.cp-nota { margin: 0; font-size: 0.82rem; color: var(--texto-secundario); }
.cp-error { margin: 0; font-size: 0.84rem; color: var(--color-error); }

.qr-fullscreen { position: fixed; inset: 0; z-index: 2100; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; background: #fff; cursor: pointer; }
.qr-fs-titulo { font-size: 2rem; font-weight: 800; color: #10002b; margin: 0; }
.qr-fs-img { width: min(80vw, 70vh); max-height: 70vh; object-fit: contain; border-radius: 8px; }
.qr-fs-hint { color: #666; font-size: 0.85rem; margin: 0; }
</style>
