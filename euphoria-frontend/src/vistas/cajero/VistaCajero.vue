<template>
  <div class="vista-cajero">

    <!-- Modal QR Ampliado -->
    <div v-if="qrAmpliado" class="modal-overlay" @click.self="qrAmpliado = false">
      <div class="modal-qr-ampliado anim-fade">
        <button class="modal-qr-cerrar" @click="qrAmpliado = false">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="modal-qr-monto" v-if="montoActual">Bs. {{ montoActual }}</div>
        <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="Código QR de pago de Euphoria" class="qr-imagen-grande" />
        <p class="modal-qr-hint">Muestra este QR al cliente para que lo escanee</p>
      </div>
    </div>

    <!-- Modal de éxito -->
    <div v-if="modalExito" class="modal-overlay" @click.self="modalExito = null">
      <div class="modal-exito anim-fade">
        <div class="modal-icono-exito">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3>{{ modalExito.titulo }}</h3>
        <p>{{ modalExito.mensaje }}</p>
        <div v-if="modalExito.detalle" class="modal-detalle">{{ modalExito.detalle }}</div>
        <button class="btn-accion-principal" @click="modalExito = null">Cerrar</button>
      </div>
    </div>

    <!-- Header Visual Premium -->
    <div class="cajero-header superficie">
      <div class="cajero-logo-zona">
        <div class="cajero-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>
        <div class="cajero-titulos">
          <div class="cajero-titulo-visual">Caja Euphoria</div>
          <div class="cajero-rol-label">Recargas, billeteras y transacciones</div>
        </div>
      </div>
      <div class="cajero-header-tag">
        <span class="cajero-header-dot"></span>
        Punto de venta
      </div>
    </div>

    <!-- Pestañas de navegación -->
    <div class="tabs-cajero scroll-tabs escalonar">
      <button :class="['tab-btn brillo-hover', { activo: tabActiva === 'recargar' }]" @click="tabActiva = 'recargar'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Recargar
      </button>
      <button :class="['tab-btn brillo-hover', { activo: tabActiva === 'abrir' }]" @click="tabActiva = 'abrir'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
        Nueva Billetera
      </button>
      <button :class="['tab-btn brillo-hover', { activo: tabActiva === 'consultar' }]" @click="tabActiva = 'consultar'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        Consultar
      </button>
      <button :class="['tab-btn brillo-hover', { activo: tabActiva === 'retiros' }]" @click="tabActiva = 'retiros'; cargarRetiros()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"></path><path d="M5 12l7 7 7-7"></path></svg>
        Retiros<span v-if="retirosPendientes.length" class="tab-badge">{{ retirosPendientes.length }}</span>
      </button>
      <button :class="['tab-btn brillo-hover', { activo: tabActiva === 'historial' }]" @click="tabActiva = 'historial'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Transacciones
      </button>
    </div>

    <!-- Panel de Apertura de Billetera -->
    <div v-if="tabActiva === 'abrir'" class="panel-contenido anim-fade">
      <div class="tarjeta-modulo">

        <!-- Cabecera visual de la tarjeta -->
        <div class="card-visual-header">
          <div class="card-icon-grande">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          <div>
            <h2 class="card-titulo">Nueva billetera</h2>
            <p class="card-subtitulo">CI o número de teléfono</p>
          </div>
        </div>

        <form @submit.prevent="abrirBilletera" class="formulario-cajero">
          <!-- Identificador -->
          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              CI o teléfono
            </label>
            <input v-model="nuevoId" type="text" placeholder="72285280" required @input="verificarIdentificador" autocomplete="off" />
            <p v-if="errorIdExiste" class="error-texto" style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-alerta)" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {{ errorIdExiste }}
            </p>
          </div>

          <!-- Sin escáner aquí: una billetera NUEVA es de un cliente que aún no
               tiene QR — el CI/teléfono se escribe a mano. -->
          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              PIN de seguridad (opcional)
            </label>
            <input v-model="nuevoPin" type="password" maxlength="4" pattern="\d{4}" placeholder="Ej: 1234 (Por defecto será 1234)" autocomplete="new-password" @input="nuevoPin = nuevoPin.replace(/\D/g, '')" />
            <p v-if="nuevoPin && nuevoPin.length !== 4" class="error-texto" style="margin-top: 0.3rem;">El PIN debe tener exactamente 4 dígitos.</p>
          </div>

          <!-- Ubicación como botones visuales -->
          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Ubicación
            </label>
            <div class="selector-ubicacion">
              <button type="button" :class="['btn-ubicacion', { seleccionado: nuevaUbicacion === 'general' }]" @click="nuevaUbicacion = 'general'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                General
              </button>
              <button type="button" :class="['btn-ubicacion', { seleccionado: nuevaUbicacion === 'mesa' }]" @click="nuevaUbicacion = 'mesa'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="8" width="18" height="4" rx="1"></rect><line x1="6" y1="12" x2="6" y2="19"></line>
                  <line x1="18" y1="12" x2="18" y2="19"></line><line x1="3" y1="19" x2="21" y2="19"></line>
                </svg>
                Mesa
              </button>
              <button type="button" :class="['btn-ubicacion', { seleccionado: nuevaUbicacion === 'reserva' }]" @click="nuevaUbicacion = 'reserva'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                VIP
              </button>
            </div>
          </div>

          <!-- Monto con validación -->
          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Saldo inicial
            </label>
            <div :class="['input-con-icono', { 'input-valido': nuevoMonto >= 10, 'input-error': nuevoMonto > 0 && nuevoMonto < 10 }]">
              <span class="prefijo">Bs.</span>
              <input v-model.number="nuevoMonto" type="number" min="0" step="1" placeholder="0" />
              <svg v-if="nuevoMonto >= 10" class="icono-check" width="20" height="20" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <p v-if="nuevoMonto > 0 && nuevoMonto < 10" class="error-texto">Mínimo 10 Bs</p>
          </div>

          <!-- Método pago -->
          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              Método de pago
            </label>
            <div class="selector-metodo">
              <button type="button" :class="['btn-metodo', { seleccionado: nuevoMetodo === 'efectivo' }]" @click="nuevoMetodo = 'efectivo'">Efectivo</button>
              <button type="button" :class="['btn-metodo', { seleccionado: nuevoMetodo === 'qr' }]" @click="nuevoMetodo = 'qr'">QR</button>
            </div>
          </div>

          <!-- Flujo Efectivo -->
          <div v-if="nuevoMetodo === 'efectivo'" class="flujo-efectivo anim-fade">
            <div class="grupo-input">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Efectivo recibido
              </label>
              <div class="input-con-icono">
                <span class="prefijo">Bs.</span>
                <input v-model.number="efectivoRecibido" type="number" min="0" step="1" placeholder="0" />
              </div>
            </div>
            <div v-if="efectivoRecibido > 0" :class="['calc-vuelto', vuelto >= 0 ? 'vuelto-ok' : 'vuelto-error']">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 .49-3.96"></path>
              </svg>
              {{ vuelto >= 0 ? `Vuelto: Bs. ${vuelto.toFixed(2)}` : `Faltan: Bs. ${Math.abs(vuelto).toFixed(2)}` }}
            </div>
          </div>

          <!-- Flujo QR — REGLA 10: QRPago euphoria.jpeg de activos -->
          <div v-if="nuevoMetodo === 'qr'" class="flujo-qr anim-fade">
            <div class="qr-pago-container">
              <div class="qr-etiqueta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                El cliente escanea y transfiere Bs. {{ nuevoMonto || '—' }}
              </div>
              <div class="qr-imagen-wrap" @click="qrAmpliado = true">
                <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR Pago Euphoria" class="qr-imagen-pago" />
                <div class="qr-ampliar-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <span>Ampliar</span>
                </div>
              </div>
            </div>

            <div class="qr-separador"><span>Luego sube el comprobante</span></div>

            <!-- Captura unificada del comprobante (foto HD o galería) -->
            <CapturaCamara modo="foto" :deshabilitado="validandoOCR" texto-guia="Coloca el comprobante dentro del marco" nombre-archivo="comprobante.jpg" @archivo="onFotoComprobante" />


            <div v-if="archivoRecarga" class="archivo-preview anim-fade">
              <img :src="previewArchivoRecarga" class="preview-img" />
              <button type="button" class="btn-quitar-archivo" @click="quitarArchivoRecarga">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div v-if="validandoOCR" class="estado-ocr cargando">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              Validando...
            </div>
            <div v-if="ocrExitoso === true" class="estado-ocr exito-detallado">
              <div class="exito-icono">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="exito-texto">
                <div class="exito-titulo">Comprobante válido</div>
                <div class="exito-sub">Monto confirmado Bs. {{ nuevoMonto }} — Transacción única: {{ transaccionIdOCR }}</div>
              </div>
            </div>
            <div v-if="ocrExitoso === false" class="estado-ocr error-ocr">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-alerta)" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {{ errorOCRRecarga }}
            </div>
          </div>

          <!-- Banner error -->
          <div v-if="errorRecargar" class="banner-error anim-fade">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-error)" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ errorRecargar }}
            <button type="button" class="cerrar-banner" @click="errorRecargar = ''">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <button type="submit" class="btn-accion-principal btn-exito brillo-hover" :disabled="cargandoAbrir || errorIdExiste || (nuevoPin && nuevoPin.length !== 4) || (nuevoMetodo === 'qr' && !ocrExitoso) || (nuevoMetodo === 'efectivo' && vuelto < 0)">
            <svg v-if="!cargandoAbrir" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {{ cargandoAbrir ? 'Creando...' : 'Crear billetera' }}
          </button>
        </form>

        <!-- El resultado ahora es un Modal Pantalla Completa (se movió abajo) -->
      </div>
    </div>

    <!-- Panel de Recargas Manuales -->
    <div v-if="tabActiva === 'recargar'" class="panel-contenido anim-fade">
      <div class="tarjeta-modulo">

        <div class="card-visual-header">
          <div class="card-icon-grande card-icon-morado">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div>
            <h2 class="card-titulo">Recargar saldo</h2>
            <p class="card-subtitulo">Código, teléfono o correo del cliente</p>
          </div>
        </div>

        <form @submit.prevent="recargarCliente" class="formulario-cajero">
          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Cliente
            </label>
            <!-- Búsqueda de cliente estandarizada -->
            <BuscadorCliente v-model="clienteSeleccionado" placeholder="CI, teléfono, correo o nombre" />
            <p v-if="clienteSeleccionado" class="cajero-saldo-cli">Saldo actual: <b>Bs. {{ clienteSeleccionado.billetera?.saldo_actual ?? '0' }}</b></p>
          </div>

          <!-- Escáner de billetera estandarizado (mismo componente del mesero: pantalla completa) -->
          <div style="margin-bottom:0.75rem;">
            <CapturaCamara modo="qr" texto-guia="Coloca el QR de billetera del cliente dentro del marco" @codigo="onQrRecarga" />
          </div>

          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Monto
            </label>
            <div :class="['input-con-icono', { 'input-valido': montoRecarga >= 10, 'input-error': montoRecarga > 0 && montoRecarga < 10 }]">
              <span class="prefijo">Bs.</span>
              <input v-model.number="montoRecarga" type="number" min="10" step="1" placeholder="0.00" required />
              <svg v-if="montoRecarga >= 10" class="icono-check" width="20" height="20" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <p v-if="montoRecarga > 0 && montoRecarga < 10" class="error-texto">Mínimo 10 Bs</p>
          </div>

          <!-- Método de pago: solo Efectivo o QR -->
          <div class="grupo-input">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              Método de pago
            </label>
            <div class="selector-metodo">
              <button type="button" :class="['btn-metodo', { seleccionado: metodoPago === 'efectivo' }]" @click="metodoPago = 'efectivo'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle>
                </svg>
                Efectivo
              </button>
              <button type="button" :class="['btn-metodo', { seleccionado: metodoPago === 'qr' }]" @click="metodoPago = 'qr'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                QR
              </button>
            </div>
          </div>

          <!-- Calculadora vuelto (efectivo) -->
          <div v-if="metodoPago === 'efectivo'" class="calculadora-vuelto anim-fade">
            <div class="grupo-input">
              <label>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle>
                </svg>
                Efectivo recibido
              </label>
              <div class="input-con-icono">
                <span class="prefijo">Bs.</span>
                <input v-model.number="efectivoRecibido" type="number" min="0" step="1" placeholder="0" />
              </div>
            </div>
            <div v-if="efectivoRecibido > 0" :class="['calc-vuelto', vuelto >= 0 ? 'vuelto-ok' : 'vuelto-error']">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 .49-3.96"></path>
              </svg>
              {{ vuelto >= 0 ? `Vuelto: Bs. ${vuelto.toFixed(2)}` : `Faltan: Bs. ${Math.abs(vuelto).toFixed(2)}` }}
            </div>
          </div>

          <!-- Flujo QR — REGLA 10: QRPago euphoria.jpeg de activos -->
          <div v-if="metodoPago === 'qr'" class="flujo-qr anim-fade">

            <div class="qr-pago-container">
              <div class="qr-etiqueta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                El cliente escanea y transfiere Bs. {{ montoRecarga || '—' }}
              </div>
              <div class="qr-imagen-wrap" @click="qrAmpliado = true">
                <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR Pago Euphoria" class="qr-imagen-pago" />
                <div class="qr-ampliar-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <span>Ampliar</span>
                </div>
              </div>
            </div>

            <div class="qr-separador"><span>Luego sube el comprobante</span></div>

            <!-- Captura unificada del comprobante (foto HD o galería) -->
            <CapturaCamara modo="foto" :deshabilitado="validandoOCR" texto-guia="Coloca el comprobante dentro del marco" nombre-archivo="comprobante.jpg" @archivo="onFotoComprobante" />

            <div v-if="archivoRecarga" class="archivo-preview anim-fade">
              <img :src="previewArchivoRecarga" class="preview-img" />
              <button type="button" class="btn-quitar-archivo" @click="quitarArchivoRecarga">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div v-if="validandoOCR" class="estado-ocr cargando">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              Validando...
            </div>
            <div v-if="ocrExitoso === true" class="estado-ocr exito-detallado">
              <div class="exito-icono">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="exito-texto">
                <div class="exito-titulo">Comprobante válido</div>
                <div class="exito-sub">Monto confirmado Bs. {{ montoRecarga }} — Transacción única: {{ transaccionIdOCR }}</div>
              </div>
            </div>
            <div v-if="ocrExitoso === false" class="estado-ocr error-ocr">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-alerta)" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {{ errorOCRRecarga }}
            </div>
          </div>


          <!-- Banner error -->
          <div v-if="errorRecargar" class="banner-error anim-fade">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-error)" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ errorRecargar }}
            <button class="cerrar-banner" @click="errorRecargar = ''">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Aviso si no hay cliente -->
          <div v-if="!clienteSeleccionado" class="aviso-cliente-requerido">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-alerta)" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Busca y selecciona un cliente antes de continuar.
          </div>

          <button
            type="submit"
            class="btn-accion-principal brillo-hover"
            :disabled="cargando || !clienteSeleccionado || !montoRecarga || montoRecarga < 10 || (metodoPago === 'qr' && !ocrExitoso) || (metodoPago === 'efectivo' && vuelto < 0)"
          >
            {{ cargando ? 'Procesando...' : 'Recargar' }}
          </button>
        </form>
      </div>
    </div>


    <!-- Panel de Transacciones Pendientes -->
    <!-- Panel de Consultar Billetera -->
    <div v-if="tabActiva === 'consultar'" class="panel-contenido anim-fade">
      <div class="tarjeta-modulo">
        <div class="card-visual-header">
          <div class="card-icon-grande">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div>
            <h2 class="card-titulo">Consultar cuenta</h2>
            <p class="card-subtitulo">Busca por CI o teléfono para ver los detalles</p>
          </div>
        </div>

        <form @submit.prevent="consultarBilletera" class="formulario-cajero">
          <div class="grupo-input">
            <label>Cliente</label>
            <!-- Búsqueda estandarizada -->
            <BuscadorCliente v-model="clienteConsultaSeleccionado" placeholder="CI, teléfono, correo o nombre" />
          </div>

          <!-- Separador con opción de escanear QR -->
          <div style="display: flex; align-items: center; gap: 10px; margin: 0.5rem 0;">
            <div style="flex:1; height:1px; background:var(--borde-sutil);"></div>
            <span style="font-size:0.75rem; color:var(--texto-secundario);">o</span>
            <div style="flex:1; height:1px; background:var(--borde-sutil);"></div>
          </div>

          <!-- Escáner estandarizado (mismo componente del mesero, pantalla completa) -->
          <div style="margin-bottom: 0.75rem;">
            <CapturaCamara modo="qr" texto-guia="Coloca el QR de billetera del cliente dentro del marco" @codigo="onQrConsulta" />
          </div>

          <button type="submit" class="btn-accion-principal brillo-hover" :disabled="cargandoConsulta || !clienteConsultaSeleccionado">
            <svg v-if="!cargandoConsulta" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span v-else class="loader-pequeno"></span>
            {{ cargandoConsulta ? 'Buscando...' : 'Ver detalles de cuenta' }}
          </button>
        </form>

        <p v-if="errorConsulta" class="error-texto" style="margin-top: 1rem; text-align: center;">{{ errorConsulta }}</p>

        <div v-if="resultadoConsulta" class="resultado-consulta" style="margin-top: 2rem; background: rgba(168,85,247,0.06); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: 1.5rem; text-align: center;">
          <h3 style="color: var(--texto-principal); font-family: var(--fuente-titulo); margin-bottom: 0.5rem;">{{ resultadoConsulta.nombres }} {{ resultadoConsulta.apellidos }}</h3>
          <p style="color: var(--texto-secundario); margin-bottom: 1.5rem;">Saldo Actual: <strong style="color: var(--color-exito); font-size: 1.2rem;">Bs. {{ resultadoConsulta.saldo.toFixed(2) }}</strong></p>
          
          <div style="background: white; padding: 1rem; border-radius: var(--radio-lg); display: inline-block; margin-bottom: 1rem;">
            <img v-if="qrConsultaBase64" :src="qrConsultaBase64" alt="QR Público" style="width: 200px; height: 200px;" />
          </div>
          <div class="codigo-gigante" style="font-size: 1.2rem; word-break: break-all;">{{ resultadoConsulta.qr_publico }}</div>
          
          <div style="margin-top: 1rem; text-align: left; color: var(--texto-secundario); font-size: 0.9rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
            <p style="margin-bottom: 0.5rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <strong style="color: white;">Correo:</strong> {{ resultadoConsulta.correo }}
            </p>
            <p style="margin-bottom: 0.5rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <strong style="color: white;">Tel/CI:</strong> {{ resultadoConsulta.telefono || resultadoConsulta.ci_carnet }}
            </p>
            <p style="margin-bottom: 0.5rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" style="stroke: var(--color-exito); vertical-align: middle; margin-right: 4px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <strong style="color: white;">Estado:</strong> <span style="color: var(--color-exito); text-transform: capitalize;">{{ resultadoConsulta.estado }}</span>
            </p>
            <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--color-alerta); border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.8rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              El PIN es privado y está encriptado. Si el cliente lo olvidó, puedes cambiarlo aquí:
            </p>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center;">
              <input v-model="nuevoPinReseteo" type="password" maxlength="4" inputmode="numeric" pattern="[0-9]*" placeholder="Nuevo PIN" style="width: 120px; padding: 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.2); text-align: center;" @input="nuevoPinReseteo = nuevoPinReseteo.replace(/\D/g, '')" />
              <button type="button" class="btn-aprobar" @click="resetearPin" :disabled="!nuevoPinReseteo || nuevoPinReseteo.length !== 4 || cargandoPin">
                {{ cargandoPin ? '...' : 'Cambiar PIN' }}
              </button>
            </div>
            <div v-if="msjPin" style="color: var(--color-exito); font-size: 0.85rem; margin-top: 0.5rem;">{{ msjPin }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel de Retiros de billetera -->
    <div v-if="tabActiva === 'retiros'" class="panel-contenido anim-fade">
      <div class="tarjeta-modulo modulo-ancho">
        <div class="retiros-cab">
          <h2 class="card-titulo">Retiros de billetera</h2>
          <div class="retiros-filtros">
            <button :class="['retiro-filtro', { activo: filtroRetiro === 'pendiente' }]" @click="filtroRetiro = 'pendiente'; cargarRetiros()">Pendientes</button>
            <button :class="['retiro-filtro', { activo: filtroRetiro === 'pagado' }]" @click="filtroRetiro = 'pagado'; cargarRetiros()">Pagados</button>
            <button :class="['retiro-filtro', { activo: filtroRetiro === 'rechazado' }]" @click="filtroRetiro = 'rechazado'; cargarRetiros()">Rechazados</button>
          </div>
        </div>

        <p v-if="!retiros.length" class="retiros-vacio">Sin solicitudes {{ filtroRetiro === 'pendiente' ? 'pendientes' : filtroRetiro === 'pagado' ? 'pagadas' : 'rechazadas' }}.</p>

        <div v-for="r in retiros" :key="r.id_solicitud" class="retiro-card">
          <div class="retiro-card-cab">
            <div class="retiro-cliente">
              <!-- Foto del cliente: para identificarlo en caja -->
              <span class="retiro-avatar">
                <img v-if="r.foto_cliente" :src="r.foto_cliente" :alt="r.cliente" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <div>
                <strong>{{ r.cliente }}</strong>
                <span class="retiro-tel">{{ r.telefono ? '+591 ' + String(r.telefono).replace(/\D/g,'').slice(-8) : r.correo }}</span>
              </div>
            </div>
            <span class="retiro-saldo-chip">Saldo: Bs {{ r.saldo_actual.toFixed(2) }}</span>
          </div>
          <p class="retiro-metodo-txt">{{ r.metodo === 'qr' ? 'Prefiere a su QR / cuenta' : 'Pasará por el local' }}</p>
          <p v-if="r.mensaje" class="retiro-msg">“{{ r.mensaje }}”</p>

          <!-- El QR que ENVIÓ el cliente, visible tal cual (toca para ampliar) -->
          <button v-if="r.qr_imagen" class="retiro-qr-thumb" type="button" @click="imagenAmpliada = r.qr_imagen" title="Ampliar QR del cliente">
            <img :src="r.qr_imagen" alt="QR del cliente" />
            <span>QR del cliente</span>
          </button>

          <template v-if="r.estado === 'pendiente'">
            <div class="retiro-montos">
              <label>Retirar de billetera
                <input type="number" min="0" :max="r.saldo_actual" step="0.01" v-model.number="r._retirar" class="retiro-input" />
              </label>
            </div>
            <p class="retiro-dif">
              {{ r.metodo === 'qr' ? 'Transferir (monto exacto):' : 'Entregar en efectivo:' }}
              <b>Bs {{ entregarRetiro(r).toFixed(2) }}</b>
              <span v-if="redondeoRetiro(r) > 0" class="retiro-redondeo"> · redondeo +Bs {{ redondeoRetiro(r).toFixed(2) }}</span>
            </p>

            <!-- Pago por QR: el comprobante del DEPÓSITO es obligatorio (constancia) -->
            <div v-if="r.metodo === 'qr'" class="retiro-comp">
              <p v-if="!r._comprobante" class="retiro-comp-lbl">Haz el depósito y adjunta tu comprobante:</p>
              <CapturaCamara v-if="!r._comprobante" modo="foto" texto-guia="Coloca tu comprobante del depósito" nombre-archivo="comprobante-retiro.jpg" @archivo="r._comprobante = $event" />
              <p v-else class="retiro-comp-ok">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Comprobante adjuntado
                <button class="retiro-comp-quitar" type="button" @click="r._comprobante = null">Cambiar</button>
              </p>
            </div>

            <div class="retiro-acciones">
              <button class="btn-pagar-retiro" :disabled="procesandoRetiro === r.id_solicitud || (r.metodo === 'qr' && !r._comprobante)" @click="pagarRetiro(r)">
                {{ procesandoRetiro === r.id_solicitud ? '…' : 'Registrar retiro' }}
              </button>
              <button class="btn-rechazar-retiro" :disabled="procesandoRetiro === r.id_solicitud" @click="rechazarRetiro(r)">Rechazar</button>
            </div>
          </template>

          <template v-else-if="r.estado === 'pagado'">
            <p class="retiro-pagado">Retiró Bs {{ r.monto_retirado }} · recibió Bs {{ r.monto_entregado }}<span v-if="Number(r.diferencia) > 0"> · redondeo +Bs {{ r.diferencia }}</span><span v-if="r.atendido_por"> · atendió {{ r.atendido_por }}</span></p>
            <!-- Constancia del depósito (control de caja) -->
            <button v-if="r.comprobante_pago" class="retiro-qr-thumb" type="button" @click="imagenAmpliada = r.comprobante_pago" title="Ver comprobante del depósito">
              <img :src="r.comprobante_pago" alt="Comprobante del depósito" />
              <span>Comprobante del depósito</span>
            </button>
          </template>

          <p v-else class="retiro-rechazado">
            Rechazada{{ r.atendido_por ? ' por ' + r.atendido_por : '' }}{{ r.motivo_rechazo ? ' · ' + r.motivo_rechazo : '' }}
          </p>
        </div>

        <!-- Ampliar imagen (QR del cliente / comprobante) -->
        <Teleport to="body">
          <div v-if="imagenAmpliada" class="modal-overlay" @click.self="imagenAmpliada = null">
            <div class="img-ampliada anim-fade">
              <button class="modal-qr-cerrar" @click="imagenAmpliada = null">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <img :src="imagenAmpliada" alt="Imagen ampliada" />
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Panel de Historial de Transacciones -->
    <div v-if="tabActiva === 'historial'" class="panel-contenido anim-fade">
      <div class="tarjeta-modulo modulo-ancho">
        <div class="header-pendientes">
          <h2>Historial de transacciones</h2>
          
          <div class="filtros-historial" style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
            <div class="selector-metodo" style="flex: 1; min-width: 250px;">
              <button type="button" :class="['btn-metodo', { seleccionado: filtroEstado === 'todas' }]" @click="filtroEstado = 'todas'">Todas</button>
              <button type="button" :class="['btn-metodo', { seleccionado: filtroEstado === 'completadas' }]" @click="filtroEstado = 'completadas'">Completadas</button>
              <button type="button" :class="['btn-metodo', { seleccionado: filtroEstado === 'pendientes' }]" @click="filtroEstado = 'pendientes'">Pendientes</button>
            </div>
            
            <div class="buscador-agil" style="flex: 2; min-width: 250px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input v-model="filtroBusqueda" type="text" placeholder="Buscar por teléfono, CI, nombre o fecha..." />
            </div>
          </div>
        </div>
        
        <div v-if="cargandoHistorial" class="cargando-estado">Cargando transacciones...</div>
        <div v-else-if="transaccionesHistorial.length === 0" class="estado-vacio">
          <div class="estado-vacio-icono">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <p class="estado-vacio-titulo">Todavía no hay transacciones</p>
          <p class="estado-vacio-sub">Las recargas y aperturas de billetera aparecerán aquí en cuanto registres la primera.</p>
        </div>

        <div v-else class="lista-pendientes">
          <div v-for="trx in historialFiltrado" :key="trx.id_recarga" class="item-pendiente">
            <div class="info-trx">
              <div class="info-principal">
                <strong>Bs. {{ trx.monto_recarga }}</strong>
                <span class="fecha">{{ formatoFecha(trx.fecha_solicitud) }}</span>
                <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 20px;">
                  <span :class="'neon-dot ' + trx.estado"></span>
                  <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: white;">{{ trx.estado }}</span>
                </div>
              </div>
              <div class="info-secundaria">
                Usuario: {{ trx.usuario.nombres }} {{ trx.usuario.apellidos }} ({{ trx.usuario.telefono || trx.usuario.ci_carnet }})
              </div>
            </div>
            <div class="acciones-trx" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn-metodo" style="background: rgba(255,255,255,0.1); color: white;" @click="trxDetalleId = trxDetalleId === trx.id_recarga ? null : trx.id_recarga">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Detalles
              </button>
              <template v-if="trx.estado === 'pendiente'">
                <button class="btn-aprobar" @click="resolverTransaccion(trx.id_recarga, 'completada')" type="button">Aprobar</button>
                <button class="btn-rechazar" @click="resolverTransaccion(trx.id_recarga, 'rechazada')" type="button">Rechazar</button>
              </template>
            </div>

            <!-- Panel Detalle Desplegable -->
            <div v-if="trxDetalleId === trx.id_recarga" class="detalle-trx-box anim-fade" style="width: 100%; margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 8px; font-size: 0.9rem;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; color: var(--texto-secundario);">
                <div>
                  <div style="color: var(--texto-secundario); font-size: 0.8rem; margin-bottom: 0.2rem;">ID Recarga</div>
                  <strong style="color: white;">#{{ trx.id_recarga }}</strong>
                </div>
                <div>
                  <div style="color: var(--texto-secundario); font-size: 0.8rem; margin-bottom: 0.2rem;">Ref. Transacción</div>
                  <strong style="color: white;">{{ trx.numero_transaccion || 'N/A' }}</strong>
                </div>
                <div>
                  <div style="color: var(--texto-secundario); font-size: 0.8rem; margin-bottom: 0.2rem;">Método de Pago</div>
                  <strong style="color: white; display: flex; align-items: center; gap: 4px;">
                    <svg v-if="esTrxQr(trx)" width="14" height="14" viewBox="0 0 24 24" fill="none" style="stroke: var(--morado-brillante)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    {{ esTrxQr(trx) ? 'Transferencia QR' : 'Efectivo en Caja' }}
                  </strong>
                </div>
                <div>
                  <div style="color: var(--texto-secundario); font-size: 0.8rem; margin-bottom: 0.2rem;">Realizado por</div>
                  <strong style="color: white;">{{ esTrxQr(trx) ? 'Cliente (App Móvil)' : 'Cajero en Turno' }}</strong>
                </div>
              </div>

              <div v-if="trx.comprobante_url" style="margin-top: 1.5rem; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                <div style="color: var(--texto-secundario); font-size: 0.8rem; margin-bottom: 0.5rem;">Comprobante Adjunto del Cliente</div>
                <img :src="urlImagenBase(trx.comprobante_url)" alt="Comprobante" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal QR Creado a Pantalla Completa -->
    <div v-if="credencialesGeneradas" class="modal-overlay anim-fade">
      <div class="modal-contenido modal-gigante" style="max-width: 450px; text-align: center;">
        <div class="modal-header-centrado">
          <div class="icono-exito-grande">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 style="color: var(--texto-principal); font-family: var(--fuente-titulo); margin: 1rem 0 0.5rem; font-size: 1.5rem;">Billetera creada</h2>
          <p style="color: var(--texto-secundario); margin: 0 0 1.5rem;">La cuenta está lista para usarse.</p>
        </div>
        
        <div class="qr-generado-box" style="background: white; padding: 1rem; border-radius: var(--radio-lg); display: inline-block; margin-bottom: 1rem; box-shadow: 0 0 20px rgba(168,85,247,0.35);">
          <img v-if="qrBase64" :src="qrBase64" alt="QR del Cliente" style="width: 250px; height: 250px; display: block;" />
        </div>
        
        <div class="codigo-gigante" style="font-size: 1.3rem; margin-bottom: 0.5rem; word-break: break-all;">
          {{ credencialesGeneradas.qr_publico }}
        </div>
        
        <p class="alerta-info" style="margin-bottom: 1.5rem; font-size: 0.95rem;">
          Muestra esta pantalla al cliente para que tome una foto al QR.
        </p>
        
        <div class="credenciales-resumen" style="background: rgba(168,85,247,0.06); padding: 1.2rem; border-radius: var(--radio-lg); margin-bottom: 1.5rem; text-align: left; border: 1px solid var(--borde-sutil);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
            <span style="color: var(--texto-secundario);">Correo:</span>
            <strong style="color: white;">{{ credencialesGeneradas.credenciales.correo }}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
            <span style="color: var(--texto-secundario);">PIN de Seguridad:</span>
            <strong style="color: var(--color-exito); font-size: 1.1rem; letter-spacing: 2px;">{{ nuevoPin || '1234' }}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--texto-secundario);">Saldo Inicial:</span>
            <strong style="color: white;">Bs. {{ nuevoMonto || '0.00' }}</strong>
          </div>
        </div>
        
        <button @click="credencialesGeneradas = null; qrBase64 = null; nuevoId = ''; nuevoPin = ''; nuevoMonto = ''; errorIdExiste = ''; ocrExitoso = null; archivoRecarga = null; previewArchivoRecarga = null; tabActiva = 'recargar'" class="btn-accion-principal btn-exito" style="width: 100%;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Finalizar y Volver
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
const notif = useNotificaciones()
import QRCode from 'qrcode'
import { io } from 'socket.io-client'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'
import BuscadorCliente from '@/componentes/comunes/BuscadorCliente.vue'
import { formatoFecha } from '@/utilidades/formato.js'

const tabActiva = ref('recargar')
const modalExito = ref(null)
const qrAmpliado = ref(false)

// ---- Retiros de billetera ----
const retiros = ref([])
const retirosPendientes = ref([])
const filtroRetiro = ref('pendiente')
const procesandoRetiro = ref(null)
// Visor de imagen (QR que envió el cliente / comprobante del depósito)
const imagenAmpliada = ref(null)
async function cargarRetiros() {
  try {
    const data = await clienteHttp.get(`/cajero/retiros?estado=${filtroRetiro.value}`)
    // Pre-cargar montos por defecto: retirar todo el saldo, entregar todo (el cajero ajusta).
    retiros.value = (data || []).map(r => ({ ...r, _retirar: r.saldo_actual, _entregar: r.saldo_actual }))
    if (filtroRetiro.value === 'pendiente') retirosPendientes.value = retiros.value
  } catch { retiros.value = [] }
}
async function cargarPendientesBadge() {
  try { retirosPendientes.value = await clienteHttp.get('/cajero/retiros?estado=pendiente') } catch { /* nada */ }
}
// Cuánto se entrega según el método: EFECTIVO redondea hacia arriba a 0.10
// (el cliente recibe un poco más, nunca menos); QR/transferencia es exacto.
function entregarRetiro(r) {
  const retirar = Number(r._retirar) || 0
  if (retirar <= 0) return 0
  if (r.metodo === 'qr') return Math.round(retirar * 100) / 100
  return Math.ceil(retirar * 10) / 10
}
function redondeoRetiro(r) {
  return Math.round((entregarRetiro(r) - (Number(r._retirar) || 0)) * 100) / 100
}
async function pagarRetiro(r) {
  const retirar = Number(r._retirar)
  if (!(retirar > 0)) { notif.advertencia('El monto a retirar debe ser mayor a 0.'); return }
  if (retirar > r.saldo_actual) { notif.advertencia('No puede retirar más que el saldo del cliente.'); return }
  // Pago por QR: el comprobante del depósito es OBLIGATORIO (constancia para el
  // cliente y control de caja).
  if (r.metodo === 'qr' && !r._comprobante) {
    notif.advertencia('Haz el depósito y adjunta tu comprobante primero.')
    return
  }
  procesandoRetiro.value = r.id_solicitud
  try {
    // El backend calcula lo entregado (efectivo redondea arriba, QR exacto).
    const fd = new FormData()
    fd.append('monto_retirado', String(retirar))
    if (r._comprobante) fd.append('comprobante', r._comprobante)
    const res = await clienteHttp.post(`/cajero/retiros/${r.id_solicitud}/pagar`, fd)
    const comoRecibe = r.metodo === 'qr' ? 'Transfiere' : 'Entrega'
    notif.exito(`Retiro registrado. ${comoRecibe} Bs ${res.entregado}${Number(res.diferencia) > 0 ? ` (redondeo +Bs ${res.diferencia})` : ''}.`)
    cargarRetiros()
  } catch (e) { notif.error(e?.response?.data?.error || e?.error || 'No se pudo procesar el retiro.') }
  finally { procesandoRetiro.value = null }
}
async function rechazarRetiro(r) {
  // El motivo queda en el registro (reporte de rechazados) y se avisa al cliente
  const motivo = await notif.solicitar({
    titulo: `Rechazar el retiro de ${r.cliente}`,
    mensaje: '¿Por qué se rechaza? El cliente verá este motivo.',
    placeholder: 'Ej: el QR enviado no es válido',
  })
  if (motivo === null) return
  procesandoRetiro.value = r.id_solicitud
  try {
    await clienteHttp.post(`/cajero/retiros/${r.id_solicitud}/rechazar`, { motivo })
    notif.exito('Solicitud rechazada.')
    cargarRetiros()
  } catch (e) { notif.error(e?.response?.data?.error || e?.error || 'No se pudo rechazar.') }
  finally { procesandoRetiro.value = null }
}

// ---- Abrir Billetera ----
const nuevoId = ref('')
const nuevoPin = ref('')
const nuevaUbicacion = ref('general')
const nuevoMonto = ref('')
const nuevoMetodo = ref('efectivo')
const cargandoAbrir = ref(false)
const credencialesGeneradas = ref(null)
const errorIdExiste = ref('')
const qrBase64 = ref(null)

let timerVerificar = null
function verificarIdentificador() {
  clearTimeout(timerVerificar)
  errorIdExiste.value = ''
  if (!nuevoId.value || nuevoId.value.length < 4) return
  
  timerVerificar = setTimeout(async () => {
    try {
      const res = await clienteHttp.get(`/cajero/buscar-cliente?q=${nuevoId.value}`)
      const coincidencia = res.find(u => 
        u.telefono === nuevoId.value || 
        u.ci_carnet === nuevoId.value || 
        u.correo === `${nuevoId.value}@euphoria.com` || 
        u.correo === nuevoId.value
      )
      if (coincidencia) {
        errorIdExiste.value = `El cliente ${coincidencia.nombres} ya tiene billetera registrada.`
      }
    } catch (e) {
      console.error(e)
    }
  }, 400)
}

// ---- Recargar ----
// (la búsqueda con autocompletado vive en el componente BuscadorCliente)
const clienteSeleccionado = ref(null)
const montoRecarga = ref('')
const metodoPago = ref('efectivo')
const efectivoRecibido = ref('')
const cargando = ref(false)

// OCR recarga cajero
const archivoRecarga = ref(null)
const previewArchivoRecarga = ref(null)
const validandoOCR = ref(false)
const ocrExitoso = ref(null)
const errorOCRRecarga = ref('')
const errorRecargar = ref('')

// Calculadora vuelto
const montoActual = computed(() => tabActiva.value === 'recargar' ? montoRecarga.value : nuevoMonto.value)

const vuelto = computed(() => {
  const recibido = Number(efectivoRecibido.value) || 0
  const monto = Number(montoActual.value) || 0
  return recibido - monto
})

// Determina si una transacción del historial fue por QR usando el método real
// (persistido en la transacción) en lugar de inferirlo de comprobante_url.
function esTrxQr(trx) {
  const metodo = (trx.metodo || trx.metodo_pago || trx.tipo_operacion || '').toString().toLowerCase()
  if (metodo) return metodo.includes('qr') || metodo.includes('transferencia')
  // Fallback legado: si no viene el método, inferir por presencia de comprobante.
  return !!trx.comprobante_url
}

// Escáner de Recargar: identifica al cliente a partir de CUALQUIER QR suyo
// (token de pago JWT o identificador). El backend lo resuelve.
async function onQrRecarga(texto) {
  errorRecargar.value = ''
  try {
    const cli = await clienteHttp.post('/cajero/resolver-qr', { texto })
    clienteSeleccionado.value = cli
  } catch (e) {
    errorRecargar.value = e?.error || 'No se pudo identificar el QR.'
  }
}

// Comprobante cajero — la captura (foto HD o galería) está unificada en
// CapturaCamara. Recibe el File emitido, muestra la previsualización y lo
// valida por OCR (misma lógica que antes al subir/tomar la foto).
function onFotoComprobante(file) {
  if (!file) return
  archivoRecarga.value = file
  previewArchivoRecarga.value = URL.createObjectURL(file)
  validarOCRCajero(file)
}

function quitarArchivoRecarga() {
  archivoRecarga.value = null
  previewArchivoRecarga.value = null
  ocrExitoso.value = null
  errorOCRRecarga.value = ''
}

const transaccionIdOCR = ref('')

// Limpia el estado OCR/comprobante que se comparte entre los flujos
// 'Nueva Billetera' y 'Recargar' para evitar arrastrar una validación de un
// flujo/monto a otro al cambiar de pestaña.
function limpiarEstadoOCR() {
  archivoRecarga.value = null
  previewArchivoRecarga.value = null
  ocrExitoso.value = null
  transaccionIdOCR.value = ''
  errorOCRRecarga.value = ''
  validandoOCR.value = false
  efectivoRecibido.value = ''
}

watch(tabActiva, () => {
  limpiarEstadoOCR()
})

async function validarOCRCajero(file) {
  validandoOCR.value = true
  ocrExitoso.value = null
  transaccionIdOCR.value = ''
  try {
    const formData = new FormData()
    formData.append('comprobante', file)
    formData.append('monto_esperado', montoActual.value)
    const res = await clienteHttp.post('/comandas/validar-comprobante', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    ocrExitoso.value = res.valido === true
    if (res.valido) {
      transaccionIdOCR.value = res.transaccionId
    } else {
      errorOCRRecarga.value = res.error || res.mensaje || 'Comprobante no válido'
    }
  } catch (error) {
    ocrExitoso.value = false
    errorOCRRecarga.value = error.error || error.message || 'No se pudo validar el comprobante. Revisa la imagen.'
  } finally {
    validandoOCR.value = false
  }
}

// ---- Consultar ----
const consultaId = ref('')
const resultadoConsulta = ref(null)
const errorConsulta = ref('')
const cargandoConsulta = ref(false)
const qrConsultaBase64 = ref(null)

const busquedaConsulta = ref('')
const resultadosConsulta = ref([])
const clienteConsultaSeleccionado = ref(null)
let timerConsulta = null

async function buscarClienteConsulta() {
  clearTimeout(timerConsulta)
  if (!busquedaConsulta.value || busquedaConsulta.value.length < 1) {
    resultadosConsulta.value = []
    return
  }
  timerConsulta = setTimeout(async () => {
    try {
      const res = await clienteHttp.get(`/cajero/buscar-cliente?q=${busquedaConsulta.value}`)
      resultadosConsulta.value = Array.isArray(res) ? res : []
    } catch { resultadosConsulta.value = [] }
  }, 250)
}

function seleccionarClienteConsulta(u) {
  clienteConsultaSeleccionado.value = u
  busquedaConsulta.value = `${u.nombres} - ${u.telefono || u.ci_carnet}`
  resultadosConsulta.value = []
}

// Escáner de Consultar: resuelve cualquier QR del cliente y lo selecciona.
async function onQrConsulta(texto) {
  errorConsulta.value = ''
  try {
    clienteConsultaSeleccionado.value = await clienteHttp.post('/cajero/resolver-qr', { texto })
  } catch (e) {
    errorConsulta.value = e?.error || 'No se pudo identificar el QR.'
  }
}

async function consultarBilletera() {
  if (!clienteConsultaSeleccionado.value) return
  cargandoConsulta.value = true
  errorConsulta.value = ''
  resultadoConsulta.value = null
  qrConsultaBase64.value = null
  
  try {
    const ident = clienteConsultaSeleccionado.value.correo || clienteConsultaSeleccionado.value.ci_carnet || clienteConsultaSeleccionado.value.telefono
    const res = await clienteHttp.get(`/cajero/consultar-billetera/${ident}`)
    resultadoConsulta.value = res
    qrConsultaBase64.value = await QRCode.toDataURL(res.token_qr || res.qr_publico, {
      width: 250, margin: 1, color: { dark: '#10002b', light: '#ffffff' }
    })
  } catch (error) {
    errorConsulta.value = error.error || 'No se pudo encontrar billetera con esos datos'
  } finally {
    cargandoConsulta.value = false
  }
}

const nuevoPinReseteo = ref('')
const cargandoPin = ref(false)
const msjPin = ref('')

async function resetearPin() {
  if (!resultadoConsulta.value || nuevoPinReseteo.value.length !== 4) return
  cargandoPin.value = true
  msjPin.value = ''
  try {
    await clienteHttp.post('/cajero/resetear-pin', {
      id_usuario: resultadoConsulta.value.id_usuario,
      nuevo_pin: nuevoPinReseteo.value
    })
    msjPin.value = '¡PIN cambiado con éxito!'
    nuevoPinReseteo.value = ''
    setTimeout(() => msjPin.value = '', 4000)
  } catch (e) {
    msjPin.value = 'Error al cambiar PIN'
  } finally {
    cargandoPin.value = false
  }
}

// ---- Historial y Transacciones ----
const transaccionesHistorial = ref([])
const cargandoHistorial = ref(false)
const filtroBusqueda = ref('')
const filtroEstado = ref('todas')
const trxDetalleId = ref(null)

const historialFiltrado = computed(() => {
  let resultado = transaccionesHistorial.value || []

  if (filtroEstado.value === 'completadas') {
    resultado = resultado.filter(trx => trx.estado === 'completada')
  } else if (filtroEstado.value === 'pendientes') {
    resultado = resultado.filter(trx => trx.estado === 'pendiente')
  }

  if (filtroBusqueda.value) {
    const t = filtroBusqueda.value.toLowerCase()
    resultado = resultado.filter(trx => {
      const u = trx.usuario || {}
      return (
        (u.nombres || '').toLowerCase().includes(t) ||
        (u.apellidos || '').toLowerCase().includes(t) ||
        (u.correo || '').toLowerCase().includes(t) ||
        (u.telefono || '').includes(t) ||
        (u.ci_carnet || '').includes(t) ||
        (trx.monto_recarga || '').toString().includes(t) ||
        formatoFecha(trx.fecha_solicitud).toLowerCase().includes(t)
      )
    })
  }
  return resultado
})

async function cargarHistorial() {
  cargandoHistorial.value = true
  try {
    const res = await clienteHttp.get('/cajero/historial')
    transaccionesHistorial.value = Array.isArray(res) ? res : []
  } catch (error) {
    console.error('Error cargando historial', error)
  } finally {
    cargandoHistorial.value = false
  }
}

function urlImagenBase(ruta) {
  if (!ruta) return ''
  const rutaLimpia = ruta.split('|')[0]
  if (rutaLimpia.startsWith('http')) return rutaLimpia
  // Ruta relativa al mismo origen (en producción el backend sirve todo). Antes
  // usaba localhost:3000 y las imágenes no cargaban en producción.
  const backend = import.meta.env.VITE_URL_BACKEND || ''
  return `${backend}${rutaLimpia}`
}

async function resolverTransaccion(id, estado) {
  try {
    await clienteHttp.post('/cajero/resolver', { id_recarga: id, estado })
    await cargarHistorial()
  } catch (error) {
    console.error(error)
    notif.error('Error al resolver transacción')
  }
}

async function recargarCliente() {
  if (!clienteSeleccionado.value || !montoRecarga.value || montoRecarga.value < 10) return
  // En efectivo, exigir que el efectivo recibido cubra el monto (vuelto no negativo)
  if (metodoPago.value === 'efectivo' && vuelto.value < 0) return
  cargando.value = true
  try {
    const identificador = clienteSeleccionado.value.telefono || clienteSeleccionado.value.ci_carnet || clienteSeleccionado.value.correo
    let res
    if (metodoPago.value === 'qr') {
      // Enviar el comprobante y el nº de transacción del OCR para que el backend
      // valide/persista del lado del servidor y rechace transaccionId ya usados.
      const formData = new FormData()
      formData.append('identificador', identificador)
      formData.append('monto', montoRecarga.value)
      formData.append('metodo', metodoPago.value)
      if (transaccionIdOCR.value) formData.append('transaccionId', transaccionIdOCR.value)
      if (archivoRecarga.value) formData.append('comprobante', archivoRecarga.value)
      res = await clienteHttp.post('/cajero/recargar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } else {
      res = await clienteHttp.post('/cajero/recargar', {
        identificador,
        monto: montoRecarga.value,
        metodo: metodoPago.value
      })
    }
    clienteSeleccionado.value = null
    montoRecarga.value = ''
    efectivoRecibido.value = ''
    ocrExitoso.value = null
    archivoRecarga.value = null
    previewArchivoRecarga.value = null
    modalExito.value = {
      titulo: 'Recarga Exitosa',
      mensaje: `Saldo actualizado correctamente`,
      detalle: `Nuevo saldo: Bs. ${res.saldo_nuevo}  |  Ref: ${res.numero_transaccion}`
    }
  } catch (error) {
    console.error(error)
    // Mostrar error en banner (no alert)
    errorRecargar.value = error.error || 'Error al recargar al cliente'
  } finally {
    cargando.value = false
  }
}

async function abrirBilletera() {
  if (!nuevoId.value || errorIdExiste.value) return
  // En efectivo, exigir que el efectivo recibido cubra el saldo inicial.
  if (nuevoMetodo.value === 'efectivo' && vuelto.value < 0) return
  cargandoAbrir.value = true
  credencialesGeneradas.value = null
  qrBase64.value = null
  try {
    const res = await clienteHttp.post('/cajero/abrir-billetera', {
      identificador: nuevoId.value,
      pin: nuevoPin.value,
      ubicacion: nuevaUbicacion.value,
      monto_inicial: nuevoMonto.value,
      metodo_pago: nuevoMetodo.value
    })
    credencialesGeneradas.value = res
    qrBase64.value = await QRCode.toDataURL(res.token_qr || res.qr_publico, {
      width: 400,
      margin: 1,
      color: { dark: '#10002b', light: '#ffffff' }
    })
    ocrExitoso.value = null
    archivoRecarga.value = null
    previewArchivoRecarga.value = null
  } catch (error) {
    console.error(error)
    errorRecargar.value = error.error || 'Error al abrir billetera'
  } finally {
    cargandoAbrir.value = false
  }
}

let socket = null

onMounted(() => {
  cargarHistorial()
  cargarPendientesBadge()

  // Websockets para actualización en tiempo real (mismo origen; en dev Vite
  // hace proxy de /socket.io). Antes usaba localhost:3000 y no conectaba en produccion.
  socket = io({ path: '/socket.io' })

  socket.on('recarga_registrada', () => {
    cargarHistorial()
  })
  // Un cliente pidió un retiro: refrescar la lista/badge en vivo.
  socket.on('retiro_solicitado', () => {
    cargarPendientesBadge()
    if (tabActiva.value === 'retiros') cargarRetiros()
  })
})
</script>

<style scoped>
.vista-cajero {
  --borde-color: var(--borde-sutil);
  position: relative;
  padding: 1.75rem 1.5rem 3rem;
  max-width: 720px;
  margin: 0 auto;
}

/* Halo ambiental sutil detrás del contenido (no captura clicks) */
.vista-cajero::before {
  content: '';
  position: absolute;
  inset: -10% -20% auto -20%;
  height: 420px;
  background:
    radial-gradient(50% 60% at 20% 0%, rgba(168,85,247,0.16), transparent 70%),
    radial-gradient(45% 55% at 90% 10%, rgba(236,72,153,0.12), transparent 70%);
  filter: blur(10px);
  pointer-events: none;
  z-index: 0;
}

.vista-cajero > * { position: relative; z-index: 1; }

/* Header Premium — barra de vidrio */
.cajero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 1.1rem 1.35rem;
  border-radius: var(--radio-xl);
}

.cajero-logo-zona {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.cajero-titulos { min-width: 0; }

.cajero-badge {
  width: 54px;
  height: 54px;
  border-radius: var(--radio-lg);
  background: var(--gradiente-marca-3, var(--gradiente-marca));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 22px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.28);
  flex-shrink: 0;
  position: relative;
}

.cajero-badge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
}

.cajero-rol-label {
  font-size: 0.88rem;
  color: var(--texto-secundario);
  font-weight: 500;
  line-height: 1.4;
  margin-top: 0.2rem;
}

.cajero-titulo-visual {
  font-family: var(--fuente-titulo);
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.05;
  color: var(--texto-principal);
}

/* Chip de estado en el header (1 sola etiqueta por vista) */
.cajero-header-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radio-full);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--morado-hover);
  background: rgba(168,85,247,0.12);
  border: 1px solid var(--glass-borde);
  flex-shrink: 0;
}

.cajero-header-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-exito);
  box-shadow: 0 0 10px var(--color-exito);
}

/* Card Visual Header */
.card-visual-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--borde-color);
}

.card-icon-grande {
  width: 64px;
  height: 64px;
  border-radius: var(--radio-lg);
  background: linear-gradient(135deg, var(--color-exito), #16A34A);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 26px rgba(34,197,94,0.32), inset 0 1px 0 rgba(255,255,255,0.28);
  flex-shrink: 0;
  position: relative;
}

.card-icon-grande::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);
  pointer-events: none;
}

.card-icon-morado {
  background: var(--gradiente-marca-3, var(--gradiente-marca));
  box-shadow: 0 10px 26px rgba(168,85,247,0.34), inset 0 1px 0 rgba(255,255,255,0.28);
}

.card-titulo {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--texto-principal);
  text-wrap: balance;
}

.card-subtitulo {
  margin: 0.3rem 0 0;
  color: var(--texto-secundario);
  font-size: 0.9rem;
  line-height: 1.45;
}

/* Labels con iconos */
.grupo-input label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--texto-secundario);
  margin-bottom: 0.6rem;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Selector de Ubicación */
.selector-ubicacion {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}

.btn-ubicacion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 0.5rem;
  min-height: 68px;
  justify-content: center;
  border-radius: var(--radio-md);
  border: 1px solid var(--borde-sutil);
  background: rgba(168,85,247,0.05);
  color: var(--texto-secundario);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all var(--trans-normal, 0.2s) var(--ease-suave, ease);
}

.btn-ubicacion:hover {
  border-color: var(--borde-activo);
  background: rgba(168,85,247,0.1);
  color: var(--texto-principal);
  transform: translateY(-2px);
}

.btn-ubicacion:active {
  transform: translateY(0) scale(0.98);
}

.btn-ubicacion:focus-visible {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco, 0 0 0 2px rgba(168,85,247,0.35));
}

.btn-ubicacion.seleccionado {
  border-color: var(--morado-brillante);
  background: rgba(168,85,247,0.16);
  color: var(--texto-principal);
  box-shadow: 0 0 0 2px rgba(168,85,247,0.25), var(--sombra-glow);
}

/* Selector de Método */
.selector-metodo {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}

.btn-metodo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.85rem;
  border-radius: var(--radio-md);
  border: 1px solid var(--borde-sutil);
  background: rgba(168,85,247,0.05);
  color: var(--texto-secundario);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all var(--trans-normal, 0.2s) var(--ease-suave, ease);
}

.btn-metodo:hover {
  border-color: var(--borde-activo);
  background: rgba(168,85,247,0.1);
  color: var(--texto-principal);
  transform: translateY(-2px);
}

.btn-metodo:active {
  transform: translateY(0) scale(0.98);
}

.btn-metodo:focus-visible {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco, 0 0 0 2px rgba(168,85,247,0.35));
}

.btn-metodo.seleccionado {
  border-color: transparent;
  background: var(--gradiente-marca);
  color: var(--texto-principal);
  box-shadow: var(--sombra-glow), inset 0 1px 0 rgba(255,255,255,0.2);
}

/* Alerta resultado */
.alerta-info {
  color: var(--texto-secundario);
  font-size: 0.85rem;
  margin: 0.5rem 0 1rem;
}

.alerta-icono {
  margin-bottom: 0.5rem;
}

/* Anim fade */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.anim-fade {
  animation: fadeIn 0.25s ease;
}

/* Modal de éxito */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-start; /* Evita que se corte por arriba al scrollear */
  justify-content: center;
  padding: 3rem 1rem;
  overflow-y: auto;
}

.modal-gigante {
  max-width: 450px;
  width: 100%;
  text-align: center;
  margin: auto; /* Centra verticalmente si sobra espacio, pero permite scroll si falta */
}

.modal-exito {
  background: var(--fondo-tarjeta);
  border: 1px solid rgba(34,197,94,0.3);
  border-radius: var(--radio-xl);
  padding: 2.5rem 2rem;
  max-width: 380px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(34,197,94,0.1);
}

.modal-icono-exito {
  width: 72px;
  height: 72px;
  border-radius: var(--radio-full);
  background: rgba(34,197,94,0.1);
  border: 2px solid rgba(34,197,94,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.2rem;
}

.modal-exito h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--texto-principal);
  margin: 0 0 0.5rem;
}

.modal-exito p {
  color: var(--texto-secundario);
  font-size: 0.95rem;
  margin: 0 0 1rem;
}

.modal-detalle {
  background: rgba(168,85,247,0.08);
  border-radius: var(--radio-md);
  padding: 0.8rem 1rem;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--color-exito);
  margin-bottom: 1.5rem;
  letter-spacing: 0.5px;
}

/* Banner error */
.banner-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: var(--radio-md);
  padding: 0.7rem 1rem;
  color: var(--color-error);
  font-size: 0.9rem;
  font-weight: 600;
}

.cerrar-banner {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* Aviso cliente requerido */
.aviso-cliente-requerido {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: var(--radio-md);
  padding: 0.7rem 1rem;
  color: var(--color-alerta);
  font-size: 0.85rem;
  font-weight: 600;
}

/* Buscador con autocompletado */
.buscador-cliente-wrap {
  position: relative;
}

.dropdown-resultados {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-md);
  z-index: 50;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6), var(--sombra-glow);
  margin-top: 4px;
}

.resultado-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--borde-sutil);
  transition: background 0.15s var(--ease-suave, ease), padding-left 0.15s var(--ease-suave, ease);
}

.resultado-item:last-child { border-bottom: none; }
.resultado-item:hover { background: rgba(168,85,247,0.12); padding-left: 1.25rem; }

.resultado-info {
  display: flex;
  flex-direction: column;
}

.resultado-nombre {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--texto-principal);
}

.resultado-sub {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  font-variant-numeric: tabular-nums;
}

/* Chip cliente seleccionado */
.cliente-chip {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.25);
  border-radius: var(--radio-md);
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
}

.chip-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chip-nombre {
  font-weight: 700;
  color: var(--texto-principal);
  font-size: 0.95rem;
}

.chip-sub {
  font-size: 0.8rem;
  color: var(--color-exito);
}

.chip-cerrar {
  background: rgba(239,68,68,0.1);
  border: none;
  border-radius: var(--radio-full);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-error);
  transition: background 0.2s;
}

.chip-cerrar:hover { background: var(--color-error); color: white; }

/* Calculadora vuelto */
.calculadora-vuelto {
  background: rgba(168,85,247,0.05);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
  padding: 1rem;
}

.calc-vuelto {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radio-sm);
  font-weight: 700;
  font-size: 1rem;
  margin-top: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.vuelto-ok { background: rgba(34,197,94,0.12); color: var(--color-exito); }
.vuelto-error { background: rgba(239,68,68,0.12); color: var(--color-error); }

/* Flujo QR */
.flujo-qr {
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 1.2rem;
  background: rgba(168,85,247,0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Contenedor del QR de pago */
.qr-pago-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}

.qr-etiqueta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--texto-secundario);
  font-size: 0.85rem;
  font-weight: 600;
}

.qr-imagen-wrap {
  position: relative;
  cursor: pointer;
  border-radius: var(--radio-lg);
  overflow: hidden;
  border: 2px solid rgba(168,85,247,0.25);
  width: 180px;
  height: 180px;
  transition: border-color 0.2s;
}

.qr-imagen-wrap:hover {
  border-color: var(--morado-brillante);
}

.qr-imagen-pago {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.qr-ampliar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
}

.qr-imagen-wrap:hover .qr-ampliar-overlay {
  opacity: 1;
}

/* Separador entre QR y comprobante */
.qr-separador {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--texto-secundario);
  font-size: 0.8rem;
  text-align: center;
}

.qr-separador::before,
.qr-separador::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--borde-color);
}

/* Modal QR ampliado */
.modal-qr-ampliado {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl);
  padding: 2rem 1.5rem;
  max-width: 420px;
  width: 90%;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(168,85,247,0.15);
}

.modal-qr-cerrar {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(168,85,247,0.1);
  border: none;
  border-radius: var(--radio-full);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--texto-secundario);
  transition: background 0.2s;
}

.modal-qr-cerrar:hover {
  background: rgba(239,68,68,0.15);
  color: var(--color-error);
}

.modal-qr-monto {
  font-size: 2rem;
  font-weight: 900;
  color: var(--morado-brillante);
  margin-bottom: 1rem;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
}

.qr-imagen-grande {
  width: 100%;
  max-width: 320px;
  border-radius: var(--radio-lg);
  border: 2px solid rgba(168,85,247,0.3);
}

.modal-qr-hint {
  color: var(--texto-secundario);
  font-size: 0.85rem;
  margin: 1rem 0 0;
}

/* Instrucción QR (texto antiguo — mantenido por compatibilidad) */
.qr-instruccion {
  color: var(--texto-secundario);
  font-size: 0.85rem;
  margin: 0;
}


.archivo-preview {
  position: relative;
  margin-top: 0.8rem;
  display: inline-block;
}

.preview-img {
  width: 100%;
  max-height: 150px;
  object-fit: cover;
  border-radius: var(--radio-md);
  border: 1px solid var(--borde-sutil);
}

.btn-quitar-archivo {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  background: rgba(0,0,0,0.7);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
}

.estado-ocr {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.8rem;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radio-md);
  font-size: 0.9rem;
  font-weight: 600;
}

.estado-ocr.cargando { color: var(--texto-secundario); }
.estado-ocr.exito { background: rgba(34,197,94,0.1); color: var(--color-exito); }
.estado-ocr.error-ocr { background: rgba(245,158,11,0.1); color: var(--color-alerta); }

.estado-ocr.exito-detallado {
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.3);
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
}

.exito-icono {
  margin-top: 2px;
}

.exito-texto {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.exito-titulo {
  color: var(--color-exito);
  font-weight: 700;
  font-size: 0.95rem;
}

.exito-sub {
  color: rgba(34,197,94,0.85);
  font-size: 0.8rem;
  font-weight: 500;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }


.tabs-cajero {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 2rem;
  padding: 0.4rem;
  border-radius: var(--radio-xl);
  background: var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 34px rgba(10,6,26,0.45);
  flex-wrap: wrap; /* Permite que los botones bajen si no hay espacio */
}

.tab-btn {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid transparent;
  color: var(--texto-secundario);
  padding: 0.7rem 1rem;
  min-height: 46px;
  border-radius: var(--radio-lg);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.25s var(--ease-suave), background 0.25s var(--ease-suave), box-shadow 0.3s var(--ease-suave), transform 0.2s var(--ease-suave);
}

.tab-btn svg { opacity: 0.85; transition: opacity 0.2s ease; }

.tab-btn:hover {
  background: rgba(168, 85, 247, 0.1);
  color: var(--texto-principal);
}

.tab-btn:active {
  transform: scale(0.98);
}

.tab-btn:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco, 0 0 0 2px rgba(168,85,247,0.4));
}

.tab-btn.activo {
  background: var(--gradiente-marca);
  color: #fff;
  box-shadow: 0 8px 20px rgba(168, 85, 247, 0.45), inset 0 1px 0 rgba(255,255,255,0.25);
}

.tab-btn.activo svg { opacity: 1; }

.neon-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.neon-dot.completada {
  background: var(--color-exito);
  box-shadow: 0 0 10px var(--color-exito);
}
.neon-dot.pendiente {
  background: var(--color-alerta);
  box-shadow: 0 0 10px var(--color-alerta);
}
.neon-dot.rechazada {
  background: var(--color-error);
  box-shadow: 0 0 10px var(--color-error);
}

.tarjeta-modulo {
  position: relative;
  background:
    linear-gradient(180deg, rgba(168,85,247,0.05), transparent 30%),
    var(--gradiente-sutil, var(--fondo-tarjeta));
  border-radius: var(--radio-xl);
  padding: 2rem 2rem 2.25rem;
  border: 1px solid var(--glass-borde);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 22px 55px rgba(10,6,26,0.55),
    0 0 34px rgba(168,85,247,0.08);
}

/* Filo de neón superior que reafirma la marca */
.tarjeta-modulo::before {
  content: '';
  position: absolute;
  top: 0;
  left: 1.5rem;
  right: 1.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(236,72,153,0.5), transparent);
  opacity: 0.8;
}

.tarjeta-modulo h2 {
  margin-top: 0;
  font-family: var(--fuente-titulo);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
  text-wrap: balance;
}

.texto-ayuda {
  color: var(--texto-secundario);
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.formulario-cajero {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.grupo-input label {
  display: block;
  color: var(--texto-secundario);
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.grupo-input input, .grupo-input select {
  width: 100%;
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  padding: 0.9rem 1rem;
  border-radius: var(--radio-md);
  color: var(--texto-principal);
  font-size: 1rem;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
  transition: border-color var(--trans-rapida, 0.15s) var(--ease-suave, ease), box-shadow var(--trans-rapida, 0.15s) var(--ease-suave, ease), background var(--trans-rapida, 0.15s) var(--ease-suave, ease);
}

.grupo-input input:hover:not(:focus), .grupo-input select:hover:not(:focus) {
  border-color: var(--borde-activo);
}

.grupo-input input::placeholder {
  color: var(--texto-secundario);
  opacity: 0.7;
}

.select-premium {
  appearance: none;
  -webkit-appearance: none;
  background: var(--fondo-input) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A855F7' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 1rem center;
  border: 1px solid var(--borde-sutil);
  padding: 0.8rem 3rem 0.8rem 1rem;
  border-radius: var(--radio-md);
  color: var(--texto-principal);
  font-size: 1rem;
  width: 100%;
  cursor: pointer;
  transition: border-color 0.3s;
}

.select-premium:focus {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco, 0 0 0 2px rgba(168,85,247,0.25));
}

.input-valido {
  border-color: var(--color-exito) !important;
  box-shadow: 0 0 0 2px rgba(34,197,94,0.18);
}

.input-error {
  border-color: var(--color-error) !important;
  box-shadow: 0 0 0 2px rgba(239,68,68,0.18);
}

.icono-check {
  margin-right: 0.8rem;
  flex-shrink: 0;
}

.error-texto {
  color: var(--color-error);
  font-size: 0.8rem;
  margin-top: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.input-con-icono {
  display: flex;
  align-items: center;
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
  transition: border-color var(--trans-rapida, 0.15s) var(--ease-suave, ease), box-shadow var(--trans-rapida, 0.15s) var(--ease-suave, ease);
}

.input-con-icono .prefijo {
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 0.9rem;
  margin-right: 0.2rem;
  color: var(--morado-hover);
  font-weight: 700;
  font-size: 0.95rem;
  background: rgba(168,85,247,0.1);
  border-right: 1px solid var(--borde-sutil);
}

.input-con-icono input {
  border: none;
  background: transparent;
  padding: 0.8rem 1rem 0.8rem 0;
}

.input-con-icono:focus-within {
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco, 0 0 0 2px rgba(168,85,247,0.25));
}

.grupo-input input:focus, .grupo-input select:focus {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco, 0 0 0 2px rgba(168,85,247,0.25));
}

.btn-exito {
  background: linear-gradient(135deg, var(--color-exito), #16A34A);
}
.btn-exito:hover:not(:disabled) {
  background: linear-gradient(135deg, #34D77A, var(--color-exito));
}

.alerta-credenciales {
  margin-top: 2rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 1.5rem;
  border-radius: var(--radio-lg);
  text-align: center;
}

.alerta-credenciales h3 {
  color: var(--color-exito);
  margin-top: 0;
}

.codigo-gigante {
  font-size: 2.5rem;
  font-family: monospace;
  font-weight: 900;
  color: var(--texto-principal);
  letter-spacing: 3px;
  margin: 1rem 0;
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--borde-sutil);
  padding: 1rem;
  border-radius: var(--radio-lg);
  user-select: all;
  font-variant-numeric: tabular-nums;
}

.btn-secundario {
  background: rgba(168,85,247,0.12);
  color: var(--texto-principal);
  border: 1px solid var(--borde-sutil);
  padding: 0.8rem 1.5rem;
  border-radius: var(--radio-md);
  cursor: pointer;
  margin-top: 1rem;
  transition: all var(--trans-normal, 0.2s) var(--ease-suave, ease);
}

.btn-secundario:hover {
  background: rgba(168,85,247,0.22);
  border-color: var(--borde-activo);
}

/* Buscador Ágil */
.header-pendientes {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.buscador-agil {
  display: flex;
  align-items: center;
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  padding: 0.5rem 1rem;
  border-radius: var(--radio-full);
  width: 100%;
  max-width: 350px;
  transition: border-color var(--trans-rapida, 0.15s) var(--ease-suave, ease);
}

.buscador-agil:focus-within {
  border-color: var(--morado-brillante);
  box-shadow: var(--anillo-foco, 0 0 0 2px rgba(168,85,247,0.25));
}

.buscador-agil svg {
  color: var(--texto-secundario);
  margin-right: 0.5rem;
}

.buscador-agil input {
  background: transparent;
  border: none;
  color: var(--texto-principal);
  width: 100%;
  outline: none;
}

.btn-accion-principal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--gradiente-marca);
  color: var(--texto-principal);
  border: none;
  padding: 1rem;
  min-height: 52px;
  border-radius: var(--radio-md);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all var(--trans-normal, 0.3s) var(--ease-suave, ease);
  box-shadow: 0 6px 18px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
  margin-top: 1rem;
}

.btn-accion-principal:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(168,85,247,0.5), var(--sombra-glow), inset 0 1px 0 rgba(255,255,255,0.25);
}

.btn-accion-principal:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}

.btn-accion-principal:focus-visible {
  outline: none;
  box-shadow: 0 6px 18px rgba(168,85,247,0.35), 0 0 0 3px rgba(168,85,247,0.45);
}

.btn-accion-principal:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

/* Lista Pendientes */
.estado-vacio {
  text-align: center;
  padding: 3.5rem 1.5rem 4rem;
  color: var(--texto-secundario);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.estado-vacio-icono {
  width: 68px;
  height: 68px;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--morado-brillante);
  background: rgba(168,85,247,0.1);
  border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  margin-bottom: 0.75rem;
}

.estado-vacio-titulo {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}

.estado-vacio-sub {
  margin: 0;
  max-width: 42ch;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--texto-secundario);
  text-wrap: pretty;
}

.estado-vacio svg {
  margin-bottom: 0;
}

.lista-pendientes {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-pendiente {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.8rem;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.02), transparent),
    rgba(168,85,247,0.05);
  padding: 1.1rem 1.2rem;
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  transition: border-color var(--trans-normal, 0.2s) var(--ease-suave, ease), transform var(--trans-normal, 0.2s) var(--ease-suave, ease), box-shadow var(--trans-normal, 0.2s) var(--ease-suave, ease);
}

.item-pendiente:hover {
  border-color: var(--borde-activo);
  transform: translateY(-2px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(10,6,26,0.4), var(--sombra-glow);
}

.info-principal {
  font-size: 1.1rem;
  color: var(--texto-principal);
  display: flex;
  gap: 0.9rem;
  align-items: center;
  flex-wrap: wrap;
  font-variant-numeric: tabular-nums;
}

.info-principal strong {
  font-family: var(--fuente-titulo);
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
}

.fecha {
  font-size: 0.85rem;
  color: var(--texto-secundario);
}

.info-secundaria {
  font-size: 0.9rem;
  color: var(--texto-secundario);
  margin-top: 0.3rem;
}

.acciones-trx {
  display: flex;
  gap: 0.5rem;
}

.btn-aprobar {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-exito);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 0.55rem 1rem;
  border-radius: var(--radio-sm);
  cursor: pointer;
  font-weight: 600;
  transition: all var(--trans-normal, 0.2s) var(--ease-suave, ease);
}

.btn-aprobar:hover {
  background: var(--color-exito);
  color: #1A0F3D;
}

.btn-aprobar:active { transform: scale(0.97); }
.btn-aprobar:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(34,197,94,0.5); }

.btn-rechazar {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.55rem 1rem;
  border-radius: var(--radio-sm);
  cursor: pointer;
  font-weight: 600;
  transition: all var(--trans-normal, 0.2s) var(--ease-suave, ease);
}

.btn-rechazar:hover {
  background: var(--color-error);
  color: var(--texto-principal);
}

.btn-rechazar:active { transform: scale(0.97); }
.btn-rechazar:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(239,68,68,0.5); }

@media (max-width: 768px) {
  .vista-cajero {
    padding: 0.8rem;
    max-width: 100%;
  }

  /* Tabs en celular - Diseño Grid 2x2 Premium */
  .scroll-tabs {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
    padding-bottom: 0.5rem;
    overflow: visible;
  }

  .tab-btn {
    width: 100%;
    white-space: nowrap;
    font-size: 0.8rem;
    padding: 0.8rem 0.5rem;
    box-shadow: none;
  }
  
  .tab-btn.activo {
    transform: none; /* en móvil evitamos brincos */
  }

  /* Cards sin padding exagerado */
  .tarjeta-modulo {
    padding: 1.2rem;
    border-radius: 12px;
  }

  /* Formulario ocupa todo el ancho */
  .formulario-cajero {
    max-width: 100%;
    gap: 1.2rem;
  }

  /* Header de card compacto */
  .card-visual-header {
    margin-bottom: 1.2rem;
    padding-bottom: 1rem;
  }

  .card-icon-grande {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .card-titulo {
    font-size: 1.1rem;
  }

  .card-subtitulo {
    font-size: 0.8rem;
  }

  /* Header cajero compacto */
  .cajero-header {
    margin-bottom: 1rem;
    padding: 0.9rem 1rem;
  }

  .cajero-header-tag {
    font-size: 0.68rem;
    padding: 0.35rem 0.7rem;
  }

  .cajero-badge {
    width: 44px;
    height: 44px;
  }

  .cajero-titulo-visual {
    font-size: 1.1rem;
  }

  /* Selectores de ubicación y método: 2 filas */
  .selector-ubicacion {
    grid-template-columns: repeat(3, 1fr);
  }

  .selector-metodo {
    grid-template-columns: repeat(2, 1fr);
  }

  .btn-metodo {
    font-size: 0.85rem;
    padding: 0.65rem;
  }

  .btn-ubicacion {
    font-size: 0.75rem;
    padding: 0.7rem 0.3rem;
  }

  /* Inputs touch-friendly */
  .grupo-input input,
  .grupo-input select,
  .select-premium {
    font-size: 16px; /* Evita zoom en iOS */
    padding: 0.9rem 1rem;
  }

  .input-con-icono input {
    font-size: 16px;
    padding: 0.9rem 0.8rem 0.9rem 0;
  }

  /* Botón principal full ancho */
  .btn-accion-principal {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
  }

  /* Pendientes */
  .header-pendientes {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .buscador-agil {
    max-width: 100%;
    width: 100%;
  }

  .item-pendiente {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .acciones-trx {
    width: 100%;
    display: flex;
    gap: 0.5rem;
  }

  .btn-aprobar,
  .btn-rechazar {
    flex: 1;
    text-align: center;
  }

  /* Código gigante más pequeño en móvil */
  .codigo-gigante {
    font-size: 1.6rem;
    letter-spacing: 1px;
  }

  /* Calculadora vuelto compacta */
  .calculadora-vuelto {
    padding: 0.8rem;
  }

  /* Chip cliente */
  .cliente-chip {
    flex-wrap: nowrap;
  }
}

/* Respeta la preferencia de movimiento reducido */
@media (prefers-reduced-motion: reduce) {
  .anim-fade,
  .spin {
    animation: none !important;
  }
  .tab-btn,
  .btn-metodo,
  .btn-ubicacion,
  .btn-accion-principal,
  .item-pendiente,
  .resultado-item {
    transition: none;
  }
  .tab-btn:hover,
  .btn-metodo:hover,
  .btn-ubicacion:hover,
  .btn-accion-principal:hover:not(:disabled),
  .item-pendiente:hover {
    transform: none;
  }
}
.cajero-saldo-cli { margin: 8px 0 0; font-size: 0.85rem; color: var(--texto-secundario); }
.cajero-saldo-cli b { color: var(--color-exito); }

/* Retiros del cajero */
.tab-badge { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 6px; border-radius: 9px; background: var(--color-error, #ef4444); color: #fff; font-size: 0.68rem; font-weight: 800; }
.retiros-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.retiros-filtros { display: flex; gap: 6px; }
.retiro-filtro { padding: 6px 12px; border: 1px solid var(--borde-sutil); border-radius: 9px; background: transparent; color: var(--texto-secundario); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.retiro-filtro.activo { border-color: var(--color-primario); color: var(--color-primario); background: color-mix(in srgb, var(--color-primario) 12%, transparent); }
.retiros-vacio { color: var(--texto-secundario); text-align: center; padding: 20px; }
.retiro-card { border: 1px solid var(--borde-sutil); border-radius: 14px; padding: 14px; margin-bottom: 12px; background: var(--fondo-tarjeta-alt, rgba(255,255,255,.02)); }
/* Identidad del solicitante: foto + datos */
.retiro-cliente { display: flex; align-items: center; gap: 10px; min-width: 0; }
.retiro-avatar {
  flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: rgba(168,85,247,0.12); border: 1px solid var(--borde-sutil); color: var(--morado-hover);
}
.retiro-avatar img { width: 100%; height: 100%; object-fit: cover; }
/* El QR que envió el cliente (y el comprobante del cajero): miniatura tocable */
.retiro-qr-thumb {
  display: inline-flex; align-items: center; gap: 10px; margin: 8px 0;
  padding: 8px 12px 8px 8px; border-radius: var(--radio-md); cursor: zoom-in;
  background: #fff; border: 1px solid var(--borde-sutil); color: #1a1030; font-weight: 700; font-size: 0.78rem;
}
.retiro-qr-thumb img { width: 58px; height: 58px; object-fit: contain; image-rendering: pixelated; }
/* Comprobante del depósito (pago por QR) */
.retiro-comp { margin: 10px 0; }
.retiro-comp-lbl { font-size: 0.82rem; color: var(--texto-secundario); margin-bottom: 8px; }
.retiro-comp-ok { display: inline-flex; align-items: center; gap: 7px; font-size: 0.84rem; font-weight: 700; color: var(--color-exito); }
.retiro-comp-quitar { background: none; border: none; color: var(--texto-secundario); font-size: 0.76rem; cursor: pointer; text-decoration: underline; }
.retiro-rechazado { font-size: 0.84rem; color: var(--color-error); margin-top: 6px; }
/* Visor de imagen ampliada */
.img-ampliada { position: relative; max-width: min(92vw, 560px); }
.img-ampliada img { width: 100%; border-radius: var(--radio-lg); background: #fff; }
.retiro-card-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.retiro-card-cab strong { display: block; color: var(--texto-principal); }
.retiro-tel { font-size: 0.78rem; color: var(--texto-secundario); }
.retiro-saldo-chip { font-size: 0.8rem; font-weight: 800; color: var(--color-exito); background: rgba(34,197,94,.12); padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
.retiro-metodo-txt { font-size: 0.82rem; color: var(--texto-secundario); margin: 8px 0 0; }
.retiro-msg { font-size: 0.82rem; color: var(--texto-principal); margin: 6px 0 0; font-style: italic; }
.retiro-ver-qr { display: inline-block; margin-top: 6px; font-size: 0.8rem; color: var(--color-primario); font-weight: 700; }
.retiro-montos { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.retiro-montos label { flex: 1; min-width: 130px; font-size: 0.76rem; color: var(--texto-secundario); font-weight: 700; display: flex; flex-direction: column; gap: 4px; }
.retiro-input { padding: 9px 11px; border: 1px solid var(--borde-sutil); border-radius: 9px; background: var(--fondo-input, rgba(255,255,255,.04)); color: var(--texto-principal); font-size: 1rem; font-weight: 700; }
.retiro-dif { font-size: 0.85rem; margin: 10px 0 0; color: var(--texto-secundario); }
.retiro-dif b { color: #d4a017; }
.retiro-acciones { display: flex; gap: 8px; margin-top: 12px; }
.btn-pagar-retiro { flex: 1; padding: 10px; border: none; border-radius: 10px; background: var(--gradiente-marca, linear-gradient(135deg,#8b5cf6,#ec4899)); color: #fff; font-weight: 800; cursor: pointer; }
.btn-pagar-retiro:disabled { opacity: .6; cursor: wait; }
.btn-rechazar-retiro { padding: 10px 14px; border: 1px solid rgba(239,68,68,.4); border-radius: 10px; background: rgba(239,68,68,.08); color: var(--color-error); font-weight: 700; cursor: pointer; }
.retiro-pagado { font-size: 0.82rem; color: var(--color-exito); margin: 10px 0 0; font-weight: 600; }
</style>
