<template>
  <div class="vista-eventos fade-in">
    <div class="vista-cabecera">
      <div>
        <h2 class="vista-titulo">Gestión de Eventos</h2>
        <p class="vista-subtitulo">Planifica y activa las fechas de atención del establecimiento</p>
      </div>
      <button class="btn btn-primario" @click="abrirModal()">+ Nuevo Evento</button>
    </div>

    <!-- Filtros -->
    <div class="filtros-barra">
      <input v-model="filtroBusqueda" class="campo" placeholder="🔍 Buscar por nombre..." style="max-width: 300px" />
      <select v-model="filtroEstado" class="campo" style="max-width: 180px">
        <option value="">Todos los estados</option>
        <option value="activo">Activos</option>
        <option value="planificado">Planificados</option>
        <option value="finalizado">Finalizados</option>
      </select>
    </div>

    <!-- Notificacion Sistema Automatico -->
    <Teleport to="body">
      <div v-if="notificacionSistema" class="notif-overlay">
        <div class="notif-card fade-in">
          <div class="notif-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <div class="notif-cuerpo">
            <h4>Notificacion Automatica del Sistema</h4>
            <p>{{ notificacionSistema }}</p>
          </div>
          <button class="notif-cerrar" @click="notificacionSistema = null">Entendido</button>
        </div>
      </div>
    </Teleport>

    <!-- Lista de Eventos -->
    <div class="grid-eventos" v-if="!cargando">
      <div v-if="!eventosFiltrados.length" class="estado-vacio">
        <p>No se encontraron eventos.</p>
      </div>
      
      <div v-for="evento in eventosFiltrados" :key="evento.id_evento" class="tarjeta tarjeta-evento fade-in">
        <div class="portada-contenedor">
          <img v-if="evento.url_portada" :src="evento.url_portada" class="portada-img" alt="Portada Evento" />
          <div v-else class="portada-placeholder">Sin Portada</div>
          <span :class="['badge-estado', 'estado-' + evento.estado]">{{ evento.estado.toUpperCase() }}</span>
        </div>
        
        <div class="evento-info">
          <h3 class="evento-nombre">{{ evento.nombre_evento }}</h3>
          <p class="evento-fecha">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {{ formatearFecha(evento.fecha_hora_inicio) }}
          </p>
          <p class="evento-desc">{{ evento.descripcion || 'Sin descripción' }}</p>
          
          <div class="acciones">
            <button class="btn btn-sm btn-secundario" @click="abrirModal(evento)">Editar</button>
            <button class="btn btn-sm btn-primario" @click="iniciarCambioEstado(evento)">Estado</button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="cargando">
      <p>Cargando eventos...</p>
    </div>

    <!-- Modal Formulario -->
    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>{{ eventoEditando ? 'Editar Evento' : 'Nuevo Evento' }}</h3>
            <button class="btn-x" @click="cerrarModal">✕</button>
          </div>
          
          <form class="modal-form" @submit.prevent="guardarEvento">
            <div class="grupo-campo">
              <label class="etiqueta">Nombre del Evento *</label>
              <input v-model="form.nombre_evento" class="campo" required placeholder="Ej. Fiesta Neón Sábado" />
            </div>

            <div class="form-fila">
              <div class="grupo-campo">
                <label class="etiqueta">Fecha y Hora de Inicio *</label>
                <input v-model="form.fecha_hora_inicio" type="datetime-local" class="campo" required />
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Fecha y Hora de Fin (Opcional)</label>
                <input v-model="form.fecha_hora_fin" type="datetime-local" class="campo" />
              </div>
            </div>

            <div class="grupo-campo">
              <label class="etiqueta">Descripción</label>
              <textarea v-model="form.descripcion" class="campo textarea" rows="3" placeholder="Detalles del evento, artistas, temática..."></textarea>
            </div>

            <div class="grupo-campo">
              <label class="etiqueta">Imagen de Portada (Flyer)</label>
              <div class="subida-imagen">
                <input type="file" ref="inputArchivo" accept="image/*" @change="manejarArchivo" class="input-file" id="file-evento" />
                <label for="file-evento" class="btn btn-sm btn-secundario">
                  {{ archivoSeleccionado ? archivoSeleccionado.name : 'Seleccionar Imagen...' }}
                </label>
              </div>
              <img v-if="previewImagen" :src="previewImagen" class="preview-img" alt="Vista previa" />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secundario" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primario" :disabled="guardando">
                {{ guardando ? 'Guardando...' : (eventoEditando ? 'Guardar Cambios' : 'Planificar Evento') }}
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
            <h3>Cambiar Estado del Evento</h3>
          </div>
          <div style="padding: 1rem 1.5rem 1.5rem 1.5rem;">
            <p style="color: var(--texto-secundario); font-size: 0.9rem; margin-bottom: 1.5rem;">
              Selecciona el nuevo estado para el evento: <strong>{{ eventoParaEstado?.nombre_evento }}</strong>
            </p>
            
            <select v-model="nuevoEstadoSeleccionado" class="campo" style="margin-bottom: 1.5rem; text-align: center;">
              <option value="planificado">Planificado</option>
              <option value="activo">Activo</option>
              <option value="finalizado">Finalizado</option>
            </select>

            <div style="display: flex; gap: 10px; justify-content: center;">
              <button class="btn btn-secundario" style="flex: 1;" @click="modalEstado=false">Cancelar</button>
              <button class="btn btn-primario" style="flex: 1;" @click="confirmarCambioEstado">Guardar Estado</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { servicioEventos } from '@/servicios-api/servicio-eventos.js'

// Estado
const eventos = ref([])
const cargando = ref(false)
const guardando = ref(false)
const filtroBusqueda = ref('')
const filtroEstado = ref('')
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
  fecha_hora_fin: ''
})

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

onMounted(() => {
  cargarEventos()
})

// Filtros
const eventosFiltrados = computed(() => {
  return eventos.value.filter(e => {
    const matchNombre = e.nombre_evento.toLowerCase().includes(filtroBusqueda.value.toLowerCase())
    const matchEstado = filtroEstado.value ? e.estado === filtroEstado.value : true
    return matchNombre && matchEstado
  })
})

// Utilidades
function formatearFecha(fechaStr) {
  if (!fechaStr) return ''
  const opciones = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  return new Date(fechaStr).toLocaleDateString('es-ES', opciones)
}

function formatearFechaParaInput(fechaStr) {
  if (!fechaStr) return ''
  const date = new Date(fechaStr)
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
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
  } else {
    form.nombre_evento = ''
    form.descripcion = ''
    form.fecha_hora_inicio = ''
    form.fecha_hora_fin = ''
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
    
    if (archivoSeleccionado.value) {
      formData.append('imagen', archivoSeleccionado.value)
    }

    if (eventoEditando.value) {
      await servicioEventos.editar(eventoEditando.value.id_evento, formData)
    } else {
      await servicioEventos.crear(formData)
    }
    
    cerrarModal()
    cargarEventos()
  } catch (error) {
    alert('Error al guardar el evento: ' + (error.error || error.message))
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

async function confirmarCambioEstado() {
  if (!eventoParaEstado.value || !nuevoEstadoSeleccionado.value) return
  
  try {
    await servicioEventos.cambiarEstado(eventoParaEstado.value.id_evento, nuevoEstadoSeleccionado.value)
    modalEstado.value = false
    cargarEventos()
  } catch (error) {
    alert('Error al cambiar el estado del evento')
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
.notif-cerrar { background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); border: none; color: #fff; cursor: pointer; padding: 13px 35px; border-radius: 25px; font-weight: 700; font-size: 1rem; margin-top: 10px; transition: 0.2s; width: 100%; max-width: 240px; }
.notif-cerrar:hover { opacity: 0.85; transform: translateY(-1px); }

.vista-cabecera { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
.vista-titulo { font-size: 1.4rem; margin-bottom: 0.2rem; }
.vista-subtitulo { color: var(--texto-secundario); font-size: 0.85rem; }
.filtros-barra { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }

/* Grid de Eventos */
.grid-eventos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.tarjeta-evento {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.portada-contenedor {
  position: relative;
  width: 100%;
  height: 180px;
  background: var(--fondo-oscuro);
}

.portada-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.portada-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  font-weight: 600;
  letter-spacing: 2px;
  opacity: 0.8;
}

.badge-estado {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.estado-activo { background: var(--color-exito); color: #000; }
.estado-planificado { background: var(--morado-brillante); color: #fff; }
.estado-finalizado { background: var(--texto-desactivado); color: #fff; }

.evento-info {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.evento-nombre {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.evento-fecha {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--color-primario);
  margin-bottom: 0.5rem;
  font-weight: 500;
}
.icono { width: 14px; height: 14px; }

.evento-desc {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  margin-bottom: 1.5rem;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.acciones {
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

/* Modales */
.modal-fondo { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); width: 100%; max-width: 520px; box-shadow: var(--sombra-modal); max-height: 90vh; overflow-y: auto; }
.modal-cabecera { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--borde-sutil); }
.modal-cabecera h3 { font-size: 1.1rem; }
.btn-x { background: none; border: none; color: var(--texto-secundario); font-size: 1.1rem; cursor: pointer; }
.btn-x:hover { color: var(--color-error); }

.modal-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.form-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.grupo-campo { display: flex; flex-direction: column; gap: 6px; }
.etiqueta { font-size: 0.8rem; color: var(--texto-secundario); font-weight: 500; }
.textarea { resize: vertical; min-height: 80px; }

.subida-imagen { display: flex; align-items: center; gap: 10px; }
.input-file { display: none; }
.preview-img { width: 100%; height: 160px; object-fit: cover; border-radius: var(--radio-md); margin-top: 10px; border: 1px solid var(--borde-sutil); }

.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; }

.estado-vacio { grid-column: 1 / -1; text-align: center; color: var(--texto-desactivado); padding: 3rem; background: var(--fondo-tarjeta); border-radius: var(--radio-lg); }
.cargando { text-align: center; color: var(--texto-secundario); padding: 2rem; }

@media(max-width: 500px) { .form-fila { grid-template-columns: 1fr; } }
</style>
