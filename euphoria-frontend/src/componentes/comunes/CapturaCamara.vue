<template>
  <div class="captura">
    <!-- Dos accesos coherentes: cámara (foto o escaneo) y subir desde galería -->
    <div class="captura-opciones">
      <button type="button" class="captura-btn" :disabled="deshabilitado" @click="abrirCamara">
        <svg v-if="modo === 'qr'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
          <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
          <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
          <line x1="3" y1="12" x2="21" y2="12"></line>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span>{{ etiquetaCamara }}</span>
      </button>
      <button type="button" class="captura-btn" :disabled="deshabilitado" @click="abrirArchivo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>Subir foto</span>
      </button>
    </div>
    <input ref="inputFile" type="file" accept="image/*" class="captura-input-oculto" @change="alSubir" />
    <!-- Lector oculto para decodificar QR desde una foto (modo qr) -->
    <div :id="readerFileId" class="captura-input-oculto"></div>

    <!-- Overlay de cámara: mismo marco guía para foto y para escaneo QR -->
    <Teleport to="body">
      <div v-if="camaraAbierta" class="captura-overlay">
        <video v-if="modo === 'foto'" ref="videoCamara" class="captura-video" autoplay playsinline muted></video>
        <div v-else :id="readerLiveId" class="captura-video captura-reader"></div>

        <div class="captura-guia">
          <div ref="marcoGuia" class="guia-marco" :class="{ 'guia-marco-qr': modo === 'qr', detectado: qrDetectado }" aria-hidden="true">
            <span class="guia-esquina ge-tl"></span>
            <span class="guia-esquina ge-tr"></span>
            <span class="guia-esquina ge-bl"></span>
            <span class="guia-esquina ge-br"></span>
            <div v-if="modo === 'qr' && !qrDetectado" class="guia-linea"></div>
          </div>
          <p class="guia-texto">
            <template v-if="qrDetectado">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Código detectado
            </template>
            <template v-else>{{ textoGuia }}</template>
          </p>
        </div>

        <div class="captura-controles">
          <button type="button" class="captura-cancelar" @click="cerrarCamara">Cancelar</button>
          <button v-if="modo === 'foto'" type="button" class="btn-disparo" aria-label="Capturar foto" @click="capturarFoto">
            <span class="btn-disparo-interno" aria-hidden="true"></span>
          </button>
          <span v-else class="captura-escaneando" aria-hidden="true"></span>
          <span class="captura-espaciador" aria-hidden="true"></span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted, getCurrentInstance } from 'vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import { Html5Qrcode } from 'html5-qrcode'

const props = defineProps({
  // 'foto' = captura una imagen (comprobante); 'qr' = escaneo de código en vivo (billetera)
  modo: { type: String, default: 'foto' },
  deshabilitado: { type: Boolean, default: false },
  textoGuia: { type: String, default: 'Coloca el documento dentro del marco' },
  nombreArchivo: { type: String, default: 'captura.jpg' },
  // Chequeo previo opcional: si devuelve false, no se abre la cámara ni la galería.
  // La vista dueña muestra su propio error (ej. "Ingresa un monto válido primero")
  // ANTES de que el usuario gaste una foto.
  validarAntes: { type: Function, default: null },
})
const emit = defineEmits(['archivo', 'codigo'])
const notif = useNotificaciones()

// Ids únicos por instancia (evita choques si hay dos capturas montadas)
const uid = getCurrentInstance().uid
const readerLiveId = `cam-live-${uid}`
const readerFileId = `cam-file-${uid}`

const etiquetaCamara = props.modo === 'qr' ? 'Escanear QR' : 'Tomar foto'

const inputFile = ref(null)
const videoCamara = ref(null)
const marcoGuia = ref(null)
const camaraAbierta = ref(false)
const qrDetectado = ref(false)
let streamCamara = null
let scannerQr = null

function abrirArchivo() {
  if (props.deshabilitado) return
  if (props.validarAntes && props.validarAntes() === false) return
  inputFile.value?.click()
}

async function alSubir(e) {
  const file = e.target.files?.[0]
  if (e.target) e.target.value = '' // permite reelegir/recapturar el mismo archivo
  if (!file) return
  if (props.modo === 'qr') {
    await decodificarQrDesdeArchivo(file)
  } else {
    emit('archivo', file)
  }
}

async function abrirCamara() {
  if (props.deshabilitado || camaraAbierta.value) return
  if (props.validarAntes && props.validarAntes() === false) return
  // Cámara in-app con marco guía para AMBOS modos:
  //  - foto: getUserMedia HD (2560x1440) + autoenfoque continuo + ImageCapture.
  //    takePhoto (foto real nítida, no un frame de video). Es la captura que se
  //    validó en la billetera; da el recuadro "enfoca aquí" que la cámara nativa
  //    del sistema no ofrecía.
  //  - qr: escaneo en vivo con html5-qrcode.
  if (!navigator.mediaDevices?.getUserMedia) {
    notif.advertencia('No pudimos abrir la cámara. Elige la foto desde tus archivos.')
    abrirArchivo()
    return
  }
  qrDetectado.value = false
  camaraAbierta.value = true
  await nextTick()
  if (props.modo === 'foto') await iniciarVideo()
  else iniciarEscaneoQr()
}

async function iniciarVideo() {
  // Pedimos la mayor resolución razonable para que el OCR pueda leer el monto.
  // La cámara trasera ('environment') y valores 'ideal' altos evitan que el
  // navegador entregue el stream por defecto (a menudo 640x480, muy bajo).
  // 'focusMode: continuous' pide autoenfoque continuo: es la clave para que el
  // comprobante NO salga borroso (la causa real del "no se ve el monto").
  const restriccionesHD = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 2560 },
      height: { ideal: 1440 },
      advanced: [{ focusMode: 'continuous' }],
    },
    audio: false,
  }
  try {
    streamCamara = await navigator.mediaDevices.getUserMedia(restriccionesHD)
  } catch (error) {
    // Algún dispositivo puede no soportar esa resolución: reintentamos con lo básico.
    console.warn('Cámara HD no disponible, usando resolución por defecto:', error)
    try {
      streamCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
    } catch (error2) {
      console.error('Error abriendo la cámara:', error2)
      cerrarCamara()
      notif.advertencia('No pudimos abrir la cámara. Elige la foto desde tus archivos.')
      abrirArchivo()
      return
    }
  }
  // Refuerzo del enfoque: algunos navegadores ignoran 'advanced' en getUserMedia
  // pero sí aceptan applyConstraints sobre la pista ya activa.
  await aplicarEnfoqueContinuo(streamCamara)
  if (videoCamara.value) videoCamara.value.srcObject = streamCamara
  else cerrarCamara()
}

// Intenta activar autoenfoque continuo (y estabilizar exposición/balance) en la
// pista de video. Si el dispositivo no lo soporta, se ignora sin romper nada.
async function aplicarEnfoqueContinuo(stream) {
  try {
    const track = stream && stream.getVideoTracks && stream.getVideoTracks()[0]
    if (!track || !track.getCapabilities) return
    const cap = track.getCapabilities()
    const avanzadas = []
    if (cap.focusMode && cap.focusMode.includes('continuous')) avanzadas.push({ focusMode: 'continuous' })
    if (cap.exposureMode && cap.exposureMode.includes('continuous')) avanzadas.push({ exposureMode: 'continuous' })
    if (cap.whiteBalanceMode && cap.whiteBalanceMode.includes('continuous')) avanzadas.push({ whiteBalanceMode: 'continuous' })
    if (avanzadas.length) await track.applyConstraints({ advanced: avanzadas })
  } catch (e) {
    // El enfoque manual/por defecto no es crítico; continuamos.
    console.warn('No se pudo forzar el autoenfoque continuo:', e)
  }
}

function iniciarEscaneoQr() {
  scannerQr = new Html5Qrcode(readerLiveId)
  scannerQr.start(
    { facingMode: 'environment' },
    { fps: 10 },
    (texto) => {
      if (qrDetectado.value) return
      qrDetectado.value = true // feedback visual antes de cerrar
      setTimeout(() => {
        cerrarCamara()
        emit('codigo', texto)
      }, 400)
    },
    () => {} // ignora los frames sin QR
  ).catch((error) => {
    console.error('Error abriendo la cámara:', error)
    cerrarCamara()
    notif.advertencia('No pudimos abrir la cámara. Elige la foto desde tus archivos.')
    abrirArchivo()
  })
}

async function decodificarQrDesdeArchivo(file) {
  try {
    const lector = new Html5Qrcode(readerFileId)
    const texto = await lector.scanFile(file, true)
    emit('codigo', texto)
  } catch (error) {
    console.error('Error leyendo QR:', error)
    notif.advertencia('No se pudo leer el QR en la foto. Enfoca bien e intenta de nuevo.')
  }
}

function cerrarCamara() {
  if (streamCamara) {
    streamCamara.getTracks().forEach(t => t.stop())
    streamCamara = null
  }
  if (scannerQr) {
    const s = scannerQr
    scannerQr = null
    if (s.isScanning) s.stop().then(() => s.clear()).catch(() => {})
  }
  camaraAbierta.value = false
  qrDetectado.value = false
}

async function capturarFoto() {
  const video = videoCamara.value
  if (!video || !video.videoWidth) return
  let blob = null

  // 1) MÉTODO PREFERIDO: ImageCapture.takePhoto() — dispara una FOTO real a la
  //    resolución nativa de la cámara (nítida, con enfoque de foto), como la
  //    app de cámara del teléfono. Es la clave para que el comprobante NO salga
  //    borroso: antes tomábamos un frame del video (baja calidad y enfoque de video).
  try {
    const track = streamCamara && streamCamara.getVideoTracks && streamCamara.getVideoTracks()[0]
    if (track && typeof window.ImageCapture === 'function') {
      const capturador = new ImageCapture(track)
      // Enfoque final antes del disparo (por si el dispositivo lo soporta).
      await aplicarEnfoqueContinuo(streamCamara)
      await new Promise(r => setTimeout(r, 350)) // deja que el autoenfoque asiente
      let opciones = {}
      try {
        const caps = await capturador.getPhotoCapabilities()
        if (caps?.imageWidth?.max && caps?.imageHeight?.max) {
          opciones = { imageWidth: caps.imageWidth.max, imageHeight: caps.imageHeight.max }
        }
      } catch { /* usamos la resolución de foto por defecto */ }
      blob = await capturador.takePhoto(opciones)
    }
  } catch (e) {
    console.warn('ImageCapture.takePhoto no disponible, uso captura de video:', e)
    blob = null
  }

  // 2) RESPALDO (iOS/Safari no soportan ImageCapture): frame del video a su
  //    resolución nativa, exportado como JPEG de alta calidad.
  if (!blob) {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95))
  }

  // 3) RECORTE AL MARCO GUÍA (antes de cerrar la cámara: necesita su geometría).
  //    La foto se queda SOLO con lo encuadrado (+margen): el texto de los
  //    costados confundía al OCR y la imagen completa lo hacía lento. NO se
  //    reduce la resolución: la zona útil conserva cada píxel original.
  if (blob) {
    const recortado = await recortarAlMarco(blob)
    if (recortado) blob = recortado
  }

  cerrarCamara()
  if (!blob) {
    notif.error('No se pudo capturar la foto. Inténtalo de nuevo.')
    return
  }
  const tipo = blob.type || 'image/jpeg'
  const nombre = tipo.includes('png') ? props.nombreArchivo.replace(/\.jpe?g$/i, '.png') : props.nombreArchivo
  emit('archivo', new File([blob], nombre, { type: tipo }))
}

// Recorta la foto al rectángulo que el usuario ve como marco guía. Mapea el
// marco (coordenadas de pantalla) al stream (object-fit: cover implica escala
// y recorte) y de ahí a la FOTO (ImageCapture puede entregar otra resolución:
// se escala proporcionalmente eje por eje). Si algo falla, devuelve null y se
// usa la foto completa (nunca se pierde la captura).
async function recortarAlMarco(blob) {
  try {
    const video = videoCamara.value
    const marco = marcoGuia.value
    if (!video || !marco || !video.videoWidth) return null
    const cont = video.getBoundingClientRect()
    const rm = marco.getBoundingClientRect()
    if (!cont.width || !rm.width) return null
    const vw = video.videoWidth, vh = video.videoHeight
    // object-fit: cover -> el stream se escala para CUBRIR el contenedor
    const escala = Math.max(cont.width / vw, cont.height / vh)
    const offX = (vw * escala - cont.width) / 2
    const offY = (vh * escala - cont.height) / 2
    // Marco en píxeles del stream, con 6% de margen (por si el encuadre quedó justo)
    const margen = 0.06
    const mw = rm.width / escala, mh = rm.height / escala
    const exX = mw * margen, exY = mh * margen
    const mx = (rm.left - cont.left + offX) / escala - exX
    const my = (rm.top - cont.top + offY) / escala - exY
    // La foto puede tener otra resolución que el stream: proporción por eje
    const bmp = await createImageBitmap(blob)
    const rx = bmp.width / vw, ry = bmp.height / vh
    const sx = Math.max(0, Math.round(mx * rx))
    const sy = Math.max(0, Math.round(my * ry))
    const sw = Math.min(bmp.width - sx, Math.round((mw + exX * 2) * rx))
    const sh = Math.min(bmp.height - sy, Math.round((mh + exY * 2) * ry))
    if (sw < 200 || sh < 200) { bmp.close?.(); return null } // recorte sospechoso: mejor la foto completa
    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    canvas.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh)
    bmp.close?.()
    return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95))
  } catch (e) {
    console.warn('No se pudo recortar al marco; se usa la foto completa:', e)
    return null
  }
}

onUnmounted(cerrarCamara)
</script>

<style scoped>
.captura-opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.captura-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  padding: 16px 10px; border-radius: var(--radio-md);
  background: var(--fondo-tarjeta-alt, rgba(255,255,255,0.04));
  border: 1px solid var(--borde-sutil); color: var(--texto-principal);
  font-size: 0.86rem; font-weight: 700; cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}
.captura-btn:hover:not(:disabled) { border-color: var(--morado-brillante); background: rgba(168,85,247,0.12); }
.captura-btn:active:not(:disabled) { transform: scale(0.97); }
.captura-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.captura-btn svg { color: var(--morado-hover); }
.captura-input-oculto { display: none; }

/* Overlay de cámara (foto y escaneo QR comparten el mismo lienzo) */
.captura-overlay {
  position: fixed; inset: 0; z-index: 6000;
  background: #000; display: flex; flex-direction: column;
}
.captura-video { flex: 1; min-height: 0; width: 100%; object-fit: cover; }
.captura-reader { display: flex; align-items: center; justify-content: center; overflow: hidden; }
.captura-reader :deep(video) { width: 100% !important; height: 100% !important; object-fit: cover; }
.captura-guia {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 18px; pointer-events: none;
}
.guia-marco {
  position: relative; width: min(78vw, 60vh); aspect-ratio: 3 / 4;
  border-radius: 14px; box-shadow: 0 0 0 100vmax rgba(0,0,0,0.5);
  transition: box-shadow 0.25s ease;
}
.guia-marco-qr { width: min(70vw, 46vh); aspect-ratio: 1 / 1; }
.guia-marco.detectado { box-shadow: 0 0 0 100vmax rgba(16,80,40,0.55); }
.guia-esquina { position: absolute; width: 30px; height: 30px; border: 3px solid #fff; transition: border-color 0.25s ease; }
.guia-marco.detectado .guia-esquina { border-color: #4ADE80; }
.ge-tl { top: -2px; left: -2px; border-right: none; border-bottom: none; border-top-left-radius: 12px; }
.ge-tr { top: -2px; right: -2px; border-left: none; border-bottom: none; border-top-right-radius: 12px; }
.ge-bl { bottom: -2px; left: -2px; border-right: none; border-top: none; border-bottom-left-radius: 12px; }
.ge-br { bottom: -2px; right: -2px; border-left: none; border-top: none; border-bottom-right-radius: 12px; }
.guia-linea {
  position: absolute; left: 6%; right: 6%; top: 0; height: 3px;
  background: linear-gradient(90deg, transparent, #A855F7, #EC4899, transparent);
  box-shadow: 0 0 12px rgba(168,85,247,0.9); border-radius: 3px;
  animation: barrido-qr 2s ease-in-out infinite;
}
@keyframes barrido-qr { 0%,100% { top: 4%; } 50% { top: 92%; } }
.guia-texto { color: #fff; font-size: 0.9rem; font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.captura-controles {
  position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px calc(24px + env(safe-area-inset-bottom));
  background: linear-gradient(0deg, rgba(0,0,0,0.6), transparent);
}
.captura-cancelar {
  background: rgba(255,255,255,0.14); border: none; color: #fff;
  padding: 10px 18px; border-radius: var(--radio-full); font-weight: 700; font-size: 0.9rem; cursor: pointer;
}
.captura-cancelar:hover { background: rgba(255,255,255,0.24); }
.btn-disparo {
  width: 70px; height: 70px; border-radius: 50%; background: none;
  border: 4px solid #fff; padding: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.btn-disparo-interno { width: 54px; height: 54px; border-radius: 50%; background: #fff; transition: transform 0.15s ease; }
.btn-disparo:hover .btn-disparo-interno { transform: scale(0.92); }
.btn-disparo:active .btn-disparo-interno { transform: scale(0.82); }
.captura-escaneando { width: 70px; height: 70px; }
.captura-espaciador { width: 84px; }

@media (prefers-reduced-motion: reduce) {
  .captura-btn:active, .btn-disparo-interno { transform: none; }
  .guia-linea { animation: none; }
}
</style>
