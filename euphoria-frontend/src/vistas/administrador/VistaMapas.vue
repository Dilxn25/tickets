<template>
  <div class="vista-mapas fade-in">
    <div class="vista-cabecera">
      <div>
        <h2 class="vista-titulo">Mapa de Espacios</h2>
        <p class="vista-subtitulo">Arma el mapa del local: arrastra mesas, sillas, barra y escenario.</p>
      </div>
      <div class="cabecera-acciones">
        <button class="btn btn-secundario" :disabled="!zonaSel" @click="abrirGuardarPlantilla">Guardar plantilla</button>
        <button class="btn btn-secundario" :disabled="!zonaSel" @click="abrirPlantillas">Cargar plantilla</button>
        <button class="btn btn-primario" :disabled="!zonaSel || guardando" @click="guardarMapa">
          {{ guardando ? 'Guardando...' : 'Guardar mapa' }}
        </button>
      </div>
    </div>

    <!-- Selección de evento y zona -->
    <div class="selectores">
      <div class="campo-selector">
        <label>Evento</label>
        <select v-model="eventoSel" @change="cargarZonas" class="campo">
          <option :value="null" disabled>Selecciona un evento</option>
          <option v-for="ev in eventos" :key="ev.id_evento" :value="ev.id_evento">{{ ev.nombre_evento }}</option>
        </select>
      </div>
      <div class="campo-selector" v-if="eventoSel">
        <label>Zona</label>
        <select v-model="zonaSelId" @change="seleccionarZona" class="campo">
          <option :value="null" disabled>Selecciona una zona</option>
          <option v-for="z in zonas" :key="z.id_zona" :value="z.id_zona">{{ z.nombre_zona }}</option>
        </select>
      </div>
      <button v-if="eventoSel" class="btn btn-sm btn-secundario" @click="abrirNuevaZona">+ Nueva zona</button>
      <button v-if="zonaSel" class="btn btn-sm btn-secundario" @click="abrirEditarZona">Editar zona</button>
      <div class="campo-selector" v-if="zonaSel">
        <label>Forma del plano</label>
        <select v-model.number="planoProporcion" @change="cambiarProporcion" class="campo">
          <option :value="1.6">Horizontal</option>
          <option :value="2">Panorámico (ancho)</option>
          <option :value="1">Cuadrado</option>
          <option :value="0.75">Vertical (alto)</option>
        </select>
      </div>
      <div v-if="zonaSel" class="panel-aforo">
        <div class="aforo-fila">
          <span class="aforo-titulo">Aforo colocado</span>
          <span class="aforo-valor" :class="{ excede: totalSillas > zonaSel.capacidad_maxima }">
            {{ totalSillas }} / {{ zonaSel.capacidad_maxima }}
          </span>
        </div>
        <div class="aforo-barra">
          <div class="aforo-relleno" :class="{ excede: totalSillas > zonaSel.capacidad_maxima }" :style="{ width: pctAforo + '%' }"></div>
        </div>
        <span class="aforo-pie" :class="{ excede: totalSillas > zonaSel.capacidad_maxima }">
          {{ totalSillas > zonaSel.capacidad_maxima ? 'Excede el aforo de la zona' : 'Precio base Bs ' + Number(zonaSel.precio_entrada_base).toFixed(2) }}
        </span>
      </div>
    </div>

    <div v-if="!zonaSel" class="estado-vacio-mapa">
      <p>Selecciona un evento y una zona (o crea una) para empezar a armar el mapa.</p>
    </div>

    <div v-else class="editor-grid">
      <!-- Barra de herramientas -->
      <div class="herramientas escalonar">
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
      <div class="propiedades">
        <template v-if="elSel">
          <span class="propiedades-titulo">{{ tipoLabel(elSel.tipo_elemento) }}</span>
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
            <select v-model="elSel.forma" class="campo">
              <option value="redondo">Redondo</option>
              <option value="cuadrado">Cuadrado</option>
            </select>
          </label>

          <label class="prop-campo" v-if="cuentaAforo(elSel.tipo_elemento)">
            <span>Capacidad (personas)</span>
            <input v-model.number="elSel.capacidad_sillas" type="number" min="0" class="campo" />
          </label>

          <template v-if="elSel.tipo_elemento === 'mesa'">
            <label class="prop-campo">
              <span>Precio propio (opcional)</span>
              <input v-model="elSel.precio" type="number" min="0" step="0.01" class="campo" placeholder="usa el de la zona" />
            </label>
            <label class="prop-check">
              <input type="checkbox" v-model="elSel.es_seleccionable" />
              <span>Reservable por el cliente</span>
            </label>
          </template>

          <button class="btn btn-peligro btn-full" @click="eliminarSeleccionado">Eliminar elemento</button>
        </template>
        <template v-else>
          <p class="prop-vacio">Toca un elemento del mapa para editar sus propiedades.</p>
          <p class="prop-ayuda">Mesas y sillas suman aforo. Barra, escenario y paredes son decorativos. Las áreas son recuadros con nombre (Campo, VIP, Piso 1) para marcar zonas visualmente; van detrás de todo y no cuentan aforo.</p>
        </template>
      </div>
    </div>

    <!-- Modal nueva zona -->
    <Teleport to="body">
      <div v-if="modalZona" class="modal-fondo" @click.self="modalZona = false">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>Nueva zona</h3>
            <button class="btn-x" @click="modalZona = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="modal-form">
            <label class="prop-campo"><span>Nombre (Ej. VIP, Campo)</span><input v-model="formZona.nombre_zona" class="campo" /></label>
            <label class="prop-campo"><span>Capacidad máxima (personas)</span><input v-model.number="formZona.capacidad_maxima" type="number" min="0" class="campo" /></label>
            <label class="prop-campo"><span>Precio de entrada base (Bs)</span><input v-model.number="formZona.precio_entrada_base" type="number" min="0" step="0.01" class="campo" /></label>
            <label class="prop-check"><input type="checkbox" v-model="formZona.es_general" /> Zona general / de pie (sin asientos; se vende como entrada general)</label>
            <div class="modal-footer">
              <button class="btn btn-secundario" @click="modalZona = false">Cancelar</button>
              <button class="btn btn-primario" @click="crearZona">Crear zona</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal editar zona -->
    <Teleport to="body">
      <div v-if="modalEditarZona" class="modal-fondo" @click.self="modalEditarZona = false">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>Editar zona</h3>
            <button class="btn-x" @click="modalEditarZona = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="modal-form">
            <label class="prop-campo"><span>Nombre</span><input v-model="formEditarZona.nombre_zona" class="campo" /></label>
            <label class="prop-campo"><span>Capacidad máxima (personas)</span><input v-model.number="formEditarZona.capacidad_maxima" type="number" min="0" class="campo" /></label>
            <label class="prop-campo"><span>Precio de entrada base (Bs)</span><input v-model.number="formEditarZona.precio_entrada_base" type="number" min="0" step="0.01" class="campo" /></label>
            <label class="prop-check"><input type="checkbox" v-model="formEditarZona.es_general" /> Zona general / de pie (sin asientos; se vende como entrada general)</label>
            <div class="modal-footer">
              <button class="btn btn-secundario" @click="modalEditarZona = false">Cancelar</button>
              <button class="btn btn-primario" @click="guardarEditarZona">Guardar cambios</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal guardar plantilla -->
    <Teleport to="body">
      <div v-if="modalGuardarPlantilla" class="modal-fondo" @click.self="modalGuardarPlantilla = false">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>Guardar como plantilla</h3>
            <button class="btn-x" @click="modalGuardarPlantilla = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="modal-form">
            <label class="prop-campo"><span>Nombre de la plantilla</span><input v-model="formPlantilla.nombre" class="campo" placeholder="Ej. Local principal" /></label>
            <label class="prop-campo"><span>Descripción (opcional)</span><input v-model="formPlantilla.descripcion" class="campo" /></label>
            <div class="modal-footer">
              <button class="btn btn-secundario" @click="modalGuardarPlantilla = false">Cancelar</button>
              <button class="btn btn-primario" @click="guardarPlantilla">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal cargar plantilla -->
    <Teleport to="body">
      <div v-if="modalPlantillas" class="modal-fondo" @click.self="modalPlantillas = false">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>Cargar plantilla</h3>
            <button class="btn-x" @click="modalPlantillas = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="modal-form">
            <p v-if="plantillas.length === 0" class="prop-vacio">No hay plantillas guardadas todavía.</p>
            <div v-for="p in plantillas" :key="p.id_plantilla" class="fila-plantilla">
              <div>
                <strong>{{ p.nombre }}</strong>
                <span class="plantilla-desc">{{ p.descripcion }}</span>
              </div>
              <button class="btn btn-sm btn-primario" @click="aplicarPlantilla(p.id_plantilla)">Aplicar</button>
            </div>
            <p class="aviso">Aplicar una plantilla reemplaza el mapa actual de esta zona.</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const eventos = ref([])
const eventoSel = ref(null)
const zonas = ref([])
const zonaSelId = ref(null)
const zonaSel = ref(null)
const elementos = ref([])
const seleccionado = ref(null)
const plantillas = ref([])
const guardando = ref(false)
// Proporción (ancho/alto) del plano de la zona. 1.6 = horizontal por defecto.
const planoProporcion = ref(1.6)

const modalZona = ref(false)
const modalEditarZona = ref(false)
const modalGuardarPlantilla = ref(false)
const modalPlantillas = ref(false)
const formZona = ref({ nombre_zona: '', capacidad_maxima: 0, precio_entrada_base: 0, es_general: false })
const formEditarZona = ref({ nombre_zona: '', capacidad_maxima: 0, precio_entrada_base: 0, es_general: false })
const formPlantilla = ref({ nombre: '', descripcion: '' })

const lienzo = ref(null)
let contadorLocal = 0

const elSel = computed(() => seleccionado.value != null ? elementos.value[seleccionado.value] : null)
const totalSillas = computed(() => elementos.value.reduce((a, e) => a + (Number(e.capacidad_sillas) || 0), 0))
const pctAforo = computed(() => {
  const cap = Number(zonaSel.value?.capacidad_maxima) || 0
  if (!cap) return 0
  return Math.min(100, Math.round((totalSillas.value / cap) * 100))
})

function tipoLabel(t) {
  return ({ mesa: 'Mesa', silla: 'Silla', barra: 'Barra', escenario: 'Escenario', pared: 'Pared', area: 'Área / Zona' })[t] || t
}

// Qué elementos suman aforo (personas). Barra, escenario y pared son decorativos.
function cuentaAforo(t) { return t === 'mesa' || t === 'silla' }

async function cargarEventos() {
  try {
    const res = await clienteHttp.get('/eventos')
    eventos.value = res.eventos || res || []
  } catch (e) { console.warn(e) }
}

async function cargarZonas() {
  zonaSel.value = null; zonaSelId.value = null; elementos.value = []
  if (!eventoSel.value) return
  try {
    zonas.value = await clienteHttp.get(`/espacios/eventos/${eventoSel.value}/zonas`)
  } catch (e) { zonas.value = [] }
}

async function seleccionarZona() {
  seleccionado.value = null
  if (!zonaSelId.value) return
  try {
    const res = await clienteHttp.get(`/espacios/zonas/${zonaSelId.value}/mapa`)
    zonaSel.value = res.zona
    planoProporcion.value = Number(res.zona?.proporcion) || 1.6
    elementos.value = (res.elementos || []).map(normalizar)
  } catch (e) { console.warn(e) }
}

// Cambia la proporción del plano y la guarda en la zona (el cliente verá lo mismo).
async function cambiarProporcion() {
  if (!zonaSel.value) return
  zonaSel.value.proporcion = planoProporcion.value
  // Al cambiar la forma del plano, reacomoda todo para que nada quede fuera.
  elementos.value.forEach(clampPosicion)
  try {
    await clienteHttp.put(`/espacios/zonas/${zonaSel.value.id_zona}`, { proporcion: planoProporcion.value })
  } catch (e) { console.warn(e) }
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

function abrirNuevaZona() {
  formZona.value = { nombre_zona: '', capacidad_maxima: 0, precio_entrada_base: 0, es_general: false }
  modalZona.value = true
}

async function crearZona() {
  if (!formZona.value.nombre_zona) return
  try {
    const zona = await clienteHttp.post('/espacios/zonas', { id_evento: eventoSel.value, ...formZona.value })
    modalZona.value = false
    await cargarZonas()
    zonaSelId.value = zona.id_zona
    await seleccionarZona()
  } catch (e) { console.warn(e) }
}

function abrirEditarZona() {
  if (!zonaSel.value) return
  formEditarZona.value = {
    nombre_zona: zonaSel.value.nombre_zona,
    capacidad_maxima: Number(zonaSel.value.capacidad_maxima) || 0,
    precio_entrada_base: Number(zonaSel.value.precio_entrada_base) || 0,
    es_general: !!zonaSel.value.es_general,
  }
  modalEditarZona.value = true
}

async function guardarEditarZona() {
  if (!zonaSel.value || !formEditarZona.value.nombre_zona) return
  try {
    await clienteHttp.put(`/espacios/zonas/${zonaSel.value.id_zona}`, { ...formEditarZona.value })
    // Refleja los cambios en pantalla sin recargar todo
    zonaSel.value.nombre_zona = formEditarZona.value.nombre_zona
    zonaSel.value.capacidad_maxima = formEditarZona.value.capacidad_maxima
    zonaSel.value.precio_entrada_base = formEditarZona.value.precio_entrada_base
    const z = zonas.value.find(z => z.id_zona === zonaSel.value.id_zona)
    if (z) { z.nombre_zona = formEditarZona.value.nombre_zona; z.capacidad_maxima = formEditarZona.value.capacidad_maxima; z.precio_entrada_base = formEditarZona.value.precio_entrada_base }
    modalEditarZona.value = false
  } catch (e) { alert(e.error || 'Error al editar la zona') }
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

async function guardarMapa() {
  if (!zonaSel.value) return
  guardando.value = true
  try {
    const payload = {
      elementos: elementos.value.map(e => ({
        id_mesa: e.id_mesa || undefined,
        tipo_elemento: e.tipo_elemento,
        numero_nombre: e.numero_nombre,
        posicion_x: e.posicion_x, posicion_y: e.posicion_y,
        ancho: e.ancho, alto: e.alto, rotacion: e.rotacion,
        capacidad_sillas: e.capacidad_sillas,
        precio: (e.precio === '' || e.precio == null) ? null : Number(e.precio),
        es_seleccionable: e.es_seleccionable,
        forma: e.forma || null,
      })),
    }
    const res = await clienteHttp.put(`/espacios/zonas/${zonaSel.value.id_zona}/mapa`, payload)
    elementos.value = (res.elementos || []).map(normalizar)
    seleccionado.value = null
  } catch (e) {
    alert(e.error || 'Error al guardar el mapa')
  } finally {
    guardando.value = false
  }
}

function abrirGuardarPlantilla() {
  formPlantilla.value = { nombre: '', descripcion: '' }
  modalGuardarPlantilla.value = true
}
async function guardarPlantilla() {
  if (!formPlantilla.value.nombre) return
  try {
    await clienteHttp.post('/espacios/plantillas', {
      nombre: formPlantilla.value.nombre,
      descripcion: formPlantilla.value.descripcion,
      elementos: elementos.value.map(({ _id, id_mesa, ...resto }) => resto),
    })
    modalGuardarPlantilla.value = false
  } catch (e) { alert(e.error || 'Error al guardar la plantilla') }
}

async function abrirPlantillas() {
  try { plantillas.value = await clienteHttp.get('/espacios/plantillas') } catch { plantillas.value = [] }
  modalPlantillas.value = true
}
async function aplicarPlantilla(id_plantilla) {
  try {
    await clienteHttp.post(`/espacios/zonas/${zonaSel.value.id_zona}/aplicar-plantilla`, { id_plantilla })
    modalPlantillas.value = false
    await seleccionarZona()
  } catch (e) { alert(e.error || 'Error al aplicar la plantilla') }
}

cargarEventos()
</script>

<style scoped>
.vista-cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.vista-titulo { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); }
.vista-subtitulo { color: var(--texto-secundario); font-size: 0.9rem; margin-top: 2px; max-width: 60ch; text-wrap: pretty; }
.cabecera-acciones { display: flex; gap: 10px; flex-wrap: wrap; }

.selectores { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-bottom: 1.5rem; }
.campo-selector { display: flex; flex-direction: column; gap: 5px; }
.campo-selector label { font-size: 0.72rem; color: var(--texto-secundario); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.campo { background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 9px 13px; border-radius: var(--radio-md); font-size: 0.9rem; outline: none; transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
.campo:hover { border-color: var(--borde-activo); }
.campo:focus { border-color: var(--borde-activo); box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.18); }
.panel-aforo { margin-left: auto; min-width: 220px; background: var(--gradiente-sutil); border: 1px solid var(--borde-sutil); padding: 12px 16px; border-radius: var(--radio-lg); display: flex; flex-direction: column; gap: 7px; box-shadow: var(--sombra-tarjeta); }
.aforo-fila { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.aforo-titulo { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--texto-secundario); font-weight: 700; }
.aforo-valor { font-size: 1.1rem; font-weight: 800; color: var(--texto-principal); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.aforo-valor.excede { color: var(--color-error); }
.aforo-barra { height: 7px; border-radius: var(--radio-full); background: var(--fondo-tarjeta-alt); overflow: hidden; }
.aforo-relleno { height: 100%; border-radius: var(--radio-full); background: var(--gradiente-marca); box-shadow: 0 0 12px rgba(236, 72, 153, 0.4); transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.aforo-relleno.excede { background: var(--color-error); box-shadow: 0 0 12px rgba(239, 68, 68, 0.45); }
.aforo-pie { font-size: 0.75rem; color: var(--texto-desactivado); }
.aforo-pie.excede { color: var(--color-error); font-weight: 600; }

.estado-vacio-mapa { text-align: center; color: var(--texto-secundario); padding: 4rem 2rem; background: var(--gradiente-sutil); border: 1px dashed var(--borde-activo); border-radius: var(--radio-lg); font-size: 0.95rem; }

.editor-grid { display: grid; grid-template-columns: 130px 1fr 260px; gap: 16px; align-items: start; }

.herramientas { display: flex; flex-direction: column; gap: 8px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: 14px; box-shadow: var(--sombra-tarjeta); }
.herramientas-titulo { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--texto-secundario); font-weight: 700; margin-bottom: 4px; }
.btn-herramienta { display: flex; align-items: center; gap: 9px; background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 10px 11px; border-radius: var(--radio-md); font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
.btn-herramienta svg { width: 18px; height: 18px; color: var(--morado-hover); transition: transform 0.18s ease; }
.btn-herramienta:hover { border-color: var(--borde-activo); background: var(--morado-profundo); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(88, 47, 184, 0.3); }
.btn-herramienta:hover svg { transform: scale(1.12); }
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

.propiedades { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: 18px; display: flex; flex-direction: column; gap: 13px; box-shadow: var(--sombra-tarjeta); }
.propiedades-titulo { font-weight: 800; font-size: 1rem; letter-spacing: -0.01em; color: var(--texto-principal); padding-bottom: 10px; border-bottom: 1px solid var(--borde-sutil); }
.prop-campo { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; font-weight: 600; color: var(--texto-secundario); }
.prop-check { display: flex; align-items: center; gap: 9px; font-size: 0.85rem; color: var(--texto-secundario); cursor: pointer; padding: 4px 0; }
.prop-check input { accent-color: var(--rosa-acento); width: 16px; height: 16px; cursor: pointer; }
.prop-vacio { color: var(--texto-desactivado); font-size: 0.85rem; line-height: 1.5; }
.prop-ayuda { color: var(--texto-desactivado); font-size: 0.78rem; line-height: 1.5; border-top: 1px dashed var(--borde-sutil); padding-top: 12px; text-wrap: pretty; }
.prop-fila { display: flex; gap: 10px; }
.prop-fila .prop-campo { flex: 1; }
.rango { width: 100%; accent-color: var(--rosa-acento); cursor: pointer; }
.btn-full { width: 100%; margin-top: 2px; }

.btn { padding: 9px 16px; border-radius: var(--radio-md); font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 1px solid transparent; transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, background 0.18s ease; }
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

.modal-fondo { position: fixed; inset: 0; background: rgba(14, 8, 33, 0.72); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: var(--radio-lg); width: 100%; max-width: 420px; box-shadow: var(--sombra-modal); overflow: hidden; }
.modal-cabecera { display: flex; justify-content: space-between; align-items: center; padding: 17px 20px; border-bottom: 1px solid var(--borde-sutil); background: var(--gradiente-sutil); }
.modal-cabecera h3 { font-size: 1.12rem; font-weight: 800; letter-spacing: -0.01em; color: var(--texto-principal); }
.btn-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: none; border-radius: var(--radio-md); color: var(--texto-secundario); cursor: pointer; transition: color 0.18s ease, background 0.18s ease; }
.btn-x:hover { color: var(--texto-principal); background: var(--fondo-tarjeta-alt); }
.modal-form { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.fila-plantilla { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); transition: border-color 0.18s ease, transform 0.18s ease; }
.fila-plantilla:hover { border-color: var(--borde-activo); transform: translateX(2px); }
.fila-plantilla strong { color: var(--texto-principal); }
.plantilla-desc { display: block; color: var(--texto-secundario); font-size: 0.8rem; margin-top: 2px; }
.aviso { color: var(--texto-desactivado); font-size: 0.78rem; line-height: 1.5; text-wrap: pretty; }

@media (max-width: 900px) {
  .editor-grid { grid-template-columns: 1fr; }
  .herramientas { flex-direction: row; flex-wrap: wrap; }
  .info-zona { margin-left: 0; width: 100%; }
  .panel-aforo { margin-left: 0; width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .campo, .btn, .btn-herramienta, .btn-herramienta svg, .btn-x, .fila-plantilla, .aforo-relleno { transition: none; }
}
</style>
