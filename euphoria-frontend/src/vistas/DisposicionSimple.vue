<template>
  <!-- Layout mínimo para roles aún en construcción -->
  <div class="layout-simple">
    <!-- Navbar pequeño con logo y cerrar sesión -->
    <header class="navbar-simple">
      <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="nav-logo" />
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
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--borde-sutil);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(155,89,182,0.5));
}
.nav-der {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.nav-rol {
  font-size: 0.8rem;
  color: var(--morado-brillante);
  font-weight: 500;
}
.btn-salir {
  background: transparent;
  border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario);
  padding: 6px 14px;
  border-radius: var(--radio-full);
  font-size: 0.8rem;
  cursor: pointer;
  transition: var(--trans-rapida);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.btn-salir:hover {
  border-color: var(--color-error);
  color: var(--color-error);
}
.main-simple {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
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
    font-size: 0.72rem;
    max-width: 30vw;
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
