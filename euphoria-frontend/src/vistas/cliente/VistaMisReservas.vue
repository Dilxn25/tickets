<template>
  <div class="vista-mis-reservas fade-in">
    <div class="cabecera">
      <button class="btn-volver" @click="volver" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div class="cabecera-texto">
        <h1 class="titulo">Mis reservas</h1>
        <p class="subtitulo">Muestra el QR en la entrada</p>
      </div>
    </div>

    <div v-if="cargando" class="lista" aria-busy="true" aria-label="Cargando tus reservas">
      <div v-for="n in 3" :key="n" class="tarjeta esqueleto">
        <div class="tarjeta-info">
          <span class="sk sk-chip"></span>
          <span class="sk sk-titulo"></span>
          <span class="sk sk-linea"></span>
          <span class="sk sk-linea corta"></span>
          <span class="sk sk-linea media"></span>
        </div>
        <div class="tarjeta-qr">
          <span class="sk sk-qr"></span>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="estado-msg aparecer-subir">
      <div class="icono-estado error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16.5" x2="12" y2="16.5"></line></svg>
      </div>
      <div class="estado-texto">
        <h2 class="estado-titulo">No pudimos cargar tus reservas</h2>
        <p class="estado-detalle">Revisa tu conexión e inténtalo de nuevo.</p>
      </div>
      <button class="btn-primario brillo-hover" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="!reservas.length" class="estado-msg aparecer-subir">
      <div class="icono-estado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      </div>
      <div class="estado-texto">
        <h2 class="estado-titulo">Todavía no tienes reservas</h2>
        <p class="estado-detalle">Reserva tu mesa para el próximo evento y aparecerá aquí con su QR de acceso.</p>
      </div>
      <RouterLink to="/cliente/eventos" class="btn-primario link brillo-hover">Ver eventos</RouterLink>
    </div>

    <div v-else class="lista escalonar">
      <article v-for="r in reservas" :key="r.id_entrada" class="tarjeta anim-subir hover-elevar" :class="{ validada: r.estado_validacion }">
        <div class="tarjeta-info">
          <span class="estado" :class="r.estado_validacion ? 'ok' : 'pend'">
            <span class="estado-punto" aria-hidden="true"></span>
            {{ r.estado_validacion ? 'Ingresado' : 'Válida' }}
          </span>
          <h3 class="evento">{{ r.evento || 'Evento' }}</h3>
          <p class="linea"><b>Mesa:</b> {{ r.mesa || '—' }} · {{ r.zona || '' }}</p>
          <p class="linea"><b>Personas:</b> {{ r.cantidad_personas }}</p>
          <p v-if="r.monto_pagado != null" class="linea"><b>Pagado:</b> Bs {{ Number(r.monto_pagado).toFixed(2) }}</p>
          <p v-if="r.fecha_evento" class="linea fecha">{{ formatoFecha(r.fecha_evento) }}</p>
          <p class="codigo">Código de ingreso<b>{{ r.codigo_ingreso }}</b></p>
        </div>
        <div class="tarjeta-qr">
          <img :src="r.qr" alt="Código QR de acceso" />
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
.vista-mis-reservas { padding: var(--esp-5) var(--esp-4) 96px; max-width: 720px; margin: 0 auto; }

/* Cabecera */
.cabecera { display: flex; align-items: center; gap: var(--esp-4); margin-bottom: var(--esp-6); }
.cabecera-texto { flex: 1; min-width: 0; }
.titulo { font-family: var(--fuente-titulo); font-size: clamp(1.55rem, 5vw, 1.9rem); font-weight: 800; letter-spacing: -0.03em; color: var(--texto-principal); line-height: 1.05; text-wrap: balance; }
.subtitulo { font-size: 0.85rem; color: var(--texto-secundario); margin-top: 2px; }
.btn-volver {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: var(--radio-md);
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  color: var(--texto-principal); cursor: pointer; flex-shrink: 0;
  transition: var(--trans-normal);
}
.btn-volver:hover { border-color: var(--borde-activo); background: var(--fondo-tarjeta-alt); transform: translateX(-2px); box-shadow: var(--sombra-glow); }
.btn-volver:active { transform: translateX(-2px) scale(0.95); }
.btn-volver:focus-visible { outline: 2px solid var(--morado-hover); outline-offset: 2px; }
.btn-volver svg { width: 20px; height: 20px; }

/* Estados: vacio y error */
.estado-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--esp-4); padding: var(--esp-7) var(--esp-4); color: var(--texto-secundario); text-align: center; }
.icono-estado {
  display: inline-flex; align-items: center; justify-content: center;
  width: 76px; height: 76px; border-radius: var(--radio-full);
  color: var(--morado-hover);
  background: radial-gradient(circle at 50% 40%, rgba(168,85,247,0.22), rgba(168,85,247,0.04));
  border: 1px solid var(--borde-sutil);
}
.icono-estado svg { width: 34px; height: 34px; }
.icono-estado.error { color: #FCA5A5; background: radial-gradient(circle at 50% 40%, rgba(239,68,68,0.2), rgba(239,68,68,0.04)); border-color: rgba(239,68,68,0.3); }
.estado-texto { display: flex; flex-direction: column; gap: var(--esp-2); max-width: 42ch; }
.estado-titulo { font-family: var(--fuente-titulo); font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; color: var(--texto-principal); text-wrap: balance; }
.estado-detalle { font-size: 0.88rem; line-height: 1.55; color: var(--texto-secundario); text-wrap: pretty; }

/* Lista de reservas */
.lista { display: flex; flex-direction: column; gap: var(--esp-4); }
.tarjeta {
  display: flex; gap: var(--esp-5); align-items: center;
  background: var(--gradiente-sutil); border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg); padding: var(--esp-5); box-shadow: var(--sombra-tarjeta);
  transition: var(--trans-normal);
}
.tarjeta:hover { border-color: var(--borde-activo); }
.tarjeta.validada { opacity: 0.62; }
.tarjeta.validada:hover { opacity: 0.85; }
.tarjeta-info { flex: 1; min-width: 0; }

.estado {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 5px 12px 5px 10px; border-radius: var(--radio-full); margin-bottom: var(--esp-3);
}
.estado-punto { width: 6px; height: 6px; border-radius: var(--radio-full); background: currentColor; box-shadow: 0 0 8px currentColor; }
.estado.pend { background: rgba(168,85,247,0.18); color: var(--morado-hover); border: 1px solid var(--borde-sutil); }
.estado.pend .estado-punto { animation: latidoPunto 1.8s ease-in-out infinite; }
.estado.ok { background: rgba(34,197,94,0.15); color: var(--color-exito); border: 1px solid rgba(34,197,94,0.3); }
@keyframes latidoPunto { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.evento { font-family: var(--fuente-titulo); font-size: 1.18rem; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; color: var(--texto-principal); margin-bottom: 0.55rem; text-wrap: balance; }
.linea { font-size: 0.83rem; line-height: 1.5; color: var(--texto-secundario); margin-bottom: 0.2rem; }
.linea b { color: var(--texto-principal); font-weight: 600; }
.fecha { color: var(--morado-hover); font-weight: 600; margin-top: 0.35rem; font-variant-numeric: tabular-nums; }
.codigo {
  display: flex; flex-direction: column; gap: 3px;
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--texto-desactivado); margin-top: var(--esp-3);
}
.codigo b {
  font-size: 0.95rem; font-weight: 700; letter-spacing: 0.12em; text-transform: none;
  color: var(--texto-principal); font-variant-numeric: tabular-nums;
}

.tarjeta-qr { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.tarjeta-qr img {
  display: block; width: 104px; height: 104px; border-radius: var(--radio-md);
  background: #fff; padding: 7px;
  box-shadow: 0 4px 16px rgba(14, 8, 33, 0.55);
  transition: transform 0.25s var(--ease-suave, ease), box-shadow 0.25s ease;
}
.tarjeta:hover .tarjeta-qr img { transform: scale(1.05); box-shadow: 0 8px 24px rgba(14, 8, 33, 0.6), var(--glow-morado); }
.qr-pie { font-size: 0.64rem; font-weight: 600; letter-spacing: 0.04em; color: var(--texto-desactivado); text-transform: uppercase; }
.validada .qr-pie { visibility: hidden; }

/* Boton primario */
.btn-primario {
  background: var(--gradiente-marca);
  color: #fff; border: none; padding: 12px 26px; border-radius: var(--radio-full);
  font-size: 0.92rem; font-weight: 700; letter-spacing: 0.01em;
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.35); cursor: pointer;
  transition: var(--trans-normal);
}
.btn-primario:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-primario:active { transform: translateY(0) scale(0.98); }
.btn-primario:focus-visible { outline: 2px solid var(--morado-hover); outline-offset: 3px; }
.btn-primario.link { text-decoration: none; display: inline-block; }

/* Skeletons de carga (coinciden con la forma de la tarjeta) */
.esqueleto { pointer-events: none; }
.esqueleto .tarjeta-info { display: flex; flex-direction: column; gap: var(--esp-3); }
.sk {
  display: block; border-radius: var(--radio-sm);
  background: linear-gradient(100deg, rgba(139,92,246,0.08) 30%, rgba(139,92,246,0.2) 50%, rgba(139,92,246,0.08) 70%);
  background-size: 200% 100%; animation: skBrillo 1.4s ease-in-out infinite;
}
.sk-chip { width: 84px; height: 22px; border-radius: var(--radio-full); }
.sk-titulo { width: 62%; height: 20px; }
.sk-linea { width: 78%; height: 12px; }
.sk-linea.corta { width: 45%; }
.sk-linea.media { width: 58%; }
.sk-qr { width: 104px; height: 104px; border-radius: var(--radio-md); }
@keyframes skBrillo { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (min-width: 481px) {
  .tarjeta-qr img, .sk-qr { width: 128px; height: 128px; }
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta, .btn-primario, .btn-volver, .tarjeta-qr img { transition: none; }
  .btn-primario:hover, .btn-volver:hover, .tarjeta:hover .tarjeta-qr img { transform: none; }
  .sk, .estado.pend .estado-punto { animation: none; }
}
</style>
