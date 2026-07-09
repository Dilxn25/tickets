<template>
  <div class="vista-inicio entrada-cine">

    <!-- HERO: saludo grande + evento activo -->
    <header class="hero-inicio">
      <div class="orbe-deco morado orbe-hero-1"></div>
      <div class="orbe-deco rosa orbe-hero-2"></div>

      <!-- Banner Superior de Evento Actual -->
      <div v-if="eventoActual" class="banner-evento-actual brillo-hover" @click="router.push('/cliente/catalogo')">
        <div class="banner-contenido">
          <span class="eq-vivo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <div class="banner-texto">
            <span class="banner-label">Estás en vivo</span>
            <span class="banner-nombre">{{ eventoActual.nombre }}</span>
          </div>
        </div>
        <button class="btn-pedir-ahora" @click.stop="router.push('/cliente/catalogo')">Pedir ahora</button>
      </div>

      <div class="hero-textos">
        <h1 class="titulo-hola">Hola, {{ nombreCorto }}</h1>
        <p class="subtitulo">Tu noche en Euphoria, lista para empezar.</p>
      </div>
    </header>

    <!-- SALDO + PAGO INMEDIATO -->
    <section class="zona-pago">
      <!-- Billetera premium (double-bezel tipo tarjeta física) -->
      <div class="billetera-bezel bezel hover-elevar">
        <div class="billetera-core bezel-core textura-grano">
          <div class="orbe-deco rosa billetera-orbe"></div>

          <div class="billetera-top">
            <span class="billetera-titulo">Billetera Euphoria</span>
            <span class="billetera-chip" aria-hidden="true"></span>
          </div>

          <div class="billetera-saldo">
            <span class="saldo-etiqueta">Saldo disponible</span>
            <h2 class="saldo-monto" v-if="!cargandoBilletera">Bs. {{ saldoBilletera.toFixed(2) }}</h2>
            <div v-else class="saldo-cargando">Cargando saldo...</div>
          </div>

          <div class="billetera-footer">
            <span class="billetera-marca">EUPHORIA · CLUB</span>
            <button class="cta-isla" @click="router.push('/cliente/billetera')">
              Recargar
              <span class="cta-icono">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6m0 0l-3-3m3 3l3-3"></path>
                  <path d="M12 18a6 6 0 0 1-6-6"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Pago rápido: QRs sin salir del inicio -->
      <div class="fila-qr escalonar">
        <button
          class="qr-tile qr-tile-publico"
          type="button"
          :disabled="generandoQR"
          @click="mostrarQRRapido('sin_pin')"
        >
          <span class="qr-tile-icono" :class="{ girando: generandoQR && qrSolicitado === 'sin_pin' }">
            <svg v-if="!(generandoQR && qrSolicitado === 'sin_pin')" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
              <path d="M14 14h3v3h-3zM21 14v.01M21 21h-4M14 21v-2"></path>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.2-8.56"></path>
            </svg>
          </span>
          <span class="qr-tile-texto">
            <span class="qr-tile-titulo">QR público</span>
            <span class="qr-tile-sub">Muestra y paga al toque</span>
          </span>
          <span class="qr-tile-flecha" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"></path></svg>
          </span>
        </button>

        <button
          class="qr-tile qr-tile-privado"
          type="button"
          :disabled="generandoQR"
          @click="mostrarQRRapido('con_pin')"
        >
          <span class="qr-tile-icono" :class="{ girando: generandoQR && qrSolicitado === 'con_pin' }">
            <svg v-if="!(generandoQR && qrSolicitado === 'con_pin')" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="10" rx="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              <path d="M12 15v2"></path>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.2-8.56"></path>
            </svg>
          </span>
          <span class="qr-tile-texto">
            <span class="qr-tile-titulo">QR privado</span>
            <span class="qr-tile-sub">Solo con tu PIN</span>
          </span>
          <span class="qr-tile-flecha" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"></path></svg>
          </span>
        </button>
      </div>
    </section>

    <!-- HERO CAROUSEL: los eventos van ARRIBA — son lo primero que vende la noche -->
    <section class="seccion-carrusel reveal" v-if="!cargandoEventos && eventos.length > 0">
      <div class="carrusel-cabecera">
        <span class="kicker">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Agenda tu previa
        </span>
        <h3 class="carrusel-titulo">Próximos eventos</h3>
      </div>
      <div class="hero-carrusel bezel">
        <div
          class="carrusel-track"
          :style="{ transform: `translateX(-${carruselIndex * 100}%)` }"
        >
          <div
            v-for="evento in eventos"
            :key="evento.id_evento"
            class="carrusel-slide"
            @click="router.push(`/cliente/eventos/${evento.id_evento}`)"
          >
            <img v-if="evento.url_portada" :src="evento.url_portada" class="slide-img" />
            <div v-else class="slide-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect></svg>
            </div>
            <div class="slide-overlay">
              <span class="slide-tag">Próximo evento</span>
              <h2 class="slide-titulo">{{ evento.nombre_evento }}</h2>
              <button class="slide-btn brillo-hover">Ver detalles</button>
            </div>
          </div>
        </div>
        <!-- Indicadores -->
        <div class="carrusel-indicadores">
          <span
            v-for="(_, i) in eventos"
            :key="i"
            class="indicador"
            :class="{ activo: i === carruselIndex }"
          ></span>
        </div>
      </div>
    </section>

    <!-- Reserva tu lugar: solo o grupo grande -->
    <section class="seccion-reserva reveal">
      <h3 class="bloque-titulo">Reserva tu lugar</h3>
      <div class="reserva-modos">
        <button class="rmodo solo hover-elevar" @click="irReservar">
          <div class="rmodo-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="rmodo-txt">
            <b>Reservar para ti</b>
            <span>Elige tu mesa en el mapa. Hasta 2 mesas por cuenta.</span>
          </div>
          <svg class="rmodo-flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button class="rmodo grupo hover-elevar" @click="irGrupo">
          <div class="rmodo-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div class="rmodo-txt">
            <b>Grupo grande</b>
            <span>¿Más de 2 mesas? Envía tu solicitud y el local la confirma.</span>
          </div>
          <svg class="rmodo-flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <p class="reserva-nota">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        Máximo 2 mesas por cuenta en cada evento. Para empresas, cumpleaños o grupos, usa la solicitud de grupo grande.
      </p>
    </section>

    <!-- Accesos Rápidos estilo bento -->
    <section class="seccion-accesos reveal">
      <h3 class="bloque-titulo">Tu noche, a un toque</h3>
      <div class="grid-accesos-mini escalonar">
        <div class="acceso-mini hover-elevar" @click="router.push('/cliente/eventos')">
          <div class="icono-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <span>Eventos</span>
        </div>
        <div class="acceso-mini hover-elevar" @click="router.push('/cliente/catalogo')">
          <div class="icono-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22L16 22"></path><path d="M12 18L12 22"></path><path d="M12 15C16.4183 15 20 11.4183 20 7L4 7C4 11.4183 7.58172 15 12 15Z"></path><path d="M4 3L20 3"></path></svg>
          </div>
          <span>Bebidas</span>
        </div>
        <div class="acceso-mini hover-elevar" @click="router.push('/cliente/carrito')">
          <div class="icono-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          </div>
          <span>Carrito</span>
        </div>
        <div class="acceso-mini hover-elevar" @click="router.push('/cliente/perfil')">
          <div class="icono-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <span>Perfil</span>
        </div>
      </div>
    </section>

    <!-- Combos / Promociones recomendadas -->
    <div v-if="combos.length > 0" class="seccion-combos reveal">
      <div class="combos-encabezado">
        <span class="kicker">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          Promos de la noche
        </span>
        <h3 class="combos-titulo">Combos para encender la noche</h3>
        <p class="combos-sub">Los favoritos para compartir con tu mesa.</p>
      </div>
      <div class="combos-scroll escalonar">
        <div v-for="(combo, i) in combos" :key="i" class="tarjeta-combo hover-elevar" @click="agregarCombo(combo)">
          <div class="combo-visual">
            <div class="combo-visual-glow" aria-hidden="true"></div>
            <template v-if="imagenesCombo(combo).length">
              <div class="combo-fotos" :class="`fotos-${imagenesCombo(combo).length}`">
                <img
                  v-for="(img, j) in imagenesCombo(combo)"
                  :key="j"
                  :src="img"
                  class="combo-foto"
                  alt=""
                  loading="lazy"
                />
              </div>
            </template>
            <div v-else class="combo-visual-vacio" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 22L16 22"></path><path d="M12 18L12 22"></path><path d="M12 15C16.4183 15 20 11.4183 20 7L4 7C4 11.4183 7.58172 15 12 15Z"></path><path d="M4 3L20 3"></path></svg>
            </div>
            <div class="combo-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
              -{{ combo.descuento_pct }}%
            </div>
          </div>
          <div class="combo-cuerpo">
            <div class="combo-nombre">{{ combo.nombre }}</div>
            <div class="combo-precios">
              <span class="combo-normal">Bs {{ combo.precio_normal.toFixed(2) }}</span>
              <span class="combo-flecha" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
              </span>
              <span class="combo-final">Bs {{ combo.precio_combo.toFixed(2) }}</span>
            </div>
            <button class="btn-combo" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              Lo quiero
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección: Productos Destacados (Infinite Marquee) -->
    <section class="seccion-marquee reveal">
      <div class="seccion-cabecera">
        <div class="seccion-cabecera-txt">
          <span class="kicker">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 6.9L21 9.2l-5.3 4.4L17.5 21 12 17l-5.5 4 1.8-7.4L3 9.2l6.6-.3L12 2z"></path></svg>
            En barra esta noche
          </span>
          <h2>Catálogo exclusivo</h2>
        </div>
        <RouterLink to="/cliente/catalogo" class="link-ver-todo subrayado-anim">Ver menú</RouterLink>
      </div>

      <div v-if="cargandoProductos" class="marquee-skeleton" aria-hidden="true">
        <div v-for="n in 5" :key="n" class="skeleton-card">
          <div class="skeleton-img"></div>
          <div class="skeleton-linea skeleton-linea-titulo"></div>
          <div class="skeleton-linea skeleton-linea-precio"></div>
        </div>
      </div>

      <div v-else class="marquee-contenedor">
        <div class="marquee-track" :style="{ 'animation-play-state': pausaMarquee ? 'paused' : 'running' }">
          <!-- Multiplicamos los productos para el efecto infinito -->
          <div
            v-for="(prod, index) in [...productos, ...productos, ...productos]"
            :key="index"
            class="tarjeta-marquee-producto"
            @click="router.push('/cliente/catalogo')"
            @mouseenter="pausaMarquee = true"
            @mouseleave="pausaMarquee = false"
            @touchstart="pausaMarquee = true"
            @touchend="pausaMarquee = false"
          >
            <div class="img-prod-contenedor">
              <img v-if="prod.url_imagen" :src="prod.url_imagen" class="img-prod" loading="lazy" />
              <div v-else class="img-prod-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 22L16 22"></path><path d="M12 18L12 22"></path><path d="M12 15C16.4183 15 20 11.4183 20 7L4 7C4 11.4183 7.58172 15 12 15Z"></path><path d="M4 3L20 3"></path></svg>
              </div>
              <div class="img-prod-velo" aria-hidden="true"></div>
              <p class="precio-flotante">Bs. {{ (parseFloat(prod.precio_base) || 0).toFixed(2) }}</p>
            </div>
            <div class="info-prod-mini">
              <h4>{{ prod.nombre_producto }}</h4>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal Alerta Evento Cancelado -->
    <Teleport to="body">
      <div v-if="modalCancelado" class="modal-fondo" @click.self="modalCancelado=false">
        <div class="modal modal-cancelado aparecer-zoom">
          <div class="modal-cancelado-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="modal-cancelado-cuerpo">
            <h3>Evento suspendido</h3>
            <p>
              El administrador canceló o modificó la disponibilidad del evento al que estabas registrado por causas de fuerza mayor.
              <br><br>Tu sesión en este evento se cerró.
            </p>
            <button class="btn-modal-entendido" @click="modalCancelado=false">Entendido</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- QR de pago a pantalla completa: fondo blanco para el escáner de barra -->
    <Teleport to="body">
      <Transition name="qr-fs">
        <div v-if="qrPantalla && qrActivo" class="qr-fullscreen" @click="qrPantalla = null" role="dialog" aria-label="Código QR de pago">
          <p class="qr-fs-nombre">{{ tienda.usuario?.nombres || 'Cliente Euphoria' }}</p>
          <span class="qr-fs-tipo" :class="{ privado: qrPantalla === 'con_pin' }">
            {{ qrPantalla === 'con_pin' ? 'QR privado · protegido con PIN' : 'QR público · cobro directo' }}
          </span>
          <img :src="qrActivo.imagen" alt="Código QR de pago ampliado" class="qr-fs-img" />
          <p class="qr-fs-codigo">{{ qrActivo.identificador }}</p>
          <p class="qr-fs-hint">Muestra la pantalla en barra · Toca para cerrar</p>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'
import { servicioEventos } from '@/servicios-api/servicio-eventos.js'
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import clienteHttp from '@/servicios-api/cliente-http.js'

const router = useRouter()
const notif = useNotificaciones()
const tienda = useTiendaAutenticacion()
const tiendaCarrito = useTiendaCarrito()
const nombreCorto = computed(() => tienda.usuario?.nombres?.split(' ')[0] || 'Invitado')

// Combos / promociones para el inicio
const combos = ref([])
const productosCompletos = ref([])
const eventoActual = ref(null)
const modalCancelado = ref(false)

const eventos = ref([])
const cargandoEventos = ref(true)

// Reserva: elige el evento destino (actual, o el primero disponible)
function eventoDestino() {
  return eventoActual.value?.id_evento || eventos.value[0]?.id_evento || null
}
function irReservar() {
  const id = eventoDestino()
  router.push(id ? `/cliente/reservar/${id}` : '/cliente/eventos')
}
function irGrupo() {
  const id = eventoDestino()
  router.push(id ? `/cliente/grupo/${id}` : '/cliente/eventos')
}

const productos = ref([])
const cargandoProductos = ref(true)

// Control del Carrusel
const carruselIndex = ref(0)
let carruselInterval = null

// Control del Marquee
const pausaMarquee = ref(false)

// Billetera
const saldoBilletera = ref(0)
const cargandoBilletera = ref(true)
const sinBilletera = ref(false)

// Pago rápido con QR (sin salir del inicio)
const generandoQR = ref(false)
const qrSolicitado = ref(null)   // tipo que se está generando ('sin_pin' | 'con_pin')
const qrPantalla = ref(null)     // tipo mostrado a pantalla completa
const datosQR = ref(null)
const qrActivo = computed(() => {
  if (!datosQR.value) return null
  return qrPantalla.value === 'con_pin' ? datosQR.value.qr_con_pin : datosQR.value.qr_sin_pin
})

// Reveals al hacer scroll
let observadorReveal = null

async function cargarDatosInicio() {
  // Cargar eventos activos
  try {
    const dataE = await servicioEventos.listarDisponibles()
    eventos.value = dataE
  } catch (error) {
    console.error('Error cargando eventos:', error)
  } finally {
    cargandoEventos.value = false
  }

  // Cargar productos para recomendacion
  try {
    const dataP = await servicioProductos.listar()
    productosCompletos.value = dataP
    // Solo productos CON imagen para el marquee (los combos no traen url_imagen)
    productos.value = dataP.filter(p => p.url_imagen).slice(0, 8)
  } catch (error) {
    console.error('Error cargando productos:', error)
  } finally {
    cargandoProductos.value = false
  }

  // Cargar saldo de billetera
  try {
    const dataSaldo = await servicioBilletera.obtenerSaldo()
    saldoBilletera.value = dataSaldo.saldo_actual || 0
    sinBilletera.value = !!dataSaldo.sin_billetera
  } catch (error) {
    console.error('Error cargando saldo:', error)
    saldoBilletera.value = 0
  } finally {
    cargandoBilletera.value = false
  }

  // Cargar combos / promociones (motor de recomendación)
  try {
    const res = await clienteHttp.get('/recomendaciones/combos')
    combos.value = (res.combos || []).slice(0, 4)
  } catch (e) {
    combos.value = []
  }
}

// Genera y muestra el QR de pago elegido a pantalla completa, sin salir del inicio.
// Mismo flujo que en la Billetera: el identificador se muestra EXACTO (el cajero lo busca en la BD).
async function mostrarQRRapido(tipo) {
  if (sinBilletera.value) {
    notif.advertencia('Aún no tienes billetera: se crea con tu primera recarga de saldo.')
    return
  }
  if (generandoQR.value) return
  generandoQR.value = true
  qrSolicitado.value = tipo
  try {
    const res = await servicioBilletera.generarQRsPago()
    datosQR.value = res
    qrPantalla.value = tipo
  } catch (error) {
    console.error('Error generando QRs:', error)
    notif.error('Error al generar los QRs de pago')
  } finally {
    generandoQR.value = false
    qrSolicitado.value = null
  }
}

// Hasta 3 imágenes de los productos protagonistas del combo
function imagenesCombo(combo) {
  const imgs = []
  for (const p of combo.productos || []) {
    const prod = productosCompletos.value.find(x => x.id_producto === p.id_producto)
    if (prod?.url_imagen) imgs.push(prod.url_imagen)
    if (imgs.length >= 3) break
  }
  return imgs
}

// Agrega el combo al carrito. Si el local ya lo tiene como COMBO REAL (producto
// es_combo con la misma composición), se agrega ESE producto y el descuento es real.
// Si no, se agregan los productos sueltos a precio de catálogo y se avisa con claridad.
async function agregarCombo(combo) {
  // El catálogo completo puede seguir cargando si el usuario toca rápido:
  // sin esta espera, no se encontraba el combo real y se cobraba precio suelto.
  if (!productosCompletos.value.length) {
    try { productosCompletos.value = await servicioProductos.listar() } catch (e) { /* sigue con lo que haya */ }
  }
  const firmaSugerida = combo.productos.map(p => `${p.id_producto}:1`).sort().join('|')
  const comboReal = productosCompletos.value.find(p =>
    p.es_combo && (p.combos_como_padre || []).length &&
    p.combos_como_padre.map(c => `${c.id_producto_hijo}:${c.cantidad}`).sort().join('|') === firmaSugerida &&
    p.stock_actual > 0
  )
  if (comboReal) {
    // Los combos van al carrito con su COMPOSICIÓN (2-3 fotos solapadas, como su tarjeta)
    const imagenesCombo = combo.productos.map(p => p.url_imagen).filter(Boolean).slice(0, 3)
    const r = tiendaCarrito.agregarItem({
      ...comboReal,
      url_imagen: comboReal.url_imagen || imagenesCombo[0] || '',
      imagenes_combo: imagenesCombo,
    })
    if (r && r.ok === false) { notif.advertencia(r.mensaje || 'Sin stock del combo.'); return }
    router.push('/cliente/carrito')
    return
  }

  let agregados = 0, omitidos = 0
  for (const p of combo.productos) {
    const prod = productosCompletos.value.find(x => x.id_producto === p.id_producto)
    if (!prod || prod.stock_actual <= 0) { omitidos++; continue }
    const r = tiendaCarrito.agregarItem(prod)
    if (r && r.ok === false) omitidos++
    else agregados++
  }
  if (!agregados) { notif.error('No se pudo agregar el combo: productos sin stock.'); return }
  if (omitidos) notif.advertencia('Algunos productos del combo no tenían stock y no se agregaron.')
  else notif.info('Productos agregados a precio de catálogo (el precio rebajado aplica cuando el local activa el combo).')
  router.push('/cliente/carrito')
}

function iniciarCarrusel() {
  carruselInterval = setInterval(() => {
    if (eventos.value.length > 0) {
      carruselIndex.value = (carruselIndex.value + 1) % eventos.value.length
    }
  }, 4000) // Cambia cada 4 segundos
}

function iniciarReveals() {
  if (typeof IntersectionObserver === 'undefined') return
  observadorReveal = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible')
        observadorReveal.unobserve(entrada.target)
      }
    })
  }, { threshold: 0.12 })
  document.querySelectorAll('.vista-inicio .reveal').forEach(el => observadorReveal.observe(el))
}

onMounted(async () => {
  // Revisar si ya reservó un evento
  const eventoGuardado = localStorage.getItem('euphoria_evento_actual')
  if (eventoGuardado) {
    try {
      const parsed = JSON.parse(eventoGuardado)
      try {
        await servicioEventos.obtenerDisponible(parsed.id)
        eventoActual.value = parsed
      } catch (err) {
        localStorage.removeItem('euphoria_evento_actual')
        eventoActual.value = null
        modalCancelado.value = true
      }
    } catch (e) {
      console.error(e)
    }
  }

  await cargarDatosInicio()
  iniciarCarrusel()
  await nextTick()
  iniciarReveals()
})

onUnmounted(() => {
  if (carruselInterval) clearInterval(carruselInterval)
  if (observadorReveal) observadorReveal.disconnect()
})
</script>

<style scoped>
/* ============================================================
   HOME CLIENTE — "Euphoria Neon Nocturne" v2
   Resumen breve y accionable: saludo → saldo + pago inmediato
   → accesos → combos → catálogo → eventos.
   Fondos sólidos/gradientes (sin backdrop-filter).
   ============================================================ */
.vista-inicio {
  padding: var(--esp-4);
  padding-bottom: 104px;
  display: flex;
  flex-direction: column;
  gap: var(--esp-6);
}

/* ---------- Kickers de sección (etiqueta pequeña con icono) ---------- */
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rosa-suave);
}
.kicker svg { width: 13px; height: 13px; flex-shrink: 0; }

/* ---------- HERO (saludo grande + evento en vivo) ---------- */
.seccion-reserva { padding: 0 4px; margin-bottom: 8px; }
.reserva-modos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .reserva-modos { grid-template-columns: 1fr; } }
.rmodo { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 18px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); cursor: pointer; text-align: left; transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; overflow: hidden; position: relative; }
.rmodo::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.25s ease; pointer-events: none; }
.rmodo.solo::before { background: radial-gradient(120% 100% at 0% 0%, rgba(168,85,247,0.14), transparent 60%); }
.rmodo.grupo::before { background: radial-gradient(120% 100% at 100% 0%, rgba(236,72,153,0.14), transparent 60%); }
.rmodo:hover::before { opacity: 1; }
.rmodo:hover { border-color: var(--borde-activo); transform: translateY(-2px); box-shadow: 0 12px 30px rgba(10,6,26,0.4); }
.rmodo-ic { flex-shrink: 0; width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #fff; }
.rmodo.solo .rmodo-ic { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.rmodo.grupo .rmodo-ic { background: linear-gradient(135deg, #EC4899, #A855F7); }
.rmodo-ic svg { width: 22px; height: 22px; }
.rmodo-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.rmodo-txt b { color: var(--texto-principal); font-size: 0.98rem; font-weight: 700; }
.rmodo-txt span { color: var(--texto-secundario); font-size: 0.78rem; line-height: 1.35; }
.rmodo-flecha { width: 18px; height: 18px; flex-shrink: 0; color: var(--texto-desactivado); transition: transform 0.2s ease, color 0.2s ease; }
.rmodo:hover .rmodo-flecha { color: var(--morado-hover); transform: translateX(3px); }
.reserva-nota { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; font-size: 0.78rem; color: var(--texto-secundario); line-height: 1.4; }
.reserva-nota svg { width: 16px; height: 16px; flex-shrink: 0; color: var(--morado-hover); margin-top: 1px; }

.hero-inicio {
  position: relative;
  overflow: hidden;
  border-radius: var(--radio-xl);
  padding: 6px 4px 10px;
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}
.orbe-hero-1 { width: 300px; height: 300px; top: -170px; left: -100px; opacity: 0.32; }
.orbe-hero-2 { width: 240px; height: 240px; top: -70px; right: -110px; opacity: 0.28; }

.hero-textos { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 6px; padding: 4px 4px 0; }
.titulo-hola {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.5rem, 6vw, 1.9rem);
  font-weight: 800;
  color: var(--texto-principal);
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
  text-wrap: balance;
}
.subtitulo {
  color: var(--texto-secundario);
  font-size: 0.9rem;
  font-weight: 500;
  max-width: 40ch;
  line-height: 1.45;
  margin: 0;
  text-wrap: pretty;
}

/* Banner evento en vivo (píldora sólida con ecualizador) */
.banner-evento-actual {
  position: relative;
  z-index: 1;
  cursor: pointer;
  background: linear-gradient(120deg, var(--fondo-tarjeta-alt) 0%, var(--fondo-tarjeta) 60%, #22104d 100%);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-full);
  padding: 10px 12px 10px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-3);
  box-shadow: var(--sombra-tarjeta), inset 0 1px 0 rgba(255,255,255,0.06);
  animation: deslizarAbajo 0.55s var(--ease-rebote);
  transition: border-color var(--trans-normal), box-shadow var(--trans-normal), transform var(--trans-normal);
}
.banner-evento-actual::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(120deg, rgba(34,197,94,0.55), transparent 40%, rgba(236,72,153,0.4));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.7;
}
.banner-evento-actual:hover { border-color: var(--borde-activo); box-shadow: var(--sombra-tarjeta), var(--sombra-glow); transform: translateY(-1px); }
@keyframes deslizarAbajo { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }

.banner-contenido { display: flex; align-items: center; gap: 12px; min-width: 0; }

/* Ecualizador "en vivo" */
.eq-vivo { flex-shrink: 0; display: flex; align-items: flex-end; gap: 2.5px; height: 16px; }
.eq-vivo i {
  width: 3px;
  border-radius: 2px;
  background: var(--color-exito);
  box-shadow: 0 0 8px var(--color-exito);
  animation: eqBarra 0.9s ease-in-out infinite alternate;
}
.eq-vivo i:nth-child(1) { height: 40%; animation-delay: 0s; }
.eq-vivo i:nth-child(2) { height: 90%; animation-delay: 0.18s; }
.eq-vivo i:nth-child(3) { height: 55%; animation-delay: 0.36s; }
.eq-vivo i:nth-child(4) { height: 75%; animation-delay: 0.54s; }
@keyframes eqBarra { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }

.banner-texto { display: flex; flex-direction: column; min-width: 0; }
.banner-label { font-size: 0.6rem; color: var(--color-exito); text-transform: uppercase; letter-spacing: 0.16em; font-weight: 800; }
.banner-nombre { font-size: 0.98rem; font-weight: 800; color: var(--texto-principal); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.01em; }
.btn-pedir-ahora { flex-shrink: 0; background: var(--gradiente-marca); color: #fff; border: none; padding: 9px 18px; border-radius: var(--radio-full); font-weight: 700; font-size: 0.8rem; cursor: pointer; box-shadow: 0 4px 15px rgba(236,72,153,0.4); transition: transform var(--trans-rapida), box-shadow var(--trans-normal); }
.btn-pedir-ahora:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(236,72,153,0.5), var(--glow-morado); }
.btn-pedir-ahora:active { transform: scale(0.94); }
.btn-pedir-ahora:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 8px 22px rgba(236,72,153,0.5); }

/* ---------- ZONA PAGO: BILLETERA + QRs ---------- */
.zona-pago { display: flex; flex-direction: column; gap: var(--esp-3); }

.billetera-bezel { cursor: default; }
.billetera-core {
  position: relative;
  overflow: hidden;
  padding: clamp(1.25rem, 5vw, 1.85rem);
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  min-height: 200px;
}
.billetera-orbe { width: 280px; height: 280px; top: -150px; right: -90px; opacity: 0.42; }
.billetera-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.billetera-titulo { font-family: var(--fuente-titulo); font-size: 0.95rem; font-weight: 700; color: var(--texto-secundario); letter-spacing: -0.01em; }
.billetera-chip {
  width: 44px; height: 32px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--morado-hover), var(--morado-medio));
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.35);
  position: relative;
}
.billetera-chip::before {
  content: ''; position: absolute; inset: 6px 8px; border-radius: 3px;
  background:
    linear-gradient(to right, transparent 45%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.28) 55%, transparent 55%),
    linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.28) 55%, transparent 55%);
}
.billetera-saldo { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 6px; }
.saldo-etiqueta { font-size: 0.72rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; }
.saldo-monto {
  font-family: var(--fuente-titulo);
  font-size: clamp(2.6rem, 11vw, 3.4rem);
  font-weight: 800;
  background: var(--gradiente-texto);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  margin: 0; letter-spacing: -0.035em; line-height: 1; font-variant-numeric: tabular-nums;
}
.saldo-cargando { font-family: var(--fuente-titulo); font-size: 1.5rem; color: var(--texto-desactivado); font-weight: 700; }
.billetera-footer { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: auto; }
.billetera-marca { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.22em; color: var(--texto-desactivado); }
.billetera-footer .cta-isla svg { width: 18px; height: 18px; }

/* Tiles de pago rápido con QR */
.fila-qr { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.qr-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: var(--radio-lg);
  cursor: pointer;
  text-align: left;
  box-shadow: var(--sombra-tarjeta);
  transition: transform var(--trans-rapida), box-shadow var(--trans-normal), border-color var(--trans-normal), filter var(--trans-normal);
}
.qr-tile:disabled { cursor: progress; filter: saturate(0.7); }
.qr-tile:active:not(:disabled) { transform: scale(0.97); }
.qr-tile:focus-visible { outline: none; box-shadow: var(--anillo-foco), var(--sombra-tarjeta); }

.qr-tile-publico {
  background: var(--gradiente-marca);
  border: none;
  color: #fff;
}
.qr-tile-publico:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236,72,153,0.45); }
.qr-tile-publico .qr-tile-sub { color: rgba(255,255,255,0.8); }
.qr-tile-publico .qr-tile-icono { background: rgba(255,255,255,0.18); color: #fff; }

.qr-tile-privado {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
}
.qr-tile-privado:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--borde-activo); box-shadow: var(--sombra-tarjeta), var(--sombra-glow); }
.qr-tile-privado .qr-tile-sub { color: var(--texto-secundario); }
.qr-tile-privado .qr-tile-icono { background: rgba(168,85,247,0.16); color: var(--morado-hover); }

.qr-tile-icono {
  flex-shrink: 0;
  width: 42px; height: 42px;
  border-radius: var(--radio-md);
  display: flex; align-items: center; justify-content: center;
}
.qr-tile-icono svg { width: 22px; height: 22px; }
.qr-tile-icono.girando svg { animation: girar 0.8s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

.qr-tile-texto { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.qr-tile-titulo { font-family: var(--fuente-titulo); font-size: 0.92rem; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; }
.qr-tile-sub { font-size: 0.7rem; font-weight: 600; line-height: 1.3; }
.qr-tile-flecha { margin-left: auto; flex-shrink: 0; opacity: 0.55; display: flex; }
.qr-tile-flecha svg { width: 16px; height: 16px; }

/* ---------- QR A PANTALLA COMPLETA (fondo blanco para el escáner) ---------- */
.qr-fullscreen {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: var(--esp-5);
  background: #fff;
  cursor: pointer;
}
.qr-fs-nombre {
  margin: 0; color: #1a1030; font-weight: 800; font-size: 1.1rem;
  font-family: var(--fuente-titulo); letter-spacing: -0.01em; text-align: center;
  max-width: 100%; overflow-wrap: anywhere;
}
.qr-fs-tipo {
  font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em;
  color: #fff; background: var(--rosa-acento);
  padding: 5px 14px; border-radius: var(--radio-full); text-align: center;
}
.qr-fs-tipo.privado { background: var(--morado-medio); }
.qr-fs-img {
  width: min(80vw, 80vh);
  height: min(80vw, 80vh);
  max-width: 480px; max-height: 480px;
  image-rendering: pixelated;
}
.qr-fs-codigo {
  margin: 0; color: #1a1030; font-weight: 800; font-size: 1rem;
  letter-spacing: 0.08em; font-variant-numeric: tabular-nums; text-align: center;
  max-width: 100%; overflow-wrap: anywhere;
}
.qr-fs-hint {
  margin: 0; color: #6b6480; font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; text-align: center;
}
.qr-fs-enter-active, .qr-fs-leave-active { transition: opacity 0.2s ease; }
.qr-fs-enter-from, .qr-fs-leave-to { opacity: 0; }

/* ---------- COMBOS ---------- */
.seccion-combos { display: flex; flex-direction: column; gap: var(--esp-4); }
.combos-encabezado { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 0 2px; }
.combos-titulo { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); margin: 0; letter-spacing: -0.025em; }
.combos-sub { font-size: 0.86rem; color: var(--texto-secundario); margin: 0; line-height: 1.4; }
.combos-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding: 4px 2px 10px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.tarjeta-combo {
  position: relative;
  flex: 0 0 220px;
  min-width: 0;
  scroll-snap-align: start;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  box-shadow: var(--sombra-tarjeta);
}
.tarjeta-combo:hover { border-color: var(--borde-activo); }
.tarjeta-combo:active { transform: translateY(-1px) scale(0.99); }

/* Vitrina del combo: productos protagonistas */
.combo-visual {
  position: relative;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(120% 130% at 50% 0%, #2c1863 0%, var(--fondo-tarjeta) 78%);
  overflow: hidden;
}
.combo-visual-glow {
  position: absolute;
  width: 150px; height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(236,72,153,0.35) 0%, transparent 70%);
  top: -50px;
  pointer-events: none;
}
.combo-fotos { display: flex; align-items: center; justify-content: center; }
.combo-foto {
  width: 84px; height: 84px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--fondo-tarjeta-alt);
  box-shadow: 0 6px 18px rgba(0,0,0,0.45);
  background: var(--fondo-tarjeta);
  transition: transform 0.35s var(--ease-rebote);
}
.fotos-2 .combo-foto, .fotos-3 .combo-foto { width: 76px; height: 76px; }
.combo-foto + .combo-foto { margin-left: -22px; }
.fotos-2 .combo-foto:nth-child(2), .fotos-3 .combo-foto:nth-child(2) { z-index: 1; transform: scale(1.08); }
.tarjeta-combo:hover .combo-foto:nth-child(1) { transform: translateX(-5px) rotate(-4deg); }
.tarjeta-combo:hover .combo-foto:nth-child(2) { transform: scale(1.14); }
.tarjeta-combo:hover .combo-foto:nth-child(3) { transform: translateX(5px) rotate(4deg); }
.tarjeta-combo:hover .fotos-1 .combo-foto { transform: scale(1.1); }
.combo-visual-vacio { color: var(--texto-desactivado); }
.combo-visual-vacio svg { width: 44px; height: 44px; }

.combo-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--gradiente-marca);
  color: #fff;
  font-size: 0.74rem;
  font-weight: 800;
  padding: 5px 11px;
  border-radius: var(--radio-full);
  font-variant-numeric: tabular-nums;
  box-shadow: 0 3px 14px rgba(236,72,153,0.5);
  animation: pulsoBadge 2.2s ease-in-out infinite;
}
.combo-badge svg { width: 11px; height: 11px; }
@keyframes pulsoBadge {
  0%, 100% { box-shadow: 0 3px 14px rgba(236,72,153,0.5); transform: scale(1); }
  50% { box-shadow: 0 3px 22px rgba(236,72,153,0.85); transform: scale(1.06); }
}

.combo-cuerpo { display: flex; flex-direction: column; gap: 10px; padding: 14px; flex: 1; }
.combo-nombre {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--texto-principal);
  line-height: 1.3;
  min-height: 2.4em;
}
.combo-precios { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.combo-normal { color: var(--texto-desactivado); text-decoration: line-through; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.combo-flecha { display: flex; color: var(--rosa-suave); }
.combo-flecha svg { width: 13px; height: 13px; }
.combo-final { color: var(--color-exito); font-weight: 800; font-size: 1.25rem; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.btn-combo {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid var(--borde-activo);
  color: var(--morado-hover);
  font-weight: 700;
  font-size: 0.84rem;
  padding: 9px;
  border-radius: var(--radio-md);
  cursor: pointer;
  transition: background var(--trans-normal), border-color var(--trans-normal), color var(--trans-normal), transform var(--trans-rapida);
}
.btn-combo svg { width: 15px; height: 15px; }
.btn-combo:active { transform: scale(0.97); }
.tarjeta-combo:hover .btn-combo { background: var(--gradiente-marca); border-color: transparent; color: #fff; }

/* ---------- CARRUSEL EVENTOS ---------- */
.seccion-carrusel { display: flex; flex-direction: column; gap: var(--esp-4); }
.carrusel-cabecera { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 0 2px; }
.carrusel-titulo { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); margin: 0; letter-spacing: -0.025em; }
.hero-carrusel {
  position: relative;
  width: 100%;
  height: 260px;
  overflow: hidden;
  padding: 6px;
}
.carrusel-track {
  display: flex;
  width: 100%;
  height: 100%;
  border-radius: var(--radio-lg);
  overflow: hidden;
  transition: transform 0.65s cubic-bezier(0.25, 1, 0.5, 1);
}
.carrusel-slide { flex: 0 0 100%; width: 100%; height: 100%; position: relative; cursor: pointer; }
.slide-img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
.slide-placeholder { width: 100%; height: 100%; background: var(--gradiente-sutil); display: flex; align-items: center; justify-content: center; }
.slide-placeholder svg { width: 64px; height: 64px; }
.slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(9,5,22,0.95) 0%, rgba(9,5,22,0.25) 55%, transparent 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 22px;
}
.slide-tag {
  background: var(--gradiente-marca);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: var(--radio-full);
  align-self: flex-start;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  box-shadow: var(--sombra-glow);
}
.slide-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.7rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 14px;
  line-height: 1.05;
  letter-spacing: -0.025em;
  text-shadow: 0 2px 16px rgba(0,0,0,0.85);
  text-wrap: balance;
}
.slide-btn {
  background: #fff;
  color: var(--fondo-app);
  border: none;
  padding: 10px 22px;
  border-radius: var(--radio-full);
  font-weight: 800;
  font-size: 0.85rem;
  align-self: flex-start;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  transition: transform var(--trans-normal), box-shadow var(--trans-normal);
}
.carrusel-slide:hover .slide-btn { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(168,85,247,0.45); }
.slide-btn:active { transform: translateY(0) scale(0.97); }
.slide-btn:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 8px 22px rgba(168,85,247,0.4); }

.carrusel-indicadores { position: absolute; bottom: 20px; right: 24px; display: flex; gap: 6px; z-index: 2; }
.indicador { width: 6px; height: 6px; background: rgba(255,255,255,0.35); border-radius: 50%; transition: all 0.3s ease; }
.indicador.activo { width: 20px; background: #fff; border-radius: 4px; }

/* ---------- ACCESOS BENTO ---------- */
.seccion-accesos { display: flex; flex-direction: column; gap: var(--esp-4); }
.bloque-titulo { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); margin: 0; padding: 0 2px; letter-spacing: -0.025em; }
.grid-accesos-mini { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.acceso-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  padding: 24px 12px;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-tarjeta);
}
.acceso-mini:active { transform: translateY(-1px) scale(0.98); }
.acceso-mini .icono-svg { width: 52px; height: 52px; border-radius: var(--radio-md); background: rgba(168,85,247,0.14); display: flex; align-items: center; justify-content: center; color: var(--morado-hover); transition: background var(--trans-normal), color var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal), transform var(--trans-normal); border: 1px solid var(--borde-sutil); }
.acceso-mini:hover .icono-svg { background: var(--gradiente-marca); color: #fff; border-color: transparent; box-shadow: var(--sombra-glow); transform: translateY(-2px) rotate(-4deg); }
.acceso-mini .icono-svg svg { width: 24px; height: 24px; }
.acceso-mini span { font-size: 0.82rem; font-weight: 700; color: var(--texto-secundario); letter-spacing: 0.01em; transition: color var(--trans-normal); }
.acceso-mini:hover span { color: var(--texto-principal); }

/* ---------- MARQUEE INFINITO ---------- */
.seccion-marquee { overflow: hidden; display: flex; flex-direction: column; gap: var(--esp-4); }
.seccion-cabecera { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 2px; gap: 12px; }
.seccion-cabecera-txt { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.seccion-cabecera h2 { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); letter-spacing: -0.025em; margin: 0; }
.link-ver-todo { color: var(--morado-hover); font-size: 0.85rem; text-decoration: none; font-weight: 700; flex-shrink: 0; padding: 2px; border-radius: var(--radio-sm); }
.link-ver-todo:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.marquee-contenedor {
  margin-inline: calc(-1 * var(--esp-4)); /* rompe el padding del padre para tocar los bordes */
  overflow: hidden;
  position: relative;
}
.marquee-track {
  display: flex;
  gap: 15px;
  width: max-content;
  animation: desplazarMarquee 32s linear infinite;
  padding-left: var(--esp-4);
}
@keyframes desplazarMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-33.333%); } /* contenido triplicado: 1/3 exacto = loop sin salto */
}

/* Tarjetas Mini Producto (imagen protagonista) */
.tarjeta-marquee-producto {
  flex: 0 0 190px;
  background: var(--gradiente-sutil);
  border-radius: var(--radio-lg);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--borde-sutil);
  cursor: pointer;
  transition: transform 0.3s var(--ease-suave), border-color var(--trans-normal), box-shadow var(--trans-normal);
  box-shadow: var(--sombra-tarjeta);
}
.tarjeta-marquee-producto:hover { border-color: var(--borde-activo); transform: translateY(-4px); box-shadow: 0 14px 34px rgba(10,6,26,0.5), var(--sombra-glow); }
.tarjeta-marquee-producto:active { transform: scale(0.95); }
.img-prod-contenedor { position: relative; width: 100%; height: 176px; border-radius: var(--radio-md); overflow: hidden; background: rgba(168,85,247,0.06); display: flex; align-items: center; justify-content: center; }
.img-prod { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s var(--ease-suave); }
.tarjeta-marquee-producto:hover .img-prod { transform: scale(1.08); }
.img-prod-velo { position: absolute; inset: 0; background: linear-gradient(to top, rgba(9,5,22,0.78) 0%, transparent 42%); pointer-events: none; }
.precio-flotante {
  position: absolute;
  bottom: 8px;
  left: 8px;
  margin: 0;
  background: var(--gradiente-marca);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 4px 11px;
  border-radius: var(--radio-full);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  box-shadow: 0 3px 12px rgba(236,72,153,0.45);
}
.img-prod-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--texto-desactivado); }
.img-prod-placeholder svg { width: 48px; height: 48px; }
.info-prod-mini { padding: 0 4px 4px; }
.info-prod-mini h4 { font-size: 0.92rem; font-weight: 700; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--texto-principal); line-height: 1.25; }

/* Skeleton de carga (coincide con la forma de las tarjetas) */
.marquee-skeleton { display: flex; gap: 15px; overflow: hidden; padding: 0 2px; }
.skeleton-card {
  flex: 0 0 190px;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-img { width: 100%; height: 176px; border-radius: var(--radio-md); }
.skeleton-linea { height: 12px; border-radius: var(--radio-sm); }
.skeleton-linea-titulo { width: 85%; }
.skeleton-linea-precio { width: 45%; height: 16px; }
.skeleton-img,
.skeleton-linea {
  background: linear-gradient(100deg, rgba(168,85,247,0.08) 30%, rgba(168,85,247,0.2) 50%, rgba(168,85,247,0.08) 70%);
  background-size: 200% 100%;
  animation: brilloSkeleton 1.4s ease-in-out infinite;
}
@keyframes brilloSkeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ---------- REVEALS AL SCROLL ---------- */
@media (prefers-reduced-motion: no-preference) {
  .reveal { opacity: 0; transform: translateY(18px); transition: opacity 0.6s var(--ease-suave), transform 0.6s var(--ease-suave); }
  .reveal.visible { opacity: 1; transform: none; }
}

/* ---------- MODAL EVENTO SUSPENDIDO ---------- */
.modal-fondo { position: fixed; inset: 0; background: rgba(9,5,22,0.86); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); width: 100%; box-shadow: var(--sombra-modal); }
.modal-cancelado {
  max-width: 400px;
  text-align: center;
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: var(--sombra-modal), 0 0 40px rgba(239, 68, 68, 0.18);
  overflow: hidden;
}
.modal-cancelado-icono { display: flex; justify-content: center; padding-top: 1.75rem; }
.modal-cancelado-icono svg { width: 52px; height: 52px; padding: 12px; border-radius: var(--radio-full); background: rgba(239, 68, 68, 0.12); }
.modal-cancelado-cuerpo { padding: 1.1rem 1.5rem 1.6rem; }
.modal-cancelado-cuerpo h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--texto-principal);
  letter-spacing: -0.02em;
  margin-bottom: 0.6rem;
}
.modal-cancelado-cuerpo p {
  color: var(--texto-secundario);
  font-size: 0.95rem;
  line-height: 1.55;
  margin-bottom: 1.5rem;
  text-wrap: pretty;
}
.btn-modal-entendido {
  width: 100%;
  background: var(--color-error);
  color: #fff;
  border: none;
  padding: 0.8rem 1rem;
  border-radius: var(--radio-md);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform var(--trans-rapida), box-shadow var(--trans-normal), filter var(--trans-normal);
}
.btn-modal-entendido:hover { filter: brightness(1.08); box-shadow: 0 8px 22px rgba(239, 68, 68, 0.4); }
.btn-modal-entendido:active { transform: scale(0.98); }
.btn-modal-entendido:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4); }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 419px) {
  .fila-qr { grid-template-columns: 1fr; }
}
@media (min-width: 560px) {
  .grid-accesos-mini { grid-template-columns: repeat(4, 1fr); }
}
@media (min-width: 768px) {
  .vista-inicio { padding: var(--esp-5); padding-bottom: 104px; }
  .marquee-contenedor { margin-inline: calc(-1 * var(--esp-5)); }
  .marquee-track { padding-left: var(--esp-5); }
  .hero-carrusel { height: 320px; }
  .zona-pago { gap: var(--esp-4); }
}
@media (max-width: 480px) {
  .billetera-footer { flex-direction: column; align-items: stretch; gap: 12px; }
  .billetera-footer .cta-isla { justify-content: center; }
  .billetera-marca { text-align: center; }
}

/* ---------- MENOS MOVIMIENTO ---------- */
@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
  .eq-vivo i { animation: none; }
  .banner-evento-actual { animation: none; }
  .skeleton-img, .skeleton-linea { animation: none; }
  .brillo-hover:hover::after { animation: none; }
  .combo-badge { animation: none; }
  .qr-fs-enter-active, .qr-fs-leave-active { transition: none; }
  .combo-foto, .acceso-mini .icono-svg, .tarjeta-marquee-producto, .img-prod { transition: none; }
}
</style>
