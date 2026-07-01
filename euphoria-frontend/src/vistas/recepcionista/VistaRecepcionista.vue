<template>
  <div class="vista-recep">
    <div class="encabezado">
      <div>
        <h1 class="titulo">Control de Ingreso</h1>
        <p class="subtitulo">Valida entradas y controla el aforo en vivo</p>
      </div>
      <select v-if="eventos.length" v-model="idEventoSel" class="selector-evento" @change="cargarAforo">
        <option v-for="e in eventos" :key="e.id_evento" :value="e.id_evento">{{ e.nombre_evento }}</option>
      </select>
    </div>

    <!-- Alertas de saturación -->
    <div v-if="zonasEnAlerta.length" class="alertas">
      <div v-for="z in zonasEnAlerta" :key="z.id_zona" class="alerta" :class="z.estado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span v-if="z.estado === 'lleno'"><b>{{ z.nombre_zona }}</b> llegó al aforo máximo ({{ z.aforo_actual }}/{{ z.capacidad }})</span>
        <span v-else><b>{{ z.nombre_zona }}</b> casi llena: {{ z.porcentaje }}% ({{ z.aforo_actual }}/{{ z.capacidad }})</span>
      </div>
    </div>

    <div class="columnas">
      <!-- Escáner -->
      <section class="tarjeta escaner">
        <h2 class="tarjeta-titulo">Escanear entrada</h2>

        <div v-if="camaraActiva" class="reader-wrap">
          <div id="reader-recep" class="reader"></div>
          <button class="btn-sec" @click="detenerCamara">Detener cámara</button>
        </div>
        <button v-else class="btn-camara" @click="iniciarCamara">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          Abrir cámara y escanear QR
        </button>

        <div class="separador"><span>o ingresa el código</span></div>

        <form class="form-codigo" @submit.prevent="validarCodigo">
          <input v-model="codigoManual" type="text" class="input-codigo" placeholder="Ej: 6ADB2FF8F57C" maxlength="20" />
          <button class="btn-primario" type="submit" :disabled="procesando || !codigoManual.trim()">Validar</button>
        </form>

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
      <section class="tarjeta aforo">
        <div class="aforo-cab">
          <h2 class="tarjeta-titulo">Aforo en vivo</h2>
          <div class="total-badge" :class="estadoTotal">
            {{ aforoTotal }}/{{ capacidadTotal }}
          </div>
        </div>

        <div v-if="cargando" class="cargando"><div class="spinner"></div></div>

        <div v-else-if="!zonas.length" class="vacio">Este evento no tiene zonas configuradas.</div>

        <div v-else class="lista-zonas">
          <div v-for="z in zonas" :key="z.id_zona" class="zona">
            <div class="zona-cab">
              <span class="zona-nombre">{{ z.nombre_zona }}</span>
              <span class="zona-num" :class="z.estado">{{ z.aforo_actual }}/{{ z.capacidad }}</span>
            </div>
            <div class="barra">
              <div class="barra-relleno" :class="z.estado" :style="{ width: Math.min(100, z.porcentaje) + '%' }"></div>
            </div>
            <span class="zona-pct" :class="z.estado">{{ z.porcentaje }}%</span>
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

async function enviarValidacion(payload) {
  procesando.value = true
  try {
    const r = await servicioAforo.validar(payload)
    const a = r.aforo
    mostrarResultado('ok', 'Ingreso validado',
      `${r.cliente} · ${r.personas} persona(s)${r.mesa ? ' · Mesa ' + r.mesa : ''} · ${a.nombre_zona} ${a.aforo_actual}/${a.capacidad}`)
    // Actualiza la zona localmente (el socket también lo hará para otros)
    const i = zonas.value.findIndex(z => z.id_zona === a.id_zona)
    if (i >= 0) zonas.value[i] = { ...zonas.value[i], ...a }
    recomputarTotales()
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado('error', data?.aforo_lleno ? 'Aforo lleno' : (data?.ya_ingreso ? 'Ya ingresó' : 'No válida'),
      data?.error || 'No se pudo validar la entrada')
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
  enviarValidacion({ codigo: c })
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
      enviarValidacion({ token: texto })
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
.vista-recep { padding: 1.5rem; max-width: 1100px; margin: 0 auto; width: 100%; }

.encabezado { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
.titulo { font-size: 1.6rem; font-weight: 800; color: var(--texto-principal); }
.subtitulo { font-size: 0.88rem; color: var(--texto-secundario); }
.selector-evento {
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-principal);
  padding: 10px 14px; border-radius: 12px; font-size: 0.9rem; font-weight: 600; min-width: 200px;
}

/* Alertas */
.alertas { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.2rem; }
.alerta { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; font-size: 0.85rem; }
.alerta svg { width: 20px; height: 20px; flex-shrink: 0; }
.alerta.alerta { background: rgba(234,179,8,0.12); border: 1px solid rgba(234,179,8,0.35); color: #eab308; }
.alerta.lleno { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: #ef4444; }

.columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
@media (max-width: 860px) { .columnas { grid-template-columns: 1fr; } }

.tarjeta { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 18px; padding: 1.3rem; }
.tarjeta-titulo { font-size: 1.05rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 1rem; }

/* Escáner */
.btn-camara {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); color: #fff;
  border: none; padding: 14px; border-radius: 14px; font-size: 0.95rem; font-weight: 700;
  box-shadow: 0 4px 15px rgba(219,39,119,0.3); cursor: pointer;
}
.btn-camara svg { width: 22px; height: 22px; }
.reader-wrap { display: flex; flex-direction: column; gap: 10px; }
.reader { width: 100%; border-radius: 14px; overflow: hidden; background: #000; }
.btn-sec { background: var(--fondo-app); border: 1px solid var(--borde-sutil); color: var(--texto-secundario); padding: 10px; border-radius: 12px; font-weight: 600; cursor: pointer; }

.separador { display: flex; align-items: center; text-align: center; color: var(--texto-secundario); font-size: 0.78rem; margin: 1rem 0; }
.separador::before, .separador::after { content: ''; flex: 1; height: 1px; background: var(--borde-sutil); }
.separador span { padding: 0 12px; }

.form-codigo { display: flex; gap: 8px; }
.input-codigo { flex: 1; background: var(--fondo-app); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 11px 14px; border-radius: 12px; font-size: 0.95rem; letter-spacing: 1px; text-transform: uppercase; }
.btn-primario { background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); color: #fff; border: none; padding: 11px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; }
.btn-primario:disabled { opacity: 0.6; }

/* Resultado */
.resultado { display: flex; align-items: center; gap: 12px; margin-top: 1rem; padding: 12px 14px; border-radius: 14px; }
.resultado.ok { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.35); }
.resultado.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.35); }
.res-icono { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.resultado.ok .res-icono { background: rgba(34,197,94,0.2); color: #22c55e; }
.resultado.error .res-icono { background: rgba(239,68,68,0.2); color: #ef4444; }
.res-icono svg { width: 22px; height: 22px; }
.res-texto b { color: var(--texto-principal); font-size: 0.95rem; }
.res-texto p { color: var(--texto-secundario); font-size: 0.82rem; margin-top: 2px; }

/* Aforo */
.aforo-cab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.total-badge { font-size: 1rem; font-weight: 800; padding: 6px 14px; border-radius: 999px; }
.total-badge.ok { background: rgba(155,89,182,0.18); color: var(--morado-brillante); }
.total-badge.alerta { background: rgba(234,179,8,0.15); color: #eab308; }
.total-badge.lleno { background: rgba(239,68,68,0.15); color: #ef4444; }

.cargando { display: flex; justify-content: center; padding: 2rem; }
.spinner { width: 34px; height: 34px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.vacio { color: var(--texto-secundario); font-size: 0.85rem; text-align: center; padding: 1.5rem; }

.lista-zonas { display: flex; flex-direction: column; gap: 1rem; }
.zona-cab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.zona-nombre { font-size: 0.9rem; font-weight: 600; color: var(--texto-principal); }
.zona-num { font-size: 0.85rem; font-weight: 700; }
.zona-num.ok { color: var(--morado-brillante); }
.zona-num.alerta { color: #eab308; }
.zona-num.lleno { color: #ef4444; }
.barra { height: 10px; background: var(--fondo-app); border-radius: 999px; overflow: hidden; }
.barra-relleno { height: 100%; border-radius: 999px; transition: width 0.4s ease; }
.barra-relleno.ok { background: linear-gradient(90deg, var(--morado-brillante), var(--rosa-acento)); }
.barra-relleno.alerta { background: linear-gradient(90deg, #eab308, #f59e0b); }
.barra-relleno.lleno { background: linear-gradient(90deg, #ef4444, #dc2626); }
.zona-pct { font-size: 0.72rem; color: var(--texto-secundario); display: block; text-align: right; margin-top: 2px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
