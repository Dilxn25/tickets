<template>
  <div class="pret">
    <div class="pret-filtros">
      <button v-for="f in filtros" :key="f.v" :class="['pret-filtro', { activo: filtro === f.v }]" @click="filtro = f.v; cargar()">
        {{ f.t }}
      </button>
    </div>

    <p v-if="cargando" class="pret-estado">Cargando…</p>
    <p v-else-if="!retiros.length" class="pret-estado">Sin solicitudes {{ filtro === 'pendiente' ? 'pendientes' : filtro === 'pagado' ? 'pagadas' : 'rechazadas' }}.</p>

    <div v-for="r in retiros" :key="r.id_solicitud" class="pret-card">
      <div class="pret-cab">
        <span class="pret-avatar">
          <img v-if="r.foto_cliente" :src="r.foto_cliente" alt="" />
          <template v-else>{{ (r.cliente || '?')[0] }}</template>
        </span>
        <div class="pret-quien">
          <b>{{ r.cliente }}</b>
          <small>{{ r.telefono || r.correo }}</small>
        </div>
        <span class="pret-saldo">Bs {{ Number(r.saldo_actual ?? r.saldo_al_solicitar).toFixed(2) }}</span>
      </div>

      <p class="pret-metodo">
        <svg v-if="r.metodo === 'qr'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
        {{ r.metodo === 'qr' ? 'A su QR / cuenta' : 'Efectivo en el local' }}
      </p>
      <p v-if="r.mensaje" class="pret-msg">“{{ r.mensaje }}”</p>

      <button v-if="r.qr_imagen" class="pret-thumb" type="button" @click="imagenAmpliada = r.qr_imagen">
        <img :src="r.qr_imagen" alt="QR del cliente" />
        <span>QR del cliente</span>
      </button>

      <!-- Pendiente: cobrar -->
      <template v-if="r.estado === 'pendiente'">
        <div class="pret-montos">
          <label>Retirar
            <input v-model="r._retirar" type="number" step="0.01" min="0" :max="r.saldo_actual" class="pret-input" />
          </label>
          <span class="pret-entrega">{{ r.metodo === 'qr' ? 'Transferir' : 'Entregar' }} <b>Bs {{ entregar(r).toFixed(2) }}</b></span>
        </div>
        <div v-if="r.metodo === 'qr'" class="pret-comp">
          <template v-if="!r._comprobante">
            <CapturaCamara modo="foto" texto-guia="Comprobante del depósito" @archivo="r._comprobante = $event" />
          </template>
          <p v-else class="pret-comp-ok">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="13" height="13"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Comprobante listo
            <button class="pret-quitar" @click="r._comprobante = null">quitar</button>
          </p>
        </div>
        <div class="pret-acciones">
          <button class="pret-pagar" :disabled="procesando === r.id_solicitud || (r.metodo === 'qr' && !r._comprobante)" @click="pagar(r)">
            {{ procesando === r.id_solicitud ? '…' : 'Registrar retiro' }}
          </button>
          <button class="pret-rechazar" :disabled="procesando === r.id_solicitud" @click="rechazando = r">Rechazar</button>
        </div>
      </template>

      <p v-else-if="r.estado === 'pagado'" class="pret-pagado">
        Retiró Bs {{ r.monto_retirado }} · recibió Bs {{ r.monto_entregado }}<span v-if="Number(r.diferencia) > 0"> · +Bs {{ r.diferencia }}</span>
        <button v-if="r.comprobante_pago" class="pret-ver" @click="imagenAmpliada = r.comprobante_pago">ver comprobante</button>
      </p>
      <p v-else class="pret-rechazado">Rechazada{{ r.motivo_rechazo ? ' · ' + r.motivo_rechazo : '' }}</p>
    </div>

    <!-- Motivo del rechazo -->
    <Teleport to="body">
      <div v-if="rechazando" class="pret-overlay" @click.self="rechazando = null">
        <div class="pret-modal fade-in">
          <b>¿Por qué se rechaza?</b>
          <input v-model="motivo" class="pret-input ancho" placeholder="Ej: QR ilegible, cuenta no coincide…" @keyup.enter="confirmarRechazo" />
          <div class="pret-acciones">
            <button class="pret-rechazar" @click="confirmarRechazo" :disabled="!motivo.trim()">Rechazar</button>
            <button class="pret-cancelar" @click="rechazando = null">Volver</button>
          </div>
        </div>
      </div>
      <!-- Visor oscuro con marco blanco (patrón aprobado) -->
      <div v-if="imagenAmpliada" class="visor-overlay" @click.self="imagenAmpliada = null">
        <button class="visor-cerrar" @click="imagenAmpliada = null" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="visor-marco"><img :src="imagenAmpliada" alt="Imagen ampliada" /></div>
        <p class="visor-hint">Toca fuera de la imagen para cerrar</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'

const emit = defineEmits(['pendientes', 'pagado'])

const filtros = [
  { v: 'pendiente', t: 'Pendientes' },
  { v: 'pagado', t: 'Pagados' },
  { v: 'rechazado', t: 'Rechazados' },
]
const filtro = ref('pendiente')
const retiros = ref([])
const cargando = ref(false)
const procesando = ref(null)
const imagenAmpliada = ref(null)
const rechazando = ref(null)
const motivo = ref('')

async function cargar() {
  cargando.value = true
  try {
    const data = await clienteHttp.get(`/cajero/retiros?estado=${filtro.value}`)
    retiros.value = (data || []).map(r => ({ ...r, _retirar: r.saldo_actual, _comprobante: null }))
    if (filtro.value === 'pendiente') emit('pendientes', retiros.value.length)
  } catch { retiros.value = [] } finally { cargando.value = false }
}

// Regla establecida: efectivo redondea hacia arriba a 0.10; traspaso exacto.
function entregar(r) {
  const m = Number(r._retirar) || 0
  if (m <= 0) return 0
  return r.metodo === 'qr' ? Math.round(m * 100) / 100 : Math.ceil(m * 10) / 10
}

async function pagar(r) {
  if (procesando.value) return
  procesando.value = r.id_solicitud
  try {
    const fd = new FormData()
    fd.append('monto_retirado', String(Number(r._retirar) || 0))
    if (r._comprobante) fd.append('comprobante', r._comprobante)
    await clienteHttp.post(`/cajero/retiros/${r.id_solicitud}/pagar`, fd)
    await cargar()
    emit('pagado')
  } catch (e) {
    r._error = e?.error || 'No se pudo pagar.'
  } finally { procesando.value = null }
}

async function confirmarRechazo() {
  const r = rechazando.value
  if (!r || !motivo.value.trim()) return
  try {
    await clienteHttp.post(`/cajero/retiros/${r.id_solicitud}/rechazar`, { motivo: motivo.value.trim() })
    rechazando.value = null
    motivo.value = ''
    await cargar()
  } catch { /* se muestra al recargar */ }
}

let socket = null
onMounted(() => {
  cargar()
  socket = io({ path: '/socket.io' })
  socket.on('retiro_solicitado', cargar)
})
onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.pret { display: flex; flex-direction: column; gap: 12px; }
.pret-filtros { display: flex; gap: 6px; }
.pret-filtro { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-weight: 700; font-size: 0.78rem; cursor: pointer; }
.pret-filtro.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.12); color: var(--texto-principal); }
.pret-estado { margin: 0; text-align: center; padding: 1.6rem 0; font-size: 0.85rem; color: var(--texto-desactivado); }

.pret-card { border: 1px solid var(--borde-sutil); border-radius: 16px; padding: 14px; background: var(--fondo-tarjeta); display: flex; flex-direction: column; gap: 8px; }
.pret-cab { display: flex; align-items: center; gap: 10px; }
.pret-avatar { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.14); color: var(--morado-hover); font-weight: 800; }
.pret-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pret-quien { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pret-quien b { color: var(--texto-principal); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pret-quien small { color: var(--texto-desactivado); font-size: 0.72rem; }
.pret-saldo { flex-shrink: 0; font-weight: 800; color: var(--color-exito); font-size: 0.85rem; }
.pret-metodo { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--texto-secundario); }
.pret-msg { margin: 0; font-size: 0.8rem; font-style: italic; color: var(--texto-principal); }
.pret-thumb { display: inline-flex; align-items: center; gap: 10px; align-self: flex-start; padding: 6px 12px 6px 6px; border-radius: 12px; cursor: zoom-in; background: #fff; border: none; color: #1a1030; font-weight: 700; font-size: 0.74rem; }
.pret-thumb img { width: 46px; height: 46px; object-fit: contain; }
.pret-montos { display: flex; align-items: end; gap: 12px; flex-wrap: wrap; }
.pret-montos label { display: flex; flex-direction: column; gap: 4px; font-size: 0.72rem; font-weight: 700; color: var(--texto-secundario); }
.pret-input { padding: 9px 11px; border: 1px solid var(--borde-sutil); border-radius: 10px; background: var(--fondo-input, rgba(255,255,255,.04)); color: var(--texto-principal); font-weight: 700; width: 120px; outline: none; }
.pret-input:focus { border-color: var(--morado-brillante); }
.pret-input.ancho { width: 100%; box-sizing: border-box; }
.pret-entrega { font-size: 0.8rem; color: var(--texto-secundario); padding-bottom: 8px; }
.pret-entrega b { color: #FCD34D; }
.pret-comp-ok { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; color: var(--color-exito); }
.pret-quitar { background: none; border: none; color: var(--texto-desactivado); font-size: 0.74rem; cursor: pointer; text-decoration: underline; }
.pret-acciones { display: flex; gap: 8px; }
.pret-pagar { flex: 1; padding: 11px; border: none; border-radius: 12px; background: var(--gradiente-marca); color: #fff; font-weight: 800; cursor: pointer; }
.pret-pagar:disabled { opacity: 0.55; cursor: not-allowed; }
.pret-rechazar { padding: 11px 14px; border: 1px solid rgba(239,68,68,.4); border-radius: 12px; background: rgba(239,68,68,.08); color: var(--color-error); font-weight: 700; cursor: pointer; }
.pret-cancelar { padding: 11px 14px; border: 1px solid var(--borde-sutil); border-radius: 12px; background: none; color: var(--texto-secundario); font-weight: 700; cursor: pointer; }
.pret-pagado { margin: 0; font-size: 0.8rem; color: var(--color-exito); font-weight: 600; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pret-ver { background: none; border: none; color: var(--color-primario, #a855f7); font-size: 0.76rem; font-weight: 700; cursor: pointer; text-decoration: underline; }
.pret-rechazado { margin: 0; font-size: 0.8rem; color: var(--color-error); }

.pret-overlay { position: fixed; inset: 0; z-index: 1500; background: rgba(6,3,18,0.8); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.pret-modal { width: min(380px, 92vw); background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.pret-modal b { color: var(--texto-principal); }

.visor-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 20px; background: rgba(6,3,18,0.9); backdrop-filter: blur(6px); }
.visor-cerrar { position: absolute; top: 18px; right: 18px; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.visor-marco { background: #fff; padding: 14px; border-radius: 20px; box-shadow: 0 24px 70px rgba(0,0,0,0.6); max-width: min(92vw, 560px); max-height: 76vh; display: flex; }
.visor-marco img { max-width: 100%; max-height: calc(76vh - 28px); object-fit: contain; border-radius: 8px; }
.visor-hint { color: rgba(255,255,255,0.55); font-size: 0.82rem; margin: 0; }
</style>
