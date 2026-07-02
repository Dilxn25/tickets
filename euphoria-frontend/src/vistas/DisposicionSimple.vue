<template>
  <!-- Layout operativo: top-bar premium de vidrio + area de trabajo -->
  <div class="layout-simple">
    <!-- Barra superior: marca / rol / salir -->
    <header class="navbar-simple">
      <div class="nav-brillo" aria-hidden="true"></div>

      <!-- Marca -->
      <div class="nav-marca">
        <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="nav-logo hover-crecer" />
        <span class="nav-sep" aria-hidden="true"></span>
        <span class="nav-contexto">Panel operativo</span>
      </div>

      <!-- Identidad + salida -->
      <div class="nav-der">
        <div class="nav-rol" v-if="tienda.usuario?.rol">
          <span class="nav-rol-punto" aria-hidden="true"></span>
          <span class="nav-rol-texto">{{ tienda.usuario?.rol }}</span>
        </div>
        <button class="btn-salir" @click="cerrar" title="Cerrar sesión">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span class="btn-salir-txt">Salir</span>
        </button>
      </div>
    </header>
    <main class="main-simple">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const tienda = useTiendaAutenticacion()

function cerrar() {
  tienda.cerrarSesion()
  // Navegación dura: re-arranca la app limpia en /login (evita quedar en
  // blanco hasta refrescar) y corta sockets/intervalos del turno.
  window.location.assign('/login')
}
</script>

<style scoped>
.layout-simple {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--fondo-app);
}
.navbar-simple {
  height: calc(var(--alto-navbar) + 8px);
  /* Vidrio premium: capa tintada + brillo interno superior */
  background:
    linear-gradient(180deg, rgba(40, 22, 92, 0.55) 0%, rgba(14, 8, 33, 0.82) 100%),
    var(--fondo-navbar);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border-bottom: 1px solid var(--glass-borde);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.75rem;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 12px 40px rgba(10, 6, 26, 0.55);
  overflow: hidden;
}
/* Filo de marca: hilo de gradiente morado -> magenta bajo la navbar */
.navbar-simple::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1.5px;
  background: var(--gradiente-marca-3);
  opacity: 0.55;
  pointer-events: none;
}
/* Glow ambiental sutil detras de la marca */
.nav-brillo {
  position: absolute;
  top: -60%;
  left: -4%;
  width: 320px;
  height: 220%;
  background: radial-gradient(closest-side, rgba(168, 85, 247, 0.22), transparent 70%);
  pointer-events: none;
  filter: blur(6px);
}

.nav-marca {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  position: relative;
  z-index: 1;
  min-width: 0;
}
.nav-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.35));
  transition: var(--trans-normal);
  flex-shrink: 0;
}
.nav-logo:hover {
  filter: drop-shadow(0 0 12px rgba(236, 72, 153, 0.45));
}
.nav-sep {
  width: 1px;
  height: 26px;
  background: linear-gradient(180deg, transparent, var(--borde-activo), transparent);
  flex-shrink: 0;
}
.nav-contexto {
  font-family: var(--fuente-titulo);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--texto-secundario);
  white-space: nowrap;
}
.nav-der {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 1;
}
.nav-rol {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  color: var(--morado-hover);
  font-weight: 600;
  text-transform: capitalize;
  padding: 6px 14px 6px 12px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.13);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  line-height: 1;
}
.nav-rol-punto {
  width: 7px;
  height: 7px;
  border-radius: var(--radio-full);
  background: var(--color-exito);
  box-shadow: 0 0 8px var(--color-exito);
  flex-shrink: 0;
  animation: rol-pulso 2.4s ease-in-out infinite;
}
@keyframes rol-pulso {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(0.82); }
}
.nav-rol-texto {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-salir {
  background: rgba(46, 26, 102, 0.35);
  border: 1px solid var(--glass-borde);
  color: var(--texto-secundario);
  padding: 7px 16px;
  border-radius: var(--radio-full);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--trans-rapida);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.btn-salir svg {
  transition: transform 0.25s ease;
}
.btn-salir:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.08);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.18);
}
.btn-salir:hover svg {
  transform: translateX(2px);
}
.btn-salir:active {
  transform: translateY(1px) scale(0.98);
}
.btn-salir:focus-visible {
  outline: none;
  border-color: var(--color-error);
  color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.28);
}
.main-simple {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  scroll-behavior: smooth;
  animation: entrada-suave 0.4s ease both;
}
@keyframes entrada-suave {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .main-simple { animation: none; }
  .nav-logo,
  .btn-salir,
  .btn-salir svg { transition: none; }
  .nav-rol-punto { animation: none; }
}

/* ===== Tablet: 481px - 1024px ===== */
@media (max-width: 1024px) {
  .navbar-simple {
    padding: 0 1.15rem;
  }
  .nav-der {
    gap: 0.6rem;
  }
}

/* ===== Celular: <= 480px ===== */
@media (max-width: 480px) {
  .navbar-simple {
    padding: 0 0.85rem;
  }
  .nav-logo {
    height: 32px;
  }
  /* En movil, el contexto de marca cede espacio a la identidad/salida */
  .nav-sep,
  .nav-contexto {
    display: none;
  }
  .nav-der {
    gap: 0.5rem;
  }
  .nav-rol {
    font-size: 0.7rem;
    padding: 5px 11px;
    max-width: 36vw;
  }
  .btn-salir {
    padding: 8px 12px;
    font-size: 0.75rem;
    min-height: 40px;
  }
}
</style>
