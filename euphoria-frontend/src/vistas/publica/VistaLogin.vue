<template>
  <div class="login-pagina">
    <!-- Fondo animado -->
    <div class="fondo-orbes">
      <div class="orbe orbe-1"></div>
      <div class="orbe orbe-2"></div>
      <div class="orbe orbe-3"></div>
    </div>

    <div class="login-contenedor fade-in">
      <!-- Logo y bienvenida -->
      <div class="login-cabecera">
        <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="logo" />
      </div>

      <div class="tabs-auth">
        <button :class="['tab-btn', !esRegistro ? 'activo' : '']" @click="esRegistro = false; error = ''">Iniciar Sesión</button>
        <button :class="['tab-btn', esRegistro ? 'activo' : '']" @click="esRegistro = true; error = ''">Registrarme</button>
      </div>

      <!-- Formulario -->
      <form class="login-form" @submit.prevent="manejarSubmit">
        
        <template v-if="esRegistro">
          <div class="grupo-campo">
            <label class="etiqueta">Nombres</label>
            <input v-model="formulario.nombres" type="text" class="campo" placeholder="Tus nombres" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras permitidas" />
          </div>
          <div class="grupo-campo">
            <label class="etiqueta">Apellidos</label>
            <input v-model="formulario.apellidos" type="text" class="campo" placeholder="Tus apellidos" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras permitidas" />
          </div>
          <div class="grupo-campo">
            <label class="etiqueta">Pregunta de Seguridad</label>
            <select v-model="formulario.pregunta_seguridad" class="campo" required>
              <option value="" disabled>Selecciona una pregunta...</option>
              <option value="¿Cuál es el nombre de tu primera mascota?">¿Cuál es el nombre de tu primera mascota?</option>
              <option value="¿En qué ciudad nació tu madre?">¿En qué ciudad nació tu madre?</option>
              <option value="¿Cuál es el nombre de tu colegio de primaria?">¿Cuál es el nombre de tu colegio de primaria?</option>
              <option value="¿Cuál es tu comida favorita?">¿Cuál es tu comida favorita?</option>
            </select>
          </div>
          <div class="grupo-campo">
            <label class="etiqueta">Respuesta Secreta</label>
            <input v-model="formulario.respuesta_seguridad" type="text" class="campo" placeholder="Escribe tu respuesta..." required />
          </div>
        </template>

        <div class="grupo-campo">
          <label class="etiqueta">Correo electrónico</label>
          <input
            v-model="formulario.correo"
            type="email"
            class="campo"
            placeholder="tu@correo.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="grupo-campo">
          <label class="etiqueta">Contraseña</label>
          <div class="campo-icono">
            <input
              v-model="formulario.password"
              :type="mostrarPassword ? 'text' : 'password'"
              class="campo"
              placeholder="••••••••"
              required
              minlength="6"
              autocomplete="current-password"
            />
            <button type="button" class="ojo" @click="mostrarPassword = !mostrarPassword">
              {{ mostrarPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
          <div v-if="!esRegistro" class="link-olvido">
            <a href="#" @click.prevent="iniciarRecuperacion">¿Olvidaste tu contraseña?</a>
          </div>
        </div>

        <!-- Error / Éxito -->
        <div v-if="error" class="alerta-error">{{ error }}</div>
        <div v-if="mensajeExito" class="alerta-exito">{{ mensajeExito }}</div>

        <button type="submit" class="btn btn-primario btn-lg w-full" :disabled="cargando">
          <span v-if="cargando" class="spinner"></span>
          <span v-else>{{ esRegistro ? 'Crear mi cuenta' : 'Ingresar' }}</span>
        </button>
      </form>

      <!-- Nota amigable -->
      <div class="demo-accesos">
        <p class="demo-titulo">¿Necesitas ayuda con tu cuenta?</p>
        <p style="font-size: 0.75rem; text-align: center; margin-top: 5px;">
          <a href="mailto:araucodilan@gmail.com" class="link-contacto">Contactar al administrador</a>
        </p>
      </div>

      <p class="footer-texto">EUPHORIA &copy; 2026 · Todos los derechos reservados</p>
    </div>

    <!-- Modal Recuperar Contraseña -->
    <div v-if="modalRecuperar" class="modal-overlay fade-in">
      <div class="modal-recuperar">
        <button class="btn-cerrar" @click="cerrarRecuperacion">×</button>
        <h3>Recuperar Contraseña</h3>
        
        <!-- Paso 1: Correo -->
        <div v-if="pasoRecuperacion === 1">
          <p class="desc">Ingresa tu correo para buscar tu pregunta de seguridad.</p>
          <input v-model="correoRecuperacion" type="email" class="campo w-full mb-3" placeholder="tu@correo.com" />
          <button class="btn btn-primario w-full" @click="buscarPregunta" :disabled="cargandoRec">
            {{ cargandoRec ? 'Buscando...' : 'Continuar' }}
          </button>
        </div>

        <!-- Paso 2: Pregunta y Nueva Contraseña -->
        <div v-if="pasoRecuperacion === 2">
          <p class="desc">Responde correctamente a tu pregunta secreta para restablecer tu contraseña.</p>
          
          <div class="pregunta-box">{{ preguntaRecuperacion }}</div>
          
          <div class="grupo-campo mb-3">
            <label class="etiqueta">Tu Respuesta</label>
            <input v-model="respuestaRecuperacion" type="text" class="campo w-full" placeholder="Escribe tu respuesta..." />
          </div>
          
          <div class="grupo-campo mb-3">
            <label class="etiqueta">Nueva Contraseña</label>
            <input v-model="nuevaPasswordRec" type="password" class="campo w-full" placeholder="Mínimo 6 caracteres" />
          </div>

          <button class="btn btn-primario w-full" @click="restablecerPassword" :disabled="cargandoRec">
            {{ cargandoRec ? 'Restableciendo...' : 'Restablecer Contraseña' }}
          </button>
        </div>

        <!-- Error / Exito de Recuperación -->
        <div v-if="errorRecuperacion" class="alerta-error mt-3">{{ errorRecuperacion }}</div>
        <div v-if="exitoRecuperacion" class="alerta-exito mt-3">{{ exitoRecuperacion }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { servicioAuth } from '@/servicios-api/servicio-autenticacion.js'

const router  = useRouter()
const tienda  = useTiendaAutenticacion()
const cargando = ref(false)
const error    = ref('')
const mensajeExito = ref('')
const mostrarPassword = ref(false)
const esRegistro = ref(false)

const formulario = reactive({ 
  nombres: '', apellidos: '', correo: '', password: '', 
  pregunta_seguridad: '', respuesta_seguridad: '' 
})

onMounted(() => {
  const msgExpulsion = sessionStorage.getItem('mensaje_expulsion')
  if (msgExpulsion) {
    error.value = msgExpulsion
    sessionStorage.removeItem('mensaje_expulsion')
  }
})

// Variables Recuperación
const modalRecuperar = ref(false)
const pasoRecuperacion = ref(1)
const correoRecuperacion = ref('')
const preguntaRecuperacion = ref('')
const respuestaRecuperacion = ref('')
const nuevaPasswordRec = ref('')
const cargandoRec = ref(false)
const errorRecuperacion = ref('')
const exitoRecuperacion = ref('')

async function manejarSubmit() {
  if (esRegistro.value) await manejarRegistro()
  else await manejarLogin()
}

async function manejarRegistro() {
  error.value = ''
  mensajeExito.value = ''
  cargando.value = true

  // Frontend validations
  if (/\d/.test(formulario.nombres) || /\d/.test(formulario.apellidos)) {
    error.value = 'Nombres y apellidos no pueden contener números.'
    cargando.value = false
    return
  }

  try {
    const res = await servicioAuth.registro(formulario)
    mensajeExito.value = res.mensaje
    // Volver a login después de un momento
    setTimeout(() => {
      esRegistro.value = false
      mensajeExito.value = ''
      formulario.nombres = ''
      formulario.apellidos = ''
    }, 2000)
  } catch (err) {
    error.value = err.error || 'Error al registrar'
  } finally {
    cargando.value = false
  }
}

async function manejarLogin() {
  error.value = ''
  mensajeExito.value = ''
  cargando.value = true

  try {
    const respuesta = await servicioAuth.login(formulario.correo, formulario.password)
    
    tienda.iniciarSesion({ 
      usuario: respuesta.usuario, 
      token: respuesta.token 
    })
    
    localStorage.setItem('euphoria_refresh', respuesta.refresh)
    
    const navResult = await router.push(`/${tienda.rolRuta}`)
    if (navResult) {
      console.error('Error de navegación Vue Router:', navResult)
      error.value = 'Error interno al redirigir: ' + navResult.message
    }
  } catch (err) {
    error.value = err.error || 'Ocurrió un error al intentar iniciar sesión'
  } finally {
    cargando.value = false
  }
}

// Funciones de Recuperación
import clienteHttp from '@/servicios-api/cliente-http.js'

function iniciarRecuperacion() {
  modalRecuperar.value = true
  pasoRecuperacion.value = 1
  correoRecuperacion.value = ''
  preguntaRecuperacion.value = ''
  respuestaRecuperacion.value = ''
  nuevaPasswordRec.value = ''
  errorRecuperacion.value = ''
  exitoRecuperacion.value = ''
}

function cerrarRecuperacion() {
  modalRecuperar.value = false
}

async function buscarPregunta() {
  if (!correoRecuperacion.value) return
  cargandoRec.value = true
  errorRecuperacion.value = ''
  try {
    const res = await clienteHttp.post('/auth/recuperar/pregunta', { correo: correoRecuperacion.value })
    preguntaRecuperacion.value = res.pregunta
    pasoRecuperacion.value = 2
  } catch (error) {
    errorRecuperacion.value = error.response?.data?.error || 'Error al buscar cuenta'
  } finally {
    cargandoRec.value = false
  }
}

async function restablecerPassword() {
  if (!respuestaRecuperacion.value || !nuevaPasswordRec.value) {
    errorRecuperacion.value = 'Completa todos los campos'
    return
  }
  cargandoRec.value = true
  errorRecuperacion.value = ''
  try {
    const res = await clienteHttp.post('/auth/recuperar/reset', {
      correo: correoRecuperacion.value,
      respuesta: respuestaRecuperacion.value,
      nuevaPassword: nuevaPasswordRec.value
    })
    exitoRecuperacion.value = res.mensaje
    setTimeout(() => {
      cerrarRecuperacion()
    }, 3000)
  } catch (error) {
    errorRecuperacion.value = error.response?.data?.error || 'Error al restablecer'
  } finally {
    cargandoRec.value = false
  }
}
</script>

<style scoped>
.login-pagina {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  background-image: url('@/activos/imagenes/fondo-euphoria.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
}

/* Capa oscura para garantizar que el formulario sea legible */
.login-pagina::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(15, 10, 25, 0.65); /* Oscurece la imagen un 65% */
  backdrop-filter: blur(4px); /* Difumina ligeramente el fondo */
  z-index: 0;
}

/* Orbes de fondo (encima del overlay para dar brillo mágico) */
.fondo-orbes { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.orbe {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: flotarOrbe 8s ease-in-out infinite;
}
.orbe-1 { width: 500px; height: 500px; background: var(--morado-profundo); top: -100px; left: -100px; }
.orbe-2 { width: 400px; height: 400px; background: var(--morado-medio);    bottom: -80px; right: -80px; animation-delay: -3s; }
.orbe-3 { width: 300px; height: 300px; background: var(--rosa-acento);     top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -5s; opacity: 0.15; }

@keyframes flotarOrbe {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(20px,-20px) scale(1.05); }
}

/* Contenedor del login */
.login-contenedor {
  width: 100%;
  max-width: 420px;
  background: var(--glass-fondo);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  padding: 2.5rem 2rem;
  box-shadow: var(--sombra-modal), var(--sombra-glow);
  position: relative;
  z-index: 1;
}

.login-cabecera { text-align: center; margin-bottom: 2rem; }
.logo {
  height: auto;
  width: 100%;
  max-width: 320px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 0 10px rgba(155,89,182,0.5));
}

/* Tabs */
.tabs-auth {
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--borde-sutil);
}
.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--texto-secundario);
  padding: 0.8rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: var(--trans-rapida);
  border-bottom: 2px solid transparent;
}
.tab-btn.activo {
  color: var(--morado-brillante);
  border-bottom-color: var(--morado-brillante);
}
.tab-btn:hover:not(.activo) {
  color: var(--texto-principal);
}

/* Formulario */
.login-form { display: flex; flex-direction: column; gap: 1.1rem; margin-bottom: 1.5rem; }
.grupo-campo { display: flex; flex-direction: column; gap: 6px; }
.etiqueta { font-size: 0.82rem; color: var(--texto-secundario); font-weight: 500; }

.campo-icono { position: relative; }
.campo-icono .campo { padding-right: 60px; }
.campo option { background: var(--fondo-app); color: #fff; }
.ojo {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: var(--fondo-tarjeta-alt);
  color: var(--texto-secundario);
  border: 1px solid var(--borde-sutil);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: var(--radio-sm);
  transition: var(--trans-rapida);
}
.ojo:hover { background: var(--fondo-burbuja); color: var(--texto-principal); }

.alerta-error {
  background: rgba(231,76,60,0.1);
  border: 1px solid rgba(231,76,60,0.3);
  color: var(--color-error);
  padding: 10px 14px;
  border-radius: var(--radio-md);
  font-size: 0.85rem;
  text-align: center;
}
.alerta-exito {
  background: rgba(46,204,113,0.1);
  border: 1px solid rgba(46,204,113,0.3);
  color: var(--color-exito);
  padding: 10px 14px;
  border-radius: var(--radio-md);
  font-size: 0.85rem;
  text-align: center;
}

.w-full { width: 100%; justify-content: center; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.7s linear infinite;
  display: inline-block;
}
@keyframes girar { to { transform: rotate(360deg); } }

/* Demo */
.demo-accesos {
  border-top: 1px solid var(--borde-sutil);
  padding-top: 1.2rem;
  margin-bottom: 1.2rem;
}
.demo-titulo { text-align: center; font-size: 0.75rem; color: var(--texto-desactivado); margin-bottom: 0.75rem; }
.demo-botones { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.demo-btn {
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario);
  padding: 6px 14px;
  border-radius: var(--radio-full);
  font-size: 0.78rem;
  cursor: pointer;
  transition: var(--trans-rapida);
}
.demo-btn:hover { border-color: var(--morado-brillante); color: var(--texto-principal); }

.footer-texto { text-align: center; font-size: 0.72rem; color: var(--texto-desactivado); }

/* Link Olvido / Contacto */
.link-olvido { text-align: right; margin-top: 8px; }
.link-olvido a {
  font-size: 0.8rem; color: var(--morado-brillante); text-decoration: none; font-weight: 500;
}
.link-olvido a:hover { text-decoration: underline; }

.link-contacto {
  color: var(--rosa-acento); text-decoration: none; font-weight: 600; transition: 0.2s;
}
.link-contacto:hover { text-shadow: 0 0 8px var(--rosa-acento); }

/* Modal Recuperar */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
  z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.modal-recuperar {
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  border-radius: 20px; padding: 2rem; max-width: 350px; width: 100%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5); position: relative;
}
.btn-cerrar {
  position: absolute; top: 15px; right: 15px; background: none; border: none;
  color: var(--texto-secundario); font-size: 1.5rem; cursor: pointer;
}
.modal-recuperar h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--texto-principal); }
.desc { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 1.5rem; line-height: 1.4; }
.pregunta-box {
  background: rgba(155,89,182,0.1); border: 1px solid rgba(155,89,182,0.3);
  padding: 12px; border-radius: 12px; color: var(--rosa-acento); font-weight: 600;
  font-size: 0.9rem; margin-bottom: 1.5rem; text-align: center;
}
.mb-3 { margin-bottom: 1rem; }
.mt-3 { margin-top: 1rem; }

/* ===== RESPONSIVIDAD ===== */

/* Tablet: 481px - 1024px */
@media (max-width: 1024px) {
  .login-contenedor {
    max-width: 440px;
    padding: 2.2rem 1.8rem;
  }
  .orbe-1 { width: min(400px, 60vw); height: min(400px, 60vw); }
  .orbe-2 { width: min(320px, 50vw); height: min(320px, 50vw); }
  .orbe-3 { width: min(260px, 45vw); height: min(260px, 45vw); }
}

/* Celular: <= 480px */
@media (max-width: 480px) {
  /* Evita saltos en iOS con fondo fijo */
  .login-pagina {
    background-attachment: scroll;
    padding: 1rem;
    align-items: flex-start;
  }

  .login-contenedor {
    max-width: 100%;
    padding: 1.75rem 1.25rem;
    border-radius: var(--radio-lg, 16px);
  }

  .login-cabecera { margin-bottom: 1.5rem; }
  .logo { max-width: 240px; }

  /* Orbes decorativos relativos para no desbordar */
  .orbe {
    filter: blur(60px);
  }
  .orbe-1 { width: min(300px, 70vw); height: min(300px, 70vw); top: -60px; left: -60px; }
  .orbe-2 { width: min(240px, 60vw); height: min(240px, 60vw); bottom: -50px; right: -50px; }
  .orbe-3 { width: min(200px, 55vw); height: min(200px, 55vw); }

  /* Toques cómodos */
  .tab-btn { padding: 0.9rem 0.5rem; font-size: 0.88rem; }
  .ojo { padding: 6px 10px; }

  /* Modal a pantalla más ajustada con padding reducido */
  .modal-overlay { padding: 1rem; align-items: flex-start; padding-top: 2rem; }
  .modal-recuperar { padding: 1.5rem 1.25rem; max-width: 100%; }
}
</style>
