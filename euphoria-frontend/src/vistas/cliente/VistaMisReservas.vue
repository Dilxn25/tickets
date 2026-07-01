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

    <div v-if="cargando" class="cargando">
      <div class="spinner"></div>
      <p>Cargando...</p>
    </div>

    <div v-else-if="error" class="estado-msg">
      <p>No se pudieron cargar tus reservas.</p>
      <button class="btn-primario" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="!reservas.length" class="estado-msg">
      <div class="icono-vacio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      </div>
      <p>Todavía no tienes reservas.</p>
      <RouterLink to="/cliente/eventos" class="btn-primario link">Ver eventos</RouterLink>
    </div>

    <div v-else class="lista">
      <div v-for="r in reservas" :key="r.id_entrada" class="tarjeta" :class="{ validada: r.estado_validacion }">
        <div class="tarjeta-info">
          <span class="estado" :class="r.estado_validacion ? 'ok' : 'pend'">
            {{ r.estado_validacion ? 'Ingresado' : 'Válida' }}
          </span>
          <h3 class="evento">{{ r.evento || 'Evento' }}</h3>
          <p class="linea"><b>Mesa:</b> {{ r.mesa || '—' }} · {{ r.zona || '' }}</p>
          <p class="linea"><b>Personas:</b> {{ r.cantidad_personas }}</p>
          <p v-if="r.monto_pagado != null" class="linea"><b>Pagado:</b> Bs {{ Number(r.monto_pagado).toFixed(2) }}</p>
          <p v-if="r.fecha_evento" class="linea fecha">{{ formatoFecha(r.fecha_evento) }}</p>
          <p class="codigo">Código: <b>{{ r.codigo_ingreso }}</b></p>
        </div>
        <div class="tarjeta-qr">
          <img :src="r.qr" alt="QR de acceso" />
        </div>
      </div>
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
.vista-mis-reservas { padding: 1rem; padding-bottom: 90px; }

.cabecera { display: flex; align-items: center; gap: 12px; margin-bottom: 1.2rem; }
.cabecera-texto { flex: 1; min-width: 0; }
.titulo { font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); line-height: 1.1; }
.subtitulo { font-size: 0.82rem; color: var(--texto-secundario); }
.btn-volver { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-principal); cursor: pointer; flex-shrink: 0; }
.btn-volver svg { width: 20px; height: 20px; }

.cargando, .estado-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 3rem 1rem; color: var(--texto-secundario); text-align: center; }
.spinner { width: 38px; height: 38px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.icono-vacio { width: 56px; height: 56px; color: var(--texto-desactivado); }

.lista { display: flex; flex-direction: column; gap: 1rem; }
.tarjeta {
  display: flex; gap: 1rem; align-items: center;
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  border-radius: 18px; padding: 1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.tarjeta.validada { opacity: 0.7; }
.tarjeta-info { flex: 1; min-width: 0; }
.estado { display: inline-block; font-size: 0.68rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-bottom: 0.5rem; }
.estado.pend { background: rgba(155,89,182,0.18); color: var(--morado-brillante); }
.estado.ok { background: rgba(34,197,94,0.15); color: #22c55e; }
.evento { font-size: 1.05rem; font-weight: 800; color: var(--texto-principal); margin-bottom: 0.4rem; }
.linea { font-size: 0.82rem; color: var(--texto-secundario); margin-bottom: 0.15rem; }
.linea b { color: var(--texto-principal); font-weight: 600; }
.fecha { color: var(--morado-brillante); font-weight: 600; margin-top: 0.2rem; }
.codigo { font-size: 0.78rem; color: var(--texto-secundario); margin-top: 0.4rem; }
.codigo b { color: var(--texto-principal); letter-spacing: 1px; }

.tarjeta-qr img { width: 96px; height: 96px; border-radius: 12px; background: #fff; padding: 5px; }

.btn-primario {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff; border: none; padding: 11px 22px; border-radius: 12px;
  font-size: 0.95rem; font-weight: 700; box-shadow: 0 4px 15px rgba(219,39,119,0.3); cursor: pointer;
}
.btn-primario.link { text-decoration: none; display: inline-block; }

@media (min-width: 481px) {
  .tarjeta-qr img { width: 120px; height: 120px; }
}
</style>
