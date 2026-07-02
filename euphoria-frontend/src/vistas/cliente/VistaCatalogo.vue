<template>
  <div class="vista-catalogo entrada-cine">
    <!-- Hero: bienvenida + buscador sobre superficie con orbes de neon -->
    <header class="hero textura-grano">
      <div class="orbe-deco morado orbe-a" aria-hidden="true"></div>
      <div class="orbe-deco rosa orbe-b" aria-hidden="true"></div>

      <div class="hero-contenido">
        <h1 class="titulo-hola">
          Hola, {{ nombreCorto }}
        </h1>
        <p class="subtitulo">¿Qué vas a tomar esta noche?</p>

        <div class="buscador-contenedor">
          <svg class="icono-buscar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input v-model="busqueda" type="text" class="buscador-input" placeholder="Buscar bebidas, combos..." />
        </div>
      </div>
    </header>

    <!-- Destacados: carrusel horizontal deslizable -->
    <section v-if="!busqueda && !cargando && destacados.length" class="destacados-seccion">
      <div class="destacados-cab">
        <div class="seccion-titular">
          <h2 class="destacados-titulo">Destacados de la noche</h2>
        </div>
        <span class="destacados-hint">
          Desliza
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </span>
      </div>
      <div class="carrusel escalonar">
        <article v-for="p in destacados" :key="'dest-' + p.id_producto" class="destacado-card brillo-hover" @click="abrirDetalle(p)">
          <div class="destacado-img">
            <img v-if="p.url_imagen" :src="p.url_imagen" :alt="p.nombre_producto" />
            <div v-else class="placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <span v-if="p.estado_promocion" class="badge promo">Promo</span>
            <span v-else-if="p.es_combo" class="badge combo">Combo</span>
          </div>
          <div class="destacado-info">
            <h3 class="destacado-nom">{{ p.nombre_producto }}</h3>
            <div class="precios">
              <span v-if="p.estado_promocion" class="precio-tachado">Bs.{{ p.precio_base }}</span>
              <span class="precio-final">Bs.{{ p.estado_promocion ? p.precio_promocion : p.precio_base }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Categorías Horizontales -->
    <div class="categorias-scroll">
      <button
        class="cat-btn"
        :class="{ activo: filtroCategoria === '' }"
        @click="filtroCategoria = ''"
      >
        Todo
      </button>
      <button
        v-for="c in categorias"
        :key="c.id_categoria"
        class="cat-btn"
        :class="{ activo: filtroCategoria === c.id_categoria }"
        @click="filtroCategoria = c.id_categoria"
      >
        {{ c.nombre_categoria }}
      </button>
    </div>

    <!-- Lista de Productos -->
    <div class="productos-contenedor">
      <div v-if="!cargando" class="carta-cab">
        <h2 class="carta-titulo">{{ busqueda ? 'Resultados' : 'Toda la carta' }}</h2>
        <span class="carta-conteo">{{ productosFiltrados.length }} opciones</span>
      </div>

      <div v-if="cargando" class="grid-productos skeleton-grid" aria-hidden="true">
        <div v-for="n in 6" :key="'sk-' + n" class="skeleton-card">
          <div class="sk-img"></div>
          <div class="sk-body">
            <div class="sk-linea sk-linea-larga"></div>
            <div class="sk-linea sk-linea-corta"></div>
            <div class="sk-fila">
              <div class="sk-precio"></div>
              <div class="sk-boton"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="productosFiltrados.length === 0" class="vacio-estado aparecer-subir">
        <div class="vacio-icono-halo">
          <svg class="vacio-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <p class="vacio-titulo">Sin resultados por ahora</p>
        <p class="vacio-sub">Prueba con otro nombre o cambia de categoría.</p>
      </div>

      <div v-else class="grid-productos escalonar">
        <div v-for="p in productosFiltrados" :key="p.id_producto" class="tarjeta-producto" @click="abrirDetalle(p)">
          <!-- Insignias -->
          <div class="insignias">
            <span v-if="p.estado_promocion" class="badge promo">Promo</span>
            <span v-if="p.es_combo" class="badge combo">Combo</span>
          </div>

          <div class="imagen-box">
            <img v-if="p.url_imagen" :src="p.url_imagen" :alt="p.nombre_producto" />
            <div v-else class="placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
          </div>
          
          <div class="info-box">
            <h3 class="nombre">{{ p.nombre_producto }}</h3>
            <p class="categoria">{{ p.nombre_categoria }}</p>
            
            <div class="precio-fila">
              <div class="precios">
                <span v-if="p.estado_promocion" class="precio-tachado">Bs.{{ p.precio_base }}</span>
                <span class="precio-final">Bs.{{ p.estado_promocion ? p.precio_promocion : p.precio_base }}</span>
              </div>
              <button class="btn-agregar hover-crecer" :aria-label="'Agregar ' + p.nombre_producto" @click.stop="agregarAlCarrito(p)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal de Alerta -->
    <Teleport to="body">
      <div v-if="alertaActiva" class="modal-alerta fade-in">
        <div class="modal-contenido">
          <div class="icono-alerta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <h3>Atención</h3>
          <p>No te encuentras en ningún evento actualmente. Para realizar pedidos, debes estar asistiendo a un evento.</p>
          <button class="btn-entendido" @click="alertaActiva = false">Entendido</button>
        </div>
      </div>

      <!-- Modal de Detalle de Producto -->
      <div v-if="detalleProducto" class="modal-detalle fade-in" @click.self="cerrarDetalle">
        <div class="detalle-contenido">
          <button class="btn-cerrar-detalle" @click="cerrarDetalle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          <div class="detalle-imagen">
            <img v-if="detalleProducto.url_imagen" :src="detalleProducto.url_imagen" :alt="detalleProducto.nombre_producto" />
            <div v-else class="placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
          </div>
          <div class="detalle-cuerpo">
            <h3 class="detalle-nombre">{{ detalleProducto.nombre_producto }}</h3>
            <p class="detalle-categoria">{{ detalleProducto.nombre_categoria }}</p>
            <p v-if="detalleProducto.descripcion" class="detalle-descripcion">{{ detalleProducto.descripcion }}</p>
            <div v-if="detalleProducto.combos_como_padre && detalleProducto.combos_como_padre.length" class="detalle-combo">
              <span class="detalle-combo-titulo">Incluye:</span>
              <ul>
                <li v-for="c in detalleProducto.combos_como_padre" :key="c.id_producto_hijo || c.nombre_producto">
                  {{ c.cantidad ? c.cantidad + 'x ' : '' }}{{ c.nombre_producto }}
                </li>
              </ul>
            </div>
            <div class="detalle-precio-fila">
              <div class="precios">
                <span v-if="detalleProducto.estado_promocion" class="precio-tachado">Bs.{{ detalleProducto.precio_base }}</span>
                <span class="precio-final">Bs.{{ detalleProducto.estado_promocion ? detalleProducto.precio_promocion : detalleProducto.precio_base }}</span>
              </div>
              <button class="btn-entendido detalle-agregar" :disabled="cargandoDetalle" @click="agregarAlCarrito(detalleProducto)">Agregar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Flotante de Carrito Detallado -->
      <div v-if="tiendaCarrito.totalItems > 0 && mostrarMiniCarrito" class="panel-carrito-flotante">
        <div class="cabecera-panel">
          <h4>Tu pedido</h4>
          <button @click="mostrarMiniCarrito = false" class="btn-ocultar-panel" aria-label="Ocultar el pedido"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
        <div class="lista-items-panel">
          <div v-for="item in tiendaCarrito.items" :key="item.id" class="item-panel">
            <div class="control-cantidad-mini">
              <button class="btn-mini-cant" aria-label="Quitar uno" @click="tiendaCarrito.disminuirCantidad(item.id)">-</button>
              <span class="cant-panel">{{ item.cantidad }}</span>
              <button class="btn-mini-cant" aria-label="Agregar uno" @click="tiendaCarrito.aumentarCantidad(item.id)">+</button>
            </div>
            <span class="nom-panel">{{ item.nombre }}</span>
            <span class="prec-panel">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
          </div>
        </div>
        <div class="pie-panel">
          <div class="total-panel">Total: <strong>Bs. {{ tiendaCarrito.total.toFixed(2) }}</strong></div>
          <button class="btn-ir-pagar" @click="$router.push('/cliente/carrito')">Ir a pagar →</button>
        </div>
      </div>
      
      <!-- Botón Flotante (cuando está oculto) -->
      <button v-if="tiendaCarrito.totalItems > 0 && !mostrarMiniCarrito" class="btn-reabrir-carrito" @click="mostrarMiniCarrito = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> {{ tiendaCarrito.totalItems }} - Bs. {{ tiendaCarrito.total.toFixed(2) }}
      </button>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'

const tienda = useTiendaAutenticacion()
const tiendaCarrito = useTiendaCarrito()
const nombreCorto = computed(() => tienda.usuario?.nombres?.split(' ')[0] || 'Invitado')

const busqueda = ref('')
const filtroCategoria = ref('')
const categorias = ref([])
const productos = ref([])
const cargando = ref(true)
const alertaActiva = ref(false)

const mostrarMiniCarrito = ref(true)

// Estado real del evento activo del cliente (proviene de la tienda/backend).
// Si es null, el cliente no está en ningún evento y no puede pedir.
const eventoActivoId = computed(() => tiendaCarrito.eventoActivoId || null)

// Detalle de producto
const detalleProducto = ref(null)
const cargandoDetalle = ref(false)

async function cargarDatos() {
  cargando.value = true
  try {
    const [cats, prods] = await Promise.all([
      servicioProductos.obtenerCategorias(),
      servicioProductos.listar() // Listamos todos y filtramos en el cliente para mejor UX móvil
    ])
    categorias.value = cats
    productos.value = prods
  } catch (error) {
    console.error('Error cargando catálogo:', error)
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarDatos()
})

// Productos destacados (promos y combos) para el carrusel horizontal.
const destacados = computed(() =>
  productos.value.filter(p => (p.estado_promocion || p.es_combo) && p.stock_actual > 0).slice(0, 10)
)

const productosFiltrados = computed(() => {
  return productos.value.filter(p => {
    const matchBusqueda = p.nombre_producto.toLowerCase().includes(busqueda.value.toLowerCase()) || 
                          (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.value.toLowerCase()))
    const matchCat = filtroCategoria.value === '' || p.id_categoria === filtroCategoria.value
    return matchBusqueda && matchCat && p.stock_actual > 0 // Ocultamos los sin stock
  })
})

async function abrirDetalle(producto) {
  // Mostramos primero lo que ya tenemos y luego refrescamos desde el backend
  detalleProducto.value = producto
  cargandoDetalle.value = true
  try {
    const data = await servicioProductos.obtener(producto.id_producto)
    if (data) detalleProducto.value = data
  } catch (error) {
    console.error('Error cargando detalle de producto:', error)
  } finally {
    cargandoDetalle.value = false
  }
}

function cerrarDetalle() {
  detalleProducto.value = null
}

async function agregarAlCarrito(producto) {
  // Para pedir hay que estar en un evento; si no, mostramos la alerta.
  if (!eventoActivoId.value) {
    alertaActiva.value = true
    return
  }

  // Re-validamos stock y precio contra el backend antes de agregar,
  // porque el catálogo se carga una sola vez y puede quedar desactualizado.
  let productoActual = producto
  try {
    const data = await servicioProductos.obtener(producto.id_producto)
    if (data) productoActual = data
  } catch (error) {
    console.error('Error validando producto contra backend:', error)
  }

  if (!productoActual || productoActual.stock_actual <= 0) {
    // Reflejamos el stock real en el catálogo para no mostrar datos obsoletos.
    if (productoActual) {
      const idx = productos.value.findIndex(p => p.id_producto === productoActual.id_producto)
      if (idx !== -1) productos.value[idx] = { ...productos.value[idx], ...productoActual }
    }
    return
  }

  // Sincronizamos el ítem del catálogo con los datos frescos (precio/stock).
  const idx = productos.value.findIndex(p => p.id_producto === productoActual.id_producto)
  if (idx !== -1) productos.value[idx] = { ...productos.value[idx], ...productoActual }

  tiendaCarrito.setEventoActivo(eventoActivoId.value)
  tiendaCarrito.agregarItem(productoActual)
  mostrarMiniCarrito.value = true
}
</script>

<style scoped>
.vista-catalogo {
  --azul-profundo: var(--color-info);
  padding: 1rem 1rem 2rem;
  max-width: 1180px;
  margin: 0 auto;
}

/* ============ HERO ============ */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--radio-xl);
  padding: clamp(1.3rem, 3.5vw, 1.9rem) clamp(1.3rem, 4vw, 2.2rem);
  margin-bottom: var(--esp-5);
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(236, 72, 153, 0.14), transparent 55%),
    var(--gradiente-sutil);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px rgba(10, 6, 26, 0.5);
}
.hero .orbe-deco { width: 320px; height: 320px; }
.hero .orbe-a { top: -140px; right: -90px; opacity: 0.4; }
.hero .orbe-b { bottom: -170px; left: -110px; opacity: 0.28; }
.hero-contenido { position: relative; z-index: 1; }

.titulo-hola {
  margin: 0 0 0.2rem;
  font-family: var(--fuente-titulo);
  font-size: clamp(1.5rem, 4vw, 1.9rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  text-wrap: balance;
  color: var(--texto-principal);
}
.subtitulo {
  color: var(--texto-secundario);
  font-size: 0.9rem;
  margin-bottom: var(--esp-4);
}

/* Buscador premium */
.buscador-contenedor {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 520px;
}
.icono-buscar {
  position: absolute;
  left: 18px;
  width: 19px;
  height: 19px;
  color: var(--texto-desactivado);
  pointer-events: none;
  transition: color var(--trans-normal);
}
.buscador-input {
  width: 100%;
  background: rgba(14, 8, 33, 0.55);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-full);
  padding: 15px 18px 15px 50px;
  color: var(--texto-principal);
  font-size: 0.98rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  transition: background var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal);
}
.buscador-input::placeholder { color: var(--texto-desactivado); }
.buscador-contenedor:hover .buscador-input { border-color: var(--borde-activo); }
.buscador-contenedor:hover .icono-buscar { color: var(--texto-secundario); }
.buscador-input:focus {
  outline: none;
  background: rgba(168,85,247,0.1);
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco), var(--glow-morado);
}
.buscador-contenedor:focus-within .icono-buscar { color: var(--morado-hover); }

/* Categorías Horizontales */
.categorias-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 2px 16px;
  margin-bottom: var(--esp-5);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}
.categorias-scroll::-webkit-scrollbar { display: none; } /* Chrome */

.cat-btn {
  white-space: nowrap;
  background: rgba(46, 26, 102, 0.35);
  border: 1px solid var(--glass-borde);
  color: var(--texto-secundario);
  padding: 10px 20px;
  border-radius: var(--radio-full);
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background var(--trans-normal), color var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal), transform var(--trans-rapida);
}
.cat-btn:hover {
  color: var(--texto-principal);
  border-color: var(--borde-activo);
  background: rgba(168,85,247,0.14);
  transform: translateY(-2px);
}
.cat-btn:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
}
.cat-btn:active { transform: scale(0.96); }
.cat-btn.activo {
  background: var(--gradiente-marca);
  color: #fff;
  border-color: transparent;
  box-shadow: var(--glow-morado);
}
.cat-btn.activo:hover { color: #fff; transform: translateY(-2px); }

/* Destacados (carrusel horizontal deslizable) */
.destacados-seccion { margin-bottom: var(--esp-7); }
.destacados-cab { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--esp-4); margin-bottom: var(--esp-4); }
.seccion-titular { display: flex; flex-direction: column; gap: 8px; }
.destacados-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}
.destacados-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--texto-desactivado); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; white-space: nowrap; }
.destacados-hint svg { width: 14px; height: 14px; }
.carrusel {
  display: flex;
  gap: var(--esp-4);
  overflow-x: auto;
  padding: 4px 2px 14px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.carrusel::-webkit-scrollbar { display: none; }
.destacado-card {
  flex: 0 0 auto;
  width: 188px;
  scroll-snap-align: start;
  position: relative;
  background: var(--gradiente-sutil);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  overflow: hidden;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px rgba(10, 6, 26, 0.4);
  transition: transform 0.35s var(--ease-cine, cubic-bezier(0.22,1,0.36,1)), border-color 0.2s ease, box-shadow 0.3s ease;
}
.destacado-card:hover { transform: translateY(-6px); border-color: var(--borde-activo); box-shadow: 0 20px 44px rgba(10,6,26,0.55), var(--glow-morado); }
.destacado-card:active { transform: scale(0.98); }
.destacado-img { position: relative; height: 150px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.destacado-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s var(--ease-suave); }
.destacado-card:hover .destacado-img img { transform: scale(1.08); }
.destacado-img::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(14,8,33,0.75), transparent 55%); pointer-events: none; }
.destacado-img .badge { position: absolute; top: 10px; left: 10px; z-index: 2; }
.destacado-info { padding: 12px 14px 15px; }
.destacado-nom { font-size: 0.92rem; font-weight: 700; line-height: 1.25; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Cabecera de la carta */
.carta-cab {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--esp-4); margin-bottom: var(--esp-4);
}
.carta-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}
.carta-conteo {
  font-size: 0.74rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--morado-hover); font-variant-numeric: tabular-nums;
  padding: 5px 12px; border-radius: var(--radio-full);
  background: rgba(168,85,247,0.12); border: 1px solid var(--glass-borde);
  white-space: nowrap;
}

/* Grid Productos */
.grid-productos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

.tarjeta-producto {
  background: var(--gradiente-sutil);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 28px rgba(10, 6, 26, 0.38);
  transition: transform 0.35s var(--ease-cine, cubic-bezier(0.22,1,0.36,1)), border-color 0.2s ease, box-shadow 0.3s ease;
}
.tarjeta-producto:hover {
  transform: translateY(-6px);
  border-color: var(--borde-activo);
  box-shadow: 0 22px 48px rgba(10, 6, 26, 0.55), var(--glow-morado);
}
.tarjeta-producto:hover .imagen-box img { transform: scale(1.07); }
.tarjeta-producto:active { transform: scale(0.98); }

.insignias {
  position: absolute;
  top: 12px; left: 12px;
  display: flex; gap: 6px;
  z-index: 2;
}
.badge {
  font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 4px 10px; border-radius: var(--radio-full); backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 4px 12px rgba(10, 6, 26, 0.35);
}
.badge.promo { background: rgba(236,72,153,0.85); color: #fff; }
.badge.combo { background: rgba(139,92,246,0.85); color: #fff; }

.imagen-box {
  height: 170px;
  background: rgba(0,0,0,0.25);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.imagen-box img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.5s var(--ease-suave);
}
.placeholder {
  width: 44px; height: 44px; color: var(--texto-desactivado); opacity: 0.5;
}

/* Velo para fundir la imagen con el cuerpo de la tarjeta */
.imagen-box::after {
  content: '';
  position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
  background: linear-gradient(to top, var(--fondo-tarjeta-alt), transparent);
  pointer-events: none;
}

.info-box {
  padding: 14px 15px 15px;
  display: flex; flex-direction: column; flex: 1;
}
.nombre {
  font-family: var(--fuente-titulo);
  font-size: 1.02rem; font-weight: 700; margin-bottom: 4px;
  line-height: 1.2; letter-spacing: -0.01em;
  color: var(--texto-principal);
  text-wrap: balance;
}
.categoria {
  font-size: 0.68rem; color: var(--morado-hover); margin-bottom: 14px;
  font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
}
.precio-fila {
  margin-top: auto;
  display: flex; justify-content: space-between; align-items: flex-end; gap: 10px;
}
.precios { display: flex; flex-direction: column; line-height: 1.05; font-variant-numeric: tabular-nums; }
.precio-tachado { font-size: 0.72rem; color: var(--texto-desactivado); text-decoration: line-through; }
.precio-final { font-size: 1.4rem; font-weight: 800; color: var(--rosa-acento); letter-spacing: -0.02em; }

.btn-agregar {
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  width: 42px; height: 42px;
  border-radius: var(--radio-full);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.25);
  transition: transform var(--trans-rapida), box-shadow var(--trans-normal);
  flex-shrink: 0;
}
.btn-agregar:hover { box-shadow: var(--glow-rosa), 0 8px 20px rgba(236,72,153,0.4); transform: translateY(-2px); }
.btn-agregar:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-agregar:active { transform: scale(0.9); }
.btn-agregar svg { width: 20px; height: 20px; }

/* Estados */
.vacio-estado {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3.5rem 1rem 3rem; color: var(--texto-secundario); text-align: center;
}
.vacio-icono-halo {
  width: 72px; height: 72px; border-radius: var(--radio-full);
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 40%, rgba(168,85,247,0.18), transparent 70%);
  border: 1px solid var(--borde-sutil);
  margin-bottom: var(--esp-4);
}
.vacio-icono { width: 34px; height: 34px; color: var(--morado-hover); }
.vacio-titulo { font-size: 1.02rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 4px; }
.vacio-sub { font-size: 0.85rem; color: var(--texto-secundario); max-width: 30ch; }

/* Loading: esqueletos con la forma de las tarjetas */
.skeleton-card {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.sk-img { height: 170px; }
.sk-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.sk-fila { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.sk-linea { height: 12px; border-radius: var(--radio-sm); }
.sk-linea-larga { width: 80%; }
.sk-linea-corta { width: 45%; height: 10px; }
.sk-precio { width: 56px; height: 18px; border-radius: var(--radio-sm); }
.sk-boton { width: 34px; height: 34px; border-radius: var(--radio-full); }
.sk-img, .sk-linea, .sk-precio, .sk-boton {
  background: linear-gradient(100deg, rgba(255,255,255,0.04) 30%, rgba(168,85,247,0.14) 50%, rgba(255,255,255,0.04) 70%);
  background-size: 200% 100%;
  animation: brilloEsqueleto 1.3s ease-in-out infinite;
}
@keyframes brilloEsqueleto {
  0% { background-position: 180% 0; }
  100% { background-position: -80% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sk-img, .sk-linea, .sk-precio, .sk-boton { animation: none; }
}

/* Modal Alerta Custom */
.modal-alerta {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
  z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.modal-contenido {
  background: var(--gradiente-sutil); border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl); padding: 2rem; text-align: center; max-width: 320px; width: 100%;
  box-shadow: var(--sombra-modal);
}
.icono-alerta { width: 48px; height: 48px; color: var(--color-alerta); margin: 0 auto 1rem auto; }
.modal-contenido h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-alerta); }
.modal-contenido p { font-size: 0.9rem; color: var(--texto-secundario); margin-bottom: 1.5rem; line-height: 1.5; }
.btn-entendido {
  background: var(--gradiente-marca); color: #fff; border: none; padding: 11px 24px;
  border-radius: var(--radio-full); font-weight: 700; cursor: pointer; width: 100%;
  box-shadow: var(--glow-morado);
  transition: box-shadow var(--trans-normal), transform var(--trans-rapida);
}
.btn-entendido:hover { box-shadow: var(--glow-rosa); }
.btn-entendido:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-entendido:active { transform: scale(0.96); }

/* Modal Detalle Producto */
.modal-detalle {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
  z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.detalle-contenido {
  position: relative;
  background: var(--gradiente-sutil); border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl); overflow: hidden; max-width: 360px; width: 100%;
  box-shadow: var(--sombra-modal);
  max-height: 85vh; display: flex; flex-direction: column;
}
.btn-cerrar-detalle {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.14); color: #fff;
  width: 34px; height: 34px; border-radius: var(--radio-full); cursor: pointer; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(6px);
  transition: background var(--trans-normal), transform var(--trans-rapida);
}
.btn-cerrar-detalle:hover { background: rgba(0,0,0,0.7); }
.btn-cerrar-detalle:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-cerrar-detalle:active { transform: scale(0.92); }
.detalle-imagen {
  height: 200px; background: rgba(0,0,0,0.2);
  display: flex; align-items: center; justify-content: center;
}
.detalle-imagen img { width: 100%; height: 100%; object-fit: cover; }
.detalle-cuerpo { padding: 1.3rem; overflow-y: auto; }
.detalle-nombre { font-family: var(--fuente-titulo); font-size: 1.35rem; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; margin-bottom: 0.25rem; text-wrap: balance; }
.detalle-categoria { font-size: 0.78rem; font-weight: 600; color: var(--morado-hover); margin-bottom: 0.85rem; }
.detalle-descripcion { font-size: 0.9rem; color: var(--texto-secundario); line-height: 1.5; margin-bottom: 1rem; }
.detalle-combo {
  margin-bottom: 1rem; padding: 0.85rem 1rem;
  background: rgba(168,85,247,0.08); border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
}
.detalle-combo-titulo { font-size: 0.82rem; font-weight: 700; color: var(--morado-hover); text-transform: uppercase; letter-spacing: 0.05em; }
.detalle-combo ul { margin: 0.5rem 0 0 1.1rem; padding: 0; }
.detalle-combo li { font-size: 0.87rem; color: var(--texto-secundario); margin-bottom: 3px; }
.detalle-precio-fila {
  display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;
  padding-top: 0.85rem; border-top: 1px solid var(--borde-sutil);
}
.detalle-agregar { width: auto; padding: 11px 22px; }
.detalle-agregar:disabled { opacity: 0.6; cursor: default; }

/* Panel Flotante Carrito */
.panel-carrito-flotante {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: min(320px, calc(100vw - 40px));
  max-width: 320px;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-modal), var(--sombra-glow);
  z-index: 100000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cabecera-panel {
  background: var(--gradiente-marca);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}
.cabecera-panel h4 { margin: 0; font-weight: 700; font-size: 1rem; }
.btn-ocultar-panel {
  background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: var(--radio-full);
  transition: background var(--trans-normal), transform var(--trans-rapida);
}
.btn-ocultar-panel:hover { background: rgba(255,255,255,0.18); }
.btn-ocultar-panel:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(255,255,255,0.4); }
.btn-ocultar-panel:active { transform: scale(0.9); }

.lista-items-panel {
  max-height: 200px;
  overflow-y: auto;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--texto-principal);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 8px;
  gap: 8px;
}
.control-cantidad-mini {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-sm);
  padding: 2px;
}
.btn-mini-cant {
  background: none; border: none; color: var(--texto-principal); cursor: pointer;
  font-weight: bold; font-size: 0.95rem; line-height: 1;
  width: 20px; height: 20px; border-radius: var(--radio-sm);
  display: flex; align-items: center; justify-content: center;
  transition: background var(--trans-rapida), color var(--trans-rapida);
}
.btn-mini-cant:hover { background: rgba(168,85,247,0.3); color: #fff; }
.btn-mini-cant:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.cant-panel { font-weight: 800; color: var(--morado-hover); min-width: 16px; text-align: center; font-variant-numeric: tabular-nums; }
.nom-panel { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.prec-panel { font-weight: 700; font-variant-numeric: tabular-nums; }

.pie-panel {
  padding: 12px 16px;
  background: rgba(0,0,0,0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.total-panel { font-size: 0.9rem; color: var(--texto-secundario); font-variant-numeric: tabular-nums; }
.total-panel strong { font-size: 1.1rem; color: var(--texto-principal); }

.btn-ir-pagar {
  background: var(--gradiente-marca);
  color: white; border: none; padding: 9px 18px; border-radius: var(--radio-full); font-weight: 700;
  cursor: pointer; box-shadow: var(--glow-morado);
  transition: box-shadow var(--trans-normal), transform var(--trans-rapida);
}
.btn-ir-pagar:hover { box-shadow: var(--glow-rosa); }
.btn-ir-pagar:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-ir-pagar:active { transform: scale(0.95); }

/* Botón Reabrir */
.btn-reabrir-carrito {
  position: fixed;
  bottom: 80px;
  right: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--gradiente-marca);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: var(--radio-full);
  font-weight: 700;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  box-shadow: var(--glow-morado);
  z-index: 100000;
  cursor: pointer;
  transition: box-shadow var(--trans-normal), transform var(--trans-rapida);
}
.btn-reabrir-carrito:hover { box-shadow: var(--glow-rosa); transform: translateY(-2px); }
.btn-reabrir-carrito:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-reabrir-carrito:active { transform: scale(0.96); }

/* Respeta la preferencia de menos movimiento: sin desplazamientos ni zoom en hover */
@media (prefers-reduced-motion: reduce) {
  .destacado-card,
  .tarjeta-producto,
  .destacado-img img,
  .imagen-box img,
  .btn-reabrir-carrito {
    transition: none;
  }
  .destacado-card:hover,
  .tarjeta-producto:hover { transform: none; }
  .destacado-card:hover .destacado-img img,
  .tarjeta-producto:hover .imagen-box img { transform: none; }
  .btn-reabrir-carrito:hover { transform: none; }
}

/* Tablet: mantiene la retícula fluida y evita que las tarjetas queden demasiado anchas */
@media (min-width: 481px) and (max-width: 1024px) {
  .grid-productos {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

/* Celular: panel de carrito a ancho seguro sin desbordar ni tapar la navegación inferior */
@media (max-width: 600px) {
  .panel-carrito-flotante {
    width: auto;
    max-width: none;
    right: 12px;
    left: 12px;
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }
  .btn-reabrir-carrito {
    right: 12px;
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    max-width: calc(100vw - 24px);
  }
  /* Limita la altura de la lista para que el pie y el total siempre sean visibles */
  .lista-items-panel {
    max-height: min(200px, 35vh);
  }
}

/* Celular pequeño: retícula de una sola columna cómoda y padding reducido */
@media (max-width: 480px) {
  .vista-catalogo {
    padding: 0.85rem 0.85rem 2rem;
  }
  .hero { padding: 1.5rem 1.3rem; }
  .grid-productos {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .imagen-box { height: 150px; }
  .sk-img { height: 150px; }
  .destacado-card { width: 168px; }
  .modal-contenido {
    padding: 1.5rem;
  }
}

/* Pantalla muy angosta: una columna para evitar tarjetas apretadas */
@media (max-width: 360px) {
  .grid-productos {
    grid-template-columns: 1fr;
  }
}
</style>
