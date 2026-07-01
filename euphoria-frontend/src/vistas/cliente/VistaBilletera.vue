<template>
  <div class="contenedor-billetera">
    <h1 class="titulo-principal-billetera">Billetera de {{ usuario }}</h1>

    <div class="billetera-layout-grid">
      <!-- Columna Izquierda: Tarjeta y Acciones -->
      <div class="panel-izquierdo">
        <!-- TARJETA PRINCIPAL TYPE BILLETERA/CREDITO -->
        <div class="tarjeta-billetera">
          <!-- Fila Superior -->
          <div class="fila-superior">
            <div class="grupo-saldo">
              <p class="etiqueta-pequena">SALDO</p>
              <p class="valor-grande">Bs. {{ formatoMoneda(saldo) }}</p>
            </div>
            <div class="grupo-marca">
              <img src="@/activos/imagenes/logo-euphoria.png" alt="euphoria" class="img-logo" />
            </div>
          </div>

          <div class="espaciador-tarjeta"></div>

          <!-- Fila Inferior -->
          <div class="fila-inferior">
            <div class="columna-pin">
              <p class="etiqueta-pequena">PIN</p>
              <div class="pin-display-flex">
                <span v-if="mostrarPin" class="pin-valor">{{ pin || '0000' }}</span>
                <span v-else class="pin-oculto-nuevo">••••</span>
                <button class="btn-ojo-nuevo" @click="mostrarPin = !mostrarPin" type="button" title="Mostrar/ocultar PIN">
                  <svg v-if="mostrarPin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
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
                Recargar Saldo
              </button>
            </div>
          </div>
        </div>

    <!-- Acciones para Generar QRs (Pago) -->
    <div class="acciones-billetera">
      <button class="btn-abrir-recarga btn-pagar" @click="mostrarQRRapido('sin_pin')" type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <path d="M7 7h.01"></path>
          <path d="M17 7h.01"></path>
          <path d="M7 17h.01"></path>
          <path d="M17 17h.01"></path>
        </svg>
        QR Público
      </button>
      <button class="btn-abrir-recarga btn-pagar btn-privado" @click="mostrarQRRapido('con_pin')" type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <path d="M7 7h.01"></path>
          <path d="M17 7h.01"></path>
          <path d="M7 17h.01"></path>
          <path d="M17 17h.01"></path>
          <rect x="10" y="10" width="4" height="4" rx="1" ry="1"></rect>
        </svg>
        QR Privado
      </button>
    </div>

      </div> <!-- Fin Panel Izquierdo -->

      <!-- Columna Derecha: Historial -->
      <div class="panel-derecho">
        <!-- HISTORIAL RECARGAS -->
        <div class="seccion-historial">
      <h2>Historial de Recargas</h2>
      <div v-if="historial.length === 0" class="historial-vacio">
        <p>No hay recargas realizadas aún</p>
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
          <div class="columna-monto">Bs. {{ recarga.monto.toFixed(2) }}</div>
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
          <h2>Cambiar PIN Transaccional</h2>
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
          <h2>Recargar Saldo</h2>
          <button class="btn-cerrar" @click="abrirModalRecarga" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <!-- QR Predeterminado -->
          <div class="info-recarga-paso">Paso 1: Escanea el QR para transferir</div>
          <div class="subseccion-qr-predeterminado">
            <div class="contenedor-qr-default">
              <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR Predeterminado" class="qr-imagen" />
              <button class="btn-ampliar-qr" @click="ampliarQRDefault" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                Ver Grande
              </button>
            </div>
          </div>

          <!-- Monto Input -->
          <div class="info-recarga-paso">Paso 2: Ingresa el monto transferido</div>
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
          <div class="info-recarga-paso">Paso 3: Sube tu comprobante para validarlo</div>
          <div class="campo-comprobante">
            <div class="zona-carga" @click="triggerUpload">
              <svg v-if="!archivoComprobante" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p v-if="!archivoComprobante">Haz clic para buscar imagen</p>
              
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
          <img :src="datosQR.qr_sin_pin.imagen" alt="QR Sin PIN Ampliado" class="qr-modal-imagen" />
          <p class="qr-identificador">ID: {{ datosQR.qr_sin_pin.identificador }}</p>
        </div>
        <div v-else-if="qrAmpliado === 'con_pin'" class="contenedor-qr-identificador">
          <img :src="datosQR.qr_con_pin.imagen" alt="QR Con PIN Ampliado" class="qr-modal-imagen" />
          <p class="qr-identificador">ID: {{ datosQR.qr_con_pin.identificador }}</p>
        </div>
        <img v-else src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR Predeterminado Ampliado" class="qr-modal-imagen" />
      </div>
    </div>

    <!-- MODAL DETALLES DE TRANSACCIÓN -->
    <div v-if="recargaSeleccionada" class="modal-overlay" @click.self="recargaSeleccionada = null">
      <div class="modal-detalles">
        <div class="modal-header">
          <h2>Detalle de Recarga</h2>
          <button class="btn-cerrar" @click="recargaSeleccionada = null" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detalle-fila"><strong>Estado:</strong> <span :class="['badge', `badge-${recargaSeleccionada.estado}`]">{{ recargaSeleccionada.estado }}</span></div>
          <div class="detalle-fila"><strong>Monto:</strong> Bs. {{ recargaSeleccionada.monto.toFixed(2) }}</div>
          <div class="detalle-fila"><strong>ID Transacción OCR:</strong> <span class="texto-resaltado">{{ recargaSeleccionada.numero_transaccion }}</span></div>
          <div class="detalle-fila"><strong>Fecha Solicitud:</strong> {{ formatoFecha(recargaSeleccionada.fecha_solicitud) }}</div>
          <div class="detalle-fila"><strong>Fecha Confirmación:</strong> {{ recargaSeleccionada.fecha_confirmacion ? formatoFecha(recargaSeleccionada.fecha_confirmacion) : 'No confirmada' }}</div>
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
        <h2 style="color: white; margin-top: 1rem;">¡Recarga Exitosa!</h2>
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
const pin = ref('0000')
const mostrarPin = ref(false)
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

  monto = Math.floor(monto * 100) / 100
  montoIngresado.value = monto.toFixed(2)
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
    pin.value = nuevoPin.value
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
    
    // Acortar el identificador para que sea fácil de escribir manualmente
    const acortar = (id, esPrivado) => {
      if (!id) return ''
      const partes = id.split('_')
      if (partes.length >= 3) {
        let sufijo = partes[2].slice(-4)
        // El usuario pidió que varíen en un dígito para poder diferenciarlos al cobrar
        if (esPrivado) {
          // Si el sufijo es por ej 5932, lo volvemos 5933
          let num = parseInt(sufijo, 10) + 1
          sufijo = num.toString().padStart(4, '0')
        }
        return `U${partes[1]}-${sufijo}`
      }
      return id.slice(-6) + (esPrivado ? 'P' : '')
    }

    res.qr_sin_pin.identificador = acortar(res.qr_sin_pin.identificador, false)
    res.qr_con_pin.identificador = acortar(res.qr_con_pin.identificador, true)

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
  return new Date(fecha).toLocaleDateString('es-BO')
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
  padding-top: 3rem;
}

.billetera-layout-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
}

@media (min-width: 900px) {
  .billetera-layout-grid {
    grid-template-columns: 420px 1fr;
    gap: 3rem;
  }
}

.titulo-principal-billetera {
  font-size: 1.5rem;
  font-weight: 800;
  text-align: center;
  color: var(--texto-principal);
  margin-bottom: 1.5rem;
  letter-spacing: -0.5px;
}

/* TARJETA BILLETERA */
.tarjeta-billetera {
  position: relative;
  background: linear-gradient(135deg, var(--morado-brillante), var(--azul-profundo));
  width: 100%;
  padding: 2.5rem;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(22,33,62,0.95) 100%);
  border: 1px solid rgba(157, 78, 221, 0.4);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Efecto brillo minimalista */
.tarjeta-billetera::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(157,78,221,0.15) 0%, transparent 60%);
  transform: rotate(30deg);
  pointer-events: none;
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
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  padding: 0.5rem 1.2rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
  width: 100%;
  justify-content: center;
}

.btn-pildora:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.etiqueta-pequena {
  color: var(--texto-secundario);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 0.3rem 0;
}

.valor-grande {
  font-size: 2.8rem;
  font-weight: 800;
  color: white;
  margin: 0;
  letter-spacing: -1px;
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
.acciones-billetera {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem; /* Reducido para evitar el enorme espacio muerto arriba del historial */
  flex-wrap: wrap;
}

.btn-abrir-recarga {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-color);
  color: var(--texto-principal);
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-pagar {
  border-color: var(--verde-fresco);
}

.btn-privado {
  border-color: var(--rojo-coral);
}

.btn-abrir-recarga:hover {
  border-color: var(--morado-brillante);
  background: rgba(157, 78, 221, 0.1);
  transform: translateY(-2px);
}

.btn-pagar:hover {
  border-color: var(--verde-fresco);
  background: rgba(30, 215, 96, 0.1);
}

.btn-privado:hover {
  border-color: var(--rojo-coral);
  background: rgba(235, 87, 87, 0.1);
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
  background: rgba(22, 27, 34, 0.95);
  backdrop-filter: blur(15px);
  border: 1px solid var(--morado-brillante);
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 20px rgba(157, 78, 221, 0.3);
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
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s;
}

.btn-cerrar:hover {
  color: var(--texto-principal);
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
  box-shadow: 0 8px 20px rgba(157, 78, 221, 0.3);
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
  font-weight: 600;
  color: var(--morado-brillante);
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-pin:focus {
  outline: none;
  border-color: var(--morado-brillante);
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
  background: rgba(157, 78, 221, 0.05);
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
  background: rgba(255,255,255,0.05);
  color: var(--morado-brillante);
  border: 1px solid var(--morado-brillante);
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s;
}
.btn-detalles:hover {
  background: var(--morado-brillante);
  color: white;
}

.columna-acciones {
  flex: 1;
  text-align: right;
}

/* DETALLES TRANSACCIÓN */
.modal-detalles {
  width: 90%;
  max-width: 400px;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-color);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
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
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.95rem;
  color: var(--texto-secundario);
}
.detalle-fila:last-child {
  border-bottom: none;
}
.detalle-fila strong {
  color: var(--texto-principal);
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
.seccion-historial h2 {
  font-size: 1.3rem;
  margin-bottom: 1.5rem;
}

.historial-vacio {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-color);
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  color: var(--texto-secundario);
}

.tabla-historial {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-color);
  border-radius: 12px;
  overflow: hidden;
}

.fila-encabezado {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr 1fr 0.8fr;
  gap: 1rem;
  background: rgba(157, 78, 221, 0.1);
  padding: 1rem 1.5rem;
  font-weight: 600;
  color: var(--texto-principal);
  border-bottom: 1px solid var(--borde-color);
}

.fila-historial {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr 1fr 0.8fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  align-items: center;
}

.fila-historial:last-child {
  border-bottom: none;
}

/* Transformación de tabla a tarjetas en celulares */
@media (max-width: 600px) {
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

  .fila-encabezado {
    display: none;
  }

  .fila-historial {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 1rem;
  }
  
  .columna-monto {
    font-size: 1.1rem;
  }
}
</style>
