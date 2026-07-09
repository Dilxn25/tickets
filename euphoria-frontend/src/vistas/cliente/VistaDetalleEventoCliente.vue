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

      <!-- Héroe de altura contenida -->
      <header class="hero">
        <div v-if="evento.url_portada && !imgLista" class="hero-skeleton" aria-hidden="true"></div>
        <img
          v-if="evento.url_portada"
          :src="evento.url_portada"
          class="hero-img"
          :class="{ lista: imgLista }"
          alt="Poster del evento"
          @load="imgLista = true"
        />
        <div v-else class="hero-placeholder">EUPHORIA</div>
        <div class="hero-velo" aria-hidden="true"></div>

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

/* Héroe de altura contenida (nunca más de 40vh) */
.hero {
  position: relative;
  width: 100%;
  height: clamp(190px, 34vw, 360px);
  max-height: 40vh;
  border-radius: var(--radio-xl);
  overflow: hidden;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  box-shadow: var(--sombra-tarjeta);
  margin-bottom: var(--esp-5);
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
  object-fit: cover;
  object-position: center 25%;
  opacity: 0;
  transition: opacity 0.45s ease;
}
.hero-img.lista { opacity: 1; }

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
  .hero-img { transition-duration: 0.01ms; }
  .btn-reservar-final:hover:not(.btn-desactivado) { transform: none; }
}
</style>
