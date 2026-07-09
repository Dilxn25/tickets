<template>
  <transition name="fade">
    <div v-if="resultado" class="resultado" :class="resultado.tipo">
      <div class="res-icono">
        <svg v-if="resultado.tipo === 'ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <div class="res-texto">
        <b>{{ resultado.titulo }}</b>
        <p>{{ resultado.detalle }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ resultado: { type: Object, default: null } })
</script>

<style scoped>
.resultado { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radio-md); animation: aparecer 0.3s ease both; }
.resultado.ok { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.35); }
.resultado.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.35); }
.res-icono { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.resultado.ok .res-icono { background: rgba(34,197,94,0.2); color: var(--color-exito); }
.resultado.error .res-icono { background: rgba(239,68,68,0.2); color: var(--color-error); }
.res-icono svg { width: 22px; height: 22px; }
.res-texto b { color: var(--texto-principal); font-size: 0.95rem; }
.res-texto p { color: var(--texto-secundario); font-size: 0.82rem; margin-top: 2px; }
@keyframes aparecer { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
