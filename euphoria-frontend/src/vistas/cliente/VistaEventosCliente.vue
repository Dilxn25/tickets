<template>
  <div class="vista-eventos-cliente fade-in">
    <div class="header-mobile">
      <span class="eyebrow">Euphoria</span>
      <h1 class="titulo-pagina">Cartelera de eventos</h1>
      <p class="subtitulo">Descubre las próximas fiestas y asegura tu lugar.</p>
    </div>

    <div v-if="cargando" class="cargando">
      <div class="skeleton-lista">
        <div class="skeleton-card" v-for="n in 2" :key="n">
          <div class="skeleton-portada"></div>
          <div class="skeleton-cuerpo">
            <div class="skeleton-linea ancho-70"></div>
            <div class="skeleton-linea ancho-40"></div>
            <div class="skeleton-linea ancho-90"></div>
            <div class="skeleton-acciones">
              <div class="skeleton-btn"></div>
              <div class="skeleton-btn ancho-mayor"></div>
            </div>
          </div>
        </div>
      </div>
      <p class="cargando-texto">Cargando cartelera...</p>
    </div>

    <div v-else-if="error" class="estado-error">
      <div class="icono-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3>No se pudo cargar la cartelera</h3>
      <p>Ocurrió un problema de conexión. Revisa tu internet e inténtalo de nuevo.</p>
      <button class="btn-reintentar" @click="cargarEventos">Reintentar</button>
    </div>

    <div v-else-if="eventos.length === 0" class="estado-vacio">
      <div class="icono-vacio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      </div>
      <h3>Sin eventos disponibles</h3>
      <p>Actualmente no hay eventos programados. Vuelve a revisar más tarde.</p>
    </div>

    <div v-else class="lista-eventos escalonar">
      <div v-for="evento in eventos" :key="evento.id_evento" class="tarjeta-evento tarjeta-interactiva anim-subir">
        <div class="portada-contenedor">
          <img v-if="evento.url_portada" :src="evento.url_portada" class="portada-img" :alt="`Portada de ${evento.nombre_evento}`" />
          <div v-else class="portada-placeholder">EUPHORIA</div>
          <div class="overlay-gradiente"></div>
          <div class="fecha-badge">
            <span class="dia">{{ obtenerDia(evento.fecha_hora_inicio) }}</span>
            <span class="mes">{{ obtenerMes(evento.fecha_hora_inicio) }}</span>
          </div>
        </div>

        <div class="info-evento">
          <h2 class="nombre">{{ evento.nombre_evento }}</h2>
          <p class="hora">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Inicia a las {{ obtenerHora(evento.fecha_hora_inicio) }}
          </p>
          <p v-if="evento.fecha_hora_fin" class="hora hora-fin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Finaliza el {{ obtenerDia(evento.fecha_hora_fin) }} {{ obtenerMes(evento.fecha_hora_fin) }} a las {{ obtenerHora(evento.fecha_hora_fin) }}
          </p>
          <p class="descripcion">{{ evento.descripcion || 'Vive la mejor experiencia en EUPHORIA.' }}</p>

          <!-- Si el evento tiene zonas, mostramos info, si no, es reserva general -->
          <div class="acciones-evento">
            <button class="btn-detalles" @click="verDetalles(evento)">
              Ver detalles
            </button>
            <button class="btn-reservar" @click="reservarMesa(evento)">
              Reservar mesa
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="flecha"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { servicioEventos } from '@/servicios-api/servicio-eventos.js'

const router = useRouter()
const eventos = ref([])
const cargando = ref(true)
const error = ref(false)

async function cargarEventos() {
  cargando.value = true
  error.value = false
  try {
    // Para el cliente solo traemos los activos o disponibles
    const data = await servicioEventos.listarDisponibles()
    eventos.value = data
  } catch (err) {
    console.error('Error al cargar la cartelera:', err)
    error.value = true
    eventos.value = []
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarEventos()
})

// Formato de Fechas
function obtenerDia(fecha) {
  if (!fecha) return ''
  return new Date(fecha).getDate().toString().padStart(2, '0')
}
function obtenerMes(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
}
function obtenerHora(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

// Acción del cliente
function verDetalles(evento) {
  router.push(`/cliente/eventos/${evento.id_evento}`)
}
function reservarMesa(evento) {
  router.push({ path: `/cliente/reservar/${evento.id_evento}`, query: { nombre: evento.nombre_evento } })
}
</script>

<style scoped>
.vista-eventos-cliente {
  padding: var(--esp-5) var(--esp-4);
  padding-bottom: 90px; /* Espacio para el navbar bottom */
  max-width: 720px;
  margin: 0 auto;
}

.header-mobile { margin-bottom: var(--esp-6); }
.eyebrow {
  display: inline-block;
  font-family: var(--fuente-titulo);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--morado-hover);
  margin-bottom: var(--esp-2);
}
.titulo-pagina {
  font-family: var(--fuente-titulo);
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  text-wrap: balance;
  color: var(--texto-principal);
  margin-bottom: var(--esp-2);
}
.subtitulo { font-size: 0.94rem; line-height: 1.5; color: var(--texto-secundario); text-wrap: pretty; max-width: 44ch; }

/* Cargando — skeletons que imitan la forma de las tarjetas */
.cargando { display: flex; flex-direction: column; gap: var(--esp-4); }
.cargando-texto { text-align: center; font-size: 0.82rem; color: var(--texto-desactivado); letter-spacing: 0.02em; }
.skeleton-lista { display: flex; flex-direction: column; gap: var(--esp-5); }
.skeleton-card {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  overflow: hidden;
}
.skeleton-portada { width: 100%; height: 220px; }
.skeleton-cuerpo { padding: var(--esp-5); display: flex; flex-direction: column; gap: var(--esp-3); }
.skeleton-linea { height: 12px; border-radius: var(--radio-full); }
.ancho-40 { width: 40%; }
.ancho-70 { width: 70%; height: 18px; }
.ancho-90 { width: 90%; }
.skeleton-acciones { display: flex; gap: var(--esp-3); margin-top: var(--esp-2); }
.skeleton-btn { flex: 1; height: 42px; border-radius: var(--radio-full); }
.skeleton-btn.ancho-mayor { flex: 1.4; }
.skeleton-portada,
.skeleton-linea,
.skeleton-btn {
  background: linear-gradient(100deg, rgba(139,92,246,0.08) 30%, rgba(168,85,247,0.18) 50%, rgba(139,92,246,0.08) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* Vacio */
.estado-vacio, .estado-error { text-align: center; padding: var(--esp-7) var(--esp-5) calc(var(--esp-7) + var(--esp-2)); background: var(--gradiente-sutil); border-radius: var(--radio-xl); border: 1px dashed var(--borde-sutil); margin-top: var(--esp-6); animation: subirEntrada 0.45s var(--ease-suave) both; }
.icono-vacio, .icono-error { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--esp-4); border-radius: var(--radio-full); }
.icono-vacio { color: var(--morado-hover); background: rgba(168,85,247,0.1); border: 1px solid var(--borde-sutil); }
.icono-vacio svg, .icono-error svg { width: 28px; height: 28px; }
.estado-vacio h3, .estado-error h3 { font-family: var(--fuente-titulo); font-size: 1.15rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: var(--esp-2); color: var(--texto-principal); }
.estado-vacio p, .estado-error p { font-size: 0.88rem; line-height: 1.55; color: var(--texto-secundario); max-width: 34ch; margin-inline: auto; }

/* Error de carga */
.icono-error { color: var(--rosa-acento); background: rgba(236,72,153,0.1); border: 1px solid rgba(236,72,153,0.28); }
.estado-error p { margin-bottom: var(--esp-5); }
.btn-reintentar {
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  padding: 12px 28px;
  border-radius: var(--radio-full);
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.35);
  cursor: pointer;
  transition: transform var(--trans-normal), box-shadow var(--trans-normal);
}
.btn-reintentar:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-reintentar:active { transform: scale(0.98); }
.btn-reintentar:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 6px 18px rgba(168, 85, 247, 0.35); }

/* Lista de Eventos */
.lista-eventos { display: flex; flex-direction: column; gap: var(--esp-5); }

.tarjeta-evento {
  background: var(--gradiente-sutil);
  border-radius: var(--radio-xl);
  overflow: hidden;
  border: 1px solid var(--borde-sutil);
  box-shadow: 0 8px 28px rgba(14, 8, 33, 0.5), 0 1px 0 rgba(168, 85, 247, 0.06) inset;
}

.portada-contenedor {
  position: relative;
  width: 100%;
  height: 350px; /* Mas alto para apreciar mejor los posters verticales */
  background: var(--fondo-app);
}

.portada-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top; /* Mostrar la parte superior del poster (usualmente el titulo) */
  transition: transform var(--trans-lenta);
}
.tarjeta-evento:hover .portada-img { transform: scale(1.04); }

.portada-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradiente-sutil);
  color: rgba(168,85,247,0.18);
  font-family: var(--fuente-titulo);
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 5px;
}

.overlay-gradiente {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 110px;
  background: linear-gradient(to top, var(--fondo-tarjeta), transparent);
  pointer-events: none;
}

.fecha-badge {
  position: absolute;
  top: var(--esp-3); right: var(--esp-3);
  background: rgba(14, 8, 33, 0.6);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-lg);
  padding: var(--esp-2) var(--esp-3) 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 52px;
  box-shadow: 0 6px 20px rgba(14, 8, 33, 0.55), 0 1px 0 rgba(255,255,255,0.08) inset;
}
.fecha-badge .dia { font-family: var(--fuente-titulo); font-size: 1.6rem; font-weight: 800; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; }
.fecha-badge .mes { font-size: 0.68rem; font-weight: 700; color: var(--rosa-suave); letter-spacing: 2px; margin-top: 3px; }

.info-evento {
  padding: var(--esp-5);
}

.nombre { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; text-wrap: balance; color: var(--texto-principal); margin-bottom: var(--esp-3); }
.hora { display: flex; align-items: center; gap: 7px; font-size: 0.85rem; color: var(--morado-hover); font-weight: 600; margin-bottom: var(--esp-3); }
.hora-fin { color: var(--texto-secundario); font-weight: 500; margin-top: calc(-1 * var(--esp-2)); }
.icono { width: 14px; height: 14px; flex-shrink: 0; }
.descripcion { font-size: 0.88rem; color: var(--texto-secundario); margin-bottom: var(--esp-5); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.acciones-evento { display: flex; gap: var(--esp-3); }
.btn-detalles {
  flex: 1;
  background: rgba(168, 85, 247, 0.08);
  color: var(--morado-hover);
  border: 1px solid var(--borde-activo);
  padding: 12px;
  border-radius: var(--radio-full);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--trans-normal), border-color var(--trans-normal), color var(--trans-normal), transform var(--trans-rapida);
}
.btn-detalles:hover { background: rgba(168, 85, 247, 0.16); border-color: var(--morado-brillante); color: var(--texto-principal); }
.btn-detalles:active { transform: scale(0.98); }
.btn-detalles:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-reservar {
  flex: 1.4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: var(--radio-full);
  font-size: 0.92rem;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.35);
  cursor: pointer;
  transition: transform var(--trans-normal), box-shadow var(--trans-normal);
}
.btn-reservar .flecha { width: 15px; height: 15px; transition: transform var(--trans-normal); }
.btn-reservar:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-reservar:hover .flecha { transform: translateX(3px); }
.btn-reservar:active { transform: scale(0.98); }
.btn-reservar:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 6px 18px rgba(168, 85, 247, 0.35); }

@media (prefers-reduced-motion: reduce) {
  .skeleton-portada, .skeleton-linea, .skeleton-btn { animation: none; }
  .btn-reservar:hover .flecha { transform: none; }
  .tarjeta-evento:hover .portada-img { transform: none; }
}
</style>
