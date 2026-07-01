<template>
  <div class="vista-detalle-evento fade-in">
    <div v-if="cargando" class="cargando">
      <div class="spinner"></div>
    </div>
    
    <div v-else-if="!evento" class="estado-vacio">
      <h3>Evento no encontrado</h3>
      <button class="btn btn-secundario" @click="router.push('/cliente/eventos')">Volver a la cartelera</button>
    </div>
    
    <div v-else class="contenido-detalle">
      <!-- Botón de regreso -->
      <button class="btn-regresar" @click="router.push('/cliente/eventos')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Volver
      </button>

      <!-- Portada Gigante Responsiva -->
      <div class="portada-full">
        <img v-if="evento.url_portada" :src="evento.url_portada" class="poster-img" alt="Poster del Evento" />
        <div v-else class="poster-placeholder">EUPHORIA</div>
        
        <!-- Etiqueta de estado sobre la imagen -->
        <div v-if="evento.estado" class="badge-activo-flotante">
          <span class="punto-vivo"></span>
          {{ evento.estado.toUpperCase() }}
        </div>

        <div class="overlay-gradiente-full"></div>
      </div>

      <!-- Información del Evento -->
      <div class="info-cuerpo">
        <h1 class="titulo-evento">{{ evento.nombre_evento }}</h1>
        
        <div class="meta-tags">
          <span class="tag-fecha">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {{ formatearFecha(evento.fecha_hora_inicio) }}
          </span>
        </div>

        <div class="tarjeta-cristal">
          <div class="seccion-descripcion">
            <h3>Sobre este evento</h3>
            <p>{{ evento.descripcion || 'Vive la mejor experiencia en EUPHORIA. Contamos con las mejores luces, sonido y ambiente de la ciudad.' }}</p>
          </div>
        </div>

        <!-- Selección de Espacio y Mesa -->
        <div v-if="zonas.length" class="seccion-espacios fade-in">
          <h3>1. Selecciona tu Zona</h3>
          <p class="subtexto-espacios">Elige dónde quieres estar esta noche.</p>

          <div class="opciones-espacio">
            <div
              v-for="zona in zonas"
              :key="zona.id_zona"
              class="opcion-tarjeta"
              :class="{ seleccionado: zonaSeleccionada && zonaSeleccionada.id_zona === zona.id_zona }"
              @click="seleccionarZona(zona)"
            >
              <div class="opcion-info">
                <h4 style="display:flex; align-items:center; gap: 6px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  {{ zona.nombre_zona }}
                </h4>
                <p v-if="zona.mesa_espacio && zona.mesa_espacio.length">Mesas exclusivas y atención preferencial</p>
                <p v-else>Acceso a pista principal (Sin mesa asignada)</p>
              </div>
              <div class="opcion-precio">Bs. {{ formatearMonto(zona.precio_entrada_base) }}</div>
            </div>
          </div>

          <!-- Mapa de Mesas de la zona seleccionada -->
          <div v-if="mesasDisponibles.length" class="seccion-mapa fade-in">
            <h3 style="margin-top: 1.5rem;">2. Elige tu Mesa</h3>
            <div class="mapa-mesas">
              <div
                v-for="mesa in mesasDisponibles"
                :key="mesa.id_mesa"
                class="mesa-item"
                :class="{
                  'mesa-ocupada': mesa.estado_ocupacion !== 'libre',
                  'mesa-seleccionada': mesaSeleccionada && mesaSeleccionada.id_mesa === mesa.id_mesa
                }"
                @click="seleccionarMesa(mesa)"
              >
                <span class="mesa-nombre">{{ mesa.numero_nombre }}</span>
                <span class="mesa-capacidad">{{ mesa.capacidad_sillas }} sillas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra Flotante de Reserva -->
      <div v-if="zonas.length" class="barra-reserva fade-in">
        <div class="reserva-info">
          <span class="reserva-texto">{{ textoReserva }}</span>
          <span class="reserva-precio">Total: Bs. {{ formatearMonto(totalReserva) }}</span>
        </div>
        <button
          class="btn-reservar-final"
          :class="{ 'btn-desactivado': !puedeReservar || reservando }"
          :disabled="!puedeReservar || reservando"
          @click="confirmarReserva"
        >
          {{ reservando ? 'Procesando...' : 'Ir a Pagar' }}
        </button>
      </div>


    </div>

    <!-- Modal de Resultado de la Reserva -->
    <Teleport to="body">
      <div v-if="modalResultado" class="modal-fondo" @click.self="modalResultado=false">
        <div class="modal fade-in" style="max-width: 400px; text-align: center;" :style="{ borderLeft: '4px solid ' + (reservaExitosa ? 'var(--color-exito)' : 'var(--color-error)') }">
          <div class="modal-cabecera" style="justify-content: center; border: none; padding-bottom: 0;">
            <svg v-if="reservaExitosa" viewBox="0 0 24 24" fill="none" stroke="var(--color-exito)" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 10px;">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 10px;">
              <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div style="padding: 1rem 1.5rem 1.5rem 1.5rem;">
            <h3 style="color: var(--texto-principal); margin-bottom: 10px;">{{ reservaExitosa ? 'Reserva Confirmada' : 'No se pudo reservar' }}</h3>
            <p style="color: var(--texto-secundario); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
              {{ mensajeResultado }}
            </p>
            <button
              class="btn btn-primario"
              style="width: 100%; color: #fff;"
              :style="{ background: reservaExitosa ? 'var(--color-exito)' : 'var(--color-error)' }"
              @click="modalResultado=false"
            >Entendido</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { servicioEventos } from '@/servicios-api/servicio-eventos.js'

const route = useRoute()
const router = useRouter()
const evento = ref(null)
const cargando = ref(true)

// Estado de la reserva
const zonaSeleccionada = ref(null)
const mesaSeleccionada = ref(null)
const reservando = ref(false)
const modalResultado = ref(false)
const reservaExitosa = ref(false)
const mensajeResultado = ref('')

// Zonas provenientes del backend (evento.zona[] con mesa_espacio[])
const zonas = computed(() => (evento.value && evento.value.zona) ? evento.value.zona : [])

// Mesas de la zona seleccionada (si la zona tiene mapa de mesas)
const mesasDisponibles = computed(() => {
  if (!zonaSeleccionada.value || !zonaSeleccionada.value.mesa_espacio) return []
  return zonaSeleccionada.value.mesa_espacio.filter(m => m.es_seleccionable !== false)
})

// Total a pagar segun la zona elegida
const totalReserva = computed(() => {
  if (!zonaSeleccionada.value) return 0
  return Number(zonaSeleccionada.value.precio_entrada_base) || 0
})

// Solo puede reservar si eligio zona y, cuando la zona tiene mesas, tambien una mesa
const puedeReservar = computed(() => {
  if (!zonaSeleccionada.value) return false
  if (mesasDisponibles.value.length > 0 && !mesaSeleccionada.value) return false
  return true
})

const textoReserva = computed(() => {
  if (!zonaSeleccionada.value) return 'Elige una zona para continuar'
  if (mesasDisponibles.value.length > 0 && !mesaSeleccionada.value) return 'Elige una mesa disponible'
  return zonaSeleccionada.value.nombre_zona
})

async function cargarDetalle() {
  cargando.value = true
  try {
    const id = route.params.id
    const data = await servicioEventos.obtenerDisponible(id)
    evento.value = data
  } catch (error) {
    console.error('Error:', error)
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarDetalle()
})

function formatearFecha(fechaStr) {
  if (!fechaStr) return ''
  const opciones = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
  return new Date(fechaStr).toLocaleDateString('es-ES', opciones)
}

function formatearMonto(monto) {
  return (Number(monto) || 0).toFixed(2)
}

function seleccionarZona(zona) {
  zonaSeleccionada.value = zona
  mesaSeleccionada.value = null
}

function seleccionarMesa(mesa) {
  if (mesa.estado_ocupacion !== 'libre') return
  mesaSeleccionada.value = mesa
}

async function confirmarReserva() {
  if (!puedeReservar.value || reservando.value) return
  reservando.value = true
  try {
    const tieneMesas = mesasDisponibles.value.length > 0
    const datos = {
      id_evento: evento.value.id_evento,
      id_zona: zonaSeleccionada.value.id_zona,
      id_mesa: mesaSeleccionada.value ? mesaSeleccionada.value.id_mesa : null,
      tipo: tieneMesas ? 'vip' : 'general'
    }
    const respuesta = await servicioEventos.reservarEspacio(datos)
    reservaExitosa.value = true
    mensajeResultado.value = (respuesta && respuesta.mensaje) || 'Reserva confirmada exitosamente.'
    // Marcar la mesa como reservada localmente para reflejar el cambio
    if (mesaSeleccionada.value) {
      mesaSeleccionada.value.estado_ocupacion = 'reservada'
      mesaSeleccionada.value = null
    }
  } catch (error) {
    reservaExitosa.value = false
    // El interceptor http rechaza con response.data directamente
    mensajeResultado.value = (error && error.error)
      || 'No se pudo procesar la reserva. Intenta nuevamente.'
  } finally {
    reservando.value = false
    modalResultado.value = true
  }
}
</script>

<style scoped>
.vista-detalle-evento {
  position: relative;
  min-height: 100vh;
  padding-bottom: 100px; /* Para la barra flotante */
}

/* Loader */
.cargando { display: flex; align-items: center; justify-content: center; height: 100vh; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

/* Vacio */
.estado-vacio { text-align: center; padding: 4rem 2rem; color: var(--texto-secundario); }

/* Contenido */
.btn-regresar {
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 50;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 16px 8px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-regresar svg { width: 18px; height: 18px; }

/* Portada Full */
.portada-full {
  position: relative;
  width: 100%;
  max-height: 70vh; /* No ocupar toda la pantalla, pero sí bastante */
  background: var(--fondo-app);
  display: flex;
  justify-content: center;
}

.poster-img {
  width: 100%;
  max-width: 600px; /* Para que en PC no sea inmenso */
  height: auto;
  max-height: 70vh;
  object-fit: contain; /* Para ver el poster vertical COMPLETO sin recortar */
}

.poster-placeholder {
  width: 100%;
  height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--fondo-tarjeta), var(--fondo-tarjeta));
  color: rgba(255,255,255,0.1);
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: 5px;
}

.overlay-gradiente-full {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 150px;
  background: linear-gradient(to top, var(--fondo-app), transparent);
}

/* Info Cuerpo */
.info-cuerpo {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  margin-top: -30px;
  position: relative;
  z-index: 10;
}

.titulo-evento {
  font-size: 2rem;
  font-weight: 800;
  color: var(--texto-principal);
  margin-bottom: 1rem;
  line-height: 1.2;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 2rem;
}

.tag-fecha {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.05);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--morado-brillante);
  border: 1px solid rgba(255,255,255,0.05);
}

/* Etiqueta Activo sobre la imagen (estilo LIVE) */
.badge-activo-flotante {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(46, 204, 113, 0.4);
  color: var(--color-exito);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  z-index: 10;
}

.punto-vivo {
  width: 8px;
  height: 8px;
  background: var(--color-exito);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--color-exito);
  animation: latido 1.5s infinite alternate;
}
@keyframes latido { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 1; } }

/* Tarjetas Cristal para el contenido */
.tarjeta-cristal {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 30px rgba(0,0,0,0.1);
}

.seccion-descripcion h3, .seccion-mapa h3, .seccion-espacios h3 {
  font-size: 1.1rem;
  color: var(--texto-principal);
  margin-bottom: 0.3rem;
}

.subtexto-espacios {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  margin-bottom: 1rem;
}

/* Opciones de Espacio */
.opciones-espacio {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.opcion-tarjeta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.2rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.opcion-tarjeta:hover {
  background: rgba(255,255,255,0.05);
}

.opcion-tarjeta.seleccionado {
  background: rgba(219,39,119,0.1);
  border-color: var(--rosa-acento);
  box-shadow: 0 4px 15px rgba(219,39,119,0.15);
}

.opcion-desactivada {
  background: rgba(255,255,255,0.01);
  border-color: rgba(255,255,255,0.03);
  cursor: not-allowed;
  opacity: 0.6;
}
.opcion-desactivada:hover {
  background: rgba(255,255,255,0.01) !important;
  transform: none !important;
  box-shadow: none !important;
}

.opcion-info h4 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin-bottom: 4px;
}

.opcion-info p {
  font-size: 0.8rem;
  color: var(--texto-secundario);
}

.opcion-precio {
  font-weight: 800;
  font-size: 1rem;
  color: var(--morado-brillante);
}

/* Mapa de Mesas VIP */
.mapa-mesas {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 15px;
}
.mesa-item {
  background: rgba(255,255,255,0.05);
  border: 1px dashed rgba(255,255,255,0.2);
  border-radius: 12px;
  padding: 15px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mesa-nombre {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--texto-principal);
}
.mesa-capacidad {
  font-size: 0.75rem;
  color: var(--texto-secundario);
}
.mesa-item:hover:not(.mesa-ocupada) { background: rgba(255,255,255,0.1); }
.mesa-item.mesa-seleccionada {
  background: var(--morado-brillante);
  border: 1px solid var(--morado-brillante);
  box-shadow: 0 4px 15px rgba(155, 89, 182, 0.4);
}
.mesa-item.mesa-seleccionada .mesa-nombre,
.mesa-item.mesa-seleccionada .mesa-capacidad {
  color: #fff;
}
.mesa-ocupada {
  background: rgba(255,0,0,0.05);
  border-color: rgba(255,0,0,0.2);
  cursor: not-allowed;
  opacity: 0.5;
}
.mesa-ocupada .mesa-nombre {
  text-decoration: line-through;
  color: var(--color-error);
}

.seccion-descripcion p {
  color: var(--texto-secundario);
  line-height: 1.6;
  font-size: 0.95rem;
}

.barra-reserva {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15,10,25,0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255,255,255,0.05);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 50;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}

.reserva-info {
  display: flex;
  flex-direction: column;
}

.reserva-texto { font-size: 0.8rem; color: var(--texto-secundario); }
.reserva-precio { font-size: 1.2rem; font-weight: 800; color: var(--texto-principal); }

.btn-reservar-final {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(219,39,119,0.3);
  transition: all 0.3s ease;
}
.btn-reservar-final:active { transform: scale(0.95); }

.btn-desactivado {
  background: rgba(255,255,255,0.1);
  color: var(--texto-desactivado);
  box-shadow: none;
  cursor: not-allowed;
  transform: scale(1) !important;
}

.resumen-pago {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
}

/* Modales */
.modal-fondo { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); width: 100%; box-shadow: var(--sombra-modal); }
</style>
