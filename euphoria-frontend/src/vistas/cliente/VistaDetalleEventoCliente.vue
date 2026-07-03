<template>
  <div class="vista-detalle-evento fade-in">
    <div v-if="cargando" class="cargando">
      <div class="spinner"></div>
    </div>
    
    <div v-else-if="!evento" class="estado-vacio aparecer-subir">
      <div class="estado-vacio-icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>
      </div>
      <h3>Evento no encontrado</h3>
      <p class="estado-vacio-texto">Puede que este evento ya no esté disponible o haya cambiado de fecha.</p>
      <button class="btn btn-secundario hover-crecer" @click="router.push('/cliente/eventos')">Volver a la cartelera</button>
    </div>
    
    <div v-else class="contenido-detalle entrada-cine">
      <!-- Orbes de neon ambientales -->
      <div class="orbe-deco morado orbe-a" aria-hidden="true"></div>
      <div class="orbe-deco rosa orbe-b" aria-hidden="true"></div>

      <!-- Botón de regreso -->
      <button class="btn-regresar" @click="router.push('/cliente/eventos')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>Volver</span>
      </button>

      <!-- HERO: poster enmarcado + panel de datos (bento asimetrico) -->
      <header class="hero-evento">
        <!-- Poster en marco tipo hardware (double-bezel) -->
        <div class="hero-media bezel hover-elevar">
          <div class="hero-media-core bezel-core textura-grano">
            <img v-if="evento.url_portada" :src="evento.url_portada" class="poster-img" alt="Poster del Evento" />
            <div v-else class="poster-placeholder">EUPHORIA</div>

            <!-- Etiqueta de estado sobre la imagen -->
            <div v-if="evento.estado" class="badge-activo-flotante">
              <span class="punto-vivo"></span>
              {{ evento.estado.replace(/_/g, ' ').toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- Panel de informacion -->
        <div class="hero-panel">
          <h1 class="titulo-evento">{{ evento.nombre_evento }}</h1>

          <div class="meta-tags">
            <span class="tag-fecha">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              {{ formatearFecha(evento.fecha_hora_inicio) }}
            </span>
          </div>

          <div class="tarjeta-cristal superficie textura-grano">
            <div class="seccion-descripcion">
              <h3><span class="deco-linea" aria-hidden="true"></span> Sobre este evento</h3>
              <p>{{ evento.descripcion || 'Vive la mejor experiencia en EUPHORIA. Contamos con las mejores luces, sonido y ambiente de la ciudad.' }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Selección de Espacio y Mesa -->
      <section v-if="zonas.length" class="seccion-espacios superficie textura-grano fade-in">
        <div class="espacios-cabecera">
          <h3><span class="paso-num">1</span> Selecciona tu zona</h3>
          <p class="subtexto-espacios">Elige dónde quieres estar esta noche.</p>
        </div>

        <div class="opciones-espacio escalonar">
          <div
            v-for="zona in zonas"
            :key="zona.id_zona"
            class="opcion-tarjeta"
            :class="{ seleccionado: zonaSeleccionada && zonaSeleccionada.id_zona === zona.id_zona }"
            @click="seleccionarZona(zona)"
          >
            <div class="opcion-info">
              <h4>
                <span class="opcion-icono" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                {{ zona.nombre_zona }}
              </h4>
              <p v-if="zona.mesa_espacio && zona.mesa_espacio.length">Mesas exclusivas y atención preferencial</p>
              <p v-else>Acceso a pista principal (Sin mesa asignada)</p>
            </div>
            <div class="opcion-precio">
              <span class="opcion-precio-moneda">Bs.</span>
              {{ formatearMonto(zona.precio_entrada_base) }}
            </div>
          </div>
        </div>

        <!-- Mapa de Mesas de la zona seleccionada -->
        <div v-if="mesasDisponibles.length" class="seccion-mapa fade-in">
          <h3 class="titulo-paso-2"><span class="paso-num">2</span> Elige tu mesa</h3>
          <div class="mapa-mesas escalonar">
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
      </section>

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
          <span class="reservar-label">{{ reservando ? 'Procesando…' : 'Ir a pagar' }}</span>
          <span class="reservar-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </span>
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
  min-height: 100dvh;
  padding-bottom: 120px; /* Para la barra flotante */
  overflow-x: clip;
}

.contenido-detalle {
  position: relative;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(3.5rem, 7vw, 5rem) clamp(1.1rem, 4vw, 2.5rem) 0;
}

/* Orbes ambientales */
.orbe-a { width: 460px; height: 460px; top: -140px; right: -120px; opacity: 0.28; }
.orbe-b { width: 380px; height: 380px; top: 40vh; left: -140px; opacity: 0.22; }

/* Loader */
.cargando { display: flex; align-items: center; justify-content: center; min-height: 100dvh; }
.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(168, 85, 247, 0.12);
  border-top-color: var(--morado-brillante);
  border-radius: 50%;
  animation: girar 0.9s var(--ease-suave) infinite;
  box-shadow: var(--glow-morado);
}
@keyframes girar { to { transform: rotate(360deg); } }

/* Vacio */
.estado-vacio {
  text-align: center;
  padding: 5rem 2rem;
  color: var(--texto-secundario);
  max-width: 420px;
  margin: 0 auto;
  min-height: 60dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.estado-vacio-icono {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin-bottom: var(--esp-5);
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-sutil);
  color: var(--morado-hover);
}
.estado-vacio-icono svg { width: 34px; height: 34px; }
.estado-vacio h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin-bottom: var(--esp-2);
  letter-spacing: -0.01em;
}
.estado-vacio-texto {
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--texto-secundario);
  margin-bottom: var(--esp-6);
  text-wrap: pretty;
}

/* Contenido */
.btn-regresar {
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 50;
  background: rgba(14, 8, 33, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  border: 1px solid var(--glass-borde);
  padding: 8px 16px 8px 12px;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(14, 8, 33, 0.5);
  transition: var(--trans-normal);
}
.btn-regresar:hover {
  background: rgba(168, 85, 247, 0.25);
  border-color: var(--borde-activo);
  transform: translateX(-2px);
}
.btn-regresar:hover svg { transform: translateX(-2px); }
.btn-regresar:active { transform: scale(0.96); }
.btn-regresar:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-regresar svg { width: 18px; height: 18px; transition: transform 0.2s var(--ease-suave); }

/* HERO: bento asimetrico (poster + panel) */
.hero-evento {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: clamp(1.5rem, 3.5vw, 3rem);
  align-items: start;
  margin-bottom: clamp(2rem, 5vw, 3.5rem);
}

/* Marco del poster (double-bezel) */
.hero-media {
  position: sticky;
  top: clamp(4.5rem, 8vw, 6rem);
  align-self: start;
}
.hero-media-core {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 340px;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(168, 85, 247, 0.16), transparent 60%),
    var(--gradiente-sutil);
}

.poster-img {
  width: 100%;
  height: auto;
  max-height: 74vh;
  display: block;
  object-fit: contain; /* Poster vertical completo sin recortar */
  position: relative;
  z-index: 1;
}

.poster-placeholder {
  width: 100%;
  min-height: 46vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(168, 85, 247, 0.3);
  font-family: var(--fuente-titulo);
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  font-weight: 900;
  letter-spacing: 0.14em;
  text-shadow: var(--glow-morado);
  position: relative;
  z-index: 1;
}

/* Panel de datos */
.hero-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: clamp(0.25rem, 2vw, 1.25rem);
}

.titulo-evento {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.55rem, 3.2vw, 1.9rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
  margin-bottom: var(--esp-4);
  text-wrap: balance;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: var(--esp-5);
}

.tag-fecha {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(168, 85, 247, 0.1);
  padding: 7px 15px;
  border-radius: var(--radio-full);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--morado-hover);
  border: 1px solid var(--borde-sutil);
  text-transform: capitalize;
  transition: var(--trans-normal);
}
.tag-fecha:hover { background: rgba(168, 85, 247, 0.16); border-color: var(--borde-activo); }
.tag-fecha .icono { width: 15px; height: 15px; flex-shrink: 0; opacity: 0.9; }

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

/* Tarjeta Cristal (descripción) — usa .superficie global */
.tarjeta-cristal {
  position: relative;
  width: 100%;
  padding: clamp(1.25rem, 3vw, 1.75rem);
}
.tarjeta-cristal > * { position: relative; z-index: 1; }

.seccion-descripcion h3, .seccion-mapa h3, .seccion-espacios h3 {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  font-family: var(--fuente-titulo);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
  margin-bottom: var(--esp-3);
}

/* Línea decorativa antes del título de descripción */
.deco-linea {
  width: 24px;
  height: 3px;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
  flex-shrink: 0;
}

/* Numero de paso: cuadro con gradiente de marca */
.paso-num {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: var(--radio-sm);
  background: var(--gradiente-marca);
  color: #fff;
  font-family: var(--fuente-titulo);
  font-size: 0.85rem;
  font-weight: 800;
  box-shadow: 0 3px 10px rgba(168, 85, 247, 0.4);
}

/* Sección de espacios como superficie amplia */
.seccion-espacios {
  position: relative;
  z-index: 1;
  padding: clamp(1.4rem, 3.5vw, 2.5rem);
  margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}
.seccion-espacios > * { position: relative; z-index: 1; }

.espacios-cabecera { margin-bottom: var(--esp-5); }
.espacios-cabecera h3 { font-size: 1.35rem; }

.titulo-paso-2 { margin-top: var(--esp-6); }

.subtexto-espacios {
  font-size: 0.9rem;
  color: var(--texto-secundario);
  margin-top: var(--esp-2);
  margin-bottom: 0;
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
  gap: var(--esp-4);
  padding: var(--esp-4) var(--esp-5);
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  cursor: pointer;
  transition: transform 0.25s var(--ease-suave), border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}

.opcion-tarjeta:hover {
  border-color: var(--borde-activo);
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
}
.opcion-tarjeta:active { transform: scale(0.99); }
.opcion-tarjeta:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.opcion-tarjeta.seleccionado {
  background: rgba(236, 72, 153, 0.12);
  border-color: var(--rosa-acento);
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.2), var(--glow-rosa);
}
.opcion-tarjeta.seleccionado:hover { transform: translateY(-2px); }

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
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--fuente-titulo);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin-bottom: 5px;
}

/* Icono en circulo (candado) dentro de la zona */
.opcion-icono {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid var(--borde-sutil);
  color: var(--morado-hover);
  transition: var(--trans-normal);
}
.opcion-tarjeta.seleccionado .opcion-icono {
  background: rgba(236, 72, 153, 0.2);
  border-color: var(--rosa-acento);
  color: var(--rosa-suave);
}

.opcion-info p {
  font-size: 0.82rem;
  color: var(--texto-secundario);
}

.opcion-precio {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--morado-hover);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-align: right;
  letter-spacing: -0.02em;
}
.opcion-precio-moneda {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--texto-secundario);
  margin-right: 2px;
  vertical-align: 0.15em;
}

/* Mapa de Mesas VIP */
.mapa-mesas {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 15px;
}
.mesa-item {
  background: var(--fondo-tarjeta-alt);
  border: 1px dashed var(--borde-sutil);
  border-radius: var(--radio-md);
  padding: 15px 10px;
  text-align: center;
  cursor: pointer;
  transition: var(--trans-normal);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mesa-nombre {
  font-family: var(--fuente-titulo);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--texto-principal);
}
.mesa-capacidad {
  font-size: 0.75rem;
  color: var(--texto-secundario);
  font-variant-numeric: tabular-nums;
}
.mesa-item:hover:not(.mesa-ocupada) { border-color: var(--borde-activo); transform: translateY(-2px); border-style: solid; }
.mesa-item:not(.mesa-ocupada):active { transform: scale(0.96); }
.mesa-item:focus-visible { outline: none; box-shadow: var(--anillo-foco); border-color: var(--borde-activo); }
.mesa-item.mesa-seleccionada {
  background: var(--gradiente-marca);
  border: 1px solid transparent;
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.4), var(--glow-morado);
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
  background: var(--fondo-navbar);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-top: 1px solid var(--borde-sutil);
  padding: var(--esp-4) clamp(1.1rem, 4vw, 2.5rem);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-4);
  z-index: 50;
  padding-bottom: calc(var(--esp-4) + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 40px rgba(10, 6, 26, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.barra-reserva::before {
  content: '';
  position: absolute;
  top: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--borde-activo), transparent);
  opacity: 0.7;
}
.barra-reserva > * {
  max-width: 1120px;
}
.barra-reserva .reserva-info { flex: 1; margin-left: max(0px, calc((100vw - 1120px) / 2)); }
.barra-reserva .btn-reservar-final { margin-right: max(0px, calc((100vw - 1120px) / 2)); }

.reserva-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.reserva-texto { font-size: 0.8rem; color: var(--texto-secundario); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px; }
.reserva-precio { font-family: var(--fuente-titulo); font-size: 1.25rem; font-weight: 800; color: var(--texto-principal); letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }

.btn-reservar-final {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(120deg, var(--morado-medio) 0%, var(--morado-brillante) 35%, var(--rosa-acento) 62%, var(--morado-brillante) 88%, var(--morado-medio) 100%);
  background-size: 220% 100%;
  color: #fff;
  border: none;
  padding: 12px 12px 12px 26px;
  border-radius: var(--radio-full);
  font-family: var(--fuente-titulo);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  box-shadow: 0 10px 26px rgba(168, 85, 247, 0.4);
  cursor: pointer;
  transition: transform 0.35s var(--ease-suave), box-shadow 0.35s var(--ease-suave), background-position 0.6s var(--ease-suave);
  white-space: nowrap;
}
.reservar-icono {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: transform 0.35s var(--ease-suave);
}
.reservar-icono svg { width: 17px; height: 17px; }
.btn-reservar-final:hover:not(.btn-desactivado) {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: 0 16px 36px rgba(236, 72, 153, 0.5), var(--glow-morado);
}
.btn-reservar-final:hover:not(.btn-desactivado) .reservar-icono { transform: translateX(3px) translateY(-1px) scale(1.06); }
.btn-reservar-final:active:not(.btn-desactivado) { transform: scale(0.96); }
.btn-reservar-final:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.btn-desactivado {
  background: rgba(168, 85, 247, 0.12);
  color: var(--texto-desactivado);
  box-shadow: none;
  cursor: not-allowed;
  transform: scale(1) !important;
}
.btn-desactivado .reservar-icono { background: rgba(255, 255, 255, 0.06); }

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
.modal-fondo { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); width: 100%; box-shadow: var(--sombra-modal), inset 0 1px 0 rgba(255, 255, 255, 0.06); }

/* ===== Responsivo ===== */
@media (max-width: 860px) {
  .hero-evento {
    grid-template-columns: 1fr;
    gap: clamp(1.25rem, 5vw, 2rem);
  }
  .hero-media {
    position: static;
    max-width: 440px;
    width: 100%;
    margin: 0 auto;
  }
  .hero-panel { align-items: stretch; }
}

@media (max-width: 480px) {
  .contenido-detalle {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .titulo-paso-2 { margin-top: var(--esp-5); }
  .mapa-mesas { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .barra-reserva { padding: var(--esp-3) var(--esp-4); padding-bottom: calc(var(--esp-3) + env(safe-area-inset-bottom)); }
  .btn-reservar-final { padding: 11px 11px 11px 20px; font-size: 0.92rem; }
  .reserva-precio { font-size: 1.1rem; }
}

/* Respeta la preferencia de menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 1.5s; }
  .punto-vivo { animation: none; }
  .escalonar > * { animation: none !important; }
  .btn-regresar,
  .btn-regresar svg,
  .opcion-tarjeta,
  .mesa-item,
  .btn-reservar-final,
  .tag-fecha { transition-duration: 0.01ms; }
  .btn-regresar:hover,
  .opcion-tarjeta:hover,
  .mesa-item:hover:not(.mesa-ocupada),
  .btn-reservar-final:hover:not(.btn-desactivado) { transform: none; }
}
</style>
