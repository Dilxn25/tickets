<template>
  <div class="vista-catalogo fade-in">
    <!-- Bienvenida y Buscador -->
    <div class="header-seccion">
      <h1 class="titulo-hola">Hola, {{ nombreCorto }}</h1>
      <p class="subtitulo">¿Qué vas a tomar hoy?</p>
      
      <div class="buscador-contenedor">
        <svg class="icono-buscar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="busqueda" type="text" class="buscador-input" placeholder="Buscar bebidas, combos..." />
      </div>
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

    <!-- Lista de Productos -->
    <div class="productos-contenedor">
      <div v-if="cargando" class="cargando-estado">
        <div class="spinner"></div>
      </div>
      
      <div v-else-if="productosFiltrados.length === 0" class="vacio-estado">
        <svg class="vacio-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <p>No encontramos lo que buscas</p>
      </div>
      
      <div v-else class="grid-productos">
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
              <button class="btn-agregar" @click.stop="agregarAlCarrito(p)">
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
      
      <!-- Panel Flotante de Carrito Detallado -->
      <div v-if="tiendaCarrito.totalItems > 0 && mostrarMiniCarrito" class="panel-carrito-flotante">
        <div class="cabecera-panel">
          <h4>Tu Pedido</h4>
          <button @click="mostrarMiniCarrito = false" class="btn-ocultar-panel">✕</button>
        </div>
        <div class="lista-items-panel">
          <div v-for="item in tiendaCarrito.items" :key="item.id" class="item-panel">
            <div class="control-cantidad-mini">
              <button class="btn-mini-cant" @click="tiendaCarrito.disminuirCantidad(item.id)">-</button>
              <span class="cant-panel">{{ item.cantidad }}</span>
              <button class="btn-mini-cant" @click="tiendaCarrito.aumentarCantidad(item.id)">+</button>
            </div>
            <span class="nom-panel">{{ item.nombre }}</span>
            <span class="prec-panel">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
          </div>
        </div>
        <div class="pie-panel">
          <div class="total-panel">Total: <strong>Bs. {{ tiendaCarrito.total.toFixed(2) }}</strong></div>
          <button class="btn-ir-pagar" @click="$router.push('/cliente/carrito')">A Pagar →</button>
        </div>
      </div>
      
      <!-- Botón Flotante (cuando está oculto) -->
      <button v-if="tiendaCarrito.totalItems > 0 && !mostrarMiniCarrito" class="btn-reabrir-carrito" @click="mostrarMiniCarrito = true">
        🛒 {{ tiendaCarrito.totalItems }} - Bs. {{ tiendaCarrito.total.toFixed(2) }}
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

// Simulación de estado de evento (si no hay, por defecto lo forzamos a activo para testeo)
const eventoActivoId = computed(() => tiendaCarrito.eventoActivoId || 1)

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

const productosFiltrados = computed(() => {
  return productos.value.filter(p => {
    const matchBusqueda = p.nombre_producto.toLowerCase().includes(busqueda.value.toLowerCase()) || 
                          (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.value.toLowerCase()))
    const matchCat = filtroCategoria.value === '' || p.id_categoria === filtroCategoria.value
    return matchBusqueda && matchCat && p.stock_actual > 0 // Ocultamos los sin stock
  })
})

function abrirDetalle(producto) {
  // Por ahora, o puede abrir un modal
  console.log('Ver detalle', producto.nombre_producto)
}

function agregarAlCarrito(producto) {
  tiendaCarrito.setEventoActivo(eventoActivoId.value)
  tiendaCarrito.agregarItem(producto)
  mostrarMiniCarrito.value = true
}
</script>

<style scoped>
.vista-catalogo {
  --azul-profundo: var(--color-info);
  padding: 1.5rem 1rem;
}

/* Header & Buscador */
.header-seccion {
  margin-bottom: 1.5rem;
}
.titulo-hola {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 0.2rem;
  background: linear-gradient(135deg, #fff, var(--texto-secundario));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitulo {
  color: var(--texto-secundario);
  font-size: 0.95rem;
  margin-bottom: 1.2rem;
}

.buscador-contenedor {
  position: relative;
  display: flex;
  align-items: center;
}
.icono-buscar {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--texto-desactivado);
}
.buscador-input {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 12px 16px 12px 42px;
  color: #fff;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}
.buscador-input:focus {
  outline: none;
  background: rgba(255,255,255,0.08);
  border-color: var(--morado-brillante);
  box-shadow: 0 0 15px rgba(155,89,182,0.3);
}

/* Categorías Horizontales */
.categorias-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 15px;
  margin-bottom: 10px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}
.categorias-scroll::-webkit-scrollbar { display: none; } /* Chrome */

.cat-btn {
  white-space: nowrap;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--texto-secundario);
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.cat-btn.activo {
  background: var(--morado-brillante);
  color: #fff;
  border-color: var(--morado-brillante);
  box-shadow: 0 4px 10px rgba(155,89,182,0.4);
}

/* Grid Productos */
.grid-productos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.tarjeta-producto {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s;
}
.tarjeta-producto:active { transform: scale(0.97); }

.insignias {
  position: absolute;
  top: 10px; left: 10px;
  display: flex; gap: 5px;
  z-index: 2;
}
.badge {
  font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
  padding: 3px 8px; border-radius: 10px; backdrop-filter: blur(4px);
}
.badge.promo { background: rgba(219,39,119,0.8); color: #fff; }
.badge.combo { background: rgba(52,152,219,0.8); color: #fff; }

.imagen-box {
  height: 140px;
  background: rgba(0,0,0,0.2);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.imagen-box img {
  width: 100%; height: 100%; object-fit: cover;
}
.placeholder { 
  width: 40px; height: 40px; color: var(--texto-desactivado); opacity: 0.5;
}

/* Gradiente para transición suave con la imagen */
.imagen-box::after {
  content: '';
  position: absolute; bottom: 0; left: 0; right: 0; height: 30px;
  background: linear-gradient(to top, var(--fondo-tarjeta), transparent);
}

.info-box {
  padding: 12px;
  display: flex; flex-direction: column; flex: 1;
}
.nombre {
  font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;
  line-height: 1.2;
}
.categoria {
  font-size: 0.75rem; color: var(--morado-brillante); margin-bottom: 10px;
}
.precio-fila {
  margin-top: auto;
  display: flex; justify-content: space-between; align-items: flex-end;
}
.precios { display: flex; flex-direction: column; }
.precio-tachado { font-size: 0.7rem; color: var(--texto-desactivado); text-decoration: line-through; }
.precio-final { font-size: 1.1rem; font-weight: 800; color: var(--rosa-acento); }

.btn-agregar {
  background: #fff;
  color: var(--fondo-app);
  border: none;
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(255,255,255,0.2);
  transition: transform 0.2s;
}
.btn-agregar:hover { transform: scale(1.1); }
.btn-agregar svg { width: 18px; height: 18px; }

/* Estados */
.cargando-estado, .vacio-estado {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; color: var(--texto-secundario);
}
.spinner {
  width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--morado-brillante); border-radius: 50%;
  animation: girar 1s linear infinite;
}
@keyframes girar { to { transform: rotate(360deg); } }
.vacio-icono { width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5; }

/* Modal Alerta Custom */
.modal-alerta {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
  z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.modal-contenido {
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  border-radius: 20px; padding: 2rem; text-align: center; max-width: 320px; width: 100%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.icono-alerta { width: 48px; height: 48px; color: var(--color-alerta); margin: 0 auto 1rem auto; }
.modal-contenido h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-alerta); }
.modal-contenido p { font-size: 0.9rem; color: var(--texto-secundario); margin-bottom: 1.5rem; line-height: 1.5; }
.btn-entendido {
  background: var(--morado-brillante); color: #fff; border: none; padding: 10px 24px;
  border-radius: 20px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%;
}
.btn-entendido:active { transform: scale(0.95); }

/* Panel Flotante Carrito */
.panel-carrito-flotante {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 320px;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--morado-brillante);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(157,78,221,0.2);
  z-index: 100000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cabecera-panel {
  background: linear-gradient(to right, var(--morado-brillante), var(--azul-profundo));
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}
.cabecera-panel h4 { margin: 0; font-weight: 700; font-size: 1rem; }
.btn-ocultar-panel {
  background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer;
}

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
  gap: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 2px;
}
.btn-mini-cant {
  background: none; border: none; color: white; cursor: pointer; font-weight: bold; padding: 0 4px;
}
.cant-panel { font-weight: 800; color: var(--morado-brillante); min-width: 15px; text-align: center; }
.nom-panel { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.prec-panel { font-weight: 700; }

.pie-panel {
  padding: 12px 16px;
  background: rgba(0,0,0,0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.total-panel { font-size: 0.9rem; color: var(--texto-secundario); }
.total-panel strong { font-size: 1.1rem; color: var(--texto-principal); }

.btn-ir-pagar {
  background: var(--morado-brillante);
  color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700;
  cursor: pointer; transition: transform 0.2s;
}
.btn-ir-pagar:active { transform: scale(0.95); }

/* Botón Reabrir */
.btn-reabrir-carrito {
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: var(--morado-brillante);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 5px 15px rgba(157,78,221,0.4);
  z-index: 100000;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-reabrir-carrito:active { transform: scale(0.95); }

@media (max-width: 600px) {
  .panel-carrito-flotante {
    width: 90%;
    right: 5%;
    left: 5%;
  }
}
</style>
