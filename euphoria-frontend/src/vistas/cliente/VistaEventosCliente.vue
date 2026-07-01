<template>
  <div class="vista-eventos-cliente fade-in">
    <div class="header-mobile">
      <h1 class="titulo-pagina">Cartelera de Eventos</h1>
      <p class="subtitulo">Descubre las próximas fiestas y asegura tu lugar.</p>
    </div>

    <div v-if="cargando" class="cargando">
      <div class="spinner"></div>
      <p>Cargando cartelera...</p>
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
      <h3>Sin Eventos Disponibles</h3>
      <p>Actualmente no hay eventos programados. Vuelve a revisar más tarde.</p>
    </div>

    <div v-else class="lista-eventos">
      <div v-for="evento in eventos" :key="evento.id_evento" class="tarjeta-evento">
        <div class="portada-contenedor">
          <img v-if="evento.url_portada" :src="evento.url_portada" class="portada-img" alt="Portada Evento" />
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
              Ver Detalles
            </button>
            <button class="btn-reservar" @click="reservarMesa(evento)">
              Reservar mesa
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
  padding: 1.5rem 1rem;
  padding-bottom: 80px; /* Espacio para el navbar bottom */
}

.header-mobile { margin-bottom: 1.5rem; }
.titulo-pagina { font-size: 1.8rem; font-weight: 800; color: var(--texto-principal); margin-bottom: 0.2rem; }
.subtitulo { font-size: 0.9rem; color: var(--texto-secundario); }

/* Cargando */
.cargando { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; gap: 1rem; color: var(--texto-secundario); }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

/* Vacio */
.estado-vacio { text-align: center; padding: 4rem 2rem; background: var(--fondo-tarjeta); border-radius: 20px; border: 1px dashed var(--borde-sutil); margin-top: 2rem; }
.icono-vacio { width: 64px; height: 64px; margin: 0 auto 1rem; color: var(--texto-desactivado); }
.estado-vacio h3 { margin-bottom: 0.5rem; color: var(--texto-principal); }
.estado-vacio p { font-size: 0.85rem; color: var(--texto-secundario); }

/* Error de carga */
.estado-error { text-align: center; padding: 4rem 2rem; background: var(--fondo-tarjeta); border-radius: 20px; border: 1px dashed var(--borde-sutil); margin-top: 2rem; }
.icono-error { width: 64px; height: 64px; margin: 0 auto 1rem; color: var(--rosa-acento); }
.estado-error h3 { margin-bottom: 0.5rem; color: var(--texto-principal); }
.estado-error p { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 1.2rem; }
.btn-reintentar {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(219,39,119,0.3);
  transition: transform 0.2s;
}
.btn-reintentar:active { transform: scale(0.98); }

/* Lista de Eventos */
.lista-eventos { display: flex; flex-direction: column; gap: 1.5rem; }

.tarjeta-evento {
  background: var(--fondo-tarjeta);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--borde-sutil);
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
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
}

.portada-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--fondo-tarjeta), var(--fondo-tarjeta));
  color: rgba(255,255,255,0.1);
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 5px;
}

.overlay-gradiente {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 80px;
  background: linear-gradient(to top, var(--fondo-app), transparent);
}

.fecha-badge {
  position: absolute;
  top: 15px; right: 15px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}
.fecha-badge .dia { font-size: 1.4rem; font-weight: 800; color: #fff; line-height: 1; }
.fecha-badge .mes { font-size: 0.7rem; font-weight: 600; color: var(--rosa-acento); letter-spacing: 1px; }

.info-evento {
  padding: 1.2rem;
}

.nombre { font-size: 1.2rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 0.4rem; }
.hora { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--morado-brillante); font-weight: 600; margin-bottom: 0.8rem; }
.hora-fin { color: var(--texto-secundario); margin-top: -0.4rem; }
.icono { width: 14px; height: 14px; }
.descripcion { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 1.2rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.acciones-evento { display: flex; gap: 10px; }
.btn-detalles {
  flex: 1;
  background: var(--fondo-tarjeta-alt, rgba(255,255,255,0.05));
  color: var(--texto-principal);
  border: 1px solid var(--borde-sutil);
  padding: 12px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  transition: transform 0.2s;
}
.btn-detalles:active { transform: scale(0.98); }
.btn-reservar {
  flex: 1.4;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(219,39,119,0.3);
  transition: transform 0.2s;
}
.btn-reservar:active { transform: scale(0.98); }
</style>
