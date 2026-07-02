<template>
  <div class="contenedor-billetera entrada-cine">
    <!-- Encabezado compacto -->
    <header class="hero-billetera">
      <div class="hero-billetera-contenido">
        <h1 class="titulo-principal-billetera">Mi billetera</h1>
        <p class="hero-billetera-sub">Recarga, paga con QR y sigue tus movimientos en tiempo real.</p>
      </div>
    </header>

    <div class="billetera-layout-grid">
      <!-- Columna Izquierda: Tarjeta y Acciones -->
      <div class="panel-izquierdo">
        <!-- TARJETA PRINCIPAL TYPE BILLETERA/CREDITO -->
        <div class="tarjeta-billetera hover-elevar">
          <div class="tarjeta-brillo" aria-hidden="true"></div>
          <!-- Fila Superior -->
          <div class="fila-superior">
            <div class="grupo-saldo">
              <p class="etiqueta-pequena">Saldo disponible</p>
              <p class="valor-grande"><span class="valor-moneda">Bs.</span>{{ formatoMoneda(saldo) }}</p>
            </div>
            <div class="grupo-marca">
              <img src="@/activos/imagenes/logo-euphoria.png" alt="Logotipo de Euphoria" class="img-logo" />
            </div>
          </div>

          <div class="tarjeta-media">
            <span class="chip-tarjeta" aria-hidden="true">
              <span class="chip-lineas"></span>
            </span>
            <span class="tarjeta-wordmark">Euphoria Club · Wallet</span>
          </div>

          <!-- Fila Inferior -->
          <div class="fila-inferior">
            <div class="columna-pin">
              <p class="etiqueta-pequena">PIN transaccional</p>
              <div class="pin-display-flex">
                <span class="pin-oculto-nuevo">••••</span>
                <span class="pin-estado" :class="{ 'pin-estado-activo': tienePin }">{{ tienePin ? 'Configurado' : 'Sin configurar' }}</span>
              </div>
            </div>

            <div class="columna-acciones-tarjeta">
              <button class="btn-pildora" @click="abrirModalCambiarPin" type="button">
                Cambiar PIN
              </button>
              <button class="btn-pildora btn-pildora-resaltado" @click="abrirModalRecarga" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Recargar saldo
              </button>
            </div>
          </div>
        </div>

    <!-- Acciones para Generar QRs (Pago) -->
    <p class="acciones-titulo">Pagar en barra</p>
    <div class="acciones-billetera escalonar">
      <button class="btn-abrir-recarga btn-pagar" @click="mostrarQRRapido('sin_pin')" type="button">
        <span class="qr-tile-icono">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M7 7h.01"></path>
            <path d="M17 7h.01"></path>
            <path d="M7 17h.01"></path>
            <path d="M17 17h.01"></path>
          </svg>
        </span>
        <span class="qr-tile-texto">
          <span class="qr-tile-titulo">QR público</span>
          <span class="qr-tile-sub">Cobro directo</span>
        </span>
      </button>
      <button class="btn-abrir-recarga btn-pagar btn-privado" @click="mostrarQRRapido('con_pin')" type="button">
        <span class="qr-tile-icono">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M7 7h.01"></path>
            <path d="M17 7h.01"></path>
            <path d="M7 17h.01"></path>
            <path d="M17 17h.01"></path>
            <rect x="10" y="10" width="4" height="4" rx="1" ry="1"></rect>
          </svg>
        </span>
        <span class="qr-tile-texto">
          <span class="qr-tile-titulo">QR privado</span>
          <span class="qr-tile-sub">Protegido con PIN</span>
        </span>
      </button>
    </div>

      </div> <!-- Fin Panel Izquierdo -->

      <!-- Columna Derecha: Historial -->
      <div class="panel-derecho">
        <!-- HISTORIAL RECARGAS -->
        <div class="seccion-historial">
      <div class="historial-encabezado">
        <h2>Historial de recargas</h2>
      </div>
      <div v-if="historial.length === 0" class="historial-vacio">
        <div class="icono-vacio">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <path d="M2 10h20"></path>
          </svg>
        </div>
        <p class="titulo-vacio">Aún no tienes recargas</p>
        <p class="subtitulo-vacio">Cuando recargues tu saldo, cada movimiento aparecerá aquí.</p>
      </div>
      <div v-else class="tabla-historial">
        <div class="fila-encabezado">
          <div class="columna-monto">Monto</div>
          <div class="columna-transaccion">Transacción</div>
          <div class="columna-fecha">Fecha</div>
          <div class="columna-estado">Estado</div>
          <div class="columna-acciones">Acciones</div>
        </div>
        <div v-for="recarga in historial" :key="recarga.id_recarga" class="fila-historial">
          <div class="columna-monto">Bs. {{ Number(recarga.monto || 0).toFixed(2) }}</div>
          <div class="columna-transaccion">{{ recarga.numero_transaccion }}</div>
          <div class="columna-fecha">{{ formatoFecha(recarga.fecha_solicitud) }}</div>
          <div class="columna-estado">
            <span :class="['badge', `badge-${recarga.estado}`]">
              {{ recarga.estado }}
            </span>
          </div>
          <div class="columna-acciones">
            <button class="btn-detalles" @click="mostrarDetalles(recarga)" type="button">Detalles</button>
          </div>
        </div>
      </div>
      </div> <!-- Fin Seccion Historial -->
      </div> <!-- Fin Panel Derecho -->
    </div> <!-- Fin Billetera Layout Grid -->

    <!-- MODAL CAMBIAR PIN -->
    <div v-if="modalCambiarPin" class="modal-overlay" @click.self="abrirModalCambiarPin">
      <div class="modal-cambiar-pin">
        <div class="modal-header">
          <h2>Cambiar PIN transaccional</h2>
          <button class="btn-cerrar" @click="abrirModalCambiarPin" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="campo-pin">
            <label>Nuevo PIN (4 dígitos)</label>
            <div class="input-pin-wrapper">
              <input
                v-model="nuevoPin"
                :type="mostrarNuevoPin ? 'text' : 'password'"
                placeholder="0000"
                maxlength="4"
                @keypress="soloNumeros"
                class="input-pin"
              />
              <button class="btn-ojo-input" @click="mostrarNuevoPin = !mostrarNuevoPin" type="button" title="Mostrar/ocultar PIN">
                <svg v-if="mostrarNuevoPin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              </button>
            </div>
          </div>
          <div class="campo-pin">
            <label>Confirmar PIN</label>
            <div class="input-pin-wrapper">
              <input
                v-model="confirmarPin"
                :type="mostrarConfirmarPin ? 'text' : 'password'"
                placeholder="0000"
                maxlength="4"
                @keypress="soloNumeros"
                class="input-pin"
              />
              <button class="btn-ojo-input" @click="mostrarConfirmarPin = !mostrarConfirmarPin" type="button" title="Mostrar/ocultar PIN">
                <svg v-if="mostrarConfirmarPin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              </button>
            </div>
          </div>
          <p v-if="errorPin" class="error-mensaje">{{ errorPin }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" @click="abrirModalCambiarPin" type="button">Cancelar</button>
          <button class="btn-guardar" @click="guardarPin" :disabled="!puedoGuardarPin" type="button">
            Guardar PIN
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL RECARGAR SALDO -->
    <div v-if="modalRecarga" class="modal-overlay" @click.self="abrirModalRecarga">
      <div class="modal-recarga">
        <div class="modal-header">
          <h2>Recargar saldo</h2>
          <button class="btn-cerrar" @click="abrirModalRecarga" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <!-- QR Predeterminado -->
          <div class="info-recarga-paso"><span class="num-paso">1</span> Escanea el QR para transferir</div>
          <div class="subseccion-qr-predeterminado">
            <div class="contenedor-qr-default">
              <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="Código QR para transferir el pago a Euphoria" class="qr-imagen" />
              <button class="btn-ampliar-qr" @click="ampliarQRDefault" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                Ver grande
              </button>
            </div>
          </div>

          <!-- Monto Input -->
          <div class="info-recarga-paso"><span class="num-paso">2</span> Ingresa el monto transferido</div>
          <div class="campo-monto">
            <div class="input-monto" :class="{ 'input-monto-error': errorMonto, 'input-monto-valido': montoIngresado >= 10 && !errorMonto }">
              <span class="prefijo">Bs.</span>
              <input
                v-model.number="montoIngresado"
                type="number"
                placeholder="50"
                min="10"
                max="100000"
                step="0.01"
                @blur="validarMonto"
                class="input-field"
              />
              <svg v-if="montoIngresado >= 10 && !errorMonto" class="icono-check-valido" width="24" height="24" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <p v-if="errorMonto" class="error-mensaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMonto }}
            </p>
          </div>

          <!-- Subir Comprobante -->
          <div class="info-recarga-paso"><span class="num-paso">3</span> Sube tu comprobante para validarlo</div>
          <div class="campo-comprobante">
            <div class="zona-carga" @click="triggerUpload">
              <svg v-if="!archivoComprobante" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p v-if="!archivoComprobante">Haz clic para buscar una imagen</p>
              
              <div v-else class="vista-previa-comprobante" @click.stop>
                <div class="info-archivo">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="stroke: var(--morado-brillante)" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span class="nombre-archivo">{{ archivoComprobante.name }}</span>
                </div>
                <button class="btn-eliminar-archivo" @click.stop="limpiarArchivo" type="button" title="Eliminar archivo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <input
              ref="inputFile"
              type="file"
              accept="image/*"
              @change="cargarComprobante"
              class="input-file-hidden"
            />

            <!-- OCR Processing -->
            <div v-if="procesandoOCR" class="estado-ocr">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
              <p>Validando comprobante...</p>
            </div>
            <p v-if="ocrExitoso" class="exito-mensaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Comprobante validado correctamente
            </p>
            <p v-if="errorOCR" class="warning-mensaje">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {{ errorOCR }}
            </p>
          </div>

          <!-- Fin Subir Comprobante -->
        </div>
      </div>
    </div>

    <!-- Ya no se usa el MODAL CÓDIGOS QR GENERADOS (Grid) -->

    <!-- MODAL AMPLIAR QR -->
    <div v-if="qrAmpliado" class="modal-overlay" @click.self="qrAmpliado = null">
      <div class="modal-qr-ampliado">
        <button class="btn-cerrar" @click="qrAmpliado = null" type="button" style="position:absolute; top: 1rem; right: 1rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div v-if="qrAmpliado === 'sin_pin'" class="contenedor-qr-identificador">
          <img :src="datosQR.qr_sin_pin.imagen" alt="Código QR de pago público ampliado" class="qr-modal-imagen" />
          <p class="qr-identificador">ID: {{ datosQR.qr_sin_pin.identificador }}</p>
        </div>
        <div v-else-if="qrAmpliado === 'con_pin'" class="contenedor-qr-identificador">
          <img :src="datosQR.qr_con_pin.imagen" alt="Código QR de pago privado ampliado" class="qr-modal-imagen" />
          <p class="qr-identificador">ID: {{ datosQR.qr_con_pin.identificador }}</p>
        </div>
        <img v-else src="@/activos/imagenes/QRPago euphoria.jpeg" alt="Código QR de pago a Euphoria ampliado" class="qr-modal-imagen" />
      </div>
    </div>

    <!-- MODAL DETALLES DE TRANSACCIÓN -->
    <div v-if="recargaSeleccionada" class="modal-overlay" @click.self="recargaSeleccionada = null">
      <div class="modal-detalles">
        <div class="modal-header">
          <h2>Detalle de recarga</h2>
          <button class="btn-cerrar" @click="recargaSeleccionada = null" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detalle-fila"><strong>Estado</strong> <span :class="['badge', `badge-${recargaSeleccionada.estado}`]">{{ recargaSeleccionada.estado }}</span></div>
          <div class="detalle-fila"><strong>Monto</strong> Bs. {{ Number(recargaSeleccionada.monto || 0).toFixed(2) }}</div>
          <div class="detalle-fila"><strong>ID de transacción OCR</strong> <span class="texto-resaltado">{{ recargaSeleccionada.numero_transaccion }}</span></div>
          <div class="detalle-fila"><strong>Fecha de solicitud</strong> {{ formatoFecha(recargaSeleccionada.fecha_solicitud) }}</div>
          <div class="detalle-fila"><strong>Fecha de confirmación</strong> {{ recargaSeleccionada.fecha_confirmacion ? formatoFecha(recargaSeleccionada.fecha_confirmacion) : 'No confirmada' }}</div>
        </div>
      </div>
    </div>

    <!-- MODAL ÉXITO -->
    <div v-if="modalExito" class="modal-overlay" @click.self="modalExito = false">
      <div class="modal-detalles modal-exito">
        <div class="icono-exito">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 style="color: white; margin-top: 1rem;">Recarga completada</h2>
        <p style="color: var(--texto-secundario); margin: 1rem 0;">{{ mensajeExito }}</p>
        <button class="btn-pildora" @click="modalExito = false" type="button" style="margin-top: 1rem; width: 100%;">
          Entendido
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import clienteHttp from '@/servicios-api/cliente-http.js'

const tienda = useTiendaAutenticacion()
const usuario = computed(() => tienda.usuario?.nombre || 'Cliente')

// Estado billetera
const saldo = ref(0)
// Nunca guardamos ni mostramos el PIN en claro. Solo reflejamos si existe.
const tienePin = ref(false)
const historial = ref([])
const modalExito = ref(false)
const mensajeExito = ref('')
let socketBilletera = null

// Modal cambiar PIN
const modalCambiarPin = ref(false)
const nuevoPin = ref('')
const confirmarPin = ref('')
const errorPin = ref('')
const mostrarNuevoPin = ref(false)
const mostrarConfirmarPin = ref(false)

// Modal Recargar
const modalRecarga = ref(false)
const montoIngresado = ref('')
const errorMonto = ref('')
const archivoComprobante = ref(null)
const procesandoOCR = ref(false)
const comprobanteProcesado = ref(false)
const ocrExitoso = ref(false)
const errorOCR = ref('')
const inputFile = ref(null)
const urlComprobanteGenerado = ref('')

function triggerUpload() {
  if (inputFile.value) {
    inputFile.value.click()
  }
}

const recargaSeleccionada = ref(null)

function mostrarDetalles(recarga) {
  recargaSeleccionada.value = recarga
}

// QR
const qrAmpliado = ref(null)
const datosQR = ref({
  qr_sin_pin: { identificador: '', imagen: '' },
  qr_con_pin: { identificador: '', imagen: '' }
})

// Abrir Modal Recarga
function abrirModalRecarga() {
  modalRecarga.value = !modalRecarga.value
  if (!modalRecarga.value) {
    limpiarFormularioRecarga()
  }
}

function limpiarFormularioRecarga() {
  montoIngresado.value = ''
  errorMonto.value = ''
  archivoComprobante.value = null
  comprobanteProcesado.value = false
  ocrExitoso.value = false
  errorOCR.value = ''
}

function cerrarQRGeneradoModal() {
  qrGeneradoModal.value = false
  abrirModalRecarga() // Cierra el de recarga tambien
  cargarHistorial()
}

// Validar monto
function validarMonto() {
  errorMonto.value = ''
  if (!montoIngresado.value) return

  let monto = parseFloat(montoIngresado.value)
  if (isNaN(monto)) {
    errorMonto.value = 'Debe ser un número válido'
    return
  }
  if (monto < 10) {
    errorMonto.value = 'Mínimo Bs. 10'
    return
  }
  if (monto > 100000) {
    errorMonto.value = 'Máximo Bs. 100,000'
    return
  }

  // Mantener montoIngresado siempre como número (v-model.number). El formateo con
  // dos decimales es solo para presentación, no se reasigna al modelo.
  montoIngresado.value = Math.floor(monto * 100) / 100
}

// Validar entrada de PIN (solo números)
function soloNumeros(e) {
  if (!/[0-9]/.test(e.key)) {
    e.preventDefault()
  }
}

// Abrir/cerrar modal cambiar PIN
function abrirModalCambiarPin() {
  modalCambiarPin.value = !modalCambiarPin.value
  if (!modalCambiarPin.value) {
    nuevoPin.value = ''
    confirmarPin.value = ''
    errorPin.value = ''
  }
}

// Validar y guardar PIN
const puedoGuardarPin = computed(() => {
  if (!nuevoPin.value || !confirmarPin.value) return false
  if (nuevoPin.value.length !== 4 || confirmarPin.value.length !== 4) return false
  if (!/^\d+$/.test(nuevoPin.value)) return false
  if (nuevoPin.value !== confirmarPin.value) {
    errorPin.value = 'Los PINs no coinciden'
    return false
  }
  errorPin.value = ''
  return true
})

async function guardarPin() {
  if (!puedoGuardarPin.value) return
  
  try {
    await servicioBilletera.actualizarPin(nuevoPin.value)
    // No persistimos el PIN en claro; solo marcamos que ya existe uno configurado.
    tienePin.value = true
    abrirModalCambiarPin()
    
    // Mostrar modal de éxito
    mensajeExito.value = 'Tu PIN transaccional ha sido actualizado con éxito.'
    modalExito.value = true
  } catch (error) {
    errorPin.value = error.error || 'Error al guardar el PIN en el servidor'
    console.error(error)
  }
}

// Cargar comprobante
function cargarComprobante(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorOCR.value = 'Solo se aceptan imágenes'
    return
  }

  // Forzar la validación del monto aunque el usuario no haya salido del input (@blur)
  validarMonto()

  if(!montoIngresado.value || errorMonto.value) {
    errorOCR.value = 'Ingresa un monto válido primero'
    return
  }

  archivoComprobante.value = file
  procesarOCR(file)
}

// Limpiar el archivo subido si hubo un error o seleccionó mal
function limpiarArchivo() {
  archivoComprobante.value = null
  comprobanteProcesado.value = false
  ocrExitoso.value = false
  errorOCR.value = ''
  if (inputFile.value) {
    inputFile.value.value = ''
  }
}

// Procesar OCR (simulado como antes, integrando la interfaz)
async function procesarOCR(file) {
  procesandoOCR.value = true
  errorOCR.value = ''
  ocrExitoso.value = false

  try {
    const formData = new FormData()
    formData.append('comprobante', file)
    formData.append('monto_esperado', montoIngresado.value)

    const res = await clienteHttp.post('/comandas/validar-comprobante', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.valido) {
      ocrExitoso.value = true
      comprobanteProcesado.value = true
      urlComprobanteGenerado.value = res.url_comprobante
      procesandoOCR.value = false // Liberar flag antes de llamar a completar

      // Llamar a completar recarga automáticamente tras validación exitosa
      await completarRecarga()
    } else {
      // El backend respondió 200 pero el comprobante no es válido (ilegible o monto no coincide).
      // limpiarArchivo() resetea errorOCR, por eso se asigna el mensaje después.
      limpiarArchivo()
      errorOCR.value = res.mensaje || res.error || 'El comprobante no pudo validarse. Verifica el monto e inténtalo de nuevo.'
    }
  } catch (error) {
    console.error('Error en OCR:', error)
    errorOCR.value = error.response?.data?.error || error.error || 'No se pudo validar el comprobante mediante IA'
  } finally {
    procesandoOCR.value = false
  }
}

// Validar si puede recargar
const puedeRecargar = computed(() => {
  return (
    montoIngresado.value >= 10 &&
    montoIngresado.value <= 100000 &&
    archivoComprobante.value &&
    ocrExitoso.value &&
    !procesandoOCR.value
  )
})

// Completar Recarga Directa
async function completarRecarga() {
  if (!puedeRecargar.value) return

  try {
    const res = await servicioBilletera.iniciarRecarga(parseFloat(montoIngresado.value), urlComprobanteGenerado.value)
    saldo.value = res.saldo_nuevo
    await cargarHistorial()
    modalRecarga.value = false
    
    // Mostrar modal en vez de alert
    mensajeExito.value = `Tu nuevo saldo es Bs. ${res.saldo_nuevo.toFixed(2)}`
    modalExito.value = true
  } catch (error) {
    errorMonto.value = 'Error al completar la recarga.'
    console.error(error)
  }
}

// Mostrar QR Rápido (Pago)
async function mostrarQRRapido(tipo) {
  try {
    const res = await servicioBilletera.generarQRsPago()

    // Mostrar el identificador real (qr_publico) sin acortarlo ni alterarlo:
    // es el valor exacto que el cajero busca en la BD, cualquier transformación rompe el match.
    datosQR.value = res
    qrAmpliado.value = tipo
  } catch (error) {
    console.error('Error generando QRs:', error)
    alert('Error al generar los QRs de pago')
  }
}

function ampliarQR(tipo) {
  qrAmpliado.value = tipo
}

function ampliarQRDefault() {
  qrAmpliado.value = 'default'
}

// Cargar saldo
async function cargarSaldo() {
  try {
    const res = await servicioBilletera.obtenerSaldo()
    saldo.value = res.saldo_actual || 0
    // Requiere que el backend exponga el flag booleano tiene_pin en GET /saldo.
    if (res.tiene_pin !== undefined) {
      tienePin.value = !!res.tiene_pin
    }
  } catch (error) {
    console.error('Error cargando saldo:', error)
  }
}

// Cargar historial
async function cargarHistorial() {
  try {
    const res = await servicioBilletera.obtenerHistorial()
    historial.value = res || []
  } catch (error) {
    console.error('Error cargando historial:', error)
  }
}

// Formato moneda
function formatoMoneda(valor) {
  return parseFloat(valor).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Formato fecha
function formatoFecha(fecha) {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-BO')
}

onMounted(async () => {
  await cargarSaldo()
  await cargarHistorial()

  // Conectar WebSocket para sincronización en tiempo real
  socketBilletera = io() // Por defecto usa el mismo host/puerto y la ruta de vite se encarga del proxy
  
  socketBilletera.on('billetera_actualizada', async (datos) => {
    if (datos.id_usuario === tienda.usuario?.id) {
      saldo.value = datos.saldo_nuevo
      await cargarHistorial()
    }
  })
})

onUnmounted(() => {
  if (socketBilletera) {
    socketBilletera.disconnect()
  }
})
</script>

<style scoped>
/* Alias locales mapeados a la paleta global Euphoria (variables.css).
   Se definen en el contenedor raiz para que hereden a todos los hijos. */
.contenedor-billetera {
  --azul-profundo:   var(--rosa-acento);
  --verde-fresco:    var(--color-exito);
  --rojo-suave:      var(--color-error);
  --rojo-coral:      var(--color-error);
  --fondo-principal: var(--fondo-app);
  --borde-color:     var(--borde-sutil);
}

.contenedor-billetera {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  padding-top: 2rem;
  padding-bottom: 96px;
}

.billetera-layout-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
}

/* Tablet: dos columnas (tarjeta + historial) para aprovechar el ancho */
@media (min-width: 640px) {
  .billetera-layout-grid {
    grid-template-columns: minmax(320px, 400px) 1fr;
    gap: 2rem;
  }
}
@media (min-width: 1024px) {
  .billetera-layout-grid {
    grid-template-columns: 420px 1fr;
    gap: 3rem;
  }
}
/* El historial se adapta segun el ancho de SU columna (no del viewport) */
.panel-derecho { container-type: inline-size; }

/* Encabezado compacto (sin eyebrow ni degradado: menos ruido, mas profesional) */
.hero-billetera {
  position: relative;
  margin-bottom: 1.35rem;
  padding: 0.25rem 0.15rem 0;
}

.orbe-hero-a {
  width: 300px;
  height: 300px;
  top: -160px;
  left: -80px;
}

.orbe-hero-b {
  width: 240px;
  height: 240px;
  top: -120px;
  right: -60px;
  opacity: 0.28;
}

.hero-billetera-contenido {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  max-width: 640px;
}

.titulo-principal-billetera {
  color: var(--texto-principal);
  margin: 0;
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 1.65rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-wrap: balance;
}

.hero-billetera-sub {
  margin: 0.3rem 0 0;
  color: var(--texto-secundario);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 52ch;
  text-wrap: pretty;
}

@media (max-width: 600px) {
  .hero-billetera { margin-bottom: 1.15rem; }
}

/* TARJETA BILLETERA */
.tarjeta-billetera {
  position: relative;
  isolation: isolate;
  width: 100%;
  padding: 2rem 2.25rem 2.25rem;
  border-radius: 26px;
  background:
    radial-gradient(130% 120% at 100% 0%, rgba(236,72,153,0.42), transparent 55%),
    radial-gradient(120% 120% at 0% 100%, rgba(139,92,246,0.55), transparent 60%),
    linear-gradient(150deg, #2a1268 0%, #4a1f9e 42%, #7b2fb8 72%, #b83a8f 100%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 30px 70px -20px rgba(120, 30, 140, 0.7),
    0 10px 26px rgba(19, 6, 48, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  overflow: hidden;
  /* Mantiene proporción de tarjeta: no se estira a full-width dejando huecos.
     Se centra en su columna; en desktop (grid 2-col) la columna ya es angosta. */
  max-width: 460px;
  margin: 0 auto 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

/* Halo perimetral sutil bajo la tarjeta */
.tarjeta-billetera::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  box-shadow: inset 0 -40px 70px -30px rgba(0, 0, 0, 0.5);
}

/* Sheen diagonal que cruza la tarjeta */
.tarjeta-brillo {
  position: absolute;
  top: -60%;
  left: -30%;
  width: 55%;
  height: 220%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0.08) 55%, transparent 100%);
  transform: rotate(8deg) translateX(-30%);
  filter: blur(2px);
  transition: transform 1.1s var(--ease-cine);
}

.tarjeta-billetera:hover .tarjeta-brillo {
  transform: rotate(8deg) translateX(360%);
}

.tarjeta-billetera > *:not(.tarjeta-brillo) {
  position: relative;
  z-index: 2;
}

/* Chip + wordmark central */
.tarjeta-media {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.chip-tarjeta {
  position: relative;
  width: 44px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(150deg, #f7e08a 0%, #d9b24a 45%, #b8862b 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.35);
  flex-shrink: 0;
  overflow: hidden;
}

.chip-lineas {
  position: absolute;
  inset: 6px 8px;
  border-radius: 3px;
  background:
    linear-gradient(to right, transparent 45%, rgba(120,80,10,0.55) 45%, rgba(120,80,10,0.55) 55%, transparent 55%),
    linear-gradient(to bottom, transparent 45%, rgba(120,80,10,0.55) 45%, rgba(120,80,10,0.55) 55%, transparent 55%);
  border: 1px solid rgba(120,80,10,0.4);
}

.tarjeta-wordmark {
  font-family: var(--fuente-titulo);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.7);
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta-billetera:hover .tarjeta-brillo { transform: rotate(8deg) translateX(-30%); }
}

.fila-superior {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 1;
}

.grupo-saldo {
  display: flex;
  flex-direction: column;
}

.grupo-marca {
  display: flex;
  align-items: flex-start;
}

.img-logo {
  height: 28px;
  width: auto;
  opacity: 0.9;
}

.espaciador-tarjeta {
  height: 4rem;
}

.fila-inferior {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 1;
  gap: 1.5rem;
}

.columna-pin {
  display: flex;
  flex-direction: column;
}

.pin-display-flex {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.pin-valor, .pin-oculto-nuevo {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 4px;
  color: white;
}

.pin-oculto-nuevo {
  letter-spacing: 6px;
  margin-top: 5px;
}

.pin-estado {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.02em;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radio-full);
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.18);
  white-space: nowrap;
}

.pin-estado-activo {
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(34, 197, 94, 0.45);
  color: #bbf7d0;
}

.btn-ojo-nuevo {
  background: none;
  border: none;
  color: var(--texto-secundario);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.btn-ojo-nuevo:hover {
  opacity: 1;
}

.columna-acciones-tarjeta {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-end;
}

.btn-pildora {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  padding: 0.5rem 1.2rem;
  border-radius: var(--radio-full);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: var(--trans-normal);
  backdrop-filter: blur(5px);
  width: 100%;
  justify-content: center;
}

.btn-pildora:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.btn-pildora:active {
  transform: translateY(0) scale(0.98);
}

.btn-pildora:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 2px;
}

.btn-pildora-resaltado {
  background: rgba(255, 255, 255, 0.95);
  color: var(--morado-medio);
  border-color: transparent;
  font-weight: 700;
}
.btn-pildora-resaltado:hover {
  background: #fff;
  box-shadow: 0 6px 18px rgba(19, 6, 48, 0.35);
}

.etiqueta-pequena {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: 0 0 0.4rem 0;
}

.valor-grande {
  font-family: var(--fuente-titulo);
  font-size: clamp(2.6rem, 8vw, 3.3rem);
  font-weight: 800;
  color: white;
  margin: 0;
  letter-spacing: -0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 20px rgba(19, 6, 48, 0.45);
}

.valor-moneda {
  font-size: 0.42em;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(255,255,255,0.78);
  margin-right: 0.4rem;
  vertical-align: 0.5em;
}

/* RESPONSIVIDAD TARJETA */
@media (max-width: 900px) {
  .tarjeta-billetera { padding: 2rem; }
  .valor-grande { font-size: 2.4rem; }
  .espaciador-tarjeta { height: 3rem; }
}

@media (max-width: 600px) {
  .tarjeta-billetera { padding: 1.2rem; }
  .valor-grande { font-size: 2rem; }
  .espaciador-tarjeta { height: 1rem; } /* Minimizar espacio en el centro */
  
  /* Mantener en la misma fila para no desperdiciar la esquina inferior derecha */
  .fila-inferior { flex-direction: row; align-items: flex-end; gap: 0.5rem; }
  
  /* Reducir tamaño de botones para que quepan bien al lado del PIN */
  .columna-acciones-tarjeta { width: auto; align-items: flex-end; }
  .btn-pildora { font-size: 0.8rem; padding: 0.5rem 0.8rem; }
}

/* ACCIONES BILLETERA (PAGOS) */
.acciones-titulo {
  font-family: var(--fuente-titulo);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--texto-secundario);
  margin: 0 0 0.85rem 0;
  padding-left: 0.15rem;
}

.acciones-billetera {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  margin: 0 auto 1.5rem;
  max-width: 460px;
}
/* La etiqueta "Pagar en barra" también alineada con la tarjeta */
.acciones-titulo { max-width: 460px; margin-left: auto; margin-right: auto; }

.btn-abrir-recarga {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: linear-gradient(155deg, var(--fondo-tarjeta-alt), var(--fondo-tarjeta));
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  padding: 1rem 1.1rem;
  border-radius: var(--radio-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: transform 0.3s var(--ease-cine), box-shadow 0.3s var(--ease-cine), border-color 0.3s ease;
}

.qr-tile-icono {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-md);
  color: #fff;
  background: rgba(168, 85, 247, 0.16);
  border: 1px solid var(--glass-borde);
  transition: transform 0.3s var(--ease-cine), background 0.3s ease;
}

.qr-tile-texto {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.qr-tile-titulo {
  font-family: var(--fuente-titulo);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}

.qr-tile-sub {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--texto-secundario);
}

.btn-privado .qr-tile-icono {
  background: rgba(236, 72, 153, 0.16);
  border-color: rgba(236, 72, 153, 0.4);
}

.btn-abrir-recarga:hover {
  transform: translateY(-3px);
  border-color: var(--borde-activo);
  box-shadow: 0 16px 34px -14px rgba(168, 85, 247, 0.6), inset 0 1px 0 rgba(255,255,255,0.08);
}

.btn-abrir-recarga:hover .qr-tile-icono {
  transform: scale(1.06);
  background: rgba(168, 85, 247, 0.28);
}

.btn-privado:hover {
  box-shadow: 0 16px 34px -14px rgba(236, 72, 153, 0.6), inset 0 1px 0 rgba(255,255,255,0.08);
}

.btn-privado:hover .qr-tile-icono {
  background: rgba(236, 72, 153, 0.3);
}

.btn-abrir-recarga:active {
  transform: translateY(0) scale(0.98);
}

.btn-abrir-recarga:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

@media (max-width: 420px) {
  .acciones-billetera { grid-template-columns: 1fr; }
}

/* MODALES GLOBALES */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-cambiar-pin,
.modal-recarga,
.modal-detalles {
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(236,72,153,0.14), transparent 55%),
    linear-gradient(165deg, rgba(36, 21, 86, 0.96), rgba(20, 10, 46, 0.97));
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl);
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 30px 80px rgba(7, 3, 20, 0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 30px rgba(168, 85, 247, 0.28);
  animation: modalAparece 0.28s var(--ease-suave) both;
}

@keyframes modalAparece {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .modal-cambiar-pin,
  .modal-recarga,
  .modal-detalles { animation: none; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
  color: var(--texto-principal);
  font-size: 1.3rem;
}

.btn-cerrar {
  background: none;
  border: none;
  color: var(--texto-secundario);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--trans-normal);
}

.btn-cerrar:hover {
  color: var(--texto-principal);
  background: rgba(255, 255, 255, 0.08);
}

.btn-cerrar:active {
  transform: scale(0.92);
}

.btn-cerrar:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.modal-body {
  margin-bottom: 1.5rem;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 1rem;
}

.btn-cancelar,
.btn-guardar {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-cancelar {
  background: rgba(255,255,255,0.05);
  color: var(--texto-principal);
}

.btn-cancelar:hover {
  background: rgba(255,255,255,0.1);
}

.btn-guardar {
  background: linear-gradient(135deg, var(--morado-brillante), var(--azul-profundo));
  color: white;
}

.btn-guardar:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(168, 85, 247, 0.35);
}

.btn-guardar:active:not(:disabled),
.btn-cancelar:active {
  transform: translateY(0) scale(0.98);
}

.btn-guardar:focus-visible,
.btn-cancelar:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.btn-guardar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* CAMBIO PIN */
.campo-pin {
  margin-bottom: 1.5rem;
}

.campo-pin label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--texto-secundario);
  font-size: 0.9rem;
  font-weight: 600;
}

.input-pin-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-pin {
  width: 100%;
  padding: 1rem;
  padding-right: 3rem;
  background: var(--fondo-principal);
  border: 1px solid var(--borde-color);
  border-radius: 8px;
  color: var(--texto-principal);
  font-size: 1.5rem;
  letter-spacing: 4px;
  text-align: center;
  transition: border-color 0.3s;
}

.btn-ojo-input {
  position: relative;
  right: 10px;
  background: none;
  border: none;
  color: var(--texto-secundario);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-ojo-input:hover {
  color: var(--texto-principal);
}

.info-recarga-paso {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  color: var(--texto-principal);
  margin-bottom: 0.6rem;
  font-size: 0.95rem;
  letter-spacing: 0;
}

.num-paso {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(168, 85, 247, 0.35);
}

.input-pin:focus {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.18);
}

/* Ajuste de inputs de PIN en pantallas muy pequeñas */
@media (max-width: 480px) {
  .modal-cambiar-pin,
  .modal-recarga {
    padding: 1.25rem;
    width: 94%;
  }
  .input-pin {
    font-size: 1.25rem;
    letter-spacing: 3px;
    padding: 0.85rem;
    padding-right: 2.75rem;
  }
}

/* RECARGA */
.subseccion-qr-predeterminado {
  background: var(--fondo-principal);
  border: 1px solid var(--borde-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.qr-acciones-lado {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.qr-texto-ayuda {
  margin: 0;
  font-size: 0.9rem;
  color: var(--texto-secundario);
}

.contenedor-qr-default {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.qr-imagen {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  background: white;
  padding: 5px;
}

.btn-ampliar-qr {
  background: transparent;
  border: 1px solid var(--borde-color);
  color: var(--texto-principal);
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-ampliar-qr:hover {
  background: rgba(255,255,255,0.05);
}

.campo-monto,
.campo-comprobante {
  background: var(--fondo-principal);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.campo-monto label,
.campo-comprobante label {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--texto-principal);
  font-weight: 600;
}

.input-monto {
  display: flex;
  align-items: center;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-color);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color var(--trans-normal), box-shadow var(--trans-normal);
}

.input-monto:focus-within {
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.18);
}

.prefijo {
  padding: 0 1rem;
  color: var(--texto-secundario);
  font-weight: 600;
}

.input-field {
  flex: 1;
  background: none;
  border: none;
  color: var(--texto-principal);
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
}

.input-field:focus {
  outline: none;
}

.error-mensaje,
.exito-mensaje {
  margin: 0.5rem 0 0 0;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.error-mensaje {
  color: var(--rojo-suave);
}

.exito-mensaje {
  color: var(--verde-fresco);
}

.zona-carga {
  background: var(--fondo-tarjeta);
  border: 2px dashed var(--borde-color);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.zona-carga:hover {
  border-color: var(--morado-brillante);
  background: rgba(157, 78, 221, 0.08);
}

.zona-carga:active {
  transform: scale(0.995);
}

.zona-carga svg {
  color: var(--texto-secundario);
}

.zona-carga p {
  margin: 0;
  color: var(--texto-secundario);
  font-size: 0.9rem;
}

.nombre-archivo {
  color: var(--verde-fresco) !important;
  font-weight: 600;
}

.input-file-hidden {
  display: none;
}

.estado-ocr {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(157, 78, 221, 0.1);
  border: 1px solid var(--morado-brillante);
  border-radius: 8px;
  padding: 1rem;
  color: var(--texto-principal);
  margin-top: 1rem;
  font-size: 0.9rem;
}

.spin {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.seccion-generar {
  margin-top: 1.5rem;
}

.descripcion-qr {
  color: var(--texto-secundario);
  font-size: 0.9rem;
  margin-bottom: 0.8rem;
}

.btn-generar-qr {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--morado-brillante), var(--azul-profundo));
  border: none;
  color: white;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-generar-qr:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(157, 78, 221, 0.4);
}

.btn-generar-qr:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* MODAL QR GENERADOS */
.modal-qr-generados {
  max-width: 600px;
}

.grid-qr {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.tarjeta-qr {
  background: var(--fondo-principal);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-titulo {
  margin: 0 0 1rem 0;
  color: var(--texto-principal);
  font-weight: 600;
}

.qr-imagen-grande {
  width: 100%;
  max-width: 180px;
  height: auto;
  background: white;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.pin-badge {
  background: rgba(6, 214, 160, 0.1);
  border: 1px solid rgba(6, 214, 160, 0.3);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
}

.pin-etiqueta {
  color: var(--texto-secundario);
  margin-right: 0.5rem;
}

.pin-codigo {
  color: var(--verde-fresco);
  font-weight: 700;
  letter-spacing: 2px;
}

.espacio-pin {
  height: 42px; /* same height as pin-badge roughly */
  margin-bottom: 1rem;
}

.qr-descripcion {
  color: var(--texto-secundario);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  flex: 1;
}

.btn-ampliar-qr-gen {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-color);
  color: var(--texto-principal);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.btn-ampliar-qr-gen:hover {
  background: rgba(255,255,255,0.05);
}

.modal-qr-ampliado {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.qr-modal-imagen {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 12px;
}

.btn-detalles {
  background: rgba(168,85,247,0.1);
  color: var(--morado-hover);
  border: 1px solid var(--borde-activo);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radio-full);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: var(--trans-normal);
}
.btn-detalles:hover {
  background: var(--gradiente-marca);
  border-color: transparent;
  color: white;
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.3);
}

.btn-detalles:active {
  transform: scale(0.96);
}

.btn-detalles:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.columna-acciones {
  flex: 1;
  text-align: right;
}

/* DETALLES TRANSACCIÓN */
.modal-detalles {
  width: 90%;
  max-width: 420px;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(236,72,153,0.12), transparent 55%),
    linear-gradient(165deg, rgba(36, 21, 86, 0.96), rgba(20, 10, 46, 0.97));
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl);
  box-shadow: 0 30px 80px rgba(7, 3, 20, 0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 30px rgba(168, 85, 247, 0.22);
  display: flex;
  flex-direction: column;
}

.modal-exito {
  text-align: center;
  padding: 2rem !important;
  align-items: center;
}

.icono-exito {
  background: rgba(6, 214, 160, 0.1);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

@media (max-width: 600px) {
  .modal-detalles {
    padding: 1rem;
    max-height: 90vh;
    overflow-y: auto;
  }
}

.detalle-fila {
  padding: 0.8rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
  color: var(--texto-principal);
}
.detalle-fila:last-child {
  border-bottom: none;
}
.detalle-fila strong {
  color: var(--texto-secundario);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.texto-resaltado {
  background: rgba(255,255,255,0.05);
  padding: 0.3rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--morado-brillante);
}

/* HISTORIAL */
.historial-encabezado {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.7rem;
  margin-bottom: 1.4rem;
}

.seccion-historial h2 {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.5rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--texto-principal);
  text-wrap: balance;
}

.historial-vacio {
  background: var(--fondo-tarjeta);
  border: 1px dashed var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 3.5rem 2rem;
  text-align: center;
  color: var(--texto-secundario);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.icono-vacio {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  margin-bottom: 0.75rem;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--borde-sutil);
}

.titulo-vacio {
  margin: 0;
  color: var(--texto-principal);
  font-weight: 700;
  font-size: 1.05rem;
}

.subtitulo-vacio {
  margin: 0;
  font-size: 0.9rem;
  max-width: 34ch;
  line-height: 1.5;
  color: var(--texto-secundario);
  text-wrap: pretty;
}

.tabla-historial {
  background: linear-gradient(180deg, rgba(36, 21, 86, 0.55), rgba(27, 16, 64, 0.75));
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 48px rgba(10, 6, 26, 0.4);
}

.fila-encabezado {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr 1fr 0.8fr;
  gap: 1rem;
  background: rgba(168, 85, 247, 0.1);
  padding: 1rem 1.5rem;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--texto-secundario);
  border-bottom: 1px solid var(--borde-sutil);
}

.fila-historial {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr 1fr 0.8fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--borde-sutil);
  align-items: center;
  transition: background var(--trans-rapida);
}
.fila-historial:hover {
  background: rgba(168, 85, 247, 0.06);
}

.fila-historial:last-child {
  border-bottom: none;
}

/* Transformación de tabla a tarjetas según el ancho de la columna del historial */
@container (max-width: 560px) {
  .tabla-historial {
    background: transparent;
    border: none;
  }
  .fila-encabezado {
    display: none;
  }
  .fila-historial {
    display: grid;
    grid-template-columns: 1fr auto; /* Dos columnas: Izquierda contenido, Derecha badge/botón */
    grid-template-areas:
      "monto estado"
      "transaccion transaccion"
      "fecha boton";
    align-items: center;
    padding: 1rem;
    background: var(--fondo-tarjeta);
    border: 1px solid var(--borde-color);
    border-radius: 12px;
    margin-bottom: 0.8rem;
    gap: 0.5rem;
  }
  .columna-monto {
    grid-area: monto;
    font-size: 1.1rem;
    margin: 0;
  }
  .columna-estado {
    grid-area: estado;
    text-align: right;
  }
  .columna-transaccion {
    grid-area: transaccion;
    font-size: 0.8rem;
    word-break: break-all;
  }
  .columna-fecha {
    grid-area: fecha;
    font-size: 0.85rem;
  }
  .columna-acciones {
    grid-area: boton;
    text-align: right;
    margin: 0;
  }
}

.columna-monto,
.columna-transaccion,
.columna-fecha,
.columna-estado {
  color: var(--texto-secundario);
  font-size: 0.95rem;
}

.columna-monto {
  color: var(--texto-principal);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.badge-completada {
  background: rgba(6, 214, 160, 0.15);
  color: var(--color-exito);
  border: 1px solid rgba(6, 214, 160, 0.3);
}

.badge-pendiente {
  background: rgba(255, 209, 102, 0.15);
  color: var(--color-alerta);
  border: 1px solid rgba(255, 209, 102, 0.3);
}

.badge-rechazada, .badge-rechazado {
  background: rgba(239, 71, 111, 0.15);
  color: var(--color-error);
  border: 1px solid rgba(239, 71, 111, 0.3);
}

.vista-previa-comprobante {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-archivo {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  overflow: hidden;
}

.nombre-archivo {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  font-size: 0.9rem;
  color: var(--texto-principal);
}

.btn-eliminar-archivo {
  background: rgba(239, 71, 111, 0.1);
  color: var(--color-error);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-eliminar-archivo:hover {
  background: var(--color-error);
  color: white;
  transform: scale(1.1);
}

.btn-eliminar-archivo:active {
  transform: scale(0.95);
}

.btn-eliminar-archivo:focus-visible {
  outline: 2px solid var(--color-error);
  outline-offset: 2px;
}

.contenedor-qr-identificador {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.qr-modal-imagen {
  width: 90%;
  max-width: 350px;
  height: auto;
  border-radius: 12px;
  background: white;
  padding: 10px;
}

.qr-identificador {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  color: var(--texto-principal);
  font-family: monospace;
  font-size: 1.5rem;
  letter-spacing: 2px;
  margin: 0;
  font-weight: 700;
  max-width: 100%;
  text-align: center;
  word-break: break-all;
  box-sizing: border-box;
}

/* RESPONSIVIDAD MODAL QR AMPLIADO */
@media (max-width: 480px) {
  .modal-qr-ampliado {
    max-width: 94vw;
    width: 94vw;
  }
  .contenedor-qr-identificador {
    gap: 0.75rem;
    width: 100%;
  }
  .qr-modal-imagen {
    width: 100%;
    max-width: min(300px, 80vw);
    padding: 8px;
  }
  .qr-identificador {
    font-size: clamp(0.95rem, 4.5vw, 1.25rem);
    letter-spacing: 1px;
    padding: 0.7rem 1rem;
  }
}

/* Nuevos Ajustes Diseño */
.subseccion-qr-predeterminado {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.contenedor-qr-default {
  position: relative;
  display: inline-block;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.contenedor-qr-default .qr-imagen {
  display: block;
  width: 100%;
  max-width: 180px;
  height: auto;
  background: white;
  padding: 8px;
}

.btn-ampliar-qr {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(22, 33, 62, 0.85);
  border: 1px solid rgba(157, 78, 221, 0.5);
  border-radius: 20px;
  color: white;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-ampliar-qr:hover {
  background: var(--morado-brillante);
  transform: translateX(-50%) scale(1.05);
}

.btn-ampliar-qr:active {
  transform: translateX(-50%) scale(0.98);
}

.btn-ampliar-qr:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 2px;
}

.icono-check-valido {
  margin-right: 1rem;
}

.input-monto-valido {
  border-color: var(--color-exito) !important;
  box-shadow: 0 0 0 2px rgba(6, 214, 160, 0.2);
}

.input-monto-error {
  border-color: var(--color-error) !important;
  box-shadow: 0 0 0 2px rgba(239, 71, 111, 0.2);
}

.warning-mensaje {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-alerta);
  font-size: 0.85rem;
  margin-top: 0.5rem;
  background: rgba(255, 209, 102, 0.1);
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 209, 102, 0.3);
}

.badge-completado {
  background: rgba(6, 214, 160, 0.15);
  color: var(--verde-fresco);
}

.badge-pendiente {
  background: rgba(255, 193, 7, 0.15);
  color: var(--color-alerta);
}

.badge-rechazado {
  background: rgba(239, 71, 111, 0.15);
  color: var(--rojo-suave);
}

@media (max-width: 768px) {
  .tarjeta-billetera {
    height: auto;
    padding: 1.5rem;
    min-height: 220px;
  }
  
  .seccion-monto {
    position: static;
    transform: none;
    margin: 1.5rem 0;
    text-align: left;
  }
  
  .seccion-pin-tarjeta {
    position: static;
  }
  
  .btn-cambiar-pin {
    position: static;
    width: 100%;
    margin-top: 1rem;
  }
  
  .grid-qr {
    grid-template-columns: 1fr;
  }
}
</style>
