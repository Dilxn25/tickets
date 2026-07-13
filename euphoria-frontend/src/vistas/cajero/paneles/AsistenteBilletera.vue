<template>
  <section class="asis fade-in">
    <!-- Cabecera con progreso -->
    <header class="a-cab">
      <button class="a-volver" @click="atras" :title="paso === 1 ? 'Cancelar' : 'Paso anterior'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="18" height="18"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div class="a-titulo">
        <b>Nueva billetera</b>
        <div class="a-pasos">
          <span v-for="n in 3" :key="n" :class="['a-punto', { hecho: paso > n, actual: paso === n }]"></span>
        </div>
      </div>
    </header>

    <!-- PASO 1: identidad -->
    <div v-if="paso === 1" class="a-paso fade-in">
      <label class="a-lbl">CI o teléfono del cliente</label>
      <input v-model="identificador" type="text" class="a-input" placeholder="72285280" autocomplete="off" @input="verificarDuplicado" />
      <p v-if="duplicado" class="a-error">Ya tiene billetera — búscalo y recárgale.</p>
      <label class="a-lbl">PIN <small>(si no eliges, será 1234)</small></label>
      <input v-model="pin" type="password" inputmode="numeric" maxlength="4" class="a-input pin" placeholder="••••" @input="pin = pin.replace(/\D/g, '').slice(0, 4)" />
      <button class="a-cta" :disabled="!identificador.trim() || duplicado || (pin && pin.length !== 4)" @click="paso = 2">Siguiente</button>
    </div>

    <!-- PASO 2: ubicación (reutiliza el selector con buscador/lista/mapa) -->
    <div v-else-if="paso === 2" class="a-paso fade-in">
      <div class="a-ubic">
        <button v-for="u in ubicaciones" :key="u.valor" type="button" :class="['a-ubic-btn', { activo: ubicacion === u.valor }]" @click="elegirUbicacion(u.valor)">
          <span v-html="u.icono"></span>
          {{ u.nombre }}
        </button>
      </div>
      <div v-if="ubicacion !== 'general'" class="a-mesa fade-in">
        <p v-if="cargandoPlanos" class="a-nota">Cargando el mapa…</p>
        <SelectorMesa v-else-if="planos.length" :zonas="planos" v-model="mesaId" @cambio="mesaObj = $event" />
        <p v-else class="a-nota">Sin evento activo con mapa.</p>
      </div>
      <button class="a-cta" @click="paso = 3">Siguiente</button>
    </div>

    <!-- PASO 3: saldo inicial + cobro -->
    <div v-else-if="paso === 3 && !credenciales" class="a-paso fade-in">
      <div class="a-monto">
        <span>Bs.</span>
        <input v-model="montoTexto" @input="limpiarMonto" type="text" inputmode="decimal" placeholder="0.00" />
      </div>
      <div class="a-metodos" v-if="monto > 0">
        <button type="button" :class="['metodo-card', { seleccionado: metodo === 'efectivo' }]" @click="metodo = 'efectivo'">
          <span class="metodo-ic efectivo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg></span>
          <span class="metodo-txt"><b>Efectivo</b></span>
          <svg class="metodo-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <button type="button" :class="['metodo-card', { seleccionado: metodo === 'qr' }]" @click="metodo = 'qr'">
          <span class="metodo-ic qr"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg></span>
          <span class="metodo-txt"><b>QR</b></span>
          <svg class="metodo-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>
      <p class="a-nota" v-else>Puede empezar en Bs 0 y recargar después.</p>
      <p v-if="error" class="a-error">{{ error }}</p>
      <button class="a-cta" :disabled="creando" @click="crear">
        {{ creando ? 'Creando…' : (monto > 0 ? `Crear y cobrar Bs ${monto.toFixed(2)}` : 'Crear billetera') }}
      </button>
    </div>

    <!-- Credenciales creadas -->
    <div v-else-if="credenciales" class="a-listo fade-in">
      <span class="a-listo-ic">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="30" height="30"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </span>
      <b>Billetera lista</b>
      <div class="a-cred">
        <div class="a-cred-fila"><small>Código</small><b>{{ credenciales.qr_publico }}</b></div>
        <div class="a-cred-fila"><small>Correo</small><b>{{ credenciales.credenciales?.correo }}</b></div>
        <div class="a-cred-fila"><small>Contraseña</small><b>{{ credenciales.credenciales?.password }}</b></div>
        <div class="a-cred-fila"><small>Saldo</small><b class="verde">Bs {{ Number(credenciales.saldo).toFixed(2) }}</b></div>
      </div>
      <div class="a-qrs">
        <img v-if="qrPubImg" :src="qrPubImg" alt="QR público" />
        <img v-if="qrPrivImg" :src="qrPrivImg" alt="QR privado" />
      </div>
      <button class="a-cta secundario" @click="imprimir">Imprimir tarjeta</button>
      <button class="a-cta" @click="$emit('creada')">Terminar</button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import QRCode from 'qrcode'
import clienteHttp from '@/servicios-api/cliente-http.js'
import SelectorMesa from '@/componentes/comunes/SelectorMesa.vue'
import { servicioAforo } from '@/servicios-api/servicio-aforo.js'

const props = defineProps({ identificadorInicial: { type: String, default: '' } })
const emit = defineEmits(['cerrar', 'creada'])

const paso = ref(1)
const identificador = ref(props.identificadorInicial)
const pin = ref('')
const duplicado = ref(false)
let debounceDup = null
function verificarDuplicado() {
  duplicado.value = false
  clearTimeout(debounceDup)
  const idf = identificador.value.trim()
  if (!idf) return
  debounceDup = setTimeout(async () => {
    try {
      await clienteHttp.get(`/cajero/consultar-billetera/${encodeURIComponent(idf)}`)
      duplicado.value = true // encontró billetera => ya existe
    } catch { duplicado.value = false }
  }, 300)
}

// Paso 2: ubicación
const ubicaciones = [
  { valor: 'general', nombre: 'General', icono: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
  { valor: 'mesa', nombre: 'Mesa', icono: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="4" rx="1"></rect><line x1="6" y1="12" x2="6" y2="19"></line><line x1="18" y1="12" x2="18" y2="19"></line></svg>' },
  { valor: 'reserva', nombre: 'VIP', icono: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
]
const ubicacion = ref('general')
const planos = ref([])
const cargandoPlanos = ref(false)
const mesaId = ref(null)
const mesaObj = ref(null)
async function elegirUbicacion(u) {
  ubicacion.value = u
  mesaId.value = null
  mesaObj.value = null
  if (u === 'general' || planos.value.length || cargandoPlanos.value) return
  cargandoPlanos.value = true
  try {
    const evs = await servicioAforo.listarEventos()
    const activo = (evs || []).find(e => ['en_transcurso', 'lleno', 'promocion'].includes(e.estado)) || evs?.[0]
    if (activo) {
      const r = await servicioAforo.obtenerPlanos(activo.id_evento)
      planos.value = (r.zonas || []).filter(z => (z.mesas || []).length)
    }
  } catch { planos.value = [] } finally { cargandoPlanos.value = false }
}

// Paso 3: saldo + cobro
const montoTexto = ref('')
const metodo = ref('efectivo')
const monto = computed(() => { const n = parseFloat(montoTexto.value); return Number.isFinite(n) && n > 0 ? n : 0 })
function limpiarMonto() { montoTexto.value = (montoTexto.value || '').replace(/[^0-9.]/g, '').match(/^\d*\.?\d{0,2}/)?.[0] || '' }

const creando = ref(false)
const error = ref('')
const credenciales = ref(null)
const qrPubImg = ref('')
const qrPrivImg = ref('')
async function crear() {
  if (creando.value) return
  creando.value = true
  error.value = ''
  try {
    const etiqueta = mesaObj.value
      ? `${ubicacion.value === 'reserva' ? 'VIP' : 'Mesa'} ${mesaObj.value.numero_nombre}`
      : ubicacion.value
    const r = await clienteHttp.post('/cajero/abrir-billetera', {
      identificador: identificador.value.trim(),
      pin: pin.value || undefined,
      ubicacion: etiqueta,
      id_mesa: mesaObj.value?.id_mesa || null,
      monto_inicial: monto.value,
      metodo_pago: metodo.value,
    })
    credenciales.value = r
    const opts = { width: 400, margin: 1, color: { dark: '#10002b', light: '#ffffff' } }
    qrPubImg.value = await QRCode.toDataURL(r.qr_publico, opts)
    if (r.token_qr) qrPrivImg.value = await QRCode.toDataURL(r.token_qr, opts)
  } catch (e) {
    error.value = e?.error || 'No se pudo crear la billetera.'
  } finally { creando.value = false }
}

function atras() {
  if (credenciales.value) return
  if (paso.value === 1) emit('cerrar')
  else paso.value--
}

function imprimir() {
  const c = credenciales.value
  const html = `
    <html><head><title>Billetera Euphoria</title><style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; text-align: center; color: #10002b; padding: 24px; }
      .cod { font-size: 22px; font-weight: 800; letter-spacing: 1px; margin: 6px 0 14px; }
      .par { display: flex; gap: 24px; justify-content: center; }
      .qr img { width: 220px; } .qr b { display: block; margin-top: 6px; font-size: 13px; }
      .datos { margin: 16px auto 0; max-width: 420px; font-size: 12px; border-top: 1px dashed #999; padding-top: 10px; }
    </style></head><body>
      <h2>Tu billetera Euphoria</h2>
      <div class="cod">${c.qr_publico}</div>
      <div class="par">
        <div class="qr"><img src="${qrPubImg.value}" /><b>QR público · cobro directo</b></div>
        ${qrPrivImg.value ? `<div class="qr"><img src="${qrPrivImg.value}" /><b>QR privado · con tu PIN</b></div>` : ''}
      </div>
      <div class="datos">Entra a la app con <b>${c.credenciales?.correo}</b> · contraseña <b>${c.credenciales?.password}</b></div>
    </body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  setTimeout(() => iframe.remove(), 2000)
}

onMounted(() => { if (identificador.value) verificarDuplicado() })
</script>

<style scoped>
.asis { display: flex; flex-direction: column; gap: 16px; }
.a-cab { display: flex; align-items: center; gap: 12px; }
.a-volver { flex-shrink: 0; width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--borde-sutil); background: rgba(255,255,255,0.05); color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.a-titulo { display: flex; flex-direction: column; gap: 6px; }
.a-titulo b { color: var(--texto-principal); font-size: 1.1rem; font-family: var(--fuente-titulo); }
.a-pasos { display: flex; gap: 6px; }
.a-punto { width: 22px; height: 5px; border-radius: 3px; background: var(--borde-sutil); transition: background 0.25s ease; }
.a-punto.actual { background: var(--morado-brillante); }
.a-punto.hecho { background: var(--color-exito); }

.a-paso { display: flex; flex-direction: column; gap: 12px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 20px; padding: 18px; }
.a-lbl { font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-secundario); }
.a-lbl small { text-transform: none; letter-spacing: 0; font-weight: 500; color: var(--texto-desactivado); }
.a-input { width: 100%; box-sizing: border-box; padding: 13px 14px; border-radius: 14px; outline: none; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil); color: var(--texto-principal); font-size: 1rem; font-weight: 600; }
.a-input:focus { border-color: var(--morado-brillante); }
.a-input.pin { max-width: 180px; text-align: center; letter-spacing: 10px; font-size: 1.4rem; font-weight: 800; }
.a-error { margin: 0; font-size: 0.84rem; color: var(--color-error); }
.a-nota { margin: 0; font-size: 0.84rem; color: var(--texto-desactivado); }
.a-cta { padding: 14px; border: none; border-radius: 16px; cursor: pointer; background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 0.95rem; }
.a-cta:disabled { opacity: 0.5; cursor: not-allowed; }
.a-cta.secundario { background: rgba(168,85,247,0.12); border: 1px solid var(--borde-activo); color: var(--texto-principal); }

.a-ubic { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.a-ubic-btn { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 14px 6px; border-radius: 14px; border: 1.5px solid var(--borde-sutil); background: rgba(255,255,255,0.02); color: var(--texto-secundario); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
.a-ubic-btn.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); color: var(--texto-principal); }
.a-mesa { margin-top: 4px; }

.a-monto { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 16px; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil); }
.a-monto:focus-within { border-color: var(--morado-brillante); }
.a-monto span { font-weight: 800; color: var(--texto-desactivado); }
.a-monto input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--texto-principal); font-size: 1.5rem; font-weight: 800; padding: 8px 0; }
.a-metodos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.metodo-card { display: flex; align-items: center; gap: 12px; text-align: left; padding: 12px; border-radius: 16px; border: 1.5px solid var(--borde-sutil); background: rgba(255,255,255,0.02); color: var(--texto-secundario); cursor: pointer; }
.metodo-card .metodo-ic { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
.metodo-card .metodo-ic.efectivo { background: linear-gradient(135deg, #16A34A, #059669); }
.metodo-card .metodo-ic.qr { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.metodo-card .metodo-txt b { color: var(--texto-principal); font-size: 0.9rem; }
.metodo-card .metodo-check { flex-shrink: 0; margin-left: auto; color: var(--morado-brillante); opacity: 0; transform: scale(0.6); transition: 0.2s ease; }
.metodo-card.seleccionado { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); }
.metodo-card.seleccionado .metodo-check { opacity: 1; transform: scale(1); }

.a-listo { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; background: var(--fondo-tarjeta); border: 1px solid rgba(34,197,94,0.35); border-radius: 20px; padding: 22px 18px; }
.a-listo-ic { width: 60px; height: 60px; border-radius: 50%; background: rgba(34,197,94,0.12); border: 2px solid rgba(34,197,94,0.35); color: var(--color-exito); display: flex; align-items: center; justify-content: center; }
.a-listo > b { color: var(--texto-principal); font-size: 1.15rem; }
.a-cred { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.a-cred-fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.a-cred-fila small { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-desactivado); }
.a-cred-fila b { color: var(--texto-principal); font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; }
.a-cred-fila b.verde { color: var(--color-exito); }
.a-qrs { display: flex; gap: 14px; }
.a-qrs img { width: 108px; height: 108px; border-radius: 10px; background: #fff; }
.a-listo .a-cta { width: 100%; }
</style>
