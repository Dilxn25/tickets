<template>
  <div class="vista-mis-reservas entrada-cine">
    <div class="mr-interior">
      <header class="hero">
        <button class="btn-volver" @click="volver" aria-label="Volver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="hero-texto">
          <h1 class="hero-titulo">Mis reservas</h1>
          <p class="hero-sub">Tus pases y el registro de tus ingresos.</p>
        </div>
      </header>

      <!-- Cargando -->
      <div v-if="cargando" class="lista" aria-busy="true">
        <div v-for="n in 3" :key="n" class="ticket esqueleto">
          <div class="ticket-cuerpo">
            <span class="sk sk-chip"></span>
            <span class="sk sk-titulo"></span>
            <span class="sk sk-linea"></span>
            <span class="sk sk-linea corta"></span>
          </div>
          <div class="ticket-perf" aria-hidden="true"></div>
          <div class="ticket-talon"><span class="sk sk-qr"></span></div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="estado-msg">
        <div class="icono-estado error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16.5" x2="12" y2="16.5"></line></svg>
        </div>
        <div class="estado-texto">
          <h2 class="estado-titulo">No pudimos cargar tus reservas</h2>
          <p class="estado-detalle">Revisa tu conexión e inténtalo de nuevo.</p>
        </div>
        <button class="cta-isla brillo-hover" @click="cargar">Reintentar</button>
      </div>

      <!-- Vacío total -->
      <div v-else-if="!reservas.length" class="estado-msg">
        <div class="icono-estado">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <div class="estado-texto">
          <h2 class="estado-titulo">Todavía no tienes reservas</h2>
          <p class="estado-detalle">Reserva tu mesa para el próximo evento y aparecerá aquí con su QR de acceso.</p>
        </div>
        <RouterLink to="/cliente/eventos" class="cta-isla link brillo-hover">Ver eventos</RouterLink>
      </div>

      <!-- Contenido -->
      <template v-else>
        <!-- Buscador -->
        <div class="buscador">
          <svg class="buscador-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
          <input v-model="busqueda" type="text" class="buscador-input" placeholder="Buscar por evento…" aria-label="Buscar reserva" />
          <button v-if="busqueda" class="buscador-limpiar" @click="busqueda = ''" aria-label="Limpiar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Pestañas -->
        <div class="tabs" role="tablist">
          <button
            v-for="t in tabs" :key="t.clave"
            class="tab" :class="{ activo: tabActiva === t.clave }"
            role="tab" :aria-selected="tabActiva === t.clave"
            @click="tabActiva = t.clave">
            {{ t.label }}
            <span v-if="conteos[t.clave]" class="tab-num">{{ conteos[t.clave] }}</span>
          </button>
        </div>

        <!-- Lista filtrada -->
        <div v-if="visibles.length" class="lista escalonar">
          <article
            v-for="r in visibles" :key="r.id_entrada"
            class="ticket anim-subir" :class="[`estado-${estadoTicket(r).clave}`, { 'ticket-zona': colorReserva(r) }]"
            :style="colorReserva(r) ? { '--zona-color': colorReserva(r) } : {}">
            <span class="ticket-borde" aria-hidden="true"></span>

            <div class="ticket-cuerpo">
              <div class="ticket-encabezado">
                <span class="estado" :class="estadoTicket(r).clase">
                  <span class="estado-punto" aria-hidden="true"></span>
                  {{ estadoTicket(r).label }}
                </span>
                <span class="chip-fecha" :class="textoFecha(r).clase">{{ textoFecha(r).label }}</span>
              </div>

              <h3 class="evento">{{ r.evento || 'Evento' }}</h3>
              <p v-if="r.fecha_evento" class="fecha">{{ formatoFechaLarga(r.fecha_evento) }}</p>

              <dl class="ticket-datos">
                <div class="dato">
                  <dt>{{ r.tipo_elemento === 'silla' ? 'Silla' : 'Mesa' }}</dt>
                  <dd>{{ r.mesa || '—' }}<em v-if="r.zona"> · <span v-if="colorReserva(r)" class="zona-punto-r" :style="{ background: colorReserva(r) }"></span>{{ r.zona }}</em></dd>
                </div>
                <div class="dato">
                  <dt>Personas</dt>
                  <dd>{{ r.cantidad_personas }}</dd>
                </div>
                <div v-if="r.monto_pagado != null" class="dato dato-pago">
                  <dt>Pagado</dt>
                  <dd><span class="moneda">Bs</span>{{ Number(r.monto_pagado).toFixed(2) }}</dd>
                </div>
              </dl>

              <!-- Progreso de ingreso para grupos (mesa de N) -->
              <div v-if="r.cantidad_personas > 1" class="progreso">
                <div class="progreso-cab">
                  <span>Ingresaron</span>
                  <strong>{{ r.cantidad_ingresada }} / {{ r.cantidad_personas }}</strong>
                </div>
                <div class="progreso-barra">
                  <span class="progreso-relleno" :style="{ width: pct(r) + '%' }"></span>
                </div>
                <p v-if="r.cantidad_ingresada > 0 && !r.completo" class="progreso-nota">
                  Quedan {{ r.cantidad_personas - r.cantidad_ingresada }} cupo(s) por usar en este QR.
                </p>
              </div>

              <p class="codigo">Código de ingreso<b>{{ r.codigo_ingreso }}</b></p>

              <!-- Historial de ingresos (colapsable) -->
              <button v-if="r.ingresos && r.ingresos.length" class="btn-historial" @click="alternarHistorial(r.id_entrada)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ girar: historialAbierto === r.id_entrada }"><polyline points="6 9 12 15 18 9"></polyline></svg>
                Historial de ingresos ({{ r.ingresos.length }})
              </button>
              <Transition name="expandir">
                <ul v-if="historialAbierto === r.id_entrada" class="timeline">
                  <li v-for="(mov, i) in r.ingresos" :key="i" class="tl-item" :class="mov.tipo">
                    <span class="tl-punto" aria-hidden="true"></span>
                    <span class="tl-texto">
                      <b>{{ mov.tipo === 'salida' ? 'Salida' : 'Ingreso' }} de {{ mov.cantidad }} {{ mov.cantidad === 1 ? 'persona' : 'personas' }}</b>
                      <em>{{ formatoFechaHora(mov.fecha_hora) }}</em>
                    </span>
                  </li>
                </ul>
              </Transition>
            </div>

            <div class="ticket-perf" aria-hidden="true"></div>

            <!-- Talón: QR si aún se puede usar; si no, sello de estado -->
            <div class="ticket-talon">
              <template v-if="r.qr">
                <button class="qr-marco" type="button" title="Ampliar QR" @click="ampliarQR(r)">
                  <img :src="r.qr" alt="Código QR de acceso" />
                </button>
                <span class="qr-pie">Toca para ampliar</span>
                <button v-if="!r.cantidad_ingresada" class="btn-cancelar-reserva" @click="cancelarReserva(r)" :disabled="cancelando === r.id_entrada">
                  {{ cancelando === r.id_entrada ? 'Cancelando…' : 'Cancelar reserva' }}
                </button>
              </template>
              <div v-else class="sello" :class="estadoTicket(r).clave">
                <svg v-if="r.completo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{{ r.completo ? 'Ingreso\ncompleto' : 'Evento\nfinalizado' }}</span>
              </div>
            </div>
          </article>
        </div>

        <!-- Vacío por filtro -->
        <div v-else class="vacio-filtro">
          <p v-if="busqueda">Ningún pase coincide con «{{ busqueda }}».</p>
          <p v-else>No tienes pases en «{{ tabs.find(t => t.clave === tabActiva)?.label }}».</p>
        </div>
      </template>
    </div>

    <!-- QR a pantalla completa: fondo blanco y brillo alto para el escáner -->
    <Teleport to="body">
      <div v-if="qrAmpliado" class="qr-fullscreen" @click="qrAmpliado = null">
        <p class="qr-fs-evento">{{ qrAmpliado.evento || 'Evento' }}</p>
        <img :src="qrAmpliado.qr" alt="Código QR de acceso ampliado" class="qr-fs-img" />
        <p class="qr-fs-codigo">{{ qrAmpliado.codigo_ingreso }}</p>
        <p class="qr-fs-hint">Muestra la pantalla en la puerta · Toca para cerrar</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { servicioReservas } from '@/servicios-api/servicio-reservas.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import { useTiempoReal } from '@/composables/useTiempoReal'
import { mapaColorPorPrecio, colorPorPrecio } from '@/utilidades/colores-zona.js'

const notif = useNotificaciones()
const router = useRouter()
const reservas = ref([])
// Color por zona (según lo pagado): la reserva más cara = dorado (VIP).
const mapaColores = computed(() => mapaColorPorPrecio(reservas.value.map(r => r.monto_pagado)))
function colorReserva(r) { return colorPorPrecio(r.monto_pagado, mapaColores.value) }
const cargando = ref(true)
const error = ref(false)
const qrAmpliado = ref(null)
const busqueda = ref('')
const tabActiva = ref('vigentes')
const historialAbierto = ref(null)
const cancelando = ref(null)

async function cancelarReserva(r) {
  const ok = await notif.confirmar({
    titulo: 'Cancelar reserva',
    mensaje: 'Se te devolverá a tu billetera: el TOTAL si faltan más de 24 h para el evento, o con la comisión del local si es dentro de las 24 h. ¿Confirmas?',
    textoConfirmar: 'Sí, cancelar',
  })
  if (!ok) return
  cancelando.value = r.id_entrada
  try {
    const res = await servicioReservas.cancelarReserva(r.id_entrada)
    notif.exito(Number(res.reembolsado) > 0 ? `Reserva cancelada. Bs ${Number(res.reembolsado).toFixed(2)} a tu billetera${res.sin_comision ? ' (sin comisión)' : ''}` : 'Reserva cancelada')
    await cargar()
  } catch (err) {
    const data = err?.response?.data || err
    notif.error(data?.error || 'No se pudo cancelar la reserva')
  } finally { cancelando.value = null }
}

const tabs = [
  { clave: 'vigentes', label: 'Vigentes' },
  { clave: 'usadas', label: 'Usadas' },
  { clave: 'finalizadas', label: 'Finalizadas' },
]

// A qué grupo pertenece una reserva
function grupoDe(r) {
  if (r.completo) return 'usadas'
  if (r.estado_fecha === 'finalizada') return 'finalizadas'
  return 'vigentes'
}

const conteos = computed(() => {
  const c = { vigentes: 0, usadas: 0, finalizadas: 0 }
  for (const r of reservas.value) c[grupoDe(r)]++
  return c
})

// Lista filtrada por pestaña + búsqueda
const visibles = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return reservas.value.filter(r => {
    if (grupoDe(r) !== tabActiva.value) return false
    if (q && !(r.evento || '').toLowerCase().includes(q)) return false
    return true
  })
})

// Estado visible del ticket
function estadoTicket(r) {
  if (r.completo) return { clave: 'usada', label: 'Ingresado', clase: 'ok' }
  if (r.estado_fecha === 'finalizada') return { clave: 'finalizada', label: 'Finalizada', clase: 'muted' }
  if (r.cantidad_ingresada > 0) return { clave: 'parcial', label: `Adentro ${r.cantidad_ingresada}/${r.cantidad_personas}`, clase: 'parcial' }
  if (r.estado_fecha === 'proxima') return { clave: 'proxima', label: 'Próxima', clase: 'pend' }
  return { clave: 'vigente', label: 'Válida hoy', clase: 'live' }
}

// Chip de fecha relativa (Hoy / Faltan X días / Finalizado)
function textoFecha(r) {
  if (!r.fecha_evento) return { label: '', clase: '' }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const dia = new Date(r.fecha_evento); dia.setHours(0, 0, 0, 0)
  const dias = Math.round((dia - hoy) / 86400000)
  if (r.estado_fecha === 'finalizada') return { label: 'Finalizado', clase: 'muted' }
  if (dias < 0) return { label: 'Finalizado', clase: 'muted' }
  if (dias === 0) return { label: 'Hoy', clase: 'hoy' }
  if (dias === 1) return { label: 'Mañana', clase: 'pronto' }
  return { label: `Faltan ${dias} días`, clase: 'pronto' }
}

function pct(r) {
  if (!r.cantidad_personas) return 0
  return Math.min(100, Math.round((r.cantidad_ingresada / r.cantidad_personas) * 100))
}

function alternarHistorial(id) {
  historialAbierto.value = historialAbierto.value === id ? null : id
}

function ampliarQR(reserva) {
  if (!reserva?.qr) return
  qrAmpliado.value = reserva
}

function volver() { router.back() }

function formatoFechaLarga(f) {
  if (!f) return ''
  return new Date(f).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
}
function formatoFechaHora(f) {
  if (!f) return ''
  return new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function cargar() {
  cargando.value = true
  error.value = false
  try {
    reservas.value = await servicioReservas.misReservas()
    // Si la pestaña por defecto está vacía, saltar a la primera con contenido
    if (!conteos.value[tabActiva.value]) {
      const primera = tabs.find(t => conteos.value[t.clave])
      if (primera) tabActiva.value = primera.clave
    }
  } catch (err) {
    console.error('Error cargando mis reservas:', err)
    error.value = true
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
// Tiempo real: cambios en reservas/eventos actualizan la lista sola.
useTiempoReal(['reservas', 'eventos'], () => cargar())
</script>

<style scoped>
.vista-mis-reservas {
  position: relative;
  width: 100%;
  padding-bottom: 104px;
  box-sizing: border-box;
}
/* Contenido centrado, sin orbes ni recuadros: fondo único de la app */
.mr-interior {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: var(--esp-6) var(--esp-4) 0;
  box-sizing: border-box;
}

/* ---------- Hero ---------- */
.hero { display: flex; align-items: center; gap: var(--esp-4); margin-bottom: var(--esp-5); }
.hero-texto { min-width: 0; }
.hero-titulo {
  margin: 0; font-family: var(--fuente-titulo);
  font-size: clamp(1.5rem, 5vw, 1.85rem); font-weight: 800;
  letter-spacing: -0.025em; line-height: 1.08; color: var(--texto-principal);
}
.hero-sub { margin-top: 4px; font-size: 0.88rem; line-height: 1.4; color: var(--texto-secundario); }
.btn-volver {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: var(--radio-md); flex-shrink: 0;
  background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil);
  color: var(--texto-principal); cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}
.btn-volver:hover { border-color: var(--borde-activo); background: var(--fondo-tarjeta); transform: translateX(-2px); }
.btn-volver:active { transform: translateX(-2px) scale(0.94); }
.btn-volver:focus-visible { outline: 2px solid var(--morado-hover); outline-offset: 2px; }
.btn-volver svg { width: 20px; height: 20px; }

/* ---------- Buscador ---------- */
.buscador {
  display: flex; align-items: center; gap: 10px;
  padding: 0 14px; margin-bottom: var(--esp-4);
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-full);
}
.buscador:focus-within { border-color: var(--morado-brillante); box-shadow: 0 0 0 3px rgba(168,85,247,0.16); }
.buscador-icono { width: 18px; height: 18px; color: var(--texto-desactivado); flex-shrink: 0; }
.buscador-input {
  flex: 1; min-width: 0; background: none; border: none; outline: none;
  padding: 12px 0; color: var(--texto-principal); font-size: 0.92rem; font-family: var(--fuente-principal);
}
.buscador-input::placeholder { color: var(--texto-desactivado); }
.buscador-limpiar { background: none; border: none; color: var(--texto-desactivado); cursor: pointer; padding: 4px; display: flex; }
.buscador-limpiar svg { width: 16px; height: 16px; }
.buscador-limpiar:hover { color: var(--texto-principal); }

/* ---------- Pestañas ---------- */
.tabs {
  display: flex; gap: 8px; margin-bottom: var(--esp-5);
  overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none;
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
  display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
  padding: 9px 16px; border-radius: var(--radio-full);
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario); font-size: 0.84rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s ease;
}
.tab:hover { border-color: var(--borde-activo); color: var(--texto-principal); }
.tab.activo { background: var(--gradiente-marca); border-color: transparent; color: #fff; box-shadow: 0 6px 18px rgba(168,85,247,0.35); }
.tab-num {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: var(--radio-full);
  background: rgba(0,0,0,0.22); font-size: 0.68rem; font-weight: 800;
}
.tab:not(.activo) .tab-num { background: var(--fondo-tarjeta-alt); color: var(--texto-desactivado); }

/* ---------- Estados vacío / error ---------- */
.estado-msg {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--esp-4); padding: var(--esp-7) var(--esp-5); text-align: center;
}
.icono-estado {
  display: inline-flex; align-items: center; justify-content: center;
  width: 80px; height: 80px; border-radius: var(--radio-full); color: var(--morado-hover);
  background: radial-gradient(circle at 50% 38%, rgba(168,85,247,0.26), rgba(168,85,247,0.04));
  border: 1px solid var(--borde-sutil); box-shadow: inset 0 0 22px rgba(168,85,247,0.14);
}
.icono-estado svg { width: 34px; height: 34px; }
.icono-estado.error { color: #FCA5A5; background: radial-gradient(circle at 50% 38%, rgba(239,68,68,0.22), rgba(239,68,68,0.04)); border-color: rgba(239,68,68,0.3); }
.estado-titulo { font-family: var(--fuente-titulo); font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); }
.estado-detalle { font-size: 0.9rem; line-height: 1.6; color: var(--texto-secundario); max-width: 40ch; }
.cta-isla.link { text-decoration: none; }
.vacio-filtro { padding: var(--esp-6); text-align: center; color: var(--texto-desactivado); font-size: 0.92rem; }

/* ---------- Lista ---------- */
.lista { display: flex; flex-direction: column; gap: var(--esp-4); }

/* ---------- Ticket ---------- */
.ticket {
  position: relative;
  display: grid; grid-template-columns: 1fr auto minmax(148px, 200px);
  align-items: stretch;
  border-radius: var(--radio-xl);
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  box-shadow: 0 14px 34px rgba(10, 6, 26, 0.4);
  overflow: hidden;
  transition: border-color 0.25s ease, opacity 0.25s ease;
}
.ticket:hover { border-color: var(--borde-activo); }
/* Acento de zona (color por nivel): franja lateral izquierda + halo sutil */
.ticket-zona {
  border-left: 4px solid var(--zona-color);
  box-shadow: 0 14px 34px rgba(10, 6, 26, 0.4), inset 14px 0 24px -18px var(--zona-color);
}
.zona-punto-r {
  display: inline-block; width: 9px; height: 9px; border-radius: 50%;
  background: var(--zona-color); margin: 0 4px -1px 0;
  box-shadow: 0 0 6px currentColor;
}
.ticket-borde { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--gradiente-marca); opacity: 0.9; }
/* Estados apagados */
.ticket.estado-usada, .ticket.estado-finalizada { opacity: 0.72; }
.ticket.estado-finalizada .ticket-borde { background: var(--texto-desactivado); opacity: 0.5; }
.ticket.estado-usada .ticket-borde { background: var(--color-exito); opacity: 0.7; }

.ticket-cuerpo { min-width: 0; padding: var(--esp-5); display: flex; flex-direction: column; }
.ticket-encabezado { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); margin-bottom: var(--esp-3); }

.estado {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  font-size: 0.64rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 5px 11px 5px 9px; border-radius: var(--radio-full);
}
.estado-punto { width: 6px; height: 6px; border-radius: var(--radio-full); background: currentColor; box-shadow: 0 0 8px currentColor; }
.estado.live { background: rgba(34,197,94,0.15); color: var(--color-exito); border: 1px solid rgba(34,197,94,0.3); }
.estado.live .estado-punto { animation: latido 1.6s ease-in-out infinite; }
.estado.pend { background: rgba(168,85,247,0.16); color: var(--morado-hover); border: 1px solid var(--borde-sutil); }
.estado.parcial { background: rgba(255,209,102,0.14); color: var(--color-alerta); border: 1px solid rgba(255,209,102,0.3); }
.estado.parcial .estado-punto { animation: latido 1.6s ease-in-out infinite; }
.estado.ok { background: rgba(34,197,94,0.14); color: var(--color-exito); border: 1px solid rgba(34,197,94,0.28); }
.estado.muted { background: var(--fondo-tarjeta-alt); color: var(--texto-desactivado); border: 1px solid var(--borde-sutil); }
@keyframes latido { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

.chip-fecha {
  font-size: 0.66rem; font-weight: 800; letter-spacing: 0.03em;
  padding: 4px 10px; border-radius: var(--radio-full);
}
.chip-fecha.hoy { background: rgba(34,197,94,0.16); color: var(--color-exito); }
.chip-fecha.pronto { background: rgba(168,85,247,0.14); color: var(--morado-hover); }
.chip-fecha.muted { background: var(--fondo-tarjeta-alt); color: var(--texto-desactivado); }

.evento {
  font-family: var(--fuente-titulo); font-size: clamp(1.2rem, 4.2vw, 1.5rem);
  font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; color: var(--texto-principal); margin: 0;
}
.fecha { margin-top: 0.35rem; color: var(--morado-hover); font-weight: 600; font-size: 0.82rem; text-transform: capitalize; }

.ticket-datos { display: flex; flex-wrap: wrap; gap: var(--esp-3) var(--esp-5); margin: var(--esp-4) 0 0; }
.dato { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dato dt { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--texto-desactivado); }
.dato dd { margin: 0; font-family: var(--fuente-titulo); font-size: 0.98rem; font-weight: 700; color: var(--texto-principal); line-height: 1.1; }
.dato dd em { font-style: normal; font-weight: 500; color: var(--texto-secundario); }
.dato-pago dd { display: inline-flex; align-items: baseline; gap: 4px; color: var(--morado-hover); }
.dato-pago .moneda { font-size: 0.66rem; font-weight: 600; color: var(--texto-secundario); }

/* Progreso de ingreso */
.progreso { margin-top: var(--esp-4); }
.progreso-cab { display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; color: var(--texto-secundario); margin-bottom: 5px; }
.progreso-cab strong { color: var(--texto-principal); font-family: var(--fuente-titulo); }
.progreso-barra { height: 7px; border-radius: var(--radio-full); background: var(--fondo-tarjeta-alt); overflow: hidden; }
.progreso-relleno { display: block; height: 100%; border-radius: inherit; background: var(--gradiente-marca); transition: width 0.5s var(--ease-suave, ease); }
.progreso-nota { margin-top: 6px; font-size: 0.72rem; color: var(--color-alerta); }

.codigo { display: flex; flex-direction: column; gap: 4px; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--texto-desactivado); margin-top: var(--esp-4); }
.codigo b { font-size: 0.95rem; font-weight: 700; letter-spacing: 0.18em; text-transform: none; color: var(--texto-principal); font-variant-numeric: tabular-nums; }

/* Botón + timeline de historial */
.btn-historial {
  display: inline-flex; align-items: center; gap: 7px; align-self: flex-start;
  margin-top: var(--esp-4); padding: 7px 12px; border-radius: var(--radio-md);
  background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario); font-size: 0.76rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s ease;
}
.btn-historial:hover { border-color: var(--borde-activo); color: var(--texto-principal); }
.btn-historial svg { width: 15px; height: 15px; transition: transform 0.25s ease; }
.btn-historial svg.girar { transform: rotate(180deg); }
.timeline { list-style: none; margin: var(--esp-3) 0 0; padding: 0 0 0 6px; display: flex; flex-direction: column; gap: 12px; }
.tl-item { display: flex; align-items: flex-start; gap: 12px; position: relative; }
.tl-item:not(:last-child)::before { content: ''; position: absolute; left: 4px; top: 14px; bottom: -12px; width: 2px; background: var(--borde-sutil); }
.tl-punto { width: 10px; height: 10px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; background: var(--color-exito); box-shadow: 0 0 8px rgba(34,197,94,0.5); }
.tl-item.salida .tl-punto { background: var(--color-alerta); box-shadow: 0 0 8px rgba(255,209,102,0.5); }
.tl-texto { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tl-texto b { font-size: 0.82rem; font-weight: 700; color: var(--texto-principal); }
.tl-texto em { font-style: normal; font-size: 0.72rem; color: var(--texto-desactivado); text-transform: capitalize; }
.expandir-enter-active, .expandir-leave-active { transition: opacity 0.25s ease, max-height 0.3s ease; overflow: hidden; }
.expandir-enter-from, .expandir-leave-to { opacity: 0; max-height: 0; }
.expandir-enter-to, .expandir-leave-from { opacity: 1; max-height: 400px; }

/* Perforación */
.ticket-perf { position: relative; width: 2px; align-self: stretch; margin: 0 -1px; background-image: linear-gradient(var(--borde-sutil) 55%, transparent 0); background-size: 2px 12px; background-repeat: repeat-y; background-position: center; }
.ticket-perf::before, .ticket-perf::after { content: ''; position: absolute; left: 50%; width: 20px; height: 20px; border-radius: 50%; transform: translateX(-50%); background: var(--fondo-app); box-shadow: inset 0 0 0 1px var(--borde-sutil); }
.ticket-perf::before { top: -10px; }
.ticket-perf::after { bottom: -10px; }

/* Talón */
.ticket-talon {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: var(--esp-5);
  background: radial-gradient(120% 120% at 50% 0%, rgba(168,85,247,0.08), transparent 60%);
}
.qr-marco {
  position: relative; padding: 8px; border-radius: var(--radio-lg); background: #fff;
  border: none; cursor: pointer; box-shadow: 0 8px 22px rgba(14, 8, 33, 0.5);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.qr-marco:hover { transform: scale(1.05); box-shadow: 0 12px 28px rgba(14, 8, 33, 0.6), 0 0 22px rgba(168,85,247,0.4); }
.qr-marco:focus-visible { outline: 2px solid var(--morado-hover); outline-offset: 3px; }
.qr-marco img { display: block; width: 112px; height: 112px; border-radius: var(--radio-sm); }
.qr-pie { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--texto-desactivado); text-align: center; }
.btn-cancelar-reserva { margin-top: 8px; padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(239,68,68,0.35); background: rgba(239,68,68,0.08); color: #FCA5A5; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.btn-cancelar-reserva:hover:not(:disabled) { background: rgba(239,68,68,0.2); color: #fff; }
.btn-cancelar-reserva:disabled { opacity: 0.5; cursor: not-allowed; }

/* Sello para entradas usadas / vencidas (en vez del QR) */
.sello {
  display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
  color: var(--texto-desactivado);
}
.sello svg { width: 40px; height: 40px; padding: 12px; border-radius: 50%; border: 2px solid currentColor; box-sizing: content-box; }
.sello span { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; white-space: pre-line; line-height: 1.3; }
.sello.usada { color: var(--color-exito); }

/* ---------- QR pantalla completa ---------- */
.qr-fullscreen { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: var(--esp-5); background: #fff; cursor: pointer; animation: qrFs 0.2s ease-out both; }
.qr-fs-img { width: min(78vw, 78vh, 420px); height: min(78vw, 78vh, 420px); image-rendering: pixelated; }
.qr-fs-evento { margin: 0; color: #1a1030; font-weight: 800; font-size: 1.05rem; font-family: var(--fuente-titulo); text-align: center; }
.qr-fs-codigo { margin: 0; color: #1a1030; font-weight: 800; font-size: 1.3rem; letter-spacing: 0.18em; }
.qr-fs-hint { margin: 0; color: #6b6480; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; }
@keyframes qrFs { from { opacity: 0; } to { opacity: 1; } }

/* ---------- Skeleton ---------- */
.esqueleto { pointer-events: none; }
.esqueleto .ticket-talon { background: none; }
.sk { display: block; border-radius: var(--radio-sm); background: linear-gradient(100deg, rgba(139,92,246,0.08) 30%, rgba(139,92,246,0.2) 50%, rgba(139,92,246,0.08) 70%); background-size: 200% 100%; animation: skB 1.4s ease-in-out infinite; }
.sk-chip { width: 96px; height: 22px; border-radius: var(--radio-full); }
.sk-titulo { width: 62%; height: 22px; margin-top: 10px; }
.sk-linea { width: 78%; height: 12px; margin-top: 8px; }
.sk-linea.corta { width: 45%; }
.sk-qr { width: 112px; height: 112px; border-radius: var(--radio-lg); }
@keyframes skB { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ---------- Responsive: talón abajo en móvil ---------- */
@media (max-width: 520px) {
  .ticket { grid-template-columns: 1fr; }
  .ticket-perf { width: auto; height: 2px; align-self: auto; margin: -1px 0; background-image: linear-gradient(90deg, var(--borde-sutil) 55%, transparent 0); background-size: 12px 2px; background-repeat: repeat-x; }
  .ticket-perf::before, .ticket-perf::after { top: 50%; left: auto; bottom: auto; transform: translateY(-50%); }
  .ticket-perf::before { left: -10px; }
  .ticket-perf::after { right: -10px; left: auto; }
  .ticket-talon { flex-direction: row; justify-content: center; gap: var(--esp-4); }
}

@media (prefers-reduced-motion: reduce) {
  .estado-punto, .sk { animation: none; }
  .btn-volver:hover, .qr-marco:hover { transform: none; }
}
</style>
