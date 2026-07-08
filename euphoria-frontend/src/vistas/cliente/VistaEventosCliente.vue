<template>
  <div class="vista-eventos-cliente entrada-cine">
    <!-- Franja compacta: título + subtítulo en una sola zona -->
    <header class="franja-cartelera">
      <span class="franja-acento" aria-hidden="true"></span>
      <h1 class="titulo-hero">Cartelera</h1>
      <p class="subtitulo">La noche empieza aquí.</p>
    </header>

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

    <div v-else-if="error" class="estado-error panel-estado">
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

    <div v-else-if="eventos.length === 0" class="estado-vacio panel-estado">
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
      <article
        v-for="evento in eventos"
        :key="evento.id_evento"
        class="tarjeta-evento hover-elevar anim-subir"
      >
        <div class="portada-contenedor">
          <img
            v-if="evento.url_portada"
            :src="evento.url_portada"
            class="portada-img"
            loading="lazy"
            :alt="`Portada de ${evento.nombre_evento}`"
          />
          <div v-else class="portada-placeholder">EUPHORIA</div>
          <div class="overlay-gradiente"></div>
          <span class="marca-poster">EUPHORIA</span>

          <!-- Fecha: sello tipo ticket -->
          <div class="fecha-badge" aria-hidden="true">
            <span class="dia">{{ obtenerDia(evento.fecha_hora_inicio) }}</span>
            <span class="fecha-separador"></span>
            <span class="mes">{{ obtenerMes(evento.fecha_hora_inicio) }}</span>
          </div>

          <span v-if="evento.estado === 'lleno'" class="badge-agotado">Agotado</span>
        </div>

        <div class="info-evento">
          <div class="info-cabecera">
            <h2 class="nombre">{{ evento.nombre_evento }}</h2>

            <div class="meta-lineas">
              <p class="hora">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Inicia a las {{ obtenerHora(evento.fecha_hora_inicio) }}
              </p>
              <p v-if="evento.fecha_hora_fin" class="hora hora-fin">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Finaliza el {{ obtenerDia(evento.fecha_hora_fin) }} {{ obtenerMes(evento.fecha_hora_fin) }} a las {{ obtenerHora(evento.fecha_hora_fin) }}
              </p>
            </div>

            <p class="descripcion">{{ evento.descripcion || 'Vive la mejor experiencia en EUPHORIA.' }}</p>
          </div>

          <!-- Precio de entrada y CTA (solo si el evento tiene zonas configuradas) -->
          <div class="acciones-evento">
            <span v-if="precioDesde(evento) !== null" class="precio-desde">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono-ticket"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"></path><path d="M13 5v2"></path><path d="M13 11v2"></path><path d="M13 17v2"></path></svg>
              Desde <b>Bs. {{ precioDesde(evento).toFixed(2) }}</b>
            </span>
            <div class="botones-evento">
              <button class="btn-detalles" @click="verDetalles(evento)">
                Ver detalles
              </button>
              <button v-if="(evento.zona || []).length" class="btn-reservar cta-isla" :disabled="evento.estado === 'lleno'"
                      :class="{ agotado: evento.estado === 'lleno' }" @click="reservarMesa(evento)">
                {{ evento.estado === 'lleno' ? 'Agotado' : 'Reservar mesa' }}
                <span v-if="evento.estado !== 'lleno'" class="cta-icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="flecha"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </article>
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

// "Desde Bs X": el menor precio base entre las zonas del evento (el dato ya viene del backend)
function precioDesde(evento) {
  const precios = (evento.zona || []).map(z => Number(z.precio_entrada_base)).filter(p => p >= 0)
  return precios.length ? Math.min(...precios) : null
}

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
  padding: var(--esp-4) var(--esp-4);
  padding-bottom: 100px; /* Espacio para el navbar bottom */
  max-width: 960px;
  margin: 0 auto;
}

/* ===== Franja compacta (título + subtítulo en la misma línea) ===== */
.franja-cartelera {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 12px;
  min-width: 0;
  padding: var(--esp-1) 0;
  margin-bottom: var(--esp-4);
}

.franja-acento {
  align-self: center;
  width: 4px;
  height: 1.35em;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.55);
  flex-shrink: 0;
}

.titulo-hero {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.35rem, 4vw, 1.6rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: var(--texto-principal);
}

.subtitulo {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--texto-secundario);
  min-width: 0;
}

/* ===== Cargando — skeletons ===== */
.cargando { display: flex; flex-direction: column; gap: var(--esp-4); }
.cargando-texto { text-align: center; font-size: 0.82rem; color: var(--texto-desactivado); letter-spacing: 0.02em; }
.skeleton-lista { display: flex; flex-direction: column; gap: var(--esp-5); }
.skeleton-card {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  overflow: hidden;
}
.skeleton-portada { width: 100%; height: 240px; }
.skeleton-cuerpo { padding: var(--esp-5); display: flex; flex-direction: column; gap: var(--esp-3); }
.skeleton-linea { height: 12px; border-radius: var(--radio-full); }
.ancho-40 { width: 40%; }
.ancho-70 { width: 70%; height: 20px; }
.ancho-90 { width: 90%; }
.skeleton-acciones { display: flex; gap: var(--esp-3); margin-top: var(--esp-2); }
.skeleton-btn { flex: 1; height: 46px; border-radius: var(--radio-full); }
.skeleton-btn.ancho-mayor { flex: 1.4; }
.skeleton-portada,
.skeleton-linea,
.skeleton-btn {
  background: linear-gradient(100deg, rgba(139,92,246,0.08) 30%, rgba(168,85,247,0.18) 50%, rgba(139,92,246,0.08) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* ===== Vacio / Error ===== */
.panel-estado {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  box-shadow: var(--sombra-tarjeta);
}
.estado-vacio, .estado-error {
  text-align: center;
  padding: var(--esp-7) var(--esp-5) calc(var(--esp-7) + var(--esp-2));
  margin-top: var(--esp-5);
  animation: subirEntrada 0.45s var(--ease-suave) both;
}
.icono-vacio, .icono-error { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--esp-4); border-radius: var(--radio-full); }
.icono-vacio { color: var(--morado-hover); background: rgba(168,85,247,0.12); border: 1px solid var(--borde-sutil); }
.icono-vacio svg, .icono-error svg { width: 30px; height: 30px; }
.estado-vacio h3, .estado-error h3 { font-family: var(--fuente-titulo); font-size: 1.2rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: var(--esp-2); color: var(--texto-principal); }
.estado-vacio p, .estado-error p { font-size: 0.9rem; line-height: 1.55; color: var(--texto-secundario); max-width: 36ch; margin-inline: auto; }

.icono-error { color: var(--rosa-acento); background: rgba(236,72,153,0.1); border: 1px solid rgba(236,72,153,0.28); }
.estado-error p { margin-bottom: var(--esp-5); }
.btn-reintentar {
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  padding: 13px 30px;
  border-radius: var(--radio-full);
  font-size: 0.92rem;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.35);
  cursor: pointer;
  transition: transform var(--trans-normal), box-shadow var(--trans-normal);
}
.btn-reintentar:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-reintentar:active { transform: scale(0.98); }
.btn-reintentar:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 6px 18px rgba(168, 85, 247, 0.35); }

/* ===== Lista de Eventos ===== */
.lista-eventos { display: flex; flex-direction: column; gap: var(--esp-6); }

/* Fondo SOLIDO (sin backdrop-filter: pinta artefactos en algunas GPUs) */
.tarjeta-evento {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  background: var(--gradiente-sutil);
  border-radius: var(--radio-xl);
  overflow: hidden;
  border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06),
              0 20px 50px rgba(10, 6, 26, 0.55);
}

.portada-contenedor {
  position: relative;
  width: 100%;
  height: 360px; /* Poster alto para apreciar los diseños verticales */
  background: var(--fondo-app);
  overflow: hidden;
}

.portada-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top; /* Mostrar la parte superior del poster (usualmente el titulo) */
  transition: transform var(--trans-lenta);
}
.tarjeta-evento:hover .portada-img { transform: scale(1.05); }

.portada-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(60% 60% at 30% 20%, rgba(168,85,247,0.18), transparent 60%),
    radial-gradient(60% 60% at 80% 90%, rgba(236,72,153,0.16), transparent 60%),
    var(--gradiente-sutil);
  color: rgba(168,85,247,0.24);
  font-family: var(--fuente-titulo);
  font-size: 2.6rem;
  font-weight: 900;
  letter-spacing: 6px;
}

.overlay-gradiente {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, rgba(14, 8, 33, 0.85) 0%, rgba(14, 8, 33, 0.15) 42%, transparent 68%);
  pointer-events: none;
}

.marca-poster {
  position: absolute;
  left: var(--esp-4);
  bottom: var(--esp-3);
  font-family: var(--fuente-titulo);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.42em;
  color: rgba(245, 243, 255, 0.72);
  text-transform: uppercase;
  pointer-events: none;
}

/* Fecha — sello tipo ticket (fondo solido, sin blur) */
.fecha-badge {
  position: absolute;
  top: var(--esp-4); left: var(--esp-4);
  background: rgba(10, 6, 26, 0.9);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 10px 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 62px;
  box-shadow: 0 10px 26px rgba(10, 6, 26, 0.6),
              0 0 22px rgba(168, 85, 247, 0.32),
              0 1px 0 rgba(255,255,255,0.1) inset;
}
.fecha-badge .dia { font-family: var(--fuente-titulo); font-size: 2rem; font-weight: 800; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.fecha-separador { width: 100%; border-top: 1px dashed rgba(196, 181, 224, 0.4); margin: 6px 0 4px; }
.fecha-badge .mes { font-size: 0.68rem; font-weight: 700; color: var(--rosa-suave); letter-spacing: 3px; }

/* Agotado sobre el poster */
.badge-agotado {
  position: absolute;
  top: var(--esp-4); right: var(--esp-4);
  background: rgba(10, 6, 26, 0.88);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #F87171;
  padding: 6px 13px;
  border-radius: var(--radio-full);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.info-evento {
  padding: var(--esp-5);
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}
.info-cabecera { display: flex; flex-direction: column; }

.nombre {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.5rem, 4vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.1;
  text-wrap: balance;
  color: var(--texto-principal);
  margin-bottom: var(--esp-4);
}

.meta-lineas { display: flex; flex-direction: column; gap: var(--esp-2); margin-bottom: var(--esp-4); }
.hora {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 6px 12px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-sutil);
  font-size: 0.82rem;
  color: var(--morado-hover);
  font-weight: 600;
}
.hora-fin { color: var(--texto-secundario); font-weight: 500; background: transparent; border-color: transparent; padding-left: 0; }
.icono { width: 14px; height: 14px; flex-shrink: 0; }
.descripcion { font-size: 0.92rem; color: var(--texto-secundario); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.acciones-evento { display: flex; flex-direction: column; gap: var(--esp-3); margin-top: auto; }

/* Precio como etiqueta de ticket */
.precio-desde {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 7px 14px;
  border-radius: var(--radio-full);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--texto-secundario);
}
.precio-desde b { color: #4ADE80; font-size: 0.98rem; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.icono-ticket { width: 15px; height: 15px; color: #4ADE80; flex-shrink: 0; }

.botones-evento { display: flex; gap: var(--esp-3); flex-wrap: wrap; align-items: center; }
.btn-reservar.agotado { opacity: 0.55; cursor: not-allowed; filter: grayscale(0.5); }
.btn-detalles {
  flex: 1;
  min-width: 130px;
  background: rgba(168, 85, 247, 0.08);
  color: var(--morado-hover);
  border: 1px solid var(--borde-activo);
  padding: 13px;
  border-radius: var(--radio-full);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--trans-normal), border-color var(--trans-normal), color var(--trans-normal), transform var(--trans-rapida);
}
.btn-detalles:hover { background: rgba(168, 85, 247, 0.16); border-color: var(--morado-brillante); color: var(--texto-principal); transform: translateY(-2px); }
.btn-detalles:active { transform: scale(0.98); }
.btn-detalles:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

/* Reservar — usa la utilidad global .cta-isla; aqui solo ajustamos el layout */
.btn-reservar {
  flex: 1.5;
  min-width: 170px;
  justify-content: space-between;
  padding: 12px 12px 12px 22px;
}
.btn-reservar .cta-icono { width: 32px; height: 32px; }
.btn-reservar .flecha { width: 16px; height: 16px; }
.btn-reservar:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 10px 26px rgba(168,85,247,0.4); }

/* ===== Poster editorial en pantallas amplias (split asimetrico) ===== */
@media (min-width: 700px) {
  .tarjeta-evento { grid-template-columns: 0.92fr 1.08fr; }
  .portada-contenedor { height: 100%; min-height: 400px; }
  .info-evento { padding: var(--esp-6); justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-portada, .skeleton-linea, .skeleton-btn { animation: none; }
  .tarjeta-evento:hover .portada-img { transform: none; }
}
</style>
