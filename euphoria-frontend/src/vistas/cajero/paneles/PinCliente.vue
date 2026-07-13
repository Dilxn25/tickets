<template>
  <div class="pin">
    <p class="pin-txt">Nuevo PIN de 4 dígitos (pídeselo al cliente en voz baja).</p>
    <input
      v-model="pin" type="password" inputmode="numeric" maxlength="4"
      class="pin-input" placeholder="••••"
      @input="pin = pin.replace(/\D/g, '').slice(0, 4)" @keyup.enter="guardar" />
    <p v-if="error" class="pin-error">{{ error }}</p>
    <p v-if="ok" class="pin-ok">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
      PIN actualizado
    </p>
    <button class="pin-cta" :disabled="pin.length !== 4 || cargando" @click="guardar">
      {{ cargando ? 'Guardando…' : 'Cambiar PIN' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const props = defineProps({ cliente: { type: Object, required: true } })
const emit = defineEmits(['hecho'])
const pin = ref('')
const cargando = ref(false)
const error = ref('')
const ok = ref(false)

async function guardar() {
  if (pin.value.length !== 4 || cargando.value) return
  cargando.value = true
  error.value = ''
  ok.value = false
  try {
    await clienteHttp.post('/cajero/resetear-pin', { id_usuario: props.cliente.id_usuario, nuevo_pin: pin.value })
    ok.value = true
    pin.value = ''
    emit('hecho')
  } catch (e) {
    error.value = e?.error || 'No se pudo cambiar el PIN.'
  } finally { cargando.value = false }
}
</script>

<style scoped>
.pin { display: flex; flex-direction: column; gap: 12px; max-width: 320px; }
.pin-txt { margin: 0; font-size: 0.82rem; color: var(--texto-secundario); }
.pin-input {
  width: 100%; box-sizing: border-box; text-align: center;
  padding: 12px; border-radius: 14px; outline: none;
  background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil);
  color: var(--texto-principal); font-size: 1.8rem; font-weight: 800; letter-spacing: 12px;
}
.pin-input:focus { border-color: var(--morado-brillante); }
.pin-error { margin: 0; font-size: 0.82rem; color: var(--color-error); }
.pin-ok { margin: 0; font-size: 0.84rem; color: var(--color-exito); font-weight: 700; display: flex; align-items: center; gap: 6px; }
.pin-cta { padding: 13px; border: none; border-radius: 14px; cursor: pointer; background: var(--gradiente-marca); color: #fff; font-weight: 800; }
.pin-cta:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
