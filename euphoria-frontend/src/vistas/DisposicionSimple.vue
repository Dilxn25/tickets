<template>
  <!-- Layout mínimo para roles aún en construcción -->
  <div class="layout-simple">
    <!-- Navbar pequeño con logo y cerrar sesión -->
    <header class="navbar-simple">
      <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="nav-logo hover-crecer" />
      <div class="nav-der">
        <span class="nav-rol">{{ tienda.usuario?.rol }}</span>
        <button class="btn-salir" @click="cerrar" title="Cerrar sesión">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Salir
        </button>
      </div>
    </header>
    <main class="main-simple">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const tienda = useTiendaAutenticacion()
const router = useRouter()

function cerrar() {
  tienda.cerrarSesion()
  router.push('/login')
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
  height: var(--alto-navbar);
  background: var(--fondo-navbar);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--borde-sutil);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
}
/* Filo de marca: hilo de gradiente morado -> magenta bajo la navbar */
.navbar-simple::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: var(--gradiente-marca);
  opacity: 0.55;
  pointer-events: none;
}
.nav-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.55));
  transition: var(--trans-normal);
}
.nav-logo:hover {
  filter: drop-shadow(0 0 16px rgba(236, 72, 153, 0.6));
}
.nav-der {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.nav-rol {
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  color: var(--morado-hover);
  font-weight: 600;
  text-transform: capitalize;
  padding: 5px 12px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--borde-sutil);
  line-height: 1;
}
.btn-salir {
  background: transparent;
  border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario);
  padding: 6px 15px;
  border-radius: var(--radio-full);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--trans-rapida);
  display: flex;
  align-items: center;
  gap: 0.45rem;
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
}

/* ===== Tablet: 481px - 1024px ===== */
@media (max-width: 1024px) {
  .navbar-simple {
    padding: 0 1rem;
  }
  .nav-der {
    gap: 0.75rem;
  }
}

/* ===== Celular: <= 480px ===== */
@media (max-width: 480px) {
  .navbar-simple {
    padding: 0 0.75rem;
  }
  .nav-logo {
    height: 32px;
  }
  .nav-der {
    gap: 0.5rem;
  }
  .nav-rol {
    font-size: 0.7rem;
    padding: 4px 10px;
    max-width: 34vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .btn-salir {
    padding: 8px 12px;
    font-size: 0.75rem;
    min-height: 40px;
  }
}
</style>
