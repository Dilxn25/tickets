<template>
  <div class="en-construccion fade-in">
    <div class="fondo-orbe"></div>
    <div class="ec-contenedor">
      <div class="icono-wrapper">
        <div class="anillo anillo-1"></div>
        <div class="anillo anillo-2"></div>
        <span class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M2 20h20"></path><path d="M4 20V10l8-4 8 4v10"></path><line x1="4" y1="14" x2="20" y2="14"></line></svg></span>
      </div>
      <h1 class="ec-titulo">Módulo en Construcción</h1>
      <p class="ec-desc">
        Este módulo está siendo desarrollado y estará disponible muy pronto.<br />
        <strong>Gracias por tu paciencia.</strong>
      </p>
      <div class="barra-outer"><div class="barra-inner"></div></div>
      <p class="barra-label">Trabajando en ello...</p>

      <button class="btn btn-secundario" @click="volverAlInicio">
        ← Volver al inicio
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const router = useRouter()
const tienda = useTiendaAutenticacion()

function volverAlInicio() {
  // Si tiene sesión, lo lleva a su panel. Si no, al login.
  if (tienda.estaAutenticado) {
    router.push(`/${tienda.rolRuta}`)
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
.en-construccion {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  background: var(--fondo-app);
}
.fondo-orbe {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 60% at 30% 40%, rgba(74,44,143,0.25) 0%, transparent 70%),
    radial-gradient(ellipse 50% 50% at 70% 60%, rgba(194,24,91,0.1) 0%, transparent 70%);
}
.ec-contenedor {
  text-align: center; max-width: 480px; width: 100%;
  background: var(--glass-fondo); backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-borde); border-radius: var(--radio-xl);
  padding: 3rem 2.5rem; box-shadow: var(--sombra-modal), var(--sombra-glow);
  position: relative; z-index: 1;
}
.icono-wrapper {
  position: relative; width: 90px; height: 90px; margin: 0 auto 1.8rem;
}
.anillo {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--morado-brillante);
  border-right-color: var(--rosa-acento);
  animation: girar 2s linear infinite;
}
.anillo-2 {
  inset: 12px; animation-duration: 1.4s; animation-direction: reverse;
  border-top-color: var(--morado-hover); border-right-color: transparent;
}
.emoji {
  position: absolute; inset: 0; display: flex;
  align-items: center; justify-content: center; font-size: 2.4rem;
}
@keyframes girar { to { transform: rotate(360deg); } }

.ec-titulo { font-size: 1.7rem; margin-bottom: 0.8rem; color: var(--texto-principal); }
.ec-desc { color: var(--texto-secundario); line-height: 1.7; margin-bottom: 1.8rem; font-size: 0.9rem; }
.ec-desc strong { color: var(--morado-brillante); }

.barra-outer { height: 5px; background: rgba(255,255,255,0.07); border-radius: var(--radio-full); overflow: hidden; margin-bottom: 0.5rem; }
.barra-inner { height: 100%; width: 55%; background: linear-gradient(90deg, var(--morado-brillante), var(--rosa-acento)); border-radius: var(--radio-full); animation: pulsar 2s ease-in-out infinite; }
@keyframes pulsar { 0%,100%{opacity:1} 50%{opacity:0.4} }
.barra-label { font-size: 0.75rem; color: var(--texto-desactivado); margin-bottom: 2rem; }
</style>
