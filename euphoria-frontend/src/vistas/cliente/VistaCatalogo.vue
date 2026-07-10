<template>
  <div class="vista-catalogo entrada-cine">
    <!-- Saludo compacto: franja sutil, el buscador queda casi arriba -->
    <header class="saludo">
      <span class="saludo-kicker">
        <span class="punto-vivo" aria-hidden="true"></span>
        Barra abierta
      </span>
      <h1 class="saludo-texto">
        Hola, <span class="saludo-nombre">{{ nombreCorto }}</span>
        <span class="saludo-sub">· ¿qué vas a tomar esta noche?</span>
      </h1>
    </header>

    <!-- Barra pegajosa: buscador + categorías siempre a mano -->
    <div class="barra-pegajosa">
      <div class="buscador-contenedor">
        <svg class="icono-buscar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="busqueda" type="text" class="buscador-input" placeholder="Buscar bebidas, combos..." />
        <button v-if="busqueda" class="btn-limpiar-busqueda" aria-label="Limpiar búsqueda" @click="busqueda = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

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
    </div>

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
          <div class="destacado-img" :class="{ 'fondo-combo': p.es_combo && !p.url_imagen }">
            <img v-if="p.url_imagen" :src="p.url_imagen" :alt="p.nombre_producto" />
            <ComboImagen v-else-if="p.es_combo && p.combos_como_padre?.length" :componentes="p.combos_como_padre" />
            <div v-else class="placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <span v-if="p.estado_promocion" class="badge promo">{{ descuentoPct(p) ? '−' + descuentoPct(p) + '%' : 'Promo' }}</span>
            <span v-else-if="p.es_combo" class="badge combo">Combo</span>
          </div>
          <div class="destacado-info">
            <h3 class="destacado-nom">{{ p.nombre_producto }}</h3>
            <p v-if="p.es_combo && resumenCombo(p)" class="destacado-composicion" :title="resumenCombo(p)">{{ resumenCombo(p) }}</p>
            <div class="precios">
              <span v-if="p.estado_promocion" class="precio-tachado">Bs.{{ p.precio_base }}</span>
              <span class="precio-final">Bs.{{ p.estado_promocion ? p.precio_promocion : p.precio_base }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>

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

      <div v-else-if="errorCarga" class="vacio-estado aparecer-subir">
        <div class="vacio-icono-halo">
          <svg class="vacio-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <p class="vacio-titulo">No pudimos cargar el catálogo</p>
        <p class="vacio-sub">Revisa tu conexión e intenta de nuevo.</p>
        <button class="btn-entendido" style="margin-top:10px" @click="cargarDatos">Reintentar</button>
      </div>

      <div v-else-if="productosFiltrados.length === 0" class="vacio-estado aparecer-subir">
        <div class="vacio-icono-halo">
          <svg class="vacio-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <p class="vacio-titulo">Sin resultados por ahora</p>
        <p class="vacio-sub">Prueba con otro nombre o cambia de categoría.</p>
      </div>

      <TransitionGroup v-else tag="div" name="prod" class="grid-productos">
        <article v-for="p in productosFiltrados" :key="p.id_producto" class="tarjeta-producto" @click="abrirDetalle(p)">
          <!-- Insignias -->
          <div class="insignias">
            <span v-if="p.estado_promocion" class="badge promo">{{ descuentoPct(p) ? '−' + descuentoPct(p) + '%' : 'Promo' }}</span>
            <span v-if="p.es_combo" class="badge combo">Combo</span>
          </div>

          <div class="imagen-box" :class="{ 'fondo-combo': p.es_combo && !p.url_imagen }">
            <img v-if="p.url_imagen" :src="p.url_imagen" :alt="p.nombre_producto" />
            <ComboImagen v-else-if="p.es_combo && p.combos_como_padre?.length" :componentes="p.combos_como_padre" />
            <div v-else class="placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
          </div>

          <div class="info-box">
            <h3 class="nombre">{{ p.nombre_producto }}</h3>
            <p v-if="p.es_combo && resumenCombo(p)" class="combo-composicion" :title="resumenCombo(p)">{{ resumenCombo(p) }}</p>
            <p v-else class="categoria">{{ p.nombre_categoria }}</p>

            <div class="precio-fila">
              <div class="precios">
                <span v-if="p.estado_promocion" class="precio-tachado">Bs.{{ p.precio_base }}</span>
                <span class="precio-final">Bs.{{ p.estado_promocion ? p.precio_promocion : p.precio_base }}</span>
              </div>

              <!-- Si el producto ya está en el pedido: stepper. Si no: botón + -->
              <Transition name="accion" mode="out-in">
                <div v-if="cantidadEnCarrito(p.id_producto) > 0" key="stepper" class="stepper" @click.stop>
                  <button class="btn-step" :aria-label="cantidadEnCarrito(p.id_producto) === 1 ? 'Quitar del pedido' : 'Quitar uno'" @click.stop="quitarUno(p.id_producto)">
                    <svg v-if="cantidadEnCarrito(p.id_producto) === 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <span :key="cantidadEnCarrito(p.id_producto)" class="stepper-cant">{{ cantidadEnCarrito(p.id_producto) }}</span>
                  <button class="btn-step mas" aria-label="Agregar uno" @click.stop="aumentarDesdeCarta(p)">
                    <svg v-if="idAgregado === p.id_producto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
                <button v-else key="agregar" class="btn-agregar hover-crecer" :aria-label="'Agregar ' + p.nombre_producto" @click.stop="agregarAlCarrito(p)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </Transition>
            </div>
          </div>
        </article>
      </TransitionGroup>
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
            <ComboImagen v-else-if="detalleProducto.es_combo && detalleProducto.combos_como_padre?.length" :componentes="detalleProducto.combos_como_padre" />
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
          <h4>Tu pedido <span class="conteo-panel">{{ tiendaCarrito.totalItems }}</span></h4>
          <button @click="mostrarMiniCarrito = false" class="btn-ocultar-panel" aria-label="Ocultar el pedido"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
        <TransitionGroup tag="div" name="linea" class="lista-items-panel">
          <div v-for="item in tiendaCarrito.items" :key="item.id" class="item-panel">
            <!-- Combos: miniaturas de su composición solapadas, como en su tarjeta -->
            <div class="mini-thumb" :class="{ 'thumb-combo': (item.imagenes?.length || 0) > 1, 'thumb-3': (item.imagenes?.length || 0) >= 3 }">
              <template v-if="(item.imagenes?.length || 0) > 1">
                <img v-for="(img, j) in item.imagenes.slice(0, 3)" :key="j" :src="img" class="mini-foto" alt="" />
              </template>
              <img v-else-if="item.imagen" :src="item.imagen" :alt="item.nombre" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21h8"></path><path d="M12 15v6"></path><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path></svg>
            </div>
            <div class="mini-info">
              <span class="nom-panel">{{ item.nombre }}</span>
              <div class="control-cantidad-mini">
                <button class="btn-mini-cant" :aria-label="item.cantidad === 1 ? 'Quitar del pedido' : 'Quitar uno'" @click="quitarUno(item.id)">−</button>
                <span class="cant-panel">{{ item.cantidad }}</span>
                <button class="btn-mini-cant" aria-label="Agregar uno" @click="aumentarConAviso(item.id)">+</button>
              </div>
            </div>
            <div class="mini-der">
              <span class="prec-panel">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
              <button class="btn-quitar-item" :aria-label="'Quitar ' + item.nombre + ' del pedido'" @click="tiendaCarrito.eliminarItem(item.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </TransitionGroup>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import ComboImagen from '@/componentes/comunes/ComboImagen.vue'

const tienda = useTiendaAutenticacion()
const tiendaCarrito = useTiendaCarrito()
const notif = useNotificaciones()
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

const errorCarga = ref(false)
async function cargarDatos() {
  cargando.value = true
  errorCarga.value = false
  try {
    const [cats, prods] = await Promise.all([
      servicioProductos.obtenerCategorias(),
      servicioProductos.listar() // Listamos todos y filtramos en el cliente para mejor UX móvil
    ])
    categorias.value = cats
    productos.value = prods
  } catch (error) {
    console.error('Error cargando catálogo:', error)
    errorCarga.value = true
  } finally {
    cargando.value = false
  }
}

let socket = null
onMounted(() => {
  cargarDatos()
  // Si el cliente ya reservó un evento (clave que guarda el flujo de reserva),
  // se sincroniza como evento activo para habilitar los pedidos
  if (!eventoActivoId.value) {
    try {
      const ev = JSON.parse(localStorage.getItem('euphoria_evento_actual') || 'null')
      if (ev?.id) tiendaCarrito.setEventoActivo(String(ev.id))
    } catch { /* sin evento previo */ }
  }
  // Tiempo real: si el local cambia productos/precios/promos o el descuento de combos,
  // el catálogo del cliente se refresca solo.
  socket = io({ path: '/socket.io' })
  // Invalidar el caché antes de recargar: el aviso significa que los datos
  // cambiaron, así que hay que pedirlos frescos y no devolver los del caché.
  socket.on('catalogo_actualizado', () => { servicioProductos.invalidarCatalogo(); cargarDatos() })
  socket.on('config_actualizada', (data) => { if (data && 'descuento_combos' in data) { servicioProductos.invalidarCatalogo(); cargarDatos() } })
})
onUnmounted(() => { if (socket) socket.disconnect() })

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

// Quita el sufijo "(x1)"/"(x6)" del nombre para que se lea limpio en la composición
function nombreLimpio(nombre) {
  return String(nombre || '').replace(/\s*\(x\d+\)\s*$/i, '').trim()
}

// Composición resumida de un combo/pack con sus cantidades, al estilo del mesero.
// Ej.: "10× Cerveza · 2× Papas". Vacío si el producto no es combo o no trae composición.
function resumenCombo(p) {
  if (!p?.es_combo) return ''
  const comps = p.combos_como_padre || []
  if (!comps.length) return ''
  return comps
    .map(c => `${Number(c.cantidad) || 1}× ${nombreLimpio(c.nombre_producto)}`)
    .join(' · ')
}

// Porcentaje de descuento para la insignia de promo (0 si no aplica)
function descuentoPct(p) {
  const base = parseFloat(p.precio_base)
  const promo = parseFloat(p.precio_promocion)
  if (!p.estado_promocion || !(base > 0) || !(promo > 0) || promo >= base) return 0
  return Math.round((1 - promo / base) * 100)
}

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

// Feedback visual breve al agregar (checkmark en el botón +)
const idAgregado = ref(null)
let timerAgregado = null
function marcarAgregado(id) {
  idAgregado.value = id
  clearTimeout(timerAgregado)
  timerAgregado = setTimeout(() => { idAgregado.value = null }, 900)
}

// Cantidad de un producto ya en el pedido (para mostrar el stepper en la tarjeta)
function cantidadEnCarrito(idProducto) {
  const item = tiendaCarrito.items.find(i => i.id === idProducto)
  return item ? item.cantidad : 0
}

// −1: si queda en cero, se elimina el item del pedido
function quitarUno(idItem) {
  const item = tiendaCarrito.items.find(i => i.id === idItem)
  if (!item) return
  if (item.cantidad <= 1) tiendaCarrito.eliminarItem(idItem)
  else tiendaCarrito.disminuirCantidad(idItem)
}

// +1 desde el mini-carrito: si topa el stock, avisa en vez de fallar en silencio
function aumentarConAviso(idItem) {
  const r = tiendaCarrito.aumentarCantidad(idItem)
  if (r && r.ok === false) notif.advertencia(r.mensaje || 'No hay más stock disponible.')
}

// +1 desde el stepper de la tarjeta, con feedback de checkmark
function aumentarDesdeCarta(producto) {
  // Si la línea del pedido quedó sin foto o sin composición (combos agregados
  // antes de este cambio), la completamos con los datos del catálogo
  const linea = tiendaCarrito.items.find(i => i.id === producto.id_producto)
  if (linea && (!linea.imagen || !(linea.imagenes && linea.imagenes.length))) {
    const conImg = conImagenParaCarrito(producto)
    if (!linea.imagen && conImg.url_imagen) linea.imagen = conImg.url_imagen
    if (!(linea.imagenes && linea.imagenes.length)) {
      linea.imagenes = (conImg.imagenes_combo && conImg.imagenes_combo.length)
        ? conImg.imagenes_combo
        : (conImg.url_imagen ? [conImg.url_imagen] : [])
    }
  }
  const r = tiendaCarrito.aumentarCantidad(producto.id_producto)
  if (r && r.ok === false) {
    notif.advertencia(r.mensaje || 'No hay más stock disponible.')
    return
  }
  marcarAgregado(producto.id_producto)
}

// Fotos de los componentes del combo (misma fuente que usa ComboImagen), hasta 3
function imagenesDeCombo(prod) {
  if (!prod?.es_combo) return []
  return (prod.combos_como_padre || [])
    .map(c => c.url_imagen || c.producto?.url_imagen || '')
    .filter(Boolean)
    .slice(0, 3)
}

// Los combos entran al carrito con su COMPOSICIÓN (2-3 fotos solapadas, como
// en su tarjeta); los sin foto propia usan la del primer componente.
// No muta el producto original.
function conImagenParaCarrito(prod) {
  if (!prod || !prod.es_combo) return prod
  const imagenes = imagenesDeCombo(prod)
  if (!imagenes.length) return prod
  return {
    ...prod,
    url_imagen: prod.url_imagen || imagenes[0],
    imagenes_combo: imagenes
  }
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
  const resultado = tiendaCarrito.agregarItem(conImagenParaCarrito(productoActual))
  // Si se llegó al tope de stock, avisamos (antes fallaba en silencio)
  if (resultado && resultado.ok === false) {
    notif.advertencia(resultado.mensaje || 'No hay más stock disponible de este producto.')
    return
  }
  marcarAgregado(productoActual.id_producto)
  mostrarMiniCarrito.value = true
}
</script>

<style scoped>
.vista-catalogo {
  --azul-profundo: var(--color-info);
  --pad-x: 1rem;
  padding: 1rem var(--pad-x) 2rem;
  max-width: 1180px;
  margin: 0 auto;
}

/* ============ SALUDO COMPACTO ============ */
.saludo {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 2px 4px 0;
  margin-bottom: var(--esp-3);
}
.saludo-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--rosa-suave);
}
.punto-vivo {
  width: 6px; height: 6px; border-radius: var(--radio-full);
  background: var(--rosa-acento);
  box-shadow: 0 0 8px rgba(236,72,153,0.9);
  animation: latido 1.8s ease-in-out infinite;
}
@keyframes latido {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.45); opacity: 0.6; }
}

.saludo-texto {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: clamp(1.05rem, 2.8vw, 1.25rem);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}
.saludo-nombre {
  background: var(--gradiente-texto);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.saludo-sub {
  color: var(--texto-secundario);
  font-weight: 500;
  font-size: 0.92em;
}

/* ============ BARRA PEGAJOSA: buscador + categorías ============ */
.barra-pegajosa {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: 0 calc(-1 * var(--pad-x)) var(--esp-5);
  padding: 10px var(--pad-x) 2px;
  background: var(--fondo-app);
}
/* Fundido inferior para que las tarjetas se deslicen por debajo con suavidad */
.barra-pegajosa::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -16px; height: 16px;
  background: linear-gradient(to bottom, var(--fondo-app), transparent);
  pointer-events: none;
}

/* Buscador premium */
.buscador-contenedor {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 520px;
  margin-bottom: 10px;
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
  min-width: 0;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-full);
  padding: 14px 48px 14px 50px;
  color: var(--texto-principal);
  font-size: 0.98rem;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  transition: background var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal);
}
.buscador-input::placeholder { color: var(--texto-desactivado); }
.buscador-contenedor:hover .buscador-input { border-color: var(--borde-activo); }
.buscador-contenedor:hover .icono-buscar { color: var(--texto-secundario); }
.buscador-input:focus {
  outline: none;
  background: var(--fondo-tarjeta-alt);
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco), var(--glow-morado);
}
.buscador-contenedor:focus-within .icono-buscar { color: var(--morado-hover); }
.btn-limpiar-busqueda {
  position: absolute;
  right: 10px;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(168,85,247,0.15);
  border: none;
  border-radius: var(--radio-full);
  color: var(--texto-secundario);
  cursor: pointer;
  transition: background var(--trans-rapida), color var(--trans-rapida), transform var(--trans-rapida);
}
.btn-limpiar-busqueda svg { width: 14px; height: 14px; }
.btn-limpiar-busqueda:hover { background: rgba(168,85,247,0.3); color: #fff; }
.btn-limpiar-busqueda:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-limpiar-busqueda:active { transform: scale(0.9); }

/* Categorías Horizontales */
.categorias-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  min-width: 0;
  padding: 4px 2px 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}
.categorias-scroll::-webkit-scrollbar { display: none; } /* Chrome */

.cat-btn {
  white-space: nowrap;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--glass-borde);
  color: var(--texto-secundario);
  padding: 10px 20px;
  border-radius: var(--radio-full);
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background var(--trans-normal), color var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal), transform var(--trans-rapida);
}
.cat-btn:hover {
  color: var(--texto-principal);
  border-color: var(--borde-activo);
  background: var(--fondo-tarjeta-alt);
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
  transform: translateY(-1px);
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
.destacados-hint svg { width: 14px; height: 14px; animation: vaiven 1.8s ease-in-out infinite; }
@keyframes vaiven {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
}
.carrusel {
  display: flex;
  gap: var(--esp-4);
  overflow-x: auto;
  min-width: 0;
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
.destacado-composicion {
  font-size: 0.72rem; line-height: 1.3; color: var(--texto-secundario); font-weight: 600;
  margin: -3px 0 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

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
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

/* Transición al filtrar categorías / buscar */
.prod-move { transition: transform 0.45s var(--ease-suave); }
.prod-enter-active { transition: opacity 0.3s ease, transform 0.35s var(--ease-suave); }
.prod-enter-from { opacity: 0; transform: translateY(14px) scale(0.97); }
.prod-leave-active { position: absolute; z-index: 0; transition: opacity 0.18s ease, transform 0.18s ease; }
.prod-leave-to { opacity: 0; transform: scale(0.94); }

.tarjeta-producto {
  background: var(--gradiente-sutil);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
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
  padding: 4px 10px; border-radius: var(--radio-full);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 4px 12px rgba(10, 6, 26, 0.35);
  font-variant-numeric: tabular-nums;
}
.badge.promo {
  background: linear-gradient(135deg, #EC4899, #F472B6);
  color: #fff;
  animation: pulsoPromo 2.4s ease-in-out infinite;
}
.badge.combo { background: rgba(139,92,246,0.92); color: #fff; }
@keyframes pulsoPromo {
  0%, 100% { box-shadow: 0 4px 12px rgba(10,6,26,0.35), 0 0 0 0 rgba(236,72,153,0.4); }
  50% { box-shadow: 0 4px 12px rgba(10,6,26,0.35), 0 0 14px 2px rgba(236,72,153,0.45); }
}

/* Imagen protagonista */
.imagen-box {
  height: 195px;
  background: rgba(0,0,0,0.25);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  overflow: hidden;
}
.imagen-box img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.5s var(--ease-suave);
}
.placeholder {
  width: 44px; height: 44px; color: var(--texto-desactivado); opacity: 0.5;
}

/* Fondo ambiente para combos con imágenes compuestas */
.imagen-box.fondo-combo,
.destacado-img.fondo-combo {
  background:
    radial-gradient(90% 90% at 18% 12%, rgba(168,85,247,0.24), transparent 60%),
    radial-gradient(95% 100% at 85% 85%, rgba(236,72,153,0.2), transparent 55%),
    rgba(0,0,0,0.25);
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
  min-width: 0;
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
/* Composición del combo/pack: cantidades claras (10× Cerveza · 2× Papas) */
.combo-composicion {
  font-size: 0.74rem;
  line-height: 1.35;
  color: var(--texto-secundario);
  font-weight: 600;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
}
.precio-fila {
  margin-top: auto;
  display: flex; justify-content: space-between; align-items: flex-end; gap: 10px;
  min-width: 0;
}
.precios { display: flex; flex-direction: column; line-height: 1.05; font-variant-numeric: tabular-nums; min-width: 0; }
.precio-tachado { font-size: 0.72rem; color: var(--texto-desactivado); text-decoration: line-through; }
.precio-final { font-size: 1.45rem; font-weight: 800; color: var(--rosa-acento); letter-spacing: -0.02em; text-shadow: 0 0 18px rgba(236,72,153,0.35); }

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

/* Stepper de la tarjeta (producto ya en el pedido) */
.stepper {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-full);
  padding: 3px;
  box-shadow: var(--glow-morado), inset 0 1px 0 rgba(255,255,255,0.06);
  cursor: default;
}
.btn-step {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radio-full);
  color: var(--texto-secundario);
  cursor: pointer;
  transition: background var(--trans-rapida), color var(--trans-rapida), transform var(--trans-rapida);
}
.btn-step svg { width: 16px; height: 16px; }
.btn-step:hover { background: rgba(168,85,247,0.22); color: #fff; }
.btn-step:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-step:active { transform: scale(0.88); }
.btn-step.mas {
  background: var(--gradiente-marca);
  color: #fff;
  box-shadow: 0 4px 12px rgba(168,85,247,0.4);
}
.btn-step.mas:hover { box-shadow: var(--glow-rosa); }
.stepper-cant {
  min-width: 22px;
  text-align: center;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
  animation: cantPop 0.3s var(--ease-rebote);
}
@keyframes cantPop {
  0% { transform: scale(1.5); color: var(--rosa-acento); }
  100% { transform: scale(1); }
}

/* Cambio botón + ↔ stepper */
.accion-enter-active { transition: opacity 0.16s ease, transform 0.22s var(--ease-rebote); }
.accion-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.accion-enter-from { opacity: 0; transform: scale(0.7); }
.accion-leave-to { opacity: 0; transform: scale(0.8); }

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
.sk-img { height: 195px; }
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
  position: fixed; inset: 0; background: rgba(8, 4, 20, 0.82);
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
  position: fixed; inset: 0; background: rgba(8, 4, 20, 0.82);
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
  background: rgba(14, 8, 33, 0.78); border: 1px solid rgba(255,255,255,0.14); color: #fff;
  width: 34px; height: 34px; border-radius: var(--radio-full); cursor: pointer; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--trans-normal), transform var(--trans-rapida);
}
.btn-cerrar-detalle:hover { background: rgba(14, 8, 33, 0.95); }
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
  width: min(340px, calc(100vw - 40px));
  max-width: 340px;
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
.cabecera-panel h4 { margin: 0; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 8px; }
.conteo-panel {
  font-size: 0.72rem; font-weight: 800; font-variant-numeric: tabular-nums;
  background: rgba(255,255,255,0.22); border-radius: var(--radio-full);
  min-width: 22px; height: 22px; padding: 0 7px;
  display: inline-flex; align-items: center; justify-content: center;
}
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
  position: relative;
  max-height: 240px;
  overflow-y: auto;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-panel {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: var(--texto-principal);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 8px;
  gap: 10px;
  min-width: 0;
}

/* Transición al quitar/agregar líneas del pedido */
.linea-move { transition: transform 0.3s var(--ease-suave); }
.linea-enter-active { transition: opacity 0.25s ease, transform 0.3s var(--ease-suave); }
.linea-enter-from { opacity: 0; transform: translateY(8px); }
.linea-leave-active { position: absolute; left: 14px; right: 14px; transition: opacity 0.22s ease, transform 0.22s ease; }
.linea-leave-to { opacity: 0; transform: translateX(28px); }

.mini-thumb {
  flex-shrink: 0;
  width: 42px; height: 42px;
  border-radius: var(--radio-md);
  overflow: hidden;
  background: linear-gradient(160deg, rgba(168,85,247,0.16), rgba(236,72,153,0.1));
  border: 1px solid var(--borde-sutil);
  display: flex; align-items: center; justify-content: center;
  color: var(--morado-hover);
}
.mini-thumb img { width: 100%; height: 100%; object-fit: cover; }
.mini-thumb svg { width: 20px; height: 20px; opacity: 0.8; }

/* Miniaturas solapadas para combos (composición de 2-3 fotos) */
.mini-thumb.thumb-combo {
  width: auto;
  min-width: 42px;
  background: transparent;
  border: none;
  overflow: visible;
  justify-content: flex-start;
}
.mini-thumb .mini-foto {
  width: 32px; height: 32px;
  border-radius: var(--radio-full);
  object-fit: cover;
  border: 2px solid var(--fondo-tarjeta-alt);
  background: var(--fondo-tarjeta);
  box-shadow: 0 3px 8px rgba(6, 3, 18, 0.45);
  flex-shrink: 0;
}
.mini-thumb .mini-foto + .mini-foto { margin-left: -13px; }
.mini-thumb .mini-foto:nth-child(2) { position: relative; z-index: 1; }
.mini-thumb.thumb-3 .mini-foto { width: 28px; height: 28px; }
.mini-thumb.thumb-3 .mini-foto + .mini-foto { margin-left: -11px; }

.mini-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.nom-panel { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }

.control-cantidad-mini {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-full);
  padding: 2px;
}
.btn-mini-cant {
  background: none; border: none; color: var(--texto-principal); cursor: pointer;
  font-weight: bold; font-size: 0.95rem; line-height: 1;
  width: 22px; height: 22px; border-radius: var(--radio-full);
  display: flex; align-items: center; justify-content: center;
  transition: background var(--trans-rapida), color var(--trans-rapida);
}
.btn-mini-cant:hover { background: rgba(168,85,247,0.3); color: #fff; }
.btn-mini-cant:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.cant-panel { font-weight: 800; color: var(--morado-hover); min-width: 18px; text-align: center; font-variant-numeric: tabular-nums; }

.mini-der {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.prec-panel { font-weight: 700; font-variant-numeric: tabular-nums; }
.btn-quitar-item {
  background: none;
  border: none;
  width: 26px; height: 26px;
  border-radius: var(--radio-full);
  display: flex; align-items: center; justify-content: center;
  color: var(--texto-desactivado);
  cursor: pointer;
  transition: background var(--trans-rapida), color var(--trans-rapida), transform var(--trans-rapida);
}
.btn-quitar-item svg { width: 14px; height: 14px; }
.btn-quitar-item:hover { background: rgba(239,68,68,0.16); color: var(--color-error); }
.btn-quitar-item:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(239,68,68,0.35); }
.btn-quitar-item:active { transform: scale(0.88); }

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
  .btn-reabrir-carrito,
  .prod-move,
  .prod-enter-active,
  .prod-leave-active,
  .linea-move,
  .linea-enter-active,
  .linea-leave-active,
  .accion-enter-active,
  .accion-leave-active {
    transition: none;
  }
  .destacado-card:hover,
  .tarjeta-producto:hover { transform: none; }
  .destacado-card:hover .destacado-img img,
  .tarjeta-producto:hover .imagen-box img { transform: none; }
  .btn-reabrir-carrito:hover { transform: none; }
  .punto-vivo,
  .destacados-hint svg,
  .badge.promo,
  .stepper-cant { animation: none; }
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
    max-height: min(240px, 35vh);
  }
}

/* Celular pequeño: retícula de una sola columna cómoda y padding reducido */
@media (max-width: 480px) {
  .vista-catalogo {
    --pad-x: 0.85rem;
    padding: 0.85rem var(--pad-x) 2rem;
  }
  .grid-productos {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .imagen-box { height: 168px; }
  .sk-img { height: 168px; }
  .destacado-card { width: 168px; }
  .modal-contenido {
    padding: 1.5rem;
  }
  /* Stepper compacto para tarjetas angostas */
  .btn-step { width: 28px; height: 28px; }
  .stepper-cant { min-width: 18px; font-size: 0.88rem; }
  .precio-final { font-size: 1.25rem; }
}

/* Pantalla muy angosta: una columna para evitar tarjetas apretadas */
@media (max-width: 360px) {
  .grid-productos {
    grid-template-columns: 1fr;
  }
}
</style>
