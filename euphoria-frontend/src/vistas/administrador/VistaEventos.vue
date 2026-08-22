<template>
  <div class="vista-eventos fade-in">
    <header class="eventos-encabezado superficie">
      <div class="encabezado-fila">
        <div class="encabezado-texto">
          <h2 class="vista-titulo">Gestión de eventos</h2>
          <p class="vista-subtitulo">Planifica y activa las fechas de atención del establecimiento</p>
        </div>
        <div class="acciones-encabezado">
          <!-- Noches de siempre: el boliche abre igual, solo con DJ. Un clic deja
               el evento armado (nombre, día y horario) listo para elegir el plano. -->
          <button class="btn btn-rapido" @click="abrirNocheEstandar(5)" title="Crear la noche del próximo viernes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" class="btn-icono"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            Viernes
          </button>
          <button class="btn btn-rapido" @click="abrirNocheEstandar(6)" title="Crear la noche del próximo sábado">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" class="btn-icono"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            Sábado
          </button>
          <button class="btn btn-primario brillo-hover" @click="abrirModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="btn-icono"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nuevo evento
          </button>
        </div>
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
    <!-- LÍNEA DE TIEMPO: los eventos agrupados por mes, en orden de fecha.
         Reemplaza la grilla de tarjetas sueltas: se lee la agenda de un vistazo. -->
    <div class="linea-tiempo" v-if="!cargando">
      <div v-if="!listaActiva.length && !huecosSugeridos.length" class="estado-vacio">
        <div class="estado-vacio-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <p v-if="pestana === 'pasados'">Aún no hay eventos pasados.</p>
        <p v-else>Aún no hay eventos actuales.</p>
      </div>

      <section v-for="mes in mesesAgenda" :key="mes.clave" class="mes-bloque aparecer-subir">
        <header class="mes-cab">
          <h3 class="mes-nombre">{{ mes.nombre }}</h3>
          <span class="mes-conteo">{{ mes.eventos.length }}</span>
        </header>

        <ul class="mes-filas">
          <li v-for="fila in mes.eventos" :key="fila.clave" class="fila-ev" :class="{ 'fila-hueco': fila.hueco }">
            <!-- Día -->
            <div class="fila-dia" :class="{ finde: fila.finde }">
              <span class="fd-sem">{{ fila.diaSemana }}</span>
              <span class="fd-num">{{ fila.diaNum }}</span>
            </div>

            <!-- Hueco: viernes o sábado sin evento -->
            <template v-if="fila.hueco">
              <div class="fila-cuerpo">
                <p class="fila-hueco-txt">Sin evento esta noche</p>
              </div>
              <button class="fila-crear" type="button" @click="abrirNocheEstandar(fila.diaSemanaNum)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Crear
              </button>
            </template>

            <!-- Evento real -->
            <template v-else>
              <div class="fila-flyer">
                <img v-if="fila.ev.url_portada" :src="fila.ev.url_portada" :alt="fila.ev.nombre_evento" />
                <span v-else class="fila-flyer-vacio" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="18" height="18"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 20"/></svg>
                </span>
              </div>

              <div class="fila-cuerpo">
                <p class="fila-nombre">{{ fila.ev.nombre_evento }}</p>
                <p class="fila-meta">
                  <span class="fm-hora">{{ fila.hora }}</span>
                  <span class="fm-punto" :style="{ background: colorEstado(fila.ev.estado) }" aria-hidden="true"></span>
                  <span class="fm-estado">{{ etiquetaEstado(fila.ev.estado) }}</span>
                  <span v-if="fila.ev.cantidadZonas" class="fm-planos">{{ fila.ev.cantidadZonas }} plano{{ fila.ev.cantidadZonas > 1 ? 's' : '' }}</span>
                </p>
              </div>

              <div class="acciones">
                <button class="btn-icono-acc" @click="abrirModal(fila.ev)" title="Editar datos del evento" aria-label="Editar evento">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button class="btn-icono-acc" @click="abrirPlanosEvento(fila.ev)" :title="`Planos y precios (${fila.ev.cantidadZonas || 0})`" aria-label="Planos del evento">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>
                  <span v-if="fila.ev.cantidadZonas" class="chip-conteo">{{ fila.ev.cantidadZonas }}</span>
                </button>
                <button class="btn-icono-acc acc-estado" @click="iniciarCambioEstado(fila.ev)" title="Cambiar el estado del evento" aria-label="Cambiar estado">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>
                </button>
                <button class="btn-icono-acc acc-borrar" @click="eliminarEvento(fila.ev)" :disabled="eliminandoEvento === fila.ev.id_evento" title="Eliminar evento" aria-label="Eliminar evento">
                  <svg v-if="eliminandoEvento !== fila.ev.id_evento" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  <span v-else class="acc-spinner" aria-hidden="true"></span>
                </button>
              </div>
            </template>
          </li>
        </ul>
      </section>
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

    <!-- Asistente de evento: datos → espacio → publicar, en un solo modal -->
    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
        <div class="modal modal-wizard fade-in">
          <div class="modal-cabecera wz-cab">
            <div class="wz-titulo">
              <span class="wz-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="21" height="21" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>
              </span>
              <div class="wz-textos">
                <h3>{{ esNuevo ? 'Nuevo evento' : 'Editar evento' }}</h3>
                <p class="wz-sub">{{ esNuevo ? 'Datos, espacio y publicación, en tres pasos' : (eventoEditando?.nombre_evento || '') }}</p>
              </div>
            </div>
            <button class="btn-x" @click="cerrarModal" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>

          <!-- Pasos -->
          <ol class="wz-pasos" aria-label="Pasos del asistente">
            <li v-for="p in PASOS" :key="p.n" :class="{ activo: paso === p.n, hecho: paso > p.n }">
              <button type="button" :disabled="p.n > 1 && !idEventoWizard" @click="irAPaso(p.n)">
                <span class="wz-num">
                  <svg v-if="paso > p.n" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <template v-else>{{ p.n }}</template>
                </span>
                <span class="wz-lbl">{{ p.label }}</span>
              </button>
            </li>
          </ol>

          <!-- ===== PASO 1: DATOS ===== -->
          <form v-if="paso === 1" class="modal-form" @submit.prevent="guardarYContinuar">
            <section class="wz-seccion">
              <p class="wz-seccion-tit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 8h10M7 12h6"></path></svg>
                Datos básicos
              </p>
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
            </section>

            <section class="wz-seccion">
              <p class="wz-seccion-tit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9.5" r="1.6"></circle><path d="m21 16-5-5L5 20"></path></svg>
                Portada (flyer)
              </p>
              <div class="subida-imagen">
                <input type="file" ref="inputArchivo" accept="image/*" @change="manejarArchivo" class="input-file" id="file-evento" />
                <label
                  for="file-evento"
                  class="dropzone"
                  :class="{ 'dropzone-cargada': archivoSeleccionado, 'dropzone-arrastrando': arrastrandoFlyer }"
                  @dragover.prevent="arrastrandoFlyer = true"
                  @dragenter.prevent="arrastrandoFlyer = true"
                  @dragleave.prevent="arrastrandoFlyer = false"
                  @drop.prevent="soltarFlyer"
                >
                  <span class="dropzone-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </span>
                  <span class="dropzone-texto">
                    {{ archivoSeleccionado ? archivoSeleccionado.name : (arrastrandoFlyer ? 'Soltá la imagen aquí' : 'Arrastrá el flyer o hacé clic') }}
                  </span>
                  <span class="dropzone-hint">PNG o JPG · hasta 5 MB</span>
                </label>
                <p v-if="errorFlyer" class="dropzone-error">{{ errorFlyer }}</p>
              </div>
              <img v-if="previewImagen" :src="previewImagen" class="preview-img" alt="Vista previa" />
            </section>

            <div class="modal-footer">
              <button type="button" class="btn btn-secundario" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primario" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Siguiente: espacio' }}
              </button>
            </div>
          </form>

          <!-- ===== PASO 2: ESPACIO (planos, precio por área, cortesía) ===== -->
          <div v-else-if="paso === 2" class="modal-form">
            <section class="wz-seccion">
              <p class="wz-seccion-tit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M9 4 3 6v14l6-3 6 3 6-3V3l-6 3-6-3z"></path><path d="M9 4v14M15 6v14"></path></svg>
                Planos del evento
              </p>
              <p class="tipo-ayuda">Un plano por piso o ambiente. <b>Los precios se definen acá y solo acá</b>: el plano es el dibujo del local. Se cobra por área y las mesas heredan el de la suya.</p>

              <div v-if="planosDelEvento.length" class="pl-lista">
                <div v-for="p in planosDelEvento" :key="p.id_zona" class="pl-item pl-item-col">
                  <div class="pl-item-cab">
                    <div class="pl-item-info">
                      <strong>{{ p.nombre }}</strong>
                      <span class="pl-item-meta">aforo {{ p.aforo }} · {{ p.elementos_total }} elementos</span>
                    </div>
                    <button class="btn btn-sm btn-peligro" @click="quitarPlanoDeEvento(p)">Quitar</button>
                  </div>
                  <div class="wz-areas">
                    <label v-for="a in p.areas" :key="a.clave || a.nombre" class="wz-area">
                      <span class="wz-area-nom">{{ a.nombre }}<small v-if="a.parados"> · {{ a.parados }} de pie</small></span>
                      <span class="campo-adorno"><span class="adorno">Bs.</span><input v-model.number="a.precio" type="number" min="0" step="0.01" class="campo campo--prefijo" /></span>
                    </label>
                    <label v-if="p.tiene_general || !p.areas.length" class="wz-area">
                      <span class="wz-area-nom">General<small> · mesas sin área</small></span>
                      <span class="campo-adorno"><span class="adorno">Bs.</span><input v-model.number="p.precio_entrada_base" type="number" min="0" step="0.01" class="campo campo--prefijo" /></span>
                    </label>
                  </div>
                  <div class="wz-area-acciones">
                    <div class="wz-prioridad"><BaseSelect v-model="p.prioridad" :options="OPCIONES_PRIORIDAD" /></div>
                    <button class="btn btn-sm btn-secundario" :disabled="guardandoPrecios === p.id_zona" @click="guardarPreciosPlano(p)">
                      {{ guardandoPrecios === p.id_zona ? 'Guardando…' : 'Guardar precios' }}
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="pl-vacio">Este evento aún no tiene planos. Agrega el primero abajo.</p>

              <div class="pl-agregar">
                <span class="pl-agregar-tit">Agregar plano</span>
                <div class="form-fila">
                  <div class="grupo-campo">
                    <label class="etiqueta">Plano (de la biblioteca)</label>
                    <BaseSelect v-model="formAgregar.id_plano" :options="opcionesPlano" placeholder="Elige un plano" @update:model-value="alElegirPlano" />
                  </div>
                  <div class="grupo-campo">
                    <label class="etiqueta">Nombre en el evento (opcional)</label>
                    <input v-model="formAgregar.nombre" class="campo" placeholder="Ej. Primer piso" />
                  </div>
                </div>
                <template v-if="planoElegido">
                  <!-- Atajo: repetir lo que se cobró la última vez con este plano -->
                  <button v-if="ultimosPrecios" type="button" class="wz-copiar" @click="copiarUltimosPrecios">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copiar precios de {{ ultimosPrecios.evento }}
                  </button>
                  <div class="wz-areas">
                    <label v-for="a in planoElegido.areas" :key="a.clave" class="wz-area">
                      <span class="wz-area-nom">{{ a.nombre }}<small v-if="a.parados"> · {{ a.parados }} de pie</small></span>
                      <span class="campo-adorno"><span class="adorno">Bs.</span><input v-model.number="formAgregar.precios[a.clave]" type="number" min="0" step="0.01" class="campo campo--prefijo" /></span>
                    </label>
                    <label v-if="planoElegido.tiene_general" class="wz-area">
                      <span class="wz-area-nom">General<small> · mesas sin área</small></span>
                      <span class="campo-adorno"><span class="adorno">Bs.</span><input v-model.number="formAgregar.precio_general" type="number" min="0" step="0.01" class="campo campo--prefijo" /></span>
                    </label>
                    <p v-if="!planoElegido.areas.length && !planoElegido.tiene_general" class="tipo-ayuda">Este plano no tiene mesas ni áreas reservables.</p>
                  </div>
                  <div class="grupo-campo">
                    <label class="etiqueta">Prioridad de atención</label>
                    <BaseSelect v-model="formAgregar.prioridad" :options="OPCIONES_PRIORIDAD" />
                    <small class="ayuda-campo">Orden en que la barra prepara los pedidos de esta zona.</small>
                  </div>
                </template>
                <button class="btn btn-primario" style="width:100%" :disabled="!formAgregar.id_plano || agregandoPlano" @click="agregarPlanoAEvento">
                  {{ agregandoPlano ? 'Agregando…' : '+ Agregar al evento' }}
                </button>
              </div>
            </section>

            <section class="wz-seccion">
              <p class="wz-seccion-tit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13M5 12v9h14v-9"></path><path d="M12 8a3 3 0 1 1 3-3c0 2-3 3-3 3zM12 8a3 3 0 1 0-3-3c0 2 3 3 3 3z"></path></svg>
                Combo de cortesía
              </p>
              <label class="switch-row">
                <span class="switch"><input type="checkbox" v-model="form.cortesia_activa" /><span class="switch-track"><span class="switch-thumb"></span></span></span>
                <span class="switch-info"><span class="switch-txt">Regalar un combo por reserva</span><span class="switch-desc">El cliente elige entre ron, singani, vino o cerveza. Descuenta stock, no cobra.</span></span>
              </label>
              <div v-if="form.cortesia_activa" class="grupo-campo wz-cortesia-monto">
                <label class="etiqueta">Para reservas desde</label>
                <span class="campo-adorno"><span class="adorno">Bs.</span><input v-model.number="form.cortesia_desde" type="number" min="0" step="1" class="campo campo--prefijo" /></span>
                <small class="ayuda-campo">Ej. 800: toda mesa reservada por Bs 800 o más recibe el combo.</small>
              </div>
            </section>

            <div class="modal-footer">
              <button type="button" class="btn btn-secundario" @click="paso = 1">Atrás</button>
              <button type="button" class="btn btn-primario" :disabled="guardando" @click="guardarCortesiaYContinuar">
                {{ guardando ? 'Guardando...' : 'Siguiente: publicar' }}
              </button>
            </div>
          </div>

          <!-- ===== PASO 3: PUBLICAR ===== -->
          <div v-else class="modal-form">
            <section class="wz-seccion">
              <p class="wz-seccion-tit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M20 6 9 17l-5-5"></path></svg>
                Revisión
              </p>
              <dl class="wz-dl">
                <div><dt>Evento</dt><dd>{{ form.nombre_evento }} <span class="wz-chip">{{ etiquetaTipo(form.tipo_evento) }}</span></dd></div>
                <div><dt>Cuándo</dt><dd>{{ formatearFecha(form.fecha_hora_inicio) }}<template v-if="form.fecha_hora_fin"> → {{ formatearFecha(form.fecha_hora_fin) }}</template></dd></div>
                <div>
                  <dt>Planos</dt>
                  <dd v-if="planosDelEvento.length">{{ planosDelEvento.length }} plano{{ planosDelEvento.length === 1 ? '' : 's' }} · aforo {{ aforoTotalWizard }} personas · {{ resumenPrecios }}</dd>
                  <dd v-else class="wz-alerta">Sin planos: los clientes no podrán reservar.</dd>
                </div>
                <div><dt>Cortesía</dt><dd>{{ form.cortesia_activa ? `Combo de regalo para reservas desde Bs ${form.cortesia_desde}` : 'No se regala combo' }}</dd></div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span class="wz-estado" :style="{ color: colorEstado(estadoWizard) }"><i class="badge-punto" aria-hidden="true"></i>{{ etiquetaEstado(estadoWizard) }}</span>
                    <small class="wz-estado-desc">{{ ESTADOS[estadoWizard]?.desc }}</small>
                  </dd>
                </div>
              </dl>
            </section>
            <div class="modal-footer">
              <button type="button" class="btn btn-secundario" @click="paso = 2">Atrás</button>
              <template v-if="estadoWizard === 'planificacion'">
                <button type="button" class="btn btn-secundario" @click="cerrarModal">Guardar como borrador</button>
                <button type="button" class="btn btn-primario" :disabled="publicando || !planosDelEvento.length" @click="publicarEvento">
                  {{ publicando ? 'Publicando…' : 'Publicar evento' }}
                </button>
              </template>
              <button v-else type="button" class="btn btn-primario" @click="cerrarModal">Listo</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Cambiar estado (solo los manuales: En curso es automático por la hora) -->
    <Teleport to="body">
      <div v-if="modalEstado" class="modal-fondo" @click.self="modalEstado=false">
        <div class="modal fade-in" style="max-width: 440px;">
          <div class="modal-cabecera">
            <h3>Estado del evento</h3>
            <button class="btn-x" @click="modalEstado=false" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div class="modal-form">
            <p class="tipo-ayuda"><strong>{{ eventoParaEstado?.nombre_evento }}</strong> · <em>En curso</em> se activa solo cuando llega la hora de inicio, y <em>Terminado</em> al pasar la hora de fin.</p>
            <div class="wz-estados">
              <button
                v-for="s in ESTADOS_MANUALES" :key="s" type="button"
                class="wz-estado-op" :class="{ activo: nuevoEstadoSeleccionado === s }"
                :disabled="estadoDeshabilitado(s)" :style="{ '--c': ESTADOS[s].color }"
                @click="nuevoEstadoSeleccionado = s">
                <i class="badge-punto" aria-hidden="true"></i>
                <span><b>{{ ESTADOS[s].label }}</b><small>{{ ESTADOS[s].desc }}</small></span>
              </button>
            </div>
            <p v-if="eventoExpirado" class="tipo-ayuda">La fecha de este evento ya pasó: no puede volver a borrador ni publicarse.</p>
            <div class="modal-footer">
              <button class="btn btn-secundario" @click="modalEstado=false">Cancelar</button>
              <button class="btn btn-primario" @click="confirmarCambioEstado">Guardar estado</button>
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

// Estados VISIBLES: cuatro (Borrador, Publicado, En curso, Terminado). Los códigos
// internos se conservan; 'lleno' es "En curso con el aforo completo", no un estado aparte.
const ESTADOS = {
  planificacion: { label: 'Borrador',  color: '#8b8b96', desc: 'Solo lo ves tú. El cliente todavía no lo ve.' },
  promocion:     { label: 'Publicado', color: '#a855f7', desc: 'Visible en la cartelera y reservable.' },
  en_transcurso: { label: 'En curso',  color: '#22c55e', desc: 'Está ocurriendo ahora. Se activa solo por la hora.' },
  lleno:         { label: 'En curso',  color: '#22c55e', desc: 'En curso, con el aforo completo.', sub: 'Aforo completo' },
  terminado:     { label: 'Terminado', color: '#6b7280', desc: 'Cerrado. No se puede reabrir.' },
}
const ORDEN_ESTADOS = ['planificacion', 'promocion', 'en_transcurso', 'terminado']
// Los que el admin cambia a mano. "En curso" lo pone el sistema cuando llega la hora.
const ESTADOS_MANUALES = ['planificacion', 'promocion', 'terminado']

// ---- Asistente de 3 pasos ----
const PASOS = [{ n: 1, label: 'Datos' }, { n: 2, label: 'Espacio' }, { n: 3, label: 'Publicar' }]
const paso = ref(1)
const esNuevo = ref(true)
const publicando = ref(false)
const OPCIONES_PRIORIDAD = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Alta' },
  { value: 2, label: 'Zona VIP' },
]
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
  // Combo de cortesía: desde qué monto de reserva se regala (null = no se regala)
  cortesia_activa: false,
  cortesia_desde: 800,
})

// El evento que el asistente está editando (recién creado o abierto desde la tarjeta)
const idEventoWizard = computed(() => eventoEditando.value?.id_evento || null)
const estadoWizard = computed(() => eventoEditando.value?.estado || 'planificacion')
function irAPaso(n) { if (n > 1 && !idEventoWizard.value) return; paso.value = n }

// ── Planos del evento (un evento puede tener varios: pisos/ambientes) ──
// El precio se define por ÁREA: el plano trae el suyo y el evento lo ajusta.
const planosDelEvento = ref([])             // planos ya agregados (zonas) con sus áreas y precios
const cargandoPlanos = ref(false)
const agregandoPlano = ref(false)
const guardandoPrecios = ref(null)
const planoElegido = ref(null)              // áreas del plano elegido para agregar (precio prellenado)
const formAgregar = reactive({ id_plano: '', nombre: '', prioridad: 0, precios: {}, precio_general: null })
function resetFormAgregar() {
  formAgregar.id_plano = ''; formAgregar.nombre = ''; formAgregar.prioridad = 0
  formAgregar.precios = {}; formAgregar.precio_general = null
  planoElegido.value = null
}

// Abrir el asistente directo en el paso de planos (botón "Planos" de la tarjeta)
async function abrirPlanosEvento(evento) {
  await abrirModal(evento)
  paso.value = 2
}
async function cargarPlanosDelEvento() {
  if (!idEventoWizard.value) { planosDelEvento.value = []; return }
  cargandoPlanos.value = true
  try {
    const lista = await clienteHttp.get(`/espacios/eventos/${idEventoWizard.value}/planos`)
    planosDelEvento.value = (lista || []).map(p => ({
      ...p,
      precio_entrada_base: Number(p.precio_entrada_base) > 0 ? Number(p.precio_entrada_base) : null,
      prioridad: Number(p.prioridad) || 0,
      areas: (p.areas || []).map(a => ({ ...a, precio: a.precio > 0 ? Number(a.precio) : null })),
    }))
  } catch { planosDelEvento.value = [] }
  finally { cargandoPlanos.value = false }
}
// Al elegir un plano de la biblioteca se listan sus áreas con el precio que trae el plano.
async function alElegirPlano(id) {
  planoElegido.value = null
  formAgregar.precios = {}; formAgregar.precio_general = null
  if (!id) return
  try {
    const p = await clienteHttp.get(`/espacios/plantillas/${id}`)
    const els = p.elementos || []
    const areas = els
      .filter(e => e.tipo_elemento === 'area')
      .map(e => ({ clave: e.clave, nombre: e.numero_nombre || 'Área', parados: Number(e.capacidad_sillas) || 0 }))
    const tiene_general = els.some(e => (e.tipo_elemento === 'mesa' || e.tipo_elemento === 'silla') && !e.area_ref)
    // El plano ya no trae precios: los campos nacen vacíos para esta noche.
    for (const a of areas) formAgregar.precios[a.clave] = null
    formAgregar.precio_general = null
    planoElegido.value = { nombre: p.nombre, areas, tiene_general }
    cargarUltimosPrecios(id)
  } catch { notif.error('No se pudo leer el plano') }
}

// ---- Copiar lo cobrado la última vez con este plano ----------------------
// Los precios viven en el evento, así que sin esto habría que reescribirlos
// cada noche. Se ofrece lo de la última vez y el administrador ajusta.
const ultimosPrecios = ref(null)
async function cargarUltimosPrecios(idPlano) {
  ultimosPrecios.value = null
  try {
    const r = await clienteHttp.get(`/espacios/plantillas/${idPlano}/ultimos-precios`)
    if (r?.hay) ultimosPrecios.value = r
  } catch { /* si falla, simplemente no se ofrece */ }
}
function copiarUltimosPrecios() {
  const u = ultimosPrecios.value
  if (!u) return
  for (const clave of Object.keys(formAgregar.precios)) {
    if (u.precios_areas[clave] != null) formAgregar.precios[clave] = Number(u.precios_areas[clave])
  }
  if (u.precio_general > 0) formAgregar.precio_general = Number(u.precio_general)
  notif.exito('Precios copiados. Ajusta lo que cambie para esta noche.')
}
// Nadie entra gratis: toda área (y el general, si hay mesas sueltas) necesita precio > 0.
function faltanPrecios(areas, tieneGeneral, precios, precioGeneral) {
  const sin = areas.filter(a => !(Number(precios[a.clave]) > 0)).map(a => a.nombre)
  if (tieneGeneral && !(Number(precioGeneral) > 0)) sin.push('General')
  return sin
}
async function agregarPlanoAEvento() {
  if (!formAgregar.id_plano) { notif.advertencia('Elige un plano para agregar.'); return }
  if (planoElegido.value) {
    const sin = faltanPrecios(planoElegido.value.areas, planoElegido.value.tiene_general, formAgregar.precios, formAgregar.precio_general)
    if (sin.length) { notif.advertencia(`Falta el precio de: ${sin.join(', ')}. Nadie puede reservar gratis.`); return }
  }
  agregandoPlano.value = true
  try {
    await clienteHttp.post(`/espacios/eventos/${idEventoWizard.value}/asignar-plano`, {
      id_plantilla: formAgregar.id_plano,
      nombre: formAgregar.nombre,
      prioridad: formAgregar.prioridad,
      precios_areas: formAgregar.precios,
      precio_general: formAgregar.precio_general,
    })
    resetFormAgregar()
    await cargarPlanosDelEvento()
    cargarEventos()
    notif.exito('Plano agregado al evento')
  } catch (e) { notif.error(e.error || 'No se pudo agregar el plano') }
  finally { agregandoPlano.value = false }
}
// Reajusta precios de un plano YA asignado sin quitarlo (quitarlo devuelve dinero).
async function guardarPreciosPlano(p) {
  const sin = p.areas.filter(a => !(Number(a.precio) > 0)).map(a => a.nombre)
  if ((p.tiene_general || !p.areas.length) && !(Number(p.precio_entrada_base) > 0)) sin.push('General')
  if (sin.length) { notif.advertencia(`Falta el precio de: ${sin.join(', ')}. Nadie puede reservar gratis.`); return }
  guardandoPrecios.value = p.id_zona
  try {
    const precios_areas = {}
    for (const a of p.areas) if (a.clave) precios_areas[a.clave] = a.precio
    await clienteHttp.put(`/espacios/zonas/${p.id_zona}/precios`, { precios_areas, precio_general: p.precio_entrada_base, prioridad: p.prioridad })
    notif.exito('Precios actualizados')
    cargarEventos()
  } catch (e) { notif.error(e.error || 'No se pudieron guardar los precios') }
  finally { guardandoPrecios.value = null }
}
// Resumen del paso 3
const aforoTotalWizard = computed(() => planosDelEvento.value.reduce((a, p) => a + (Number(p.aforo) || 0), 0))
const resumenPrecios = computed(() => {
  const precios = []
  for (const p of planosDelEvento.value) {
    for (const a of p.areas) if (a.precio != null) precios.push(Number(a.precio))
    if (p.tiene_general || !p.areas.length) precios.push(Number(p.precio_entrada_base) || 0)
  }
  if (!precios.length) return 'sin precios'
  const min = Math.min(...precios), max = Math.max(...precios)
  return min === max ? `Bs ${min}` : `de Bs ${min} a Bs ${max}`
})
async function publicarEvento() {
  if (!idEventoWizard.value) return
  publicando.value = true
  try {
    await servicioEventos.cambiarEstado(idEventoWizard.value, 'promocion')
    eventoEditando.value = { ...eventoEditando.value, estado: 'promocion' }
    cargarEventos()
    notif.exito('Evento publicado: ya aparece en la cartelera de los clientes')
  } catch (e) { notif.error(e?.error || 'No se pudo publicar el evento') }
  finally { publicando.value = false }
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
    // 'lleno' es "En curso" con aforo completo: entra en el mismo filtro
    const matchEstado = filtroEstado.value
      ? (filtroEstado.value === 'en_transcurso' ? ['en_transcurso', 'lleno'].includes(e.estado) : e.estado === filtroEstado.value)
      : true
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
// ---- Agenda: eventos agrupados por mes, en orden de fecha ----------------
// En "Actuales" se agregan los viernes y sábados de las próximas semanas que
// todavía no tienen evento, como huecos para crearlos de un clic.
const SEMANAS_SUGERIDAS = 3
const huecosSugeridos = computed(() => {
  if (pestana.value !== 'actuales') return []
  const ocupados = new Set(eventosActuales.value.map(e => new Date(e.fecha_hora_inicio).toDateString()))
  const hoy = new Date()
  const salida = []
  for (let i = 0; i < SEMANAS_SUGERIDAS * 7; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)
    if (d.getDay() !== 5 && d.getDay() !== 6) continue
    if (ocupados.has(d.toDateString())) continue
    salida.push(d)
  }
  return salida
})

const NOMBRE_MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIA_CORTO = ['dom','lun','mar','mié','jue','vie','sáb']

const mesesAgenda = computed(() => {
  const filas = []
  for (const ev of listaActiva.value) {
    const d = new Date(ev.fecha_hora_inicio)
    filas.push({
      clave: 'e' + ev.id_evento, fecha: d, ev, hueco: false,
      diaSemana: DIA_CORTO[d.getDay()], diaNum: d.getDate(), finde: d.getDay() === 5 || d.getDay() === 6,
      hora: d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }),
    })
  }
  for (const d of huecosSugeridos.value) {
    filas.push({
      clave: 'h' + d.getTime(), fecha: d, hueco: true,
      diaSemana: DIA_CORTO[d.getDay()], diaNum: d.getDate(), finde: true, diaSemanaNum: d.getDay(),
    })
  }
  // Los próximos primero; el historial, del más reciente al más viejo.
  filas.sort((a, b) => pestana.value === 'pasados' ? b.fecha - a.fecha : a.fecha - b.fecha)

  const meses = []
  for (const f of filas) {
    const clave = `${f.fecha.getFullYear()}-${f.fecha.getMonth()}`
    let mes = meses.find(m => m.clave === clave)
    if (!mes) {
      mes = { clave, nombre: `${NOMBRE_MES[f.fecha.getMonth()]} ${f.fecha.getFullYear()}`, eventos: [] }
      meses.push(mes)
    }
    mes.eventos.push(f)
  }
  return meses
})

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

// Funciones del asistente
async function abrirModal(evento = null) {
  eventoEditando.value = evento
  esNuevo.value = !evento
  paso.value = 1
  archivoSeleccionado.value = null
  previewImagen.value = evento ? evento.url_portada : null
  resetFormAgregar()

  if (evento) {
    form.nombre_evento = evento.nombre_evento
    form.descripcion = evento.descripcion || ''
    form.fecha_hora_inicio = formatearFechaParaInput(evento.fecha_hora_inicio)
    form.fecha_hora_fin = formatearFechaParaInput(evento.fecha_hora_fin)
    form.tipo_evento = evento.tipo_evento || 'estandar'
    form.cortesia_activa = evento.cortesia_desde != null
    form.cortesia_desde = evento.cortesia_desde != null ? Number(evento.cortesia_desde) : 800
  } else {
    form.nombre_evento = ''
    form.descripcion = ''
    form.fecha_hora_inicio = ''
    form.fecha_hora_fin = ''
    form.tipo_evento = 'estandar'
    form.cortesia_activa = false
    form.cortesia_desde = 800
  }

  modalAbierto.value = true
  // La biblioteca puede tener planos nuevos (evita el caché de KeepAlive)
  cargarPlanosDisponibles()
  await cargarPlanosDelEvento()
}

// ---- Noches estándar (viernes / sábado) --------------------------------
// La noche normal del local: abre igual, sin artista, solo con DJ. Estos
// botones abren el asistente ya completado con el próximo viernes o sábado,
// de 21:00 a 03:00. El administrador solo elige el plano y confirma.
const HORA_INICIO_NOCHE = 21
const HORA_FIN_NOCHE = 3
const NOMBRE_DIA = { 5: 'viernes', 6: 'sábado' }

// Próxima fecha de ese día de la semana (si hoy es ese día y aún no son las
// 21:00, se usa hoy; si ya pasó, la semana que viene).
function proximaNoche(diaSemana) {
  const ahora = new Date()
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), HORA_INICIO_NOCHE, 0, 0, 0)
  let saltar = (diaSemana - d.getDay() + 7) % 7
  if (saltar === 0 && ahora.getHours() >= HORA_INICIO_NOCHE) saltar = 7
  d.setDate(d.getDate() + saltar)
  return d
}

async function abrirNocheEstandar(diaSemana) {
  await abrirModal()
  const inicio = proximaNoche(diaSemana)
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 1)
  fin.setHours(HORA_FIN_NOCHE, 0, 0, 0)

  const dia = inicio.toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })
  form.nombre_evento = `Noche de DJ · ${NOMBRE_DIA[diaSemana]} ${dia}`
  form.descripcion = 'Noche habitual del local, con DJ residente.'
  form.fecha_hora_inicio = formatearFechaParaInput(inicio)
  form.fecha_hora_fin = formatearFechaParaInput(fin)
  form.tipo_evento = 'estandar'
  notif.info(`Noche del ${NOMBRE_DIA[diaSemana]} lista: revisa el horario y elige el plano.`)
}

function cerrarModal() {
  modalAbierto.value = false
  setTimeout(() => {
    archivoSeleccionado.value = null
    previewImagen.value = null
    paso.value = 1
  }, 200)
}

// El flyer se puede ARRASTRAR sobre el recuadro o elegir con clic.
const arrastrandoFlyer = ref(false)
const errorFlyer = ref('')

function tomarFlyer(archivo) {
  if (!archivo) return
  if (!archivo.type.startsWith('image/')) { errorFlyer.value = 'El archivo debe ser una imagen (PNG o JPG).'; return }
  if (archivo.size > 5 * 1024 * 1024) { errorFlyer.value = 'La imagen no debe pesar más de 5 MB.'; return }
  errorFlyer.value = ''
  archivoSeleccionado.value = archivo
  previewImagen.value = URL.createObjectURL(archivo)
}

function manejarArchivo(e) { tomarFlyer(e.target.files?.[0]) }

function soltarFlyer(e) {
  arrastrandoFlyer.value = false
  tomarFlyer(e.dataTransfer?.files?.[0])
}

// Paso 1 → guarda los datos (crea el evento si es nuevo) y pasa al espacio
async function guardarYContinuar() {
  guardando.value = true
  try {
    const formData = new FormData()
    formData.append('nombre_evento', form.nombre_evento)
    formData.append('descripcion', form.descripcion)
    formData.append('fecha_hora_inicio', form.fecha_hora_inicio)
    formData.append('fecha_hora_fin', form.fecha_hora_fin || '')
    formData.append('tipo_evento', form.tipo_evento)
    formData.append('cortesia_desde', form.cortesia_activa ? String(form.cortesia_desde ?? '') : '')
    if (archivoSeleccionado.value) formData.append('imagen', archivoSeleccionado.value)

    let r
    if (idEventoWizard.value) r = await servicioEventos.editar(idEventoWizard.value, formData)
    else r = await servicioEventos.crear(formData)
    if (r?.evento) eventoEditando.value = { ...(eventoEditando.value || {}), ...r.evento }

    cargarEventos()
    await cargarPlanosDelEvento()
    paso.value = 2
  } catch (error) {
    notif.error('Error al guardar el evento: ' + (error.error || error.message))
  } finally {
    guardando.value = false
  }
}

// Paso 2 → guarda la cortesía y pasa a la revisión
async function guardarCortesiaYContinuar() {
  if (!idEventoWizard.value) { paso.value = 1; return }
  guardando.value = true
  try {
    const formData = new FormData()
    formData.append('cortesia_desde', form.cortesia_activa ? String(form.cortesia_desde ?? '') : '')
    const r = await servicioEventos.editar(idEventoWizard.value, formData)
    if (r?.evento) eventoEditando.value = { ...(eventoEditando.value || {}), ...r.evento }
    cargarEventos()
    paso.value = 3
  } catch (error) {
    notif.error('No se pudo guardar la cortesía: ' + (error.error || error.message))
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
  // Un evento cuya fecha ya pasó no puede volver a Borrador ni publicarse.
  if (eventoExpirado.value && (destino === 'planificacion' || destino === 'promocion')) return true
  // Un evento en curso no vuelve a borrador (la gente ya está adentro).
  if ((ev.estado === 'en_transcurso' || ev.estado === 'lleno') && destino === 'planificacion') return true
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
/* Accesos rápidos a las noches de siempre, junto a "Nuevo evento" */
.acciones-encabezado { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }

/* ===== Agenda: la cartelera como línea de tiempo por mes ===== */
.linea-tiempo { display: flex; flex-direction: column; gap: 26px; }
.mes-cab { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.mes-nombre {
  font-family: var(--fuente-titulo); font-size: 0.82rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.14em; color: var(--morado-hover);
}
.mes-cab::after { content: ''; flex: 1; height: 1px; background: var(--borde-sutil); }
.mes-conteo {
  order: 3; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px;
  display: grid; place-items: center; font-size: 0.72rem; font-weight: 800;
  color: var(--texto-secundario); background: rgba(255,255,255,.06); border: 1px solid var(--borde-sutil);
}
.mes-filas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

.fila-ev {
  display: flex; align-items: center; gap: 14px; padding: 10px 14px;
  border-radius: var(--radio-lg); border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta);
  transition: border-color var(--trans-rapida), transform var(--trans-rapida), background var(--trans-rapida);
}
.fila-ev:hover { border-color: var(--borde-activo); transform: translateX(3px); background: var(--fondo-tarjeta-alt); }
.fila-hueco { border-style: dashed; background: transparent; }
.fila-hueco:hover { border-color: var(--morado-brillante); background: rgba(168,85,247,.06); }

/* Día */
.fila-dia {
  flex: none; width: 52px; display: flex; flex-direction: column; align-items: center;
  gap: 1px; padding: 5px 0; border-radius: var(--radio-md); background: rgba(255,255,255,.04);
}
.fila-dia.finde { background: rgba(168,85,247,.13); }
.fd-sem { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--texto-desactivado); }
.fila-dia.finde .fd-sem { color: var(--morado-hover); }
.fd-num { font-family: var(--fuente-titulo); font-size: 1.28rem; font-weight: 800; line-height: 1; color: var(--texto-principal); }

/* Flyer chico */
.fila-flyer { flex: none; width: 62px; height: 44px; border-radius: 9px; overflow: hidden; background: var(--fondo-tarjeta-alt); display: grid; place-items: center; }
.fila-flyer img { width: 100%; height: 100%; object-fit: cover; }
.fila-flyer-vacio { color: var(--texto-desactivado); }

/* Cuerpo */
.fila-cuerpo { flex: 1; min-width: 0; }
.fila-nombre { margin: 0; font-weight: 700; font-size: 0.98rem; color: var(--texto-principal); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fila-meta { margin: 3px 0 0; display: flex; align-items: center; gap: 9px; flex-wrap: wrap; font-size: 0.76rem; color: var(--texto-secundario); }
.fm-hora { font-variant-numeric: tabular-nums; font-weight: 700; }
.fm-punto { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.fm-planos { color: var(--texto-desactivado); }
.fila-hueco-txt { margin: 0; font-size: 0.86rem; color: var(--texto-desactivado); font-style: italic; }

/* Crear en un hueco */
.fila-crear {
  flex: none; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: var(--radio-full); cursor: pointer;
  border: 1px solid var(--borde-activo); background: rgba(168,85,247,.10);
  color: var(--morado-hover); font-family: inherit; font-size: 0.8rem; font-weight: 700;
  transition: var(--trans-rapida);
}
.fila-crear:hover { background: var(--gradiente-marca); border-color: transparent; color: #fff; }

@media (max-width: 620px) {
  .fila-ev { flex-wrap: wrap; gap: 10px; }
  .fila-flyer { display: none; }
  .fila-cuerpo { flex: 1 1 60%; }
  .acciones { width: 100%; justify-content: flex-end; }
}
/* Atajo para repetir los precios de la última vez que se usó este plano */
.wz-copiar {
  display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px;
  padding: 8px 14px; border-radius: var(--radio-full); cursor: pointer;
  border: 1px dashed var(--borde-activo); background: rgba(168,85,247,.08);
  color: var(--morado-hover); font-family: inherit; font-size: .82rem; font-weight: 600;
  transition: var(--trans-rapida);
}
.wz-copiar:hover { background: rgba(168,85,247,.18); border-style: solid; color: var(--texto-principal); }
/* Acciones de la tarjeta en iconos: menos texto, misma función */
.btn-icono-acc {
  position: relative; display: inline-grid; place-items: center;
  width: 36px; height: 36px; border-radius: var(--radio-md); cursor: pointer;
  border: 1px solid var(--borde-sutil); background: rgba(255,255,255,.04);
  color: var(--texto-secundario); transition: var(--trans-rapida);
}
.btn-icono-acc svg { width: 17px; height: 17px; }
.btn-icono-acc:hover { border-color: var(--morado-brillante); background: rgba(168,85,247,.16); color: var(--texto-principal); transform: translateY(-2px); }
.btn-icono-acc:disabled { opacity: .55; cursor: progress; transform: none; }
.btn-icono-acc.acc-estado { color: var(--morado-hover); border-color: var(--borde-activo); background: rgba(168,85,247,.12); }
.btn-icono-acc.acc-borrar:hover { border-color: var(--color-error); background: rgba(239,68,68,.15); color: var(--color-error); }
.btn-icono-acc .chip-conteo {
  position: absolute; top: -6px; right: -6px; min-width: 17px; height: 17px; padding: 0 4px;
  border-radius: 999px; background: var(--gradiente-marca); color: #fff;
  font-size: .64rem; font-weight: 800; display: grid; place-items: center;
}
.acc-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--borde-sutil); border-top-color: var(--morado-brillante); animation: girar 0.7s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.btn-rapido {
  background: rgba(168, 85, 247, 0.10);
  border: 1px solid var(--borde-activo);
  color: var(--morado-hover);
  font-weight: 600;
  transition: var(--trans-rapida);
}
.btn-rapido:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: var(--morado-brillante);
  color: var(--texto-principal);
  transform: translateY(-2px);
}
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
/* Mientras se arrastra una imagen encima: el recuadro se enciende */
.dropzone-arrastrando {
  border-style: solid;
  border-color: var(--morado-brillante);
  background: rgba(168, 85, 247, 0.16);
  color: var(--texto-principal);
  box-shadow: 0 0 0 3px var(--rosa-suave);
  transform: scale(1.01);
}
.dropzone-error { margin: 6px 0 0; font-size: 0.78rem; font-weight: 600; color: var(--color-error); }
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

<style scoped>
/* ===== Asistente de evento (3 pasos) ===== */
.modal-wizard { max-width: 620px; }
.wz-cab { align-items: center; }
.wz-titulo { display: flex; align-items: center; gap: 12px; min-width: 0; }
.wz-icono { flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--radio-md); color: #fff; background: var(--gradiente-marca); box-shadow: 0 4px 14px rgba(168,85,247,.35); }
.wz-textos { min-width: 0; }
.wz-sub { margin: 2px 0 0; font-size: .78rem; color: var(--texto-secundario); font-weight: 400; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px; }

.wz-pasos { list-style: none; margin: 0; padding: 12px 1.5rem 0; display: flex; gap: 6px; position: sticky; top: 64px; z-index: 1; background: var(--fondo-tarjeta); }
.wz-pasos li { flex: 1; }
.wz-pasos button { width: 100%; display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta-alt); color: var(--texto-secundario); cursor: pointer; font-size: .82rem; font-weight: 600; transition: var(--trans-rapida); }
.wz-pasos button:disabled { opacity: .5; cursor: not-allowed; }
.wz-pasos li.activo button { border-color: var(--morado-brillante); background: rgba(168,85,247,.12); color: var(--texto-principal); }
.wz-pasos li.hecho button { border-color: rgba(34,197,94,.45); color: var(--texto-principal); }
.wz-num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: .74rem; font-weight: 800; background: rgba(255,255,255,.08); }
.wz-pasos li.activo .wz-num { background: var(--gradiente-marca); color: #fff; }
.wz-pasos li.hecho .wz-num { background: rgba(34,197,94,.2); color: #86efac; }

.wz-seccion { display: flex; flex-direction: column; gap: .8rem; padding: 1rem 1.05rem 1.1rem; border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); background: rgba(255,255,255,.018); }
.wz-seccion-tit { display: flex; align-items: center; gap: 7px; margin: 0 0 .1rem; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--morado-hover); }

/* Precio por área */
.pl-item-col { flex-direction: column; align-items: stretch; gap: 10px; }
.pl-item-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wz-areas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.wz-area { display: flex; flex-direction: column; gap: 5px; padding: 9px 10px; border-radius: var(--radio-md); background: rgba(168,85,247,.06); border: 1px solid var(--borde-sutil); }
.wz-area-nom { font-size: .8rem; font-weight: 700; color: var(--texto-principal); }
.wz-area-nom small { font-weight: 500; color: var(--texto-desactivado); }
.wz-area-acciones { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wz-prioridad { flex: 0 1 200px; }

/* Campos con adorno Bs. */
.campo-adorno { position: relative; display: flex; align-items: center; }
.campo-adorno .campo { width: 100%; }
.adorno { position: absolute; top: 50%; transform: translateY(-50%); left: 12px; font-size: .8rem; font-weight: 700; color: var(--texto-desactivado); pointer-events: none; }
.campo--prefijo { padding-left: 40px; }

/* Switch (mismo diseño que en productos) */
.switch-row { display: flex; align-items: center; gap: .65rem; padding: .65rem .75rem; border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); background: var(--fondo-tarjeta-alt); cursor: pointer; user-select: none; transition: border-color var(--trans-rapida), background var(--trans-rapida); }
.switch-row:hover { border-color: var(--borde-activo); }
.switch-row:has(input:checked) { border-color: var(--morado-brillante); background: rgba(168,85,247,.09); }
.switch { position: relative; flex-shrink: 0; width: 40px; height: 22px; }
.switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; z-index: 1; }
.switch-track { position: absolute; inset: 0; border-radius: var(--radio-full); background: rgba(255,255,255,.14); transition: background var(--trans-rapida); }
.switch-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: var(--radio-full); background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.45); transition: transform .22s cubic-bezier(.34,1.56,.64,1); }
.switch input:checked + .switch-track { background: var(--gradiente-marca); }
.switch input:checked + .switch-track .switch-thumb { transform: translateX(18px); }
.switch-info { display: flex; flex-direction: column; gap: 1px; line-height: 1.15; min-width: 0; }
.switch-txt { font-size: .85rem; font-weight: 600; color: var(--texto-principal); }
.switch-desc { font-size: .7rem; color: var(--texto-desactivado); }
.wz-cortesia-monto { max-width: 260px; }

/* Revisión */
.wz-dl { margin: 0; display: flex; flex-direction: column; gap: 10px; }
.wz-dl > div { display: grid; grid-template-columns: 92px 1fr; gap: 10px; align-items: baseline; }
.wz-dl dt { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--texto-desactivado); }
.wz-dl dd { margin: 0; font-size: .9rem; color: var(--texto-principal); }
.wz-chip { font-size: .68rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radio-full); background: rgba(168,85,247,.14); color: var(--morado-hover); margin-left: 6px; }
.wz-alerta { color: var(--color-alerta) !important; font-weight: 600; }
.wz-estado { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; }
.wz-estado .badge-punto { background: currentColor; }
.wz-estado-desc { display: block; margin-top: 2px; font-size: .74rem; color: var(--texto-desactivado); }

/* Elegir estado */
.wz-estados { display: flex; flex-direction: column; gap: 8px; }
.wz-estado-op { display: flex; align-items: center; gap: 11px; text-align: left; padding: 10px 12px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta-alt); color: var(--texto-principal); cursor: pointer; transition: var(--trans-rapida); }
.wz-estado-op:hover:not(:disabled) { border-color: var(--borde-activo); }
.wz-estado-op.activo { border-color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
.wz-estado-op:disabled { opacity: .45; cursor: not-allowed; }
.wz-estado-op .badge-punto { background: var(--c); width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.wz-estado-op span { display: flex; flex-direction: column; gap: 1px; }
.wz-estado-op b { font-size: .88rem; }
.wz-estado-op small { font-size: .72rem; color: var(--texto-secundario); }

@media (max-width: 560px) { .wz-areas { grid-template-columns: 1fr; } .wz-dl > div { grid-template-columns: 1fr; gap: 2px; } .wz-pasos .wz-lbl { display: none; } .wz-pasos button { justify-content: center; } }
</style>
