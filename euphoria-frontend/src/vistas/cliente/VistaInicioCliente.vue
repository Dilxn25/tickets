<template>
  <div class="vista-inicio fade-in">
    
    <!-- Banner Superior de Evento Actual -->
    <div v-if="eventoActual" class="banner-evento-actual fade-in">
      <div class="banner-contenido">
        <span class="punto-verde"></span>
        <div class="banner-texto">
          <span class="banner-label">Estás en</span>
          <span class="banner-nombre">{{ eventoActual.nombre }}</span>
        </div>
      </div>
      <button class="btn-pedir-ahora brillo-hover" @click="router.push('/cliente/catalogo')">Pedir ahora</button>
    </div>

    <!-- Cabecera -->
    <div class="header-dashboard">
      <div class="user-info">
        <h1 class="titulo-hola">Hola, <span class="resaltado-neon">{{ nombreCorto }}</span></h1>
        <p class="subtitulo">Descubre lo que tenemos para ti hoy</p>
      </div>
    </div>

    <!-- Tarjeta de Saldo de Billetera -->
    <div class="tarjeta-saldo-principal">
      <div class="saldo-contenido">
        <div class="saldo-info-left">
          <span class="saldo-etiqueta">Saldo en tu Billetera</span>
          <h2 class="saldo-monto" v-if="!cargandoBilletera">
            Bs. {{ saldoBilletera.toFixed(2) }}
          </h2>
          <div v-else class="saldo-cargando">Cargando...</div>
        </div>
        <button class="btn-recargar brillo-hover" @click="router.push('/cliente/billetera')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6m0 0l-3-3m3 3l3-3"></path>
            <path d="M12 18a6 6 0 0 1-6-6"></path>
          </svg>
          Recargar
        </button>
      </div>
    </div>

    <!-- Combos / Promociones recomendadas -->
    <div v-if="combos.length > 0" class="seccion-combos">
      <div class="combos-encabezado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
        <div>
          <h3 class="combos-titulo">Aprovecha con tu billetera</h3>
          <p class="combos-sub">Combos que suelen pedir juntos, con descuento</p>
        </div>
      </div>
      <div class="combos-scroll escalonar">
        <div v-for="(combo, i) in combos" :key="i" class="tarjeta-combo" @click="agregarCombo(combo)">
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
    <div class="hero-carrusel" v-if="!cargandoEventos && eventos.length > 0">
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

    <!-- Accesos Rápidos Minimalistas -->
    <div class="grid-accesos-mini escalonar">
      <div class="acceso-mini" @click="router.push('/cliente/eventos')">
        <div class="icono-svg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <span>Eventos</span>
      </div>
      <div class="acceso-mini" @click="router.push('/cliente/catalogo')">
        <div class="icono-svg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22L16 22"></path><path d="M12 18L12 22"></path><path d="M12 15C16.4183 15 20 11.4183 20 7L4 7C4 11.4183 7.58172 15 12 15Z"></path><path d="M4 3L20 3"></path></svg>
        </div>
        <span>Bebidas</span>
      </div>
      <div class="acceso-mini" @click="router.push('/cliente/carrito')">
        <div class="icono-svg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        </div>
        <span>Carrito</span>
      </div>
      <div class="acceso-mini" @click="router.push('/cliente/perfil')">
        <div class="icono-svg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <span>Perfil</span>
      </div>
    </div>

    <!-- Sección: Productos Destacados (Infinite Marquee) -->
    <section class="seccion-marquee">
      <div class="seccion-cabecera">
        <h2>Catálogo exclusivo</h2>
        <RouterLink to="/cliente/catalogo" class="link-ver-todo">Ver menú</RouterLink>
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
.vista-inicio {
  padding: var(--esp-4);
  padding-bottom: 96px;
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}

/* Banner superior */
.banner-evento-actual {
  background: var(--glass-fondo);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-lg);
  padding: 12px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--esp-3);
  box-shadow: var(--sombra-tarjeta);
  animation: deslizarAbajo 0.5s var(--ease-rebote);
}
@keyframes deslizarAbajo { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes latido { from { transform: scale(1); opacity: 0.85; } to { transform: scale(1.25); opacity: 1; } }

.banner-contenido { display: flex; align-items: center; gap: 12px; min-width: 0; }
.punto-verde { flex-shrink: 0; width: 8px; height: 8px; background: var(--color-exito); border-radius: 50%; box-shadow: 0 0 12px var(--color-exito); animation: latido 1.5s infinite alternate; }
.banner-texto { display: flex; flex-direction: column; min-width: 0; }
.banner-label { font-size: 0.65rem; color: var(--texto-desactivado); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; }
.banner-nombre { font-size: 1rem; font-weight: 800; color: var(--texto-principal); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.01em; }
.btn-pedir-ahora { flex-shrink: 0; background: var(--gradiente-marca); color: #fff; border: none; padding: 9px 18px; border-radius: var(--radio-full); font-weight: 700; font-size: 0.8rem; cursor: pointer; box-shadow: 0 4px 15px rgba(236,72,153,0.4); transition: transform var(--trans-rapida), box-shadow var(--trans-normal); }
.btn-pedir-ahora:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(236,72,153,0.5), var(--glow-morado); }
.btn-pedir-ahora:active { transform: scale(0.94); }
.btn-pedir-ahora:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 8px 22px rgba(236,72,153,0.5); }

/* Hero */
.header-dashboard { margin-top: 2px; }
.titulo-hola { font-family: var(--fuente-titulo); font-size: 2.15rem; font-weight: 800; color: var(--texto-principal); margin-bottom: 0.25rem; letter-spacing: -0.03em; line-height: 1.05; text-wrap: balance; }
.resaltado-neon { background: var(--gradiente-marca); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; filter: drop-shadow(0 0 10px rgba(168,85,247,0.35)); }
.subtitulo { color: var(--texto-secundario); font-size: 0.95rem; font-weight: 500; }

/* HERO CARRUSEL ESTILO E-COMMERCE */
/* Combos / Promociones */
.seccion-combos { margin-bottom: 1.75rem; }
.combos-encabezado {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.9rem;
  color: var(--rosa-acento);
}
.combos-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--texto-principal);
  margin: 0;
  letter-spacing: -0.02em;
}
.combos-sub {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  margin: 3px 0 0 0;
  line-height: 1.4;
}
.combos-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.tarjeta-combo {
  position: relative;
  flex: 0 0 190px;
  scroll-snap-align: start;
  background: linear-gradient(160deg, var(--fondo-tarjeta-alt), var(--fondo-tarjeta));
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 16px;
  cursor: pointer;
  transition: transform 0.25s var(--ease-suave), border-color var(--trans-normal), box-shadow var(--trans-normal);
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--sombra-tarjeta);
}
.tarjeta-combo:hover {
  transform: translateY(-4px);
  border-color: var(--borde-activo);
  box-shadow: 0 14px 34px rgba(0,0,0,0.45), var(--sombra-glow);
}
.tarjeta-combo:active { transform: translateY(-1px) scale(0.99); }
.combo-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: var(--radio-full);
  font-variant-numeric: tabular-nums;
  box-shadow: 0 3px 10px rgba(236,72,153,0.35);
}
.combo-nombre {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--texto-principal);
  line-height: 1.3;
  padding-right: 40px;
  min-height: 2.4em;
}
.combo-precios {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.combo-normal {
  color: var(--texto-desactivado);
  text-decoration: line-through;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.combo-final {
  color: var(--color-exito);
  font-weight: 800;
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
}
.btn-combo {
  margin-top: auto;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid var(--borde-activo);
  color: var(--morado-hover);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 8px;
  border-radius: var(--radio-md);
  cursor: pointer;
  transition: background var(--trans-normal), border-color var(--trans-normal), color var(--trans-normal), transform var(--trans-rapida);
}
.btn-combo:active { transform: scale(0.97); }
.tarjeta-combo:hover .btn-combo {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border-color: transparent;
  color: #fff;
}

.hero-carrusel {
  position: relative;
  width: 100%;
  height: 250px;
  border-radius: var(--radio-xl);
  overflow: hidden;
  border: 1px solid var(--borde-sutil);
  box-shadow: var(--sombra-tarjeta);
}
.carrusel-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
}
.carrusel-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
}
.slide-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.slide-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--fondo-tarjeta), var(--fondo-tarjeta));
  display: flex;
  align-items: center;
  justify-content: center;
}
.slide-placeholder svg { width: 64px; height: 64px; }
.slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
}
.slide-tag {
  background: var(--gradiente-marca);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 4px 11px;
  border-radius: var(--radio-full);
  align-self: flex-start;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  box-shadow: var(--sombra-glow);
}
.slide-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.55rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
  line-height: 1.08;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 14px rgba(0,0,0,0.85);
  text-wrap: balance;
}
.slide-btn {
  background: #fff;
  color: var(--fondo-app);
  border: none;
  padding: 9px 20px;
  border-radius: var(--radio-full);
  font-weight: 800;
  font-size: 0.85rem;
  align-self: flex-start;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  transition: transform var(--trans-normal), box-shadow var(--trans-normal);
}
.carrusel-slide:hover .slide-btn {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(168,85,247,0.4);
}
.slide-btn:active { transform: translateY(0) scale(0.97); }
.slide-btn:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 8px 22px rgba(168,85,247,0.4); }

.carrusel-indicadores {
  position: absolute;
  bottom: 15px;
  right: 20px;
  display: flex;
  gap: 6px;
}
.indicador {
  width: 6px;
  height: 6px;
  background: rgba(255,255,255,0.3);
  border-radius: 50%;
  transition: all 0.3s ease;
}
.indicador.activo {
  width: 18px;
  background: #fff;
  border-radius: 4px;
}

/* Accesos Rápidos Minimalistas */
.grid-accesos-mini {
  display: flex;
  justify-content: space-between;
  gap: var(--esp-2);
  background: var(--fondo-tarjeta);
  border-radius: var(--radio-lg);
  padding: 16px 12px;
  border: 1px solid var(--borde-sutil);
  box-shadow: var(--sombra-tarjeta);
}
.acceso-mini { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: transform 0.3s var(--ease-rebote); }
.acceso-mini:hover { transform: translateY(-3px); }
.acceso-mini:active { transform: translateY(-1px) scale(0.97); }
.acceso-mini .icono-svg { width: 46px; height: 46px; border-radius: var(--radio-md); background: rgba(168,85,247,0.12); display: flex; align-items: center; justify-content: center; color: var(--morado-hover); transition: background var(--trans-normal), color var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal); border: 1px solid var(--borde-sutil); }
.acceso-mini:hover .icono-svg { background: var(--gradiente-marca); color: #fff; border-color: transparent; box-shadow: var(--sombra-glow); }
.acceso-mini .icono-svg svg { width: 22px; height: 22px; }
.acceso-mini span { font-size: 0.75rem; font-weight: 600; color: var(--texto-secundario); letter-spacing: 0.02em; transition: color var(--trans-normal); }
.acceso-mini:hover span { color: var(--texto-principal); }

/* SECCIÓN MARQUEE INFINITO */
.seccion-marquee { margin-top: 4px; overflow: hidden; }
.seccion-cabecera { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem; padding: 0 5px; }
.seccion-cabecera h2 { font-family: var(--fuente-titulo); font-size: 1.35rem; font-weight: 800; color: var(--texto-principal); letter-spacing: -0.025em; }
.link-ver-todo { color: var(--morado-brillante); font-size: 0.85rem; text-decoration: none; font-weight: 700; transition: color var(--trans-rapida); padding: 2px 4px; border-radius: var(--radio-sm); }
.link-ver-todo:hover { color: var(--morado-hover); }
.link-ver-todo:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.marquee-contenedor {
  width: 100vw;
  margin-left: -1rem; /* Rompe el padding del contenedor padre para tocar los bordes */
  overflow: hidden;
  position: relative;
}
.marquee-track {
  display: flex;
  gap: 15px;
  width: max-content;
  animation: desplazarMarquee 30s linear infinite;
  padding-left: 1rem;
}

@keyframes desplazarMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); } /* Se asume que el contenido está duplicado para que el loop sea fluido */
}

/* Tarjetas Mini Producto */
.tarjeta-marquee-producto { flex: 0 0 160px; background: var(--gradiente-sutil); border-radius: var(--radio-lg); padding: 12px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--borde-sutil); cursor: pointer; transition: transform 0.3s var(--ease-suave), border-color var(--trans-normal), box-shadow var(--trans-normal); box-shadow: var(--sombra-tarjeta); }
.tarjeta-marquee-producto:hover { border-color: var(--borde-activo); box-shadow: 0 12px 30px rgba(0,0,0,0.45), var(--sombra-glow); }
.tarjeta-marquee-producto:active { transform: scale(0.95); }
.img-prod-contenedor { width: 100%; height: 140px; border-radius: var(--radio-md); overflow: hidden; background: rgba(168,85,247,0.06); display: flex; align-items: center; justify-content: center; }
.img-prod { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s var(--ease-suave); }
.tarjeta-marquee-producto:hover .img-prod { transform: scale(1.08); }
.img-prod-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--texto-desactivado); }
.img-prod-placeholder svg { width: 48px; height: 48px; }
.info-prod-mini h4 { font-size: 0.9rem; font-weight: 700; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--texto-principal); line-height: 1.25; }
.info-prod-mini .precio { font-size: 1.1rem; font-weight: 800; color: var(--rosa-acento); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

.loader-horizontal, .mensaje-vacio { padding: 2rem 0; text-align: center; color: var(--texto-secundario); font-size: 0.9rem; }

/* Skeleton de carga del marquee (coincide con la forma de las tarjetas) */
.marquee-skeleton { display: flex; gap: 15px; overflow: hidden; padding: 0 5px; }
.skeleton-card {
  flex: 0 0 160px;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-img { width: 100%; height: 140px; border-radius: var(--radio-md); }
.skeleton-linea { height: 12px; border-radius: var(--radio-sm); }
.skeleton-linea-titulo { width: 85%; }
.skeleton-linea-precio { width: 45%; height: 16px; }
.skeleton-img,
.skeleton-linea {
  background: linear-gradient(100deg, rgba(168,85,247,0.08) 30%, rgba(168,85,247,0.18) 50%, rgba(168,85,247,0.08) 70%);
  background-size: 200% 100%;
  animation: brilloSkeleton 1.4s ease-in-out infinite;
}
@keyframes brilloSkeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) {
  .skeleton-img, .skeleton-linea { animation: none; }
}
.modal-fondo { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); width: 100%; box-shadow: var(--sombra-modal); }

/* Modal de evento suspendido */
.modal-cancelado {
  max-width: 400px;
  text-align: center;
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: var(--sombra-modal), 0 0 40px rgba(239, 68, 68, 0.18);
  overflow: hidden;
}
.modal-cancelado-icono {
  display: flex;
  justify-content: center;
  padding-top: 1.75rem;
}
.modal-cancelado-icono svg {
  width: 52px;
  height: 52px;
  padding: 12px;
  border-radius: var(--radio-full);
  background: rgba(239, 68, 68, 0.12);
}
.modal-cancelado-cuerpo { padding: 1.1rem 1.5rem 1.6rem; }
.modal-cancelado-cuerpo h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.25rem;
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

/* Tarjeta de Saldo Principal */
.tarjeta-saldo-principal {
  position: relative;
  overflow: hidden;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-lg);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  box-shadow: var(--sombra-tarjeta), var(--sombra-glow);
  animation: deslizarAbajo 0.5s var(--ease-rebote);
}
.tarjeta-saldo-principal::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 100% 0%, rgba(236,72,153,0.18), transparent 55%);
  pointer-events: none;
}

.saldo-contenido {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
}

.saldo-info-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.saldo-etiqueta {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}

.saldo-monto {
  font-family: var(--fuente-titulo);
  font-size: 2.3rem;
  font-weight: 800;
  background: var(--gradiente-texto);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  margin: 0;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
}

.saldo-cargando {
  font-size: 1rem;
  color: var(--texto-desactivado);
  font-weight: 600;
}

.btn-recargar {
  background: var(--gradiente-marca);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radio-full);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform var(--trans-normal), box-shadow var(--trans-normal);
  box-shadow: 0 6px 18px rgba(168,85,247,0.35);
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-recargar:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(236,72,153,0.45), var(--glow-morado);
}

.btn-recargar:active {
  transform: translateY(0px) scale(0.97);
}

.btn-recargar:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco), 0 6px 18px rgba(168,85,247,0.35);
}

.btn-recargar svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 640px) {
  .tarjeta-saldo-principal {
    padding: 1rem;
    flex-direction: column;
    align-items: flex-start;
  }

  .saldo-contenido {
    flex-direction: column;
    width: 100%;
  }

  .saldo-monto {
    font-size: 1.9rem;
  }

  .btn-recargar {
    width: 100%;
    justify-content: center;
  }
}

/* Respeta la preferencia de menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
  .punto-verde { animation: none; }
  .banner-evento-actual,
  .tarjeta-saldo-principal { animation: none; }
  .brillo-hover:hover::after { animation: none; }
}
</style>
