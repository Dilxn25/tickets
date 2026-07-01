<template>
  <div class="layout-cliente">
    <!-- Navbar Superior -->
    <header class="navbar-top">
      <div class="logo-contenedor">
        <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="logo-img" />
      </div>
      <div class="acciones-usuario">
        <div class="user-avatar" @click="irPerfil" title="Mi perfil">
          <img v-if="urlFoto" :src="urlFoto" class="avatar-img" alt="Perfil" />
          <span v-else>{{ iniciales }}</span>
        </div>
        <button class="btn-salir-top" @click="cerrarSesion" title="Cerrar sesión" type="button" aria-label="Cerrar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="contenido-scroll">
      <div class="contenedor-vista">
        <RouterView />
      </div>
    </main>

    <!-- Navbar Inferior (Bottom Tabs) -->
    <nav class="navbar-bottom">
      <RouterLink to="/cliente/inicio" class="tab-item" active-class="activo">
        <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>Inicio</span>
      </RouterLink>
      <RouterLink to="/cliente/catalogo" class="tab-item" active-class="activo">
        <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>Catálogo</span>
      </RouterLink>
      <RouterLink to="/cliente/eventos" class="tab-item" active-class="activo">
        <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span>Eventos</span>
      </RouterLink>
      <RouterLink to="/cliente/billetera" class="tab-item" active-class="activo">
        <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        <span>Billetera</span>
      </RouterLink>
      <RouterLink to="/cliente/carrito" class="tab-item" active-class="activo">
        <div class="icono-badge-wrapper">
          <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        </div>
        <span>Carrito</span>
      </RouterLink>
      <RouterLink to="/cliente/perfil" class="tab-item" active-class="activo">
        <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>Perfil</span>
      </RouterLink>
    </nav>

    <!-- Modal de Cerrar Sesión Custom -->
    <div v-if="modalLogout" class="modal-overlay fade-in">
      <div class="modal-logout">
        <div class="icono-logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </div>
        <h3>¿Cerrar sesión?</h3>
        <p>¿Estás seguro de que deseas salir de tu cuenta?</p>
        <div class="modal-acciones">
          <button class="btn-cancelar" @click="modalLogout = false">Cancelar</button>
          <button class="btn-confirmar" @click="confirmarCerrarSesion">Sí, salir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const tienda = useTiendaAutenticacion()
const router = useRouter()

const iniciales = computed(() => {
  const n = tienda.usuario?.nombres || ''
  return n.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
})

const urlFoto = computed(() => tienda.usuario?.url_foto_perfil || tienda.usuario?.foto || null)

const modalLogout = ref(false)

function irPerfil() {
  router.push('/cliente/perfil')
}

function cerrarSesion() {
  modalLogout.value = true
}

function confirmarCerrarSesion() {
  modalLogout.value = false
  tienda.cerrarSesion()
  router.push('/login')
}
</script>

<style scoped>
.layout-cliente {
  display: flex;
  flex-direction: column;
  height: 100vh; /* fallback */
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--fondo-app);
  color: var(--texto-principal);
}

/* Header Navbar */
.navbar-top {
  height: 70px;
  background: rgba(26, 17, 40, 0.85);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 50;
}

.logo-contenedor {
  display: flex;
  align-items: center;
}
.logo-img {
  height: 38px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(155, 89, 182, 0.6));
}

.acciones-usuario {
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-salir-top {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--color-error);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-salir-top svg { width: 20px; height: 20px; }
.btn-salir-top:hover {
  background: var(--color-error);
  color: #fff;
}
.btn-salir-top:active { transform: scale(0.94); }

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: transform 0.2s;
}
.user-avatar:active {
  transform: scale(0.95);
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* Contenido Scroll */
.contenido-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 80px; /* Espacio para el navbar bottom */
  -webkit-overflow-scrolling: touch;
}

/* Columna de contenido: en celular ocupa todo; en tablet/PC se centra y limita su ancho */
.contenedor-vista {
  width: 100%;
  margin: 0 auto;
}

/* Bottom Tabs */
.navbar-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: rgba(26, 17, 40, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 50;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.3);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--texto-secundario);
  text-decoration: none;
  gap: 4px;
  transition: var(--trans-rapida);
  flex: 1;
  min-width: 0;
  height: 100%;
}

.tab-item span {
  font-size: 0.7rem;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icono {
  width: 24px;
  height: 24px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tab-item.activo {
  color: var(--rosa-acento);
}
.tab-item.activo .icono {
  transform: scale(1.15) translateY(-2px);
  filter: drop-shadow(0 0 8px rgba(219,39,119,0.6));
}

/* Modal Cerrar Sesión */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
  z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.modal-logout {
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  border-radius: 20px; padding: 2rem; text-align: center; max-width: 300px; width: 100%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.icono-logout {
  width: 68px;
  height: 68px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.icono-logout svg { width: 30px; height: 30px; }
.modal-logout h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--texto-principal); }
.modal-logout p { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 1.5rem; }
.modal-acciones { display: flex; gap: 10px; }
.btn-cancelar {
  flex: 1; background: var(--fondo-tarjeta-alt); color: var(--texto-secundario);
  border: 1px solid var(--borde-sutil); padding: 10px; border-radius: 12px; font-weight: 600;
}
.btn-confirmar {
  flex: 1; background: rgba(231,76,60,0.15); color: var(--color-error);
  border: 1px solid rgba(231,76,60,0.3); padding: 10px; border-radius: 12px; font-weight: 600;
}
.btn-cancelar:active, .btn-confirmar:active { transform: scale(0.95); }

@media (min-width: 768px) {
  .layout-cliente {
    max-width: 100%;
    margin: 0;
    border: none;
    box-shadow: none;
  }
}

/* Celular (<=480px) */
@media (max-width: 480px) {
  .navbar-top {
    height: 60px;
    padding: 0 1rem;
  }
  .logo-img {
    height: 32px;
  }
  .tab-item span {
    font-size: 0.62rem;
  }
  .tab-item {
    gap: 3px;
  }
  .icono {
    width: 22px;
    height: 22px;
  }
  .modal-logout {
    padding: 1.5rem;
    max-width: 100%;
  }
}

/* Tablet (481px - 1024px): el contenido se centra en una columna cómoda */
@media (min-width: 481px) and (max-width: 1024px) {
  .navbar-top {
    padding: 0 2rem;
  }
  .contenedor-vista {
    max-width: 820px;
  }
  .tab-item span {
    font-size: 0.8rem;
  }
}

/* Escritorio (>1024px): interfaz centrada tipo "app", NO estirada de borde a borde.
   - El contenido se limita a una columna ancha centrada.
   - La barra inferior se convierte en una píldora flotante centrada. */
@media (min-width: 1025px) {
  .navbar-top {
    padding: 0 max(2rem, calc((100% - 1100px) / 2));
  }
  .contenido-scroll {
    padding-bottom: 110px;
  }
  .contenedor-vista {
    max-width: 1100px;
    padding: 0 1rem;
  }
  .navbar-bottom {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: auto;
    max-width: 640px;
    bottom: 18px;
    height: 66px;
    padding: 0 1rem;
    gap: 0.5rem;
    border-radius: var(--radio-xl, 24px);
    border: 1px solid var(--borde-sutil);
  }
  .tab-item {
    flex: 1 1 auto;
    min-width: 74px;
    max-width: 110px;
    border-radius: var(--radio-md, 10px);
  }
  .tab-item span {
    font-size: 0.75rem;
  }
}
</style>
