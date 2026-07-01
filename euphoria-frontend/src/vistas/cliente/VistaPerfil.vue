<template>
  <div class="vista-perfil fade-in">
    <div class="header-perfil">
      <h2 class="titulo-seccion">Mi Perfil</h2>
    </div>

    <div class="tarjeta-perfil">
      <!-- Portada y Foto -->
      <div class="portada-contenedor">
        <!-- Placeholder Portada -->
        <div class="portada-img"></div>
        <div class="foto-perfil">
          <img v-if="urlFotoActual" :src="urlFotoActual" class="foto-img" />
          <span v-else>{{ iniciales }}</span>
          
          <button class="btn-editar-foto" title="Cambiar foto" @click="triggerFileInput">📷</button>
          <input type="file" accept="image/*" ref="fileInput" @change="manejarArchivo" style="display: none;" />
        </div>
      </div>

      <div class="info-principal">
        <h3>{{ tienda.usuario?.nombres }} {{ tienda.usuario?.apellidos }}</h3>
        <p class="correo">{{ tienda.usuario?.correo }}</p>
      </div>

      <!-- Formulario de Datos Personales -->
      <form class="formulario-perfil" @submit.prevent="guardarDatos">
        <h4 class="subtitulo-form">Datos Personales</h4>
        
        <div class="grupo-campo">
          <label>Nombres</label>
          <div class="campo-editable" :class="{ 'editando-activo': editando.nombres }">
            <span v-if="!editando.nombres">{{ form.nombres || 'No especificado' }}</span>
            <input v-else v-model="form.nombres" type="text" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" autofocus>
            <button type="button" class="btn-lapiz" @click="toggleEditar('nombres')" title="Editar">✏️</button>
          </div>
        </div>
        
        <div class="grupo-campo">
          <label>Apellidos</label>
          <div class="campo-editable" :class="{ 'editando-activo': editando.apellidos }">
            <span v-if="!editando.apellidos">{{ form.apellidos || 'No especificado' }}</span>
            <input v-else v-model="form.apellidos" type="text" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" autofocus>
            <button type="button" class="btn-lapiz" @click="toggleEditar('apellidos')" title="Editar">✏️</button>
          </div>
        </div>
        
        <div class="grupo-campo">
          <label>CI / Carnet (Opcional)</label>
          <div class="campo-editable" :class="{ 'editando-activo': editando.ci_carnet }">
            <span v-if="!editando.ci_carnet">{{ form.ci_carnet || 'No especificado' }}</span>
            <input v-else v-model="form.ci_carnet" type="text" class="campo" placeholder="Añade tu número de carnet" autofocus>
            <button type="button" class="btn-lapiz" @click="toggleEditar('ci_carnet')" title="Editar">✏️</button>
          </div>
        </div>
        
        <div class="grupo-campo">
          <label>Teléfono (Opcional)</label>
          <div class="campo-editable" :class="{ 'editando-activo': editando.telefono }">
            <span v-if="!editando.telefono">{{ form.telefono || 'No especificado' }}</span>
            <input v-else v-model="form.telefono" type="tel" class="campo" placeholder="Añade tu número" pattern="[0-9]{8,15}" title="Solo números" autofocus>
            <button type="button" class="btn-lapiz" @click="toggleEditar('telefono')" title="Editar">✏️</button>
          </div>
        </div>

        <div v-if="hayCambios" class="acciones-form fade-in">
          <button type="button" class="btn-cancelar" @click="cancelarEdicion" :disabled="cargandoDatos">Cancelar</button>
          <button type="submit" class="btn-guardar-inline" :disabled="cargandoDatos">
            {{ cargandoDatos ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
        
        <p v-if="mensajeDatos" class="mensaje exito">{{ mensajeDatos }}</p>
        <p v-if="errorDatos" class="mensaje error">{{ errorDatos }}</p>
      </form>

      <!-- Formulario de Pregunta de Seguridad -->
      <form class="formulario-perfil" @submit.prevent="guardarSeguridad" style="margin-top: 2rem;">
        <h4 class="subtitulo-form">Recuperación de Cuenta</h4>
        <p class="texto-ayuda">Establece una pregunta y respuesta secreta por si olvidas tu contraseña.</p>

        <div class="grupo-campo">
          <label>Pregunta de Seguridad</label>
          <select v-model="formSeguridad.pregunta" class="campo" required>
            <option value="" disabled>Selecciona una pregunta...</option>
            <option value="¿Cuál es el nombre de tu primera mascota?">¿Cuál es el nombre de tu primera mascota?</option>
            <option value="¿En qué ciudad nació tu madre?">¿En qué ciudad nació tu madre?</option>
            <option value="¿Cuál es el nombre de tu colegio de primaria?">¿Cuál es el nombre de tu colegio de primaria?</option>
            <option value="¿Cuál es tu comida favorita?">¿Cuál es tu comida favorita?</option>
          </select>
        </div>
        <div class="grupo-campo">
          <label>Respuesta Secreta</label>
          <input v-model="formSeguridad.respuesta" type="text" class="campo" required placeholder="Escribe tu respuesta..." />
        </div>

        <button type="submit" class="btn-guardar btn-secundario" :disabled="cargandoSeguridad">
          {{ cargandoSeguridad ? 'Guardando...' : 'Guardar Pregunta' }}
        </button>
        <p v-if="mensajeSeguridad" class="mensaje exito">{{ mensajeSeguridad }}</p>
        <p v-if="errorSeguridad" class="mensaje error">{{ errorSeguridad }}</p>
      </form>

      <!-- Formulario de Contraseña -->
      <form class="formulario-perfil" @submit.prevent="cambiarPassword" style="margin-top: 2rem;">
        <h4 class="subtitulo-form">Seguridad</h4>
        
        <div class="grupo-campo">
          <label>Contraseña Actual</label>
          <input v-model="formPass.actual" type="password" class="campo" required placeholder="••••••••">
        </div>
        <div class="grupo-campo">
          <label>Nueva Contraseña</label>
          <input v-model="formPass.nueva" type="password" class="campo" required minlength="6" placeholder="••••••••">
        </div>

        <button type="submit" class="btn-guardar btn-secundario" :disabled="cargandoPass">
          {{ cargandoPass ? 'Actualizando...' : 'Cambiar Contraseña' }}
        </button>
        <p v-if="mensajePass" class="mensaje exito">{{ mensajePass }}</p>
        <p v-if="errorPass" class="mensaje error">{{ errorPass }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import clienteHttp from '@/servicios-api/cliente-http.js' // Usamos el cliente base para peticiones directas

const tienda = useTiendaAutenticacion()
const fileInput = ref(null)
const archivoImagen = ref(null)

const urlFotoActual = computed(() => {
  if (archivoImagen.value) {
    return URL.createObjectURL(archivoImagen.value)
  }
  return tienda.usuario?.url_foto_perfil || tienda.usuario?.foto || null
})

const iniciales = computed(() => {
  const n = tienda.usuario?.nombres || ''
  return n.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
})

const form = ref({
  nombres: tienda.usuario?.nombres || '',
  apellidos: tienda.usuario?.apellidos || '',
  ci_carnet: tienda.usuario?.ci_carnet || '',
  telefono: tienda.usuario?.telefono || ''
})

const originalForm = ref({ ...form.value })

const editando = ref({
  nombres: false,
  apellidos: false,
  ci_carnet: false,
  telefono: false
})

const hayCambios = computed(() => {
  return form.value.nombres !== originalForm.value.nombres ||
         form.value.apellidos !== originalForm.value.apellidos ||
         form.value.ci_carnet !== originalForm.value.ci_carnet ||
         form.value.telefono !== originalForm.value.telefono ||
         archivoImagen.value !== null
})

function toggleEditar(campo) {
  editando.value[campo] = true
}

function cancelarEdicion() {
  form.value = { ...originalForm.value }
  editando.value = { nombres: false, apellidos: false, ci_carnet: false, telefono: false }
  archivoImagen.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const formPass = ref({
  actual: '',
  nueva: ''
})

const formSeguridad = ref({
  pregunta: tienda.usuario?.pregunta_seguridad || '',
  respuesta: '' // No mostramos la respuesta en texto claro por seguridad
})

const cargandoDatos = ref(false)
const mensajeDatos = ref('')
const errorDatos = ref('')

const cargandoPass = ref(false)
const mensajePass = ref('')
const errorPass = ref('')

const cargandoSeguridad = ref(false)
const mensajeSeguridad = ref('')
const errorSeguridad = ref('')

function triggerFileInput() {
  fileInput.value.click()
}

function manejarArchivo(e) {
  if (e.target.files.length > 0) {
    archivoImagen.value = e.target.files[0]
  }
}

async function guardarDatos() {
  cargandoDatos.value = true
  mensajeDatos.value = ''
  errorDatos.value = ''
  try {
    const formData = new FormData()
    formData.append('nombres', form.value.nombres)
    formData.append('apellidos', form.value.apellidos)
    if (form.value.ci_carnet) formData.append('ci_carnet', form.value.ci_carnet)
    if (form.value.telefono) formData.append('telefono', form.value.telefono)
    if (archivoImagen.value) formData.append('imagen', archivoImagen.value)

    const res = await clienteHttp.put('/usuarios/perfil', formData)
    
    mensajeDatos.value = res.mensaje
    
    // Actualizar el store de autenticación con los nuevos datos
    const usuarioActualizado = res.usuario
    const token = localStorage.getItem('euphoria_token')
    tienda.iniciarSesion({ usuario: usuarioActualizado, token })
    
    // Actualizar originales y cerrar edición
    originalForm.value = { ...form.value }
    editando.value = { nombres: false, apellidos: false, ci_carnet: false, telefono: false }
    archivoImagen.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (error) {
    errorDatos.value = error.response?.data?.error || 'Error al actualizar'
  } finally {
    cargandoDatos.value = false
  }
}

async function cambiarPassword() {
  cargandoPass.value = true
  mensajePass.value = ''
  errorPass.value = ''
  try {
    const payload = { passwordActual: formPass.value.actual, passwordNuevo: formPass.value.nueva }
    const res = await clienteHttp.put('/usuarios/perfil/password', payload)
    mensajePass.value = res.mensaje
    formPass.value.actual = ''
    formPass.value.nueva = ''
  } catch (error) {
    errorPass.value = error.response?.data?.error || 'Error al cambiar contraseña'
  } finally {
    cargandoPass.value = false
  }
}

async function guardarSeguridad() {
  cargandoSeguridad.value = true
  mensajeSeguridad.value = ''
  errorSeguridad.value = ''
  try {
    const res = await clienteHttp.put('/usuarios/perfil/seguridad', formSeguridad.value)
    mensajeSeguridad.value = res.mensaje
    // Opcional: actualizar el store si envían la pregunta actualizada
    const usuarioActualizado = res.usuario
    if (usuarioActualizado) {
      const token = localStorage.getItem('euphoria_token')
      tienda.iniciarSesion({ usuario: usuarioActualizado, token })
    }
    formSeguridad.value.respuesta = '' // Limpiar campo
  } catch (error) {
    errorSeguridad.value = error.response?.data?.error || 'Error al guardar pregunta'
  } finally {
    cargandoSeguridad.value = false
  }
}
</script>

<style scoped>
.vista-perfil {
  padding: 1rem;
}
.header-perfil {
  margin-bottom: 1rem;
}
.titulo-seccion {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--texto-principal);
}

.tarjeta-perfil {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

/* Portada y Avatar */
.portada-contenedor {
  position: relative;
  height: 120px;
  background: linear-gradient(135deg, rgba(74,44,143,0.5), rgba(219,39,119,0.3));
  border-bottom: 1px solid var(--borde-sutil);
}
.foto-perfil {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border: 4px solid var(--fondo-tarjeta);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  overflow: visible; /* para el boton flotante */
}
.foto-img {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
}
.btn-editar-foto {
  position: absolute;
  bottom: 0; right: -5px;
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  border-radius: 50%;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  transition: 0.2s;
}
.btn-editar-foto:active { transform: scale(0.9); }

.info-principal {
  text-align: center;
  margin-top: 45px;
  padding: 0 1rem 1.5rem 1rem;
  border-bottom: 1px solid var(--borde-sutil);
}
.info-principal h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 2px;
}
.correo {
  font-size: 0.85rem;
  color: var(--texto-secundario);
}

/* Formularios */
.formulario-perfil {
  padding: 1.5rem;
}
.subtitulo-form {
  font-size: 1rem;
  font-weight: 600;
  color: var(--morado-brillante);
  margin-bottom: 1rem;
}

.grupo-campo {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 1rem;
}
.grupo-campo label {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  font-weight: 500;
}
.texto-ayuda {
  font-size: 0.85rem;
  color: var(--texto-desactivado);
  margin-bottom: 1.2rem;
  line-height: 1.4;
}
.campo {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 10px 12px;
  border-radius: 12px;
  color: #fff;
  font-size: 0.9rem;
  transition: 0.3s;
}
/* Estilo para las opciones del select en navegadores que lo permitan */
.campo option {
  background: var(--fondo-app);
  color: #fff;
}
.campo:focus {
  outline: none;
  border-color: var(--morado-brillante);
  background: rgba(255,255,255,0.05);
}

.btn-guardar {
  width: 100%;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: 0.2s;
}
.btn-guardar:active { transform: scale(0.97); }
.btn-secundario {
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
}

.campo-editable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 10px 12px;
  border-radius: 12px;
  min-height: 42px;
  transition: all 0.3s ease;
}
.campo-editable.editando-activo {
  border-color: var(--morado-brillante);
  background: rgba(255,255,255,0.06);
  box-shadow: 0 0 8px rgba(155, 89, 182, 0.4);
}
.campo-editable span {
  flex: 1;
  color: #fff;
  font-size: 0.95rem;
}
.campo-editable .campo {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0;
  margin-right: 10px;
}
.campo-editable .campo:focus {
  border: none;
  background: transparent;
}
.btn-lapiz {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  opacity: 0.7;
  transition: 0.2s;
  padding: 5px;
}
.btn-lapiz:hover {
  opacity: 1;
  transform: scale(1.1);
}

.acciones-form {
  display: flex;
  gap: 10px;
  margin-top: 1rem;
}
.btn-cancelar {
  flex: 1;
  background: transparent;
  border: 1px solid var(--texto-secundario);
  color: var(--texto-secundario);
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}
.btn-cancelar:hover {
  background: rgba(255,255,255,0.05);
  color: #fff;
}
.btn-guardar-inline {
  flex: 1;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}
.btn-guardar-inline:active { transform: scale(0.97); }

.mensaje {
  text-align: center;
  font-size: 0.85rem;
  margin-top: 10px;
  padding: 8px;
  border-radius: 8px;
}
.exito { background: rgba(46,204,113,0.1); color: var(--color-exito); }
.error { background: rgba(231,76,60,0.1); color: var(--color-error); }
</style>
