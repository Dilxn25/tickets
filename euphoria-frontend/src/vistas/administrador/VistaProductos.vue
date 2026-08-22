<template>
  <div class="vista-productos entrada-cine">
    <!-- Cabecera premium: título + acciones + métricas de un vistazo -->
    <header class="productos-encabezado superficie">
      <div class="encabezado-fila">
        <div class="encabezado-texto">
          <h2 class="vista-titulo">Catálogo de productos</h2>
          <p class="vista-subtitulo">Bebidas, snacks, combos y más</p>
        </div>
        <div class="cabecera-acciones">
          <button class="btn btn-secundario hover-crecer" @click="abrirModalCategorias()">Gestionar categorías</button>
          <button class="btn btn-primario brillo-hover" @click="abrirModal()">
            <span class="btn-mas" aria-hidden="true">+</span> Nuevo producto
          </button>
        </div>
      </div>
      <dl class="encabezado-metricas">
        <div class="metrica">
          <dt class="metrica-label">Productos</dt>
          <dd class="metrica-valor">{{ productos.length }}</dd>
        </div>
        <div class="metrica metrica-promo">
          <dt class="metrica-label">En promoción</dt>
          <dd class="metrica-valor">{{ productos.filter(p => p.estado_promocion).length }}</dd>
        </div>
        <div class="metrica metrica-riesgo">
          <dt class="metrica-label">Stock bajo</dt>
          <dd class="metrica-valor">{{ productos.filter(p => p.stock_actual <= 30).length }}</dd>
        </div>
        <div class="metrica">
          <dt class="metrica-label">Categorías</dt>
          <dd class="metrica-valor">{{ categorias.length }}</dd>
        </div>
      </dl>
    </header>

    <!-- Filtros -->
    <div class="filtros-barra superficie">
      <div class="campo-busqueda">
        <svg class="icono-busqueda" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="busqueda" class="campo campo-con-icono" placeholder="Buscar producto..." aria-label="Buscar producto" />
      </div>
      <div class="filtro-select"><BaseSelect v-model="filtroCategoria" :options="opcionesCatFiltro" placeholder="Todas las categorías" /></div>
      <label class="toggle-label">
        <input type="checkbox" v-model="soloPromos" /> Solo promociones
      </label>
      <span class="filtros-conteo">{{ productosFiltrados.length }} resultado{{ productosFiltrados.length === 1 ? '' : 's' }}</span>
    </div>

    <!-- Cuadrícula -->
    <div class="productos-grid escalonar">
      <div v-if="!productosFiltrados.length" class="vacio">
        <svg class="vacio-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <p class="vacio-titulo">Sin coincidencias</p>
        <p class="vacio-texto">No hay productos que coincidan con los filtros actuales.</p>
      </div>
      <article v-for="p in listaPaginada" :key="p.id_producto" class="tarjeta-producto hover-elevar">
        <div class="producto-imagen">
          <img v-if="p.url_imagen" :src="p.url_imagen" :alt="`Imagen de ${p.nombre_producto}`" />
          <ComboImagen v-else-if="p.es_combo && p.combos_como_padre?.length" :componentes="p.combos_como_padre" />
          <div v-else class="imagen-placeholder" aria-hidden="true">IMG</div>
          <div class="producto-badges">
            <span v-if="p.es_combo" class="badge-combo">Combo</span>
            <span v-if="p.estado_promocion" class="badge-promo">Promo</span>
          </div>
        </div>
        <div class="producto-info">
          <p class="producto-categoria">{{ p.nombre_categoria }}</p>
          <p class="producto-nombre">{{ p.nombre_producto }}</p>
          <!-- Combo: ingredientes como mini-fichas (imagen + cantidad + nombre), igual que el mesero/cliente -->
          <div v-if="p.es_combo && p.combos_como_padre?.length" class="combo-ingredientes">
            <span v-for="(c, i) in p.combos_como_padre" :key="i" class="ing-chip">
              <img v-if="c.url_imagen" :src="c.url_imagen" class="ing-img" alt="" />
              <span v-else class="ing-img ing-ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path><path d="M12 15v6"></path><path d="M8 21h8"></path></svg></span>
              <span class="ing-txt"><b>{{ c.cantidad }}</b> {{ nombreLimpioCombo(c.nombre_producto) }}</span>
            </span>
          </div>
          <div class="producto-pie">
            <div class="producto-precios">
              <span v-if="p.estado_promocion" class="precio-base-tachado">Bs. {{ p.precio_base }}</span>
              <span class="precio-actual"><span class="precio-moneda">Bs.</span>{{ p.estado_promocion ? p.precio_promocion : p.precio_base }}</span>
            </div>
            <span class="producto-stock" :class="p.stock_actual <= 30 ? 'stock-bajo' : ''">
              <span class="stock-punto" aria-hidden="true"></span>{{ p.stock_actual }} en stock
            </span>
          </div>
        </div>
        <div class="producto-acciones">
          <button class="btn btn-sm btn-secundario" @click="abrirModal(p)">Editar</button>
          <button class="btn btn-sm" :class="p.estado_promocion?'btn-alerta':'btn-secundario'" @click="alternarPromo(p)">
            {{ p.estado_promocion ? 'Quitar promo' : 'Hacer promo' }}
          </button>
          <button class="btn btn-sm btn-secundario btn-icono-sm" title="Historial de precios" @click="abrirHistorial(p)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span class="hist-btn-txt">Historial de precios</span>
          </button>
        </div>
      </article>
    </div>

    <Paginacion :total="productosFiltrados.length" :pagina="pagina" :limite="limite"
       @update:pagina="pagina = $event"
       @update:limite="l => { limite = l; pagina = 1 }" />

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <div class="mc-titulo">
              <span class="mc-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="21" height="21" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>
              </span>
              <div class="mc-textos">
                <h3>{{ productoEditando ? 'Editar producto' : 'Nuevo producto' }}</h3>
                <p class="mc-sub">{{ productoEditando ? 'Actualizá los datos y la imagen del producto' : 'Completá los datos para crear un producto nuevo' }}</p>
              </div>
            </div>
            <button class="btn-x" @click="cerrarModal" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <form class="modal-form" @submit.prevent="guardarProducto">
            <!-- Sección: datos básicos -->
            <section class="form-seccion">
              <p class="seccion-titulo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
                Datos básicos
              </p>
              <div class="grupo-campo">
                <label class="etiqueta">Nombre del producto *</label>
                <input v-model="form.nombre_producto" class="campo" required placeholder="Ej. Whisky Premium" />
              </div>
              <div class="form-fila">
                <div class="grupo-campo">
                  <label class="etiqueta">Categoría *</label>
                  <BaseSelect v-model="form.id_categoria" :options="opcionesCategoria" placeholder="Seleccionar categoría…" />
                </div>
                <div class="grupo-campo">
                  <label class="etiqueta">Stock actual *</label>
                  <div class="campo-adorno">
                    <input v-model.number="form.stock_actual" type="number" class="campo campo--sufijo" min="0" required />
                    <span class="adorno adorno--der">u.</span>
                  </div>
                </div>
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Descripción</label>
                <textarea v-model="form.descripcion" class="campo" rows="2" placeholder="Descripción opcional..."></textarea>
              </div>
            </section>

            <!-- Sección: precios -->
            <section class="form-seccion">
              <p class="seccion-titulo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V7a2 2 0 0 0-2-2h-5L3 15l6 6 10-10Z"/><circle cx="9" cy="9" r="1.4"/></svg>
                Precios
              </p>
              <div class="form-fila">
                <div class="grupo-campo">
                  <label class="etiqueta">Precio base *</label>
                  <div class="campo-adorno">
                    <span class="adorno">Bs.</span>
                    <input v-model.number="form.precio_base" type="number" step="0.01" class="campo campo--prefijo" required min="0" />
                  </div>
                </div>
                <div class="grupo-campo">
                  <label class="etiqueta">Precio promoción</label>
                  <div class="campo-adorno">
                    <span class="adorno">Bs.</span>
                    <input v-model.number="form.precio_promocion" type="number" step="0.01" class="campo campo--prefijo" min="0" />
                  </div>
                </div>
              </div>
              <div class="switches-fila">
                <label class="switch-row">
                  <span class="switch"><input type="checkbox" v-model="form.estado_promocion" /><span class="switch-track"><span class="switch-thumb"></span></span></span>
                  <span class="switch-info"><span class="switch-txt">En promoción</span><span class="switch-desc">Muestra el precio rebajado</span></span>
                </label>
                <label class="switch-row">
                  <span class="switch"><input type="checkbox" v-model="form.es_combo" /><span class="switch-track"><span class="switch-thumb"></span></span></span>
                  <span class="switch-info"><span class="switch-txt">Es combo</span><span class="switch-desc">Agrupa varios productos</span></span>
                </label>
              </div>
            </section>

            <!-- Sección: imagen -->
            <section class="form-seccion">
              <p class="seccion-titulo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 16-5-5L5 20"/></svg>
                Imagen del producto
              </p>
              <div class="grupo-campo">
              <div
                class="dropzone"
                :class="{ 'dropzone--arrastrando': arrastrando, 'dropzone--lleno': !!imagenPreview }"
                role="button"
                tabindex="0"
                @click="dispararSelector"
                @keydown.enter.prevent="dispararSelector"
                @keydown.space.prevent="dispararSelector"
                @dragover.prevent="arrastrando = true"
                @dragenter.prevent="arrastrando = true"
                @dragleave.prevent="arrastrando = false"
                @drop.prevent="onSoltar"
              >
                <input ref="inputArchivo" type="file" accept="image/*" class="dropzone-input" @change="manejarArchivo" />

                <template v-if="imagenPreview">
                  <img :src="imagenPreview" alt="Vista previa de la imagen" class="dropzone-preview" />
                  <div class="dropzone-velo">
                    <span class="dropzone-cambiar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.5"/></svg>
                      Cambiar imagen
                    </span>
                  </div>
                  <button v-if="archivoImagen" type="button" class="dropzone-quitar" aria-label="Quitar la imagen seleccionada" @click.stop="quitarImagen">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  <span v-if="archivoImagen" class="dropzone-nombre">{{ archivoImagen.name }}</span>
                </template>

                <template v-else>
                  <span class="dropzone-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="30" height="30" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
                  </span>
                  <p class="dropzone-titulo">Arrastrá una imagen aquí</p>
                  <p class="dropzone-sub">o <span class="dropzone-link">hacé clic para elegir</span></p>
                  <p class="dropzone-formatos">PNG, JPG o WEBP · hasta 5&nbsp;MB</p>
                </template>
              </div>
              <p v-if="errorImagen" class="dropzone-error">{{ errorImagen }}</p>
              </div>
            </section>

            <!-- Editor de combo: qué productos lo componen -->
            <div v-if="form.es_combo" class="combo-editor">
              <label class="etiqueta">Productos del combo</label>
              <p class="combo-hint">Un combo agrupa varios productos a un precio especial. Elige qué incluye y en qué cantidad.</p>
              <div class="combo-agregar">
                <div class="combo-sel"><BaseSelect v-model="comboSel" :options="opcionesComponentes" placeholder="Elegir producto…" /></div>
                <input v-model.number="comboCant" type="number" min="1" class="campo combo-cant" aria-label="Cantidad" />
                <button type="button" class="btn btn-secundario" @click="agregarComponente">Agregar</button>
              </div>
              <ul v-if="componentesCombo.length" class="combo-lista">
                <li v-for="c in componentesCombo" :key="c.id_producto_hijo" class="combo-item">
                  <span class="combo-cant-badge">{{ c.cantidad }}×</span>
                  <span class="combo-nombre">{{ c.nombre_producto }}</span>
                  <span class="combo-precio-item">Bs. {{ (precioDe(c.id_producto_hijo) * c.cantidad).toFixed(2) }}</span>
                  <button type="button" class="btn-quitar-combo" aria-label="Quitar" @click="quitarComponente(c.id_producto_hijo)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </li>
              </ul>
              <p v-else class="combo-vacio">Aún no agregaste productos al combo.</p>

              <!-- Precio sugerido autocalculado según los componentes -->
              <div v-if="componentesCombo.length" class="combo-precio-sugerido">
                <div class="cps-info">
                  <span class="cps-linea">Por separado: <strong>Bs. {{ sumaCombo.toFixed(2) }}</strong></span>
                  <span class="cps-linea cps-destacado">Precio sugerido (−{{ descuentoIA }}%): <strong>Bs. {{ precioSugerido.toFixed(2) }}</strong></span>
                </div>
                <button type="button" class="btn btn-sm btn-secundario" @click="usarPrecioSugerido">Usar sugerido</button>
              </div>
              <p v-if="avisoPrecioCombo" class="combo-aviso-precio">{{ avisoPrecioCombo }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secundario" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primario">{{ productoEditando ? 'Guardar' : 'Crear' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
    <!-- Modal Historial de precios (Fase 8) -->
    <Teleport to="body">
      <div v-if="modalHistorialAbierto" class="modal-fondo" @click.self="modalHistorialAbierto=false">
        <div class="modal fade-in" style="max-width:640px">
          <div class="modal-cabecera">
            <h3>Historial de precios{{ histDatos ? ' — ' + histDatos.producto.nombre_producto : '' }}</h3>
            <button class="btn-x" @click="modalHistorialAbierto=false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="hist-cuerpo">
            <p v-if="histCargando" class="hist-vacio">Cargando historial...</p>
            <template v-else-if="histDatos">
              <h4 class="hist-subtitulo">Cómo se vendió a cada precio</h4>
              <p v-if="!histDatos.ventas_por_precio.length" class="hist-vacio">Este producto todavía no registra ventas.</p>
              <div v-else class="hist-barras">
                <div v-for="v in histDatos.ventas_por_precio" :key="v.precio" class="hist-barra-fila">
                  <span class="hist-precio">Bs. {{ v.precio.toFixed(2) }}</span>
                  <div class="hist-barra"><div class="hist-barra-relleno" :style="{ width: anchoBarra(v) }"></div></div>
                  <span class="hist-barra-info">{{ v.unidades }} uds · Bs. {{ v.ingresos.toFixed(2) }} · {{ v.pedidos }} pedido(s)</span>
                </div>
              </div>

              <h4 class="hist-subtitulo">Cambios registrados</h4>
              <ul class="hist-linea">
                <li v-for="c in histDatos.cambios" :key="c.id_historial">
                  <div class="hist-fila-precio">
                    <span class="hist-cambio" :class="claseCambio(c)">
                      <template v-if="c.precio_anterior !== null">Bs. {{ c.precio_anterior.toFixed(2) }}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="13" height="13"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </template>
                      Bs. {{ c.precio_nuevo.toFixed(2) }}
                    </span>
                    <span class="hist-badge" :class="'origen-' + c.origen">{{ etiquetaOrigen(c.origen) }}</span>
                    <span v-if="c.tipo === 'promocion'" class="hist-badge origen-tipo-promo">Promo</span>
                  </div>
                  <div class="hist-fila-meta">{{ formatearFechaHist(c.fecha_hora) }} · {{ c.usuario }}</div>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal Gestión de Categorías -->
    <Teleport to="body">
      <div v-if="modalCategoriasAbierto" class="modal-fondo" @click.self="modalCategoriasAbierto=false">
        <div class="modal fade-in" style="max-width:400px">
          <div class="modal-cabecera">
            <h3>Gestionar categorías</h3>
            <button class="btn-x" @click="modalCategoriasAbierto=false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="categorias-cuerpo">
            <div class="categorias-alta">
              <input v-model="nuevaCategoriaNombre" class="campo" placeholder="Nueva categoría..." aria-label="Nombre de la nueva categoría" />
              <button class="btn btn-primario" @click="crearCategoria">Añadir</button>
            </div>
            <ul class="categorias-lista escalonar">
              <li v-for="c in categorias" :key="c.id_categoria" class="categoria-item">
                <span class="categoria-nombre">{{ c.nombre_categoria }}</span>
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
import clienteHttp from '@/servicios-api/cliente-http.js'
import Paginacion from '@/componentes/comunes/Paginacion.vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import ComboImagen from '@/componentes/comunes/ComboImagen.vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()

const busqueda=ref('');const filtroCategoria=ref('');const soloPromos=ref(false);const cargando=ref(false)
const modalAbierto=ref(false);const productoEditando=ref(null)
const modalCategoriasAbierto=ref(false);const nuevaCategoriaNombre=ref('')
const categorias=ref([])
const opcionesCatFiltro = computed(() => [{ value:'', label:'Todas las categorías' }, ...categorias.value.map(c => ({ value:c.id_categoria, label:c.nombre_categoria }))])
const opcionesCategoria = computed(() => categorias.value.map(c => ({ value:c.id_categoria, label:c.nombre_categoria })))
const productos=ref([])
const archivoImagen=ref(null)

const form=reactive({nombre_producto:'',id_categoria:'',precio_base:0,precio_promocion:'',descripcion:'',stock_actual:0,estado_promocion:false,es_combo:false})

// ── Editor de combo ──────────────────────────────────────────────────────
const componentesCombo = ref([])  // [{ id_producto_hijo, cantidad, nombre_producto }]
const comboSel = ref('')
const comboCant = ref(1)

// Productos que se pueden agregar: no combos, no el propio producto, no repetidos.
const opcionesComponentes = computed(() =>
  productos.value
    .filter(p => !p.es_combo)
    .filter(p => p.id_producto !== productoEditando.value?.id_producto)
    .filter(p => !componentesCombo.value.some(c => c.id_producto_hijo === p.id_producto))
    .map(p => ({ value: p.id_producto, label: p.nombre_producto }))
)

function agregarComponente() {
  if (!comboSel.value) { notif.advertencia('Elige un producto para agregar al combo.'); return }
  const prod = productos.value.find(p => p.id_producto === comboSel.value)
  if (!prod) return
  const cant = parseInt(comboCant.value) || 1
  componentesCombo.value.push({ id_producto_hijo: prod.id_producto, cantidad: cant, nombre_producto: prod.nombre_producto })
  comboSel.value = ''
  comboCant.value = 1
}

function quitarComponente(idHijo) {
  componentesCombo.value = componentesCombo.value.filter(c => c.id_producto_hijo !== idHijo)
}

// ── Precio sugerido del combo (autocalculado según componentes) ──────────
// Usa el mismo % de descuento configurado para la IA (tabla configuracion).
const descuentoIA = ref(10)
clienteHttp.get('/recomendaciones/config')
  .then(c => { if (c?.descuento_combos !== undefined) descuentoIA.value = Number(c.descuento_combos) })
  .catch(() => { /* si falla, queda el 10% por defecto */ })

function precioDe(idProducto) {
  const p = productos.value.find(x => x.id_producto === idProducto)
  return p ? parseFloat(p.precio_base) || 0 : 0
}

// Quita el sufijo "(x6)" del nombre para que la mini-ficha del combo se lea limpia
function nombreLimpioCombo(nombre) {
  return String(nombre || '').replace(/\s*\(x\d+\)\s*$/i, '').trim()
}
const sumaCombo = computed(() =>
  componentesCombo.value.reduce((s, c) => s + precioDe(c.id_producto_hijo) * c.cantidad, 0)
)
// Redondeo a precio "atractivo" (.00 .40 .50 .60 .90), igual que el módulo de IA
function precioAtractivo(p) {
  const entero = Math.floor(p)
  const dec = p - entero
  let mejor = 0, dmin = Infinity
  for (const o of [0.0, 0.4, 0.5, 0.6, 0.9]) {
    const d = Math.abs(dec - o)
    if (d < dmin) { dmin = d; mejor = o }
  }
  return Math.round((entero + mejor) * 100) / 100
}
const precioSugerido = computed(() => precioAtractivo(sumaCombo.value * (1 - descuentoIA.value / 100)))
function usarPrecioSugerido() { form.precio_base = precioSugerido.value }

// Aviso en vivo si el precio puesto no cuadra con los componentes
const avisoPrecioCombo = computed(() => {
  if (!form.es_combo || !componentesCombo.value.length) return ''
  const p = parseFloat(form.precio_base)
  if (!(p > 0) || !(sumaCombo.value > 0)) return ''
  if (p > sumaCombo.value) return `Ojo: el precio (Bs. ${p.toFixed(2)}) es MAYOR que comprar todo por separado (Bs. ${sumaCombo.value.toFixed(2)}) — nadie lo elegiría.`
  if (p < sumaCombo.value * 0.5) return `Ojo: el precio (Bs. ${p.toFixed(2)}) está muy por debajo del valor real (Bs. ${sumaCombo.value.toFixed(2)}) — más del 50% de descuento.`
  return ''
})

async function cargarDatos() {
  cargando.value = true
  try {
    // Se carga el catálogo COMPLETO; los filtros (categoría/promo/búsqueda) se aplican
    // en cliente para que las métricas de cabecera sean siempre globales y el filtrado instantáneo.
    const [cats, prods] = await Promise.all([
      servicioProductos.obtenerCategorias(),
      servicioProductos.listar({ incluir_cortesias: 1 })
    ])
    categorias.value = cats
    productos.value = prods
    if(cats.length > 0 && !form.id_categoria) form.id_categoria = cats[0].id_categoria
  } catch (error) { console.error('Error cargando datos:', error) } finally { cargando.value = false }
}

onMounted(() => { cargarDatos() })

// Todos los filtros se aplican en cliente sobre el catálogo completo
const productosFiltrados=computed(()=>{
  const q = busqueda.value.trim().toLowerCase()
  return productos.value.filter(p => {
    const matchCat   = filtroCategoria.value ? p.id_categoria === filtroCategoria.value : true
    const matchPromo = soloPromos.value ? !!p.estado_promocion : true
    const matchTexto = !q || (p.nombre_producto || '').toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q)
    return matchCat && matchPromo && matchTexto
  })
})

const pagina = ref(1)
const limite = ref(20)

const listaPaginada = computed(() => {
  const ini = (pagina.value - 1) * limite.value
  return productosFiltrados.value.slice(ini, ini + limite.value)
})

watch([busqueda, filtroCategoria, soloPromos], () => { pagina.value = 1 })

// ── Dropzone de imagen (arrastrar-y-soltar + clic) ───────────────────────────
const inputArchivo = ref(null)
const arrastrando = ref(false)
const previewImagen = ref('')   // data URL del archivo recién elegido
const errorImagen = ref('')

// Qué mostrar: el archivo nuevo si lo hay; si no, la imagen actual (al editar)
const imagenPreview = computed(() => previewImagen.value || productoEditando.value?.url_imagen || '')

function dispararSelector() { inputArchivo.value?.click() }

function manejarArchivo(e) { procesarArchivo(e.target.files?.[0]) }

function onSoltar(e) {
  arrastrando.value = false
  procesarArchivo(e.dataTransfer?.files?.[0])
}

function procesarArchivo(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) { errorImagen.value = 'El archivo debe ser una imagen (PNG, JPG o WEBP).'; return }
  if (file.size > 5 * 1024 * 1024) { errorImagen.value = 'La imagen no debe pesar más de 5 MB.'; return }
  errorImagen.value = ''
  archivoImagen.value = file
  const lector = new FileReader()
  lector.onload = () => { previewImagen.value = lector.result }
  lector.readAsDataURL(file)
}

function quitarImagen() {
  archivoImagen.value = null
  previewImagen.value = ''
  errorImagen.value = ''
  if (inputArchivo.value) inputArchivo.value.value = ''
}

async function abrirModal(p=null){
  productoEditando.value=p;
  archivoImagen.value=null;
  previewImagen.value=''; errorImagen.value=''; arrastrando.value=false;
  componentesCombo.value = []
  comboSel.value = ''
  comboCant.value = 1
  if(p) Object.assign(form,{nombre_producto:p.nombre_producto,id_categoria:p.id_categoria,precio_base:p.precio_base,precio_promocion:p.precio_promocion ?? '',descripcion:p.descripcion ?? '',stock_actual:p.stock_actual,estado_promocion:!!p.estado_promocion,es_combo:!!p.es_combo});
  else Object.assign(form,{nombre_producto:'',id_categoria:categorias.value[0]?.id_categoria || '',precio_base:0,precio_promocion:'',descripcion:'',stock_actual:0,estado_promocion:false,es_combo:false});
  modalAbierto.value=true
  // Si es combo en edición, precargamos sus componentes desde el backend.
  if (p && p.es_combo) {
    try {
      const detalle = await servicioProductos.obtener(p.id_producto)
      componentesCombo.value = (detalle.combos_como_padre || []).map(c => ({
        id_producto_hijo: c.id_producto_hijo,
        cantidad: c.cantidad,
        nombre_producto: c.nombre_producto,
      }))
    } catch { /* si falla, se abre vacío */ }
  }
}
function cerrarModal(){modalAbierto.value=false}

// ── Historial de precios (Fase 8) ────────────────────────────────────────
const modalHistorialAbierto = ref(false)
const histCargando = ref(false)
const histDatos = ref(null)

async function abrirHistorial(p) {
  modalHistorialAbierto.value = true
  histCargando.value = true
  histDatos.value = null
  try {
    histDatos.value = await clienteHttp.get(`/productos/${p.id_producto}/historial-precios`)
  } catch {
    notif.error('No se pudo cargar el historial de precios.')
    modalHistorialAbierto.value = false
  } finally { histCargando.value = false }
}

const ETIQUETAS_ORIGEN = {
  creacion: 'Creación', edicion: 'Edición', promo_activada: 'Promo activada',
  promo_desactivada: 'Promo desactivada', combo_ia: 'IA (combo)', registro_inicial: 'Registro inicial',
}
function etiquetaOrigen(o) { return ETIQUETAS_ORIGEN[o] || o }
// Verde si el precio subió, rojo si bajó
function claseCambio(c) {
  if (c.precio_anterior === null || c.precio_anterior === c.precio_nuevo) return ''
  return c.precio_nuevo > c.precio_anterior ? 'sube' : 'baja'
}
function anchoBarra(v) {
  const max = Math.max(...histDatos.value.ventas_por_precio.map(x => x.unidades), 1)
  return Math.max((v.unidades / max) * 100, 4) + '%'
}
function formatearFechaHist(f) {
  return new Date(f).toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function guardarProducto(){
  // Validación de promoción (el backend también la valida como defensa).
  if (form.estado_promocion) {
    const promo = parseFloat(form.precio_promocion)
    const base = parseFloat(form.precio_base)
    if (!(promo > 0)) { notif.advertencia('Para activar la promoción, define un precio de promoción mayor a 0.'); return }
    if (promo >= base) { notif.advertencia('El precio de promoción debe ser menor al precio base.'); return }
  }
  // Coherencia de precio del combo: si está muy desviado de sus componentes, pedir confirmación
  if (form.es_combo && componentesCombo.value.length && avisoPrecioCombo.value) {
    const ok = await notif.confirmar({
      variante: 'peligro',
      titulo: 'Precio del combo incoherente',
      mensaje: `${avisoPrecioCombo.value} El precio sugerido es Bs. ${precioSugerido.value.toFixed(2)}. ¿Guardar de todas formas?`,
      textoConfirmar: 'Guardar igual',
    })
    if (!ok) return
  }
  // Un combo debe incluir al menos un producto.
  if (form.es_combo && !componentesCombo.value.length) {
    notif.advertencia('Un combo debe incluir al menos un producto. Agrega sus componentes.'); return
  }
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
    // Componentes del combo (el backend los sincroniza en combo_detalle).
    if (form.es_combo) {
      formData.append('componentes', JSON.stringify(
        componentesCombo.value.map(c => ({ id_producto_hijo: c.id_producto_hijo, cantidad: c.cantidad }))
      ))
    }
    
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
    notif.exito(productoEditando.value ? 'Producto actualizado' : 'Producto creado')
    // Alerta INMEDIATA de stock bajo (sin esperar el chequeo periódico de 10 min).
    // Aplica también a combos: si el admin les gestiona stock manual, cuentan igual.
    const stockGuardado = parseInt(form.stock_actual)
    if (Number.isFinite(stockGuardado) && stockGuardado <= 30) {
      notif.advertencia(`REPONER STOCK — "${form.nombre_producto}" quedó con solo ${stockGuardado} unidad(es) (umbral: 30).`)
    }
  } catch (error) { notif.error(error.error || 'Error al guardar producto') }
}

async function alternarPromo(p) {
  // Si ya está en promo, la quitamos directo.
  if (p.estado_promocion) {
    try {
      await servicioProductos.cambiarPromo(p.id_producto)
      cargarDatos()
      notif.info(`Promoción de "${p.nombre_producto}" desactivada`)
    } catch (error) { notif.error(error.error || 'Error al cambiar promoción') }
    return
  }

  // Al activar: si no hay un precio de promo válido, pedimos el precio ahí mismo
  // (advertencia amarilla + input) en vez de bloquear con un aviso seco.
  const base = parseFloat(p.precio_base)
  const promoActual = parseFloat(p.precio_promocion)
  const promoValida = promoActual > 0 && promoActual < base

  if (!promoValida) {
    const valor = await notif.solicitar({
      variante: 'advertencia',
      titulo: 'Falta el precio de promoción',
      mensaje: `"${p.nombre_producto}" no tiene un precio de promoción. Escribe a cuánto quieres dejarlo (precio base: Bs. ${base.toFixed(2)}).`,
      etiqueta: 'Precio de promoción',
      prefijo: 'Bs.',
      tipoInput: 'number',
      placeholder: '0.00',
      textoConfirmar: 'Aplicar promoción',
      validar: (v) => {
        const n = parseFloat(v)
        if (!(n > 0)) return 'Ingresa un precio mayor a 0.'
        if (n >= base) return `Debe ser menor al precio base (Bs. ${base.toFixed(2)}).`
        return null
      },
    })
    if (valor === null) return // canceló
    try {
      // Fijamos el precio de promo y activamos, en un solo paso.
      const fd = new FormData()
      fd.append('precio_promocion', parseFloat(valor))
      fd.append('estado_promocion', 'true')
      await servicioProductos.editar(p.id_producto, fd)
      cargarDatos()
      notif.exito(`Promoción activada: Bs. ${parseFloat(valor).toFixed(2)}`)
    } catch (error) { notif.error(error.error || 'No se pudo aplicar la promoción') }
    return
  }

  // Ya tiene precio válido: solo activamos.
  try {
    await servicioProductos.cambiarPromo(p.id_producto)
    cargarDatos()
    notif.exito(`Promoción de "${p.nombre_producto}" activada`)
  } catch (error) { notif.error(error.error || 'Error al cambiar promoción') }
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
    notif.exito('Categoría creada')
  } catch (err) { notif.error('Error al crear categoría') }
}

async function eliminarCategoria(cat) {
  const ok = await notif.confirmar({
    variante: 'peligro',
    titulo: `Eliminar "${cat.nombre_categoria}"`,
    mensaje: 'Los productos de esta categoría se reasignarán a "Otro". ¿Deseas continuar?',
    textoConfirmar: 'Sí, eliminar',
  })
  if (!ok) return
  try {
    await servicioProductos.eliminarCategoria(cat.id_categoria)
    cargarDatos()
    notif.exito('Categoría eliminada')
  } catch (err) { notif.error('Error al eliminar categoría') }
}
</script>

<style scoped>
/* ---- Cabecera premium ---- */
.productos-encabezado{padding:1.4rem 1.5rem;margin-bottom:1.1rem;display:flex;flex-direction:column;gap:1.25rem}
.encabezado-fila{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap}
.vista-titulo{font-family:var(--fuente-titulo);font-size:1.7rem;font-weight:800;color:var(--texto-principal);letter-spacing:-0.025em;margin-bottom:.2rem;text-wrap:balance}
.vista-subtitulo{color:var(--texto-secundario);font-size:.9rem;letter-spacing:.005em}
.cabecera-acciones{display:flex;gap:.625rem;flex-wrap:wrap}
.btn-mas{font-size:1.05em;font-weight:700;line-height:1;margin-right:1px}

/* Métricas de un vistazo: números que importan, grandes y legibles */
.encabezado-metricas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem;margin:0;padding-top:1.1rem;border-top:1px solid var(--glass-borde)}
.metrica{display:flex;flex-direction:column-reverse;gap:.15rem;padding:.7rem .9rem;border-radius:var(--radio-md);background:rgba(168,85,247,.06);border:1px solid transparent;transition:border-color var(--trans-rapida),background-color var(--trans-rapida)}
.metrica:hover{border-color:var(--glass-borde);background:rgba(168,85,247,.1)}
.metrica-label{font-size:.68rem;color:var(--texto-secundario);text-transform:uppercase;letter-spacing:.07em;font-weight:600}
.metrica-valor{font-family:var(--fuente-titulo);font-size:1.75rem;font-weight:800;line-height:1;color:var(--texto-principal);letter-spacing:-0.02em;font-variant-numeric:tabular-nums}
.metrica-promo .metrica-valor{color:var(--rosa-suave)}
.metrica-riesgo .metrica-valor{color:var(--color-alerta)}

/* ---- Filtros ---- */
.filtros-barra{display:flex;gap:.75rem;margin-bottom:1.2rem;flex-wrap:wrap;align-items:center;padding:var(--esp-3) var(--esp-4);border-radius:var(--radio-lg)}
.campo-busqueda{position:relative;max-width:280px;width:100%}
.filtro-select{flex:0 1 180px;min-width:150px}

/* Editor de combo */
.combo-editor{margin-top:.25rem;padding:1rem;border:1px dashed var(--borde-sutil);border-radius:var(--radio-lg);background:rgba(168,85,247,.05);display:flex;flex-direction:column;gap:.6rem}
.combo-hint{font-size:.78rem;color:var(--texto-secundario);line-height:1.4;margin:0}
.combo-agregar{display:flex;gap:.5rem;align-items:center}
.combo-sel{flex:1;min-width:0}
.combo-cant{width:74px;flex-shrink:0;text-align:center}
.combo-lista{list-style:none;margin:.25rem 0 0;padding:0;display:flex;flex-direction:column;gap:.4rem}
.combo-item{display:flex;align-items:center;gap:.6rem;padding:.5rem .7rem;border-radius:var(--radio-md);background:var(--fondo-tarjeta-alt);border:1px solid var(--borde-sutil)}
/* Ingredientes del combo en la tarjeta (imagen + cantidad + nombre), igual que el mesero/cliente */
.combo-ingredientes{display:flex;flex-wrap:wrap;gap:5px;margin:.2rem 0 .35rem}
.ing-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:3px 9px 3px 3px;background:rgba(255,255,255,.05);border:1px solid var(--borde-sutil);border-radius:var(--radio-full)}
.ing-img{width:20px;height:20px;border-radius:var(--radio-full);object-fit:cover;flex-shrink:0;background:var(--fondo-tarjeta);display:inline-flex;align-items:center;justify-content:center;color:var(--morado-hover)}
.ing-ph svg{width:12px;height:12px}
.ing-txt{font-size:.72rem;font-weight:600;color:var(--texto-secundario);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.ing-txt b{color:var(--texto-principal);font-weight:800}
.combo-cant-badge{font-weight:800;font-size:.82rem;color:var(--morado-hover);font-variant-numeric:tabular-nums;flex-shrink:0}
.combo-nombre{flex:1;font-size:.86rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn-quitar-combo{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;background:none;color:var(--texto-desactivado);border-radius:var(--radio-sm);cursor:pointer;transition:color .15s ease,background-color .15s ease}
.btn-quitar-combo:hover{color:var(--color-error);background:rgba(239,68,68,.12)}
.combo-vacio{font-size:.8rem;color:var(--texto-desactivado);font-style:italic;margin:.25rem 0 0}
.combo-precio-item{flex-shrink:0;font-size:.8rem;font-weight:700;color:var(--texto-secundario);font-variant-numeric:tabular-nums}
.combo-precio-sugerido{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:.6rem;padding:.6rem .8rem;border-radius:var(--radio-md);background:rgba(168,85,247,.10);border:1px solid rgba(168,85,247,.3)}
.cps-info{display:flex;flex-direction:column;gap:2px}
.cps-linea{font-size:.8rem;color:var(--texto-secundario)}
.cps-linea strong{color:var(--texto-principal)}
.cps-destacado{color:var(--morado-hover)}
.cps-destacado strong{color:var(--color-exito);font-size:.95rem}
.combo-precio-sugerido .btn{flex-shrink:0}
.combo-aviso-precio{margin:.5rem 0 0;font-size:.8rem;font-weight:600;color:var(--color-alerta);line-height:1.4}
.icono-busqueda{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--texto-secundario);pointer-events:none;transition:color var(--trans-rapida)}
.campo-busqueda:focus-within .icono-busqueda{color:var(--morado-brillante)}
.campo-con-icono{padding-left:38px;width:100%}
.toggle-label{display:flex;align-items:center;gap:6px;color:var(--texto-secundario);font-size:.85rem;cursor:pointer;user-select:none;transition:color var(--trans-rapida)}
.toggle-label:hover{color:var(--texto-principal)}
.toggle-label input{accent-color:var(--morado-brillante);cursor:pointer}
.filtros-conteo{margin-left:auto;font-size:.78rem;font-weight:600;color:var(--texto-secundario);font-variant-numeric:tabular-nums;white-space:nowrap}

/* ---- Estado vacío ---- */
.vacio{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;color:var(--texto-desactivado);padding:3.5rem 2rem;text-align:center;width:100%;background:var(--gradiente-sutil);border:1px dashed var(--borde-sutil);border-radius:var(--radio-lg)}
.vacio-icono{color:var(--morado-brillante);opacity:.55;margin-bottom:.35rem}
.vacio-titulo{font-family:var(--fuente-titulo);font-weight:700;font-size:1rem;color:var(--texto-secundario)}
.vacio-texto{font-size:.85rem;max-width:34ch;text-wrap:pretty}

/* ---- Cuadrícula de productos ---- */
.productos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1.1rem}
.tarjeta-producto{position:relative;background:var(--gradiente-sutil);border:1px solid var(--borde-sutil);border-radius:var(--radio-lg);overflow:hidden;transition:border-color var(--trans-normal),box-shadow var(--trans-normal),transform var(--trans-normal);display:flex;flex-direction:column;box-shadow:0 6px 22px rgba(10,6,26,.45)}
.tarjeta-producto::before{content:'';position:absolute;inset:0 0 auto 0;height:2px;background:var(--gradiente-marca);opacity:0;transition:opacity var(--trans-normal);z-index:2}
.tarjeta-producto:hover{border-color:var(--borde-activo)}
.tarjeta-producto:hover::before{opacity:1}
.producto-imagen{position:relative;height:158px;background:radial-gradient(120% 120% at 50% 0%,var(--fondo-tarjeta-alt),var(--fondo-tarjeta));display:flex;align-items:center;justify-content:center;overflow:hidden}
.producto-imagen::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(14,8,33,.55));pointer-events:none}
.producto-imagen img{width:100%;height:100%;object-fit:cover;transition:transform var(--trans-lenta)}
.tarjeta-producto:hover .producto-imagen img{transform:scale(1.06)}
.imagen-placeholder{font-family:var(--fuente-titulo);font-size:1.5rem;font-weight:700;letter-spacing:.08em;color:var(--texto-desactivado);opacity:.5}
.producto-badges{position:absolute;top:9px;left:9px;right:9px;display:flex;justify-content:space-between;gap:6px;z-index:2;pointer-events:none}
.badge-combo,.badge-promo{font-size:.62rem;font-weight:700;letter-spacing:.03em;padding:3px 9px;border-radius:var(--radio-full);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.35)}
.badge-combo{background:rgba(56,189,248,.28);color:var(--color-info);border:1px solid rgba(56,189,248,.45)}
.badge-promo{margin-left:auto;background:rgba(236,72,153,.3);color:var(--rosa-suave);border:1px solid rgba(236,72,153,.5)}
.producto-info{padding:.9rem;flex:1;display:flex;flex-direction:column;gap:.15rem}
.producto-categoria{font-size:.68rem;color:var(--morado-hover);text-transform:uppercase;letter-spacing:.07em;font-weight:700}
.producto-nombre{font-family:var(--fuente-titulo);font-weight:700;font-size:1rem;margin-bottom:.2rem;line-height:1.25;letter-spacing:-0.01em;color:var(--texto-principal);text-wrap:pretty}
.producto-pie{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:.5rem;padding-top:.55rem}
.producto-precios{display:flex;flex-direction:column;gap:1px;font-variant-numeric:tabular-nums}
.precio-base-tachado{text-decoration:line-through;color:var(--texto-desactivado);font-size:.75rem}
.precio-actual{font-family:var(--fuente-titulo);font-weight:800;font-size:1.35rem;color:var(--texto-principal);letter-spacing:-0.02em;line-height:1;display:inline-flex;align-items:baseline;gap:.2rem}
.precio-moneda{font-size:.72rem;font-weight:600;color:var(--texto-secundario);letter-spacing:0}
.producto-stock{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;color:var(--texto-secundario);font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.stock-punto{width:6px;height:6px;border-radius:50%;background:var(--color-exito);box-shadow:0 0 7px rgba(34,197,94,.6);flex:0 0 auto}
.stock-bajo{color:var(--color-alerta)}
.stock-bajo .stock-punto{background:var(--color-alerta);box-shadow:0 0 7px rgba(245,158,11,.65)}
.producto-acciones{display:flex;flex-wrap:wrap;gap:6px;padding:.75rem;border-top:1px solid var(--borde-sutil);margin-top:auto}
.producto-acciones .btn{flex:1;justify-content:center}
.producto-acciones .btn-icono-sm{flex:0 0 auto;padding:6px 9px}
.hist-btn-txt{display:none}

/* ── Modal Historial de precios ── */
.hist-cuerpo{padding:1.25rem 1.5rem 1.5rem;display:flex;flex-direction:column;gap:.5rem}
.hist-subtitulo{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--texto-secundario);margin:.5rem 0 .4rem}
.hist-vacio{color:var(--texto-secundario);font-size:.88rem;padding:.4rem 0}
.hist-barras{display:flex;flex-direction:column;gap:8px}
.hist-barra-fila{display:grid;grid-template-columns:86px 1fr auto;gap:10px;align-items:center}
.hist-precio{font-weight:700;font-size:.88rem;white-space:nowrap}
.hist-barra{height:12px;border-radius:var(--radio-full);background:rgba(168,85,247,.10);overflow:hidden}
.hist-barra-relleno{height:100%;border-radius:inherit;background:var(--gradiente-marca)}
.hist-barra-info{font-size:.76rem;color:var(--texto-secundario);white-space:nowrap}
.hist-linea{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.hist-linea li{position:relative;padding:.55rem 0 .55rem 20px;border-left:2px solid var(--borde-sutil);margin-left:6px}
.hist-linea li::before{content:'';position:absolute;left:-6px;top:16px;width:10px;height:10px;border-radius:50%;background:var(--morado-brillante);box-shadow:0 0 8px rgba(168,85,247,.5)}
.hist-fila-precio{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.hist-cambio{display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:.92rem}
.hist-cambio.sube{color:var(--color-exito)}
.hist-cambio.baja{color:var(--color-error)}
.hist-badge{font-size:.68rem;font-weight:600;letter-spacing:.04em;padding:2px 8px;border-radius:var(--radio-full);background:rgba(168,85,247,.14);border:1px solid rgba(168,85,247,.3)}
.hist-badge.origen-combo_ia{background:rgba(236,72,153,.12);border-color:rgba(236,72,153,.35)}
.hist-badge.origen-promo_activada,.hist-badge.origen-tipo-promo{background:rgba(245,196,66,.10);border-color:rgba(245,196,66,.35)}
.hist-badge.origen-registro_inicial{opacity:.7}
.hist-fila-meta{font-size:.76rem;color:var(--texto-secundario);margin-top:2px}
@media (max-width:560px){.hist-barra-fila{grid-template-columns:74px 1fr}.hist-barra-info{grid-column:1/-1;margin-top:-2px}}
.btn-alerta{background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.35);color:var(--color-alerta);transition:var(--trans-rapida)}
.btn-alerta:hover{background:rgba(245,158,11,.24);border-color:rgba(245,158,11,.55)}
.btn-alerta:active{transform:translateY(1px)}
.modal-fondo{position:fixed;inset:0;background:rgba(6,3,16,.68);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:100;padding:1rem}
.modal{background:var(--gradiente-sutil);border:1px solid var(--borde-activo);border-radius:var(--radio-xl);width:100%;max-width:520px;box-shadow:var(--sombra-modal),0 0 0 1px rgba(168,85,247,.12),0 0 40px rgba(168,85,247,.18);max-height:90vh;overflow-y:auto}
.modal-cabecera{display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;border-bottom:1px solid var(--borde-sutil);position:sticky;top:0;background:var(--fondo-tarjeta);z-index:1}
.modal-cabecera h3{font-family:var(--fuente-titulo);font-size:1.15rem;font-weight:700;letter-spacing:-0.01em}
.btn-x{background:none;border:none;color:var(--texto-secundario);font-size:1.1rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:6px;border-radius:var(--radio-md);transition:var(--trans-rapida)}
.btn-x:hover{color:var(--color-error);background:rgba(239,68,68,.12)}
.btn-x:active{transform:scale(.92)}
.modal-form{padding:1.5rem;display:flex;flex-direction:column;gap:1rem}
.form-fila{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.grupo-campo{display:flex;flex-direction:column;gap:6px}
.etiqueta{font-size:.8rem;color:var(--texto-secundario);font-weight:500;letter-spacing:.01em}
.toggles-fila{display:flex;gap:1.5rem;flex-wrap:wrap;padding:.25rem 0}
.modal-footer{display:flex;justify-content:flex-end;gap:.75rem;padding-top:1rem;border-top:1px solid var(--borde-sutil);margin-top:.1rem}
.modal-footer .btn{min-width:118px;justify-content:center;padding-top:11px;padding-bottom:11px}

/* Cabecera con icono + subtítulo */
.mc-titulo{display:flex;align-items:center;gap:12px;min-width:0}
.mc-icono{flex-shrink:0;display:grid;place-items:center;width:40px;height:40px;border-radius:var(--radio-md);color:#fff;background:var(--gradiente-marca);box-shadow:0 4px 14px rgba(168,85,247,.35)}
.mc-textos{min-width:0}
.mc-sub{margin:2px 0 0;font-size:.78rem;color:var(--texto-secundario);font-weight:400;line-height:1.2}

/* Secciones del formulario */
.form-seccion{display:flex;flex-direction:column;gap:.8rem;padding:1rem 1.05rem 1.1rem;border:1px solid var(--borde-sutil);border-radius:var(--radio-lg);background:rgba(255,255,255,.018)}
.seccion-titulo{display:flex;align-items:center;gap:7px;margin:0 0 .1rem;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--morado-hover)}
.seccion-titulo svg{opacity:.9}

/* Campos con adorno (Bs. / u.) */
.campo-adorno{position:relative;display:flex;align-items:center}
.campo-adorno .campo{width:100%}
.adorno{position:absolute;top:50%;transform:translateY(-50%);left:14px;font-size:.85rem;font-weight:600;color:var(--texto-desactivado);pointer-events:none;font-variant-numeric:tabular-nums}
.adorno--der{left:auto;right:14px}
.campo--prefijo{padding-left:44px}
.campo--sufijo{padding-right:34px}

/* Switches modernos (reemplazan los checkboxes) */
.switches-fila{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
.switch-row{display:flex;align-items:center;gap:.65rem;padding:.65rem .75rem;border:1px solid var(--borde-sutil);border-radius:var(--radio-md);background:var(--fondo-tarjeta-alt);cursor:pointer;user-select:none;transition:border-color var(--trans-rapida),background var(--trans-rapida)}
.switch-row:hover{border-color:var(--borde-activo)}
.switch-row:has(input:checked){border-color:var(--morado-brillante);background:rgba(168,85,247,.09)}
.switch{position:relative;flex-shrink:0;width:40px;height:22px}
.switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}
.switch-track{position:absolute;inset:0;border-radius:var(--radio-full);background:rgba(255,255,255,.14);transition:background var(--trans-rapida)}
.switch-thumb{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:var(--radio-full);background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.45);transition:transform .22s cubic-bezier(.34,1.56,.64,1)}
.switch input:checked+.switch-track{background:var(--gradiente-marca)}
.switch input:checked+.switch-track .switch-thumb{transform:translateX(18px)}
.switch input:focus-visible+.switch-track{box-shadow:0 0 0 3px var(--rosa-suave)}
.switch-info{display:flex;flex-direction:column;gap:1px;line-height:1.15;min-width:0}
.switch-txt{font-size:.85rem;font-weight:600;color:var(--texto-principal)}
.switch-desc{font-size:.7rem;color:var(--texto-desactivado)}
@media(max-width:480px){.switches-fila{grid-template-columns:1fr}}

/* Dropzone de imagen: arrastrar-y-soltar + clic */
.dropzone{
  position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:5px;min-height:150px;padding:1.1rem;text-align:center;cursor:pointer;overflow:hidden;
  border:1.5px dashed var(--borde-sutil);border-radius:var(--radio-lg);
  background:var(--fondo-tarjeta-alt);
  transition:border-color var(--trans-rapida),background var(--trans-rapida),box-shadow var(--trans-rapida),transform var(--trans-rapida);
}
.dropzone:hover{border-color:var(--morado-brillante);background:var(--fondo-tarjeta)}
.dropzone:focus-visible{outline:none;border-color:var(--morado-brillante);box-shadow:0 0 0 3px var(--rosa-suave)}
.dropzone--arrastrando{
  border-color:var(--morado-brillante);border-style:solid;background:var(--fondo-tarjeta);
  box-shadow:0 0 0 3px var(--rosa-suave);transform:scale(1.01);
}
.dropzone--lleno{border-style:solid;padding:0;background:#000}
.dropzone-input{display:none}

.dropzone-icono{
  display:grid;place-items:center;width:52px;height:52px;border-radius:var(--radio-full);
  color:var(--morado-brillante);background:var(--gradiente-sutil);
  transition:transform var(--trans-normal);
}
.dropzone:hover .dropzone-icono{transform:translateY(-2px)}
.dropzone--arrastrando .dropzone-icono{transform:translateY(-3px) scale(1.06)}
.dropzone-titulo{margin:2px 0 0;font-size:.92rem;font-weight:600;color:var(--texto-principal)}
.dropzone-sub{margin:0;font-size:.82rem;color:var(--texto-secundario)}
.dropzone-link{color:var(--morado-brillante);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.dropzone-formatos{margin:4px 0 0;font-size:.72rem;color:var(--texto-desactivado);letter-spacing:.02em}

/* Con imagen cargada: preview a pantalla completa del dropzone + velo al hover */
.dropzone-preview{width:100%;height:220px;object-fit:contain;display:block;background:
  repeating-conic-gradient(var(--fondo-tarjeta-alt) 0% 25%, var(--fondo-tarjeta) 0% 50%) 50%/22px 22px}
.dropzone-velo{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(0deg,rgba(14,8,33,.55),rgba(14,8,33,.25));
  opacity:0;transition:opacity var(--trans-rapida);
}
.dropzone--lleno:hover .dropzone-velo,.dropzone--arrastrando .dropzone-velo{opacity:1}
.dropzone-cambiar{
  display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:var(--radio-full);
  font-size:.85rem;font-weight:600;color:#fff;background:var(--gradiente-marca);
  box-shadow:var(--sombra-modal);
}
.dropzone-quitar{
  position:absolute;top:9px;right:9px;z-index:2;display:grid;place-items:center;
  width:30px;height:30px;border:none;border-radius:var(--radio-full);cursor:pointer;
  color:#fff;background:rgba(14,8,33,.6);backdrop-filter:blur(4px);
  transition:background var(--trans-rapida),transform var(--trans-rapida);
}
.dropzone-quitar:hover{background:var(--color-error);transform:scale(1.08)}
.dropzone-nombre{
  position:absolute;left:9px;bottom:9px;max-width:calc(100% - 54px);z-index:2;
  padding:4px 10px;border-radius:var(--radio-full);font-size:.72rem;color:#fff;
  background:rgba(14,8,33,.6);backdrop-filter:blur(4px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.dropzone-error{margin:2px 0 0;font-size:.78rem;color:var(--color-error);font-weight:500}

/* Gestión de categorías */
.categorias-cuerpo{padding:1.5rem}
.categorias-alta{display:flex;gap:10px;margin-bottom:1rem}
.categorias-lista{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.categoria-item{display:flex;justify-content:space-between;align-items:center;background:var(--fondo-tarjeta-alt);padding:9px 12px;border-radius:var(--radio-md);border:1px solid transparent;transition:border-color var(--trans-rapida)}
.categoria-item:hover{border-color:var(--borde-sutil)}
.categoria-nombre{font-size:.9rem}

/* Tablet: 481-1024px */
@media(max-width:1024px){
  .productos-grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
  .producto-imagen img{max-width:100%}
}

/* Tablet estrecha / móvil grande: métricas a 2 columnas */
@media(max-width:640px){
  .encabezado-metricas{grid-template-columns:repeat(2,minmax(0,1fr))}
  .filtros-conteo{margin-left:0;width:100%}
}

/* Celular: <=480px */
@media(max-width:480px){
  .productos-encabezado{padding:1.1rem}
  .encabezado-fila{flex-direction:column;align-items:stretch}
  .cabecera-acciones{flex-wrap:wrap}
  .cabecera-acciones .btn{flex:1}
  .filtros-barra .campo{max-width:100%!important;width:100%}
  .filtro-select{flex:1 1 100%;min-width:0}
  /* Colapso a 1 columna en móvil */
  .productos-grid{grid-template-columns:1fr;gap:.85rem}
  .producto-imagen{height:150px}
  /* En tarjetas angostas los botones se apilan y ocupan todo el ancho */
  .producto-acciones{flex-direction:column;gap:8px;padding:.6rem}
  .producto-acciones .btn{width:100%;justify-content:center}
  /* Apilado en celular, el botón de historial muestra su etiqueta (no solo el reloj) */
  .hist-btn-txt{display:inline;margin-left:6px}
  .modal-fondo{padding:.5rem}
  .modal-cabecera{padding:1rem}
  .modal-form{padding:1rem}
  .form-fila{grid-template-columns:1fr}
  .modal-footer{flex-direction:column-reverse}
  .modal-footer .btn{width:100%}
}

@media(prefers-reduced-motion:reduce){
  .producto-imagen img,
  .tarjeta-producto:hover .producto-imagen img{transition:none;transform:none}
}
</style>
