<template>
  <Teleport to="body">
    <div class="ing-overlay" @click.self="$emit('cerrar')">
      <div class="ing-sheet fade-in">
        <header class="ing-cab">
          <b>Registrar ingreso</b>
          <button class="ing-x" @click="$emit('cerrar')" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <!-- Validado: tarjeta de la entrada con tandas -->
        <div v-if="entrada" class="ing-entrada fade-in">
          <div class="ing-quien">
            <span class="ing-avatar">{{ (entrada.cliente || '?')[0] }}</span>
            <div class="ing-quien-txt">
              <b>{{ entrada.cliente }}</b>
              <small>{{ entrada.mesa ? `Mesa ${entrada.mesa}` : (entrada.zona || 'General') }}<template v-if="entrada.evento"> · {{ entrada.evento }}</template></small>
            </div>
          </div>
          <div class="ing-cupos">
            <div class="ing-cupo hecho"><b>{{ entrada.cantidad_ingresada }}</b><small>adentro</small></div>
            <div class="ing-cupo"><b>{{ entrada.restantes }}</b><small>por entrar</small></div>
            <div class="ing-cupo total"><b>{{ entrada.cantidad_personas }}</b><small>en total</small></div>
          </div>
          <div v-if="entrada.restantes > 0" class="ing-tanda">
            <span>Entran ahora</span>
            <div class="ing-stepper">
              <button type="button" @click="cantidad = Math.max(1, cantidad - 1)">−</button>
              <b>{{ cantidad }}</b>
              <button type="button" @click="cantidad = Math.min(entrada.restantes, cantidad + 1)">+</button>
            </div>
            <button class="ing-cta" :disabled="validando" @click="validar(entrada.codigo)">
              {{ validando ? '…' : `Registrar ${cantidad} ${cantidad === 1 ? 'ingreso' : 'ingresos'}` }}
            </button>
          </div>
          <p v-else class="ing-completo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Ingreso completo
          </p>
          <!-- Mesero de la mesa: ya asignado (con opción de cambiar) o elegir uno -->
          <div v-if="idMesaSugerida && meseroAsignado && !eligiendoMesero" class="ing-asignado fade-in">
            <span class="ing-asig-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="15" height="15"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
            <span class="ing-asig-txt">Atiende <b>{{ meseroAsignado }}</b></span>
            <button type="button" class="ing-cambiar" @click="abrirMeseros">Cambiar</button>
          </div>
          <div v-else-if="idMesaSugerida && meseros.length" class="ing-meseros fade-in">
            <span class="ing-mes-tit">¿Quién atiende la mesa {{ entrada.mesa }}?</span>
            <div class="ing-mes-lista">
              <button
                v-for="m in meseros" :key="m.id_usuario" type="button" class="ing-mes"
                :class="{ sugerido: meseroSugerido && m.id_usuario === meseroSugerido.id_usuario }"
                :disabled="asignando" @click="asignarMesero(m)"
              >
                <span class="ing-mes-av">{{ iniciales(m.nombre) }}</span>
                <span class="ing-mes-txt">
                  <b>{{ m.nombre }}</b>
                  <small>{{ m.carga }} {{ m.carga === 1 ? 'mesa' : 'mesas' }}<template v-if="meseroSugerido && m.id_usuario === meseroSugerido.id_usuario"> · sugerido</template></small>
                </span>
              </button>
            </div>
          </div>
          <!-- El error de la admisión también se ve aquí (antes solo en la búsqueda:
               el botón "Registrar" fallaba sin decir nada) -->
          <div v-if="error" class="ing-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{{ error }}</span>
          </div>
          <button class="ing-otro" @click="reiniciar">Registrar otro ingreso</button>
        </div>

        <!-- Buscar: escáner + código incremental -->
        <template v-else>
          <CapturaCamara v-if="modo === 'qr'" modo="qr" texto-guia="Apunta al QR de la entrada" @codigo="validar" />
          <div v-else class="ing-codigo">
            <input
              v-model="codigo" @input="buscarIncremental" type="text"
              class="ing-input" placeholder="Código de la entrada…" autocomplete="off"
              style="text-transform: uppercase" />
            <div v-if="sugerencias.length" class="ing-sug">
              <button v-for="s in sugerencias" :key="s.codigo" class="ing-sug-item" @click="validar(s.codigo)">
                <b>{{ s.codigo }}</b>
                <small>{{ s.cliente }}{{ s.mesa ? ' · Mesa ' + s.mesa : '' }}{{ s.restantes != null ? ' · faltan ' + s.restantes : '' }}</small>
              </button>
            </div>
          </div>
          <div class="ing-modos">
            <button :class="['ing-modo', { activo: modo === 'qr' }]" @click="modo = 'qr'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
              Escanear
            </button>
            <button :class="['ing-modo', { activo: modo === 'codigo' }]" @click="modo = 'codigo'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
              Código
            </button>
          </div>
          <!-- Error SIEMPRE visible y explicado (antes era una línea chica que pasaba desapercibida) -->
          <div v-if="error" class="ing-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{{ error }}</span>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'

const emit = defineEmits(['cerrar', 'ingreso'])

const modo = ref('qr')
const codigo = ref('')
const sugerencias = ref([])
const entrada = ref(null)
const cantidad = ref(1)
const validando = ref(false)
const error = ref('')
const meseroSugerido = ref(null)
const meseroAsignado = ref(null)
const asignando = ref(false)
const meseros = ref([])            // meseros con su carga en este evento (los más libres arriba)
const eligiendoMesero = ref(false)
const idMesaSugerida = ref(null)
const idEntradaActual = ref(null)
const iniciales = (n) => String(n || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
let debounce = null

function buscarIncremental() {
  codigo.value = codigo.value.toUpperCase()
  clearTimeout(debounce)
  const q = codigo.value.trim()
  if (q.length < 2) { sugerencias.value = []; return }
  debounce = setTimeout(async () => {
    try { sugerencias.value = await clienteHttp.get(`/aforo/buscar-codigo?q=${encodeURIComponent(q)}`) }
    catch { sugerencias.value = [] }
  }, 220)
}

// R1.1: lo escaneado puede ser el TOKEN firmado del QR de la entrada (tres
// bloques separados por puntos) o el código corto dictable — cada uno viaja
// en su campo y el backend lo resuelve. Nunca se trata un token como código.
function claveEntrada(valor) {
  const v = String(valor).trim()
  return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(v) ? { token: v } : { codigo: v.toUpperCase() }
}

// Primer paso: CONSULTA (no admite a nadie) — muestra los cupos y el
// recepcionista elige cuántos entran. "Registrar N" hace la admisión real.
async function validar(cod) {
  if (!cod || validando.value) return
  validando.value = true
  error.value = ''
  try {
    const codigo_ = String(cod).trim()
    if (!entrada.value) {
      const c = await clienteHttp.post('/aforo/validar', { ...claveEntrada(codigo_), consultar: true })
      if (c.completo) { entrada.value = { ...c, codigo: codigo_ }; return }
      entrada.value = { ...c, codigo: codigo_ }
      cantidad.value = Math.max(1, c.restantes || 1) // por defecto entran todos los que faltan
      return
    }
    const r = await clienteHttp.post('/aforo/validar', { ...claveEntrada(codigo_), cantidad: cantidad.value })
    entrada.value = { ...entrada.value, ...r, codigo: codigo_ }
    cantidad.value = Math.max(1, Math.min(cantidad.value, r.restantes || 1))
    meseroAsignado.value = r.mesa_ya_asignada?.nombre || null
    meseroSugerido.value = r.mesero_sugerido || null
    idMesaSugerida.value = r.id_mesa || null
    idEntradaActual.value = r.id_entrada || null
    eligiendoMesero.value = false
    if (idMesaSugerida.value && !meseroAsignado.value) await cargarMeseros()
    emit('ingreso')
  } catch (e) {
    error.value = e?.error || 'No se pudo validar la entrada.'
  } finally { validando.value = false }
}

// Meseros con su carga en el evento de esa mesa. El sugerido (el más libre) va primero.
async function cargarMeseros() {
  try {
    const lista = await clienteHttp.get(`/aforo/meseros?mesa=${idMesaSugerida.value}`)
    const sug = meseroSugerido.value?.id_usuario
    meseros.value = [...(lista || [])].sort((a, b) => (b.id_usuario === sug) - (a.id_usuario === sug))
  } catch { meseros.value = [] }
}
async function abrirMeseros() {
  eligiendoMesero.value = true
  await cargarMeseros()
}
async function asignarMesero(m) {
  if (!idMesaSugerida.value || asignando.value) return
  asignando.value = true
  error.value = ''
  try {
    await clienteHttp.post('/aforo/asignar-mesero', { id_mesa: idMesaSugerida.value, id_entrada: idEntradaActual.value, id_mesero: m.id_usuario })
    meseroAsignado.value = m.nombre
    meseroSugerido.value = null
    eligiendoMesero.value = false
  } catch (e) {
    error.value = e?.error || 'No se pudo asignar el mesero. Intenta de nuevo.'
  } finally { asignando.value = false }
}

function reiniciar() {
  entrada.value = null
  codigo.value = ''
  sugerencias.value = []
  meseroSugerido.value = null
  meseroAsignado.value = null
  meseros.value = []
  eligiendoMesero.value = false
  idMesaSugerida.value = null
  idEntradaActual.value = null
  error.value = ''
}
</script>

<style scoped>
.ing-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
.ing-sheet { width: min(480px, 94vw); margin: auto; background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: 22px; padding: 18px 16px; display: flex; flex-direction: column; gap: 14px; }
.ing-cab { display: flex; align-items: center; justify-content: space-between; }
.ing-cab b { color: var(--texto-principal); font-size: 1.05rem; font-family: var(--fuente-titulo); }
.ing-x { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.07); color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center; }

.ing-modos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ing-modo { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border-radius: 12px; border: 1.5px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-weight: 700; font-size: 0.84rem; cursor: pointer; }
.ing-modo.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); color: var(--texto-principal); }
.ing-input { width: 100%; box-sizing: border-box; padding: 13px 14px; border-radius: 14px; outline: none; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil); color: var(--texto-principal); font-size: 1rem; font-weight: 700; letter-spacing: 0.08em; }
.ing-input:focus { border-color: var(--morado-brillante); }
.ing-sug { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.ing-sug-item { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--borde-sutil); background: rgba(255,255,255,0.02); cursor: pointer; }
.ing-sug-item:hover { border-color: var(--borde-activo); }
.ing-sug-item b { color: var(--texto-principal); font-size: 0.86rem; letter-spacing: 0.06em; }
.ing-sug-item small { color: var(--texto-desactivado); font-size: 0.74rem; }
.ing-error {
  display: flex; align-items: flex-start; gap: 10px;
  margin: 0; padding: 11px 13px; border-radius: 12px;
  font-size: 0.92rem; font-weight: 600; line-height: 1.4; color: #ffb4b4;
  background: rgba(239, 68, 68, .14); border: 1px solid rgba(239, 68, 68, .45);
  animation: ing-error-in .22s ease;
}
.ing-error svg { flex: none; margin-top: 1px; color: var(--color-error); }
@keyframes ing-error-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

.ing-entrada { display: flex; flex-direction: column; gap: 14px; }
.ing-quien { display: flex; align-items: center; gap: 12px; }
.ing-avatar { flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 1.05rem; }
.ing-quien-txt { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ing-quien-txt b { color: var(--texto-principal); }
.ing-quien-txt small { color: var(--texto-desactivado); font-size: 0.76rem; }
.ing-cupos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ing-cupo { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px 6px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--borde-sutil); }
.ing-cupo b { font-size: 1.3rem; font-weight: 800; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.ing-cupo small { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--texto-desactivado); }
.ing-cupo.hecho b { color: var(--color-exito); }
.ing-cupo.total b { color: var(--morado-hover); }
.ing-tanda { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 0.84rem; color: var(--texto-secundario); }
.ing-stepper { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--borde-sutil); border-radius: 999px; padding: 3px; }
.ing-stepper button { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(168,85,247,0.12); color: var(--texto-principal); font-size: 1.15rem; cursor: pointer; }
.ing-stepper b { min-width: 30px; text-align: center; color: var(--texto-principal); font-size: 1.05rem; }
.ing-cta { flex: 1; padding: 12px 16px; border: none; border-radius: 13px; background: var(--gradiente-marca); color: #fff; font-weight: 800; cursor: pointer; }
.ing-cta:disabled { opacity: 0.5; }
.ing-cta.chica { flex: 0 0 auto; padding: 9px 16px; }
.ing-completo { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 800; color: var(--color-exito); }
.ing-meseros { display: flex; flex-direction: column; gap: 8px; }
.ing-mes-tit { font-size: 0.82rem; font-weight: 700; color: var(--texto-secundario); }
.ing-mes-lista { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
.ing-mes {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 13px; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.03); border: 1px solid var(--borde-sutil); color: var(--texto-principal);
  transition: border-color 0.2s ease, transform 0.12s ease;
}
.ing-mes:active { transform: scale(0.98); }
.ing-mes:disabled { opacity: 0.6; cursor: wait; }
.ing-mes.sugerido { border-color: var(--rosa-acento); background: rgba(236,72,153,0.08); }
.ing-mes-av {
  width: 34px; height: 34px; border-radius: 50%; flex: none; display: grid; place-items: center;
  font-size: 0.78rem; font-weight: 800; color: #fff; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
}
.ing-mes-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ing-mes-txt b { font-size: 0.9rem; }
.ing-mes-txt small { font-size: 0.74rem; color: var(--texto-desactivado); }
.ing-mes.sugerido .ing-mes-txt small { color: var(--rosa-acento); font-weight: 700; }
.ing-asignado {
  display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 13px;
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.35);
}
.ing-asig-ico { width: 26px; height: 26px; border-radius: 50%; flex: none; display: grid; place-items: center; background: var(--color-exito); color: #fff; }
.ing-asig-txt { flex: 1; font-size: 0.88rem; color: var(--texto-secundario); }
.ing-asig-txt b { color: var(--texto-principal); }
.ing-cambiar { flex: none; padding: 6px 12px; border-radius: 999px; cursor: pointer; background: none; border: 1px solid var(--borde-activo); color: var(--texto-secundario); font-weight: 700; font-size: 0.78rem; }
.ing-mesero { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 13px; border-radius: 13px; background: rgba(168,85,247,0.08); border: 1px solid var(--borde-activo); font-size: 0.84rem; color: var(--texto-secundario); }
.ing-mesero b { color: var(--texto-principal); }
.ing-otro { padding: 11px; border-radius: 12px; border: 1px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-weight: 700; cursor: pointer; }
.ing-otro:hover { border-color: var(--borde-activo); color: var(--texto-principal); }
</style>
