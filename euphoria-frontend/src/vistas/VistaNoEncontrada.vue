<template>
  <div class="vista-error fade-in">
    <div class="error-aura" aria-hidden="true"></div>

    <div class="error-contenido escalonar">
      <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="error-logo efecto-flotar" />

      <div class="error-numero" aria-hidden="true">404</div>

      <div class="error-icono">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>

      <h1 class="error-titulo">Acceso denegado o ruta no encontrada</h1>
      <p class="error-descripcion">
        Esta página no existe o no tienes acceso.
      </p>
      <button class="btn-regresar brillo-hover" @click="regresarAlMenu">
        Volver a mi menú principal
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const router = useRouter()
const tienda = useTiendaAutenticacion()

function regresarAlMenu() {
  if (tienda.estaAutenticado) {
    router.push(`/${tienda.rolRuta}`)
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
.vista-error {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  background: var(--fondo-app);
  padding: var(--esp-5) var(--esp-4);
  overflow: hidden;
}

/* Aura ambiental morado/magenta detrás de la tarjeta (identidad de marca) */
.error-aura {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(520px 420px at 50% 34%, rgba(168, 85, 247, 0.28), transparent 70%),
    radial-gradient(560px 460px at 78% 88%, rgba(236, 72, 153, 0.20), transparent 72%),
    radial-gradient(480px 400px at 18% 12%, rgba(91, 47, 184, 0.22), transparent 70%);
  filter: saturate(1.05);
}

.error-contenido {
  position: relative;
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl);
  padding: var(--esp-7) var(--esp-6) calc(var(--esp-7) + var(--esp-2));
  text-align: center;
  max-width: 420px;
  width: 100%;
  box-shadow:
    var(--sombra-modal),
    0 24px 60px rgba(168, 85, 247, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.error-logo {
  width: 100%;
  max-width: 180px;
  height: auto;
  object-fit: contain;
  display: block;
  margin: 0 auto var(--esp-5);
  filter: drop-shadow(0 0 18px rgba(168, 85, 247, 0.45));
}

/* 404 en gradiente de marca, como marca de agua sobre la que reposa el icono */
.error-numero {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: clamp(4.5rem, 22vw, 6rem);
  line-height: 0.9;
  letter-spacing: -0.04em;
  background: var(--gradiente-marca-3);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: calc(var(--esp-4) * -1);
  filter: drop-shadow(0 6px 28px rgba(168, 85, 247, 0.35));
}

.error-icono {
  position: relative;
  width: 56px;
  height: 56px;
  color: var(--color-error);
  margin: 0 auto var(--esp-5);
  filter: drop-shadow(0 4px 12px rgba(239, 68, 68, 0.35));
}
.error-icono svg { width: 100%; height: 100%; }

.error-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.55rem;
  font-weight: 700;
  color: var(--texto-principal);
  letter-spacing: -0.01em;
  margin-bottom: var(--esp-3);
  line-height: 1.25;
  text-wrap: balance;
}

.error-descripcion {
  font-size: 0.95rem;
  color: var(--texto-secundario);
  margin: 0 auto var(--esp-6);
  max-width: 40ch;
  line-height: 1.65;
  text-wrap: pretty;
}

.btn-regresar {
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  padding: 15px 26px;
  border-radius: var(--radio-full);
  font-family: var(--fuente-titulo);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  width: 100%;
  transition: transform 0.22s var(--ease-suave), box-shadow 0.25s ease, filter 0.25s ease;
  box-shadow: 0 8px 22px rgba(168, 85, 247, 0.40), var(--glow-morado);
}
.btn-regresar:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 12px 30px rgba(168, 85, 247, 0.55), var(--glow-rosa);
}
.btn-regresar:active {
  transform: translateY(0) scale(0.985);
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.42);
}
.btn-regresar:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco), 0 10px 26px rgba(168, 85, 247, 0.45);
}

@media (max-width: 480px) {
  .error-contenido {
    padding: var(--esp-6) var(--esp-5) var(--esp-7);
    border-radius: var(--radio-lg);
  }
  .error-logo { max-width: 150px; }
  .error-titulo { font-size: 1.35rem; }
}

@media (prefers-reduced-motion: reduce) {
  .error-logo { animation: none; }
  .btn-regresar { transition: box-shadow 0.2s ease; }
  .btn-regresar:hover,
  .btn-regresar:active { transform: none; }
}
</style>
