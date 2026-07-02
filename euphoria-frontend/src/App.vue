<template>
  <!-- Transición suave al cambiar de layout (login ↔ paneles de rol).
       Las sub-páginas dentro de cada panel animan su entrada con .fade-in. -->
  <RouterView v-slot="{ Component }">
    <transition name="pagina" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>

  <!-- Capa global de avisos: toasts + confirmaciones (reemplaza alert/confirm/prompt) -->
  <CapaNotificaciones />
</template>

<script setup>
import CapaNotificaciones from '@/componentes/comunes/CapaNotificaciones.vue'
</script>
