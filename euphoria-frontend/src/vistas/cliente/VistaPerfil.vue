<template>
  <div class="vista-perfil entrada-cine">
    <!-- Orbes de neon ambientales -->
    <span class="orbe-deco morado orbe-1"></span>
    <span class="orbe-deco rosa orbe-2"></span>

    <!-- Encabezado -->
    <header class="hero-perfil">
      <h1 class="titulo-perfil">Mi perfil</h1>
      <p class="sub-hero">Ajusta tus datos, tu recuperación de cuenta y tu contraseña.</p>
    </header>

    <div class="perfil-bento">
      <!-- Columna: identidad (tarjeta hardware) -->
      <aside class="tarjeta-identidad bezel hover-elevar">
        <div class="identidad-core bezel-core textura-grano">
          <!-- Portada y Foto -->
          <div class="portada-contenedor">
            <div class="portada-img"></div>
            <div class="foto-perfil">
              <img v-if="urlFotoActual" :src="urlFotoActual" class="foto-img" />
              <span v-else>{{ iniciales }}</span>

              <button class="btn-editar-foto" type="button" title="Cambiar foto" @click="triggerFileInput"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></button>
              <input type="file" accept="image/*" ref="fileInput" @change="manejarArchivo" style="display: none;" />
            </div>
          </div>

          <div class="info-principal">
            <h3>{{ tienda.usuario?.nombres }} {{ tienda.usuario?.apellidos }}</h3>
            <p class="correo">{{ tienda.usuario?.correo }}</p>
            <span class="chip-cuenta">Cuenta Euphoria</span>
          </div>
        </div>
      </aside>

      <!-- Columna: formularios -->
      <div class="perfil-formularios">
        <!-- Formulario de Datos Personales -->
        <form class="panel-form superficie escalonar" @submit.prevent="guardarDatos">
          <div class="panel-head">
            <span class="panel-kicker">01</span>
            <div>
              <h4 class="subtitulo-form">Datos personales</h4>
              <p class="panel-sub">Toca el lápiz para editar cada campo.</p>
            </div>
          </div>

          <div class="campos-grid">
            <div class="grupo-campo">
              <label>Nombres</label>
              <div class="campo-editable" :class="{ 'editando-activo': editando.nombres }">
                <span v-if="!editando.nombres">{{ form.nombres || 'No especificado' }}</span>
                <input v-else v-model="form.nombres" type="text" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" autofocus>
                <button type="button" class="btn-lapiz" @click="toggleEditar('nombres')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
              </div>
            </div>

            <div class="grupo-campo">
              <label>Apellidos</label>
              <div class="campo-editable" :class="{ 'editando-activo': editando.apellidos }">
                <span v-if="!editando.apellidos">{{ form.apellidos || 'No especificado' }}</span>
                <input v-else v-model="form.apellidos" type="text" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" autofocus>
                <button type="button" class="btn-lapiz" @click="toggleEditar('apellidos')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
              </div>
            </div>

            <div class="grupo-campo">
              <label>CI / carnet (opcional)</label>
              <div class="campo-editable" :class="{ 'editando-activo': editando.ci_carnet }">
                <span v-if="!editando.ci_carnet">{{ form.ci_carnet || 'No especificado' }}</span>
                <input v-else v-model="form.ci_carnet" type="text" class="campo" placeholder="Añade tu número de carnet" autofocus>
                <button type="button" class="btn-lapiz" @click="toggleEditar('ci_carnet')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
              </div>
            </div>

            <div class="grupo-campo">
              <label>Teléfono (opcional)</label>
              <div class="campo-editable" :class="{ 'editando-activo': editando.telefono }">
                <span v-if="!editando.telefono">{{ form.telefono || 'No especificado' }}</span>
                <input v-else v-model="form.telefono" type="tel" class="campo" placeholder="Añade tu número" pattern="[0-9]{8,15}" title="Solo números" autofocus>
                <button type="button" class="btn-lapiz" @click="toggleEditar('telefono')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
              </div>
            </div>
          </div>

          <div v-if="hayCambios" class="acciones-form fade-in">
            <button type="button" class="btn-cancelar" @click="cancelarEdicion" :disabled="cargandoDatos">Cancelar</button>
            <button type="submit" class="btn-guardar-inline brillo-hover" :disabled="cargandoDatos">
              {{ cargandoDatos ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>

          <p v-if="mensajeDatos" class="mensaje exito">{{ mensajeDatos }}</p>
          <p v-if="errorDatos" class="mensaje error">{{ errorDatos }}</p>
        </form>

        <!-- Formulario de Pregunta de Seguridad -->
        <form class="panel-form superficie escalonar" @submit.prevent="guardarSeguridad">
          <div class="panel-head">
            <span class="panel-kicker">02</span>
            <div>
              <h4 class="subtitulo-form">Recuperación de cuenta</h4>
              <p class="panel-sub">Define una pregunta y una respuesta secreta por si olvidas tu contraseña.</p>
            </div>
          </div>

          <div class="grupo-campo">
            <label>Pregunta de seguridad</label>
            <BaseSelect v-model="formSeguridad.pregunta" :options="PREGUNTAS_SEGURIDAD" placeholder="Selecciona una pregunta…" />
          </div>
          <div class="grupo-campo">
            <label>Respuesta secreta</label>
            <input v-model="formSeguridad.respuesta" type="text" class="campo" required placeholder="Escribe tu respuesta" />
          </div>

          <button type="submit" class="btn-guardar btn-secundario brillo-hover" :disabled="cargandoSeguridad">
            {{ cargandoSeguridad ? 'Guardando…' : 'Guardar pregunta' }}
          </button>
          <p v-if="mensajeSeguridad" class="mensaje exito">{{ mensajeSeguridad }}</p>
          <p v-if="errorSeguridad" class="mensaje error">{{ errorSeguridad }}</p>
        </form>

        <!-- Formulario de Contraseña -->
        <form class="panel-form superficie escalonar" @submit.prevent="cambiarPassword">
          <div class="panel-head">
            <span class="panel-kicker">03</span>
            <div>
              <h4 class="subtitulo-form">Seguridad</h4>
              <p class="panel-sub">Cambia tu contraseña cuando lo necesites.</p>
            </div>
          </div>

          <div class="campos-grid">
            <div class="grupo-campo">
              <label>Contraseña actual</label>
              <input v-model="formPass.actual" type="password" class="campo" required placeholder="••••••••">
            </div>
            <div class="grupo-campo">
              <label>Nueva contraseña</label>
              <input v-model="formPass.nueva" type="password" class="campo" required minlength="6" placeholder="••••••••">
            </div>
          </div>

          <button type="submit" class="btn-guardar btn-secundario brillo-hover" :disabled="cargandoPass">
            {{ cargandoPass ? 'Actualizando…' : 'Cambiar contraseña' }}
          </button>
          <p v-if="mensajePass" class="mensaje exito">{{ mensajePass }}</p>
          <p v-if="errorPass" class="mensaje error">{{ errorPass }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import clienteHttp from '@/servicios-api/cliente-http.js' // Usamos el cliente base para peticiones directas
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'

const PREGUNTAS_SEGURIDAD = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad nació tu madre?',
  '¿Cuál es el nombre de tu colegio de primaria?',
  '¿Cuál es tu comida favorita?',
].map(p => ({ value: p, label: p }))

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
  editando.value[campo] = !editando.value[campo]
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

const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024 // 5MB

function manejarArchivo(e) {
  if (e.target.files.length === 0) return

  const archivo = e.target.files[0]
  errorDatos.value = ''

  if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
    errorDatos.value = 'Formato no válido. Usa una imagen JPG, PNG, WEBP o GIF.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    errorDatos.value = 'La imagen es demasiado grande. El tamaño máximo es 5MB.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  archivoImagen.value = archivo
}

async function guardarDatos() {
  cargandoDatos.value = true
  mensajeDatos.value = ''
  errorDatos.value = ''
  try {
    const formData = new FormData()
    formData.append('nombres', form.value.nombres)
    formData.append('apellidos', form.value.apellidos)
    // Enviamos siempre el campo (incluso vacio) para permitir limpiarlo
    formData.append('ci_carnet', form.value.ci_carnet)
    formData.append('telefono', form.value.telefono)
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
    errorDatos.value = error?.error || 'Error al actualizar'
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
    errorPass.value = error?.error || 'Error al cambiar contraseña'
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
    errorSeguridad.value = error?.error || 'Error al guardar pregunta'
  } finally {
    cargandoSeguridad.value = false
  }
}
</script>

<style scoped>
.vista-perfil {
  position: relative;
  padding: var(--esp-6) var(--esp-4) var(--esp-7);
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  box-sizing: border-box;
  overflow: clip;
}

/* Orbes ambientales */
.orbe-1 {
  width: 360px; height: 360px;
  top: -90px; right: -70px;
  opacity: 0.3;
}
.orbe-2 {
  width: 320px; height: 320px;
  bottom: 4%; left: -110px;
  opacity: 0.22;
}

/* ===== Encabezado ===== */
.hero-perfil {
  position: relative;
  z-index: 1;
  margin-bottom: var(--esp-5);
  max-width: 640px;
}
.titulo-perfil {
  margin: 0 0 var(--esp-2);
  font-family: var(--fuente-titulo);
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--texto-principal);
  text-wrap: balance;
}
.sub-hero {
  color: var(--texto-secundario);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 52ch;
  text-wrap: pretty;
}

/* ===== Bento ===== */
.perfil-bento {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(300px, 340px) 1fr;
  gap: var(--esp-5);
  align-items: start;
}

/* ===== Tarjeta identidad (hardware) ===== */
.tarjeta-identidad {
  position: sticky;
  top: var(--esp-5);
}
.identidad-core {
  overflow: hidden;
}

/* Portada y Avatar */
.portada-contenedor {
  position: relative;
  height: 150px;
  background: var(--gradiente-marca-3);
}
.portada-contenedor::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 130% at 15% -20%, rgba(255, 255, 255, 0.35), transparent 55%),
    radial-gradient(100% 120% at 100% 120%, rgba(236, 72, 153, 0.5), transparent 60%);
  pointer-events: none;
}
.foto-perfil {
  position: absolute;
  bottom: -44px;
  left: var(--esp-5);
  width: 100px;
  height: 100px;
  border-radius: 28px;
  background: var(--gradiente-marca);
  border: 4px solid var(--fondo-tarjeta);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--fuente-titulo);
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #fff;
  box-shadow: 0 14px 30px rgba(168, 85, 247, 0.5), var(--sombra-glow);
  z-index: 2;
}
.foto-img {
  width: 100%; height: 100%; border-radius: inherit; object-fit: cover;
}
.btn-editar-foto {
  position: absolute;
  bottom: -6px; right: -6px;
  background: var(--morado-brillante);
  border: 3px solid var(--fondo-tarjeta);
  border-radius: var(--radio-full);
  width: 34px; height: 34px;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.5);
  transition: transform 0.25s var(--ease-rebote), background 0.25s ease, box-shadow 0.25s ease;
}
.btn-editar-foto:hover { background: var(--rosa-acento); transform: scale(1.12) rotate(-4deg); box-shadow: 0 6px 18px rgba(236, 72, 153, 0.6); }
.btn-editar-foto:active { transform: scale(0.9); }
.btn-editar-foto:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.5);
}

.info-principal {
  position: relative;
  z-index: 1;
  text-align: left;
  padding: 62px var(--esp-5) var(--esp-5);
}
.info-principal h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin-bottom: 6px;
  text-wrap: balance;
}
.correo {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  letter-spacing: 0.01em;
  word-break: break-word;
}
.chip-cuenta {
  display: inline-flex;
  align-items: center;
  margin-top: var(--esp-4);
  padding: 5px 12px;
  border-radius: var(--radio-full);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--glass-borde);
}

/* ===== Columna formularios ===== */
.perfil-formularios {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}
.panel-form {
  padding: var(--esp-6);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-3);
  margin-bottom: var(--esp-5);
}
.panel-kicker {
  flex-shrink: 0;
  width: 38px; height: 38px;
  display: grid; place-items: center;
  border-radius: 13px;
  font-family: var(--fuente-titulo);
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}
.subtitulo-form {
  font-family: var(--fuente-titulo);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--texto-principal);
  margin-bottom: 3px;
}
.panel-sub {
  font-size: 0.82rem;
  color: var(--texto-desactivado);
  line-height: 1.4;
  max-width: 48ch;
}

/* Grid de campos */
.campos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--esp-4);
}

.grupo-campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--esp-4);
}
.campos-grid .grupo-campo {
  margin-bottom: 0;
}
.grupo-campo label {
  font-size: 0.74rem;
  color: var(--texto-secundario);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.campo {
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  padding: 12px 14px;
  border-radius: var(--radio-md);
  color: var(--texto-principal);
  font-family: var(--fuente-principal);
  font-size: 0.9rem;
  transition: var(--trans-rapida);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.2);
}
.campo option {
  background: var(--fondo-app);
  color: var(--texto-principal);
}
.campo:hover {
  border-color: var(--borde-activo);
}
.campo:focus {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2), inset 0 1px 1px rgba(0,0,0,0.2);
}
.campo::placeholder {
  color: var(--texto-desactivado);
}

/* Campo editable inline */
.campo-editable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  padding: 10px 10px 10px 14px;
  border-radius: var(--radio-md);
  min-height: 46px;
  transition: var(--trans-normal);
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.2);
}
.campo-editable:hover {
  border-color: var(--borde-activo);
}
.campo-editable.editando-activo {
  border-color: var(--morado-brillante);
  background: rgba(168, 85, 247, 0.12);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
}
.campo-editable span {
  flex: 1;
  color: var(--texto-principal);
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.campo-editable .campo {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0;
  margin-right: 10px;
  box-shadow: none;
}
.campo-editable .campo:focus {
  border: none;
  background: transparent;
  box-shadow: none;
}
.btn-lapiz {
  flex-shrink: 0;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--texto-secundario);
  width: 30px; height: 30px;
  border-radius: var(--radio-sm);
  display: flex; align-items: center; justify-content: center;
  opacity: 0.9;
  transition: var(--trans-rapida);
}
.btn-lapiz:hover {
  opacity: 1;
  color: var(--texto-principal);
  background: rgba(168, 85, 247, 0.22);
  border-color: var(--borde-activo);
  transform: scale(1.08);
}
.btn-lapiz:active { transform: scale(0.92); }
.btn-lapiz:focus-visible {
  outline: none;
  opacity: 1;
  color: var(--morado-hover);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.35);
}

/* Botones */
.btn-guardar {
  width: 100%;
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  padding: 13px;
  border-radius: var(--radio-full);
  font-weight: 700;
  font-family: var(--fuente-principal);
  cursor: pointer;
  margin-top: var(--esp-4);
  box-shadow: 0 8px 22px rgba(168, 85, 247, 0.35);
  transition: var(--trans-normal);
}
.btn-guardar:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-guardar:active { transform: scale(0.97); }
.btn-guardar:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.4), 0 8px 22px rgba(168, 85, 247, 0.35);
}
.btn-guardar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.btn-secundario {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-activo);
  color: var(--morado-hover);
  box-shadow: none;
}
.btn-secundario:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: var(--morado-brillante);
  color: var(--texto-principal);
  box-shadow: var(--glow-morado);
}

.acciones-form {
  display: flex;
  gap: var(--esp-3);
  margin-top: var(--esp-5);
}
.btn-cancelar {
  flex: 1;
  background: transparent;
  border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario);
  padding: 13px;
  border-radius: var(--radio-full);
  font-weight: 600;
  cursor: pointer;
  transition: var(--trans-normal);
}
.btn-cancelar:hover {
  background: rgba(168, 85, 247, 0.08);
  border-color: var(--borde-activo);
  color: var(--texto-principal);
}
.btn-cancelar:active { transform: scale(0.97); }
.btn-cancelar:focus-visible {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.25);
}
.btn-cancelar:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-guardar-inline {
  flex: 2;
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  padding: 13px;
  border-radius: var(--radio-full);
  font-weight: 700;
  font-family: var(--fuente-principal);
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(168, 85, 247, 0.35);
  transition: var(--trans-normal);
}
.btn-guardar-inline:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-guardar-inline:active { transform: scale(0.97); }
.btn-guardar-inline:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.4), 0 8px 22px rgba(168, 85, 247, 0.35);
}
.btn-guardar-inline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.mensaje {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: var(--esp-4);
  padding: 11px 12px;
  border-radius: var(--radio-md);
  animation: subirEntrada 0.35s var(--ease-suave) both;
}
.exito { background: rgba(34, 197, 94, 0.12); color: var(--color-exito); border: 1px solid rgba(34, 197, 94, 0.3); }
.error { background: rgba(239, 68, 68, 0.12); color: var(--color-error); border: 1px solid rgba(239, 68, 68, 0.3); }

/* ===== Responsividad ===== */

/* Colapso del bento a 1 columna */
@media (max-width: 860px) {
  .perfil-bento {
    grid-template-columns: 1fr;
  }
  .tarjeta-identidad {
    position: static;
    max-width: 100%; /* banner de perfil a todo el ancho: sin espacio muerto */
  }
}

/* Tablet */
@media (min-width: 481px) and (max-width: 860px) {
  .vista-perfil {
    padding: var(--esp-5) var(--esp-4) var(--esp-6);
  }
}

/* Celular */
@media (max-width: 560px) {
  .campos-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .campos-grid .grupo-campo {
    margin-bottom: var(--esp-4);
  }
  .campos-grid .grupo-campo:last-child {
    margin-bottom: 0;
  }
}

@media (max-width: 480px) {
  .vista-perfil {
    padding: var(--esp-5) var(--esp-3) var(--esp-6);
  }
  .tarjeta-identidad {
    max-width: 100%;
  }
  .panel-form {
    padding: var(--esp-5) var(--esp-4);
  }
  .btn-lapiz {
    width: 34px; height: 34px;
  }
  .btn-editar-foto {
    width: 36px; height: 36px;
  }
  .acciones-form {
    flex-wrap: wrap;
  }
  .btn-cancelar,
  .btn-guardar-inline {
    min-width: 130px;
    flex: 1;
  }
}

/* Menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .mensaje {
    animation: none;
  }
  .btn-guardar:hover,
  .btn-guardar-inline:hover,
  .btn-cancelar:active,
  .btn-editar-foto:hover,
  .btn-lapiz:hover {
    transform: none;
  }
}
</style>
