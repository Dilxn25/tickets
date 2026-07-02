<template>
  <div class="en-construccion fade-in">
    <div class="fondo-orbe"></div>
    <div class="fondo-cuadricula"></div>
    <div class="ec-contenedor escalonar">
      <img
        src="@/activos/imagenes/logo-euphoria.png"
        alt="Euphoria"
        class="ec-logo efecto-flotar"
      />

      <div class="icono-wrapper">
        <div class="anillo anillo-1"></div>
        <div class="anillo anillo-2"></div>
        <span class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M2 20h20"></path><path d="M4 20V10l8-4 8 4v10"></path><line x1="4" y1="14" x2="20" y2="14"></line></svg></span>
      </div>

      <span class="ec-etiqueta">Próximamente</span>
      <h1 class="ec-titulo">Módulo en construcción</h1>
      <p class="ec-desc">
        Estamos afinando cada detalle de este módulo. Estará disponible muy pronto.<br />
        <strong>Gracias por tu paciencia.</strong>
      </p>

      <div class="barra-outer"><div class="barra-inner"></div></div>
      <p class="barra-label">Trabajando en ello</p>

      <button class="btn btn-secundario brillo-hover" @click="volverAlInicio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" class="ec-flecha"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Volver al inicio
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
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--esp-6) var(--esp-5);
  position: relative;
  overflow: hidden;
  background: var(--fondo-app);
}
.fondo-orbe {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 60% at 30% 35%, rgba(168,85,247,0.22) 0%, transparent 68%),
    radial-gradient(ellipse 55% 55% at 72% 65%, rgba(236,72,153,0.14) 0%, transparent 70%);
  animation: derivaOrbe 14s ease-in-out infinite alternate;
}
@keyframes derivaOrbe {
  from { transform: translate3d(-1.5%, -1%, 0) scale(1); }
  to   { transform: translate3d(1.5%, 1.5%, 0) scale(1.06); }
}
/* Halo tenue de marca detras del panel */
.fondo-cuadricula {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at 50% 44%, rgba(168,85,247,0.10) 0%, transparent 55%);
}

.ec-contenedor {
  text-align: center; max-width: 460px; width: 100%;
  background: var(--glass-fondo);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--glass-borde); border-radius: var(--radio-xl);
  padding: var(--esp-7) var(--esp-6) var(--esp-6);
  box-shadow:
    var(--sombra-modal),
    var(--sombra-glow),
    inset 0 1px 0 rgba(255,255,255,0.06);
  position: relative; z-index: 1;
}
/* Borde superior con luz de marca */
.ec-contenedor::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 1px;
  border-radius: var(--radio-xl) var(--radio-xl) 0 0;
  background: linear-gradient(90deg, transparent, rgba(192,132,252,0.7), transparent);
  pointer-events: none;
}

.ec-logo {
  display: block; height: 40px; width: auto; margin: 0 auto var(--esp-6);
  filter: drop-shadow(0 4px 18px rgba(168,85,247,0.4));
}

.icono-wrapper {
  position: relative; width: 92px; height: 92px; margin: 0 auto var(--esp-5);
}
.anillo {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--morado-brillante);
  border-right-color: var(--rosa-acento);
  animation: girar 2s linear infinite;
}
.anillo-2 {
  inset: 13px; animation-duration: 1.4s; animation-direction: reverse;
  border-top-color: var(--morado-hover); border-right-color: transparent;
}
.emoji {
  position: absolute; inset: 0; display: flex;
  align-items: center; justify-content: center;
  color: var(--morado-hover);
  filter: drop-shadow(0 0 14px rgba(168,85,247,0.5));
}
@keyframes girar { to { transform: rotate(360deg); } }

.ec-etiqueta {
  display: inline-block; margin-bottom: var(--esp-3);
  padding: var(--esp-1) var(--esp-4);
  font-family: var(--fuente-titulo);
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--morado-hover);
  background: rgba(168,85,247,0.12);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-full);
}

.ec-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em;
  line-height: 1.2; text-wrap: balance;
  margin-bottom: var(--esp-3);
  color: var(--texto-principal);
}
.ec-desc {
  color: var(--texto-secundario); line-height: 1.7;
  margin: 0 auto var(--esp-6); font-size: 0.92rem;
  max-width: 34ch; text-wrap: pretty;
}
.ec-desc strong { color: var(--morado-hover); font-weight: 600; }

.barra-outer {
  height: 5px; background: rgba(255,255,255,0.07);
  border-radius: var(--radio-full); overflow: hidden;
  margin-bottom: var(--esp-2);
}
.barra-inner {
  height: 100%; width: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--morado-brillante) 35%,
    var(--rosa-acento) 65%,
    transparent 100%);
  background-size: 220% 100%;
  border-radius: var(--radio-full);
  animation: barrer 1.8s var(--ease-suave) infinite;
}
@keyframes barrer {
  0%   { background-position: 150% 0; }
  100% { background-position: -80% 0; }
}
.barra-label {
  font-family: var(--fuente-titulo);
  font-size: 0.74rem; letter-spacing: 0.04em;
  color: var(--texto-desactivado);
  margin-bottom: var(--esp-6);
}

.btn-secundario { gap: var(--esp-2); }
.ec-flecha { transition: transform 0.25s var(--ease-rebote); }
.btn-secundario:hover .ec-flecha { transform: translateX(-3px); }

@media (max-width: 480px) {
  .ec-contenedor { padding: var(--esp-6) var(--esp-5); }
  .ec-titulo { font-size: 1.5rem; }
}

@media (prefers-reduced-motion: reduce) {
  .fondo-orbe,
  .anillo,
  .barra-inner,
  .efecto-flotar { animation: none; }
}
</style>
