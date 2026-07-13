<template>
  <form class="rec" @submit.prevent="recargar">
    <!-- Monto con chips de billetes -->
    <div class="rec-monto">
      <span class="rec-bs">Bs.</span>
      <input v-model="montoTexto" @input="limpiarMonto" type="text" inputmode="decimal" placeholder="0.00" class="rec-input" />
    </div>
    <div class="rec-chips">
      <button v-for="b in [10, 20, 50, 100, 200]" :key="b" type="button" class="rec-chip" @click="sumar(b)">+{{ b }}</button>
      <button type="button" class="rec-chip limpiar" @click="montoTexto = ''" :disabled="!montoTexto">Limpiar</button>
    </div>

    <!-- Método -->
    <div class="rec-metodos">
      <button type="button" :class="['metodo-card', { seleccionado: metodo === 'efectivo' }]" @click="metodo = 'efectivo'">
        <span class="metodo-ic efectivo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
        </span>
        <span class="metodo-txt"><b>Efectivo</b><small>Recibes el dinero</small></span>
        <svg class="metodo-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
      <button type="button" :class="['metodo-card', { seleccionado: metodo === 'qr' }]" @click="metodo = 'qr'">
        <span class="metodo-ic qr">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
        </span>
        <span class="metodo-txt"><b>QR</b><small>Con comprobante</small></span>
        <svg class="metodo-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
    </div>

    <!-- Efectivo: recibido y cambio -->
    <div v-if="metodo === 'efectivo' && monto > 0" class="rec-efectivo fade-in">
      <div class="rec-monto chica">
        <span class="rec-bs">Recibí</span>
        <input v-model="recibidoTexto" @input="limpiarRecibido" type="text" inputmode="decimal" placeholder="0.00" class="rec-input" />
        <button type="button" class="rec-chip exacto" @click="recibidoTexto = monto.toFixed(2)">Exacto</button>
      </div>
      <p v-if="recibido > 0" :class="['rec-cambio', cambio >= 0 ? 'ok' : 'falta']">
        {{ cambio >= 0 ? 'Cambio' : 'Falta' }} <b>Bs {{ Math.abs(cambio).toFixed(2) }}</b>
      </p>
    </div>

    <!-- QR: comprobante con OCR (los pasos aparecen uno a uno desde el backend) -->
    <div v-if="metodo === 'qr' && monto > 0" class="rec-qr fade-in">
      <div class="rec-qr-cobro">
        <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR de pago Euphoria" class="rec-qr-img" @click="qrGrande = true" />
        <span>El cliente paga a este QR y subes su comprobante</span>
      </div>
      <CapturaCamara v-if="!ocrOk" modo="foto" texto-guia="Comprobante dentro del marco" @archivo="validarComprobante" />
      <ul v-if="pasosOcr.length" class="rec-pasos">
        <li v-for="p in pasosOcr" :key="p.clave" :class="{ mal: !p.ok }">
          <svg v-if="p.ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="13" height="13"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          {{ p.etiqueta }}
        </li>
      </ul>
      <p v-if="validando" class="rec-validando">Validando comprobante…</p>
      <p v-if="errorOcr" class="rec-error">{{ errorOcr }}</p>
    </div>

    <p v-if="error" class="rec-error">{{ error }}</p>

    <button type="submit" class="rec-cta" :disabled="!puedeRecargar || cargando">
      {{ cargando ? 'Procesando…' : (monto > 0 ? `Recargar Bs ${monto.toFixed(2)}` : 'Recargar') }}
    </button>

    <!-- Éxito -->
    <Teleport to="body">
      <div v-if="exito" class="rec-exito-overlay" @click.self="cerrarExito">
        <div class="rec-exito fade-in">
          <span class="rec-exito-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="30" height="30"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
          <b>Recarga hecha</b>
          <p>Nuevo saldo: <b>Bs {{ exito.saldo_nuevo }}</b></p>
          <small>Ref {{ exito.numero_transaccion }}</small>
          <button class="rec-cta" @click="cerrarExito">Listo</button>
        </div>
      </div>
      <div v-if="qrGrande" class="qr-fullscreen" @click="qrGrande = false">
        <p class="qr-fs-titulo" v-if="monto > 0">Bs. {{ monto.toFixed(2) }}</p>
        <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR de pago Euphoria" class="qr-fs-img" />
        <p class="qr-fs-hint">Muestra la pantalla al cliente · Toca para cerrar</p>
      </div>
    </Teleport>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { validarComprobanteAsync } from '@/utilidades/validar-comprobante.js'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'

const props = defineProps({ cliente: { type: Object, required: true } })
const emit = defineEmits(['hecho'])

const montoTexto = ref('')
const recibidoTexto = ref('')
const metodo = ref('efectivo')
const cargando = ref(false)
const error = ref('')
const exito = ref(null)
const qrGrande = ref(false)

const monto = computed(() => { const n = parseFloat(montoTexto.value); return Number.isFinite(n) && n > 0 ? n : 0 })
const recibido = computed(() => { const n = parseFloat(recibidoTexto.value); return Number.isFinite(n) && n > 0 ? n : 0 })
const cambio = computed(() => recibido.value - monto.value)

function limpiarMonto() { montoTexto.value = (montoTexto.value || '').replace(/[^0-9.]/g, '').match(/^\d*\.?\d{0,2}/)?.[0] || '' }
function limpiarRecibido() { recibidoTexto.value = (recibidoTexto.value || '').replace(/[^0-9.]/g, '').match(/^\d*\.?\d{0,2}/)?.[0] || '' }
function sumar(b) { montoTexto.value = String(Math.round((monto.value + b) * 100) / 100) }

// ---- OCR del comprobante (QR): mismo flujo verificado del backend ----
const ocrOk = ref(false)
const validando = ref(false)
const pasosOcr = ref([])
const errorOcr = ref('')
let archivoValidado = null
async function validarComprobante(archivo) {
  if (!archivo || !monto.value) { errorOcr.value = monto.value ? '' : 'Primero escribe el monto.'; return }
  validando.value = true
  errorOcr.value = ''
  pasosOcr.value = [{ clave: 'banco', etiqueta: 'Identificando banco…', ok: true }]
  try {
    const fd = new FormData()
    fd.append('comprobante', archivo)
    fd.append('monto_esperado', String(monto.value))
    // Asíncrono: el backend responde un id y aquí se espera el resultado real
    const r = await validarComprobanteAsync(fd, (etapa) => { pasosOcr.value = [{ clave: 'banco', etiqueta: etapa, ok: true }] })
    pasosOcr.value = r.pasos || []
    ocrOk.value = !!r.valido
    archivoValidado = archivo
  } catch (e) {
    pasosOcr.value = e?.pasos || pasosOcr.value
    errorOcr.value = e?.error || 'No se pudo validar el comprobante.'
    ocrOk.value = false
  } finally { validando.value = false }
}

const puedeRecargar = computed(() => {
  if (!monto.value || monto.value > 9999) return false
  if (metodo.value === 'efectivo') return recibido.value >= monto.value
  return ocrOk.value
})

async function recargar() {
  if (!puedeRecargar.value || cargando.value) return
  cargando.value = true
  error.value = ''
  try {
    const r = await clienteHttp.post('/cajero/recargar', {
      identificador: props.cliente.qr_publico || props.cliente.ci_carnet || props.cliente.telefono || props.cliente.correo,
      monto: monto.value,
      metodo: metodo.value,
    })
    exito.value = r
  } catch (e) {
    error.value = e?.error || 'No se pudo recargar.'
  } finally { cargando.value = false }
}
function cerrarExito() {
  exito.value = null
  montoTexto.value = ''
  recibidoTexto.value = ''
  ocrOk.value = false
  pasosOcr.value = []
  emit('hecho')
}
</script>

<style scoped>
.rec { display: flex; flex-direction: column; gap: 14px; }
.rec-monto {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-radius: 16px;
  background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil);
}
.rec-monto:focus-within { border-color: var(--morado-brillante); }
.rec-monto.chica { padding: 6px 12px; }
.rec-bs { font-weight: 800; color: var(--texto-desactivado); font-size: 0.9rem; flex-shrink: 0; }
.rec-input {
  flex: 1; min-width: 0; background: none; border: none; outline: none; box-shadow: none;
  color: var(--texto-principal); font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; padding: 8px 0;
}
.rec-monto.chica .rec-input { font-size: 1.1rem; }
.rec-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.rec-chip {
  padding: 8px 14px; border-radius: 999px; border: 1px solid var(--borde-sutil);
  background: rgba(168,85,247,0.07); color: var(--texto-principal); font-weight: 700; font-size: 0.82rem; cursor: pointer;
}
.rec-chip:hover { border-color: var(--borde-activo); }
.rec-chip.limpiar { background: none; color: var(--texto-desactivado); }
.rec-chip.exacto { flex-shrink: 0; }
.rec-metodos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 560px) { .rec-metodos { grid-template-columns: 1fr; } }

/* metodo-card compartida (mismo diseño aprobado) */
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

.rec-cambio { margin: 0; font-size: 0.9rem; color: var(--texto-secundario); }
.rec-cambio.ok b { color: var(--color-exito); }
.rec-cambio.falta b { color: var(--color-error); }
.rec-efectivo, .rec-qr { display: flex; flex-direction: column; gap: 10px; }
.rec-qr-cobro { display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--texto-secundario); }
.rec-qr-img { width: 64px; height: 64px; border-radius: 10px; cursor: zoom-in; background: #fff; object-fit: contain; }
.rec-pasos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rec-pasos li { display: flex; align-items: center; gap: 8px; font-size: 0.84rem; color: var(--color-exito); font-weight: 600; }
.rec-pasos li.mal { color: var(--color-error); }
.rec-validando { margin: 0; font-size: 0.82rem; color: var(--texto-secundario); }
.rec-error { margin: 0; font-size: 0.84rem; color: var(--color-error); display: flex; align-items: center; gap: 6px; }
.rec-cta {
  padding: 14px; border: none; border-radius: 16px; cursor: pointer;
  background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 0.95rem;
}
.rec-cta:disabled { opacity: 0.5; cursor: not-allowed; }

.rec-exito-overlay { position: fixed; inset: 0; z-index: 1500; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
.rec-exito {
  width: min(360px, 92vw); margin: auto; text-align: center;
  background: var(--fondo-tarjeta); border: 1px solid rgba(34,197,94,0.35); border-radius: 24px;
  padding: 2rem 1.6rem; display: flex; flex-direction: column; gap: 10px; align-items: center;
}
.rec-exito-ic { width: 64px; height: 64px; border-radius: 50%; background: rgba(34,197,94,0.12); border: 2px solid rgba(34,197,94,0.35); color: var(--color-exito); display: flex; align-items: center; justify-content: center; }
.rec-exito b { color: var(--texto-principal); font-size: 1.15rem; }
.rec-exito p { margin: 0; color: var(--texto-secundario); }
.rec-exito p b { color: var(--color-exito); }
.rec-exito small { color: var(--texto-desactivado); font-size: 0.74rem; }
.rec-exito .rec-cta { width: 100%; margin-top: 6px; }

/* QR a pantalla completa (patrón blanco aprobado) */
.qr-fullscreen { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; background: #fff; cursor: pointer; }
.qr-fs-titulo { font-size: 2rem; font-weight: 800; color: #10002b; margin: 0; }
.qr-fs-img { width: min(80vw, 70vh); max-height: 70vh; object-fit: contain; border-radius: 8px; }
.qr-fs-hint { color: #666; font-size: 0.85rem; margin: 0; }
</style>
