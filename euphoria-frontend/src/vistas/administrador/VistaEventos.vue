<template>
  <div class="vista-eventos fade-in">
    <div class="vista-cabecera">
      <div>
        <h2 class="vista-titulo">Gestión de eventos</h2>
        <p class="vista-subtitulo">Planifica y activa las fechas de atención del establecimiento</p>
      </div>
      <button class="btn btn-primario brillo-hover" @click="abrirModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="btn-icono"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Nuevo evento
      </button>
    </div>

    <!-- Filtros -->
    <div class="filtros-barra">
      <div class="campo-busqueda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icono-busqueda"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="filtroBusqueda" class="campo campo-con-icono" placeholder="Buscar por nombre..." />
      </div>
      <select v-model="filtroEstado" class="campo select-estado">
        <option value="">Todos los estados</option>
        <option value="activo">Activos</option>
        <option value="planificado">Planificados</option>
      </select>
    </div>

    <!-- Pestañas: eventos actuales vs pasados (finalizados) -->
    <div class="tabs-eventos">
      <button class="tab-evento" :class="{ activo: pestana === 'actuales' }" @click="cambiarPestana('actuales')" type="button">
        Actuales <span class="tab-contador">{{ eventosActuales.length }}</span>
      </button>
      <button class="tab-evento" :class="{ activo: pestana === 'pasados' }" @click="cambiarPestana('pasados')" type="button">
        Pasados <span class="tab-contador">{{ eventosPasados.length }}</span>
      </button>
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

      <div v-for="evento in eventosPaginados" :key="evento.id_evento" class="tarjeta tarjeta-interactiva tarjeta-evento hover-elevar aparecer-subir">
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
            <div class="grupo-campo">
              <label class="etiqueta">Nombre del evento *</label>
              <input v-model="form.nombre_evento" class="campo" required placeholder="Ej. Fiesta Neón Sábado" />
            </div>

            <div class="form-fila">
              <div class="grupo-campo">
                <label class="etiqueta">Fecha y hora de inicio *</label>
                <input v-model="form.fecha_hora_inicio" type="datetime-local" class="campo" required />
              </div>
              <div class="grupo-campo">
                <label class="etiqueta">Fecha y hora de fin (opcional)</label>
                <input v-model="form.fecha_hora_fin" type="datetime-local" class="campo" />
              </div>
            </div>

            <div class="grupo-campo">
              <label class="etiqueta">Descripción</label>
              <textarea v-model="form.descripcion" class="campo textarea" rows="3" placeholder="Detalles del evento, artistas, temática..."></textarea>
            </div>

            <div class="grupo-campo">
              <label class="etiqueta">Imagen de portada (flyer)</label>
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
            <h3>Cambiar estado del evento</h3>
          </div>
          <div style="padding: 1rem 1.5rem 1.5rem 1.5rem;">
            <p style="color: var(--texto-secundario); font-size: 0.9rem; margin-bottom: 1.5rem;">
              Selecciona el nuevo estado para el evento: <strong>{{ eventoParaEstado?.nombre_evento }}</strong>
            </p>
            
            <select v-model="nuevoEstadoSeleccionado" class="campo" style="margin-bottom: 1.5rem; text-align: center;">
              <option value="planificado" :disabled="estadoDeshabilitado('planificado')">Planificado</option>
              <option value="activo" :disabled="estadoDeshabilitado('activo')">Activo</option>
              <option value="finalizado" :disabled="estadoDeshabilitado('finalizado')">Finalizado</option>
            </select>

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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Paginacion from '@/componentes/comunes/Paginacion.vue'
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

// Pestañas Actuales / Pasados (finalizados) + paginación
const pestana = ref('actuales')
const pagina = ref(1)
const limite = ref(12)

const eventosActuales = computed(() => eventosFiltrados.value.filter(e => e.estado !== 'finalizado'))
const eventosPasados  = computed(() => eventosFiltrados.value.filter(e => e.estado === 'finalizado'))
const listaActiva = computed(() => pestana.value === 'pasados' ? eventosPasados.value : eventosActuales.value)
const eventosPaginados = computed(() => {
  const ini = (pagina.value - 1) * limite.value
  return listaActiva.value.slice(ini, ini + limite.value)
})

function cambiarPestana(p) {
  pestana.value = p
  pagina.value = 1
}
watch([filtroBusqueda, filtroEstado], () => { pagina.value = 1 })

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
  // No reactivar/replanificar un evento cuya fecha ya paso.
  if (eventoExpirado.value && (destino === 'activo' || destino === 'planificado')) return true
  // Un evento finalizado no debe volver a planificado/activo (cierre definitivo).
  if (ev.estado === 'finalizado' && (destino === 'activo' || destino === 'planificado')) return true
  return false
}

async function confirmarCambioEstado() {
  if (!eventoParaEstado.value || !nuevoEstadoSeleccionado.value) return

  // Bloquear transiciones incoherentes tambien a nivel de accion.
  if (estadoDeshabilitado(nuevoEstadoSeleccionado.value)) {
    alert('Esa transición de estado no es válida para este evento.')
    return
  }

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
.notif-cerrar { background: var(--gradiente-marca); border: none; color: #fff; cursor: pointer; padding: 13px 35px; border-radius: var(--radio-full); font-weight: 700; font-size: 1rem; margin-top: 10px; transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease, filter 0.2s ease; width: 100%; max-width: 240px; box-shadow: 0 8px 24px rgba(168, 85, 247, 0.35); }
.notif-cerrar:hover { filter: brightness(1.08); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(168, 85, 247, 0.5); }
.notif-cerrar:active { transform: translateY(0); box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35); }
.notif-cerrar:focus-visible { outline: 2px solid var(--morado-hover); outline-offset: 3px; }

.vista-eventos { padding: var(--esp-6); max-width: 1400px; margin: 0 auto; }
.vista-cabecera { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--esp-5); gap: var(--esp-4); flex-wrap: wrap; }
.vista-titulo { font-family: var(--fuente-titulo); font-size: 1.7rem; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.25rem; line-height: 1.1; }
.vista-subtitulo { color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; max-width: 52ch; }
.vista-cabecera .btn-primario { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.btn-icono { flex-shrink: 0; margin-top: -1px; }

.filtros-barra { display: flex; gap: var(--esp-3); margin-bottom: var(--esp-5); flex-wrap: wrap; }
.campo-busqueda { position: relative; flex: 1 1 260px; max-width: 320px; }
.icono-busqueda { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--texto-desactivado); pointer-events: none; transition: color 0.2s ease; }
.campo-busqueda:focus-within .icono-busqueda { color: var(--morado-hover); }
.campo-con-icono { padding-left: 38px; width: 100%; }
.select-estado { max-width: 190px; }

/* Pestañas Actuales / Pasados */
.tabs-eventos {
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--borde-sutil);
  padding-bottom: 2px;
}
.tab-evento {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--texto-secundario);
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-evento:hover { color: var(--texto-principal); }
.tab-evento:focus-visible { outline: 2px solid var(--borde-activo); outline-offset: 2px; border-radius: var(--radio-sm); }
.tab-evento:active { transform: translateY(1px); }
.tab-evento.activo {
  color: var(--rosa-acento);
  border-bottom-color: var(--rosa-acento);
  text-shadow: 0 0 18px rgba(236, 72, 153, 0.4);
}
.tab-contador {
  min-width: 22px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--fondo-tarjeta-alt);
  color: var(--texto-secundario);
  font-size: 0.75rem;
  font-weight: 700;
}
.tab-evento.activo .tab-contador {
  background: var(--rosa-acento);
  color: #fff;
}

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
  border: 1px solid var(--borde-sutil);
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, border-color 0.25s ease;
}
.tarjeta-evento:hover {
  border-color: var(--borde-activo);
  box-shadow: 0 16px 40px rgba(11, 6, 30, 0.6), 0 0 0 1px rgba(168, 85, 247, 0.12), var(--sombra-glow);
}

.portada-contenedor {
  position: relative;
  width: 100%;
  height: 184px;
  background: var(--fondo-oscuro);
  overflow: hidden;
}

.portada-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
}
.tarjeta-evento:hover .portada-img { transform: scale(1.05); }
.portada-contenedor::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(14, 8, 33, 0.55), transparent 55%);
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
  padding: 5px 12px;
  border-radius: var(--radio-full);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18);
}

.estado-activo { background: var(--color-exito); color: #062e16; }
.estado-planificado { background: var(--gradiente-marca); color: #fff; }
.estado-finalizado { background: var(--texto-desactivado); color: #fff; }

.evento-info {
  padding: 1.35rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.evento-nombre {
  font-family: var(--fuente-titulo);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.25;
  margin-bottom: 0.55rem;
  text-wrap: balance;
}

.evento-fecha {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  color: var(--morado-hover);
  margin-bottom: 0.6rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.icono { width: 14px; height: 14px; flex-shrink: 0; }

.evento-desc {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  line-height: 1.55;
  margin-bottom: 1.5rem;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-wrap: pretty;
}

.acciones {
  display: flex;
  gap: 10px;
  margin-top: auto;
}
.acciones .btn { flex: 1; }

/* Modales */
.modal-fondo { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); width: 100%; max-width: 520px; box-shadow: var(--sombra-modal); max-height: 90vh; overflow-y: auto; }
.modal-cabecera { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--borde-sutil); }
.modal-cabecera h3 { font-family: var(--fuente-titulo); font-size: 1.15rem; font-weight: 700; letter-spacing: -0.015em; }
.btn-x { display: inline-flex; align-items: center; justify-content: center; background: none; border: none; color: var(--texto-secundario); cursor: pointer; width: 34px; height: 34px; border-radius: var(--radio-md); transition: color 0.2s ease, background 0.2s ease; }
.btn-x:hover { color: var(--texto-principal); background: var(--fondo-tarjeta-alt); }
.btn-x:focus-visible { outline: 2px solid var(--borde-activo); outline-offset: 2px; }

.modal-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.form-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.grupo-campo { display: flex; flex-direction: column; gap: 7px; }
.etiqueta { font-size: 0.8rem; color: var(--texto-secundario); font-weight: 600; letter-spacing: 0.01em; }
.textarea { resize: vertical; min-height: 80px; }

.subida-imagen { display: flex; align-items: center; gap: 10px; }
.input-file { display: none; }
.preview-img { width: 100%; height: 160px; object-fit: cover; border-radius: var(--radio-md); margin-top: 10px; border: 1px solid var(--borde-sutil); box-shadow: var(--sombra-tarjeta); }

.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.75rem; margin-top: 0.25rem; border-top: 1px solid var(--borde-sutil); }

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
.skeleton-portada { width: 100%; height: 184px; }
.skeleton-cuerpo { padding: 1.35rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 12px; }
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

@media(max-width: 500px) { .form-fila { grid-template-columns: 1fr; } }

@media (prefers-reduced-motion: reduce) {
  .tarjeta-evento, .portada-img, .notif-cerrar { transition: none; }
  .tarjeta-evento:hover .portada-img { transform: none; }
  .skeleton-brillo { animation: none; }
}
</style>
