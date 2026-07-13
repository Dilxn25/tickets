<template>
  <div class="qrs">
    <div class="qrs-par">
      <button class="qrs-card" @click="grande = 'publico'">
        <img v-if="qrPublico" :src="qrPublico" alt="QR público" />
        <b>QR público</b>
        <small>cobro directo</small>
      </button>
      <button class="qrs-card privado" @click="grande = 'privado'">
        <img v-if="qrPrivado" :src="qrPrivado" alt="QR privado" />
        <b>QR privado</b>
        <small>pide su PIN</small>
      </button>
    </div>
    <button class="qrs-imprimir" @click="imprimir">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Imprimir tarjeta
    </button>

    <Teleport to="body">
      <div v-if="grande" class="qr-fullscreen" @click="grande = null">
        <p class="qr-fs-titulo">{{ cliente.qr_publico }}</p>
        <img :src="grande === 'publico' ? qrPublico : qrPrivado" alt="QR" class="qr-fs-img" />
        <p class="qr-fs-hint">{{ grande === 'publico' ? 'QR público · cobro directo' : 'QR privado · protegido con PIN' }} · Toca para cerrar</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({ cliente: { type: Object, required: true } })
const qrPublico = ref('')
const qrPrivado = ref('')
const grande = ref(null)

onMounted(async () => {
  const opts = { width: 400, margin: 1, color: { dark: '#10002b', light: '#ffffff' } }
  if (props.cliente.qr_publico) qrPublico.value = await QRCode.toDataURL(props.cliente.qr_publico, opts)
  if (props.cliente.token_qr) qrPrivado.value = await QRCode.toDataURL(props.cliente.token_qr, opts)
})

// Tarjeta imprimible: iframe aislado (mismo patrón aprobado de credenciales)
function imprimir() {
  const html = `
    <html><head><title>Billetera Euphoria</title><style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; text-align: center; color: #10002b; padding: 24px; }
      h2 { margin: 0 0 2px; } .cod { font-size: 20px; font-weight: 800; letter-spacing: 1px; margin: 4px 0 14px; }
      .par { display: flex; gap: 24px; justify-content: center; }
      .qr { text-align: center; } .qr img { width: 220px; }
      .qr b { display: block; margin-top: 6px; font-size: 13px; }
      .qr small { color: #666; font-size: 11px; }
    </style></head><body>
      <h2>${props.cliente.nombres || ''} ${props.cliente.apellidos || ''}</h2>
      <div class="cod">${props.cliente.qr_publico || ''}</div>
      <div class="par">
        <div class="qr"><img src="${qrPublico.value}" /><b>QR público</b><small>cobro directo</small></div>
        ${qrPrivado.value ? `<div class="qr"><img src="${qrPrivado.value}" /><b>QR privado</b><small>pide su PIN</small></div>` : ''}
      </div>
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
</script>

<style scoped>
.qrs { display: flex; flex-direction: column; gap: 12px; }
.qrs-par { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.qrs-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px; border-radius: 16px; cursor: zoom-in;
  background: rgba(255,255,255,0.02); border: 1.5px solid var(--borde-sutil);
}
.qrs-card:hover { border-color: var(--borde-activo); }
.qrs-card.privado { border-style: dashed; }
.qrs-card img { width: 110px; height: 110px; border-radius: 10px; background: #fff; }
.qrs-card b { color: var(--texto-principal); font-size: 0.82rem; margin-top: 6px; }
.qrs-card small { color: var(--texto-desactivado); font-size: 0.7rem; }
.qrs-imprimir {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px; border-radius: 14px; cursor: pointer;
  border: 1px solid var(--borde-activo); background: rgba(168,85,247,0.1);
  color: var(--texto-principal); font-weight: 700; font-size: 0.86rem;
}
.qrs-imprimir:hover { background: rgba(168,85,247,0.18); }

.qr-fullscreen { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; background: #fff; cursor: pointer; }
.qr-fs-titulo { font-size: 1.5rem; font-weight: 800; color: #10002b; margin: 0; letter-spacing: 0.04em; }
.qr-fs-img { width: min(80vw, 60vh); max-height: 60vh; object-fit: contain; }
.qr-fs-hint { color: #666; font-size: 0.85rem; margin: 0; }
</style>
