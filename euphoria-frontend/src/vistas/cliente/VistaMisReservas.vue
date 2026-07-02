<template>
  <div class="vista-mis-reservas entrada-cine">
    <div class="fondo-orbes" aria-hidden="true">
      <span class="orbe-deco morado"></span>
      <span class="orbe-deco rosa"></span>
    </div>

    <header class="hero">
      <button class="btn-volver hover-glow" @click="volver" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div class="hero-texto">
        <h1 class="hero-titulo">Mis reservas</h1>
        <p class="hero-sub">Muestra el QR en la puerta y accede sin filas.</p>
      </div>
      <span v-if="!cargando && !error && reservas.length" class="hero-contador" aria-hidden="true">
        <b>{{ reservas.length }}</b>
        <em>{{ reservas.length === 1 ? 'pase' : 'pases' }}</em>
      </span>
    </header>

    <div v-if="cargando" class="lista" aria-busy="true" aria-label="Cargando tus reservas">
      <div v-for="n in 3" :key="n" class="ticket esqueleto">
        <div class="ticket-cuerpo">
          <span class="sk sk-chip"></span>
          <span class="sk sk-titulo"></span>
          <span class="sk sk-linea"></span>
          <span class="sk sk-linea corta"></span>
          <span class="sk sk-linea media"></span>
        </div>
        <div class="ticket-perf" aria-hidden="true"></div>
        <div class="ticket-talon">
          <span class="sk sk-qr"></span>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="estado-msg superficie textura-grano aparecer-subir">
      <div class="icono-estado error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16.5" x2="12" y2="16.5"></line></svg>
      </div>
      <div class="estado-texto">
        <h2 class="estado-titulo">No pudimos cargar tus reservas</h2>
        <p class="estado-detalle">Revisa tu conexión e inténtalo de nuevo.</p>
      </div>
      <button class="cta-isla brillo-hover" @click="cargar">
        Reintentar
        <span class="cta-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        </span>
      </button>
    </div>

    <div v-else-if="!reservas.length" class="estado-msg superficie textura-grano aparecer-subir">
      <div class="icono-estado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      </div>
      <div class="estado-texto">
        <h2 class="estado-titulo">Todavía no tienes reservas</h2>
        <p class="estado-detalle">Reserva tu mesa para el próximo evento y aparecerá aquí con su QR de acceso.</p>
      </div>
      <RouterLink to="/cliente/eventos" class="cta-isla link brillo-hover">
        Ver eventos
        <span class="cta-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </span>
      </RouterLink>
    </div>

    <div v-else class="lista escalonar">
      <article v-for="r in reservas" :key="r.id_entrada" class="ticket anim-subir hover-elevar" :class="{ validada: r.estado_validacion }">
        <span class="ticket-borde" aria-hidden="true"></span>

        <div class="ticket-cuerpo">
          <div class="ticket-encabezado">
            <span class="marca-pase" aria-hidden="true">Euphoria · Boarding pass</span>
            <span class="estado" :class="r.estado_validacion ? 'ok' : 'pend'">
              <span class="estado-punto" aria-hidden="true"></span>
              {{ r.estado_validacion ? 'Ingresado' : 'Válida' }}
            </span>
          </div>

          <h3 class="evento">{{ r.evento || 'Evento' }}</h3>
          <p v-if="r.fecha_evento" class="fecha">{{ formatoFecha(r.fecha_evento) }}</p>

          <dl class="ticket-datos">
            <div class="dato">
              <dt>Mesa</dt>
              <dd>{{ r.mesa || '—' }}<em v-if="r.zona"> · {{ r.zona }}</em></dd>
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

          <p class="codigo">Código de ingreso<b>{{ r.codigo_ingreso }}</b></p>
        </div>

        <div class="ticket-perf" aria-hidden="true"></div>

        <div class="ticket-talon">
          <div class="qr-marco">
            <img :src="r.qr" alt="Código QR de acceso" />
          </div>
          <span class="qr-pie">Muestra este QR</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { servicioReservas } from '@/servicios-api/servicio-reservas.js'

const router = useRouter()
const reservas = ref([])
const cargando = ref(true)
const error = ref(false)

function volver() { router.back() }

function formatoFecha(f) {
  if (!f) return ''
  return new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
}

async function cargar() {
  cargando.value = true
  error.value = false
  try {
    reservas.value = await servicioReservas.misReservas()
  } catch (err) {
    console.error('Error cargando mis reservas:', err)
    error.value = true
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.vista-mis-reservas {
  position: relative;
  padding: var(--esp-6) var(--esp-4) 104px;
  max-width: 760px; margin: 0 auto;
  isolation: isolate;
}

/* Orbes ambientales de neon (fondo del hero) */
.fondo-orbes { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.fondo-orbes .orbe-deco { position: absolute; }
.fondo-orbes .morado { width: 320px; height: 320px; top: -120px; right: -90px; opacity: 0.28; }
.fondo-orbes .rosa { width: 260px; height: 260px; top: 40px; left: -120px; opacity: 0.22; }

/* ---------- Hero ---------- */
.hero {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start; column-gap: var(--esp-4);
  margin-bottom: var(--esp-6);
}
.hero-texto { min-width: 0; padding-top: 2px; }
.hero-titulo {
  margin: 0; text-wrap: balance;
  font-family: var(--fuente-titulo);
  font-size: clamp(1.55rem, 5vw, 1.9rem);
  font-weight: 800; letter-spacing: -0.025em; line-height: 1.08;
  color: var(--texto-principal);
}
.hero-sub {
  margin-top: var(--esp-2); max-width: 44ch;
  font-size: 0.9rem; line-height: 1.5; color: var(--texto-secundario); text-wrap: pretty;
}
.btn-volver {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: var(--radio-md);
  background: var(--glass-fondo); border: 1px solid var(--glass-borde);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: var(--texto-principal); cursor: pointer; flex-shrink: 0;
  transition: transform 0.3s var(--ease-cine, ease), border-color 0.25s ease, box-shadow 0.3s ease, background 0.25s ease;
}
.btn-volver:hover { border-color: var(--borde-activo); background: var(--fondo-tarjeta-alt); transform: translateX(-3px); box-shadow: var(--glow-morado); }
.btn-volver:active { transform: translateX(-3px) scale(0.94); }
.btn-volver:focus-visible { outline: 2px solid var(--morado-hover); outline-offset: 2px; }
.btn-volver svg { width: 20px; height: 20px; }

.hero-contador {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: 72px; padding: 10px 14px; border-radius: var(--radio-lg);
  background: var(--glass-fondo); border: 1px solid var(--glass-borde);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); line-height: 1;
}
.hero-contador b {
  font-family: var(--fuente-titulo); font-size: 1.7rem; font-weight: 800;
  letter-spacing: -0.03em; color: var(--morado-hover); font-variant-numeric: tabular-nums;
}
.hero-contador em {
  margin-top: 3px; font-style: normal; font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--texto-desactivado);
}

/* ---------- Estados: vacio y error ---------- */
.estado-msg {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--esp-4); padding: var(--esp-7) var(--esp-5);
  color: var(--texto-secundario); text-align: center;
}
.estado-msg > * { position: relative; z-index: 1; }
.icono-estado {
  display: inline-flex; align-items: center; justify-content: center;
  width: 82px; height: 82px; border-radius: var(--radio-full);
  color: var(--morado-hover);
  background: radial-gradient(circle at 50% 38%, rgba(168,85,247,0.28), rgba(168,85,247,0.04));
  border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 0 22px rgba(168,85,247,0.15), var(--glow-morado);
}
.icono-estado svg { width: 36px; height: 36px; }
.icono-estado.error { color: #FCA5A5; background: radial-gradient(circle at 50% 38%, rgba(239,68,68,0.24), rgba(239,68,68,0.04)); border-color: rgba(239,68,68,0.3); box-shadow: inset 0 0 22px rgba(239,68,68,0.15), 0 0 24px rgba(239,68,68,0.3); }
.estado-texto { display: flex; flex-direction: column; gap: var(--esp-2); max-width: 42ch; }
.estado-titulo { font-family: var(--fuente-titulo); font-size: 1.32rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); text-wrap: balance; }
.estado-detalle { font-size: 0.9rem; line-height: 1.6; color: var(--texto-secundario); text-wrap: pretty; }
.cta-isla.link { text-decoration: none; }

/* ---------- Lista ---------- */
.lista { display: flex; flex-direction: column; gap: var(--esp-5); }

/* ---------- Ticket / boarding pass ---------- */
.ticket {
  position: relative;
  display: grid; grid-template-columns: 1fr auto minmax(150px, 210px);
  align-items: stretch;
  border-radius: var(--radio-xl);
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(236,72,153,0.10), transparent 55%),
    var(--gradiente-sutil);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 22px 50px rgba(10, 6, 26, 0.55);
  overflow: hidden;
  transition: transform 0.35s var(--ease-cine, ease), box-shadow 0.35s ease, border-color 0.3s ease, opacity 0.3s ease;
}
/* Filo de neon superior */
.ticket-borde {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--gradiente-marca); opacity: 0.9;
  box-shadow: 0 0 16px rgba(168,85,247,0.55);
}
.ticket:hover { border-color: var(--borde-activo); }
.ticket.validada { opacity: 0.6; filter: saturate(0.85); }
.ticket.validada:hover { opacity: 0.86; }

.ticket-cuerpo {
  min-width: 0; padding: var(--esp-5) var(--esp-5) var(--esp-5);
  display: flex; flex-direction: column;
}
.ticket-encabezado { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); margin-bottom: var(--esp-4); }
.marca-pase {
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--texto-desactivado); white-space: nowrap;
}

.estado {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 5px 12px 5px 10px; border-radius: var(--radio-full);
}
.estado-punto { width: 6px; height: 6px; border-radius: var(--radio-full); background: currentColor; box-shadow: 0 0 8px currentColor; }
.estado.pend { background: rgba(168,85,247,0.18); color: var(--morado-hover); border: 1px solid var(--borde-sutil); }
.estado.pend .estado-punto { animation: latidoPunto 1.8s ease-in-out infinite; }
.estado.ok { background: rgba(34,197,94,0.15); color: var(--color-exito); border: 1px solid rgba(34,197,94,0.3); }
@keyframes latidoPunto { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.evento {
  font-family: var(--fuente-titulo); font-size: clamp(1.3rem, 4.5vw, 1.7rem);
  font-weight: 800; letter-spacing: -0.025em; line-height: 1.08;
  color: var(--texto-principal); margin: 0; text-wrap: balance;
}
.fecha {
  margin-top: 0.4rem; color: var(--morado-hover); font-weight: 600;
  font-size: 0.86rem; font-variant-numeric: tabular-nums; text-transform: capitalize;
}

.ticket-datos {
  display: flex; flex-wrap: wrap; gap: var(--esp-4) var(--esp-5);
  margin: var(--esp-4) 0 0;
}
.dato { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dato dt {
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--texto-desactivado);
}
.dato dd {
  margin: 0; font-family: var(--fuente-titulo); font-size: 1.02rem; font-weight: 700;
  letter-spacing: -0.01em; color: var(--texto-principal); line-height: 1.1;
}
.dato dd em { font-style: normal; font-weight: 500; color: var(--texto-secundario); }
.dato-pago dd {
  display: inline-flex; align-items: baseline; gap: 4px;
  color: var(--morado-hover); font-variant-numeric: tabular-nums;
}
.dato-pago .moneda { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em; color: var(--texto-secundario); }

.codigo {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--texto-desactivado); margin-top: auto; padding-top: var(--esp-4);
}
.codigo b {
  font-size: 1rem; font-weight: 700; letter-spacing: 0.2em; text-transform: none;
  color: var(--texto-principal); font-variant-numeric: tabular-nums;
}

/* Perforacion vertical con "muescas" recortadas */
.ticket-perf {
  position: relative; width: 2px; align-self: stretch; margin: 0 -1px;
  background-image: linear-gradient(var(--borde-sutil) 55%, transparent 0);
  background-size: 2px 12px; background-repeat: repeat-y;
  background-position: center;
}
.ticket-perf::before,
.ticket-perf::after {
  content: ''; position: absolute; left: 50%; width: 22px; height: 22px;
  border-radius: 50%; transform: translateX(-50%);
  background: var(--fondo-app);
  box-shadow: inset 0 0 0 1px var(--glass-borde);
}
.ticket-perf::before { top: -11px; }
.ticket-perf::after { bottom: -11px; }

/* Talon con el QR destacado */
.ticket-talon {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: var(--esp-5);
  background: radial-gradient(120% 120% at 50% 0%, rgba(168,85,247,0.1), transparent 60%);
}
.qr-marco {
  position: relative; padding: 8px; border-radius: var(--radio-lg);
  background: #fff;
  box-shadow: 0 8px 22px rgba(14, 8, 33, 0.55), inset 0 0 0 4px rgba(168,85,247,0.12);
  transition: transform 0.3s var(--ease-cine, ease), box-shadow 0.3s ease;
}
.qr-marco img {
  display: block; width: 108px; height: 108px; border-radius: var(--radio-sm);
}
.ticket:hover .qr-marco { transform: scale(1.06); box-shadow: 0 14px 30px rgba(14, 8, 33, 0.6), 0 0 26px rgba(168,85,247,0.45), inset 0 0 0 4px rgba(168,85,247,0.18); }
.qr-pie {
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--texto-desactivado); text-align: center;
}
.validada .qr-pie { visibility: hidden; }

/* ---------- Skeletons (forma de ticket) ---------- */
.esqueleto { pointer-events: none; }
.esqueleto .ticket-cuerpo { gap: var(--esp-3); }
.esqueleto .ticket-talon { background: none; }
.sk {
  display: block; border-radius: var(--radio-sm);
  background: linear-gradient(100deg, rgba(139,92,246,0.08) 30%, rgba(139,92,246,0.2) 50%, rgba(139,92,246,0.08) 70%);
  background-size: 200% 100%; animation: skBrillo 1.4s ease-in-out infinite;
}
.sk-chip { width: 96px; height: 22px; border-radius: var(--radio-full); }
.sk-titulo { width: 62%; height: 24px; }
.sk-linea { width: 78%; height: 13px; }
.sk-linea.corta { width: 45%; }
.sk-linea.media { width: 58%; }
.sk-qr { width: 124px; height: 124px; border-radius: var(--radio-lg); }
@keyframes skBrillo { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ---------- Responsive: colapso a talon inferior ---------- */
@media (min-width: 560px) {
  .qr-marco img { width: 128px; height: 128px; }
}

@media (max-width: 520px) {
  .hero { grid-template-columns: auto 1fr; }
  .hero-contador { display: none; }

  .ticket { grid-template-columns: 1fr; }
  .ticket-perf {
    width: auto; height: 2px; align-self: auto; margin: -1px 0;
    background-image: linear-gradient(90deg, var(--borde-sutil) 55%, transparent 0);
    background-size: 12px 2px; background-repeat: repeat-x;
  }
  .ticket-perf::before,
  .ticket-perf::after { top: 50%; left: auto; bottom: auto; transform: translateY(-50%); }
  .ticket-perf::before { left: -11px; }
  .ticket-perf::after { right: -11px; left: auto; }
  .ticket-talon { flex-direction: row; justify-content: flex-start; gap: var(--esp-4); }
}

@media (prefers-reduced-motion: reduce) {
  .ticket, .btn-volver, .qr-marco { transition: none; }
  .btn-volver:hover, .ticket:hover .qr-marco { transform: none; }
  .sk, .estado.pend .estado-punto { animation: none; }
}
</style>
