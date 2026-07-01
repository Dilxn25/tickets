<template>
  <div class="layout-admin-raiz">

    <!-- Overlay móvil -->
    <div
      v-if="!colapsado && esMovil"
      class="overlay"
      @click="colapsado = true"
    />

    <!-- ══════════ SIDEBAR ══════════ -->
    <aside
      class="sidebar-euphoria"
      :class="{
        'sidebar-angosto': colapsado,
        'sidebar-movil-oculto': esMovil && colapsado,
        'sidebar-movil-visible': esMovil && !colapsado,
      }"
    >
      <!-- Logo -->
      <div class="sidebar-logo-area">
        <img
          src="@/activos/imagenes/logo-euphoria.png"
          alt="Euphoria"
          class="sidebar-logo-img"
          :class="colapsado ? 'sidebar-logo-chico' : 'sidebar-logo-grande'"
        />
      </div>

      <!-- Navegación -->
      <nav class="sidebar-nav-area">
        <RouterLink
          v-for="item in menuItems"
          :key="item.ruta"
          :to="`/administrador/${item.ruta}`"
          class="nav-link"
          :class="{ 'nav-link-activo': rutaActual.includes(item.ruta) }"
          @click="esMovil ? colapsado = true : null"
        >
          <span class="nav-link-icono" v-html="item.icono" />
          <span v-if="!colapsado" class="nav-link-texto">{{ item.nombre }}</span>
        </RouterLink>
      </nav>

      <!-- Footer: usuario + logout -->
      <div class="sidebar-footer-area">
        <div v-if="!colapsado" class="sidebar-usuario">
          <div class="sidebar-avatar">
            <img v-if="urlFoto" :src="urlFoto" alt="Perfil" class="avatar-img" />
            <span v-else>{{ iniciales }}</span>
          </div>
          <div class="sidebar-usuario-info">
            <p class="sidebar-usuario-nombre">{{ tienda.usuario?.nombres }}</p>
            <p class="sidebar-usuario-rol">{{ tienda.usuario?.rol }}</p>
          </div>
        </div>

        <button class="btn-salir" @click="cerrar" :title="colapsado ? 'Cerrar sesión' : ''">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span v-if="!colapsado">Salir</span>
        </button>
      </div>
    </aside>

    <!-- ══════════ CONTENIDO PRINCIPAL ══════════ -->
    <main class="contenido-admin">

      <!-- Navbar top -->
      <header class="navbar-admin">
        <div class="navbar-izq">
          <button class="btn-hamburger" @click="colapsado = !colapsado">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h2 class="navbar-titulo">{{ tituloPagina }}</h2>
        </div>
        <div class="navbar-der">
          <span class="badge-online">
            <span class="badge-online-punto" />
            En línea
          </span>
        </div>
      </header>

      <!-- Vista -->
      <div class="vista-admin fade-in">
        <RouterView />
      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const tienda = useTiendaAutenticacion()
const router = useRouter()
const ruta   = useRoute()

const anchoVentana = ref(window.innerWidth)
const esMovil      = computed(() => anchoVentana.value <= 768)
const colapsado    = ref(esMovil.value)

function actualizarAncho() {
  anchoVentana.value = window.innerWidth
  colapsado.value = esMovil.value
}
onMounted(()   => window.addEventListener('resize', actualizarAncho))
onUnmounted(() => window.removeEventListener('resize', actualizarAncho))

const menuItems = [
  { ruta: 'usuarios',  nombre: 'Usuarios',   icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { ruta: 'productos', nombre: 'Productos',  icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 20 16z"/></svg>' },
  { ruta: 'eventos',   nombre: 'Eventos',    icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { ruta: 'ventas',    nombre: 'Ventas',     icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
  { ruta: 'zonas',     nombre: 'Zonas',      icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>' },
  { ruta: 'reportes',  nombre: 'Reportes',   icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
]

const rutaActual   = computed(() => ruta.path)
const tituloPagina = computed(() => menuItems.find(m => ruta.path.includes(m.ruta))?.nombre ?? 'Panel')
const iniciales    = computed(() => (tienda.usuario?.nombres ?? '').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase())
const urlFoto      = computed(() => tienda.usuario?.url_foto_perfil ?? tienda.usuario?.foto ?? null)

function cerrar() {
  tienda.cerrarSesion()
  router.push('/login')
}
</script>

<style scoped>
/* ─── Raíz ─────────────────────────────────────────────────────────────── */
.layout-admin-raiz {
  display: flex;
  min-height: 100vh;
  background: var(--fondo-app);
  position: relative;
}

/* Overlay móvil */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 40;
}

/* ─── Sidebar ───────────────────────────────────────────────────────────── */
.sidebar-euphoria {
  width: 240px;
  background: var(--fondo-sidebar);
  border-right: 1px solid var(--borde-sutil);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 50;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-angosto { width: 72px; }

/* Mobile */
@media (max-width: 768px) {
  .sidebar-euphoria {
    position: fixed;
    left: 0; top: 0;
    height: 100vh;
    width: 240px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar-movil-oculto  { transform: translateX(-100%); }
  .sidebar-movil-visible { transform: translateX(0); }
}

/* ─── Logo ──────────────────────────────────────────────────────────────── */
.sidebar-logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76px;
  padding: 1rem;
  border-bottom: 1px solid var(--borde-sutil);
  flex-shrink: 0;
}
.sidebar-logo-img {
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 8px rgba(155, 89, 182, 0.45));
  transition: all 0.3s ease;
}
.sidebar-logo-grande { height: 44px; width: auto; max-width: 180px; }
.sidebar-logo-chico  { height: 32px; width: auto; }

/* ─── Nav ───────────────────────────────────────────────────────────────── */
.sidebar-nav-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 1rem 0.6rem;
  overflow-y: auto;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 10px;
  color: var(--texto-secundario);
  font-size: 0.88rem;
  font-weight: 500;
  transition: var(--trans-normal);
  white-space: nowrap;
  text-decoration: none;
}
.nav-link:hover {
  background: rgba(155, 89, 182, 0.1);
  color: var(--texto-principal);
}
.nav-link-activo {
  background: linear-gradient(135deg, rgba(74,44,143,0.25), rgba(194,24,91,0.15));
  color: var(--texto-principal);
  border-left: 3px solid var(--morado-brillante);
  padding-left: 9px;
}
.nav-link-icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  color: inherit;
}
.nav-link-texto { flex: 1; }

/* ─── Footer sidebar ────────────────────────────────────────────────────── */
.sidebar-footer-area {
  padding: 0.9rem 0.75rem;
  border-top: 1px solid var(--borde-sutil);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sidebar-usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}
.sidebar-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.sidebar-usuario-info { overflow: hidden; }
.sidebar-usuario-nombre {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--texto-principal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}
.sidebar-usuario-rol {
  font-size: 0.72rem;
  color: var(--morado-brillante);
}
.btn-salir {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta-alt);
  color: var(--texto-secundario);
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--trans-rapida);
  font-family: var(--fuente-principal);
}
.btn-salir:hover {
  background: rgba(231, 76, 60, 0.12);
  color: var(--color-error);
  border-color: rgba(231, 76, 60, 0.35);
}

/* ─── Contenido principal ───────────────────────────────────────────────── */
.contenido-admin {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

/* ─── Navbar ────────────────────────────────────────────────────────────── */
.navbar-admin {
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: var(--fondo-navbar);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--borde-sutil);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}
.navbar-izq { display: flex; align-items: center; gap: 1rem; }
.btn-hamburger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: none;
  color: var(--texto-principal);
  cursor: pointer;
  border-radius: 8px;
  transition: var(--trans-rapida);
}
.btn-hamburger:hover { background: var(--fondo-tarjeta-alt); }
.navbar-titulo {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--texto-principal);
  margin: 0;
  font-family: var(--fuente-titulo);
}
.navbar-der { display: flex; align-items: center; }
.badge-online {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(46, 204, 113, 0.12);
  color: var(--color-exito);
  border: 1px solid rgba(46, 204, 113, 0.25);
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-online-punto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-exito);
  animation: pulsar 2s ease-in-out infinite;
  display: inline-block;
}

/* ─── Vista ─────────────────────────────────────────────────────────────── */
.vista-admin {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}
@media (max-width: 768px) {
  .vista-admin { padding: 1rem; }
}
</style>
