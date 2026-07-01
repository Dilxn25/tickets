<template>
  <div class="vista-productos fade-in">
    <div class="vista-cabecera">
      <div>
        <h2 class="vista-titulo">Catálogo de Productos</h2>
        <p class="vista-subtitulo">Bebidas, snacks, combos y más</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secundario" @click="abrirModalCategorias()">Gestionar Categorías</button>
        <button class="btn btn-primario" @click="abrirModal()">+ Nuevo Producto</button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filtros-barra">
      <div class="campo-busqueda">
        <svg class="icono-busqueda" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="busqueda" class="campo campo-con-icono" placeholder="Buscar producto..." />
      </div>
      <select v-model="filtroCategoria" @change="cargarDatos" class="campo" style="max-width:180px">
        <option value="">Todas las categorías</option>
        <option v-for="c in categorias" :key="c.id_categoria" :value="c.id_categoria">{{ c.nombre_categoria }}</option>
      </select>
      <label class="toggle-label">
        <input type="checkbox" v-model="soloPromos" @change="cargarDatos" /> Solo promociones
      </label>
    </div>

    <!-- Cuadrícula -->
    <div class="productos-grid">
      <div v-if="!productosFiltrados.length" class="vacio">No hay productos que coincidan</div>
      <div v-for="p in listaPaginada" :key="p.id_producto" class="tarjeta-producto">
        <div class="producto-imagen">
          <img v-if="p.url_imagen" :src="p.url_imagen" :alt="p.nombre_producto" />
          <div v-else class="imagen-placeholder">IMG</div>
          <span v-if="p.es_combo" class="badge-combo">COMBO</span>
          <span v-if="p.estado_promocion" class="badge-promo">PROMO</span>
        </div>
        <div class="producto-info">
          <p class="producto-nombre">{{ p.nombre_producto }}</p>
          <p class="producto-categoria">{{ p.nombre_categoria }}</p>
          <div class="producto-precios">
            <span v-if="p.estado_promocion" class="precio-base-tachado">Bs. {{ p.precio_base }}</span>
            <span class="precio-actual">Bs. {{ p.estado_promocion ? p.precio_promocion : p.precio_base }}</span>
          </div>
          <p class="producto-stock" :class="p.stock_actual < 5 ? 'stock-bajo' : ''">
            Stock: {{ p.stock_actual }}
          </p>
        </div>
        <div class="producto-acciones">
          <button class="btn btn-sm btn-secundario" @click="abrirModal(p)">Editar</button>
          <button class="btn btn-sm" :class="p.estado_promocion?'btn-alerta':'btn-secundario'" @click="alternarPromo(p)">
            {{ p.estado_promocion ? 'Quitar Promo' : 'Hacer Promo' }}
          </button>
        </div>
      </div>
    </div>

    <Paginacion :total="productosFiltrados.length" :pagina="pagina" :limite="limite"
       @update:pagina="pagina = $event"
       @update:limite="l => { limite = l; pagina = 1 }" />

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>{{ productoEditando ? 'Editar Producto' : 'Nuevo Producto' }}</h3>
            <button class="btn-x" @click="cerrarModal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <form class="modal-form" @submit.prevent="guardarProducto">
            <div class="grupo-campo">
              <label class="etiqueta">Nombre del producto *</label>
              <input v-model="form.nombre_producto" class="campo" required placeholder="Ej. Whisky Premium" />
            </div>
            <div class="form-fila">
              <div class="grupo-campo">
                <label class="etiqueta">Categoría *</label>
                <select v-model="form.id_categoria" class="campo" required>
                  <option v-for="c in categorias" :key="c.id_categoria" :value="c.id_categoria">{{ c.nombre_categoria }}</option>
                </select>
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Stock actual *</label>
                <input v-model.number="form.stock_actual" type="number" class="campo" min="0" required />
              </div>
            </div>
            <div class="form-fila">
              <div class="grupo-campo">
                <label class="etiqueta">Precio base (Bs.) *</label>
                <input v-model.number="form.precio_base" type="number" step="0.01" class="campo" required min="0" />
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Precio promoción (Bs.)</label>
                <input v-model.number="form.precio_promocion" type="number" step="0.01" class="campo" min="0" />
              </div>
            </div>
            <div class="grupo-campo">
              <label class="etiqueta">Descripción</label>
              <textarea v-model="form.descripcion" class="campo" rows="2" placeholder="Descripción opcional..."></textarea>
            </div>
            <div class="grupo-campo">
              <label class="etiqueta">Imagen (Cloudinary)</label>
              <input type="file" accept="image/*" @change="manejarArchivo" class="campo" />
            </div>
            <div class="toggles-fila">
              <label class="toggle-label"><input type="checkbox" v-model="form.estado_promocion" /> En promoción</label>
              <label class="toggle-label"><input type="checkbox" v-model="form.es_combo" /> Es combo</label>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secundario" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primario">{{ productoEditando ? 'Guardar' : 'Crear' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
    <!-- Modal Gestión de Categorías -->
    <Teleport to="body">
      <div v-if="modalCategoriasAbierto" class="modal-fondo" @click.self="modalCategoriasAbierto=false">
        <div class="modal fade-in" style="max-width:400px">
          <div class="modal-cabecera">
            <h3>Gestionar Categorías</h3>
            <button class="btn-x" @click="modalCategoriasAbierto=false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div style="padding:1.5rem">
            <div style="display:flex; gap:10px; margin-bottom:1rem;">
              <input v-model="nuevaCategoriaNombre" class="campo" placeholder="Nueva categoría..." />
              <button class="btn btn-primario" @click="crearCategoria">Añadir</button>
            </div>
            <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:8px;">
              <li v-for="c in categorias" :key="c.id_categoria" style="display:flex; justify-content:space-between; align-items:center; background:var(--fondo-tarjeta-alt); padding:8px 12px; border-radius:var(--radio-md);">
                <span>{{ c.nombre_categoria }}</span>
                <button class="btn btn-sm btn-peligro" @click="eliminarCategoria(c)">Eliminar</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import Paginacion from '@/componentes/comunes/Paginacion.vue'

const busqueda=ref('');const filtroCategoria=ref('');const soloPromos=ref(false);const cargando=ref(false)
const modalAbierto=ref(false);const productoEditando=ref(null)
const modalCategoriasAbierto=ref(false);const nuevaCategoriaNombre=ref('')
const categorias=ref([])
const productos=ref([])
const archivoImagen=ref(null)

const form=reactive({nombre_producto:'',id_categoria:'',precio_base:0,precio_promocion:'',descripcion:'',stock_actual:0,estado_promocion:false,es_combo:false})

async function cargarDatos() {
  cargando.value = true
  try {
    const [cats, prods] = await Promise.all([
      servicioProductos.obtenerCategorias(),
      servicioProductos.listar({ busqueda: busqueda.value, categoria: filtroCategoria.value, promo: soloPromos.value })
    ])
    categorias.value = cats
    productos.value = prods
    if(cats.length > 0 && !form.id_categoria) form.id_categoria = cats[0].id_categoria
  } catch (error) { console.error('Error cargando datos:', error) } finally { cargando.value = false }
}

onMounted(() => { cargarDatos() })

const productosFiltrados=computed(()=>{
  const q = busqueda.value.trim().toLowerCase()
  if(!q) return productos.value
  return productos.value.filter(p =>
    (p.nombre_producto || '').toLowerCase().includes(q) ||
    (p.descripcion || '').toLowerCase().includes(q)
  )
}) // Categoría y promo se filtran en el backend; la búsqueda de texto se filtra localmente

const pagina = ref(1)
const limite = ref(20)

const listaPaginada = computed(() => {
  const ini = (pagina.value - 1) * limite.value
  return productosFiltrados.value.slice(ini, ini + limite.value)
})

watch([busqueda, filtroCategoria, soloPromos], () => { pagina.value = 1 })

function manejarArchivo(e) {
  archivoImagen.value = e.target.files[0]
}

function abrirModal(p=null){
  productoEditando.value=p;
  archivoImagen.value=null;
  if(p) Object.assign(form,{nombre_producto:p.nombre_producto,id_categoria:p.id_categoria,precio_base:p.precio_base,precio_promocion:p.precio_promocion ?? '',descripcion:p.descripcion ?? '',stock_actual:p.stock_actual,estado_promocion:!!p.estado_promocion,es_combo:!!p.es_combo});
  else Object.assign(form,{nombre_producto:'',id_categoria:categorias.value[0]?.id_categoria || '',precio_base:0,precio_promocion:'',descripcion:'',stock_actual:0,estado_promocion:false,es_combo:false});
  modalAbierto.value=true
}
function cerrarModal(){modalAbierto.value=false}

async function guardarProducto(){
  try {
    const formData = new FormData()
    formData.append('nombre_producto', form.nombre_producto)
    formData.append('id_categoria', form.id_categoria)
    formData.append('precio_base', form.precio_base)
    if(form.precio_promocion) formData.append('precio_promocion', form.precio_promocion)
    if(form.descripcion) formData.append('descripcion', form.descripcion)
    formData.append('stock_actual', form.stock_actual)
    formData.append('estado_promocion', form.estado_promocion)
    formData.append('es_combo', form.es_combo)
    
    if (archivoImagen.value) {
      formData.append('imagen', archivoImagen.value)
    }

    if(productoEditando.value) {
      await servicioProductos.editar(productoEditando.value.id_producto, formData)
    } else {
      await servicioProductos.crear(formData)
    }
    cerrarModal()
    cargarDatos()
  } catch (error) { alert(error.error || 'Error al guardar producto') }
}

async function alternarPromo(p) {
  try {
    await servicioProductos.cambiarPromo(p.id_producto)
    cargarDatos()
  } catch (error) { console.error('Error al cambiar promoción:', error) }
}

function abrirModalCategorias() {
  modalCategoriasAbierto.value = true
}

async function crearCategoria() {
  if (!nuevaCategoriaNombre.value) return
  try {
    await servicioProductos.crearCategoria({ nombre_categoria: nuevaCategoriaNombre.value })
    nuevaCategoriaNombre.value = ''
    cargarDatos()
  } catch (err) { alert('Error al crear categoría') }
}

async function eliminarCategoria(cat) {
  const confirmacion = confirm(`Si eliminas la categoría "${cat.nombre_categoria}", todos los productos que pertenezcan a ella se reasignarán a "Otro". ¿Estás seguro?`)
  if (!confirmacion) return
  try {
    await servicioProductos.eliminarCategoria(cat.id_categoria)
    cargarDatos()
  } catch (err) { alert('Error al eliminar categoría') }
}
</script>

<style scoped>
.vista-cabecera{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;gap:1rem;flex-wrap:wrap}
.vista-titulo{font-size:1.4rem;margin-bottom:.2rem}
.vista-subtitulo{color:var(--texto-secundario);font-size:.85rem}
.filtros-barra{display:flex;gap:.75rem;margin-bottom:1.2rem;flex-wrap:wrap;align-items:center}
.campo-busqueda{position:relative;max-width:280px;width:100%}
.icono-busqueda{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--texto-secundario);pointer-events:none}
.campo-con-icono{padding-left:38px;width:100%}
.toggle-label{display:flex;align-items:center;gap:6px;color:var(--texto-secundario);font-size:.85rem;cursor:pointer;user-select:none}
.vacio{color:var(--texto-desactivado);padding:3rem;text-align:center;width:100%}
.productos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}
.tarjeta-producto{background:var(--fondo-tarjeta);border:1px solid var(--borde-sutil);border-radius:var(--radio-lg);overflow:hidden;transition:var(--trans-normal);display:flex;flex-direction:column}
.tarjeta-producto:hover{border-color:var(--borde-activo);transform:translateY(-2px);box-shadow:var(--sombra-glow)}
.producto-imagen{position:relative;height:140px;background:var(--fondo-tarjeta-alt);display:flex;align-items:center;justify-content:center}
.producto-imagen img{width:100%;height:100%;object-fit:cover}
.imagen-placeholder{font-size:3rem;opacity:.4}
.badge-combo,.badge-promo{position:absolute;top:8px;font-size:.65rem;font-weight:700;padding:3px 8px;border-radius:var(--radio-full)}
.badge-combo{left:8px;background:rgba(52,152,219,.25);color:var(--color-info);border:1px solid rgba(52,152,219,.3)}
.badge-promo{right:8px;background:rgba(194,24,91,.25);color:var(--rosa-suave);border:1px solid rgba(194,24,91,.3)}
.producto-info{padding:.9rem;flex:1}
.producto-nombre{font-weight:600;font-size:.9rem;margin-bottom:.2rem}
.producto-categoria{font-size:.75rem;color:var(--morado-brillante);margin-bottom:.5rem}
.producto-precios{display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem}
.precio-base-tachado{text-decoration:line-through;color:var(--texto-desactivado);font-size:.8rem}
.precio-actual{font-weight:700;font-size:1rem;color:var(--texto-principal)}
.producto-stock{font-size:.75rem;color:var(--texto-secundario)}
.stock-bajo{color:var(--color-alerta)!important}
.producto-acciones{display:flex;gap:6px;padding:.75rem;border-top:1px solid var(--borde-sutil)}
.btn-alerta{background:rgba(243,156,18,.15);border:1px solid rgba(243,156,18,.3);color:var(--color-alerta)}
.modal-fondo{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;padding:1rem}
.modal{background:var(--fondo-tarjeta);border:1px solid var(--borde-sutil);border-radius:var(--radio-xl);width:100%;max-width:520px;box-shadow:var(--sombra-modal);max-height:90vh;overflow-y:auto}
.modal-cabecera{display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;border-bottom:1px solid var(--borde-sutil);position:sticky;top:0;background:var(--fondo-tarjeta);z-index:1}
.modal-cabecera h3{font-size:1.1rem}
.btn-x{background:none;border:none;color:var(--texto-secundario);font-size:1.1rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}
.btn-x:hover{color:var(--color-error)}
.modal-form{padding:1.5rem;display:flex;flex-direction:column;gap:1rem}
.form-fila{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.grupo-campo{display:flex;flex-direction:column;gap:6px}
.etiqueta{font-size:.8rem;color:var(--texto-secundario);font-weight:500}
.toggles-fila{display:flex;gap:1.5rem;flex-wrap:wrap}
.modal-footer{display:flex;justify-content:flex-end;gap:.75rem;padding-top:.5rem}

/* Tablet: 481-1024px */
@media(max-width:1024px){
  .productos-grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
  .producto-imagen img{max-width:100%}
}

/* Celular: <=480px */
@media(max-width:480px){
  .vista-cabecera{flex-direction:column;align-items:stretch}
  .vista-cabecera > div[style]{flex-wrap:wrap}
  .filtros-barra .campo{max-width:100%!important;width:100%}
  .productos-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.75rem}
  .producto-imagen{height:120px}
  .modal-fondo{padding:.5rem}
  .modal-cabecera{padding:1rem}
  .modal-form{padding:1rem}
  .form-fila{grid-template-columns:1fr}
  .modal-footer{flex-direction:column-reverse}
  .modal-footer .btn{width:100%}
}
</style>
