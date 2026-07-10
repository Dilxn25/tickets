<template>
  <!-- Campo de teléfono con prefijo de país fijo (Bolivia +591) SIEMPRE visible,
       para que quede claro que el número está completo y sirva para WhatsApp. -->
  <div class="tel-raiz" :class="{ 'tel-error': !!error, 'tel-deshabilitado': disabled }">
    <span class="tel-prefijo" aria-hidden="true">
      <span class="tel-bandera">
        <svg viewBox="0 0 9 6" width="18" height="12">
          <rect width="9" height="2" y="0" fill="#D52B1E"/>
          <rect width="9" height="2" y="2" fill="#F9E300"/>
          <rect width="9" height="2" y="4" fill="#007934"/>
        </svg>
      </span>
      +591
    </span>
    <input
      :value="local"
      @input="alEscribir"
      type="tel"
      inputmode="numeric"
      class="tel-input"
      :placeholder="placeholder"
      :disabled="disabled"
      maxlength="8"
      autocomplete="tel-national"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Ej. 70000000' },
  disabled: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

// El valor puede llegar como "+59170000000", "59170000000" o "70000000".
// Mostramos solo la parte local (8 dígitos) y guardamos el número completo con prefijo.
const local = computed(() => {
  const soloDigitos = String(props.modelValue || '').replace(/\D/g, '')
  const sinPrefijo = soloDigitos.startsWith('591') ? soloDigitos.slice(3) : soloDigitos
  return sinPrefijo.slice(0, 8)
})

function alEscribir(e) {
  const digitos = e.target.value.replace(/\D/g, '').slice(0, 8)
  // Guardamos con prefijo para que WhatsApp/llamadas funcionen; vacío si no hay número.
  emit('update:modelValue', digitos ? '+591' + digitos : '')
}
</script>

<style scoped>
.tel-raiz {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--borde, rgba(255,255,255,.16));
  border-radius: var(--radio-md, 10px);
  background: var(--fondo, rgba(255,255,255,.04));
  overflow: hidden;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.tel-raiz:focus-within {
  border-color: var(--color-primario, #a855f7);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primario, #a855f7) 18%, transparent);
}
.tel-raiz.tel-error { border-color: var(--color-error, #ef4444); }
.tel-raiz.tel-deshabilitado { opacity: .6; }
.tel-prefijo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--texto-secundario, #b9b3c7);
  background: color-mix(in srgb, var(--color-primario, #a855f7) 10%, transparent);
  border-right: 1px solid var(--borde, rgba(255,255,255,.16));
  white-space: nowrap;
  user-select: none;
}
.tel-bandera {
  display: inline-flex;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0,0,0,.15);
}
.tel-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--texto-principal, #f5f3fa);
  font-size: 0.95rem;
  padding: 10px 12px;
  letter-spacing: 0.02em;
}
.tel-input:focus { outline: none; }
.tel-input::placeholder { color: var(--texto-desactivado, #7a7488); }
</style>
