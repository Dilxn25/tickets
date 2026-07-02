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
        <span class="sidebar-logo-halo" aria-hidden="true" />
        <img
          src="@/activos/imagenes/logo-euphoria.png"
          alt="Euphoria"
          class="sidebar-logo-img"
          :class="colapsado ? 'sidebar-logo-chico' : 'sidebar-logo-grande'"
        />
      </div>

      <!-- Navegación -->
      <nav class="sidebar-nav-area">
        <p v-if="!colapsado" class="nav-section-label">Panel de control</p>
        <div class="nav-lista escalonar">
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
            <span v-if="!colapsado" class="nav-link-chevron" aria-hidden="true">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </RouterLink>
        </div>
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
          <span class="navbar-marca" aria-hidden="true" />
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
  { ruta: 'zonas',     nombre: 'Espacios',   icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>' },
  { ruta: 'aforo',     nombre: 'Aforo',      icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><circle cx="12" cy="12" r="10" opacity="0.25"/></svg>' },
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
  min-height: 100dvh;
  background: var(--fondo-app);
  position: relative;
}

/* Overlay móvil */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 4, 26, 0.66);
  backdrop-filter: blur(4px);
  z-index: 40;
  animation: fadeIn 0.25s ease forwards;
}

/* ─── Sidebar (vidrio premium) ──────────────────────────────────────────── */
.sidebar-euphoria {
  width: var(--ancho-sidebar);
  background:
    radial-gradient(130% 44% at 0% 0%, rgba(168, 85, 247, 0.20), transparent 60%),
    radial-gradient(120% 30% at 100% 100%, rgba(236, 72, 153, 0.10), transparent 62%),
    linear-gradient(180deg, rgba(46, 26, 102, 0.55), transparent 30%),
    var(--fondo-sidebar);
  border-right: 1px solid var(--glass-borde);
  display: flex;
  flex-direction: column;
  transition: width 0.34s var(--ease-suave);
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  z-index: 50;
  overflow: hidden;
  flex-shrink: 0;
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, 0.04),
    1px 0 0 var(--borde-sutil),
    18px 0 48px rgba(10, 4, 26, 0.5);
}
/* Filo derecho: hairline de neón que recorre toda la altura */
.sidebar-euphoria::after {
  content: "";
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(168, 85, 247, 0.5) 22%, rgba(236, 72, 153, 0.32) 60%, transparent);
  pointer-events: none;
}

.sidebar-angosto { width: 76px; }

/* Tablet: sidebar como drawer flotante, ancho acotado */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar-euphoria {
    width: min(var(--ancho-sidebar), 240px);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar-euphoria {
    position: fixed;
    left: 0; top: 0;
    height: 100vh;
    height: 100dvh;
    width: min(var(--ancho-sidebar), 82vw);
    transition: transform 0.34s var(--ease-suave);
  }
  .sidebar-movil-oculto  { transform: translateX(-100%); }
  .sidebar-movil-visible { transform: translateX(0); }
}

/* ─── Logo ──────────────────────────────────────────────────────────────── */
.sidebar-logo-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84px;
  padding: 1rem;
  border-bottom: 1px solid var(--borde-sutil);
  flex-shrink: 0;
}
/* Halo neón difuso detrás del logo */
.sidebar-logo-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150px;
  height: 60px;
  transform: translate(-50%, -50%);
  background: radial-gradient(60% 60% at 50% 50%, rgba(168, 85, 247, 0.35), transparent 70%);
  filter: blur(14px);
  pointer-events: none;
}
/* Hairline inferior de neón */
.sidebar-logo-area::after {
  content: "";
  position: absolute;
  inset: auto 0 -1px 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.6), rgba(236, 72, 153, 0.4), transparent);
}
.sidebar-logo-img {
  position: relative;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.55));
  transition: transform 0.34s var(--ease-suave), height 0.3s ease, filter 0.3s ease;
}
.sidebar-logo-img:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 0 16px rgba(236, 72, 153, 0.65));
}
.sidebar-logo-grande { height: 46px; width: auto; max-width: 182px; }
.sidebar-logo-chico  { height: 34px; width: auto; }

/* ─── Nav ───────────────────────────────────────────────────────────────── */
.sidebar-nav-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--esp-4) var(--esp-3) var(--esp-3);
  overflow-y: auto;
  overflow-x: hidden;
}
.nav-lista {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.nav-section-label {
  margin: 2px 0 8px;
  padding-left: 12px;
  font-family: var(--fuente-titulo);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--texto-desactivado);
}
.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  border-radius: var(--radio-md);
  color: var(--texto-secundario);
  font-size: 0.885rem;
  font-weight: 500;
  letter-spacing: -0.006em;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.16s var(--ease-suave);
  white-space: nowrap;
  text-decoration: none;
  border: 1px solid transparent;
}
.nav-link:hover {
  background: rgba(168, 85, 247, 0.10);
  color: var(--texto-principal);
  border-color: var(--borde-sutil);
}
.nav-link:hover .nav-link-icono {
  color: var(--morado-hover);
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.18);
}
.nav-link:hover .nav-link-chevron { opacity: 0.7; transform: translateX(0); }
.nav-link:active { transform: scale(0.985); }
.nav-link:focus-visible {
  outline: 2px solid var(--morado-brillante);
  outline-offset: 2px;
}
.nav-link-activo,
.nav-link-activo:hover {
  background:
    linear-gradient(120deg, rgba(139, 92, 246, 0.24), rgba(236, 72, 153, 0.16)),
    var(--fondo-tarjeta-alt);
  color: #fff;
  border-color: rgba(168, 85, 247, 0.45);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 6px 20px rgba(168, 85, 247, 0.28),
    0 0 0 1px rgba(168, 85, 247, 0.12);
}
/* Barra indicadora luminosa del enlace activo */
.nav-link-activo::before {
  content: "";
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  border-radius: var(--radio-full);
  background: linear-gradient(180deg, var(--morado-hover), var(--rosa-acento));
  box-shadow: 0 0 12px rgba(192, 132, 252, 0.9), 0 0 4px rgba(236, 72, 153, 0.8);
}
.sidebar-angosto .nav-link-activo::before { left: -6px; height: 20px; }
.nav-link-activo .nav-link-icono {
  color: #fff;
  background: var(--gradiente-marca);
  border-color: transparent;
  box-shadow: 0 3px 12px rgba(168, 85, 247, 0.5);
}
.nav-link-activo .nav-link-chevron { opacity: 0.85; color: var(--morado-hover); }
/* Chip del icono: da carácter premium y funciona colapsado */
.nav-link-icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 9px;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid var(--borde-sutil);
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s var(--ease-suave);
}
.nav-link-icono :deep(svg) { width: 18px; height: 18px; }
.nav-link-texto { flex: 1; }
.nav-link-chevron {
  display: flex;
  align-items: center;
  color: var(--texto-desactivado);
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 0.2s ease, transform 0.2s var(--ease-suave);
}

/* Centrar iconos cuando el sidebar está colapsado */
.sidebar-angosto .nav-link { justify-content: center; padding-left: 10px; padding-right: 10px; gap: 0; }

/* ─── Footer sidebar ────────────────────────────────────────────────────── */
.sidebar-footer-area {
  padding: 0.85rem 0.75rem 1rem;
  border-top: 1px solid var(--borde-sutil);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sidebar-usuario {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border-radius: var(--radio-lg);
  background:
    linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(236, 72, 153, 0.06)),
    var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.sidebar-avatar {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.3), 0 3px 12px rgba(168, 85, 247, 0.4);
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.sidebar-usuario-info { overflow: hidden; min-width: 0; }
.sidebar-usuario-nombre {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--texto-principal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}
.sidebar-usuario-rol {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: capitalize;
  color: var(--morado-hover);
}
.btn-salir {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radio-md);
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
  background: rgba(239, 68, 68, 0.14);
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
}
.btn-salir:active { transform: scale(0.985); }
.btn-salir:focus-visible {
  outline: 2px solid var(--color-error);
  outline-offset: 2px;
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
  height: var(--alto-navbar);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: var(--fondo-navbar);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-bottom: 1px solid var(--borde-sutil);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}
.navbar-izq { display: flex; align-items: center; gap: 0.85rem; min-width: 0; }
.btn-hamburger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px;
  border: 1px solid transparent;
  background: none;
  color: var(--texto-principal);
  cursor: pointer;
  border-radius: 9px;
  transition: var(--trans-rapida);
  flex-shrink: 0;
}
.btn-hamburger:hover {
  background: rgba(168, 85, 247, 0.14);
  color: var(--morado-brillante);
  border-color: var(--borde-sutil);
}
.btn-hamburger:active { transform: scale(0.94); }
.btn-hamburger:focus-visible {
  outline: 2px solid var(--morado-brillante);
  outline-offset: 2px;
}
/* Barra de marca junto al título (acento morado→magenta) */
.navbar-marca {
  width: 4px;
  height: 22px;
  border-radius: var(--radio-full);
  background: linear-gradient(180deg, var(--morado-hover), var(--rosa-acento));
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.6);
  flex-shrink: 0;
}
.navbar-titulo {
  font-size: 1.22rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin: 0;
  font-family: var(--fuente-titulo);
  letter-spacing: -0.022em;
  text-wrap: balance;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.navbar-der { display: flex; align-items: center; }
.badge-online {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px;
  border-radius: 9999px;
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-exito);
  border: 1px solid rgba(34, 197, 94, 0.28);
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.badge-online-punto {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-exito);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
  animation: pulsar 2s ease-in-out infinite;
  display: inline-block;
}

/* ─── Vista ─────────────────────────────────────────────────────────────── */
.vista-admin {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* ─── Responsivo tablet ─────────────────────────────────────────────────── */
@media (min-width: 769px) and (max-width: 1024px) {
  .navbar-admin { padding: 0 1.25rem; }
  .vista-admin  { padding: 1.25rem; }
}

/* ─── Responsivo móvil ──────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .navbar-admin { padding: 0 1rem; }
  .navbar-titulo { font-size: 1.05rem; }
  .btn-hamburger { padding: 8px; }
  .vista-admin { padding: 1rem; }
  /* targets táctiles más cómodos */
  .nav-link { padding: 11px 11px; }
}

@media (max-width: 480px) {
  .navbar-admin { padding: 0 0.75rem; }
  .navbar-titulo { font-size: 1rem; }
  .vista-admin { padding: 0.75rem; }
  .navbar-marca { height: 18px; }
  /* compactar la etiqueta "En línea" en pantallas muy chicas */
  .badge-online { padding: 4px 9px; font-size: 0.7rem; }
}

/* ─── Movimiento reducido ────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .nav-lista.escalonar > *,
  .overlay,
  .badge-online-punto { animation: none; }
  .nav-link,
  .nav-link-icono,
  .nav-link-chevron,
  .btn-hamburger,
  .btn-salir,
  .sidebar-euphoria,
  .sidebar-logo-img { transition: none; }
}
</style>
