<template>
  <div class="vista-inicio fade-in">
    
    <!-- Banner Superior de Evento Actual -->
    <div v-if="eventoActual" class="banner-evento-actual fade-in">
      <div class="banner-contenido">
        <span class="punto-verde"></span>
        <div class="banner-texto">
          <span class="banner-label">Estás en:</span>
          <span class="banner-nombre">{{ eventoActual.nombre }}</span>
        </div>
      </div>
      <button class="btn-pedir-ahora" @click="router.push('/cliente/catalogo')">Pedir Ahora</button>
    </div>

    <!-- Cabecera -->
    <div class="header-dashboard">
      <div class="user-info">
        <h1 class="titulo-hola">Hola, <span class="resaltado-neon">{{ nombreCorto }}</span></h1>
        <p class="subtitulo">Descubre lo que tenemos para ti hoy.</p>
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
        <button class="btn-recargar" @click="router.push('/cliente/billetera')">
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
      <div class="combos-scroll">
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
            <span class="slide-tag">PRÓXIMO EVENTO</span>
            <h2 class="slide-titulo">{{ evento.nombre_evento }}</h2>
            <button class="slide-btn">Ver Detalles</button>
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
    <div class="grid-accesos-mini">
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
        <h2>Catálogo Exclusivo</h2>
        <RouterLink to="/cliente/catalogo" class="link-ver-todo">Ver menú</RouterLink>
      </div>
      
      <div v-if="cargandoProductos" class="loader-horizontal">Cargando catálogo...</div>
      
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
        <div class="modal fade-in" style="max-width: 400px; text-align: center; border-left: 4px solid var(--color-error);">
          <div class="modal-cabecera" style="justify-content: center; border: none; padding-bottom: 0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 10px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div style="padding: 1rem 1.5rem 1.5rem 1.5rem;">
            <h3 style="color: var(--texto-principal); margin-bottom: 10px;">Evento Suspendido</h3>
            <p style="color: var(--texto-secundario); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
              El administrador ha cancelado o modificado la disponibilidad del evento al que estabas registrado por causas de fuerza mayor.
              <br><br>Tu sesión en este evento ha sido cerrada.
            </p>
            <button class="btn btn-primario" style="width: 100%; background: var(--color-error); color: #fff;" @click="modalCancelado=false">Entendido</button>
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
  padding: 1rem;
  padding-bottom: 90px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Banner superior */
.banner-evento-actual {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 12px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  animation: deslizarAbajo 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes deslizarAbajo { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

.banner-contenido { display: flex; align-items: center; gap: 12px; }
.punto-verde { width: 8px; height: 8px; background: var(--color-exito); border-radius: 50%; box-shadow: 0 0 12px var(--color-exito); animation: latido 1.5s infinite alternate; }
.banner-texto { display: flex; flex-direction: column; }
.banner-label { font-size: 0.65rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; }
.banner-nombre { font-size: 1rem; font-weight: 800; color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
.btn-pedir-ahora { background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); color: #fff; border: none; padding: 8px 16px; border-radius: 14px; font-weight: 700; font-size: 0.8rem; cursor: pointer; box-shadow: 0 4px 15px rgba(219,39,119,0.4); transition: transform 0.2s; }
.btn-pedir-ahora:active { transform: scale(0.9); }

/* Hero */
.header-dashboard { margin-top: 5px; margin-bottom: 10px; }
.titulo-hola { font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 0.2rem; letter-spacing: -0.5px; }
.resaltado-neon { background: linear-gradient(135deg, var(--color-info), #0072ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 8px rgba(0,198,255,0.3)); }
.subtitulo { color: rgba(255,255,255,0.5); font-size: 0.95rem; font-weight: 500; }

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
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--texto-principal);
  margin: 0;
}
.combos-sub {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  margin: 2px 0 0 0;
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
  border-radius: var(--radio-lg, 16px);
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tarjeta-combo:hover {
  transform: translateY(-3px);
  border-color: var(--borde-activo);
}
.combo-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
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
}
.combo-final {
  color: var(--color-exito);
  font-weight: 800;
  font-size: 1.1rem;
}
.btn-combo {
  margin-top: auto;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid var(--borde-activo);
  color: var(--morado-hover);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.tarjeta-combo:hover .btn-combo {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border-color: transparent;
  color: #fff;
}

.hero-carrusel {
  position: relative;
  width: 100%;
  height: 250px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  margin-bottom: 10px;
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
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(5px);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 10px;
  align-self: flex-start;
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.slide-titulo {
  font-size: 1.5rem;
  font-weight: 900;
  color: #fff;
  margin-bottom: 10px;
  line-height: 1.1;
  text-shadow: 0 2px 10px rgba(0,0,0,0.8);
}
.slide-btn {
  background: #fff;
  color: #000;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.85rem;
  align-self: flex-start;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255,255,255,0.3);
}

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
  background: rgba(255,255,255,0.03); 
  border-radius: 24px; 
  padding: 15px 20px; 
  border: 1px solid rgba(255,255,255,0.05); 
  box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
  margin-bottom: 10px;
}
.acceso-mini { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.acceso-mini:hover { transform: translateY(-3px); }
.acceso-mini .icono-svg { width: 44px; height: 44px; border-radius: 14px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: #fff; transition: all 0.3s ease; border: 1px solid rgba(255,255,255,0.05); }
.acceso-mini:hover .icono-svg { background: #fff; color: #000; box-shadow: 0 4px 15px rgba(255,255,255,0.3); }
.acceso-mini .icono-svg svg { width: 22px; height: 22px; }
.acceso-mini span { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.7); letter-spacing: 0.5px; }

/* SECCIÓN MARQUEE INFINITO */
.seccion-marquee { margin-top: 10px; overflow: hidden; }
.seccion-cabecera { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem; padding: 0 5px; }
.seccion-cabecera h2 { font-size: 1.2rem; font-weight: 800; color: #fff; }
.link-ver-todo { color: var(--morado-brillante); font-size: 0.85rem; text-decoration: none; font-weight: 700; }

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
.tarjeta-marquee-producto { flex: 0 0 160px; background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); border-radius: 20px; padding: 12px; display: flex; flex-direction: column; gap: 10px; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: transform 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.tarjeta-marquee-producto:active { transform: scale(0.95); }
.img-prod-contenedor { width: 100%; height: 140px; border-radius: 16px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; }
.img-prod { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.tarjeta-marquee-producto:hover .img-prod { transform: scale(1.1); }
.img-prod-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.2); }
.img-prod-placeholder svg { width: 48px; height: 48px; }
.info-prod-mini h4 { font-size: 0.9rem; font-weight: 700; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--texto-principal); }
.info-prod-mini .precio { font-size: 1.1rem; font-weight: 900; color: var(--rosa-acento); text-shadow: 0 2px 10px rgba(219,39,119,0.3); }

.loader-horizontal, .mensaje-vacio { padding: 2rem 0; text-align: center; color: var(--texto-secundario); font-size: 0.9rem; }
.modal-fondo { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); width: 100%; box-shadow: var(--sombra-modal); }

/* Tarjeta de Saldo Principal */
.tarjeta-saldo-principal {
  background: linear-gradient(135deg, rgba(170, 59, 255, 0.15) 0%, rgba(0, 198, 255, 0.05) 100%);
  border: 1px solid rgba(170, 59, 255, 0.3);
  border-radius: 20px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  box-shadow: 0 8px 24px rgba(170, 59, 255, 0.15);
  animation: deslizarAbajo 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.saldo-contenido {
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
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.saldo-monto {
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--color-info), var(--morado-brillante));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.5px;
}

.saldo-cargando {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

.btn-recargar {
  background: linear-gradient(135deg, var(--morado-brillante), #7700ff);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 15px rgba(170, 59, 255, 0.4);
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-recargar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(170, 59, 255, 0.6);
}

.btn-recargar:active {
  transform: translateY(0px);
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
    font-size: 1.6rem;
  }

  .btn-recargar {
    width: 100%;
    justify-content: center;
  }
}
</style>
