<template>
  <div class="vista-inicio entrada-cine">

    <!-- HERO: saludo grande + evento activo -->
    <header class="hero-inicio">
      <div class="orbe-deco morado orbe-hero-1"></div>
      <div class="orbe-deco rosa orbe-hero-2"></div>

      <!-- Banner Superior de Evento Actual -->
      <div v-if="eventoActual" class="banner-evento-actual brillo-hover" @click="router.push('/cliente/catalogo')">
        <div class="banner-contenido">
          <span class="punto-verde"></span>
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

    <!-- BILLETERA PREMIUM (double-bezel tipo tarjeta física) -->
    <section class="billetera-bezel bezel hover-elevar">
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
    </section>

    <!-- Combos / Promociones recomendadas -->
    <div v-if="combos.length > 0" class="seccion-combos">
      <div class="combos-encabezado">
        <h3 class="combos-titulo">Combos que rinden más</h3>
        <p class="combos-sub">Pedidos que suelen ir juntos, con descuento aplicado.</p>
      </div>
      <div class="combos-scroll escalonar">
        <div v-for="(combo, i) in combos" :key="i" class="tarjeta-combo hover-elevar" @click="agregarCombo(combo)">
          <div class="combo-badge">-{{ combo.descuento_pct }}%</div>
          <div class="combo-nombre">{{ combo.nombre }}</div>
          <div class="combo-precios">
            <span class="combo-normal">Bs {{ combo.precio_normal.toFixed(2) }}</span>
            <span class="combo-final">Bs {{ combo.precio_combo.toFixed(2) }}</span>
          </div>
          <button class="btn-combo" type="button">Agregar combo</button>
        </div>
      </div>
    </div>

    <!-- HERO CAROUSEL: Promociona eventos al estilo E-commerce -->
    <section class="seccion-carrusel" v-if="!cargandoEventos && eventos.length > 0">
      <div class="carrusel-cabecera">
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

    <!-- Accesos Rápidos estilo bento -->
    <section class="seccion-accesos">
      <h3 class="bloque-titulo">Explora Euphoria</h3>
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

    <!-- Sección: Productos Destacados (Infinite Marquee) -->
    <section class="seccion-marquee">
      <div class="seccion-cabecera">
        <div class="seccion-cabecera-txt">
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
              <img v-if="prod.url_imagen" :src="prod.url_imagen" class="img-prod" />
              <div v-else class="img-prod-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 22L16 22"></path><path d="M12 18L12 22"></path><path d="M12 15C16.4183 15 20 11.4183 20 7L4 7C4 11.4183 7.58172 15 12 15Z"></path><path d="M4 3L20 3"></path></svg>
              </div>
            </div>
            <div class="info-prod-mini">
              <h4>{{ prod.nombre_producto }}</h4>
              <p class="precio">Bs. {{ prod.precio_base }}</p>
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

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'
import { servicioEventos } from '@/servicios-api/servicio-eventos.js'
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import clienteHttp from '@/servicios-api/cliente-http.js'

const router = useRouter()
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
    // Si hay muchos, tomamos los primeros 6 para el marquee
    productos.value = dataP.slice(0, 6)
  } catch (error) {
    console.error('Error cargando productos:', error)
  } finally {
    cargandoProductos.value = false
  }

  // Cargar saldo de billetera
  try {
    const dataSaldo = await servicioBilletera.obtenerSaldo()
    saldoBilletera.value = dataSaldo.saldo_actual || 0
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

// Agrega ambos productos del combo al carrito y lleva al carrito
function agregarCombo(combo) {
  combo.productos.forEach(p => {
    const prod = productosCompletos.value.find(x => x.id_producto === p.id_producto)
    if (prod) tiendaCarrito.agregarItem(prod)
  })
  router.push('/cliente/carrito')
}

function iniciarCarrusel() {
  carruselInterval = setInterval(() => {
    if (eventos.value.length > 0) {
      carruselIndex.value = (carruselIndex.value + 1) % eventos.value.length
    }
  }, 4000) // Cambia cada 4 segundos
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
})

onUnmounted(() => {
  if (carruselInterval) clearInterval(carruselInterval)
})
</script>

<style scoped>
/* ============================================================
   HOME CLIENTE — "Euphoria Neon Nocturne" (rediseño bold)
   Vidrio vantablack, orbes de neon, double-bezel de hardware,
   tipografia display grande. Marca morado/magenta intacta.
   ============================================================ */
.vista-inicio {
  padding: var(--esp-4);
  padding-bottom: 104px;
  display: flex;
  flex-direction: column;
  gap: var(--esp-6);
}

/* ---------- HERO (saludo grande + evento en vivo) ---------- */
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

/* Banner evento en vivo (pildora de vidrio) */
.banner-evento-actual {
  position: relative;
  z-index: 1;
  cursor: pointer;
  background: var(--glass-fondo);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-full);
  padding: 10px 12px 10px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-3);
  box-shadow: var(--sombra-tarjeta);
  animation: deslizarAbajo 0.55s var(--ease-rebote);
  transition: border-color var(--trans-normal), box-shadow var(--trans-normal), transform var(--trans-normal);
}
.banner-evento-actual:hover { border-color: var(--borde-activo); box-shadow: var(--sombra-tarjeta), var(--sombra-glow); transform: translateY(-1px); }
@keyframes deslizarAbajo { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes latido { from { transform: scale(1); opacity: 0.85; } to { transform: scale(1.3); opacity: 1; } }

.banner-contenido { display: flex; align-items: center; gap: 12px; min-width: 0; }
.punto-verde { flex-shrink: 0; width: 9px; height: 9px; background: var(--color-exito); border-radius: 50%; box-shadow: 0 0 12px var(--color-exito); animation: latido 1.4s infinite alternate; }
.banner-texto { display: flex; flex-direction: column; min-width: 0; }
.banner-label { font-size: 0.6rem; color: var(--texto-desactivado); text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; }
.banner-nombre { font-size: 0.98rem; font-weight: 800; color: var(--texto-principal); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.01em; }
.btn-pedir-ahora { flex-shrink: 0; background: var(--gradiente-marca); color: #fff; border: none; padding: 9px 18px; border-radius: var(--radio-full); font-weight: 700; font-size: 0.8rem; cursor: pointer; box-shadow: 0 4px 15px rgba(236,72,153,0.4); transition: transform var(--trans-rapida), box-shadow var(--trans-normal); }
.btn-pedir-ahora:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(236,72,153,0.5), var(--glow-morado); }
.btn-pedir-ahora:active { transform: scale(0.94); }
.btn-pedir-ahora:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 8px 22px rgba(236,72,153,0.5); }

/* ---------- BILLETERA PREMIUM (double-bezel tipo tarjeta) ---------- */
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
  flex: 0 0 200px;
  scroll-snap-align: start;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--sombra-tarjeta);
}
.tarjeta-combo:hover { border-color: var(--borde-activo); }
.tarjeta-combo:active { transform: translateY(-1px) scale(0.99); }
.combo-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  background: var(--gradiente-marca);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: var(--radio-full);
  font-variant-numeric: tabular-nums;
  box-shadow: 0 3px 12px rgba(236,72,153,0.4);
}
.combo-nombre {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--texto-principal);
  line-height: 1.3;
  padding-right: 44px;
  min-height: 2.4em;
}
.combo-precios { display: flex; align-items: baseline; gap: 8px; }
.combo-normal { color: var(--texto-desactivado); text-decoration: line-through; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.combo-final { color: var(--color-exito); font-weight: 800; font-size: 1.2rem; font-variant-numeric: tabular-nums; }
.btn-combo {
  margin-top: auto;
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
.acceso-mini .icono-svg { width: 52px; height: 52px; border-radius: var(--radio-md); background: rgba(168,85,247,0.14); display: flex; align-items: center; justify-content: center; color: var(--morado-hover); transition: background var(--trans-normal), color var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal); border: 1px solid var(--borde-sutil); }
.acceso-mini:hover .icono-svg { background: var(--gradiente-marca); color: #fff; border-color: transparent; box-shadow: var(--sombra-glow); }
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
  width: 100vw;
  margin-left: calc(-1 * var(--esp-4)); /* rompe el padding del padre para tocar los bordes */
  overflow: hidden;
  position: relative;
}
.marquee-track {
  display: flex;
  gap: 15px;
  width: max-content;
  animation: desplazarMarquee 30s linear infinite;
  padding-left: var(--esp-4);
}
@keyframes desplazarMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); } /* contenido triplicado: loop fluido */
}

/* Tarjetas Mini Producto */
.tarjeta-marquee-producto { flex: 0 0 168px; background: var(--gradiente-sutil); border-radius: var(--radio-lg); padding: 12px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--borde-sutil); cursor: pointer; transition: transform 0.3s var(--ease-suave), border-color var(--trans-normal), box-shadow var(--trans-normal); box-shadow: var(--sombra-tarjeta); }
.tarjeta-marquee-producto:hover { border-color: var(--borde-activo); transform: translateY(-4px); box-shadow: 0 14px 34px rgba(10,6,26,0.5), var(--sombra-glow); }
.tarjeta-marquee-producto:active { transform: scale(0.95); }
.img-prod-contenedor { width: 100%; height: 144px; border-radius: var(--radio-md); overflow: hidden; background: rgba(168,85,247,0.06); display: flex; align-items: center; justify-content: center; }
.img-prod { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s var(--ease-suave); }
.tarjeta-marquee-producto:hover .img-prod { transform: scale(1.08); }
.img-prod-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--texto-desactivado); }
.img-prod-placeholder svg { width: 48px; height: 48px; }
.info-prod-mini h4 { font-size: 0.9rem; font-weight: 700; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--texto-principal); line-height: 1.25; }
.info-prod-mini .precio { font-size: 1.1rem; font-weight: 800; color: var(--rosa-suave); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

/* Skeleton de carga (coincide con la forma de las tarjetas) */
.marquee-skeleton { display: flex; gap: 15px; overflow: hidden; padding: 0 2px; }
.skeleton-card {
  flex: 0 0 168px;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-img { width: 100%; height: 144px; border-radius: var(--radio-md); }
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

/* ---------- MODAL EVENTO SUSPENDIDO ---------- */
.modal-fondo { position: fixed; inset: 0; background: rgba(9,5,22,0.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
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
@media (min-width: 560px) {
  .grid-accesos-mini { grid-template-columns: repeat(4, 1fr); }
}
@media (min-width: 768px) {
  .vista-inicio { padding: var(--esp-5); padding-bottom: 104px; }
  .marquee-contenedor { margin-left: calc(-1 * var(--esp-5)); }
  .marquee-track { padding-left: var(--esp-5); }
  .hero-carrusel { height: 320px; }
}
@media (max-width: 480px) {
  .billetera-footer { flex-direction: column; align-items: stretch; gap: 12px; }
  .billetera-footer .cta-isla { justify-content: center; }
  .billetera-marca { text-align: center; }
}

/* ---------- MENOS MOVIMIENTO ---------- */
@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
  .punto-verde { animation: none; }
  .banner-evento-actual { animation: none; }
  .skeleton-img, .skeleton-linea { animation: none; }
  .brillo-hover:hover::after { animation: none; }
}
</style>
