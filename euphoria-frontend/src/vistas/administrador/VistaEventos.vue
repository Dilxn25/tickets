<template>
  <div class="vista-eventos fade-in">
    <header class="eventos-encabezado superficie">
      <div class="encabezado-fila">
        <div class="encabezado-texto">
          <h2 class="vista-titulo">Gestión de eventos</h2>
          <p class="vista-subtitulo">Planifica y activa las fechas de atención del establecimiento</p>
        </div>
        <button class="btn btn-primario brillo-hover" @click="abrirModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="btn-icono"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo evento
        </button>
      </div>
      <dl class="encabezado-metricas">
        <div class="metrica">
          <dt class="metrica-label">Total</dt>
          <dd class="metrica-valor">{{ eventos.length }}</dd>
        </div>
        <div class="metrica metrica-activos">
          <dt class="metrica-label">En cartelera</dt>
          <dd class="metrica-valor">{{ totalEnCartelera }}</dd>
        </div>
        <div class="metrica">
          <dt class="metrica-label">Pasados</dt>
          <dd class="metrica-valor">{{ totalPasados }}</dd>
        </div>
      </dl>
    </header>

    <!-- Barra de control: pestañas + filtros en una superficie -->
    <div class="barra-controles superficie">
      <!-- Pestañas: eventos actuales vs pasados (finalizados) -->
      <div class="tabs-eventos" role="tablist">
        <button class="tab-evento" :class="{ activo: pestana === 'actuales' }" @click="cambiarPestana('actuales')" type="button">
          Actuales <span class="tab-contador">{{ eventosActuales.length }}</span>
        </button>
        <button class="tab-evento" :class="{ activo: pestana === 'pasados' }" @click="cambiarPestana('pasados')" type="button">
          Pasados <span class="tab-contador">{{ eventosPasados.length }}</span>
        </button>
      </div>

      <div class="filtros-barra">
        <div class="campo-busqueda">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono-busqueda"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input v-model="filtroBusqueda" class="campo campo-con-icono" placeholder="Buscar por nombre..." />
        </div>
        <div class="select-estado"><BaseSelect v-model="filtroTipo" :options="opcionesFiltroTipo" placeholder="Todos los tipos" /></div>
        <div class="select-estado"><BaseSelect v-model="filtroEstado" :options="opcionesFiltroEstado" placeholder="Todos los estados" /></div>
      </div>
    </div>

    <!-- Notificacion Sistema Automatico -->
    <Teleport to="body">
      <div v-if="notificacionSistema" class="notif-overlay">
        <div class="notif-card fade-in">
          <div class="notif-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <div class="notif-cuerpo">
            <h4>Notificación automática del sistema</h4>
            <p>{{ notificacionSistema }}</p>
          </div>
          <button class="notif-cerrar" @click="notificacionSistema = null">Entendido</button>
        </div>
      </div>
    </Teleport>

    <!-- Lista de Eventos -->
    <div class="grid-eventos escalonar" v-if="!cargando">
      <div v-if="!listaActiva.length" class="estado-vacio">
        <div class="estado-vacio-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <p v-if="pestana === 'pasados'">Aún no hay eventos pasados.</p>
        <p v-else>Aún no hay eventos actuales.</p>
        <span class="estado-vacio-hint" v-if="pestana === 'actuales'">Crea uno con "Nuevo evento" para empezar a planificar.</span>
      </div>

      <article v-for="evento in eventosPaginados" :key="evento.id_evento" class="tarjeta tarjeta-interactiva tarjeta-evento hover-elevar aparecer-subir">
        <div class="portada-contenedor">
          <img v-if="evento.url_portada" :src="evento.url_portada" class="portada-img" alt="Portada Evento" />
          <div v-else class="portada-placeholder">Sin portada</div>
          <span class="badge-tipo" :style="estiloBadge(colorTipo(evento.tipo_evento))">
            {{ etiquetaTipo(evento.tipo_evento) }}
          </span>
          <span class="badge-estado" :style="estiloBadge(colorEstado(evento.estado))">
            <i class="badge-punto" aria-hidden="true"></i>{{ etiquetaEstado(evento.estado) }}
          </span>
        </div>

        <div class="evento-info">
          <p class="evento-fecha">
            <span class="fecha-icono" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
            {{ formatearFecha(evento.fecha_hora_inicio) }}
          </p>
          <h3 class="evento-nombre">{{ evento.nombre_evento }}</h3>
          <p class="evento-desc">{{ evento.descripcion || 'Sin descripción' }}</p>

          <div class="acciones">
            <button class="btn btn-sm btn-secundario" @click="abrirModal(evento)">Editar</button>
            <button class="btn btn-sm btn-secundario" @click="abrirPlanosEvento(evento)">
              Planos<span v-if="evento.cantidadZonas" class="chip-conteo">{{ evento.cantidadZonas }}</span>
            </button>
            <button class="btn btn-sm btn-primario" @click="iniciarCambioEstado(evento)">Estado</button>
            <button class="btn btn-sm btn-peligro" @click="eliminarEvento(evento)" :disabled="eliminandoEvento === evento.id_evento">
              {{ eliminandoEvento === evento.id_evento ? '…' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="grid-eventos">
      <div v-for="n in 6" :key="'sk-' + n" class="tarjeta tarjeta-evento skeleton-tarjeta">
        <div class="skeleton-portada skeleton-brillo"></div>
        <div class="skeleton-cuerpo">
          <div class="skeleton-linea skeleton-brillo" style="width: 70%; height: 18px;"></div>
          <div class="skeleton-linea skeleton-brillo" style="width: 45%;"></div>
          <div class="skeleton-linea skeleton-brillo" style="width: 90%;"></div>
          <div class="skeleton-linea skeleton-brillo" style="width: 60%;"></div>
        </div>
      </div>
    </div>

    <Paginacion
      v-if="!cargando && listaActiva.length"
      :total="listaActiva.length" :pagina="pagina" :limite="limite"
      @update:pagina="pagina = $event"
      @update:limite="l => { limite = l; pagina = 1 }"
    />

    <!-- Modal Formulario -->
    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>{{ eventoEditando ? 'Editar evento' : 'Nuevo evento' }}</h3>
            <button class="btn-x" @click="cerrarModal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          
          <form class="modal-form" @submit.prevent="guardarEvento">
            <div class="form-fila">
              <div class="grupo-campo">
                <label class="etiqueta">Nombre del evento *</label>
                <input v-model="form.nombre_evento" class="campo" required placeholder="Ej. Fiesta Neón Sábado" />
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Tipo de evento</label>
                <BaseSelect v-model="form.tipo_evento" :options="opcionesTipoForm" />
              </div>
            </div>
            <p class="tipo-ayuda">
              <template v-if="form.tipo_evento === 'especial'">Evento con artista o temática (detalles en la descripción).</template>
              <template v-else-if="form.tipo_evento === 'externo'">Evento en otra locación (indica dónde en la descripción).</template>
              <template v-else>Noche normal del establecimiento (solo DJ).</template>
            </p>

            <div class="form-fila">
              <div class="grupo-campo">
                <label class="etiqueta">Fecha y hora de inicio *</label>
                <BaseFecha v-model="form.fecha_hora_inicio" con-hora :clearable="false" placeholder="Elegir inicio" />
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Fecha y hora de fin (opcional)</label>
                <BaseFecha v-model="form.fecha_hora_fin" con-hora :min="form.fecha_hora_inicio || ''" placeholder="Elegir fin" />
              </div>
            </div>

            <div class="grupo-campo">
              <label class="etiqueta">Descripción</label>
              <textarea v-model="form.descripcion" class="campo textarea" rows="3" placeholder="Detalles del evento, artistas, temática..."></textarea>
            </div>

            <p class="tipo-ayuda">Los planos del evento (pisos/áreas) se agregan después con el botón "Planos" en la tarjeta del evento.</p>

            <div class="grupo-campo">
              <label class="etiqueta">Imagen de portada (flyer)</label>
              <div class="subida-imagen">
                <input type="file" ref="inputArchivo" accept="image/*" @change="manejarArchivo" class="input-file" id="file-evento" />
                <label for="file-evento" class="dropzone" :class="{ 'dropzone-cargada': archivoSeleccionado }">
                  <span class="dropzone-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </span>
                  <span class="dropzone-texto">{{ archivoSeleccionado ? archivoSeleccionado.name : 'Seleccionar imagen del flyer' }}</span>
                  <span class="dropzone-hint">PNG o JPG · se muestra en la tarjeta del evento</span>
                </label>
              </div>
              <img v-if="previewImagen" :src="previewImagen" class="preview-img" alt="Vista previa" />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secundario" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primario" :disabled="guardando">
                {{ guardando ? 'Guardando...' : (eventoEditando ? 'Guardar cambios' : 'Planificar evento') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal Cambiar Estado -->
    <Teleport to="body">
      <div v-if="modalEstado" class="modal-fondo" @click.self="modalEstado=false">
        <div class="modal fade-in" style="max-width: 400px; text-align: center;">
          <div class="modal-cabecera" style="justify-content: center; border: none; padding-bottom: 0;">
            <h3>Cambiar estado del evento</h3>
          </div>
          <div style="padding: 1rem 1.5rem 1.5rem 1.5rem;">
            <p style="color: var(--texto-secundario); font-size: 0.9rem; margin-bottom: 1.5rem;">
              Selecciona el nuevo estado para el evento: <strong>{{ eventoParaEstado?.nombre_evento }}</strong>
            </p>
            
            <div style="margin-bottom: 1.5rem;"><BaseSelect v-model="nuevoEstadoSeleccionado" :options="opcionesNuevoEstado" placeholder="Selecciona un estado…" /></div>

            <p class="nota-auto">
              <strong>En transcurso</strong> y <strong>Terminado</strong> se activan solos según la fecha y hora. Normalmente solo pasas de <strong>Planificación</strong> a <strong>Promoción</strong> para publicar el evento.
            </p>
            <p v-if="eventoExpirado" style="color: var(--texto-secundario); font-size: 0.8rem; margin-bottom: 1.5rem;">
              La fecha de este evento ya pasó: no puede reactivarse ni volver a planificarse.
            </p>

            <div style="display: flex; gap: 10px; justify-content: center;">
              <button class="btn btn-secundario" style="flex: 1;" @click="modalEstado=false">Cancelar</button>
              <button class="btn btn-primario" style="flex: 1;" @click="confirmarCambioEstado">Guardar Estado</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Planos del evento -->
    <Teleport to="body">
      <div v-if="modalPlanos" class="modal-fondo" @click.self="modalPlanos=false">
        <div class="modal fade-in" style="max-width: 560px;">
          <div class="modal-cabecera">
            <h3>Planos de "{{ eventoPlanos?.nombre_evento }}"</h3>
            <button class="btn-x" @click="modalPlanos=false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="modal-form">
            <p class="pl-ayuda">Un evento puede tener varios planos (ej. Primer piso, Segundo piso). Cada plano trae su mapa; las áreas VIP/Campo se marcan con recuadros dentro del plano.</p>

            <!-- Lista de planos ya agregados -->
            <div v-if="planosDelEvento.length" class="pl-lista">
              <div v-for="p in planosDelEvento" :key="p.id_zona" class="pl-item">
                <div class="pl-item-info">
                  <strong>{{ p.nombre }}</strong>
                  <span class="pl-item-meta">Bs. {{ Number(p.precio_entrada_base).toFixed(2) }} · aforo {{ p.aforo }}</span>
                </div>
                <button class="btn btn-sm btn-peligro" @click="quitarPlanoDeEvento(p)">Quitar</button>
              </div>
            </div>
            <p v-else class="pl-vacio">Este evento aún no tiene planos. Agrega el primero abajo.</p>

            <!-- Agregar un plano -->
            <div class="pl-agregar">
              <span class="pl-agregar-tit">Agregar plano</span>
              <div class="grupo-campo">
                <label class="etiqueta">Plano (de la biblioteca)</label>
                <BaseSelect v-model="formAgregar.id_plano" :options="opcionesPlano" placeholder="Elige un plano" />
              </div>
              <div class="form-fila">
                <div class="grupo-campo">
                  <label class="etiqueta">Nombre en el evento (opcional)</label>
                  <input v-model="formAgregar.nombre" class="campo" placeholder="Ej. Primer piso" />
                </div>
                <div class="grupo-campo">
                  <label class="etiqueta">Precio de entrada (Bs.)</label>
                  <input v-model.number="formAgregar.precio_base" type="number" min="0" step="0.01" class="campo" placeholder="0.00" />
                </div>
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Prioridad de atención</label>
                <BaseSelect
                  v-model="formAgregar.prioridad"
                  :options="[
                    { value: 0, label: 'Normal' },
                    { value: 1, label: 'Alta' },
                    { value: 2, label: 'Zona VIP' },
                  ]"
                />
                <small class="ayuda-campo">Define el orden en que la barra prepara los pedidos de esta zona.</small>
              </div>
              <button class="btn btn-primario" style="width:100%" @click="agregarPlanoAEvento">+ Agregar al evento</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Paginacion from '@/componentes/comunes/Paginacion.vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import BaseFecha from '@/componentes/comunes/BaseFecha.vue'
import { servicioEventos } from '@/servicios-api/servicio-eventos.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import { useTiempoReal } from '@/composables/useTiempoReal'

const notif = useNotificaciones()

// Planos disponibles para asignar al evento (biblioteca de Planos).
const planosDisponibles = ref([])
const opcionesPlano = computed(() => planosDisponibles.value.map(p => ({ value: p.id_plantilla, label: p.nombre })))
async function cargarPlanosDisponibles() {
  try { planosDisponibles.value = await clienteHttp.get('/espacios/plantillas') } catch { planosDisponibles.value = [] }
}

// Modelo de la Fase 3: estados y tipos con su etiqueta y color.
const ESTADOS = {
  planificacion: { label: 'Planificación', color: '#8b8b96' },
  promocion:     { label: 'Promoción',     color: '#a855f7' },
  en_transcurso: { label: 'En transcurso', color: '#22c55e' },
  lleno:         { label: 'Lleno',          color: '#f59e0b' },
  terminado:     { label: 'Terminado',      color: '#6b7280' },
}
const ORDEN_ESTADOS = ['planificacion', 'promocion', 'en_transcurso', 'lleno', 'terminado']
const TIPOS = {
  estandar: { label: 'Estándar', color: '#a855f7' },
  especial: { label: 'Especial', color: '#ec4899' },
  externo:  { label: 'Externo',  color: '#06b6d4' },
}
const etiquetaEstado = (e) => ESTADOS[e]?.label || e
const colorEstado    = (e) => ESTADOS[e]?.color || '#8b8b96'
const etiquetaTipo   = (t) => TIPOS[t]?.label || 'Estándar'
const colorTipo      = (t) => TIPOS[t]?.color || '#a855f7'
// Badge legible sobre la portada: fondo oscuro translúcido + acento de color.
const estiloBadge = (color) => ({ background: 'rgba(10, 6, 26, 0.72)', color, border: `1px solid ${color}66` })

const opcionesFiltroEstado = [
  { value: '', label: 'Todos los estados' },
  ...ORDEN_ESTADOS.map(s => ({ value: s, label: ESTADOS[s].label, color: ESTADOS[s].color })),
]
const opcionesFiltroTipo = [
  { value: '', label: 'Todos los tipos' },
  ...Object.entries(TIPOS).map(([v, t]) => ({ value: v, label: t.label, color: t.color })),
]
const opcionesTipoForm = Object.entries(TIPOS).map(([v, t]) => ({ value: v, label: t.label, color: t.color }))

// Estado
const eventos = ref([])
const cargando = ref(false)
const guardando = ref(false)
const filtroBusqueda = ref('')
const filtroEstado = ref('')
const filtroTipo = ref('')
const notificacionSistema = ref(null)

// Modal
const modalAbierto = ref(false)
const eventoEditando = ref(null)
const inputArchivo = ref(null)
const archivoSeleccionado = ref(null)
const previewImagen = ref(null)

const form = reactive({
  nombre_evento: '',
  descripcion: '',
  fecha_hora_inicio: '',
  fecha_hora_fin: '',
  tipo_evento: 'estandar',
})

// ── Gestión de planos del evento (un evento puede tener varios: pisos/áreas) ──
const modalPlanos = ref(false)
const eventoPlanos = ref(null)              // evento cuyos planos gestionamos
const planosDelEvento = ref([])             // planos ya agregados (zonas)
const cargandoPlanos = ref(false)
const formAgregar = reactive({ id_plano: '', nombre: '', precio_base: 0, prioridad: 0 })

async function abrirPlanosEvento(evento) {
  eventoPlanos.value = evento
  formAgregar.id_plano = ''; formAgregar.nombre = ''; formAgregar.precio_base = 0; formAgregar.prioridad = 0
  modalPlanos.value = true
  // Recargar la biblioteca para incluir planos creados recientemente (evita el caché de KeepAlive).
  cargarPlanosDisponibles()
  await cargarPlanosDelEvento()
}
async function cargarPlanosDelEvento() {
  if (!eventoPlanos.value) return
  cargandoPlanos.value = true
  try {
    planosDelEvento.value = await clienteHttp.get(`/espacios/eventos/${eventoPlanos.value.id_evento}/planos`)
  } catch { planosDelEvento.value = [] }
  finally { cargandoPlanos.value = false }
}
async function agregarPlanoAEvento() {
  if (!formAgregar.id_plano) { notif.advertencia('Elige un plano para agregar.'); return }
  try {
    await clienteHttp.post(`/espacios/eventos/${eventoPlanos.value.id_evento}/asignar-plano`, {
      id_plantilla: formAgregar.id_plano,
      precio_base: formAgregar.precio_base,
      nombre: formAgregar.nombre,
      prioridad: formAgregar.prioridad,
    })
    formAgregar.id_plano = ''; formAgregar.nombre = ''; formAgregar.precio_base = 0; formAgregar.prioridad = 0
    await cargarPlanosDelEvento()
    cargarEventos()
    notif.exito('Plano agregado al evento')
  } catch (e) { notif.error(e.error || 'No se pudo agregar el plano') }
}
async function quitarPlanoDeEvento(p) {
  const ok = await notif.confirmar({
    variante: 'peligro',
    titulo: `Quitar "${p.nombre}"`,
    mensaje: 'Se quitará este plano del evento (con su mapa). A los clientes con reserva en este plano se les DEVOLVERÁ lo que pagaron a su billetera. No afecta al plano en la biblioteca.',
    textoConfirmar: 'Sí, quitar y devolver',
  })
  if (!ok) return
  try {
    const r = await clienteHttp.delete(`/espacios/zonas/${p.id_zona}`)
    await cargarPlanosDelEvento()
    cargarEventos()
    notif.exito(r?.reembolsos ? `Plano quitado. Se devolvieron Bs ${r.total_devuelto} a ${r.reembolsos} cliente(s).` : 'Plano quitado del evento')
  } catch (e) { notif.error(e.error || 'No se pudo quitar el plano.') }
}

const modalEstado = ref(false)
const eventoParaEstado = ref(null)
const nuevoEstadoSeleccionado = ref('')

// Cargar Datos
async function cargarEventos() {
  cargando.value = true
  try {
    const data = await servicioEventos.listarTodos()
    // Como el backend ahora retorna { eventos, notificacionCierre }
    eventos.value = data.eventos || data
    
    if (data.notificacionCierre) {
      notificacionSistema.value = data.notificacionCierre
    }
  } catch (error) {
    console.error('Error cargando eventos:', error)
  } finally {
    cargando.value = false
  }
}

const eliminandoEvento = ref(null)
async function eliminarEvento(evento) {
  const ok = await notif.confirmar({
    variante: 'peligro',
    titulo: `Eliminar "${evento.nombre_evento}"`,
    mensaje: 'Se eliminará el evento con sus planos. A los clientes con reserva se les DEVOLVERÁ a su billetera lo que pagaron, y sus pedidos quedarán sin evento. Esta acción no se puede deshacer.',
    textoConfirmar: 'Sí, eliminar y devolver',
  })
  if (!ok) return
  eliminandoEvento.value = evento.id_evento
  try {
    const r = await clienteHttp.delete(`/eventos/${evento.id_evento}`)
    notif.exito(r?.reembolsos ? `Evento eliminado. Se devolvieron Bs ${r.total_devuelto} a ${r.reembolsos} cliente(s).` : 'Evento eliminado.')
    cargarEventos()
  } catch (e) {
    notif.error(e?.error || 'No se pudo eliminar el evento.')
  } finally {
    eliminandoEvento.value = null
  }
}

onMounted(() => {
  cargarEventos()
  cargarPlanosDisponibles()
})
// Tiempo real: eventos y sus planos/aforo se refrescan solos.
useTiempoReal('eventos', () => cargarEventos())

// Filtros
const eventosFiltrados = computed(() => {
  return eventos.value.filter(e => {
    const matchNombre = e.nombre_evento.toLowerCase().includes(filtroBusqueda.value.toLowerCase())
    const matchEstado = filtroEstado.value ? e.estado === filtroEstado.value : true
    const matchTipo   = filtroTipo.value ? (e.tipo_evento || 'estandar') === filtroTipo.value : true
    return matchNombre && matchEstado && matchTipo
  })
})

// Pestañas Actuales / Pasados (finalizados) + paginación
const pestana = ref('actuales')
const pagina = ref(1)
const limite = ref(12)

const eventosActuales = computed(() => eventosFiltrados.value.filter(e => e.estado !== 'terminado'))
const eventosPasados  = computed(() => eventosFiltrados.value.filter(e => e.estado === 'terminado'))
// Métricas de cabecera SIEMPRE globales (no se mueven al filtrar/buscar)
const totalEnCartelera = computed(() => eventos.value.filter(e => e.estado !== 'terminado').length)
const totalPasados     = computed(() => eventos.value.filter(e => e.estado === 'terminado').length)
const listaActiva = computed(() => pestana.value === 'pasados' ? eventosPasados.value : eventosActuales.value)
const eventosPaginados = computed(() => {
  const ini = (pagina.value - 1) * limite.value
  return listaActiva.value.slice(ini, ini + limite.value)
})

function cambiarPestana(p) {
  pestana.value = p
  pagina.value = 1
}
watch([filtroBusqueda, filtroEstado, filtroTipo], () => { pagina.value = 1 })

// Utilidades
function formatearFecha(fechaStr) {
  if (!fechaStr) return ''
  const opciones = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  return new Date(fechaStr).toLocaleDateString('es-ES', opciones)
}

function formatearFechaParaInput(fechaStr) {
  if (!fechaStr) return ''
  const date = new Date(fechaStr)
  if (isNaN(date.getTime())) return ''
  // Construir el string local (YYYY-MM-DDTHH:mm) a partir de los componentes
  // de hora local, sin restar el offset manualmente (frágil ante servidor UTC).
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Funciones del Modal
function abrirModal(evento = null) {
  eventoEditando.value = evento
  archivoSeleccionado.value = null
  previewImagen.value = evento ? evento.url_portada : null
  
  if (evento) {
    form.nombre_evento = evento.nombre_evento
    form.descripcion = evento.descripcion || ''
    form.fecha_hora_inicio = formatearFechaParaInput(evento.fecha_hora_inicio)
    form.fecha_hora_fin = formatearFechaParaInput(evento.fecha_hora_fin)
    form.tipo_evento = evento.tipo_evento || 'estandar'
  } else {
    form.nombre_evento = ''
    form.descripcion = ''
    form.fecha_hora_inicio = ''
    form.fecha_hora_fin = ''
    form.tipo_evento = 'estandar'
  }

  modalAbierto.value = true
}

function cerrarModal() {
  modalAbierto.value = false
  setTimeout(() => {
    archivoSeleccionado.value = null
    previewImagen.value = null
  }, 200)
}

function manejarArchivo(e) {
  const archivo = e.target.files[0]
  if (archivo) {
    archivoSeleccionado.value = archivo
    previewImagen.value = URL.createObjectURL(archivo)
  }
}

// Guardar
async function guardarEvento() {
  guardando.value = true
  try {
    const formData = new FormData()
    formData.append('nombre_evento', form.nombre_evento)
    formData.append('descripcion', form.descripcion)
    formData.append('fecha_hora_inicio', form.fecha_hora_inicio)
    if (form.fecha_hora_fin) formData.append('fecha_hora_fin', form.fecha_hora_fin)
    formData.append('tipo_evento', form.tipo_evento)
    
    if (archivoSeleccionado.value) {
      formData.append('imagen', archivoSeleccionado.value)
    }

    const editando = !!eventoEditando.value
    if (editando) {
      await servicioEventos.editar(eventoEditando.value.id_evento, formData)
    } else {
      await servicioEventos.crear(formData)
    }

    cerrarModal()
    cargarEventos()
    notif.exito(editando ? 'Evento actualizado' : 'Evento creado')
  } catch (error) {
    notif.error('Error al guardar el evento: ' + (error.error || error.message))
  } finally {
    guardando.value = false
  }
}

// Acciones de Estado
function iniciarCambioEstado(evento) {
  eventoParaEstado.value = evento
  nuevoEstadoSeleccionado.value = evento.estado
  modalEstado.value = true
}

// Indica si el evento ya expiró segun su fecha de fin (o inicio si no hay fin).
const eventoExpirado = computed(() => {
  const ev = eventoParaEstado.value
  if (!ev) return false
  const fechaRef = ev.fecha_hora_fin || ev.fecha_hora_inicio
  if (!fechaRef) return false
  const fecha = new Date(fechaRef)
  if (isNaN(fecha.getTime())) return false
  return fecha.getTime() < Date.now()
})

// Determina si una transicion hacia `destino` es coherente para el evento actual.
function estadoDeshabilitado(destino) {
  const ev = eventoParaEstado.value
  if (!ev) return false
  // Siempre se permite conservar el estado actual.
  if (destino === ev.estado) return false
  // Un evento Terminado es cierre definitivo: no vuelve a un estado anterior.
  if (ev.estado === 'terminado') return true
  // Un evento cuya fecha ya pasó no puede volver a Planificación o Promoción.
  if (eventoExpirado.value && (destino === 'planificacion' || destino === 'promocion')) return true
  return false
}

const opcionesNuevoEstado = computed(() =>
  ORDEN_ESTADOS.map(s => ({
    value: s,
    label: ESTADOS[s].label,
    color: ESTADOS[s].color,
    disabled: estadoDeshabilitado(s),
  }))
)

async function confirmarCambioEstado() {
  if (!eventoParaEstado.value || !nuevoEstadoSeleccionado.value) return

  // Bloquear transiciones incoherentes tambien a nivel de accion.
  if (estadoDeshabilitado(nuevoEstadoSeleccionado.value)) {
    notif.advertencia('Esa transición de estado no es válida para este evento.')
    return
  }

  try {
    await servicioEventos.cambiarEstado(eventoParaEstado.value.id_evento, nuevoEstadoSeleccionado.value)
    modalEstado.value = false
    cargarEventos()
    notif.exito('Estado del evento actualizado')
  } catch (error) {
    notif.error('Error al cambiar el estado del evento')
  }
}
</script>

<style scoped>
/* Mapeo de variables locales indefinidas a la paleta global */
.vista-eventos { --fondo-oscuro: var(--fondo-app); --color-primario: var(--morado-claro); }

/* Notificacion del Sistema — centrada y grande */
.notif-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(6px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
.notif-card { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-top: 5px solid var(--morado-brillante); border-radius: 20px; padding: 40px 35px 30px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.7); max-width: 480px; width: 100%; text-align: center; }
.notif-icon { color: var(--morado-brillante); margin-bottom: 5px; }
.notif-cuerpo h4 { font-size: 1.3rem; font-weight: 700; margin-bottom: 10px; color: var(--texto-principal); }
.notif-cuerpo p { font-size: 0.95rem; color: var(--texto-secundario); line-height: 1.7; }
.notif-cerrar { background: var(--gradiente-marca); border: none; color: #fff; cursor: pointer; padding: 13px 35px; border-radius: var(--radio-full); font-weight: 700; font-size: 1rem; margin-top: 10px; transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease, filter 0.2s ease; width: 100%; max-width: 240px; box-shadow: 0 8px 24px rgba(168, 85, 247, 0.35); }
.notif-cerrar:hover { filter: brightness(1.08); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(168, 85, 247, 0.5); }
.notif-cerrar:active { transform: translateY(0); box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35); }
.notif-cerrar:focus-visible { outline: 2px solid var(--morado-hover); outline-offset: 3px; }

.vista-eventos { padding: var(--esp-6); max-width: 1400px; margin: 0 auto; }

/* ---- Encabezado premium (superficie de vidrio + métricas) ---- */
.eventos-encabezado {
  padding: var(--esp-5) var(--esp-5) var(--esp-4);
  margin-bottom: var(--esp-4);
}
.encabezado-fila {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--esp-4);
  flex-wrap: wrap;
}
.encabezado-texto { min-width: 0; }
.vista-titulo { font-family: var(--fuente-titulo); font-size: 1.7rem; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.25rem; line-height: 1.1; color: var(--texto-principal); text-wrap: balance; }
.vista-subtitulo { color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; max-width: 52ch; text-wrap: pretty; }
.encabezado-fila .btn-primario { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.btn-icono { flex-shrink: 0; margin-top: -1px; }

.encabezado-metricas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-6);
  margin: var(--esp-4) 0 0;
  padding-top: var(--esp-4);
  border-top: 1px solid var(--glass-borde);
}
.metrica { display: flex; flex-direction: column-reverse; gap: 2px; }
.metrica-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-desactivado); }
.metrica-valor { font-family: var(--fuente-titulo); font-size: 1.65rem; font-weight: 800; line-height: 1; letter-spacing: -0.02em; color: var(--texto-principal); font-variant-numeric: tabular-nums; }
.metrica-activos .metrica-valor { color: var(--morado-hover); }

/* ---- Barra de control: pestañas segmentadas + filtros ---- */
.barra-controles {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-4);
  flex-wrap: wrap;
  padding: var(--esp-3);
  margin-bottom: var(--esp-5);
}

.filtros-barra { display: flex; gap: var(--esp-3); flex-wrap: wrap; align-items: center; }
.campo-busqueda { position: relative; flex: 1 1 220px; max-width: 300px; }
.icono-busqueda { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--texto-desactivado); pointer-events: none; transition: color 0.2s ease; }
.campo-busqueda:focus-within .icono-busqueda { color: var(--morado-hover); }
.campo-con-icono { padding-left: 38px; width: 100%; }
.select-estado { max-width: 190px; }

/* Pestañas Actuales / Pasados — control segmentado */
.tabs-eventos {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radio-full);
  background: rgba(10, 6, 26, 0.35);
  border: 1px solid var(--glass-borde);
}
.tab-evento {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  border-radius: var(--radio-full);
  color: var(--texto-secundario);
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.25s ease;
}
.tab-evento:hover { color: var(--texto-principal); }
.tab-evento:focus-visible { outline: 2px solid var(--borde-activo); outline-offset: 2px; }
.tab-evento:active { transform: translateY(1px); }
.tab-evento.activo {
  color: #fff;
  background: var(--gradiente-marca);
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.35);
}
.tab-contador {
  min-width: 22px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(168, 85, 247, 0.18);
  color: var(--texto-secundario);
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.tab-evento.activo .tab-contador {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

/* Grid de Eventos */
.grid-eventos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 1.35rem;
}

.tarjeta-evento {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(130% 90% at 50% -10%, rgba(168, 85, 247, 0.10), transparent 60%),
    var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  box-shadow: 0 10px 30px rgba(10, 6, 26, 0.45);
  transition: transform 0.28s var(--ease-cine), box-shadow 0.28s ease, border-color 0.28s ease;
}
.tarjeta-evento:hover {
  border-color: var(--borde-activo);
  box-shadow: 0 22px 48px rgba(11, 6, 30, 0.62), 0 0 0 1px rgba(168, 85, 247, 0.14), var(--sombra-glow);
}

.portada-contenedor {
  position: relative;
  width: 100%;
  height: 188px;
  background: var(--fondo-oscuro);
  overflow: hidden;
}

.portada-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s var(--ease-cine);
}
.tarjeta-evento:hover .portada-img { transform: scale(1.06); }
.portada-contenedor::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(12, 7, 30, 0.85) 0%, rgba(12, 7, 30, 0.18) 45%, transparent 70%);
  pointer-events: none;
}

.portada-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(120% 120% at 20% 15%, rgba(255,255,255,0.18), transparent 55%),
    linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: rgba(255,255,255,0.92);
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.badge-estado {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radio-full);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.6px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 3px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22);
}
.badge-punto { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }

/* Badge de tipo (arriba a la izquierda de la portada) */
.badge-tipo {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: var(--radio-full);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 3px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18);
}
.tipo-ayuda { font-size: 0.78rem; color: var(--texto-desactivado); margin: -0.35rem 0 0.15rem; line-height: 1.4; }
.nota-auto { font-size: 0.78rem; line-height: 1.5; color: var(--texto-secundario); text-align: left; background: rgba(168,85,247,0.08); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); padding: 0.7rem 0.85rem; margin-bottom: 1.1rem; }
.nota-auto strong { color: var(--texto-principal); }

/* Modal Planos del evento */
.pl-ayuda { font-size: 0.82rem; color: var(--texto-secundario); line-height: 1.5; margin-bottom: 1rem; }
.chip-conteo {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  border-radius: 9px;
  background: var(--color-primario, #a855f7);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
}
.pl-lista { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.1rem; }
.pl-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-radius: var(--radio-md); background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil); }
.pl-item-info { display: flex; flex-direction: column; min-width: 0; }
.pl-item-info strong { color: var(--texto-principal); }
.pl-item-meta { font-size: 0.78rem; color: var(--texto-secundario); font-variant-numeric: tabular-nums; }
.pl-vacio { font-size: 0.85rem; color: var(--texto-desactivado); font-style: italic; margin-bottom: 1.1rem; }
.pl-agregar { border-top: 1px solid var(--borde-sutil); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.pl-agregar-tit { font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; }

.evento-info {
  padding: 1.25rem 1.4rem 1.4rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.evento-fecha {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.8rem;
  color: var(--morado-hover);
  margin-bottom: 0.55rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-transform: capitalize;
}
.fecha-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radio-sm);
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid var(--borde-sutil);
  color: var(--morado-hover);
}
.icono { width: 15px; height: 15px; flex-shrink: 0; }

.evento-nombre {
  font-family: var(--fuente-titulo);
  font-size: 1.22rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.25;
  margin-bottom: 0.5rem;
  color: var(--texto-principal);
  text-wrap: balance;
}

.evento-desc {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  line-height: 1.55;
  margin-bottom: 1.25rem;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-wrap: pretty;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--borde-sutil);
}
.acciones .btn {
  flex: 1 1 auto;
  min-width: 84px;
  justify-content: center;
  white-space: nowrap;
}
@media (max-width: 480px) {
  .acciones .btn { flex: 1 1 calc(50% - 4px); }
}
.acciones .btn { flex: 1; justify-content: center; }

/* Modales — superficie de vidrio premium */
.modal-fondo { position: fixed; inset: 0; background: rgba(6, 3, 18, 0.68); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal {
  position: relative;
  background:
    radial-gradient(120% 60% at 50% -5%, rgba(168, 85, 247, 0.12), transparent 60%),
    var(--fondo-tarjeta);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  width: 100%;
  max-width: 520px;
  box-shadow: var(--sombra-modal), inset 0 1px 0 rgba(255,255,255,0.06);
  max-height: 90vh;
  overflow-y: auto;
}
.modal::before {
  content: '';
  position: absolute;
  top: 0; left: 5%; right: 5%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--morado-brillante), var(--rosa-acento), transparent);
  opacity: 0.7;
}
.modal-cabecera { display: flex; justify-content: space-between; align-items: center; padding: 1.3rem 1.5rem; border-bottom: 1px solid var(--borde-sutil); position: sticky; top: 0; background: var(--fondo-tarjeta); z-index: 1; }
.modal-cabecera h3 { font-family: var(--fuente-titulo); font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); }
.btn-x { display: inline-flex; align-items: center; justify-content: center; background: none; border: none; color: var(--texto-secundario); cursor: pointer; width: 34px; height: 34px; border-radius: var(--radio-md); transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease; }
.btn-x:hover { color: var(--texto-principal); background: var(--fondo-tarjeta-alt); }
.btn-x:active { transform: scale(0.92); }
.btn-x:focus-visible { outline: 2px solid var(--borde-activo); outline-offset: 2px; }

.modal-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.form-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.grupo-campo { display: flex; flex-direction: column; gap: 7px; }
.etiqueta { font-size: 0.8rem; color: var(--texto-secundario); font-weight: 600; letter-spacing: 0.01em; }
.textarea { resize: vertical; min-height: 80px; }

/* Dropzone de portada */
.subida-imagen { display: block; }
.input-file { display: none; }
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 1.25rem 1rem;
  text-align: center;
  cursor: pointer;
  border: 1.5px dashed var(--borde-activo);
  border-radius: var(--radio-lg);
  background: rgba(168, 85, 247, 0.06);
  color: var(--texto-secundario);
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.dropzone:hover { border-color: var(--morado-brillante); background: rgba(168, 85, 247, 0.12); color: var(--texto-principal); }
.dropzone-cargada { border-style: solid; border-color: var(--color-exito); background: rgba(34, 197, 94, 0.08); }
.dropzone-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin-bottom: 2px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.16);
  color: var(--morado-hover);
}
.dropzone-cargada .dropzone-icono { background: rgba(34, 197, 94, 0.16); color: var(--color-exito); }
.dropzone-texto { font-size: 0.88rem; font-weight: 600; color: var(--texto-principal); word-break: break-word; }
.dropzone-hint { font-size: 0.75rem; color: var(--texto-desactivado); }
.preview-img { width: 100%; height: 170px; object-fit: cover; border-radius: var(--radio-md); margin-top: 12px; border: 1px solid var(--borde-sutil); box-shadow: var(--sombra-tarjeta); }

.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; margin-top: 0.25rem; border-top: 1px solid var(--borde-sutil); }

.estado-vacio {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  color: var(--texto-secundario);
  padding: 3.5rem 2rem;
  background:
    radial-gradient(80% 100% at 50% 0%, rgba(139, 92, 246, 0.08), transparent 70%),
    var(--fondo-tarjeta);
  border: 1px dashed var(--borde-sutil);
  border-radius: var(--radio-lg);
}
.estado-vacio-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 0.5rem;
  border-radius: var(--radio-full);
  color: var(--morado-hover);
  background: var(--fondo-tarjeta-alt);
  box-shadow: var(--sombra-glow);
}
.estado-vacio p { font-weight: 600; color: var(--texto-principal); font-size: 0.98rem; }
.estado-vacio-hint { font-size: 0.85rem; color: var(--texto-desactivado); }

/* Skeletons de carga */
.skeleton-tarjeta { padding: 0; overflow: hidden; border: 1px solid var(--borde-sutil); }
.skeleton-portada { width: 100%; height: 188px; }
.skeleton-cuerpo { padding: 1.25rem 1.4rem 1.4rem; display: flex; flex-direction: column; gap: 12px; }
.skeleton-linea { height: 12px; border-radius: var(--radio-sm); }
.skeleton-brillo {
  background: linear-gradient(100deg, var(--fondo-tarjeta-alt) 30%, rgba(168, 85, 247, 0.15) 50%, var(--fondo-tarjeta-alt) 70%);
  background-size: 200% 100%;
  animation: skeleton-desplazar 1.4s ease-in-out infinite;
}
@keyframes skeleton-desplazar {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Tablet: la barra de control apila pestañas y filtros a ancho completo */
@media (max-width: 720px) {
  .barra-controles { flex-direction: column; align-items: stretch; }
  .tabs-eventos { width: 100%; justify-content: stretch; }
  .tab-evento { flex: 1; justify-content: center; }
  .filtros-barra { width: 100%; }
  .campo-busqueda { flex: 1 1 100%; max-width: none; }
  .select-estado { max-width: none; flex: 1; }
}

/* Celular: encabezado y tarjetas en una sola columna */
@media (max-width: 560px) {
  .vista-eventos { padding: var(--esp-4); }
  .encabezado-fila { flex-direction: column; align-items: stretch; }
  .encabezado-fila .btn-primario { width: 100%; justify-content: center; }
  .encabezado-metricas { gap: var(--esp-5); justify-content: space-between; }
  .grid-eventos { grid-template-columns: 1fr; gap: 1.1rem; }
  .form-fila { grid-template-columns: 1fr; }
  .modal-footer { flex-direction: column-reverse; }
  .modal-footer .btn { width: 100%; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta-evento, .portada-img, .notif-cerrar, .tab-evento { transition: none; }
  .tarjeta-evento:hover .portada-img { transform: none; }
  .skeleton-brillo { animation: none; }
}

.ayuda-campo { display: block; margin-top: 4px; font-size: 0.75rem; color: var(--texto-secundario); }
</style>
