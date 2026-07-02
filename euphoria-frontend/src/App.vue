<template>
  <!-- Transición suave al cambiar de layout (login ↔ paneles de rol).
       Las sub-páginas dentro de cada panel animan su entrada con .fade-in. -->
  <RouterView v-slot="{ Component }">
    <transition name="pagina" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>
</template>
