<template>
  <div class="vista-detalle-evento">
    <div v-if="cargando" class="cargando">
      <div class="spinner"></div>
    </div>

    <div v-else-if="!evento" class="estado-vacio aparecer-subir">
      <div class="estado-vacio-icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>
      </div>
      <h3>{{ errorCarga ? 'No pudimos cargar el evento' : 'Evento no encontrado' }}</h3>
      <p class="estado-vacio-texto">{{ errorCarga ? 'Revisa tu conexión e intenta de nuevo.' : 'Puede que este evento ya no esté disponible o haya cambiado de fecha.' }}</p>
      <button v-if="errorCarga" class="btn btn-primario hover-crecer" @click="cargarDetalle">Reintentar</button>
      <button class="btn btn-secundario hover-crecer" @click="router.push('/cliente/eventos')">Volver a la cartelera</button>
    </div>

    <div v-else class="contenido-detalle">
      <!-- Volver: en flujo normal, siempre visible arriba -->
      <button class="btn-volver" @click="volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>Volver</span>
      </button>

      <!-- Héroe: poster completo sobre un fondo difuminado (no recorta la imagen) -->
      <header class="hero">
        <div v-if="evento.url_portada && !imgLista" class="hero-skeleton" aria-hidden="true"></div>
        <img v-if="evento.url_portada" :src="evento.url_portada" class="hero-bg" aria-hidden="true" alt="" />
        <img
          v-if="evento.url_portada"
          :src="evento.url_portada"
          class="hero-img"
          :class="{ lista: imgLista }"
          alt="Poster del evento"
          @load="imgLista = true"
          @click="abrirVisor"
        />
        <div v-else class="hero-placeholder">EUPHORIA</div>
        <div class="hero-velo" aria-hidden="true"></div>

        <!-- Pista visual: la imagen se puede ampliar (abre el visor/lightbox) -->
        <button
          v-if="evento.url_portada"
          type="button"
          class="hero-zoom"
          aria-label="Ampliar imagen a pantalla completa"
          @click.stop="abrirVisor"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          <span>Ampliar</span>
        </button>

        <div v-if="evento.estado" class="badge-estado" :class="{ agotado: evento.estado === 'lleno' }">
          <span v-if="evento.estado !== 'lleno'" class="punto-vivo"></span>
          {{ etiquetaEstado(evento.estado) }}
        </div>
      </header>

      <!-- Cuerpo: apilado en móvil, dos columnas en escritorio -->
      <div class="cuerpo">
        <section class="col-info">
          <span class="eyebrow">Euphoria presenta</span>
          <h1 class="titulo-evento">{{ evento.nombre_evento }}</h1>

          <span class="tag-fecha">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {{ formatearFecha(evento.fecha_hora_inicio) }}
          </span>

          <div class="tarjeta-descripcion">
            <h3><span class="deco-linea" aria-hidden="true"></span> Sobre este evento</h3>
            <p>{{ evento.descripcion || 'Vive la mejor experiencia en EUPHORIA. Contamos con las mejores luces, sonido y ambiente de la ciudad.' }}</p>
          </div>
        </section>

        <aside v-if="zonas.length" class="col-zonas">
          <div class="zonas-cabecera">
            <h3><span class="deco-linea" aria-hidden="true"></span> Zonas y precios</h3>
            <p class="sub-zonas">Elige tu lugar exacto en el mapa.</p>
          </div>

          <div class="lista-zonas">
            <div v-for="zona in zonas" :key="zona.id_zona" class="opcion-tarjeta">
              <span class="opcion-icono" aria-hidden="true">
                <svg v-if="zona.es_general" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <svg v-else viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><rect x="4" y="6" width="16" height="5" rx="1.5"></rect><line x1="7" y1="11" x2="7" y2="19"></line><line x1="17" y1="11" x2="17" y2="19"></line></svg>
              </span>
              <div class="opcion-info">
                <h4>{{ zona.nombre_zona }}</h4>
                <p v-if="mesasLibresDe(zona) > 0" class="disp-chip ok">{{ mesasLibresDe(zona) }} mesa(s) libre(s)</p>
                <p v-else-if="(zona.mesa_espacio || []).some(m => m.tipo_elemento === 'mesa')" class="disp-chip fin">Mesas agotadas en esta zona</p>
                <p v-else class="disp-chip">Acceso a pista principal (de pie)</p>
              </div>
              <div class="opcion-precio">
                <span class="opcion-precio-moneda">Bs.</span>
                {{ formatearMonto(zona.precio_entrada_base) }}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Grupo grande: el cliente solicita lugares tentativos y el local confirma -->
      <button v-if="zonas.length && evento.estado !== 'lleno'" class="enlace-grupo" @click="router.push(`/cliente/grupo/${evento.id_evento}`)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>¿Vienen en grupo grande? <b>Solicita tus lugares</b></span>
      </button>

      <!-- Barra de reserva: sticky DENTRO del contenido, por encima del navbar del cliente -->
      <div v-if="zonas.length" class="barra-reserva">
        <div class="reserva-info">
          <span class="reserva-texto">{{ evento.estado === 'lleno' ? 'Aforo completo' : 'Elige tu mesa en el mapa' }}</span>
          <span class="reserva-precio">Desde Bs. {{ formatearMonto(precioDesde) }}</span>
        </div>
        <button
          class="btn-reservar-final"
          :class="{ 'btn-desactivado': evento.estado === 'lleno' }"
          :disabled="evento.estado === 'lleno'"
          @click="irAlMapa"
        >
          <span class="reservar-label">{{ evento.estado === 'lleno' ? 'Agotado' : 'Reservar en el mapa' }}</span>
          <span class="reservar-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </span>
        </button>
      </div>
    </div>

    <!-- Visor / Lightbox: imagen a pantalla completa, sin bordes difuminados,
         con zoom (pinch + botones), desplazamiento al ampliar y cierre claro. -->
    <Teleport to="body">
      <transition name="visor-anim">
        <div
          v-if="visorAbierto && evento && evento.url_portada"
          class="visor"
          role="dialog"
          aria-modal="true"
          aria-label="Imagen del evento a pantalla completa"
        >
          <button type="button" class="visor-cerrar" aria-label="Cerrar visor" @click="cerrarVisor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>
          </button>

          <div
            class="visor-lienzo"
            @click.self="cerrarVisor"
            @pointerdown="alPuntearAbajo"
            @pointermove="alPuntearMover"
            @pointerup="alPuntearArriba"
            @pointercancel="alPuntearArriba"
            @wheel.prevent="alRodar"
            @dblclick="alDobleClic"
          >
            <img
              ref="visorImg"
              :src="evento.url_portada"
              class="visor-img"
              :class="{ ampliada: escala > 1, animando: sinArrastre }"
              :style="{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${escala})` }"
              alt="Poster del evento a pantalla completa"
              draggable="false"
            />
          </div>

          <div class="visor-controles" role="group" aria-label="Controles de zoom">
            <button type="button" aria-label="Alejar" :disabled="escala <= ESCALA_MIN" @click="zoomVisor(-0.5)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="6" y1="12" x2="18" y2="12"></line></svg>
            </button>
            <span class="visor-nivel">{{ Math.round(escala * 100) }}%</span>
            <button type="button" aria-label="Acercar" :disabled="escala >= ESCALA_MAX" @click="zoomVisor(0.5)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="6" x2="12" y2="18"></line><line x1="6" y1="12" x2="18" y2="12"></line></svg>
            </button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { servicioEventos } from '@/servicios-api/servicio-eventos.js'

const route = useRoute()
const router = useRouter()
const evento = ref(null)
const cargando = ref(true)
const errorCarga = ref(false)
// UI: el poster se revela con opacidad cuando termina de cargar (cero layout shift)
const imgLista = ref(false)

// Zonas provenientes del backend (evento.zona[] con mesa_espacio[])
const zonas = computed(() => (evento.value && evento.value.zona) ? evento.value.zona : [])

// Estados internos → etiquetas para el CLIENTE
const ETIQUETAS_ESTADO = { promocion: 'Entradas a la venta', en_transcurso: 'En vivo', lleno: 'Agotado' }
function etiquetaEstado(e) { return ETIQUETAS_ESTADO[e] || e.replace(/_/g, ' ') }

// Mesas libres reservables de una zona (mismo criterio que el flujo real de reservas)
function mesasLibresDe(zona) {
  return (zona.mesa_espacio || []).filter(m =>
    (m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') &&
    m.es_seleccionable !== false && m.estado_ocupacion === 'libre'
  ).length
}

// "Desde Bs X": el menor precio real entre mesas con precio propio y bases de zona
const precioDesde = computed(() => {
  let min = Infinity
  for (const z of zonas.value) {
    for (const m of (z.mesa_espacio || [])) {
      if ((m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') && m.es_seleccionable !== false) {
        const p = Number(m.precio != null ? m.precio : z.precio_entrada_base)
        if (p >= 0 && p < min) min = p
      }
    }
    if (z.es_general && Number(z.precio_entrada_base) < min) min = Number(z.precio_entrada_base)
  }
  return min === Infinity ? 0 : min
})

// ===== Visor / Lightbox de la portada =====
// Abre la imagen a pantalla completa (sin bordes difuminados) con zoom y arrastre.
const ESCALA_MIN = 1
const ESCALA_MAX = 4
const visorAbierto = ref(false)
const escala = ref(1)
const offset = ref({ x: 0, y: 0 })
const sinArrastre = ref(true) // true = transición suave; false = seguir el dedo sin lag
const visorImg = ref(null)

// Punteros activos para gestionar arrastre (1 dedo) y pinch-zoom (2 dedos)
const punteros = new Map()
let pinchInicial = 0
let escalaInicial = 1
let arrastreActivo = false
let arrastreInicio = { x: 0, y: 0 }
let offsetInicio = { x: 0, y: 0 }

function fijar(valor, min, max) { return Math.min(max, Math.max(min, valor)) }

function abrirVisor() {
  if (!evento.value?.url_portada) return
  reiniciarTransformacion()
  visorAbierto.value = true
}
function cerrarVisor() {
  visorAbierto.value = false
}
function reiniciarTransformacion() {
  sinArrastre.value = true
  escala.value = 1
  offset.value = { x: 0, y: 0 }
}

// Límite de desplazamiento para que la imagen no se escape de la pantalla
function limitarOffset() {
  const el = visorImg.value
  if (!el) return
  const maxX = (el.offsetWidth * (escala.value - 1)) / 2
  const maxY = (el.offsetHeight * (escala.value - 1)) / 2
  offset.value = {
    x: fijar(offset.value.x, -maxX, maxX),
    y: fijar(offset.value.y, -maxY, maxY),
  }
}
function aplicarEscala(nueva) {
  escala.value = fijar(nueva, ESCALA_MIN, ESCALA_MAX)
  if (escala.value <= ESCALA_MIN) offset.value = { x: 0, y: 0 }
  else limitarOffset()
}
function zoomVisor(delta) {
  sinArrastre.value = true
  aplicarEscala(escala.value + delta)
}
function alDobleClic() {
  sinArrastre.value = true
  if (escala.value > ESCALA_MIN) reiniciarTransformacion()
  else aplicarEscala(2.5)
}
function alRodar(e) {
  sinArrastre.value = true
  aplicarEscala(escala.value + (e.deltaY < 0 ? 0.35 : -0.35))
}

function alPuntearAbajo(e) {
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY })
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
  if (punteros.size === 2) {
    const [a, b] = [...punteros.values()]
    pinchInicial = Math.hypot(a.x - b.x, a.y - b.y)
    escalaInicial = escala.value
    arrastreActivo = false
  } else {
    arrastreActivo = escala.value > ESCALA_MIN
    arrastreInicio = { x: e.clientX, y: e.clientY }
    offsetInicio = { ...offset.value }
  }
  sinArrastre.value = false
}
function alPuntearMover(e) {
  if (!punteros.has(e.pointerId)) return
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (punteros.size === 2 && pinchInicial > 0) {
    const [a, b] = [...punteros.values()]
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    aplicarEscala(escalaInicial * (dist / pinchInicial))
  } else if (arrastreActivo && punteros.size === 1) {
    offset.value = {
      x: offsetInicio.x + (e.clientX - arrastreInicio.x),
      y: offsetInicio.y + (e.clientY - arrastreInicio.y),
    }
    limitarOffset()
  }
}
function alPuntearArriba(e) {
  punteros.delete(e.pointerId)
  if (punteros.size < 2) pinchInicial = 0
  if (punteros.size === 1) {
    // Al soltar un dedo del pinch, continúa el arrastre con el que queda
    const restante = [...punteros.values()][0]
    arrastreActivo = escala.value > ESCALA_MIN
    arrastreInicio = { x: restante.x, y: restante.y }
    offsetInicio = { ...offset.value }
  } else if (punteros.size === 0) {
    arrastreActivo = false
    sinArrastre.value = true
  }
}

function alTeclaVisor(e) {
  if (e.key === 'Escape') cerrarVisor()
  else if (e.key === '+' || e.key === '=') zoomVisor(0.4)
  else if (e.key === '-' || e.key === '_') zoomVisor(-0.4)
}

// Bloquea el scroll de fondo y escucha teclado sólo mientras el visor está abierto
watch(visorAbierto, (abierto) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = abierto ? 'hidden' : ''
  if (abierto) window.addEventListener('keydown', alTeclaVisor)
  else {
    window.removeEventListener('keydown', alTeclaVisor)
    punteros.clear()
  }
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  window.removeEventListener('keydown', alTeclaVisor)
})

// La reserva REAL (mapa interactivo + pago con billetera + QR) vive en /cliente/reservar
function irAlMapa() {
  router.push(`/cliente/reservar/${evento.value.id_evento}`)
}

function volver() {
  router.back()
}

async function cargarDetalle() {
  cargando.value = true
  errorCarga.value = false
  imgLista.value = false
  try {
    const id = route.params.id
    const data = await servicioEventos.obtenerDisponible(id)
    evento.value = data
  } catch (error) {
    // 404/403 = evento no disponible; otros errores = problema de red/servidor
    if (error?.__status && error.__status !== 404 && error.__status !== 403) errorCarga.value = true
    else if (!error?.__status) errorCarga.value = true
    evento.value = null
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
</script>

<style scoped>
/* Todo en flujo normal dentro del scroll del layout del cliente.
   Nada fixed: el navbar superior y la píldora inferior nunca tapan nada. */
.vista-detalle-evento {
  min-width: 0;
  /* Colchón inferior: la barra de reserva sticky levita ~150px sobre el final;
     sin este espacio tapaba la última tarjeta al llegar al fondo. */
  padding: var(--esp-4) var(--esp-4) calc(170px + env(safe-area-inset-bottom));
  max-width: 1060px;
  margin: 0 auto;
}

.contenido-detalle {
  min-width: 0;
  animation: aparecerSuave 0.35s ease both;
}
@keyframes aparecerSuave { from { opacity: 0; } to { opacity: 1; } }

/* Loader */
.cargando { display: flex; align-items: center; justify-content: center; min-height: 50dvh; }
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

/* Vacío */
.estado-vacio {
  text-align: center;
  padding: 5rem 2rem;
  color: var(--texto-secundario);
  max-width: 420px;
  margin: 0 auto;
  min-height: 50dvh;
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
.estado-vacio .btn { margin-bottom: var(--esp-3); }

/* Volver: en flujo, arriba del héroe */
.btn-volver {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--fondo-tarjeta);
  color: var(--texto-principal);
  border: 1px solid var(--borde-sutil);
  padding: 8px 16px 8px 12px;
  border-radius: var(--radio-full);
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  margin-bottom: var(--esp-4);
  transition: var(--trans-normal);
}
.btn-volver:hover {
  background: var(--fondo-tarjeta-alt);
  border-color: var(--borde-activo);
}
.btn-volver:hover svg { transform: translateX(-2px); }
.btn-volver:active { transform: scale(0.96); }
.btn-volver:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-volver svg { width: 17px; height: 17px; transition: transform 0.2s var(--ease-suave); }

/* Héroe: muestra el poster COMPLETO (contain) sobre un fondo difuminado
   de la misma imagen, así no se recorta sea vertical, cuadrado u horizontal. */
.hero {
  position: relative;
  width: 100%;
  height: clamp(300px, 46vw, 460px);
  max-height: 60vh;
  border-radius: var(--radio-xl);
  overflow: hidden;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  box-shadow: var(--sombra-tarjeta);
  margin-bottom: var(--esp-5);
}
.hero-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  filter: blur(26px) brightness(0.45) saturate(1.2);
  transform: scale(1.15);
  pointer-events: none;
}

.hero-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, rgba(139,92,246,0.08) 30%, rgba(168,85,247,0.2) 50%, rgba(139,92,246,0.08) 70%);
  background-size: 200% 100%;
  animation: shimmerPoster 1.4s ease-in-out infinite;
}
@keyframes shimmerPoster { to { background-position: -200% 0; } }

.hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  opacity: 0;
  transition: opacity 0.45s ease;
}
.hero-img.lista { opacity: 1; }
.hero-img { cursor: zoom-in; }

/* Pista "Ampliar": chip sutil en el héroe que invita a abrir el visor */
.hero-zoom {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px 7px 10px;
  background: rgba(10, 6, 26, 0.82);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-full);
  color: #fff;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: zoom-in;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  transition: transform 0.25s var(--ease-suave), background 0.25s ease, border-color 0.25s ease;
}
.hero-zoom svg { width: 15px; height: 15px; }
.hero-zoom:hover {
  transform: translateY(-1px);
  background: rgba(20, 12, 46, 0.92);
  border-color: var(--borde-activo);
}
.hero-zoom:active { transform: scale(0.95); }
.hero-zoom:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.hero-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(168, 85, 247, 0.3);
  font-family: var(--fuente-titulo);
  font-size: clamp(2rem, 6vw, 3.2rem);
  font-weight: 900;
  letter-spacing: 0.14em;
  text-shadow: var(--glow-morado);
}

.hero-velo {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(14, 8, 33, 0.55) 0%, transparent 40%);
  pointer-events: none;
}

/* Estado sobre el héroe (fondo sólido, sin blur) */
.badge-estado {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(10, 6, 26, 0.88);
  border: 1px solid rgba(46, 204, 113, 0.4);
  color: var(--color-exito);
  padding: 6px 14px;
  border-radius: var(--radio-full);
  font-size: 0.78rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.06em;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
}
.badge-estado.agotado {
  border-color: rgba(239, 68, 68, 0.45);
  color: var(--color-error);
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

/* Cuerpo: apilado en móvil, dos columnas en escritorio */
.cuerpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--esp-5);
  min-width: 0;
}

.col-info,
.col-zonas { min-width: 0; }

.col-info { display: flex; flex-direction: column; align-items: flex-start; }
.col-info .eyebrow { margin-bottom: var(--esp-3); }

.titulo-evento {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.025em;
  color: var(--texto-principal);
  margin-bottom: var(--esp-4);
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.tag-fecha {
  display: inline-flex;
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
  margin-bottom: var(--esp-5);
  max-width: 100%;
}
.tag-fecha .icono { width: 15px; height: 15px; flex-shrink: 0; opacity: 0.9; }

/* Descripción (fondo sólido) */
.tarjeta-descripcion {
  width: 100%;
  padding: clamp(1.1rem, 3vw, 1.6rem);
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), var(--sombra-tarjeta);
}

.tarjeta-descripcion h3,
.zonas-cabecera h3 {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  font-family: var(--fuente-titulo);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
  margin-bottom: var(--esp-3);
}
.tarjeta-descripcion p {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--texto-secundario);
  overflow-wrap: anywhere;
}

.deco-linea {
  width: 24px;
  height: 3px;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
  flex-shrink: 0;
}

/* Zonas y precios */
.zonas-cabecera { margin-bottom: var(--esp-4); }
.zonas-cabecera h3 { margin-bottom: var(--esp-1); }
.sub-zonas {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  margin: 0;
}

.lista-zonas {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opcion-tarjeta {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  min-width: 0;
  padding: var(--esp-4);
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.opcion-tarjeta:hover {
  border-color: var(--borde-activo);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
}

.opcion-icono {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 13px;
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid var(--borde-sutil);
  color: var(--morado-hover);
}
.opcion-icono svg { width: 19px; height: 19px; }

.opcion-info { flex: 1; min-width: 0; }
.opcion-info h4 {
  font-family: var(--fuente-titulo);
  font-size: 1rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disp-chip {
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--texto-secundario);
  padding: 3px 10px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-sutil);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.disp-chip.ok { color: #4ADE80; background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.28); }
.disp-chip.fin { color: #F87171; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.28); }

.opcion-precio {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--morado-hover);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-align: right;
  letter-spacing: -0.02em;
}
.opcion-precio-moneda {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--texto-secundario);
  margin-right: 2px;
  vertical-align: 0.15em;
}

.enlace-grupo { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; margin-bottom: 12px; border-radius: 12px; border: 1px dashed var(--borde-activo); background: rgba(168,85,247,0.06); color: var(--texto-secundario); font-size: 0.86rem; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
.enlace-grupo:hover { background: rgba(168,85,247,0.12); border-color: var(--morado-brillante); }
.enlace-grupo svg { width: 20px; height: 20px; flex-shrink: 0; color: var(--morado-hover); }
.enlace-grupo b { color: var(--texto-principal); }

/* Barra de reserva: sticky dentro del contenido. Se pega por ENCIMA de la
   píldora de navegación del cliente (fixed abajo), sin taparla ni ser tapada. */
.barra-reserva {
  position: sticky;
  bottom: calc(88px + env(safe-area-inset-bottom));
  z-index: 20;
  margin-top: var(--esp-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--esp-3);
  padding: var(--esp-3) var(--esp-4);
  background: var(--fondo-sidebar);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  box-shadow: 0 -6px 24px rgba(10, 6, 26, 0.5), 0 14px 34px rgba(10, 6, 26, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
/* En escritorio va al final del contenido (no sticky): el sticky se montaba
   encima de "Sobre este evento". La píldora de navegación no la tapa aquí. */
@media (min-width: 700px) {
  .barra-reserva { position: static; bottom: auto; z-index: 1; }
}

.reserva-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.reserva-texto {
  font-size: 0.78rem;
  color: var(--texto-secundario);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}
.reserva-precio {
  font-family: var(--fuente-titulo);
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--texto-principal);
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.btn-reservar-final {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(120deg, var(--morado-medio) 0%, var(--morado-brillante) 35%, var(--rosa-acento) 62%, var(--morado-brillante) 88%, var(--morado-medio) 100%);
  background-size: 220% 100%;
  color: #fff;
  border: none;
  padding: 11px 12px 11px 22px;
  border-radius: var(--radio-full);
  font-family: var(--fuente-titulo);
  font-size: 0.95rem;
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
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: transform 0.35s var(--ease-suave);
}
.reservar-icono svg { width: 16px; height: 16px; }
.btn-reservar-final:hover:not(.btn-desactivado) {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: 0 16px 36px rgba(236, 72, 153, 0.5), var(--glow-morado);
}
.btn-reservar-final:hover:not(.btn-desactivado) .reservar-icono { transform: translateX(3px); }
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

/* ===== Responsivo ===== */
/* En pantallas angostas el botón ocupa todo el ancho de la barra */
@media (max-width: 480px) {
  .vista-detalle-evento { padding: var(--esp-3) var(--esp-4) calc(170px + env(safe-area-inset-bottom)); }
  .btn-reservar-final { flex: 1 1 100%; }
  .barra-reserva { padding: var(--esp-3); }
}

/* Escritorio: info a la izquierda, zonas/precios a la derecha */
@media (min-width: 900px) {
  .cuerpo {
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    gap: var(--esp-6);
    align-items: start;
  }
}

/* Con la píldora de navegación más grande y elevada en escritorio */
@media (min-width: 1025px) {
  .barra-reserva { bottom: 106px; }
}

/* ===== Visor / Lightbox de la portada =====
   Teleport a <body>: cubre TODA la pantalla por encima del navbar del cliente.
   Muestra la imagen limpia (sin bordes difuminados) con zoom y desplazamiento. */
.visor {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  flex-direction: column;
  background: rgba(6, 3, 16, 0.94);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  touch-action: none;
  overscroll-behavior: contain;
}

.visor-lienzo {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
}

.visor-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  cursor: zoom-in;
  will-change: transform;
  transform-origin: center center;
}
.visor-img.animando { transition: transform 0.28s var(--ease-suave); }
.visor-img.ampliada { cursor: grab; }
.visor-img.ampliada:active { cursor: grabbing; }

/* Cerrar: X clara, siempre arriba a la derecha */
.visor-cerrar {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 14px);
  right: calc(env(safe-area-inset-right) + 14px);
  z-index: 2;
  width: 46px;
  height: 46px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--radio-full);
  background: rgba(20, 12, 46, 0.82);
  border: 1px solid var(--borde-sutil);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
  transition: transform 0.25s var(--ease-suave), background 0.25s ease, border-color 0.25s ease;
}
.visor-cerrar svg { width: 22px; height: 22px; }
.visor-cerrar:hover { background: rgba(236, 72, 153, 0.28); border-color: var(--borde-activo); transform: rotate(90deg); }
.visor-cerrar:active { transform: scale(0.92); }
.visor-cerrar:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

/* Controles de zoom: píldora flotante centrada abajo */
.visor-controles {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 20px);
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: rgba(20, 12, 46, 0.82);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-full);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.visor-controles button {
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--radio-full);
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s var(--ease-suave);
}
.visor-controles button svg { width: 20px; height: 20px; }
.visor-controles button:hover:not(:disabled) { background: rgba(168, 85, 247, 0.28); }
.visor-controles button:active:not(:disabled) { transform: scale(0.9); }
.visor-controles button:disabled { opacity: 0.35; cursor: not-allowed; }
.visor-controles button:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.visor-nivel {
  min-width: 52px;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

/* Animación de entrada/salida del visor */
.visor-anim-enter-active,
.visor-anim-leave-active { transition: opacity 0.28s ease; }
.visor-anim-enter-from,
.visor-anim-leave-to { opacity: 0; }
.visor-anim-enter-active .visor-img { transition: transform 0.32s var(--ease-suave); }
.visor-anim-enter-from .visor-img { transform: scale(0.9); }

@media (max-width: 480px) {
  .visor-cerrar { width: 42px; height: 42px; }
  .visor-controles button { width: 40px; height: 40px; }
}

/* Respeta la preferencia de menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 1.5s; }
  .punto-vivo, .hero-skeleton { animation: none; }
  .contenido-detalle { animation: none; }
  .btn-volver,
  .btn-volver svg,
  .opcion-tarjeta,
  .btn-reservar-final,
  .reservar-icono,
  .hero-zoom,
  .visor-cerrar,
  .hero-img { transition-duration: 0.01ms; }
  .btn-reservar-final:hover:not(.btn-desactivado) { transform: none; }
  .visor-cerrar:hover { transform: none; }
  .visor-img.animando { transition-duration: 0.01ms; }
  .visor-anim-enter-active .visor-img { transition-duration: 0.01ms; }
  .visor-anim-enter-from .visor-img { transform: none; }
}
</style>
