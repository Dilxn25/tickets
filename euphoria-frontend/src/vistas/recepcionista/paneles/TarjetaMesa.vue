<template>
  <Teleport to="body">
    <div class="tm-overlay" @click.self="$emit('cerrar')">
      <div class="tm-sheet fade-in">
        <header class="tm-cab">
          <span class="tm-punto" :class="estado"></span>
          <b>{{ mesa.tipo_elemento === 'silla' ? 'Silla' : 'Mesa' }} {{ mesa.numero_nombre }}</b>
          <small v-if="mesa.precio != null">Bs {{ Number(mesa.precio).toFixed(0) }}</small>
          <button class="tm-x" @click="$emit('cerrar')" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <!-- OCUPADA / RESERVADA: el detalle en vivo -->
        <template v-if="estado !== 'libre'">
          <div class="tm-detalle">
            <div class="tm-fila">
              <span class="tm-avatar">{{ (mesa.cliente || '?')[0] }}</span>
              <div class="tm-fila-txt">
                <b>{{ mesa.cliente || 'Reserva' }}<span v-if="mesa.es_vip" class="tm-vip">VIP</span></b>
                <small v-if="mesa.reservados != null">{{ mesa.ingresados || 0 }} de {{ mesa.reservados }} adentro</small>
              </div>
            </div>
            <div class="tm-fila" v-if="mesa.mesero">
              <span class="tm-avatar mesero">{{ mesa.mesero[0] }}</span>
              <div class="tm-fila-txt"><b>{{ mesa.mesero }}</b><small>mesero asignado</small></div>
            </div>
            <div class="tm-fila" v-else>
              <div class="tm-asignar">
                <select v-model="meseroElegido" class="tm-select">
                  <option :value="null" disabled>Asignar mesero…</option>
                  <option v-for="m in meseros" :key="m.id_usuario" :value="m.id_usuario">{{ m.nombre }} ({{ m.carga }})</option>
                </select>
                <button class="tm-cta chica" :disabled="!meseroElegido || trabajando" @click="asignarMesero">Asignar</button>
              </div>
            </div>
          </div>
        </template>

        <!-- LIBRE: reservar EN VIVO -->
        <template v-else>
          <div class="tm-reserva">
            <div class="tm-cupos">
              <label>Personas del grupo
                <div class="tm-stepper">
                  <button type="button" @click="grupo = Math.max(1, grupo - 1)">−</button>
                  <b>{{ grupo }}</b>
                  <button type="button" @click="grupo++">+</button>
                </div>
              </label>
              <label>Entran ahora
                <div class="tm-stepper">
                  <button type="button" @click="ahora = Math.max(0, ahora - 1)">−</button>
                  <b>{{ ahora }}</b>
                  <button type="button" @click="ahora = Math.min(grupo, ahora + 1)">+</button>
                </div>
              </label>
            </div>

            <BuscadorCliente v-model="cliente" placeholder="Cliente (opcional)" />

            <div class="tm-metodos">
              <button v-for="mp in metodos" :key="mp.v" type="button" :class="['tm-metodo', { activo: metodo === mp.v }]" @click="metodo = mp.v">
                <span v-html="mp.icono"></span>
                {{ mp.t }}
              </button>
            </div>

            <div v-if="metodo === 'efectivo' && precioTotal > 0" class="tm-efectivo">
              <div class="tm-recibido">
                <span>Recibí Bs.</span>
                <input v-model="recibidoTexto" @input="limpiarRecibido" type="text" inputmode="decimal" :placeholder="precioTotal.toFixed(2)" />
                <button type="button" class="tm-chip" @click="recibidoTexto = precioTotal.toFixed(2)">Exacto</button>
              </div>
              <p v-if="recibido > 0" :class="['tm-cambio', cambio >= 0 ? 'ok' : 'falta']">
                {{ cambio >= 0 ? 'Cambio' : 'Falta' }} <b>Bs {{ Math.abs(cambio).toFixed(2) }}</b>
              </p>
            </div>

            <p v-if="error" class="tm-error">{{ error }}</p>

            <button class="tm-cta" :disabled="!puedeReservar || trabajando" @click="reservar">
              {{ trabajando ? '…' : (precioTotal > 0 && metodo !== 'cortesia' ? `Reservar y cobrar Bs ${precioTotal.toFixed(2)}` : 'Reservar') }}
            </button>
          </div>
        </template>

        <!-- Reserva hecha: código para las tandas -->
        <Teleport to="body">
          <div v-if="hecho" class="tm-exito-overlay" @click.self="cerrarExito">
            <div class="tm-exito fade-in">
              <span class="tm-exito-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="28" height="28"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              <b>Mesa {{ mesa.numero_nombre }} reservada</b>
              <p v-if="hecho.faltan > 0">Entraron {{ ahora }} · faltan {{ hecho.faltan }} — entran con este código:</p>
              <p v-else>Grupo completo adentro.</p>
              <div v-if="hecho.faltan > 0" class="tm-codigo">{{ hecho.codigo_ingreso }}</div>
              <button class="tm-cta" @click="cerrarExito">Listo</button>
            </div>
          </div>
        </Teleport>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import BuscadorCliente from '@/componentes/comunes/BuscadorCliente.vue'

const props = defineProps({
  mesa: { type: Object, required: true },
  zona: { type: Object, required: true },
  evento: { type: Object, default: null },
})
const emit = defineEmits(['cerrar', 'hecho'])

const estado = computed(() => props.mesa.estado_ocupacion === 'libre' ? 'libre' : (props.mesa.ingresados > 0 ? 'ocupada' : 'reservada'))

// ---- Reservar en vivo ----
const grupo = ref(Math.max(1, props.mesa.capacidad_sillas || 1))
const ahora = ref(Math.max(1, props.mesa.capacidad_sillas || 1))
const cliente = ref(null)
const metodo = ref('efectivo')
const metodos = [
  { v: 'efectivo', t: 'Efectivo', icono: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>' },
  { v: 'qr', t: 'QR', icono: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>' },
  { v: 'cortesia', t: 'Cortesía', icono: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>' },
]
// La mesa se cobra completa (regla del walk-in del backend)
const precioTotal = computed(() => metodo.value === 'cortesia' ? 0 : Number(props.mesa.precio) || 0)

const recibidoTexto = ref('')
const recibido = computed(() => { const n = parseFloat(recibidoTexto.value); return Number.isFinite(n) && n > 0 ? n : 0 })
const cambio = computed(() => recibido.value - precioTotal.value)
function limpiarRecibido() { recibidoTexto.value = (recibidoTexto.value || '').replace(/[^0-9.]/g, '').match(/^\d*\.?\d{0,2}/)?.[0] || '' }

const puedeReservar = computed(() => {
  if (metodo.value === 'efectivo' && precioTotal.value > 0) return recibido.value >= precioTotal.value
  return true
})

const trabajando = ref(false)
const error = ref('')
const hecho = ref(null)
async function reservar() {
  if (!puedeReservar.value || trabajando.value) return
  trabajando.value = true
  error.value = ''
  try {
    const r = await clienteHttp.post('/aforo/walk-in', {
      id_mesa: props.mesa.id_mesa,
      cantidad: grupo.value,
      cantidad_ahora: ahora.value,
      metodo_pago: metodo.value,
      id_cliente: cliente.value?.id_usuario || null,
    })
    hecho.value = r
  } catch (e) {
    error.value = e?.error || 'No se pudo reservar la mesa.'
  } finally { trabajando.value = false }
}
function cerrarExito() {
  hecho.value = null
  emit('hecho')
}

// ---- Asignar mesero (mesa no libre sin mesero) ----
const meseros = ref([])
const meseroElegido = ref(null)
async function asignarMesero() {
  if (!meseroElegido.value || trabajando.value) return
  trabajando.value = true
  try {
    await clienteHttp.post('/aforo/asignar-mesero', { id_mesa: props.mesa.id_mesa, id_mesero: meseroElegido.value })
    emit('hecho')
  } catch (e) { error.value = e?.error || 'No se pudo asignar.' }
  finally { trabajando.value = false }
}
onMounted(async () => {
  if (estado.value !== 'libre' && !props.mesa.mesero) {
    try { meseros.value = await clienteHttp.get('/aforo/meseros') } catch { meseros.value = [] }
  }
})
</script>

<style scoped>
.tm-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
.tm-sheet { width: min(460px, 94vw); margin: auto; background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: 22px; padding: 18px 16px; display: flex; flex-direction: column; gap: 14px; }
.tm-cab { display: flex; align-items: center; gap: 10px; }
.tm-punto { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
.tm-punto.libre { background: #22C55E; box-shadow: 0 0 8px rgba(34,197,94,0.7); }
.tm-punto.reservada { background: #F59E0B; }
.tm-punto.ocupada { background: #EF4444; }
.tm-cab b { flex: 1; min-width: 0; color: var(--texto-principal); font-size: 1.05rem; font-family: var(--fuente-titulo); }
.tm-cab small { color: var(--rosa-acento); font-weight: 800; }
.tm-x { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.07); color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.tm-detalle { display: flex; flex-direction: column; gap: 10px; }
.tm-fila { display: flex; align-items: center; gap: 12px; }
.tm-avatar { flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--gradiente-marca); color: #fff; font-weight: 800; }
.tm-avatar.mesero { background: linear-gradient(135deg, #0EA5E9, #6366F1); }
.tm-fila-txt { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tm-fila-txt b { color: var(--texto-principal); font-size: 0.92rem; display: flex; align-items: center; gap: 8px; }
.tm-fila-txt small { color: var(--texto-desactivado); font-size: 0.76rem; }
.tm-vip { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em; color: #FACC15; background: rgba(250,204,21,0.12); border: 1px solid rgba(250,204,21,0.4); padding: 1px 7px; border-radius: 999px; }
.tm-asignar { display: flex; gap: 8px; width: 100%; }
.tm-select { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 12px; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1px solid var(--borde-sutil); color: var(--texto-principal); outline: none; }

.tm-reserva { display: flex; flex-direction: column; gap: 13px; }
.tm-cupos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tm-cupos label { display: flex; flex-direction: column; gap: 6px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-secundario); }
.tm-stepper { display: flex; align-items: center; justify-content: space-between; gap: 4px; border: 1px solid var(--borde-sutil); border-radius: 999px; padding: 3px; }
.tm-stepper button { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(168,85,247,0.12); color: var(--texto-principal); font-size: 1.15rem; cursor: pointer; }
.tm-stepper b { color: var(--texto-principal); font-size: 1.1rem; }
.tm-metodos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tm-metodo { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 11px 4px; border-radius: 13px; border: 1.5px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-weight: 700; font-size: 0.74rem; cursor: pointer; }
.tm-metodo.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); color: var(--texto-principal); }
.tm-efectivo { display: flex; flex-direction: column; gap: 8px; }
.tm-recibido { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 13px; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil); }
.tm-recibido span { font-size: 0.8rem; font-weight: 800; color: var(--texto-desactivado); flex-shrink: 0; }
.tm-recibido input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--texto-principal); font-size: 1.15rem; font-weight: 800; padding: 7px 0; }
.tm-chip { flex-shrink: 0; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: rgba(168,85,247,0.07); color: var(--texto-principal); font-weight: 700; font-size: 0.76rem; cursor: pointer; }
.tm-cambio { margin: 0; font-size: 0.85rem; color: var(--texto-secundario); }
.tm-cambio.ok b { color: var(--color-exito); }
.tm-cambio.falta b { color: var(--color-error); }
.tm-error { margin: 0; font-size: 0.84rem; color: var(--color-error); }
.tm-cta { padding: 13px; border: none; border-radius: 14px; background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 0.92rem; cursor: pointer; }
.tm-cta:disabled { opacity: 0.5; cursor: not-allowed; }
.tm-cta.chica { padding: 10px 16px; flex-shrink: 0; }

.tm-exito-overlay { position: fixed; inset: 0; z-index: 1500; background: rgba(6,3,18,0.88); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.tm-exito { width: min(360px, 92vw); text-align: center; background: var(--fondo-tarjeta); border: 1px solid rgba(34,197,94,0.35); border-radius: 22px; padding: 1.8rem 1.4rem; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.tm-exito-ic { width: 58px; height: 58px; border-radius: 50%; background: rgba(34,197,94,0.12); border: 2px solid rgba(34,197,94,0.35); color: var(--color-exito); display: flex; align-items: center; justify-content: center; }
.tm-exito b { color: var(--texto-principal); font-size: 1.05rem; }
.tm-exito p { margin: 0; font-size: 0.84rem; color: var(--texto-secundario); }
.tm-codigo { font-size: 1.3rem; font-weight: 800; letter-spacing: 0.12em; color: var(--morado-hover); background: rgba(168,85,247,0.1); border: 1px dashed var(--borde-activo); border-radius: 12px; padding: 10px 16px; }
.tm-exito .tm-cta { width: 100%; }
</style>
