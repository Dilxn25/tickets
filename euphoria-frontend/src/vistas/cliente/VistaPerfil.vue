<template>
  <div class="vista-perfil entrada-cine">
    <!-- Sin orbes decorativos: el fondo es el UNO uniforme de la app, sin
         recuadros ni bordes recortados (se veían como líneas en escritorio) -->
    <div class="perfil-interior">
    <!-- Encabezado -->
    <header class="hero-perfil">
      <h1 class="titulo-perfil">Mi perfil</h1>
      <p class="sub-hero">Tu foto, tus datos y tu seguridad.</p>
    </header>

    <div class="perfil-bento">
      <!-- Columna: identidad (tarjeta hardware) -->
      <aside class="tarjeta-identidad bezel hover-elevar">
        <div class="identidad-core bezel-core textura-grano">
          <!-- Portada y Foto -->
          <div class="portada-contenedor">
            <div class="portada-img"></div>
            <span class="portada-brillo" aria-hidden="true"></span>
            <div class="foto-perfil">
              <img v-if="urlFotoActual" :src="urlFotoActual" class="foto-img" />
              <span v-else class="foto-iniciales">{{ iniciales }}</span>

              <button class="btn-editar-foto" type="button" title="Cambiar foto" @click="triggerFileInput"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></button>
              <input type="file" accept="image/*" ref="fileInput" @change="manejarArchivo" style="display: none;" />
            </div>
          </div>

          <div class="info-principal">
            <h3>{{ tienda.usuario?.nombres }} {{ tienda.usuario?.apellidos }}</h3>
            <p class="correo">{{ tienda.usuario?.correo }}</p>
            <span class="chip-cuenta"><span class="punto-vivo" aria-hidden="true"></span>Cuenta Euphoria</span>

            <Transition name="err-inline">
              <p v-if="archivoImagen" class="nota-foto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 6L9 17l-5-5"></path></svg>
                Nueva foto lista. Guárdala en «Datos personales».
              </p>
            </Transition>

            <div class="perfil-progreso">
              <div class="progreso-cabecera">
                <span>Perfil completo</span>
                <strong>{{ porcentajePerfil }}%</strong>
              </div>
              <div class="progreso-barra" role="progressbar" :aria-valuenow="porcentajePerfil" aria-valuemin="0" aria-valuemax="100">
                <span class="progreso-relleno" :style="{ width: porcentajePerfil + '%' }"></span>
              </div>
              <p v-if="porcentajePerfil < 100" class="progreso-hint">Complétalo y muévete más rápido en tus compras y reservas.</p>
              <p v-else class="progreso-hint listo">Todo listo. Nos vemos en la pista.</p>

              <ul v-if="pendientes.length" class="pendientes-lista">
                <li v-for="p in pendientes" :key="p.clave">
                  <button type="button" class="chip-pendiente" @click="irAPendiente(p.clave)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="12" height="12" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
                    <span>{{ p.texto }}</span>
                  </button>
                </li>
              </ul>

              <!-- Premio por perfil completo -->
              <Transition name="mensaje-pop">
                <div v-if="premioPerfil === 'pendiente'" class="premio-tarjeta">
                  <span class="premio-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                  </span>
                  <span class="premio-texto">
                    <strong>Tienes {{ premioPct }}% de descuento en tu próximo pedido</strong>
                    <small>Hasta Bs {{ premioMax }}. Se aplica solo al pagar con tu billetera.</small>
                  </span>
                </div>
                <p v-else-if="premioPerfil === 'usado'" class="premio-usado">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true"><path d="M20 6L9 17l-5-5"></path></svg>
                  Premio de bienvenida usado
                </p>
              </Transition>
            </div>
          </div>
        </div>
      </aside>

      <!-- Columna: formularios -->
      <div class="perfil-formularios">
        <!-- Formulario de Datos Personales -->
        <form ref="refFormDatos" class="panel-form superficie escalonar" @submit.prevent="guardarDatos">
          <div class="panel-head">
            <span class="panel-icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
            <div>
              <h4 class="subtitulo-form">Datos personales</h4>
              <p class="panel-sub">Toca el lápiz, edita y guarda. Así de fácil.</p>
            </div>
          </div>

          <div class="campos-grid">
            <div class="grupo-campo">
              <label>Nombres</label>
              <div class="campo-editable" data-campo="nombres" :class="{ 'editando-activo': editando.nombres, 'con-error': !!mostrarError('nombres') }">
                <span v-if="!editando.nombres">{{ form.nombres || 'No especificado' }}</span>
                <input v-else v-model="form.nombres" type="text" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" autofocus>
                <button type="button" class="btn-lapiz" :class="{ activo: editando.nombres }" @click="toggleEditar('nombres')" :title="editando.nombres ? 'Listo' : 'Editar'">
                  <svg v-if="!editando.nombres" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="16" height="16"><path d="M20 6L9 17l-5-5"></path></svg>
                </button>
              </div>
              <Transition name="err-inline">
                <p v-if="mostrarError('nombres')" class="error-inline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>{{ errores.nombres }}</p>
              </Transition>
            </div>

            <div class="grupo-campo">
              <label>Apellidos</label>
              <div class="campo-editable" data-campo="apellidos" :class="{ 'editando-activo': editando.apellidos, 'con-error': !!mostrarError('apellidos') }">
                <span v-if="!editando.apellidos">{{ form.apellidos || 'No especificado' }}</span>
                <input v-else v-model="form.apellidos" type="text" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" autofocus>
                <button type="button" class="btn-lapiz" :class="{ activo: editando.apellidos }" @click="toggleEditar('apellidos')" :title="editando.apellidos ? 'Listo' : 'Editar'">
                  <svg v-if="!editando.apellidos" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="16" height="16"><path d="M20 6L9 17l-5-5"></path></svg>
                </button>
              </div>
              <Transition name="err-inline">
                <p v-if="mostrarError('apellidos')" class="error-inline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>{{ errores.apellidos }}</p>
              </Transition>
            </div>

            <div class="grupo-campo">
              <label>CI / carnet (opcional)</label>
              <div class="campo-editable" data-campo="ci_carnet" :class="{ 'editando-activo': editando.ci_carnet, 'con-error': !!mostrarError('ci_carnet') }">
                <span v-if="!editando.ci_carnet">{{ form.ci_carnet || 'No especificado' }}</span>
                <input v-else v-model="form.ci_carnet" @input="form.ci_carnet = form.ci_carnet.replace(/\D/g,'')" type="text" inputmode="numeric" class="campo" placeholder="Añade tu número de carnet" autofocus>
                <button type="button" class="btn-lapiz" :class="{ activo: editando.ci_carnet }" @click="toggleEditar('ci_carnet')" :title="editando.ci_carnet ? 'Listo' : 'Editar'">
                  <svg v-if="!editando.ci_carnet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="16" height="16"><path d="M20 6L9 17l-5-5"></path></svg>
                </button>
              </div>
              <Transition name="err-inline">
                <p v-if="mostrarError('ci_carnet')" class="error-inline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>{{ errores.ci_carnet }}</p>
              </Transition>
            </div>

            <div class="grupo-campo">
              <label>Teléfono (opcional)</label>
              <div class="campo-editable" data-campo="telefono" :class="{ 'editando-activo': editando.telefono, 'con-error': !!mostrarError('telefono') }">
                <span v-if="!editando.telefono" class="tel-lectura">
                  <svg v-if="form.telefono" class="tel-lectura-bandera" viewBox="0 0 9 6" width="18" height="12" aria-hidden="true"><rect width="9" height="2" y="0" fill="#D52B1E"/><rect width="9" height="2" y="2" fill="#F9E300"/><rect width="9" height="2" y="4" fill="#007934"/></svg>
                  <span class="tel-lectura-num">{{ telefonoMostrado || 'No especificado' }}</span>
                </span>
                <BaseTelefono v-else v-model="form.telefono" placeholder="Añade tu número" />
                <button type="button" class="btn-lapiz" :class="{ activo: editando.telefono }" @click="toggleEditar('telefono')" :title="editando.telefono ? 'Listo' : 'Editar'">
                  <svg v-if="!editando.telefono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="16" height="16"><path d="M20 6L9 17l-5-5"></path></svg>
                </button>
              </div>
              <Transition name="err-inline">
                <p v-if="mostrarError('telefono')" class="error-inline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>{{ errores.telefono }}</p>
              </Transition>
            </div>

            <!-- Correo: editable + verificación (paso del perfil completo) -->
            <div class="grupo-campo">
              <label>Correo</label>
              <div class="correo-verif">
                <template v-if="!editandoCorreo">
                  <span class="correo-verif-valor">{{ tienda.usuario?.correo }}</span>
                  <span v-if="correoVerificado" class="verif-badge ok">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>
                    Verificado
                  </span>
                  <span v-else class="verif-badge pend">Sin verificar</span>
                  <button type="button" class="verif-link" @click="abrirEdicionCorreo">Cambiar</button>
                  <button v-if="!correoVerificado" type="button" class="verif-btn" @click="iniciarVerificacion()" :disabled="verifCargando">
                    {{ verifCargando && verifPaso !== 'codigo' ? 'Enviando…' : 'Verificar' }}
                  </button>
                </template>
                <template v-else>
                  <input v-model="correoNuevo" type="email" class="campo verif-correo-input" placeholder="tunuevo@correo.com" @keyup.enter="iniciarVerificacion(correoNuevo)" />
                  <button type="button" class="verif-btn" @click="iniciarVerificacion(correoNuevo)" :disabled="verifCargando || !correoNuevo">
                    {{ verifCargando ? 'Enviando…' : 'Enviar código' }}
                  </button>
                  <button type="button" class="verif-link" @click="cancelarEdicionCorreo">Cancelar</button>
                </template>
              </div>
              <Transition name="err-inline">
                <div v-if="verifPaso === 'codigo'" class="verif-codigo">
                  <p class="verif-hint">Te enviamos un código de 6 dígitos a <b>{{ destinoCorreo }}</b>. Ingrésalo aquí:</p>
                  <div class="verif-codigo-fila">
                    <input v-model="verifCodigo" @input="verifCodigo = verifCodigo.replace(/\D/g,'').slice(0,6)" @keyup.enter="confirmarVerificacion" inputmode="numeric" maxlength="6" class="campo verif-input" placeholder="000000" />
                    <button type="button" class="btn-guardar-inline brillo-hover" @click="confirmarVerificacion" :disabled="verifCargando || verifCodigo.length !== 6">
                      {{ verifCargando ? 'Guardando…' : 'Confirmar' }}
                    </button>
                  </div>
                  <button type="button" class="verif-reenviar" @click="iniciarVerificacion(esCambioCorreo ? correoNuevo : undefined)" :disabled="verifCargando || segundosReenvioVerif > 0">{{ segundosReenvioVerif > 0 ? `Reenviar en ${segundosReenvioVerif}s` : 'Reenviar código' }}</button>
                </div>
              </Transition>
            </div>
          </div>

          <div class="acciones-form">
            <button type="button" class="btn-cancelar" @click="cancelarEdicion" :disabled="cargandoDatos || !hayCambios">Cancelar</button>
            <button type="submit" class="btn-guardar-inline brillo-hover" :disabled="cargandoDatos || !hayCambios || !datosValidos" :title="!hayCambios ? 'Aún no hay cambios que guardar' : ''">
              <span v-if="cargandoDatos" class="spin" aria-hidden="true"></span>
              <span>{{ cargandoDatos ? 'Guardando…' : 'Guardar cambios' }}</span>
            </button>
          </div>

          <Transition name="mensaje-pop">
            <p v-if="mensajeDatos" class="mensaje exito">
              <svg class="icono-exito" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="18" height="18" aria-hidden="true"><circle class="exito-circulo" cx="12" cy="12" r="9"></circle><path class="exito-check" d="M8 12.4l2.7 2.7 5.7-5.7"></path></svg>
              <span>{{ mensajeDatos }}</span>
            </p>
          </Transition>
          <Transition name="mensaje-pop">
            <p v-if="errorDatos" class="mensaje error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
              <span>{{ errorDatos }}</span>
            </p>
          </Transition>
        </form>

        <!-- Formulario de Pregunta de Seguridad -->
        <form ref="refFormSeguridad" class="panel-form superficie escalonar" @submit.prevent="guardarSeguridad">
          <div class="panel-head">
            <span class="panel-icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><path d="M21 2l-2 2"></path><path d="M15.5 7.5l3 3L22 7l-3-3-3.5 3.5z"></path><path d="M15.5 7.5L11.39 11.61"></path><circle cx="7.5" cy="15.5" r="4.5"></circle></svg></span>
            <div>
              <h4 class="subtitulo-form">Recuperación de cuenta</h4>
              <p class="panel-sub">Por si olvidas tu contraseña.</p>
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

          <button type="submit" class="btn-guardar btn-secundario brillo-hover" :disabled="cargandoSeguridad || !seguridadValida">
            <span v-if="cargandoSeguridad" class="spin spin-tenue" aria-hidden="true"></span>
            <span>{{ cargandoSeguridad ? 'Guardando…' : 'Guardar pregunta' }}</span>
          </button>
          <Transition name="mensaje-pop">
            <p v-if="mensajeSeguridad" class="mensaje exito">
              <svg class="icono-exito" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="18" height="18" aria-hidden="true"><circle class="exito-circulo" cx="12" cy="12" r="9"></circle><path class="exito-check" d="M8 12.4l2.7 2.7 5.7-5.7"></path></svg>
              <span>{{ mensajeSeguridad }}</span>
            </p>
          </Transition>
          <Transition name="mensaje-pop">
            <p v-if="errorSeguridad" class="mensaje error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
              <span>{{ errorSeguridad }}</span>
            </p>
          </Transition>
        </form>

        <!-- Formulario de Contraseña -->
        <form class="panel-form superficie escalonar" @submit.prevent="cambiarPassword">
          <div class="panel-head">
            <span class="panel-icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>
            <div>
              <h4 class="subtitulo-form">Seguridad</h4>
              <p class="panel-sub">Cambia tu contraseña cuando quieras. Tu cuenta, blindada.</p>
            </div>
          </div>

          <div class="campos-grid">
            <div class="grupo-campo">
              <label>Contraseña actual</label>
              <input v-model="formPass.actual" type="password" class="campo" required placeholder="••••••••">
            </div>
            <div class="grupo-campo">
              <label>Nueva contraseña</label>
              <input v-model="formPass.nueva" type="password" class="campo" :class="{ 'campo-invalido': !!errorPassNueva }" required minlength="6" placeholder="••••••••">
              <Transition name="err-inline">
                <p v-if="errorPassNueva" class="error-inline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>{{ errorPassNueva }}</p>
              </Transition>
            </div>
          </div>

          <button type="button" class="link-recuperar" @click="abrirRecuperar">¿No recuerdas tu contraseña actual?</button>

          <button type="submit" class="btn-guardar btn-secundario brillo-hover" :disabled="cargandoPass || !passValido">
            <span v-if="cargandoPass" class="spin spin-tenue" aria-hidden="true"></span>
            <span>{{ cargandoPass ? 'Actualizando…' : 'Cambiar contraseña' }}</span>
          </button>
          <Transition name="mensaje-pop">
            <p v-if="mensajePass" class="mensaje exito">
              <svg class="icono-exito" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="18" height="18" aria-hidden="true"><circle class="exito-circulo" cx="12" cy="12" r="9"></circle><path class="exito-check" d="M8 12.4l2.7 2.7 5.7-5.7"></path></svg>
              <span>{{ mensajePass }}</span>
            </p>
          </Transition>
          <Transition name="mensaje-pop">
            <p v-if="errorPass" class="mensaje error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
              <span>{{ errorPass }}</span>
            </p>
          </Transition>
        </form>
      </div>
    </div>
    </div><!-- /perfil-interior -->

    <!-- Modal: recuperar acceso sin la contraseña actual -->
    <Teleport to="body">
      <Transition name="modal-rec">
        <div v-if="modalRecuperar" class="rec-overlay" role="dialog" aria-modal="true" aria-labelledby="titulo-rec" @click.self="cerrarRecuperar">
          <div class="rec-modal">
            <button type="button" class="rec-cerrar" aria-label="Cerrar" @click="cerrarRecuperar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
            </button>

            <!-- Paso: elegir cómo recuperar -->
            <template v-if="pasoRec === 'opciones'">
              <h3 id="titulo-rec" class="rec-titulo">Recupera tu acceso</h3>
              <p class="rec-sub">Elige cómo cambiar tu contraseña.</p>

              <div class="rec-opciones">
                <button type="button" class="rec-opcion" :disabled="cargandoRec" @click="elegirPregunta">
                  <span class="rec-opcion-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><path d="M21 2l-2 2"></path><path d="M15.5 7.5l3 3L22 7l-3-3-3.5 3.5z"></path><path d="M15.5 7.5L11.39 11.61"></path><circle cx="7.5" cy="15.5" r="4.5"></circle></svg>
                  </span>
                  <span class="rec-opcion-texto">
                    <strong>Responder mi pregunta de seguridad</strong>
                    <small>Respondes y eliges una contraseña nueva.</small>
                  </span>
                  <span v-if="cargandoRec" class="spin spin-tenue" aria-hidden="true"></span>
                </button>

                <button type="button" class="rec-opcion" @click="abrirAyudaLocal">
                  <span class="rec-opcion-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </span>
                  <span class="rec-opcion-texto">
                    <strong>Pedir ayuda al local</strong>
                    <small>Déjanos tus datos y te verificamos.</small>
                  </span>
                </button>
              </div>

              <Transition name="err-inline">
                <p v-if="errorRec" class="mensaje error rec-mensaje">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                  <span>{{ errorRec }}</span>
                </p>
              </Transition>
              <button v-if="sinPregunta" type="button" class="rec-config" @click="configurarPreguntaAhora">Configurar mi pregunta ahora</button>
            </template>

            <!-- Paso: responder la pregunta -->
            <template v-else-if="pasoRec === 'pregunta'">
              <h3 class="rec-titulo">Tu pregunta de seguridad</h3>
              <p class="rec-correo">{{ tienda.usuario?.correo }}</p>
              <div class="rec-pregunta">{{ preguntaRec }}</div>

              <form @submit.prevent="confirmarReset">
                <div class="grupo-campo">
                  <label>Respuesta</label>
                  <input v-model="respuestaRec" type="text" class="campo" required placeholder="Tu respuesta secreta" />
                </div>
                <div class="grupo-campo">
                  <label>Nueva contraseña</label>
                  <div class="rec-campo-pass">
                    <input v-model="nuevaPassRec" :type="verNuevaPass ? 'text' : 'password'" class="campo" required minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
                    <button type="button" class="rec-ojo" :aria-label="verNuevaPass ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="verNuevaPass = !verNuevaPass">{{ verNuevaPass ? 'Ocultar' : 'Ver' }}</button>
                  </div>
                  <Transition name="err-inline">
                    <p v-if="errorNuevaPassRec" class="error-inline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>{{ errorNuevaPassRec }}</p>
                  </Transition>
                </div>

                <Transition name="err-inline">
                  <p v-if="errorRec" class="mensaje error rec-mensaje">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                    <span>{{ errorRec }}</span>
                  </p>
                </Transition>

                <button type="submit" class="btn-guardar brillo-hover" :disabled="cargandoRec || !recValido">
                  <span v-if="cargandoRec" class="spin" aria-hidden="true"></span>
                  <span>{{ cargandoRec ? 'Cambiando…' : 'Cambiar contraseña' }}</span>
                </button>
              </form>

              <p class="rec-ayuda"><button type="button" class="rec-ayuda-btn" @click="abrirAyudaLocal">Pedir ayuda al local</button></p>
            </template>

            <!-- Paso: pedir ayuda al local -->
            <template v-else-if="pasoRec === 'ayuda'">
              <h3 class="rec-titulo">Pedir ayuda al local</h3>
              <p class="rec-sub">El local te ayudará a cambiarla.</p>

              <form @submit.prevent="enviarAyudaLocal">
                <div class="grupo-campo">
                  <label>Correo de la cuenta</label>
                  <input :value="tienda.usuario?.correo" type="email" class="campo campo-bloqueado" readonly aria-readonly="true" />
                </div>
                <div class="grupo-campo">
                  <label>Nombre completo</label>
                  <input v-model="ayudaForm.nombre" type="text" class="campo" required placeholder="Tu nombre y apellidos" />
                </div>
                <div class="grupo-campo">
                  <label>CI / carnet</label>
                  <input v-model="ayudaForm.ci" type="text" class="campo" placeholder="Tu número de carnet" />
                </div>
                <div class="grupo-campo">
                  <label>Teléfono</label>
                  <BaseTelefono v-model="ayudaForm.telefono" placeholder="Tu número de teléfono" />
                  <p v-if="faltaIdentidadAyuda" class="nota-minima">Necesitamos al menos tu CI o tu teléfono.</p>
                </div>
                <div class="grupo-campo">
                  <label>Mensaje (opcional)</label>
                  <textarea v-model="ayudaForm.mensaje" class="campo campo-area" rows="2" placeholder="Cuéntanos qué pasó"></textarea>
                </div>

                <p class="nota-verifica">Sirven para verificar que eres tú.</p>

                <Transition name="err-inline">
                  <p v-if="errorRec" class="mensaje error rec-mensaje">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                    <span>{{ errorRec }}</span>
                  </p>
                </Transition>

                <button type="submit" class="btn-guardar brillo-hover" :disabled="cargandoRec || !puedeEnviarAyuda">
                  <span v-if="cargandoRec" class="spin" aria-hidden="true"></span>
                  <span>{{ cargandoRec ? 'Enviando…' : 'Enviar solicitud' }}</span>
                </button>
                <button type="button" class="rec-volver" @click="pasoRec = 'opciones'; errorRec = ''">Volver</button>
              </form>
            </template>

            <!-- Paso: solicitud enviada -->
            <template v-else-if="pasoRec === 'ayuda-ok'">
              <div class="rec-listo">
                <svg class="icono-exito" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="40" height="40" aria-hidden="true"><circle class="exito-circulo" cx="12" cy="12" r="9"></circle><path class="exito-check" d="M8 12.4l2.7 2.7 5.7-5.7"></path></svg>
                <h3 class="rec-titulo">Solicitud enviada</h3>
                <p class="rec-sub">{{ exitoAyuda }}</p>
                <button type="button" class="btn-guardar brillo-hover" @click="cerrarRecuperar">Listo</button>
              </div>
            </template>

            <!-- Paso: listo -->
            <template v-else>
              <div class="rec-listo">
                <svg class="icono-exito" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="40" height="40" aria-hidden="true"><circle class="exito-circulo" cx="12" cy="12" r="9"></circle><path class="exito-check" d="M8 12.4l2.7 2.7 5.7-5.7"></path></svg>
                <h3 class="rec-titulo">Contraseña actualizada</h3>
                <p class="rec-sub">Úsala en tu próximo ingreso.</p>
                <button type="button" class="btn-guardar brillo-hover" @click="cerrarRecuperar">Listo</button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Barra flotante de guardado: SIEMPRE accesible en celular en cuanto hay
         cambios (foto o datos), sin tener que buscar el botón al pie del formulario. -->
    <Teleport to="body">
      <Transition name="barra-guardar">
        <div v-if="hayCambios" class="barra-guardar-movil" role="region" aria-label="Cambios sin guardar">
          <div class="barra-guardar-inner">
            <span class="barra-guardar-nota">
              <span class="barra-punto" aria-hidden="true"></span>
              Cambios sin guardar
            </span>
            <div class="barra-guardar-acciones">
              <button type="button" class="btn-cancelar barra-cancelar" @click="cancelarEdicion" :disabled="cargandoDatos">Cancelar</button>
              <button type="button" class="btn-guardar-inline brillo-hover" @click="guardarDatos" :disabled="cargandoDatos || !datosValidos" :title="!datosValidos ? 'Revisa los campos marcados' : 'Guardar cambios'">
                <span v-if="cargandoDatos" class="spin" aria-hidden="true"></span>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="17" height="17" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                <span>{{ cargandoDatos ? 'Guardando…' : 'Guardar cambios' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import clienteHttp from '@/servicios-api/cliente-http.js' // Usamos el cliente base para peticiones directas
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import BaseTelefono from '@/componentes/comunes/BaseTelefono.vue'

// Muestra el teléfono guardado con el prefijo +591 legible (para que se note que sirve para WhatsApp).
const telefonoMostrado = computed(() => {
  const d = String(form.value.telefono || '').replace(/\D/g, '')
  if (!d) return ''
  const local = d.startsWith('591') ? d.slice(3) : d
  return '+591 ' + local
})

const PREGUNTAS_SEGURIDAD = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad nació tu madre?',
  '¿Cuál es el nombre de tu colegio de primaria?',
  '¿Cuál es tu comida favorita?',
].map(p => ({ value: p, label: p }))

const tienda = useTiendaAutenticacion()
const notif = useNotificaciones()
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

// El teléfono se guarda con prefijo (+591XXXXXXXX). Lo llevamos SIEMPRE a esa
// forma canónica para que: (a) la validación no lo marque inválido por el "+591"
// y bloquee Guardar, y (b) no cuente como "cambio" solo por reformatearse.
function normalizarTelefono(v) {
  const d = String(v || '').replace(/\D/g, '').replace(/^591/, '').slice(0, 8)
  return d ? '+591' + d : ''
}

const form = ref({
  nombres: tienda.usuario?.nombres || '',
  apellidos: tienda.usuario?.apellidos || '',
  ci_carnet: tienda.usuario?.ci_carnet || '',
  telefono: normalizarTelefono(tienda.usuario?.telefono)
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

// ===== Validación en vivo (solo UI: los pattern HTML siguen activos) =====
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/

const errores = computed(() => {
  const e = {}
  const nombres = (form.value.nombres || '').trim()
  if (!nombres) e.nombres = 'Escribe tus nombres para continuar.'
  else if (!SOLO_LETRAS.test(nombres)) e.nombres = 'Solo letras y espacios, sin números ni símbolos.'

  const apellidos = (form.value.apellidos || '').trim()
  if (!apellidos) e.apellidos = 'Escribe tus apellidos para continuar.'
  else if (!SOLO_LETRAS.test(apellidos)) e.apellidos = 'Solo letras y espacios, sin números ni símbolos.'

  // CI: solo números (es opcional; solo se valida si escribió algo).
  const ci = (form.value.ci_carnet || '').trim()
  if (ci && !/^[0-9]+$/.test(ci)) e.ci_carnet = 'El carnet debe tener solo números.'

  // Teléfono: se valida la parte LOCAL (sin el +591). Debe ser 8 dígitos.
  const telLocal = (form.value.telefono || '').replace(/\D/g, '').replace(/^591/, '')
  if (telLocal && telLocal.length !== 8) e.telefono = 'El teléfono debe tener 8 dígitos.'
  return e
})

const datosValidos = computed(() => Object.keys(errores.value).length === 0)

// El error se muestra solo cuando aplica: al editar el campo o si su valor cambió.
function mostrarError(campo) {
  if (!errores.value[campo]) return ''
  if (editando.value[campo]) return errores.value[campo]
  if (form.value[campo] !== originalForm.value[campo]) return errores.value[campo]
  return ''
}

// Medidor de perfil completo (foto, datos y pregunta de recuperación)
const porcentajePerfil = computed(() => {
  const u = tienda.usuario || {}
  const items = [
    u.nombres,
    u.apellidos,
    u.ci_carnet,
    u.telefono,
    u.url_foto_perfil || u.foto,
    u.pregunta_seguridad,
    u.correo_verificado
  ]
  const llenos = items.filter(v => !!v).length
  return Math.round((llenos / items.length) * 100)
})

// Premio por perfil completo: null | 'pendiente' | 'usado' (viene del backend)
const premioPerfil = computed(() => tienda.usuario?.premio_perfil || null)
// % y tope del premio (configurables por el admin); se leen para no mostrar cifras fijas
const premioPct = ref(10)
const premioMax = ref(50)

// Celebración cuando el backend confirma que se ganó el premio
function celebrarPremio(res) {
  if (res?.premio_otorgado === true) {
    notif.exito(`¡Perfil completo! Ganaste ${premioPct.value}% de descuento en tu próximo pedido`)
  }
}

// Qué falta para llegar al 100% (mismos ítems que el porcentaje)
const pendientes = computed(() => {
  const u = tienda.usuario || {}
  const lista = []
  if (!u.nombres) lista.push({ clave: 'nombres', texto: 'Añade tus nombres' })
  if (!u.apellidos) lista.push({ clave: 'apellidos', texto: 'Añade tus apellidos' })
  if (!u.ci_carnet) lista.push({ clave: 'ci_carnet', texto: 'Añade tu CI' })
  if (!u.telefono) lista.push({ clave: 'telefono', texto: 'Añade tu teléfono' })
  if (!(u.url_foto_perfil || u.foto)) lista.push({ clave: 'foto', texto: 'Sube una foto' })
  if (!u.pregunta_seguridad) lista.push({ clave: 'pregunta', texto: 'Configura tu pregunta de seguridad' })
  if (!u.correo_verificado) lista.push({ clave: 'correo', texto: 'Verifica tu correo' })
  return lista
})
const correoVerificado = computed(() => !!tienda.usuario?.correo_verificado)

// Verificación / cambio de correo por código
const verifPaso = ref('')          // '' | 'codigo'
const verifCodigo = ref('')
const verifCargando = ref(false)
// Cooldown de reenvío (cuenta regresiva clara; el backend limita 1 cada 60 s)
const segundosReenvioVerif = ref(0)
let intervaloReenvioVerif = null
function iniciarCooldownVerif(seg = 60) {
  segundosReenvioVerif.value = seg
  clearInterval(intervaloReenvioVerif)
  intervaloReenvioVerif = setInterval(() => {
    segundosReenvioVerif.value--
    if (segundosReenvioVerif.value <= 0) clearInterval(intervaloReenvioVerif)
  }, 1000)
}
const editandoCorreo = ref(false)  // el correo está en modo edición
const correoNuevo = ref('')        // correo que se quiere establecer
const esCambioCorreo = ref(false)  // el código actual es para un correo nuevo
const destinoCorreo = ref('')      // a qué correo se envió el código (para el aviso)

function abrirEdicionCorreo() {
  correoNuevo.value = tienda.usuario?.correo || ''
  editandoCorreo.value = true
  verifPaso.value = ''
}
function cancelarEdicionCorreo() {
  editandoCorreo.value = false
  verifPaso.value = ''
  correoNuevo.value = ''
}

// nuevo = correo a establecer; si se omite, verifica el correo actual
async function iniciarVerificacion(nuevo) {
  verifCargando.value = true
  try {
    const cambio = !!nuevo && nuevo.trim().toLowerCase() !== (tienda.usuario?.correo || '').toLowerCase()
    const r = await clienteHttp.post('/usuarios/verificar-correo/enviar', cambio ? { nuevo_correo: nuevo.trim() } : {})
    if (r?.ya_verificado) {
      tienda.actualizarUsuario({ correo_verificado: true })
      notif.exito('Tu correo ya estaba verificado.')
      return
    }
    esCambioCorreo.value = !!r?.es_cambio
    destinoCorreo.value = cambio ? nuevo.trim() : (tienda.usuario?.correo || '')
    verifPaso.value = 'codigo'
    verifCodigo.value = ''
    iniciarCooldownVerif(60)
    notif.exito(`Te enviamos un código a ${destinoCorreo.value}.`)
  } catch (e) {
    if (e?.__status === 429 && segundosReenvioVerif.value <= 0) iniciarCooldownVerif(60)
    notif.error(e?.error || 'No se pudo enviar el código.')
  } finally { verifCargando.value = false }
}
async function confirmarVerificacion() {
  if (verifCodigo.value.length !== 6) return
  verifCargando.value = true
  try {
    const r = await clienteHttp.post('/usuarios/verificar-correo/confirmar', { codigo: verifCodigo.value })
    // El backend devuelve el usuario actualizado (correo nuevo si hubo cambio).
    const u = r?.usuario || {}
    tienda.actualizarUsuario({ correo_verificado: true, ...(u.correo ? { correo: u.correo } : {}) })
    verifPaso.value = ''
    verifCodigo.value = ''
    editandoCorreo.value = false
    esCambioCorreo.value = false
    notif.exito(r?.mensaje || '¡Correo verificado!')
    celebrarPremio(r)
  } catch (e) {
    notif.error(e?.error || 'Código incorrecto.')
  } finally { verifCargando.value = false }
}

const refFormDatos = ref(null)
const refFormSeguridad = ref(null)

function scrollSuave(el) {
  if (!el) return
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' })
}

// Cada chip pendiente lleva directo al campo o formulario que falta
async function irAPendiente(clave) {
  if (clave === 'foto') {
    triggerFileInput()
    return
  }
  if (clave === 'pregunta') {
    scrollSuave(refFormSeguridad.value)
    return
  }
  editando.value[clave] = true
  await nextTick()
  scrollSuave(refFormDatos.value)
  refFormDatos.value?.querySelector(`[data-campo="${clave}"] input`)?.focus()
}

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

const errorPassNueva = computed(() => {
  const p = formPass.value.nueva
  if (p && p.length < 6) return 'Mínimo 6 caracteres para proteger tu cuenta.'
  return ''
})

const passValido = computed(() => formPass.value.actual.length > 0 && formPass.value.nueva.length >= 6)

const seguridadValida = computed(() => !!formSeguridad.value.pregunta && !!(formSeguridad.value.respuesta || '').trim())

const cargandoDatos = ref(false)
const mensajeDatos = ref('')
const errorDatos = ref('')

const cargandoPass = ref(false)
const mensajePass = ref('')
const errorPass = ref('')

const cargandoSeguridad = ref(false)
const mensajeSeguridad = ref('')
const errorSeguridad = ref('')

// Los mensajes de éxito se autodescartan; los de error quedan hasta que el usuario actúe.
function autoOcultar(refMensaje) {
  setTimeout(() => { refMensaje.value = '' }, 4000)
}

// El token/login puede traer datos desactualizados o incompletos (telefono, ci,
// pregunta de seguridad); al entrar se pide la versión fresca al backend.
async function cargarPerfilFresco() {
  try {
    const res = await clienteHttp.get('/usuarios/perfil')
    const u = res.usuario
    if (!u) return
    const token = localStorage.getItem('euphoria_token')
    tienda.iniciarSesion({ usuario: u, token })
    // Solo pisamos el formulario si el usuario aún no empezó a editar.
    if (!hayCambios.value) {
      form.value = {
        nombres: u.nombres || '',
        apellidos: u.apellidos || '',
        ci_carnet: u.ci_carnet || '',
        telefono: u.telefono || ''
      }
      originalForm.value = { ...form.value }
    }
    if (!formSeguridad.value.respuesta) {
      formSeguridad.value.pregunta = u.pregunta_seguridad || formSeguridad.value.pregunta
    }
  } catch (error) {
    console.error('Error cargando perfil:', error)
  }
}

onMounted(cargarPerfilFresco)
onMounted(async () => {
  try {
    const c = await servicioBilletera.obtenerConfigPremio()
    if (c) { premioPct.value = c.pct ?? 10; premioMax.value = c.max ?? 50 }
  } catch { /* se quedan los valores por defecto */ }
})

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
  if (!hayCambios.value || !datosValidos.value) return
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
    autoOcultar(mensajeDatos)

    // Actualizar el store de autenticación con los nuevos datos
    const usuarioActualizado = res.usuario
    const token = localStorage.getItem('euphoria_token')
    tienda.iniciarSesion({ usuario: usuarioActualizado, token })

    celebrarPremio(res)

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
    autoOcultar(mensajePass)
    formPass.value.actual = ''
    formPass.value.nueva = ''
  } catch (error) {
    errorPass.value = error?.error || 'Error al cambiar contraseña'
  } finally {
    cargandoPass.value = false
  }
}

// ===== Recuperación sin contraseña actual (endpoints públicos) =====
const modalRecuperar = ref(false)
const pasoRec = ref('opciones') // 'opciones' | 'pregunta' | 'listo'
const preguntaRec = ref('')
const respuestaRec = ref('')
const nuevaPassRec = ref('')
const verNuevaPass = ref(false)
const cargandoRec = ref(false)
const errorRec = ref('')
const sinPregunta = ref(false)

// Solicitud de ayuda al local (mismo patrón que en el login, correo bloqueado)
const ayudaForm = reactive({ nombre: '', ci: '', telefono: '', mensaje: '' })
const exitoAyuda = ref('')

const faltaIdentidadAyuda = computed(() =>
  !ayudaForm.ci.trim() && !ayudaForm.telefono.trim()
)
const puedeEnviarAyuda = computed(() =>
  !!ayudaForm.nombre.trim() && !faltaIdentidadAyuda.value
)

const errorNuevaPassRec = computed(() => {
  const p = nuevaPassRec.value
  if (p && p.length < 6) return 'Mínimo 6 caracteres.'
  return ''
})

const recValido = computed(() => !!respuestaRec.value.trim() && nuevaPassRec.value.length >= 6)

function abrirRecuperar() {
  pasoRec.value = 'opciones'
  preguntaRec.value = ''
  respuestaRec.value = ''
  nuevaPassRec.value = ''
  verNuevaPass.value = false
  errorRec.value = ''
  sinPregunta.value = false
  modalRecuperar.value = true
}

function cerrarRecuperar() {
  modalRecuperar.value = false
}

function mensajeErrorRec(err, porDefecto) {
  if (err?.__status === 429) return 'Demasiados intentos, espera un momento.'
  return err?.error || porDefecto
}

async function elegirPregunta() {
  cargandoRec.value = true
  errorRec.value = ''
  sinPregunta.value = false
  try {
    const res = await clienteHttp.post('/auth/recuperar/pregunta', { correo: tienda.usuario?.correo })
    preguntaRec.value = res.pregunta
    pasoRec.value = 'pregunta'
  } catch (err) {
    if (err?.__status === 400) {
      sinPregunta.value = true
      errorRec.value = 'Aún no tienes una pregunta de seguridad.'
    } else {
      errorRec.value = mensajeErrorRec(err, 'No se pudo continuar. Intenta de nuevo.')
    }
  } finally {
    cargandoRec.value = false
  }
}

async function confirmarReset() {
  if (!recValido.value) return
  cargandoRec.value = true
  errorRec.value = ''
  try {
    await clienteHttp.post('/auth/recuperar/reset', {
      correo: tienda.usuario?.correo,
      respuesta: respuestaRec.value.trim(),
      nuevaPassword: nuevaPassRec.value
    })
    pasoRec.value = 'listo'
    formPass.value.actual = ''
    formPass.value.nueva = ''
  } catch (err) {
    if (err?.__status === 401) errorRec.value = 'La respuesta no coincide. Intenta otra vez.'
    else errorRec.value = mensajeErrorRec(err, 'No se pudo cambiar la contraseña. Intenta de nuevo.')
  } finally {
    cargandoRec.value = false
  }
}

// Abre el paso de ayuda con el nombre prellenado (el correo va bloqueado)
function abrirAyudaLocal() {
  errorRec.value = ''
  exitoAyuda.value = ''
  if (!ayudaForm.nombre) {
    ayudaForm.nombre = `${tienda.usuario?.nombres || ''} ${tienda.usuario?.apellidos || ''}`.trim()
  }
  pasoRec.value = 'ayuda'
}

async function enviarAyudaLocal() {
  if (!puedeEnviarAyuda.value) return
  cargandoRec.value = true
  errorRec.value = ''
  try {
    const res = await clienteHttp.post('/auth/recuperar/solicitud', {
      correo: tienda.usuario?.correo,
      nombre_contacto: ayudaForm.nombre.trim(),
      ci_contacto: ayudaForm.ci.trim() || undefined,
      telefono: ayudaForm.telefono.trim() || undefined,
      mensaje: ayudaForm.mensaje.trim() || undefined,
    })
    exitoAyuda.value = res.mensaje || 'Listo, el local recibió tu solicitud.'
    pasoRec.value = 'ayuda-ok'
  } catch (err) {
    errorRec.value = mensajeErrorRec(err, 'No pudimos enviar tu solicitud. Intenta de nuevo.')
  } finally {
    cargandoRec.value = false
  }
}

// Sin pregunta configurada: lo llevamos al formulario para crearla
function configurarPreguntaAhora() {
  cerrarRecuperar()
  scrollSuave(refFormSeguridad.value)
}

async function guardarSeguridad() {
  cargandoSeguridad.value = true
  mensajeSeguridad.value = ''
  errorSeguridad.value = ''
  try {
    const res = await clienteHttp.put('/usuarios/perfil/seguridad', formSeguridad.value)
    mensajeSeguridad.value = res.mensaje
    autoOcultar(mensajeSeguridad)
    // Opcional: actualizar el store si envían la pregunta actualizada
    const usuarioActualizado = res.usuario
    if (usuarioActualizado) {
      const token = localStorage.getItem('euphoria_token')
      tienda.iniciarSesion({ usuario: usuarioActualizado, token })
    }
    celebrarPremio(res)
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
  /* Fondo único de la app: sin orbes ni texturas que se recorten en bordes. */
  width: 100%;
  padding-bottom: var(--esp-7);
  box-sizing: border-box;
}

/* Contenido centrado */
.perfil-interior {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--esp-6) var(--esp-4) 0;
  box-sizing: border-box;
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
  font-size: clamp(1.65rem, 3.4vw, 2.05rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.08;
  color: var(--texto-principal);
  background: var(--gradiente-texto);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-wrap: balance;
}
.sub-hero {
  color: var(--texto-secundario);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 52ch;
  text-wrap: pretty;
}

/* ===== Bento (mobile-first: una columna; dos columnas desde 1024px) ===== */
.perfil-bento {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--esp-5);
  align-items: start;
}
@media (min-width: 1024px) {
  .perfil-bento {
    grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
    gap: var(--esp-6);
  }
}

/* ===== Tarjeta identidad (hardware) ===== */
.tarjeta-identidad {
  position: static;
  min-width: 0;
}
@media (min-width: 1024px) {
  .tarjeta-identidad {
    position: sticky;
    top: var(--esp-5);
  }
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

/* Barrido de luz sobre la portada */
.portada-brillo {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}
.portada-brillo::after {
  content: "";
  position: absolute;
  top: -45%;
  bottom: -45%;
  width: 70px;
  left: -30%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.32), transparent);
  transform: rotate(14deg);
  animation: barridoLuz 6s ease-in-out infinite;
}
@keyframes barridoLuz {
  0%, 55% { left: -30%; }
  90%, 100% { left: 130%; }
}

/* Anillo neón giratorio del avatar */
@property --giro-anillo {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
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
.foto-perfil::before {
  content: "";
  position: absolute;
  inset: -8px;
  border-radius: 34px;
  background: conic-gradient(from var(--giro-anillo),
    var(--morado-brillante), var(--rosa-acento), var(--morado-claro),
    var(--rosa-suave), var(--morado-brillante));
  z-index: -1;
  animation: giroAnillo 7s linear infinite;
}
@keyframes giroAnillo {
  to { --giro-anillo: 360deg; }
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
.punto-vivo {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-right: 7px;
  background: var(--color-exito);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
  animation: puntoPulso 2.2s ease-in-out infinite;
}
@keyframes puntoPulso {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.8); }
}

/* Aviso de foto pendiente de guardar */
.nota-foto {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: var(--esp-3);
  padding: 8px 11px;
  border-radius: var(--radio-md);
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--color-exito);
  background: rgba(34, 197, 94, 0.1);
  border: 1px dashed rgba(34, 197, 94, 0.35);
}
.nota-foto svg { flex-shrink: 0; }

/* Medidor de perfil completo */
.perfil-progreso {
  margin-top: var(--esp-4);
  padding-top: var(--esp-4);
  border-top: 1px dashed var(--borde-sutil);
}
.progreso-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.progreso-cabecera span {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--texto-secundario);
}
.progreso-cabecera strong {
  font-family: var(--fuente-titulo);
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--morado-hover);
}
.progreso-barra {
  height: 8px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid var(--glass-borde);
  overflow: hidden;
}
.progreso-relleno {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gradiente-marca);
  box-shadow: 0 0 12px rgba(236, 72, 153, 0.55);
  transition: width 0.6s var(--ease-suave);
}
.progreso-hint {
  margin-top: 8px;
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--texto-desactivado);
}
.progreso-hint.listo { color: var(--color-exito); }

/* Chips de lo que falta para el 100% */
.pendientes-lista {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-pendiente {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.1);
  border: 1px dashed var(--borde-sutil);
  color: var(--texto-secundario);
  font-family: var(--fuente-principal);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
  transition: var(--trans-rapida);
}
.chip-pendiente svg { flex-shrink: 0; color: var(--rosa-acento); }
.chip-pendiente:hover {
  color: var(--texto-principal);
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.2);
  transform: translateY(-1px);
}
.chip-pendiente:active { transform: scale(0.97); }
.chip-pendiente:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
}

/* ===== Premio por perfil completo ===== */
.premio-tarjeta {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-top: var(--esp-4);
  padding: 12px 13px;
  border-radius: var(--radio-lg);
  background: linear-gradient(150deg, rgba(245, 158, 11, 0.16), rgba(236, 72, 153, 0.1));
  border: 1px solid rgba(253, 230, 138, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 22px rgba(245, 158, 11, 0.18);
}
.premio-icono {
  flex-shrink: 0;
  width: 38px; height: 38px;
  display: grid; place-items: center;
  border-radius: 12px;
  color: #FDE68A;
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(253, 230, 138, 0.35);
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.3);
}
.premio-texto {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.premio-texto strong {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.35;
  color: #FDE68A;
  text-wrap: pretty;
}
.premio-texto small {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--texto-secundario);
  text-wrap: pretty;
}
.premio-usado {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--esp-3);
  font-size: 0.76rem;
  color: var(--texto-desactivado);
}
.premio-usado svg { flex-shrink: 0; color: var(--color-exito); }

/* ===== Columna formularios ===== */
.perfil-formularios {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
  min-width: 0;
}
/* Superficie sólida (sin backdrop-filter): fondo de tarjeta opaco */
.panel-form {
  position: relative;
  padding: var(--esp-6);
  background: var(--fondo-tarjeta);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-3);
  margin-bottom: var(--esp-5);
  padding-bottom: var(--esp-4);
  border-bottom: 1px solid var(--borde-sutil);
}
.panel-icono {
  flex-shrink: 0;
  width: 40px; height: 40px;
  display: grid; place-items: center;
  border-radius: 13px;
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
  min-width: 0;
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
.campo.campo-invalido {
  border-color: rgba(239, 68, 68, 0.6);
}
.campo.campo-invalido:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18), inset 0 1px 1px rgba(0,0,0,0.2);
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
  animation: pulsoEdicion 0.5s var(--ease-suave);
}
@keyframes pulsoEdicion {
  0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.55); }
  100% { box-shadow: 0 0 0 9px rgba(168, 85, 247, 0); }
}
.campo-editable.con-error {
  border-color: rgba(239, 68, 68, 0.65);
}
.campo-editable.con-error.editando-activo {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.16);
}
.campo-editable span {
  flex: 1;
  color: var(--texto-principal);
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Teléfono en modo lectura: bandera de Bolivia + número con prefijo, igual que admin/BaseTelefono */
.tel-lectura {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.tel-lectura-bandera {
  flex-shrink: 0;
  display: inline-flex;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
}
.tel-lectura-num {
  min-width: 0;
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
  min-width: 0;
  animation: aparecerCampo 0.28s var(--ease-suave);
}
@keyframes aparecerCampo {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
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
.btn-lapiz.activo {
  opacity: 1;
  color: #fff;
  background: var(--gradiente-marca);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.45);
}

/* Error inline bajo el campo */
.error-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--color-error);
}
.error-inline svg { flex-shrink: 0; }

.err-inline-enter-active,
.err-inline-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.err-inline-enter-from,
.err-inline-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Botones */
.btn-guardar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
.btn-guardar:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-guardar:active:not(:disabled) { transform: scale(0.97); }
.btn-guardar:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.4), 0 8px 22px rgba(168, 85, 247, 0.35);
}
.btn-guardar:disabled {
  opacity: 0.55;
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
.btn-secundario:hover:not(:disabled) {
  background: rgba(168, 85, 247, 0.2);
  border-color: var(--morado-brillante);
  color: var(--texto-principal);
  box-shadow: var(--glow-morado);
}

/* Spinner de guardado */
.spin {
  width: 15px; height: 15px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: girar 0.7s linear infinite;
}
.spin-tenue {
  border-color: rgba(192, 132, 252, 0.3);
  border-top-color: var(--morado-hover);
}
@keyframes girar {
  to { transform: rotate(360deg); }
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
.btn-cancelar:hover:not(:disabled) {
  background: rgba(168, 85, 247, 0.08);
  border-color: var(--borde-activo);
  color: var(--texto-principal);
}
.btn-cancelar:active:not(:disabled) { transform: scale(0.97); }
.btn-cancelar:focus-visible {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.25);
}
.btn-cancelar:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-guardar-inline {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
.btn-guardar-inline:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(236, 72, 153, 0.45), var(--glow-morado); }
.btn-guardar-inline:active:not(:disabled) { transform: scale(0.97); }
.btn-guardar-inline:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.4), 0 8px 22px rgba(168, 85, 247, 0.35);
}
.btn-guardar-inline:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Mensajes de resultado */
.mensaje {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: var(--esp-4);
  padding: 11px 12px;
  border-radius: var(--radio-md);
}
.mensaje svg { flex-shrink: 0; }
.exito { background: rgba(34, 197, 94, 0.12); color: var(--color-exito); border: 1px solid rgba(34, 197, 94, 0.3); }
.error { background: rgba(239, 68, 68, 0.12); color: var(--color-error); border: 1px solid rgba(239, 68, 68, 0.3); }

/* Check animado del éxito */
.icono-exito .exito-circulo {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: trazo 0.5s var(--ease-suave) forwards;
}
.icono-exito .exito-check {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: trazo 0.35s var(--ease-suave) 0.35s forwards;
}
@keyframes trazo {
  to { stroke-dashoffset: 0; }
}

.mensaje-pop-enter-active {
  transition: opacity 0.3s var(--ease-suave), transform 0.35s var(--ease-rebote);
}
.mensaje-pop-leave-active {
  transition: opacity 0.2s ease;
}
.mensaje-pop-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
.mensaje-pop-leave-to {
  opacity: 0;
}

/* Enlace discreto para recuperar sin contraseña actual */
.link-recuperar {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 2px 0;
  margin-top: var(--esp-2);
  font-family: var(--fuente-principal);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--morado-hover);
  cursor: pointer;
  border-radius: var(--radio-sm);
  transition: color 0.2s ease;
}
.link-recuperar:hover { color: var(--rosa-suave); text-decoration: underline; text-underline-offset: 3px; }
.link-recuperar:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

/* ===== Modal de recuperación (Teleport a body: sobre el navbar inferior) ===== */
.rec-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(8, 4, 20, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--esp-4);
  padding-bottom: calc(var(--esp-4) + env(safe-area-inset-bottom));
}
.rec-modal {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 90dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  padding: var(--esp-6) var(--esp-5);
  padding-bottom: calc(var(--esp-6) + env(safe-area-inset-bottom));
  box-shadow: var(--sombra-modal), 0 0 40px rgba(168, 85, 247, 0.18);
}
.rec-cerrar {
  position: absolute;
  top: 12px; right: 12px;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: none;
  border: none;
  border-radius: var(--radio-full);
  color: var(--texto-secundario);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease;
}
.rec-cerrar:hover { background: rgba(168, 85, 247, 0.15); color: var(--texto-principal); }
.rec-cerrar:active { transform: scale(0.92); }
.rec-cerrar:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.rec-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
  margin: 0 0 6px;
  padding-right: 34px;
  text-wrap: balance;
}
.rec-sub {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  line-height: 1.5;
  margin-bottom: var(--esp-5);
  text-wrap: pretty;
}
.rec-correo {
  font-size: 0.8rem;
  color: var(--texto-desactivado);
  margin-bottom: var(--esp-4);
  word-break: break-word;
}

.rec-opciones {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
}
.rec-opcion {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  width: 100%;
  padding: 13px 14px;
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
  color: var(--texto-principal);
  font-family: var(--fuente-principal);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  min-width: 0;
  transition: var(--trans-rapida);
}
.rec-opcion:hover:not(:disabled) {
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.14);
  transform: translateY(-1px);
}
.rec-opcion:active:not(:disabled) { transform: scale(0.99); }
.rec-opcion:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.rec-opcion:disabled { opacity: 0.6; cursor: wait; }
.rec-opcion-icono {
  flex-shrink: 0;
  width: 38px; height: 38px;
  display: grid; place-items: center;
  border-radius: 12px;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--glass-borde);
}
.rec-opcion-texto {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.rec-opcion-texto strong {
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.3;
}
.rec-opcion-texto small {
  font-size: 0.76rem;
  color: var(--texto-desactivado);
  line-height: 1.35;
}

.rec-pregunta {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.32);
  padding: 12px 14px;
  border-radius: var(--radio-md);
  color: var(--morado-hover);
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: var(--esp-4);
  text-align: center;
  text-wrap: pretty;
}
.rec-campo-pass {
  position: relative;
}
.rec-campo-pass .campo { padding-right: 74px; }
.rec-ojo {
  position: absolute;
  right: 8px; top: 50%;
  transform: translateY(-50%);
  background: var(--fondo-tarjeta-alt);
  color: var(--texto-secundario);
  border: 1px solid var(--borde-sutil);
  cursor: pointer;
  font-family: var(--fuente-principal);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--radio-sm);
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.rec-ojo:hover {
  background: rgba(168, 85, 247, 0.18);
  color: var(--texto-principal);
  border-color: var(--borde-activo);
}
.rec-ojo:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.rec-mensaje { justify-content: flex-start; }
.rec-config {
  display: block;
  width: 100%;
  margin-top: var(--esp-3);
  padding: 11px;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-full);
  color: var(--morado-hover);
  font-family: var(--fuente-principal);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: var(--trans-rapida);
}
.rec-config:hover { background: rgba(168, 85, 247, 0.2); color: var(--texto-principal); }
.rec-config:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.rec-ayuda {
  margin-top: var(--esp-4);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--borde-sutil);
  text-align: center;
  font-size: 0.78rem;
}
.rec-ayuda a {
  color: var(--rosa-acento);
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--radio-sm);
}
.rec-ayuda a:hover { color: var(--rosa-suave); text-decoration: underline; text-underline-offset: 3px; }
.rec-ayuda a:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.5); }
.rec-ayuda-btn {
  background: none;
  border: none;
  padding: 0;
  font-family: var(--fuente-principal);
  font-size: inherit;
  color: var(--rosa-acento);
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radio-sm);
  transition: color 0.18s ease;
}
.rec-ayuda-btn:hover { color: var(--rosa-suave); text-decoration: underline; text-underline-offset: 3px; }
.rec-ayuda-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.5); }

/* Paso "Pedir ayuda al local" */
.campo-bloqueado {
  opacity: 0.65;
  cursor: not-allowed;
}
.campo-bloqueado:focus {
  border-color: var(--borde-sutil);
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.2);
}
.campo-area {
  resize: vertical;
  min-height: 58px;
  line-height: 1.45;
}
.nota-verifica {
  font-size: 0.78rem;
  color: var(--texto-desactivado);
  line-height: 1.45;
  margin-bottom: var(--esp-2);
  text-wrap: pretty;
}
.nota-minima {
  margin-top: 6px;
  font-size: 0.76rem;
  line-height: 1.35;
  color: var(--texto-desactivado);
}
.rec-volver {
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
.rec-volver:hover { color: var(--texto-principal); text-decoration: underline; text-underline-offset: 3px; }
.rec-volver:focus-visible { outline: none; box-shadow: var(--anillo-foco); }

.rec-listo {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  padding-top: var(--esp-2);
}
.rec-listo .icono-exito { color: var(--color-exito); margin-bottom: var(--esp-2); }
.rec-listo .rec-sub { margin-bottom: var(--esp-4); }
.rec-listo .btn-guardar { margin-top: 0; }

.modal-rec-enter-active { transition: opacity 0.25s ease; }
.modal-rec-leave-active { transition: opacity 0.18s ease; }
.modal-rec-enter-from,
.modal-rec-leave-to { opacity: 0; }

/* ===== Responsividad ===== */

/* Apilado (una columna) hasta 1024px: tablet y móvil */
@media (max-width: 1023px) {
  .vista-perfil {
    padding: var(--esp-5) var(--esp-4) var(--esp-6);
  }
  .tarjeta-identidad {
    max-width: 100%;
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
  /* Campos cómodos de tocar y sin zoom en iOS al enfocar */
  .campo {
    font-size: 16px;
    padding: 13px 14px;
  }
  .campo-editable {
    min-height: 48px;
  }
  .campo-editable span,
  .campo-editable .campo {
    font-size: 16px;
  }
  .btn-lapiz {
    width: 38px; height: 38px;
  }
  .btn-editar-foto {
    width: 38px; height: 38px;
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
  .foto-perfil::before,
  .portada-brillo::after,
  .punto-vivo {
    animation: none;
  }
  .campo-editable.editando-activo,
  .campo-editable .campo {
    animation: none;
  }
  .icono-exito .exito-circulo,
  .icono-exito .exito-check {
    animation: none;
    stroke-dashoffset: 0;
  }
  .progreso-relleno {
    transition: none;
  }
  .err-inline-enter-active,
  .err-inline-leave-active,
  .mensaje-pop-enter-active,
  .mensaje-pop-leave-active {
    transition: opacity 0.15s ease;
    transform: none;
  }
  .btn-guardar:hover:not(:disabled),
  .btn-guardar-inline:hover:not(:disabled),
  .btn-cancelar:active:not(:disabled),
  .btn-editar-foto:hover,
  .btn-lapiz:hover,
  .chip-pendiente:hover,
  .rec-opcion:hover:not(:disabled) {
    transform: none;
  }
  .modal-rec-enter-active,
  .modal-rec-leave-active {
    transition: opacity 0.15s ease;
  }
}

/* Verificación de correo */
.correo-verif {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--borde-sutil, rgba(255,255,255,.12));
  border-radius: 12px;
  background: var(--fondo-tarjeta-alt, rgba(255,255,255,.03));
}
.correo-verif-valor {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--texto-principal);
}
.verif-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: .74rem;
  font-weight: 800;
}
.verif-badge.ok {
  color: var(--color-exito, #22c55e);
  background: rgba(34, 197, 94, .13);
  border: 1px solid rgba(34, 197, 94, .32);
}
.verif-badge.pend {
  color: #d4a017;
  background: rgba(234, 179, 8, .12);
  border: 1px solid rgba(234, 179, 8, .32);
}
.verif-link {
  background: none;
  border: none;
  color: var(--color-primario, #a855f7);
  font-size: .8rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 2px;
}
.verif-link:hover { text-decoration: underline; }
.verif-correo-input {
  flex: 1;
  min-width: 140px;
}
.verif-btn {
  padding: 7px 16px;
  border-radius: 10px;
  border: none;
  background: var(--gradiente-marca, linear-gradient(135deg,#8b5cf6,#ec4899));
  color: #fff;
  font-weight: 700;
  font-size: .82rem;
  cursor: pointer;
  transition: filter .15s ease, transform .1s ease;
}
.verif-btn:hover:not(:disabled) { filter: brightness(1.08); }
.verif-btn:active:not(:disabled) { transform: scale(.96); }
.verif-btn:disabled { opacity: .6; cursor: wait; }
.verif-codigo {
  margin-top: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(139, 92, 246, .08);
  border: 1px dashed rgba(139, 92, 246, .35);
}
.verif-hint { margin: 0 0 10px; font-size: .8rem; color: var(--texto-secundario); line-height: 1.45; }
.verif-codigo-fila { display: flex; gap: 8px; align-items: stretch; flex-wrap: wrap; }
.verif-input {
  flex: 1;
  min-width: 120px;
  text-align: center;
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 8px;
  font-variant-numeric: tabular-nums;
}
.verif-reenviar {
  margin-top: 8px;
  background: none;
  border: none;
  color: var(--color-primario, #a855f7);
  font-size: .78rem;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 0;
}
.verif-reenviar:disabled { opacity: .5; cursor: wait; }

/* ============================================================
   Barra flotante de guardado (celular): siempre a la vista cuando
   hay cambios, por encima de la píldora de navegación inferior.
   En escritorio se ocultan (bastan los botones al pie del formulario).
   ============================================================ */
.barra-guardar-movil {
  position: fixed;
  left: 0;
  right: 0;
  /* Encima de la píldora de navegación (bottom 14px + alto 66px) */
  bottom: calc(90px + env(safe-area-inset-bottom));
  z-index: 55;
  display: none;
  padding: 0 14px;
  pointer-events: none;
}
.barra-guardar-inner {
  pointer-events: auto;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px 9px 16px;
  border-radius: var(--radio-full, 999px);
  background: var(--fondo-tarjeta, rgba(20, 12, 32, 0.92));
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border: 1px solid var(--borde-activo, rgba(168, 85, 247, 0.4));
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 40px rgba(168, 85, 247, 0.18);
}
.barra-guardar-nota {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--texto-secundario);
  white-space: nowrap;
}
.barra-punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--morado-brillante, #a855f7);
  box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.55);
  animation: barraLatido 1.9s ease-out infinite;
}
@keyframes barraLatido {
  0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.55); }
  70% { box-shadow: 0 0 0 7px rgba(168, 85, 247, 0); }
  100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
}
.barra-guardar-acciones {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.barra-guardar-acciones .btn-cancelar {
  flex: 0 0 auto;
  padding: 10px 15px;
  font-size: 0.85rem;
}
.barra-guardar-acciones .btn-guardar-inline {
  flex: 0 0 auto;
  padding: 10px 18px;
  font-size: 0.9rem;
}

/* Transición: sube desde el borde inferior */
.barra-guardar-enter-active,
.barra-guardar-leave-active {
  transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.barra-guardar-enter-from,
.barra-guardar-leave-to {
  opacity: 0;
  transform: translateY(140%);
}

/* Solo en celular/tablet: en escritorio los botones inline bastan */
@media (max-width: 1023px) {
  .barra-guardar-movil { display: block; }
}

/* Teléfonos estrechos: ocultamos la nota y los botones ocupan todo el ancho */
@media (max-width: 430px) {
  .barra-guardar-nota { display: none; }
  .barra-guardar-acciones { flex: 1; }
  .barra-guardar-acciones .btn-cancelar { flex: 1; padding: 12px 10px; }
  .barra-guardar-acciones .btn-guardar-inline { flex: 2; padding: 12px 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .barra-punto { animation: none; }
  .barra-guardar-enter-active,
  .barra-guardar-leave-active {
    transition: opacity 0.18s ease;
  }
  .barra-guardar-enter-from,
  .barra-guardar-leave-to {
    transform: none;
  }
}
</style>
