<template>
  <div class="ppc">
    <p v-if="cargando && !cargadoUnaVez" class="ppc-estado">Cargando…</p>
    <p v-else-if="!recargas.length && !depositos.length" class="ppc-estado">Nada por confirmar.</p>

    <!-- Recargas que superaron el tope y esperan al banco -->
    <template v-if="recargas.length">
      <h4 class="ppc-titulo">Recargas en revisión</h4>
      <div v-for="r in recargas" :key="'r' + r.id_recarga" class="ppc-card">
        <div class="ppc-cab">
          <span class="ppc-avatar">{{ (r.cliente || '?')[0] }}</span>
          <div class="ppc-quien">
            <b>{{ r.cliente || 'Cliente' }}</b>
            <small>{{ hora(r.fecha) }}<template v-if="r.telefono"> · {{ r.telefono }}</template></small>
          </div>
          <span class="ppc-monto">Bs {{ r.monto.toFixed(2) }}</span>
        </div>
        <button v-if="r.imagen" class="ppc-ver" type="button" @click="imagenAmpliada = r.imagen">ver comprobante</button>
        <p v-if="r._error" class="ppc-error">{{ r._error }}</p>
        <div class="ppc-acciones">
          <button class="ppc-ok" :disabled="procesando === 'r' + r.id_recarga" @click="resolver(r, 'completada')">
            {{ procesando === 'r' + r.id_recarga ? '…' : 'Llegó al banco · acreditar' }}
          </button>
          <button class="ppc-no" :disabled="procesando === 'r' + r.id_recarga" @click="rechazando = r">No llegó</button>
        </div>
      </div>
    </template>

    <!-- Depósitos del banco que no se asignaron a ninguna recarga -->
    <template v-if="depositos.length">
      <h4 class="ppc-titulo">Depósitos sin asignar</h4>
      <div v-for="d in depositos" :key="'d' + d.id_deposito" class="ppc-card">
        <div class="ppc-cab">
          <span class="ppc-avatar banco">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M2 21h20M12 3l9 5H3z"></path></svg>
          </span>
          <div class="ppc-quien">
            <b>{{ d.originante || 'Originante sin nombre' }}</b>
            <small>{{ hora(d.fecha) }}<template v-if="d.banco_origen"> · {{ d.banco_origen }}</template></small>
          </div>
          <span class="ppc-monto">Bs {{ d.monto.toFixed(2) }}</span>
        </div>
        <p v-if="d.glosa" class="ppc-glosa">“{{ d.glosa }}”</p>

        <div v-if="d._cliente" class="ppc-elegido">
          <span>{{ d._cliente.nombres }} {{ d._cliente.apellidos }}</span>
          <button class="ppc-quitar" @click="d._cliente = null">cambiar</button>
        </div>
        <div v-else class="ppc-buscar">
          <input v-model="d._q" class="ppc-input" placeholder="¿De quién es? Nombre, CI o teléfono" @input="buscar(d)" />
          <div v-if="d._resultados?.length" class="ppc-res">
            <button v-for="c in d._resultados" :key="c.id_usuario" @click="d._cliente = c; d._resultados = []">
              {{ c.nombres }} {{ c.apellidos }}<small>{{ c.telefono || c.ci_carnet }}</small>
            </button>
          </div>
        </div>
        <p v-if="d._error" class="ppc-error">{{ d._error }}</p>
        <button class="ppc-ok" :disabled="!d._cliente || procesando === 'd' + d.id_deposito" @click="asignar(d)">
          {{ procesando === 'd' + d.id_deposito ? '…' : 'Acreditar a este cliente' }}
        </button>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="rechazando" class="ppc-overlay" @click.self="rechazando = null">
        <div class="ppc-modal fade-in">
          <b>¿El depósito de Bs {{ rechazando.monto.toFixed(2) }} no llegó?</b>
          <p>La recarga se rechaza y {{ rechazando.cliente || 'el cliente' }} recibe un aviso para acercarse a caja.</p>
          <div class="ppc-acciones">
            <button class="ppc-no" @click="resolver(rechazando, 'rechazada')">Rechazar recarga</button>
            <button class="ppc-volver" @click="rechazando = null">Volver</button>
          </div>
        </div>
      </div>
      <div v-if="imagenAmpliada" class="visor-overlay" @click.self="imagenAmpliada = null">
        <button class="visor-cerrar" @click="imagenAmpliada = null" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="visor-marco"><img :src="imagenAmpliada" alt="Comprobante" /></div>
        <p class="visor-hint">Toca fuera de la imagen para cerrar</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
// Caja: recargas que superaron el tope instantáneo y esperan la confirmación
// del banco, y depósitos que llegaron al banco sin asignarse a nadie (el cliente
// declaró otro monto o no terminó la recarga). El cajero revisa su app del
// banco y decide; el saldo solo se mueve desde aquí o por el correo del banco.
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'

const emit = defineEmits(['pendientes'])

const recargas = ref([])
const depositos = ref([])
const cargando = ref(false)
const cargadoUnaVez = ref(false)
const procesando = ref(null)
const rechazando = ref(null)
const imagenAmpliada = ref(null)

function hora(f) {
  const d = new Date(f)
  return d.toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function cargar() {
  cargando.value = true
  try {
    const data = await clienteHttp.get('/cajero/por-confirmar')
    recargas.value = (data?.recargas || []).map(r => ({ ...r, _error: '' }))
    depositos.value = (data?.depositos || []).map(d => ({ ...d, _q: '', _resultados: [], _cliente: null, _error: '' }))
    emit('pendientes', recargas.value.length + depositos.value.length)
  } catch { /* se reintenta con el próximo aviso */ } finally {
    cargando.value = false
    cargadoUnaVez.value = true
  }
}

async function resolver(r, estado) {
  if (procesando.value) return
  procesando.value = 'r' + r.id_recarga
  try {
    await clienteHttp.post('/cajero/resolver', { id_recarga: r.id_recarga, estado })
    rechazando.value = null
    await cargar()
  } catch (e) {
    r._error = e?.error || 'No se pudo procesar.'
    rechazando.value = null
  } finally { procesando.value = null }
}

let espera = null
function buscar(d) {
  clearTimeout(espera)
  const q = d._q.trim()
  if (!q) { d._resultados = []; return }
  espera = setTimeout(async () => {
    try { d._resultados = await clienteHttp.get(`/cajero/buscar-cliente?q=${encodeURIComponent(q)}`) } catch { d._resultados = [] }
  }, 220)
}

async function asignar(d) {
  if (!d._cliente || procesando.value) return
  procesando.value = 'd' + d.id_deposito
  try {
    await clienteHttp.post(`/cajero/depositos/${d.id_deposito}/asignar`, { id_usuario: d._cliente.id_usuario })
    await cargar()
  } catch (e) {
    d._error = e?.error || 'No se pudo acreditar.'
  } finally { procesando.value = null }
}

let socket = null
onMounted(() => {
  cargar()
  socket = io({ path: '/socket.io' })
  socket.on('recarga_registrada', cargar)
})
onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.ppc { display: flex; flex-direction: column; gap: 12px; }
.ppc-estado { margin: 0; text-align: center; padding: 1.6rem 0; font-size: 0.85rem; color: var(--texto-desactivado); }
.ppc-titulo { margin: 4px 0 0; font-size: 0.74rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--texto-secundario); }
.ppc-card { border: 1px solid var(--borde-sutil); border-radius: 16px; padding: 14px; background: var(--fondo-tarjeta); display: flex; flex-direction: column; gap: 8px; }
.ppc-cab { display: flex; align-items: center; gap: 10px; }
.ppc-avatar { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.14); color: var(--morado-hover); font-weight: 800; }
.ppc-avatar.banco { background: rgba(245,158,11,0.14); color: #FCD34D; }
.ppc-quien { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ppc-quien b { color: var(--texto-principal); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ppc-quien small { color: var(--texto-desactivado); font-size: 0.72rem; }
.ppc-monto { flex-shrink: 0; font-weight: 800; color: #FCD34D; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
.ppc-glosa { margin: 0; font-size: 0.8rem; font-style: italic; color: var(--texto-secundario); }
.ppc-ver { align-self: flex-start; background: none; border: none; padding: 0; color: var(--color-primario, #a855f7); font-size: 0.78rem; font-weight: 700; cursor: pointer; text-decoration: underline; }
.ppc-acciones { display: flex; gap: 8px; }
.ppc-ok { flex: 1; padding: 11px; border: none; border-radius: 12px; background: var(--gradiente-marca); color: #fff; font-weight: 800; cursor: pointer; }
.ppc-ok:disabled { opacity: 0.55; cursor: not-allowed; }
.ppc-no { padding: 11px 14px; border: 1px solid rgba(239,68,68,.4); border-radius: 12px; background: rgba(239,68,68,.08); color: var(--color-error); font-weight: 700; cursor: pointer; }
.ppc-volver { padding: 11px 14px; border: 1px solid var(--borde-sutil); border-radius: 12px; background: none; color: var(--texto-secundario); font-weight: 700; cursor: pointer; }
.ppc-error { margin: 0; font-size: 0.78rem; color: var(--color-error); }
.ppc-buscar { position: relative; }
.ppc-input { width: 100%; box-sizing: border-box; padding: 9px 11px; border: 1px solid var(--borde-sutil); border-radius: 10px; background: var(--fondo-input, rgba(255,255,255,.04)); color: var(--texto-principal); font-weight: 600; outline: none; }
.ppc-input:focus { border-color: var(--morado-brillante); }
.ppc-res { margin-top: 6px; display: flex; flex-direction: column; border: 1px solid var(--borde-sutil); border-radius: 10px; overflow: hidden; }
.ppc-res button { display: flex; justify-content: space-between; gap: 8px; padding: 9px 11px; border: none; background: var(--fondo-tarjeta); color: var(--texto-principal); font-weight: 700; font-size: 0.82rem; cursor: pointer; text-align: left; }
.ppc-res button + button { border-top: 1px solid var(--borde-sutil); }
.ppc-res button:hover { background: rgba(168,85,247,0.1); }
.ppc-res small { color: var(--texto-desactivado); font-weight: 600; }
.ppc-elegido { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 11px; border-radius: 10px; background: rgba(168,85,247,0.1); color: var(--texto-principal); font-weight: 700; font-size: 0.84rem; }
.ppc-quitar { background: none; border: none; color: var(--texto-desactivado); font-size: 0.74rem; cursor: pointer; text-decoration: underline; }

.ppc-overlay { position: fixed; inset: 0; z-index: 1500; background: rgba(6,3,18,0.8); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.ppc-modal { width: min(380px, 92vw); background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.ppc-modal b { color: var(--texto-principal); }
.ppc-modal p { margin: 0; font-size: 0.84rem; color: var(--texto-secundario); }

.visor-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 20px; background: rgba(6,3,18,0.9); backdrop-filter: blur(6px); }
.visor-cerrar { position: absolute; top: 18px; right: 18px; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.visor-marco { background: #fff; padding: 14px; border-radius: 20px; box-shadow: 0 24px 70px rgba(0,0,0,0.6); max-width: min(92vw, 560px); max-height: 76vh; display: flex; }
.visor-marco img { max-width: 100%; max-height: calc(76vh - 28px); object-fit: contain; border-radius: 8px; }
.visor-hint { color: rgba(255,255,255,0.55); font-size: 0.82rem; margin: 0; }
</style>
