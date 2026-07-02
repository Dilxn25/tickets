<template>
  <div class="vista-recep entrada-cine">
    <!-- Encabezado de vista -->
    <header class="recep-head">
      <div class="recep-head-txt">
        <h1 class="titulo">Control de ingreso</h1>
        <p class="subtitulo">Valida entradas y controla el aforo en tiempo real</p>
      </div>
      <label v-if="eventos.length" class="selector-wrap">
        <span class="selector-lbl">Evento activo</span>
        <div class="selector-caja">
          <select v-model="idEventoSel" class="selector-evento" @change="cargarAforo">
            <option v-for="e in eventos" :key="e.id_evento" :value="e.id_evento">{{ e.nombre_evento }}</option>
          </select>
          <svg class="selector-flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </label>
    </header>

    <!-- Alertas de saturación -->
    <div v-if="zonasEnAlerta.length" class="alertas escalonar">
      <div v-for="z in zonasEnAlerta" :key="z.id_zona" class="alerta" :class="z.estado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span v-if="z.estado === 'lleno'"><b>{{ z.nombre_zona }}</b> llegó al aforo máximo ({{ z.aforo_actual }}/{{ z.capacidad }})</span>
        <span v-else><b>{{ z.nombre_zona }}</b> casi llena: {{ z.porcentaje }}% ({{ z.aforo_actual }}/{{ z.capacidad }})</span>
      </div>
    </div>

    <div class="columnas escalonar">
      <!-- Escáner -->
      <section class="panel escaner">
        <div class="panel-cab">
          <div class="panel-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="3" y1="12" x2="21" y2="12"></line></svg>
          </div>
          <div class="panel-cab-txt">
            <h2 class="panel-titulo">Escanear entrada</h2>
            <p class="panel-desc">Lee el QR o valida un código manualmente</p>
          </div>
        </div>

        <div v-if="camaraActiva" class="reader-wrap">
          <div class="reader-marco">
            <div id="reader-recep" class="reader"></div>
            <span class="reader-esquina tl"></span>
            <span class="reader-esquina tr"></span>
            <span class="reader-esquina bl"></span>
            <span class="reader-esquina br"></span>
          </div>
          <button class="btn-sec" @click="detenerCamara">Detener cámara</button>
        </div>
        <button v-else class="btn-camara" @click="iniciarCamara">
          <span class="btn-camara-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </span>
          <b>Abrir cámara y escanear QR</b>
          <span class="btn-camara-hint">Apunta al código de la entrada</span>
        </button>

        <div class="separador"><span>o ingresa el código</span></div>

        <form class="form-codigo" @submit.prevent="validarCodigo">
          <input v-model="codigoManual" type="text" class="input-codigo" placeholder="Ej: 6ADB2FF8F57C" maxlength="20" />
          <button class="btn-primario" type="submit" :disabled="procesando || !codigoManual.trim()">Validar</button>
        </form>

        <!-- Panel de ingreso por tandas (QR multi-uso) -->
        <transition name="fade">
          <div v-if="pendiente" class="tanda">
            <div class="tanda-cab">
              <b>{{ pendiente.cliente }}</b>
              <span class="tanda-zona">{{ pendiente.mesa ? 'Mesa ' + pendiente.mesa + ' · ' : '' }}{{ pendiente.zona }}</span>
            </div>
            <div class="tanda-cupos">
              <span class="tanda-dato"><i>Cupos del QR</i><b>{{ pendiente.cantidad_personas }}</b></span>
              <span class="tanda-dato"><i>Ya adentro</i><b>{{ pendiente.cantidad_ingresada }}</b></span>
              <span class="tanda-dato tanda-rest"><i>Quedan</i><b>{{ pendiente.restantes }}</b></span>
            </div>
            <div class="tanda-fila">
              <span class="tanda-lbl">¿Cuántas personas entran ahora?</span>
              <div class="stepper">
                <button type="button" @click="pendiente.cantidad = Math.max(1, pendiente.cantidad - 1)" aria-label="Menos">−</button>
                <span>{{ pendiente.cantidad }}</span>
                <button type="button" @click="pendiente.cantidad = Math.min(pendiente.restantes, pendiente.cantidad + 1)" aria-label="Más">+</button>
              </div>
            </div>
            <div class="tanda-acciones">
              <button class="btn-sec" type="button" @click="pendiente = null">Cancelar</button>
              <button class="btn-primario" type="button" :disabled="procesando" @click="confirmarIngreso">
                Registrar ingreso de {{ pendiente.cantidad }}
              </button>
            </div>
          </div>
        </transition>

        <!-- Resultado -->
        <transition name="fade">
          <div v-if="resultado" class="resultado" :class="resultado.tipo">
            <div class="res-icono">
              <svg v-if="resultado.tipo === 'ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div class="res-texto">
              <b>{{ resultado.titulo }}</b>
              <p>{{ resultado.detalle }}</p>
            </div>
          </div>
        </transition>
      </section>

      <!-- Aforo en vivo -->
      <section class="panel aforo">
        <div class="aforo-cab">
          <div class="aforo-cab-txt">
            <h2 class="panel-titulo">Aforo en vivo</h2>
            <span class="live"><span class="live-dot"></span>En vivo</span>
          </div>
          <div class="total-badge" :class="estadoTotal">
            <span class="total-num">{{ aforoTotal }}</span>
            <span class="total-cap">/ {{ capacidadTotal }}</span>
          </div>
        </div>

        <div class="barra barra-total">
          <div class="barra-relleno" :class="estadoTotal" :style="{ width: Math.min(100, capacidadTotal ? Math.round((aforoTotal / capacidadTotal) * 100) : 0) + '%' }"></div>
        </div>

        <div v-if="cargando" class="cargando"><div class="spinner"></div></div>

        <div v-else-if="!zonas.length" class="vacio">
          <svg class="vacio-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"></path></svg>
          <b>Sin zonas configuradas</b>
          <span>Este evento todavía no tiene zonas para controlar el aforo.</span>
        </div>

        <div v-else class="lista-zonas">
          <div v-for="z in zonas" :key="z.id_zona" class="zona" :class="z.estado">
            <div class="zona-cab">
              <span class="zona-nombre">{{ z.nombre_zona }}</span>
              <span class="zona-num" :class="z.estado">{{ z.aforo_actual }}<i>/{{ z.capacidad }}</i></span>
            </div>
            <div class="zona-medida">
              <div class="barra">
                <div class="barra-relleno" :class="z.estado" :style="{ width: Math.min(100, z.porcentaje) + '%' }"></div>
              </div>
              <span class="zona-pct" :class="z.estado">{{ z.porcentaje }}%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { Html5Qrcode } from 'html5-qrcode'
import { servicioAforo } from '@/servicios-api/servicio-aforo.js'

const eventos = ref([])
const idEventoSel = ref(null)
const zonas = ref([])
const aforoTotal = ref(0)
const capacidadTotal = ref(0)
const estadoTotal = ref('ok')
const cargando = ref(true)

const codigoManual = ref('')
const procesando = ref(false)
const resultado = ref(null)
const pendiente = ref(null)

const camaraActiva = ref(false)
let scanner = null
let socket = null

const zonasEnAlerta = computed(() => zonas.value.filter(z => z.estado === 'alerta' || z.estado === 'lleno'))

function aplicarAforo(data) {
  zonas.value = data.zonas || []
  aforoTotal.value = data.aforo_total || 0
  capacidadTotal.value = data.capacidad_total || 0
  estadoTotal.value = data.estado_total || 'ok'
}

async function cargarAforo() {
  if (!idEventoSel.value) return
  cargando.value = true
  try {
    const data = await servicioAforo.obtenerAforoEvento(idEventoSel.value)
    aplicarAforo(data)
  } catch (err) {
    console.error('Error cargando aforo:', err)
  } finally {
    cargando.value = false
  }
}

function mostrarResultado(tipo, titulo, detalle) {
  resultado.value = { tipo, titulo, detalle }
  setTimeout(() => { if (resultado.value && resultado.value.titulo === titulo) resultado.value = null }, 6000)
}

// Paso 1: consultar el QR/código (sin admitir) para ver cuántos cupos quedan.
async function consultarEntrada(payload) {
  procesando.value = true
  resultado.value = null
  try {
    const r = await servicioAforo.validar({ ...payload, consultar: true })
    if (r.completo) {
      mostrarResultado('error', 'Ya ingresó completa',
        `${r.cliente} · ${r.cantidad_ingresada}/${r.cantidad_personas} ya ingresaron`)
      pendiente.value = null
      return
    }
    // Deja lista la tanda de ingreso para que el recepcionista elija cuántos entran
    pendiente.value = {
      payload,
      cliente: r.cliente,
      mesa: r.mesa,
      zona: r.zona,
      evento: r.evento,
      cantidad_personas: r.cantidad_personas,
      cantidad_ingresada: r.cantidad_ingresada,
      restantes: r.restantes,
      cantidad: r.restantes, // por defecto, entran todos los que faltan
    }
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado('error', 'No válida', data?.error || 'No se pudo leer la entrada')
    pendiente.value = null
  } finally {
    procesando.value = false
  }
}

// Paso 2: confirmar el ingreso de la cantidad elegida (QR multi-uso por tandas).
async function confirmarIngreso() {
  if (!pendiente.value) return
  const { payload, cantidad } = pendiente.value
  procesando.value = true
  try {
    const r = await servicioAforo.validar({ ...payload, cantidad })
    const a = r.aforo
    mostrarResultado('ok', r.completo ? 'Ingreso completo' : 'Ingreso parcial',
      `${r.cliente} · entraron ${r.personas} (${r.cantidad_ingresada}/${r.cantidad_personas})${r.mesa ? ' · Mesa ' + r.mesa : ''} · ${a.nombre_zona} ${a.aforo_actual}/${a.capacidad}`)
    const i = zonas.value.findIndex(z => z.id_zona === a.id_zona)
    if (i >= 0) zonas.value[i] = { ...zonas.value[i], ...a }
    recomputarTotales()
    pendiente.value = null
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado('error', data?.aforo_lleno ? 'Aforo lleno' : 'No se pudo validar',
      data?.error || 'No se pudo registrar el ingreso')
  } finally {
    procesando.value = false
  }
}

function recomputarTotales() {
  aforoTotal.value = zonas.value.reduce((s, z) => s + z.aforo_actual, 0)
  capacidadTotal.value = zonas.value.reduce((s, z) => s + z.capacidad, 0)
  const pct = capacidadTotal.value > 0 ? Math.round((aforoTotal.value / capacidadTotal.value) * 100) : 0
  estadoTotal.value = pct >= 100 ? 'lleno' : (pct >= 85 ? 'alerta' : 'ok')
}

function validarCodigo() {
  const c = codigoManual.value.trim()
  if (!c) return
  consultarEntrada({ codigo: c })
  codigoManual.value = ''
}

// ---- Cámara / escáner ----
function iniciarCamara() {
  camaraActiva.value = true
  setTimeout(() => {
    scanner = new Html5Qrcode('reader-recep')
    const onDetect = (texto) => {
      // Evita reenviar el mismo QR en ráfaga
      detenerCamara()
      consultarEntrada({ token: texto })
    }
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, onDetect, () => {})
      .catch(() => {
        scanner.start({ facingMode: 'user' }, { fps: 10, qrbox: 240 }, onDetect, () => {})
          .catch(() => {
            mostrarResultado('error', 'Sin cámara', 'No se pudo acceder a la cámara. Usa el código manual.')
            camaraActiva.value = false
          })
      })
  }, 100)
}

function detenerCamara() {
  if (scanner) {
    scanner.stop().then(() => scanner.clear()).catch(() => {})
    scanner = null
  }
  camaraActiva.value = false
}

onMounted(async () => {
  try {
    eventos.value = await servicioAforo.listarEventos()
    if (eventos.value.length) {
      idEventoSel.value = eventos.value[0].id_evento
      await cargarAforo()
    } else {
      cargando.value = false
    }
  } catch (err) {
    console.error('Error cargando eventos:', err)
    cargando.value = false
  }

  socket = io()
  socket.on('aforo_actualizado', (resumen) => {
    if (resumen.id_evento !== idEventoSel.value) return
    const i = zonas.value.findIndex(z => z.id_zona === resumen.id_zona)
    if (i >= 0) zonas.value[i] = { ...zonas.value[i], ...resumen }
    recomputarTotales()
  })
})

onUnmounted(() => {
  detenerCamara()
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.vista-recep { padding: var(--esp-5); max-width: 1180px; margin: 0 auto; width: 100%; }

/* ---- Encabezado ---- */
.recep-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--esp-4); margin-bottom: var(--esp-5); flex-wrap: wrap; }
.titulo { font-family: var(--fuente-titulo); font-size: clamp(1.6rem, 3.4vw, 2rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; text-wrap: balance; color: var(--texto-principal); }
.subtitulo { font-size: 0.92rem; color: var(--texto-secundario); margin-top: 6px; }

.selector-wrap { display: flex; flex-direction: column; gap: 5px; min-width: 220px; }
.selector-lbl { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--texto-desactivado); padding-left: 2px; }
.selector-caja { position: relative; }
.selector-evento {
  width: 100%; appearance: none; -webkit-appearance: none;
  background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal);
  padding: 11px 40px 11px 15px; border-radius: var(--radio-md); font-size: 0.92rem; font-weight: 600;
  font-family: var(--fuente-principal); transition: var(--trans-rapida); cursor: pointer; outline: none;
}
.selector-evento:hover { border-color: var(--borde-activo); }
.selector-evento:focus { border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }
.selector-flecha { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); width: 17px; height: 17px; color: var(--morado-hover); pointer-events: none; }

/* ---- Alertas ---- */
.alertas { display: flex; flex-direction: column; gap: var(--esp-2); margin-bottom: var(--esp-5); }
.alerta { display: flex; align-items: center; gap: var(--esp-3); padding: var(--esp-3) var(--esp-4); border-radius: var(--radio-md); font-size: 0.86rem; }
.alerta svg { width: 20px; height: 20px; flex-shrink: 0; }
.alerta.alerta { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.35); color: var(--color-alerta); }
.alerta.lleno { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: var(--color-error); box-shadow: 0 0 22px rgba(239,68,68,0.18); }

/* ---- Rejilla principal ---- */
.columnas { display: grid; grid-template-columns: 1fr 1fr; gap: var(--esp-5); align-items: start; }
@media (max-width: 860px) { .columnas { grid-template-columns: 1fr; } }

/* ---- Panel de vidrio premium ---- */
.panel {
  position: relative; overflow: hidden;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  padding: var(--esp-5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 44px rgba(10,6,26,0.5);
}
.panel::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: linear-gradient(150deg, rgba(168,85,247,0.4), transparent 45%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; opacity: 0.75;
}
.panel::after {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(192,132,252,0.55), transparent); pointer-events: none;
}

.panel-cab { display: flex; align-items: center; gap: var(--esp-3); margin-bottom: var(--esp-5); }
.panel-icono {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: var(--radio-md);
  display: flex; align-items: center; justify-content: center; color: var(--morado-hover);
  background: rgba(168,85,247,0.14); border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}
.panel-icono svg { width: 22px; height: 22px; }
.panel-titulo { font-family: var(--fuente-titulo); font-size: 1.15rem; font-weight: 700; letter-spacing: -0.015em; color: var(--texto-principal); }
.panel-desc { font-size: 0.8rem; color: var(--texto-secundario); margin-top: 2px; }

/* ---- Escáner ---- */
.btn-camara {
  position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  min-height: 172px; padding: var(--esp-5);
  background: radial-gradient(120% 120% at 50% 0%, rgba(168,85,247,0.14), rgba(27,16,64,0.4));
  color: var(--texto-principal);
  border: 1.5px dashed var(--borde-activo); border-radius: var(--radio-lg);
  cursor: pointer; transition: transform 0.25s var(--ease-cine), box-shadow 0.25s ease, border-color 0.2s ease, background 0.3s ease;
}
.btn-camara:hover { transform: translateY(-2px); border-color: var(--morado-brillante); background: radial-gradient(120% 120% at 50% 0%, rgba(168,85,247,0.22), rgba(27,16,64,0.5)); box-shadow: var(--glow-morado); }
.btn-camara:active { transform: translateY(0) scale(0.99); }
.btn-camara:focus-visible { outline: none; box-shadow: var(--anillo-foco), var(--glow-morado); }
.btn-camara-icono {
  display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: var(--radio-full);
  background: var(--gradiente-marca); color: #fff; box-shadow: 0 8px 22px rgba(168,85,247,0.4); margin-bottom: 6px;
}
.btn-camara-icono svg { width: 26px; height: 26px; }
.btn-camara b { font-size: 0.98rem; font-weight: 700; letter-spacing: -0.01em; }
.btn-camara-hint { font-size: 0.78rem; color: var(--texto-secundario); }

.reader-wrap { display: flex; flex-direction: column; gap: var(--esp-3); }
.reader-marco { position: relative; padding: 8px; border-radius: var(--radio-lg); background: rgba(168,85,247,0.06); border: 1px solid var(--borde-sutil); }
.reader { width: 100%; border-radius: var(--radio-md); overflow: hidden; background: #000; }
.reader-esquina { position: absolute; width: 26px; height: 26px; border: 2.5px solid var(--morado-hover); pointer-events: none; z-index: 2; box-shadow: 0 0 12px rgba(168,85,247,0.5); }
.reader-esquina.tl { top: 14px; left: 14px; border-right: none; border-bottom: none; border-top-left-radius: 8px; }
.reader-esquina.tr { top: 14px; right: 14px; border-left: none; border-bottom: none; border-top-right-radius: 8px; }
.reader-esquina.bl { bottom: 14px; left: 14px; border-right: none; border-top: none; border-bottom-left-radius: 8px; }
.reader-esquina.br { bottom: 14px; right: 14px; border-left: none; border-top: none; border-bottom-right-radius: 8px; }

.btn-sec { background: rgba(168,85,247,0.08); border: 1px solid var(--borde-activo); color: var(--morado-hover); padding: var(--esp-3); border-radius: var(--radio-md); font-weight: 600; cursor: pointer; transition: var(--trans-normal); }
.btn-sec:hover { background: rgba(168,85,247,0.16); color: var(--texto-principal); }
.btn-sec:active { transform: scale(0.98); }
.btn-sec:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.separador { display: flex; align-items: center; text-align: center; color: var(--texto-desactivado); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.08em; margin: var(--esp-4) 0; }
.separador::before, .separador::after { content: ''; flex: 1; height: 1px; background: var(--borde-sutil); }
.separador span { padding: 0 12px; }

.form-codigo { display: flex; gap: var(--esp-2); }
.input-codigo { flex: 1; min-width: 0; background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 12px 15px; border-radius: var(--radio-md); font-size: 0.95rem; font-variant-numeric: tabular-nums; letter-spacing: 1px; text-transform: uppercase; transition: var(--trans-rapida); outline: none; }
.input-codigo::placeholder { color: var(--texto-desactivado); letter-spacing: 0.5px; }
.input-codigo:hover { border-color: var(--borde-activo); }
.input-codigo:focus { border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }
.btn-primario { background: var(--gradiente-marca); color: #fff; border: none; padding: 12px 22px; border-radius: var(--radio-md); font-weight: 700; cursor: pointer; white-space: nowrap; transition: var(--trans-normal); box-shadow: 0 6px 18px rgba(168,85,247,0.3); }
.btn-primario:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236,72,153,0.45); }
.btn-primario:active:not(:disabled) { transform: translateY(0) scale(0.99); box-shadow: 0 4px 12px rgba(168,85,247,0.3); }
.btn-primario:focus-visible { outline: none; box-shadow: 0 6px 18px rgba(168,85,247,0.3), var(--anillo-foco); }
.btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---- Panel de ingreso por tandas (QR multi-uso) ---- */
.tanda { margin-top: var(--esp-4); padding: var(--esp-4); border-radius: var(--radio-lg); background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-activo); box-shadow: 0 0 26px rgba(168,85,247,0.16), inset 0 1px 0 rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: var(--esp-3); }
.tanda-cab { display: flex; flex-direction: column; gap: 2px; }
.tanda-cab b { font-size: 1.08rem; font-weight: 700; letter-spacing: -0.01em; color: var(--texto-principal); }
.tanda-zona { font-size: 0.82rem; color: var(--texto-secundario); }
.tanda-cupos { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--esp-2); }
.tanda-dato { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: var(--radio-md); background: rgba(14,8,33,0.5); border: 1px solid var(--borde-sutil); }
.tanda-dato i { font-style: normal; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-desactivado); }
.tanda-dato b { font-family: var(--fuente-titulo); font-size: 1.3rem; font-weight: 800; line-height: 1; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.tanda-rest { border-color: var(--borde-activo); }
.tanda-rest b { color: var(--morado-hover); }
.tanda-fila { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); flex-wrap: wrap; padding-top: var(--esp-3); border-top: 1px solid var(--borde-sutil); }
.tanda-lbl { font-size: 0.86rem; color: var(--texto-principal); font-weight: 600; }
.stepper { display: flex; align-items: center; gap: 14px; }
.stepper button { width: 38px; height: 38px; border-radius: var(--radio-md); background: var(--fondo-app); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-size: 1.25rem; font-weight: 700; line-height: 1; cursor: pointer; transition: var(--trans-rapida); }
.stepper button:hover { border-color: var(--borde-activo); background: rgba(168,85,247,0.14); color: var(--morado-hover); }
.stepper button:active { transform: scale(0.92); }
.stepper button:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.stepper span { min-width: 26px; text-align: center; font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; color: var(--texto-principal); }
.tanda-acciones { display: flex; gap: var(--esp-3); }
.tanda-acciones .btn-primario, .tanda-acciones .btn-sec { flex: 1; }

/* ---- Resultado ---- */
.resultado { display: flex; align-items: center; gap: var(--esp-3); margin-top: var(--esp-4); padding: var(--esp-3) var(--esp-4); border-radius: var(--radio-md); animation: aparecerEscala 0.3s var(--ease-rebote) both; }
.resultado.ok { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.35); }
.resultado.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.35); }
.res-icono { width: 42px; height: 42px; border-radius: var(--radio-full); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.resultado.ok .res-icono { background: rgba(34,197,94,0.2); color: var(--color-exito); box-shadow: 0 0 18px rgba(34,197,94,0.25); }
.resultado.error .res-icono { background: rgba(239,68,68,0.2); color: var(--color-error); box-shadow: 0 0 18px rgba(239,68,68,0.22); }
.res-icono svg { width: 22px; height: 22px; }
.res-texto b { color: var(--texto-principal); font-size: 0.95rem; }
.res-texto p { color: var(--texto-secundario); font-size: 0.82rem; margin-top: 2px; font-variant-numeric: tabular-nums; }

/* ---- Aforo ---- */
.aforo-cab { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); margin-bottom: var(--esp-4); }
.aforo-cab-txt { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.live { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--morado-hover); }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-exito); box-shadow: 0 0 0 rgba(34,197,94,0.5); animation: latir 1.8s ease-in-out infinite; }
@keyframes latir { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); } 50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); } }

.total-badge { display: inline-flex; align-items: baseline; gap: 4px; font-family: var(--fuente-titulo); font-variant-numeric: tabular-nums; padding: 8px 16px; border-radius: var(--radio-full); transition: var(--trans-normal); }
.total-num { font-size: 1.5rem; font-weight: 800; line-height: 1; letter-spacing: -0.02em; }
.total-cap { font-size: 0.95rem; font-weight: 600; opacity: 0.75; }
.total-badge.ok { background: rgba(168,85,247,0.18); color: var(--morado-hover); }
.total-badge.alerta { background: rgba(245,158,11,0.15); color: var(--color-alerta); }
.total-badge.lleno { background: rgba(239,68,68,0.15); color: var(--color-error); box-shadow: 0 0 20px rgba(239,68,68,0.2); }

.barra-total { height: 12px; margin-bottom: var(--esp-5); }

.cargando { display: flex; justify-content: center; padding: 2.5rem; }
.spinner { width: 34px; height: 34px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: var(--radio-full); animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.vacio { display: flex; flex-direction: column; align-items: center; gap: var(--esp-2); color: var(--texto-secundario); font-size: 0.85rem; text-align: center; padding: var(--esp-6) var(--esp-4); }
.vacio-icono { width: 42px; height: 42px; color: var(--morado-brillante); opacity: 0.65; margin-bottom: var(--esp-1); }
.vacio b { color: var(--texto-principal); font-size: 0.95rem; font-weight: 700; }
.vacio span { max-width: 34ch; text-wrap: balance; }

.lista-zonas { display: flex; flex-direction: column; gap: var(--esp-2); }
.zona { padding: 12px 14px; border-radius: var(--radio-md); border: 1px solid transparent; transition: background 0.2s ease, border-color 0.2s ease; }
.zona:hover { background: rgba(168,85,247,0.07); border-color: var(--borde-sutil); }
.zona.alerta { background: rgba(245,158,11,0.05); }
.zona.lleno { background: rgba(239,68,68,0.06); }
.zona-cab { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-2); margin-bottom: 8px; }
.zona-nombre { font-size: 0.92rem; font-weight: 600; color: var(--texto-principal); }
.zona-num { font-family: var(--fuente-titulo); font-size: 1.05rem; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.zona-num i { font-style: normal; font-size: 0.8rem; font-weight: 600; opacity: 0.6; }
.zona-num.ok { color: var(--morado-hover); }
.zona-num.alerta { color: var(--color-alerta); }
.zona-num.lleno { color: var(--color-error); }
.zona-medida { display: flex; align-items: center; gap: var(--esp-3); }
.barra { flex: 1; height: 10px; background: var(--fondo-app); border: 1px solid var(--borde-sutil); border-radius: var(--radio-full); overflow: hidden; }
.barra-relleno { height: 100%; border-radius: var(--radio-full); transition: width 0.5s var(--ease-suave); }
.barra-relleno.ok { background: var(--gradiente-marca); box-shadow: 0 0 12px rgba(168,85,247,0.4); }
.barra-relleno.alerta { background: linear-gradient(90deg, var(--color-alerta), #f59e0b); box-shadow: 0 0 12px rgba(245,158,11,0.35); }
.barra-relleno.lleno { background: linear-gradient(90deg, var(--color-error), #dc2626); box-shadow: 0 0 12px rgba(239,68,68,0.4); }
.zona-pct { flex-shrink: 0; min-width: 38px; text-align: right; font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); font-variant-numeric: tabular-nums; }
.zona-pct.ok { color: var(--morado-hover); }
.zona-pct.alerta { color: var(--color-alerta); }
.zona-pct.lleno { color: var(--color-error); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s var(--ease-suave); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 520px) {
  .panel { padding: var(--esp-4); }
  .selector-wrap { width: 100%; min-width: 0; }
  .tanda-cupos { grid-template-columns: 1fr; }
  .tanda-dato { flex-direction: row; align-items: center; justify-content: space-between; }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot, .resultado { animation: none; }
  .btn-camara:hover, .btn-primario:hover:not(:disabled), .btn-camara:active, .btn-primario:active:not(:disabled), .stepper button:active { transform: none; }
  .barra-relleno { transition: none; }
}
</style>
