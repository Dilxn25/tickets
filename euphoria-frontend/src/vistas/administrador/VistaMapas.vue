<template>
  <div class="vista-mapas fade-in">
    <header class="mapas-encabezado superficie">
      <div class="encabezado-fila">
        <div class="encabezado-texto">
          <h2 class="vista-titulo">Planos</h2>
          <p class="vista-subtitulo">Arma el plano del local: arrastra mesas, sillas, barra y escenario sobre el lienzo.</p>
        </div>
        <div class="cabecera-acciones">
          <template v-if="modo === 'galeria'">
            <button class="btn btn-primario brillo-hover" @click="nuevoPlano">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="btn-icono"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nuevo plano
            </button>
          </template>
          <template v-else>
            <button class="btn btn-secundario" @click="volverGaleria">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="btn-icono"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Volver
            </button>
            <button class="btn btn-secundario" :disabled="!planoSelId" @click="duplicarPlanoActual">Duplicar</button>
            <button class="btn btn-peligro" :disabled="!planoSelId" @click="eliminarPlanoActual">Eliminar</button>
            <button class="btn btn-primario brillo-hover" :disabled="guardando" @click="guardarPlano">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" class="btn-icono"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path></svg>
              {{ guardando ? 'Guardando...' : 'Guardar plano' }}
            </button>
          </template>
        </div>
      </div>
    </header>

    <!-- GALERÍA: todos los planos como tarjetas con miniatura -->
    <div v-if="modo === 'galeria'">
      <div v-if="!planos.length" class="estado-vacio-mapa">
        <div class="vacio-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="34" height="34"><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"></path><path d="M9 3v15M15 6v15"></path></svg>
        </div>
        <p class="vacio-titulo">Aún no tienes planos</p>
        <p class="vacio-texto">Crea tu primer plano del local con "Nuevo plano".</p>
      </div>
      <div v-else class="galeria-planos escalonar">
        <article v-for="p in planos" :key="p.id_plantilla" class="plano-card hover-elevar" @click="editarPlano(p)">
          <div class="plano-thumb" :style="{ aspectRatio: String(p.proporcion || 1.6) }">
            <div v-for="(el, i) in (p.elementos || [])" :key="i" class="thumb-el" :class="'tipo-' + el.tipo_elemento" :style="estiloElemento(el)"></div>
            <div v-if="!(p.elementos || []).length" class="thumb-vacio">Plano vacío</div>
          </div>
          <div class="plano-card-cuerpo">
            <h3 class="plano-card-nom">{{ p.nombre }}</h3>
            <p class="plano-card-meta">{{ resumenPlano(p) }}</p>
          </div>
          <div class="plano-card-acciones" @click.stop>
            <button class="btn btn-sm btn-primario" @click="editarPlano(p)">Editar</button>
            <button class="btn btn-sm btn-secundario" @click="duplicarPlano(p)">Duplicar</button>
            <button class="btn btn-sm btn-peligro" @click="eliminarPlano(p)">Eliminar</button>
          </div>
        </article>
      </div>
    </div>

    <!-- EDITOR: barra (forma + aforo) -->
    <section v-if="modo === 'editor'" class="barra-mapa superficie">
      <div class="campo-selector">
        <label>Nombre</label>
        <div class="plano-nombre-chip">{{ planoActual.nombre || 'Plano nuevo (sin guardar)' }}</div>
      </div>
      <div class="campo-selector">
        <label>Forma del plano</label>
        <BaseSelect v-model="planoProporcion" :options="OPCIONES_PROPORCION" @update:model-value="cambiarProporcion" />
      </div>
      <div class="panel-aforo">
        <div class="aforo-fila">
          <span class="aforo-titulo">Aforo del plano</span>
          <span class="aforo-valor">{{ totalSillas }} <span class="aforo-sep">personas</span></span>
        </div>
        <span class="aforo-pie">Suma de la capacidad de mesas y sillas. Los precios se definen al asignar el plano a un evento.</span>
      </div>
    </section>

    <div v-if="modo === 'editor'" class="editor-grid">
      <!-- Barra de herramientas -->
      <div class="herramientas superficie escalonar">
        <span class="herramientas-titulo">Agregar</span>
        <button class="btn-herramienta" @click="agregarElemento('mesa')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"></circle></svg>
          Mesa
        </button>
        <button class="btn-herramienta" @click="agregarElemento('silla')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>
          Silla
        </button>
        <button class="btn-herramienta" @click="agregarElemento('barra')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="9" width="18" height="6" rx="2"></rect></svg>
          Barra
        </button>
        <button class="btn-herramienta" @click="agregarElemento('escenario')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20M4 20v-6l8-4 8 4v6"></path></svg>
          Escenario
        </button>
        <button class="btn-herramienta" @click="agregarElemento('pared')">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="10" width="18" height="5" rx="1"></rect></svg>
          Pared
        </button>
        <button class="btn-herramienta" @click="agregarElemento('area')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
          Área
        </button>
      </div>

      <!-- Lienzo -->
      <div class="lienzo-contenedor">
        <div ref="lienzo" class="lienzo" :style="{ aspectRatio: String(planoProporcion) }" @pointerdown="clicVacio">
          <div
            v-for="(el, idx) in elementos"
            :key="el._id"
            class="elemento"
            :class="['tipo-' + el.tipo_elemento, { seleccionado: idx === seleccionado }]"
            :style="estiloElemento(el)"
            @pointerdown.stop="iniciarArrastre($event, idx)"
          >
            <span class="elemento-etiqueta">{{ el.numero_nombre || tipoLabel(el.tipo_elemento) }}</span>
            <span v-if="el.tipo_elemento === 'mesa'" class="elemento-cap">{{ el.capacidad_sillas }}p</span>
            <div v-if="idx === seleccionado" class="manija-resize" @pointerdown.stop="iniciarResize($event, idx)" title="Estirar"></div>
          </div>
          <div v-if="elementos.length === 0" class="lienzo-vacio">Arrastra elementos desde la barra "Agregar"</div>
        </div>
      </div>

      <!-- Panel de propiedades -->
      <div class="propiedades superficie">
        <template v-if="elSel">
          <div class="propiedades-cab">
            <span class="propiedades-titulo">{{ tipoLabel(elSel.tipo_elemento) }}</span>
            <span class="propiedades-chip">Editando</span>
          </div>
          <label class="prop-campo">
            <span>Nombre / número</span>
            <input v-model="elSel.numero_nombre" class="campo" :placeholder="elSel.tipo_elemento === 'mesa' ? 'Ej. M1' : 'Opcional'" />
          </label>

          <div class="prop-fila">
            <label class="prop-campo"><span>Ancho (%)</span><input v-model.number="elSel.ancho" @input="alCambiarTam" type="number" min="1" max="100" step="0.5" class="campo" /></label>
            <label class="prop-campo"><span>Alto (%)</span><input v-model.number="elSel.alto" @input="alCambiarTam" type="number" min="1" max="100" step="0.5" class="campo" /></label>
          </div>
          <div class="prop-fila">
            <label class="prop-campo" style="flex: 2;">
              <span>Rotación</span>
              <input v-model.number="elSel.rotacion" @input="clampSeleccionado" type="range" min="0" max="360" step="5" class="rango" />
            </label>
            <label class="prop-campo" style="flex: 1;">
              <span>Grados</span>
              <input v-model.number="elSel.rotacion" @input="clampSeleccionado" type="number" min="0" max="360" class="campo" />
            </label>
          </div>

          <label class="prop-campo" v-if="permiteForma(elSel.tipo_elemento)">
            <span>Forma</span>
            <BaseSelect v-model="elSel.forma" :options="OPCIONES_FORMA" />
          </label>

          <label class="prop-campo" v-if="cuentaAforo(elSel.tipo_elemento)">
            <span>Capacidad (personas)</span>
            <input v-model.number="elSel.capacidad_sillas" type="number" min="0" class="campo" />
          </label>

          <label class="prop-campo" v-if="permitePrecio(elSel.tipo_elemento)">
            <span>Precio (Bs.)</span>
            <input v-model.number="elSel.precio" type="number" min="0" step="0.01" class="campo" placeholder="Ej. 800 (Lounge), 1500 (VIP)…" />
          </label>

          <template v-if="elSel.tipo_elemento === 'mesa'">
            <label class="prop-check">
              <input type="checkbox" v-model="elSel.es_seleccionable" />
              <span>Reservable por el cliente</span>
            </label>
          </template>

          <button class="btn btn-peligro btn-full" @click="eliminarSeleccionado">Eliminar elemento</button>
        </template>
        <template v-else>
          <p class="prop-vacio">Toca un elemento del mapa para editar sus propiedades.</p>
          <p class="prop-ayuda">Las áreas son recuadros con nombre y precio (Lounge, VIP, Campo…) para marcar y cotizar secciones. Mesas y sillas suman aforo y llevan su precio. Barra, escenario y paredes son decorativos.</p>
        </template>
      </div>
    </div>

    <!-- Modal guardar plano nuevo -->
    <Teleport to="body">
      <div v-if="modalGuardarPlantilla" class="modal-fondo" @click.self="modalGuardarPlantilla = false">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>Guardar plano nuevo</h3>
            <button class="btn-x" @click="modalGuardarPlantilla = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="modal-form">
            <label class="prop-campo"><span>Nombre del plano</span><input v-model="formPlantilla.nombre" class="campo" placeholder="Ej. Local principal" /></label>
            <label class="prop-campo"><span>Descripción (opcional)</span><input v-model="formPlantilla.descripcion" class="campo" /></label>
            <div class="modal-footer">
              <button class="btn btn-secundario" @click="modalGuardarPlantilla = false">Cancelar</button>
              <button class="btn btn-primario" @click="guardarPlantilla">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()

// Estado del editor de planos (independiente de eventos).
const modo = ref('galeria')            // 'galeria' | 'editor'
const planos = ref([])                 // lista con miniatura (elementos + proporcion)
const planoSelId = ref(null)           // plano en edición (null = nuevo)
const modoNuevo = ref(false)
const planoActual = ref({ nombre: '', descripcion: '' })
const OPCIONES_PROPORCION = [
  { value: 1.6, label: 'Horizontal' },
  { value: 2, label: 'Panorámico (ancho)' },
  { value: 1, label: 'Cuadrado' },
  { value: 0.75, label: 'Vertical (alto)' },
]
const OPCIONES_FORMA = [
  { value: 'redondo', label: 'Redondo' },
  { value: 'cuadrado', label: 'Cuadrado' },
]
const elementos = ref([])
const seleccionado = ref(null)
const guardando = ref(false)
// Proporción (ancho/alto) del plano. 1.6 = horizontal por defecto.
const planoProporcion = ref(1.6)

const modalGuardarPlantilla = ref(false)
const formPlantilla = ref({ nombre: '', descripcion: '' })

const lienzo = ref(null)
let contadorLocal = 0

const elSel = computed(() => seleccionado.value != null ? elementos.value[seleccionado.value] : null)
const totalSillas = computed(() => elementos.value.reduce((a, e) => a + (Number(e.capacidad_sillas) || 0), 0))

function tipoLabel(t) {
  return ({ mesa: 'Mesa', silla: 'Silla', barra: 'Barra', escenario: 'Escenario', pared: 'Pared', area: 'Área / Zona' })[t] || t
}

// Qué elementos suman aforo (personas). Barra, escenario y pared son decorativos.
function cuentaAforo(t) { return t === 'mesa' || t === 'silla' }
// Qué elementos pueden llevar precio (secciones cotizables): mesas, sillas y áreas.
function permitePrecio(t) { return t === 'mesa' || t === 'silla' || t === 'area' }

async function cargarPlanos() {
  try { planos.value = await clienteHttp.get('/espacios/plantillas') } catch { planos.value = [] }
}

// Resumen corto para la tarjeta de la galería.
function resumenPlano(p) {
  const els = p.elementos || []
  const mesas = els.filter(e => e.tipo_elemento === 'mesa').length
  const aforo = els.filter(e => e.tipo_elemento === 'mesa' || e.tipo_elemento === 'silla')
    .reduce((a, e) => a + (Number(e.capacidad_sillas) || 0), 0)
  return `${mesas} mesa${mesas === 1 ? '' : 's'} · aforo ${aforo}`
}

// Abre un plano de la galería en el editor.
function editarPlano(p) {
  planoSelId.value = p.id_plantilla
  planoActual.value = { nombre: p.nombre, descripcion: p.descripcion || '' }
  planoProporcion.value = Number(p.proporcion) || 1.6
  elementos.value = (p.elementos || []).map(normalizar)
  seleccionado.value = null
  modoNuevo.value = false
  modo.value = 'editor'
}

// Empieza un plano nuevo en blanco.
function nuevoPlano() {
  planoSelId.value = null
  modoNuevo.value = true
  planoActual.value = { nombre: '', descripcion: '' }
  seleccionado.value = null
  elementos.value = []
  planoProporcion.value = 1.6
  modo.value = 'editor'
}

// Vuelve a la galería y refresca la lista.
async function volverGaleria() {
  modo.value = 'galeria'
  await cargarPlanos()
}

// Al cambiar la forma del plano, reacomoda todo para que nada quede fuera.
function cambiarProporcion() {
  elementos.value.forEach(clampPosicion)
}

// Los mapas guardados pueden traer ancho/alto/rotacion en null (datos previos).
// Rellenamos con el tamaño por defecto del tipo para que el panel nunca muestre campos vacíos.
function normalizar(e) {
  const t = TAM_DEFECTO[e.tipo_elemento] || { ancho: 8, alto: 10 }
  return {
    ...e,
    ancho: e.ancho != null ? Number(e.ancho) : t.ancho,
    alto: e.alto != null ? Number(e.alto) : t.alto,
    rotacion: e.rotacion != null ? Number(e.rotacion) : 0,
    capacidad_sillas: Number(e.capacidad_sillas) || 0,
    forma: e.forma || FORMA_DEFECTO[e.tipo_elemento] || null,
    _id: ++contadorLocal,
  }
}

const TAM_DEFECTO = { mesa: { ancho: 7, alto: 10 }, silla: { ancho: 4, alto: 6 }, barra: { ancho: 22, alto: 7 }, escenario: { ancho: 30, alto: 14 }, pared: { ancho: 24, alto: 3 }, area: { ancho: 42, alto: 45 } }
const CAP_DEFECTO = { mesa: 8, silla: 1 }
// Forma por defecto de cada tipo (redondo o cuadrado). Pared y área no usan forma.
const FORMA_DEFECTO = { mesa: 'redondo', silla: 'cuadrado', barra: 'cuadrado', escenario: 'cuadrado' }
function permiteForma(t) { return t === 'mesa' || t === 'silla' || t === 'barra' || t === 'escenario' }

// Tamaño recordado por tipo: los nuevos elementos usan el último tamaño de su tipo.
const tamPorTipo = ref(JSON.parse(JSON.stringify(TAM_DEFECTO)))
function recordarTam(el) {
  if (!el || !el.tipo_elemento) return
  tamPorTipo.value[el.tipo_elemento] = { ancho: el.ancho, alto: el.alto }
}

// Restricción: nada puede salir del plano, considerando la rotación.
// OJO: ancho está en % del ANCHO del plano y alto en % del ALTO. Como el plano no
// es cuadrado, al rotar hay que convertir entre ejes con R = proporción (ancho/alto).
function bboxMitades(ancho, alto, rot, r) {
  const rad = ((rot || 0) * Math.PI) / 180
  const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad))
  const w = ancho || 6, h = alto || 8
  const R = r || 1
  return { hw: (w * c + (h / R) * s) / 2, hh: (w * R * s + h * c) / 2 }
}
function clampPosicion(el) {
  const { hw, hh } = bboxMitades(el.ancho, el.alto, el.rotacion, planoProporcion.value)
  let cx = (el.posicion_x || 0) + (el.ancho || 6) / 2
  let cy = (el.posicion_y || 0) + (el.alto || 8) / 2
  cx = hw * 2 >= 100 ? 50 : Math.max(hw, Math.min(100 - hw, cx))
  cy = hh * 2 >= 100 ? 50 : Math.max(hh, Math.min(100 - hh, cy))
  el.posicion_x = Math.round((cx - (el.ancho || 6) / 2) * 10) / 10
  el.posicion_y = Math.round((cy - (el.alto || 8) / 2) * 10) / 10
}
function clampSeleccionado() { if (elSel.value) clampPosicion(elSel.value) }
function alCambiarTam() { if (elSel.value) { recordarTam(elSel.value); clampPosicion(elSel.value) } }

function agregarElemento(tipo) {
  // Usa el último tamaño elegido para ese tipo (comodidad), o el de defecto.
  const t = tamPorTipo.value[tipo] || TAM_DEFECTO[tipo] || { ancho: 8, alto: 10 }
  // Coloca en una cuadrícula segun el tamaño del elemento para que los nuevos
  // NO se solapen entre si (antes usaba un offset fijo de 6% menor al ancho de
  // una mesa, por lo que se apilaban casi encima). Cuenta solo los del mismo
  // tipo para que cada tipo tenga su propia rejilla ordenada.
  const nTipo = elementos.value.filter(e => e.tipo_elemento === tipo).length
  const pasoX = Math.max(6, t.ancho + 3)
  const pasoY = Math.max(6, t.alto + 3)
  const porFila = Math.max(1, Math.floor((100 - 6) / pasoX))
  const filas = Math.max(1, Math.floor((100 - 12) / pasoY))
  const col = nTipo % porFila
  const fila = Math.floor(nTipo / porFila) % filas
  const x = 4 + col * pasoX
  const y = 10 + fila * pasoY
  const nuevo = {
    _id: ++contadorLocal,
    tipo_elemento: tipo,
    numero_nombre: tipo === 'mesa'
      ? 'M' + (elementos.value.filter(e => e.tipo_elemento === 'mesa').length + 1)
      : (tipo === 'area' ? 'Zona' : ''),
    posicion_x: x, posicion_y: y,
    ancho: t.ancho, alto: t.alto, rotacion: 0,
    capacidad_sillas: CAP_DEFECTO[tipo] || 0,
    precio: null,
    es_seleccionable: tipo === 'mesa',
    forma: FORMA_DEFECTO[tipo] || null,
  }
  clampPosicion(nuevo)
  elementos.value.push(nuevo)
  seleccionado.value = elementos.value.length - 1
}

// ---- Arrastre (drag) ----
let arrastrando = null
function iniciarArrastre(e, idx) {
  seleccionado.value = idx
  const rect = lienzo.value.getBoundingClientRect()
  arrastrando = { idx, rect }
  window.addEventListener('pointermove', moverArrastre)
  window.addEventListener('pointerup', finArrastre)
}
function moverArrastre(e) {
  if (!arrastrando) return
  const { idx, rect } = arrastrando
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  const el = elementos.value[idx]
  // El puntero mueve el centro; luego clampPosicion lo mantiene dentro del plano.
  el.posicion_x = x - (el.ancho || 6) / 2
  el.posicion_y = y - (el.alto || 8) / 2
  clampPosicion(el)
}
function finArrastre() {
  arrastrando = null
  window.removeEventListener('pointermove', moverArrastre)
  window.removeEventListener('pointerup', finArrastre)
}

// ---- Redimensionar (estirar) ----
let redimensionando = null
function iniciarResize(e, idx) {
  seleccionado.value = idx
  const rect = lienzo.value.getBoundingClientRect()
  redimensionando = { idx, rect }
  window.addEventListener('pointermove', moverResize)
  window.addEventListener('pointerup', finResize)
}
function moverResize(e) {
  if (!redimensionando) return
  const { idx, rect } = redimensionando
  const el = elementos.value[idx]
  const w = ((e.clientX - rect.left) / rect.width) * 100 - el.posicion_x
  const h = ((e.clientY - rect.top) / rect.height) * 100 - el.posicion_y
  el.ancho = Math.round(Math.max(2, Math.min(100, w)) * 10) / 10
  el.alto = Math.round(Math.max(2, Math.min(100, h)) * 10) / 10
  clampPosicion(el)
}
function finResize() {
  if (redimensionando) {
    const el = elementos.value[redimensionando.idx]
    if (el) recordarTam(el) // recuerda este tamaño para los próximos del mismo tipo
  }
  redimensionando = null
  window.removeEventListener('pointermove', moverResize)
  window.removeEventListener('pointerup', finResize)
}

function clicVacio() { seleccionado.value = null }

function eliminarSeleccionado() {
  if (seleccionado.value == null) return
  elementos.value.splice(seleccionado.value, 1)
  seleccionado.value = null
}

function estiloElemento(el) {
  const estilo = {
    left: el.posicion_x + '%',
    top: el.posicion_y + '%',
    width: (el.ancho || 7) + '%',
    height: (el.alto || 10) + '%',
    transform: el.rotacion ? `rotate(${el.rotacion}deg)` : 'none',
  }
  // La forma (redondo/cuadrado) manda sobre el borde por defecto del tipo.
  if (el.forma) estilo.borderRadius = el.forma === 'redondo' ? '50%' : '8px'
  return estilo
}

// Serializa los elementos del plano (layout + precio por elemento/área).
function elementosParaGuardar() {
  return elementos.value.map(e => ({
    tipo_elemento: e.tipo_elemento,
    numero_nombre: e.numero_nombre,
    posicion_x: e.posicion_x, posicion_y: e.posicion_y,
    ancho: e.ancho, alto: e.alto, rotacion: e.rotacion,
    capacidad_sillas: e.capacidad_sillas,
    precio: (e.precio === '' || e.precio == null) ? null : Number(e.precio),
    es_seleccionable: e.es_seleccionable,
    forma: e.forma || null,
  }))
}

async function guardarPlano() {
  // Plano nuevo: pedimos nombre antes de crearlo.
  if (planoSelId.value == null) { abrirGuardarPlantilla(); return }
  guardando.value = true
  try {
    await clienteHttp.put(`/espacios/plantillas/${planoSelId.value}`, {
      proporcion: planoProporcion.value,
      elementos: elementosParaGuardar(),
    })
    notif.exito('Plano guardado')
  } catch (e) {
    notif.error(e.error || 'Error al guardar el plano')
  } finally {
    guardando.value = false
  }
}

function abrirGuardarPlantilla() {
  formPlantilla.value = { nombre: '', descripcion: '' }
  modalGuardarPlantilla.value = true
}
async function guardarPlantilla() {
  if (!formPlantilla.value.nombre) { notif.advertencia('Escribe un nombre para el plano.'); return }
  try {
    const res = await clienteHttp.post('/espacios/plantillas', {
      nombre: formPlantilla.value.nombre,
      descripcion: formPlantilla.value.descripcion,
      proporcion: planoProporcion.value,
      elementos: elementosParaGuardar(),
    })
    modalGuardarPlantilla.value = false
    // Deja el plano recién creado como el activo en el editor.
    planoActual.value = { nombre: formPlantilla.value.nombre, descripcion: formPlantilla.value.descripcion }
    planoSelId.value = res.id_plantilla
    modoNuevo.value = false
    await cargarPlanos()
    notif.exito('Plano guardado')
  } catch (e) { notif.error(e.error || 'Error al guardar el plano') }
}

// Duplicar / eliminar un plano cualquiera (desde la galería o el editor).
async function duplicarPlano(p) {
  const base = p?.nombre || 'Plano'
  const nombre = await notif.solicitar({
    variante: 'normal',
    titulo: 'Duplicar plano',
    mensaje: `Se creará una copia de "${base}" con el mismo diseño.`,
    etiqueta: 'Nombre del nuevo plano',
    placeholder: `${base} (copia)`,
    valorInicial: `${base} (copia)`,
    textoConfirmar: 'Duplicar',
    validar: (v) => (v && v.trim() ? null : 'Escribe un nombre para el plano.'),
  })
  if (nombre === null) return
  try {
    await clienteHttp.post(`/espacios/plantillas/${p.id_plantilla}/duplicar`, { nombre: nombre.trim() })
    await cargarPlanos()
    notif.exito('Plano duplicado')
  } catch (e) { notif.error(e.error || 'No se pudo duplicar el plano') }
}

async function eliminarPlano(p) {
  const ok = await notif.confirmar({
    variante: 'peligro',
    titulo: `Eliminar "${p?.nombre || 'plano'}"`,
    mensaje: 'Este plano guardado se eliminará. Los eventos que ya lo usaron no se ven afectados.',
    textoConfirmar: 'Sí, eliminar',
  })
  if (!ok) return
  try {
    await clienteHttp.delete(`/espacios/plantillas/${p.id_plantilla}`)
    // Si estábamos editando ese plano, volvemos a la galería.
    if (planoSelId.value === p.id_plantilla) {
      modo.value = 'galeria'; planoSelId.value = null; elementos.value = []
    }
    await cargarPlanos()
    notif.exito('Plano eliminado')
  } catch (e) { notif.error(e.error || 'No se pudo eliminar el plano') }
}

// Botones del editor: operan sobre el plano en edición.
function duplicarPlanoActual() {
  if (planoSelId.value != null) duplicarPlano({ id_plantilla: planoSelId.value, nombre: planoActual.value.nombre })
}
function eliminarPlanoActual() {
  if (planoSelId.value != null) eliminarPlano({ id_plantilla: planoSelId.value, nombre: planoActual.value.nombre })
}

cargarPlanos()
</script>

<style scoped>
.vista-mapas { max-width: 1500px; margin: 0 auto; }

/* ── Galería de planos (tarjetas con miniatura, tipo Canva) ── */
.galeria-planos { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.plano-card { display: flex; flex-direction: column; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); overflow: hidden; cursor: pointer; transition: border-color .18s ease, transform .18s ease, box-shadow .3s ease; }
.plano-card:hover { border-color: var(--borde-activo); box-shadow: var(--glow-morado); }
.plano-thumb { position: relative; width: 100%; background:
    linear-gradient(var(--borde-sutil) 1px, transparent 1px) 0 0 / 8% 8%,
    linear-gradient(90deg, var(--borde-sutil) 1px, transparent 1px) 0 0 / 8% 8%,
    rgba(10, 6, 26, 0.5);
  border-bottom: 1px solid var(--borde-sutil); overflow: hidden; }
.thumb-el { position: absolute; box-sizing: border-box; border: 1px solid transparent; }
.thumb-el.tipo-mesa { background: rgba(168,85,247,0.32); border-color: rgba(168,85,247,0.65); }
.thumb-el.tipo-silla { background: rgba(59,130,246,0.32); border-color: rgba(59,130,246,0.6); }
.thumb-el.tipo-barra { background: rgba(236,72,153,0.28); border-color: rgba(236,72,153,0.55); }
.thumb-el.tipo-escenario { background: rgba(245,158,11,0.24); border-color: rgba(245,158,11,0.5); }
.thumb-el.tipo-pared { background: rgba(255,255,255,0.22); }
.thumb-el.tipo-area { background: rgba(168,85,247,0.06); border: 1px dashed rgba(168,85,247,0.4); }
.thumb-vacio { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--texto-desactivado); font-size: 0.82rem; }
.plano-card-cuerpo { padding: 12px 14px 6px; }
.plano-card-nom { font-family: var(--fuente-titulo); font-size: 1rem; font-weight: 700; color: var(--texto-principal); letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plano-card-meta { font-size: 0.78rem; color: var(--texto-secundario); margin-top: 2px; font-variant-numeric: tabular-nums; }
.plano-card-acciones { display: flex; gap: 6px; padding: 10px 14px 14px; flex-wrap: wrap; }
.plano-card-acciones .btn { flex: 1; min-width: 0; }
.plano-nombre-chip { padding: 9px 13px; border-radius: var(--radio-md); background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Encabezado premium en vidrio ── */
.mapas-encabezado { padding: clamp(1rem, 2.4vw, 1.4rem) clamp(1.1rem, 2.6vw, 1.6rem); margin-bottom: 1.1rem; }
.encabezado-fila { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.25rem; flex-wrap: wrap; }
.encabezado-texto { min-width: 0; }
.vista-titulo { font-family: var(--fuente-titulo); font-size: 1.7rem; font-weight: 800; letter-spacing: -0.025em; line-height: 1.1; color: var(--texto-principal); }
.vista-subtitulo { color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; margin-top: 4px; max-width: 60ch; text-wrap: pretty; }
.cabecera-acciones { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-icono { flex-shrink: 0; margin-top: -1px; }

/* ── Barra de selección (evento / zona / plano / aforo) ── */
.barra-mapa { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 1.25rem; }
.campo-selector { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.campo-selector label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-secundario); font-weight: 700; }
.grupo-zona { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.campo { background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 9px 13px; border-radius: var(--radio-md); font-size: 0.9rem; outline: none; transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
.campo:hover { border-color: var(--borde-activo); }
.campo:focus { border-color: var(--borde-activo); box-shadow: var(--anillo-foco); background: var(--fondo-tarjeta-alt); }
select.campo { cursor: pointer; }

.panel-aforo { margin-left: auto; min-width: 232px; background: linear-gradient(160deg, rgba(168,85,247,0.12), rgba(46,26,102,0.35)); border: 1px solid var(--glass-borde); padding: 12px 16px; border-radius: var(--radio-lg); display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
.aforo-fila { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.aforo-titulo { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-secundario); font-weight: 700; }
.aforo-valor { font-size: 1.35rem; font-weight: 800; color: var(--texto-principal); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.aforo-valor .aforo-sep { color: var(--texto-desactivado); font-weight: 600; margin: 0 1px; }
.aforo-valor.excede { color: var(--color-error); }
.aforo-barra { height: 8px; border-radius: var(--radio-full); background: rgba(14, 8, 33, 0.55); overflow: hidden; }
.aforo-relleno { height: 100%; border-radius: var(--radio-full); background: var(--gradiente-marca); box-shadow: 0 0 12px rgba(236, 72, 153, 0.45); transition: width 0.35s var(--ease-suave); }
.aforo-relleno.excede { background: var(--color-error); box-shadow: 0 0 12px rgba(239, 68, 68, 0.5); }
.aforo-pie { font-size: 0.75rem; color: var(--texto-desactivado); }
.aforo-pie.excede { color: var(--color-error); font-weight: 700; }

/* ── Estado vacío ── */
.estado-vacio-mapa { text-align: center; color: var(--texto-secundario); padding: clamp(2.75rem, 7vw, 4.5rem) 2rem; background: var(--glass-fondo); border: 1px dashed var(--borde-activo); border-radius: var(--radio-xl); backdrop-filter: blur(14px) saturate(140%); -webkit-backdrop-filter: blur(14px) saturate(140%); display: flex; flex-direction: column; align-items: center; gap: 6px; }
.vacio-icono { display: inline-flex; align-items: center; justify-content: center; width: 66px; height: 66px; border-radius: var(--radio-lg); color: var(--morado-hover); background: rgba(168, 85, 247, 0.12); border: 1px solid var(--glass-borde); margin-bottom: 8px; }
.vacio-titulo { font-family: var(--fuente-titulo); font-size: 1.1rem; font-weight: 700; color: var(--texto-principal); }
.vacio-texto { font-size: 0.9rem; max-width: 42ch; text-wrap: pretty; }

/* ── Editor: barra de herramientas · lienzo · propiedades ── */
.editor-grid { display: grid; grid-template-columns: 150px 1fr 288px; gap: 16px; align-items: start; }

.herramientas { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: var(--radio-lg); align-self: start; }
.herramientas-titulo { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-secundario); font-weight: 800; margin-bottom: 4px; padding-left: 2px; }
.btn-herramienta { display: flex; align-items: center; gap: 10px; background: rgba(46, 26, 102, 0.4); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 9px 11px; border-radius: var(--radio-md); font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
.btn-herramienta svg { width: 26px; height: 26px; padding: 4px; box-sizing: border-box; flex-shrink: 0; color: var(--morado-hover); background: rgba(168, 85, 247, 0.12); border-radius: var(--radio-sm); transition: transform 0.18s ease, background 0.18s ease; }
.btn-herramienta:hover { border-color: var(--borde-activo); background: var(--morado-profundo); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(88, 47, 184, 0.35); }
.btn-herramienta:hover svg { transform: scale(1.08); background: rgba(168, 85, 247, 0.24); }
.btn-herramienta:active { transform: translateY(0); }

.lienzo-contenedor { width: 100%; }
.lienzo {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background:
    linear-gradient(var(--borde-sutil) 1px, transparent 1px) 0 0 / 5% 5%,
    linear-gradient(90deg, var(--borde-sutil) 1px, transparent 1px) 0 0 / 5% 5%,
    var(--fondo-tarjeta);
  border: 1px solid var(--borde-activo);
  border-radius: 14px;
  overflow: hidden;
  touch-action: none;
}
.lienzo-vacio { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--texto-desactivado); font-size: 0.9rem; pointer-events: none; }

.elemento {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  border: 2px solid transparent;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  text-align: center;
  overflow: hidden;
  z-index: 1;
}
.elemento:active { cursor: grabbing; }
.elemento.seleccionado { outline: 2px solid var(--rosa-acento); outline-offset: 2px; z-index: 5; overflow: visible; }
.elemento-cap { font-size: 0.6rem; opacity: 0.85; font-weight: 600; }
.manija-resize {
  position: absolute;
  bottom: -9px; right: -9px;
  width: 20px; height: 20px;
  background: var(--rosa-acento);
  border: 2px solid #fff;
  border-radius: 5px;
  cursor: nwse-resize;
  z-index: 6;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
  background-image: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.9) 50%, transparent 50%, transparent 65%, rgba(255,255,255,0.9) 65%, rgba(255,255,255,0.9) 75%, transparent 75%);
  transition: transform 0.12s ease;
}
.manija-resize:hover { transform: scale(1.15); }

.tipo-mesa { background: linear-gradient(135deg, var(--morado-medio), var(--morado-brillante)); border-radius: 50%; box-shadow: var(--sombra-tarjeta); }
.tipo-silla { background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-activo); border-radius: 4px; color: var(--texto-secundario); }
.tipo-barra { background: linear-gradient(135deg, var(--rosa-acento), var(--morado-brillante)); border-radius: 8px; }
.tipo-escenario { background: rgba(168,85,247,0.15); border: 1px dashed var(--borde-activo); border-radius: 8px; color: var(--morado-hover); }
.tipo-pared { background: repeating-linear-gradient(45deg, var(--morado-oscuro), var(--morado-oscuro) 6px, var(--fondo-tarjeta-alt) 6px, var(--fondo-tarjeta-alt) 12px); border: 1px solid var(--borde-activo); border-radius: 3px; color: var(--texto-secundario); }

/* Área/Zona: recuadro visual grande, detrás de todo, con la etiqueta en la esquina. */
.tipo-area {
  z-index: 0;
  align-items: flex-start;
  justify-content: flex-start;
  background: rgba(155, 89, 182, 0.09);
  border: 2px dashed var(--borde-activo);
  border-radius: 12px;
  color: #fff;
}
.tipo-area.seleccionado { z-index: 0; }
.tipo-area .elemento-etiqueta {
  margin: 7px;
  padding: 3px 10px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  pointer-events: none;
}

.propiedades { padding: 18px; border-radius: var(--radio-lg); display: flex; flex-direction: column; gap: 13px; align-self: start; }
.propiedades-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid var(--borde-sutil); }
.propiedades-titulo { font-family: var(--fuente-titulo); font-weight: 800; font-size: 1.05rem; letter-spacing: -0.015em; color: var(--texto-principal); }
.propiedades-chip { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; color: var(--morado-hover); background: rgba(168, 85, 247, 0.14); border: 1px solid var(--glass-borde); padding: 3px 9px; border-radius: var(--radio-full); white-space: nowrap; }
.prop-campo { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; font-weight: 600; color: var(--texto-secundario); }
.prop-check { display: flex; align-items: center; gap: 9px; font-size: 0.85rem; color: var(--texto-secundario); cursor: pointer; padding: 4px 0; }
.prop-check input { accent-color: var(--rosa-acento); width: 16px; height: 16px; cursor: pointer; }
.prop-vacio { color: var(--texto-desactivado); font-size: 0.85rem; line-height: 1.5; }
.prop-ayuda { color: var(--texto-desactivado); font-size: 0.78rem; line-height: 1.5; border-top: 1px dashed var(--borde-sutil); padding-top: 12px; text-wrap: pretty; }
.prop-fila { display: flex; gap: 10px; }
.prop-fila .prop-campo { flex: 1; }
.rango { width: 100%; accent-color: var(--rosa-acento); cursor: pointer; }
.btn-full { width: 100%; margin-top: 2px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 16px; border-radius: var(--radio-md); font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 1px solid transparent; white-space: nowrap; transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, background 0.18s ease; }
.btn-sm { padding: 7px 13px; font-size: 0.8rem; }
.btn-primario { background: var(--gradiente-marca); color: #fff; box-shadow: 0 4px 16px rgba(168, 85, 247, 0.28); }
.btn-primario:hover:not(:disabled) { box-shadow: 0 6px 22px rgba(236, 72, 153, 0.4); filter: brightness(1.06); }
.btn-secundario { background: var(--fondo-tarjeta-alt); border-color: var(--borde-sutil); color: var(--texto-principal); }
.btn-secundario:hover:not(:disabled) { border-color: var(--borde-activo); background: var(--morado-profundo); }
.btn-peligro { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); color: var(--color-error); }
.btn-peligro:hover:not(:disabled) { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn:hover:not(:disabled) { transform: translateY(-2px); }
.btn:active:not(:disabled) { transform: translateY(0); }

.modal-fondo { position: fixed; inset: 0; background: rgba(10, 6, 26, 0.72); backdrop-filter: blur(8px) saturate(120%); -webkit-backdrop-filter: blur(8px) saturate(120%); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: var(--radio-xl); width: 100%; max-width: 430px; box-shadow: var(--sombra-modal), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(168,85,247,0.12); overflow: hidden; }
.modal-cabecera { display: flex; justify-content: space-between; align-items: center; padding: 17px 20px; border-bottom: 1px solid var(--borde-sutil); background: linear-gradient(160deg, rgba(168,85,247,0.14), rgba(46,26,102,0.25)); }
.modal-cabecera h3 { font-family: var(--fuente-titulo); font-size: 1.15rem; font-weight: 700; letter-spacing: -0.015em; color: var(--texto-principal); }
.btn-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: none; border-radius: var(--radio-md); color: var(--texto-secundario); cursor: pointer; transition: color 0.18s ease, background 0.18s ease; }
.btn-x:hover { color: var(--texto-principal); background: var(--fondo-tarjeta-alt); }
.modal-form { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.fila-plantilla { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); transition: border-color 0.18s ease, transform 0.18s ease; }
.fila-plantilla:hover { border-color: var(--borde-activo); transform: translateX(2px); }
.fila-plantilla strong { color: var(--texto-principal); }
.plantilla-desc { display: block; color: var(--texto-secundario); font-size: 0.8rem; margin-top: 2px; }
.plantilla-info { min-width: 0; flex: 1; }
.plantilla-acciones { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.aviso { color: var(--texto-desactivado); font-size: 0.78rem; line-height: 1.5; text-wrap: pretty; }

@media (max-width: 900px) {
  .editor-grid { grid-template-columns: 1fr; }
  .herramientas { flex-direction: row; flex-wrap: wrap; }
  .herramientas-titulo { flex-basis: 100%; }
  .btn-herramienta { flex: 1 1 130px; }
  .campo-selector { flex: 1 1 180px; }
  .panel-aforo { margin-left: 0; width: 100%; }
}

@media (max-width: 560px) {
  .encabezado-fila { flex-direction: column; align-items: stretch; }
  .cabecera-acciones { width: 100%; }
  .cabecera-acciones .btn { flex: 1 1 auto; justify-content: center; }
  .btn-herramienta { flex-basis: calc(50% - 4px); }
}

@media (prefers-reduced-motion: reduce) {
  .campo, .btn, .btn-herramienta, .btn-herramienta svg, .btn-x, .fila-plantilla, .aforo-relleno { transition: none; }
}
</style>
