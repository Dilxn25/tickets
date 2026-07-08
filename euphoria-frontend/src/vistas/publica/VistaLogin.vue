<template>
  <div class="login-pagina">
    <!-- Fondo animado -->
    <div class="fondo-orbes">
      <div class="orbe orbe-1"></div>
      <div class="orbe orbe-2"></div>
      <div class="orbe orbe-3"></div>
    </div>
    <!-- Orbes ambientales de neon adicionales -->
    <div class="orbe-deco morado orbe-amb-1"></div>
    <div class="orbe-deco rosa orbe-amb-2"></div>

    <div class="login-shell">
      <!-- ===== Panel de marca (hero) ===== -->
      <aside class="login-hero textura-grano">
        <span class="eyebrow hero-eyebrow">Acceso · Miembros Euphoria</span>

        <div class="hero-logo-wrap">
          <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="logo" />
        </div>

        <h1 class="display-lg hero-titulo">
          La noche <span class="texto-marca">empieza aquí</span>
        </h1>
        <p class="hero-sub">
          Entra a tu mundo nocturno: reservas VIP, eventos en vivo y tu
          billetera digital, todo en un mismo lugar.
        </p>

        <ul class="hero-chips escalonar">
          <li class="hero-chip">
            <span class="chip-punto"></span> Reservas de zona &amp; mesas VIP
          </li>
          <li class="hero-chip">
            <span class="chip-punto"></span> Eventos y line-ups en vivo
          </li>
          <li class="hero-chip">
            <span class="chip-punto"></span> Billetera y accesos digitales
          </li>
        </ul>
      </aside>

      <!-- ===== Tarjeta de autenticación ===== -->
      <div class="login-contenedor">
        <!-- Logo compacto (visible al colapsar a 1 columna) -->
        <div class="login-cabecera">
          <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="logo logo-compacto" />
        </div>

        <div class="card-intro">
          <span class="eyebrow card-eyebrow">{{ esRegistro ? 'Crear cuenta' : 'Bienvenido de vuelta' }}</span>
          <h2 class="display-md card-titulo">{{ esRegistro ? 'Únete a la lista' : 'Entra a la fiesta' }}</h2>
        </div>

      <div class="tabs-auth" role="tablist">
        <button type="button" role="tab" :aria-selected="!esRegistro" :class="['tab-btn', !esRegistro ? 'activo' : '']" @click="esRegistro = false; error = ''">Iniciar sesión</button>
        <button type="button" role="tab" :aria-selected="esRegistro" :class="['tab-btn', esRegistro ? 'activo' : '']" @click="esRegistro = true; error = ''">Registrarme</button>
        <span class="tab-indicador" :class="{ 'a-derecha': esRegistro }"></span>
      </div>

      <!-- Formulario -->
      <form class="login-form escalonar" :key="esRegistro ? 'reg' : 'log'" @submit.prevent="manejarSubmit">
        
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
            <label class="etiqueta">Pregunta de seguridad</label>
            <BaseSelect v-model="formulario.pregunta_seguridad" :options="PREGUNTAS_SEGURIDAD" placeholder="Selecciona una pregunta…" />
          </div>
          <div class="grupo-campo">
            <label class="etiqueta">Respuesta secreta</label>
            <input v-model="formulario.respuesta_seguridad" type="text" class="campo" placeholder="Escribe tu respuesta..." required />
          </div>
        </template>

        <div class="grupo-campo">
          <label class="etiqueta">Correo electrónico</label>
          <div class="campo-icono-izq">
            <svg class="icono-campo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
            <input
              v-model="formulario.correo"
              type="email"
              class="campo con-icono-izq"
              placeholder="tu@correo.com"
              required
              autocomplete="email"
            />
          </div>
        </div>

        <div class="grupo-campo">
          <label class="etiqueta">Contraseña</label>
          <div class="campo-icono">
            <svg class="icono-campo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            <input
              v-model="formulario.password"
              :type="mostrarPassword ? 'text' : 'password'"
              class="campo con-icono-izq"
              placeholder="••••••••"
              required
              minlength="6"
              autocomplete="current-password"
            />
            <button type="button" class="ojo" :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="mostrarPassword = !mostrarPassword">
              {{ mostrarPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
          <div v-if="!esRegistro" class="link-olvido">
            <a href="#" @click.prevent="iniciarRecuperacion">¿Olvidaste tu contraseña?</a>
          </div>
        </div>

        <!-- Error / Éxito -->
        <div v-if="error" class="alerta-error" role="alert" aria-live="assertive">{{ error }}</div>
        <div v-if="mensajeExito" class="alerta-exito" role="status" aria-live="polite">{{ mensajeExito }}</div>

        <button type="submit" class="btn btn-primario btn-lg w-full brillo-hover boton-ingreso" :disabled="cargando">
          <span v-if="cargando" class="spinner"></span>
          <span v-else class="boton-ingreso-txt">
            {{ esRegistro ? 'Crear mi cuenta' : 'Ingresar' }}
            <span class="boton-flecha" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            </span>
          </span>
        </button>
      </form>

      <!-- Nota amigable -->
      <div class="demo-accesos">
        <p class="demo-titulo">¿Necesitas ayuda con tu cuenta?</p>
        <p class="ayuda-contacto">
          <a href="mailto:araucodilan@gmail.com" class="link-contacto">Contactar al administrador</a>
        </p>
      </div>

      <p class="footer-texto">Euphoria &copy; 2026 · Todos los derechos reservados</p>
      </div>
    </div>

    <!-- Modal Recuperar Contraseña -->
    <Teleport to="body">
      <Transition name="modal-rec">
        <div v-if="modalRecuperar" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="titulo-recuperar" @click.self="cerrarRecuperacion">
          <div class="modal-recuperar">
            <button type="button" class="btn-cerrar" aria-label="Cerrar" @click="cerrarRecuperacion">×</button>
            <h3 id="titulo-recuperar">{{ pasoRecuperacion === 'ayuda' || pasoRecuperacion === 'ayuda-ok' ? 'Pedir ayuda al local' : 'Recuperar contraseña' }}</h3>

            <!-- Paso 1: Correo -->
            <form v-if="pasoRecuperacion === 1" @submit.prevent="buscarPregunta">
              <p class="desc">Escribe el correo de tu cuenta.</p>
              <div class="grupo-campo mb-3">
                <label class="etiqueta">Correo electrónico</label>
                <input v-model="correoRecuperacion" type="email" class="campo w-full" placeholder="tu@correo.com" required autocomplete="email" />
              </div>
              <button type="submit" class="btn btn-primario w-full" :disabled="cargandoRec || !correoRecuperacion">
                <span v-if="cargandoRec" class="spinner"></span>
                <span v-else>Continuar</span>
              </button>
            </form>

            <!-- Paso 2: Pregunta + nueva contraseña -->
            <form v-else-if="pasoRecuperacion === 2" @submit.prevent="restablecerPassword">
              <p class="desc">Responde tu pregunta y elige una contraseña nueva.</p>

              <div class="pregunta-box">{{ preguntaRecuperacion }}</div>

              <div class="grupo-campo mb-3">
                <label class="etiqueta">Tu respuesta</label>
                <input v-model="respuestaRecuperacion" type="text" class="campo w-full" placeholder="Tu respuesta secreta" required />
              </div>

              <div class="grupo-campo mb-3">
                <label class="etiqueta">Nueva contraseña</label>
                <div class="campo-icono">
                  <input v-model="nuevaPasswordRec" :type="verPassRec ? 'text' : 'password'" class="campo w-full" placeholder="Mínimo 6 caracteres" required minlength="6" autocomplete="new-password" />
                  <button type="button" class="ojo" :aria-label="verPassRec ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="verPassRec = !verPassRec">
                    {{ verPassRec ? 'Ocultar' : 'Ver' }}
                  </button>
                </div>
                <p v-if="errorPassRec" class="error-mini">{{ errorPassRec }}</p>
              </div>

              <button type="submit" class="btn btn-primario w-full" :disabled="cargandoRec || !puedeRestablecer">
                <span v-if="cargandoRec" class="spinner"></span>
                <span v-else>Cambiar contraseña</span>
              </button>
            </form>

            <!-- Paso: pedir ayuda al local (no recuerda contraseña ni pregunta) -->
            <form v-else-if="pasoRecuperacion === 'ayuda'" @submit.prevent="enviarAyudaLocal">
              <p class="desc">Déjanos tus datos y el local te ayudará a recuperar tu cuenta.</p>

              <div class="grupo-campo mb-3">
                <label class="etiqueta">Correo de la cuenta</label>
                <input v-model="ayudaForm.correo" type="email" class="campo w-full" placeholder="tu@correo.com" required autocomplete="email" />
              </div>
              <div class="grupo-campo mb-3">
                <label class="etiqueta">Nombre completo</label>
                <input v-model="ayudaForm.nombre" type="text" class="campo w-full" placeholder="Tu nombre y apellidos" required />
              </div>
              <div class="grupo-campo mb-3">
                <label class="etiqueta">CI / carnet</label>
                <input v-model="ayudaForm.ci" type="text" class="campo w-full" placeholder="Tu número de carnet" />
              </div>
              <div class="grupo-campo mb-3">
                <label class="etiqueta">Teléfono</label>
                <input v-model="ayudaForm.telefono" type="tel" class="campo w-full" placeholder="Tu número de teléfono" />
                <p v-if="faltaIdentidadAyuda" class="nota-minima">Necesitamos al menos tu CI o tu teléfono.</p>
              </div>
              <div class="grupo-campo mb-3">
                <label class="etiqueta">Mensaje (opcional)</label>
                <textarea v-model="ayudaForm.mensaje" class="campo w-full campo-area" rows="2" placeholder="Cuéntanos qué pasó"></textarea>
              </div>

              <p class="nota-verifica">El local comparará estos datos con los registrados en tu cuenta para verificar que eres tú.</p>

              <button type="submit" class="btn btn-primario w-full" :disabled="cargandoRec || !puedeEnviarAyuda">
                <span v-if="cargandoRec" class="spinner"></span>
                <span v-else>Enviar solicitud</span>
              </button>
              <button type="button" class="btn-volver" @click="pasoRecuperacion = 1; errorRecuperacion = ''">Volver</button>
            </form>

            <!-- Paso: solicitud enviada -->
            <div v-else-if="pasoRecuperacion === 'ayuda-ok'" class="rec-exito">
              <div class="alerta-exito" role="status" aria-live="polite">{{ exitoAyuda }}</div>
              <button type="button" class="btn btn-primario w-full mt-3" @click="cerrarRecuperacion">Entendido</button>
            </div>

            <!-- Paso 3: Éxito -->
            <div v-else class="rec-exito">
              <div class="alerta-exito" role="status" aria-live="polite">{{ exitoRecuperacion || 'Contraseña actualizada.' }}</div>
              <button type="button" class="btn btn-primario w-full mt-3" @click="volverAlLogin">Iniciar sesión</button>
            </div>

            <div v-if="errorRecuperacion" class="alerta-error mt-3" role="alert" aria-live="assertive">{{ errorRecuperacion }}</div>

            <p v-if="pasoRecuperacion === 1 || pasoRecuperacion === 2" class="rec-ayuda">
              ¿No recuerdas tu pregunta?
              <button type="button" class="link-contacto btn-como-link" @click="abrirAyudaLocal">Pedir ayuda al local</button>
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, isNavigationFailure, NavigationFailureType } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { servicioAuth } from '@/servicios-api/servicio-autenticacion.js'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'

const PREGUNTAS_SEGURIDAD = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad nació tu madre?',
  '¿Cuál es el nombre de tu colegio de primaria?',
  '¿Cuál es tu comida favorita?',
].map(p => ({ value: p, label: p }))

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
const verPassRec = ref(false)
const cargandoRec = ref(false)
const errorRecuperacion = ref('')
const exitoRecuperacion = ref('')
let temporizadorCierre = null

const errorPassRec = computed(() => {
  const p = nuevaPasswordRec.value
  if (p && p.length < 6) return 'Mínimo 6 caracteres.'
  return ''
})

const puedeRestablecer = computed(() =>
  !!respuestaRecuperacion.value.trim() && nuevaPasswordRec.value.length >= 6
)

// Solicitud de ayuda al local (cuando no recuerda ni contraseña ni pregunta)
const ayudaForm = reactive({ correo: '', nombre: '', ci: '', telefono: '', mensaje: '' })
const exitoAyuda = ref('')

const faltaIdentidadAyuda = computed(() =>
  !ayudaForm.ci.trim() && !ayudaForm.telefono.trim()
)
const puedeEnviarAyuda = computed(() =>
  !!ayudaForm.correo.trim() && !!ayudaForm.nombre.trim() && !faltaIdentidadAyuda.value
)

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
      formulario.correo = ''
      formulario.password = ''
      formulario.pregunta_seguridad = ''
      formulario.respuesta_seguridad = ''
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
    // Las navegaciones redundantes/abortadas/canceladas devuelven un NavigationFailure
    // truthy pero NO son errores reales; solo tratamos como fallo el resto.
    if (
      isNavigationFailure(navResult) &&
      !isNavigationFailure(
        navResult,
        NavigationFailureType.duplicated |
          NavigationFailureType.aborted |
          NavigationFailureType.cancelled
      )
    ) {
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
  // Si ya escribió su correo en el login, se lo dejamos listo.
  correoRecuperacion.value = formulario.correo || ''
  preguntaRecuperacion.value = ''
  respuestaRecuperacion.value = ''
  nuevaPasswordRec.value = ''
  verPassRec.value = false
  errorRecuperacion.value = ''
  exitoRecuperacion.value = ''
  exitoAyuda.value = ''
  ayudaForm.nombre = ''
  ayudaForm.ci = ''
  ayudaForm.telefono = ''
  ayudaForm.mensaje = ''
}

// Abre el paso de ayuda con el correo listo si ya lo escribió
function abrirAyudaLocal() {
  ayudaForm.correo = correoRecuperacion.value || formulario.correo || ''
  errorRecuperacion.value = ''
  exitoAyuda.value = ''
  pasoRecuperacion.value = 'ayuda'
}

async function enviarAyudaLocal() {
  if (!puedeEnviarAyuda.value) return
  cargandoRec.value = true
  errorRecuperacion.value = ''
  try {
    const res = await clienteHttp.post('/auth/recuperar/solicitud', {
      correo: ayudaForm.correo.trim(),
      nombre_contacto: ayudaForm.nombre.trim(),
      ci_contacto: ayudaForm.ci.trim() || undefined,
      telefono: ayudaForm.telefono.trim() || undefined,
      mensaje: ayudaForm.mensaje.trim() || undefined,
    })
    exitoAyuda.value = res.mensaje || 'Listo, el local recibió tu solicitud.'
    pasoRecuperacion.value = 'ayuda-ok'
  } catch (err) {
    errorRecuperacion.value = mensajeErrorRecuperacion(err, 'No pudimos enviar tu solicitud. Intenta de nuevo.')
  } finally {
    cargandoRec.value = false
  }
}

function cerrarRecuperacion() {
  modalRecuperar.value = false
  if (temporizadorCierre) {
    clearTimeout(temporizadorCierre)
    temporizadorCierre = null
  }
}

// Deja el login listo con el correo recuperado.
function volverAlLogin() {
  esRegistro.value = false
  formulario.correo = correoRecuperacion.value
  formulario.password = ''
  error.value = ''
  cerrarRecuperacion()
}

function mensajeErrorRecuperacion(err, porDefecto) {
  if (err?.__status === 429) return 'Demasiados intentos, espera un momento.'
  return err?.error || porDefecto
}

async function buscarPregunta() {
  if (!correoRecuperacion.value) return
  cargandoRec.value = true
  errorRecuperacion.value = ''
  try {
    const res = await clienteHttp.post('/auth/recuperar/pregunta', { correo: correoRecuperacion.value })
    preguntaRecuperacion.value = res.pregunta
    pasoRecuperacion.value = 2
  } catch (err) {
    errorRecuperacion.value = mensajeErrorRecuperacion(err, 'No pudimos buscar tu cuenta. Intenta de nuevo.')
  } finally {
    cargandoRec.value = false
  }
}

async function restablecerPassword() {
  if (!puedeRestablecer.value) return
  cargandoRec.value = true
  errorRecuperacion.value = ''
  try {
    const res = await clienteHttp.post('/auth/recuperar/reset', {
      correo: correoRecuperacion.value,
      respuesta: respuestaRecuperacion.value.trim(),
      nuevaPassword: nuevaPasswordRec.value
    })
    exitoRecuperacion.value = res.mensaje || 'Contraseña actualizada.'
    pasoRecuperacion.value = 3
    temporizadorCierre = setTimeout(volverAlLogin, 3000)
  } catch (err) {
    errorRecuperacion.value = mensajeErrorRecuperacion(err, 'No se pudo cambiar la contraseña. Intenta de nuevo.')
  } finally {
    cargandoRec.value = false
  }
}

onBeforeUnmount(() => {
  if (temporizadorCierre) clearTimeout(temporizadorCierre)
})
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

/* Capa oscura para garantizar que el formulario sea legible
   (sin backdrop-filter: causa artefactos en algunas GPU) */
.login-pagina::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(15, 10, 25, 0.72);
  z-index: 0;
}

/* Orbes de fondo (encima del overlay para dar brillo mágico) */
.fondo-orbes { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.orbe {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  mix-blend-mode: screen;
  animation: flotarOrbe 9s ease-in-out infinite;
}
.orbe-1 { width: 500px; height: 500px; background: var(--morado-profundo); top: -100px; left: -100px; }
.orbe-2 { width: 400px; height: 400px; background: var(--morado-medio);    bottom: -80px; right: -80px; animation-delay: -3s; }
.orbe-3 { width: 300px; height: 300px; background: var(--rosa-acento);     top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -5s; opacity: 0.15; }

@keyframes flotarOrbe {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(24px,-26px) scale(1.08); }
  66%     { transform: translate(-18px,14px) scale(0.96); }
}

/* Orbes ambientales adicionales (neon de marca sobre el overlay) */
.orbe-amb-1 { width: 520px; height: 520px; top: -160px; right: 6%; opacity: 0.3; }
.orbe-amb-2 { width: 460px; height: 460px; bottom: -180px; left: 4%; opacity: 0.26; }

/* ===== Shell partido: hero + tarjeta ===== */
.login-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1040px;
  display: grid;
  grid-template-columns: 1.05fr minmax(380px, 440px);
  align-items: center;
  gap: clamp(2rem, 5vw, 4.5rem);
}

/* ===== Panel de marca (hero) ===== */
.login-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.4rem;
  padding: 0.5rem 0.5rem 0.5rem 0;
  animation: heroEntra 0.8s var(--ease-cine) both;
}
@keyframes heroEntra {
  from { opacity: 0; transform: translateX(-26px); filter: blur(6px); }
  to   { opacity: 1; transform: translateX(0); filter: blur(0); }
}
.hero-eyebrow { animation: none; }
.hero-logo-wrap { width: 100%; }
.hero-titulo {
  color: var(--texto-principal);
  margin: 0.2rem 0 0;
  text-wrap: balance;
}
.hero-sub {
  color: var(--texto-secundario);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 42ch;
  text-wrap: pretty;
}
.hero-chips {
  list-style: none;
  padding: 0;
  margin: 0.4rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 100%;
}
.hero-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--texto-principal);
  padding: 11px 16px;
  border-radius: var(--radio-full);
  background: rgba(36, 21, 86, 0.85);
  border: 1px solid var(--glass-borde);
  transition: transform 0.3s var(--ease-cine), border-color 0.3s ease, background 0.3s ease;
}
.hero-chip:hover {
  transform: translateX(5px);
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.14);
}
.chip-punto {
  width: 8px; height: 8px; border-radius: 50%; flex: none;
  background: var(--gradiente-marca);
  box-shadow: 0 0 10px var(--rosa-acento);
}

/* Contenedor del login */
@property --angulo { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.login-contenedor {
  width: 100%;
  /* Tarjeta opaca y oscura: garantiza legibilidad del texto sin depender
     de la imagen de fondo (antes usaba --glass-fondo al 35% y las letras
     apagadas se perdían sobre el fondo brillante). */
  background: linear-gradient(160deg, rgba(27, 16, 64, 0.97), rgba(16, 9, 38, 0.98));
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  padding: 2.6rem 2.2rem;
  box-shadow: var(--sombra-modal), var(--sombra-glow),
              inset 0 1px 0 rgba(255,255,255,0.06);
  position: relative;
  z-index: 1;
  isolation: isolate;
  animation: entradaCard 0.7s var(--ease-cine) both;
  animation-delay: 0.12s;
}
/* Aura de color giratoria detrás de la tarjeta */
.login-contenedor::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: conic-gradient(from var(--angulo),
    var(--morado-brillante), var(--rosa-acento), var(--morado-claro), var(--rosa-suave), var(--morado-brillante));
  filter: blur(18px);
  opacity: 0.55;
  z-index: -1;
  animation: girarAura 9s linear infinite;
}
@keyframes girarAura { to { --angulo: 360deg; } }
@keyframes entradaCard {
  from { opacity: 0; transform: translateY(26px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* La cabecera de la tarjeta solo aloja el logo compacto (colapso a 1 col) */
.login-cabecera { display: none; text-align: center; margin-bottom: 1.4rem; }
.logo {
  height: auto;
  width: 100%;
  max-width: 320px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  animation: pulsoLogo 4.5s ease-in-out infinite;
}
/* En el hero el logo se alinea a la izquierda y algo mas grande */
.login-hero .logo { margin: 0; max-width: 260px; }
/* Logo compacto dentro de la tarjeta: solo visible al colapsar a 1 columna */
.logo-compacto { display: none; max-width: 200px; }
@keyframes pulsoLogo {
  0%,100% { filter: drop-shadow(0 0 10px rgba(168,85,247,0.5)); }
  50%     { filter: drop-shadow(0 0 24px rgba(236,72,153,0.72)); }
}

/* Intro de la tarjeta (eyebrow + titulo que cambia segun pestaña) */
.card-intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  margin-bottom: 1.5rem;
}
.card-eyebrow { animation: none; }
.card-titulo {
  color: var(--texto-principal);
  margin: 0;
}

/* Tabs */
.tabs-auth {
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--borde-sutil);
  position: relative;
}
.tab-indicador {
  position: absolute;
  bottom: -1px; left: 0;
  width: 50%; height: 2px;
  background: var(--gradiente-marca);
  border-radius: 2px;
  box-shadow: var(--glow-rosa);
  transition: transform 0.4s var(--ease-rebote);
}
.tab-indicador.a-derecha { transform: translateX(100%); }
.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--texto-secundario);
  padding: 0.8rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: -0.01em;
  transition: color 0.2s var(--ease-suave);
  border-bottom: 2px solid transparent;
  border-radius: var(--radio-sm) var(--radio-sm) 0 0;
}
.tab-btn.activo {
  color: var(--morado-hover);
}
.tab-btn:hover:not(.activo) {
  color: var(--texto-principal);
}
.tab-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5);
}

/* Formulario */
.login-form { display: flex; flex-direction: column; gap: 1.1rem; margin-bottom: 1.5rem; }
.grupo-campo { display: flex; flex-direction: column; gap: 7px; }
.etiqueta {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  font-weight: 600;
  letter-spacing: 0.01em;
  padding-left: 2px;
}

.campo-icono { position: relative; }
.campo-icono .campo { padding-right: 60px; }
.campo option { background: var(--fondo-app); color: #fff; }

/* Iconos dentro de los campos */
.campo-icono-izq { position: relative; }
.icono-campo {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px; color: var(--texto-desactivado);
  pointer-events: none; transition: color 0.25s var(--ease-suave); z-index: 2;
}
.con-icono-izq { padding-left: 44px; }
.campo-icono-izq:focus-within .icono-campo,
.campo-icono:focus-within .icono-campo { color: var(--morado-hover); }

/* Foco con brillo (armonía con el tema violeta) */
.login-form .campo:focus {
  border-color: var(--morado-brillante);
  background: rgba(46, 26, 102, 0.85);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.18), 0 0 18px rgba(168,85,247,0.28);
}

/* Autofill de Chrome: conservar el tema oscuro (evita el fondo blanco) */
.campo:-webkit-autofill,
.campo:-webkit-autofill:hover,
.campo:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--texto-principal);
  -webkit-box-shadow: 0 0 0 1000px rgba(40, 22, 90, 0.95) inset;
  caret-color: var(--texto-principal);
  transition: background-color 9999s ease-out 0s;
}
.ojo {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: var(--fondo-tarjeta-alt);
  color: var(--texto-secundario);
  border: 1px solid var(--borde-sutil);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--radio-sm);
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
}
.ojo:hover {
  background: rgba(168, 85, 247, 0.18);
  color: var(--texto-principal);
  border-color: var(--borde-activo);
}
.ojo:active { transform: translateY(-50%) scale(0.94); }
.ojo:focus-visible {
  outline: none;
  color: var(--texto-principal);
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5);
}

/* Botón Ingresar con gradiente animado */
.boton-ingreso {
  background: linear-gradient(120deg,
    var(--morado-medio) 0%, var(--morado-brillante) 35%, var(--rosa-acento) 55%, var(--morado-brillante) 75%, var(--morado-medio) 100%);
  background-size: 220% 100%;
  animation: desplazarGrad 6s linear infinite;
  letter-spacing: 0.02em;
}
@keyframes desplazarGrad { to { background-position: 220% 0; } }
.boton-ingreso:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.55), var(--glow-morado);
}
.boton-ingreso { transition: transform 0.25s var(--ease-cine), box-shadow 0.25s ease; }
.boton-ingreso:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(236,72,153,0.4), var(--glow-morado); }
.boton-ingreso:active { transform: scale(0.98); }
.boton-ingreso-txt {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
}
.boton-flecha {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(255,255,255,0.2);
  transition: transform 0.35s var(--ease-cine);
}
.boton-flecha svg { width: 15px; height: 15px; }
.boton-ingreso:hover .boton-flecha { transform: translateX(3px) scale(1.08); }

.alerta-error {
  background: rgba(231,76,60,0.1);
  border: 1px solid rgba(231,76,60,0.3);
  color: var(--color-error);
  padding: 11px 14px;
  border-radius: var(--radio-md);
  font-size: 0.85rem;
  line-height: 1.4;
  text-align: center;
  text-wrap: pretty;
  animation: alertaEntra 0.3s var(--ease-suave) both;
}
.alerta-exito {
  background: rgba(46,204,113,0.1);
  border: 1px solid rgba(46,204,113,0.3);
  color: var(--color-exito);
  padding: 11px 14px;
  border-radius: var(--radio-md);
  font-size: 0.85rem;
  line-height: 1.4;
  text-align: center;
  text-wrap: pretty;
  animation: alertaEntra 0.3s var(--ease-suave) both;
}
@keyframes alertaEntra {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
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
.demo-titulo { text-align: center; font-size: 0.78rem; color: var(--texto-secundario); margin-bottom: 0.35rem; letter-spacing: 0.01em; }
.ayuda-contacto { font-size: 0.75rem; text-align: center; }
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

.footer-texto { text-align: center; font-size: 0.72rem; color: var(--texto-desactivado); letter-spacing: 0.02em; }

/* Link Olvido / Contacto */
.link-olvido { text-align: right; margin-top: 8px; }
.link-olvido a {
  font-size: 0.8rem; color: var(--morado-brillante); text-decoration: none; font-weight: 600;
  border-radius: var(--radio-sm);
  transition: color 0.2s ease;
}
.link-olvido a:hover { color: var(--morado-hover); text-decoration: underline; text-underline-offset: 3px; }
.link-olvido a:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5); }

.link-contacto {
  color: var(--rosa-acento); text-decoration: none; font-weight: 600;
  border-radius: var(--radio-sm);
  transition: text-shadow 0.2s ease, color 0.2s ease;
}
.link-contacto:hover { color: var(--rosa-suave); text-shadow: 0 0 8px var(--rosa-acento); }
.link-contacto:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.5); }

/* Modal Recuperar (Teleport a body: por encima de cualquier navbar) */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(8, 4, 20, 0.82);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
}
.modal-recuperar {
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl); padding: 2rem; max-width: 380px; width: 100%;
  box-shadow: var(--sombra-modal), 0 0 40px rgba(168, 85, 247, 0.18);
  position: relative;
  max-height: 90dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: modalEntra 0.35s var(--ease-suave) both;
}
.modal-rec-enter-active { transition: opacity 0.25s ease; }
.modal-rec-leave-active { transition: opacity 0.18s ease; }
.modal-rec-enter-from,
.modal-rec-leave-to { opacity: 0; }
@keyframes modalEntra {
  from { opacity: 0; transform: translateY(18px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.btn-cerrar {
  position: absolute; top: 12px; right: 12px;
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  background: none; border: none; border-radius: var(--radio-full);
  color: var(--texto-secundario); font-size: 1.4rem; line-height: 1; cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease;
}
.btn-cerrar:hover { background: rgba(168, 85, 247, 0.15); color: var(--texto-principal); }
.btn-cerrar:active { transform: scale(0.92); }
.btn-cerrar:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5); }
.modal-recuperar h3 {
  font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;
  color: var(--texto-principal); letter-spacing: -0.02em;
}
.desc { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 1.5rem; line-height: 1.5; text-wrap: pretty; }
.pregunta-box {
  background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.32);
  padding: 12px 14px; border-radius: var(--radio-md); color: var(--morado-hover); font-weight: 600;
  font-size: 0.9rem; line-height: 1.4; margin-bottom: 1.5rem; text-align: center; text-wrap: pretty;
}
.mb-3 { margin-bottom: 1rem; }
.mt-3 { margin-top: 1rem; }

/* Detalles del modal de recuperación */
.error-mini {
  margin-top: 6px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--color-error);
}
.rec-ayuda {
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--borde-sutil);
  text-align: center;
  font-size: 0.78rem;
  color: var(--texto-secundario);
}
.rec-exito { text-align: center; }

/* Paso "Pedir ayuda al local" */
.btn-como-link {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
}
.campo-area {
  resize: vertical;
  min-height: 58px;
  font-family: var(--fuente-principal);
  line-height: 1.45;
}
.nota-verifica {
  font-size: 0.78rem;
  color: var(--texto-desactivado);
  line-height: 1.45;
  margin-bottom: 1rem;
  text-wrap: pretty;
}
.nota-minima {
  margin-top: 6px;
  font-size: 0.76rem;
  line-height: 1.35;
  color: var(--texto-desactivado);
}
.btn-volver {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  background: none;
  border: none;
  border-radius: var(--radio-sm);
  color: var(--texto-secundario);
  font-family: var(--fuente-principal);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.18s ease;
}
.btn-volver:hover { color: var(--texto-principal); text-decoration: underline; text-underline-offset: 3px; }
.btn-volver:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5); }

/* ===== ACCESIBILIDAD: MOVIMIENTO REDUCIDO ===== */
@media (prefers-reduced-motion: reduce) {
  .orbe,
  .login-pagina,
  .login-hero,
  .login-contenedor,
  .login-contenedor::after,
  .logo,
  .boton-ingreso,
  .modal-recuperar,
  .alerta-error,
  .alerta-exito {
    animation: none !important;
  }
  .tab-indicador { transition: none; }
  .modal-rec-enter-active,
  .modal-rec-leave-active { transition: opacity 0.15s ease; }
}

/* ===== RESPONSIVIDAD ===== */

/* Desktop intermedio: aprieta el gap del shell */
@media (max-width: 1024px) {
  .login-shell { gap: 2rem; grid-template-columns: 1fr minmax(360px, 420px); }
  .login-contenedor { padding: 2.2rem 1.8rem; }
  .hero-sub { font-size: 0.94rem; }
  .orbe-1 { width: min(400px, 60vw); height: min(400px, 60vw); }
  .orbe-2 { width: min(320px, 50vw); height: min(320px, 50vw); }
  .orbe-3 { width: min(260px, 45vw); height: min(260px, 45vw); }
}

/* Colapso a 1 columna: se oculta el hero, la tarjeta se centra */
@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: 1fr;
    max-width: 440px;
    gap: 0;
  }
  .login-hero { display: none; }
  .login-cabecera { display: block; }
  .logo-compacto { display: block; }
  .orbe-amb-1, .orbe-amb-2 { opacity: 0.2; }
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
