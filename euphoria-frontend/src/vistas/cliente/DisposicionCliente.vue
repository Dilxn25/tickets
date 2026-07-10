<template>
  <div class="layout-cliente entrada-cine">
    <!-- Ambiente de neon: orbes de fondo -->
    <div class="ambiente-neon" aria-hidden="true">
      <span class="orbe-deco morado orbe-1"></span>
      <span class="orbe-deco rosa orbe-2"></span>
    </div>

    <!-- Navbar Superior -->
    <header class="navbar-top">
      <div class="marca-cluster">
        <div class="logo-contenedor">
          <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="logo-img" />
        </div>
      </div>
      <div class="acciones-usuario">
        <CampanaNotificaciones />
        <button class="btn-reservas-top" @click="irMisPedidos" title="Mis pedidos" type="button" aria-label="Mis pedidos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        </button>
        <button class="btn-reservas-top" @click="irMisReservas" title="Mis reservas" type="button" aria-label="Mis reservas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"></path><line x1="13" y1="5" x2="13" y2="19" stroke-dasharray="2 2"></line></svg>
        </button>
        <span class="divisor-acciones" aria-hidden="true"></span>
        <div class="user-avatar" :class="{ 'avatar-cargando': mostrarSkeletonAvatar }" @click="irPerfil" title="Mi perfil">
          <span v-if="mostrarSkeletonAvatar" class="avatar-skeleton" aria-hidden="true"></span>
          <img v-else-if="urlFoto" :src="urlFoto" class="avatar-img" alt="Perfil" />
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

    <!-- Navbar Inferior: pildora de vidrio flotante -->
    <nav class="navbar-bottom" aria-label="Navegación principal">
      <div class="pildora-nav">
        <RouterLink to="/cliente/inicio" class="tab-item" active-class="activo">
          <span class="tab-glow" aria-hidden="true"></span>
          <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Inicio</span>
        </RouterLink>
        <RouterLink to="/cliente/catalogo" class="tab-item" active-class="activo">
          <span class="tab-glow" aria-hidden="true"></span>
          <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <span>Catálogo</span>
        </RouterLink>
        <RouterLink to="/cliente/eventos" class="tab-item" active-class="activo">
          <span class="tab-glow" aria-hidden="true"></span>
          <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Eventos</span>
        </RouterLink>
        <RouterLink to="/cliente/billetera" class="tab-item" active-class="activo">
          <span class="tab-glow" aria-hidden="true"></span>
          <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Billetera</span>
        </RouterLink>
        <RouterLink to="/cliente/carrito" class="tab-item" active-class="activo">
          <span class="tab-glow" aria-hidden="true"></span>
          <div class="icono-badge-wrapper">
            <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span v-if="tiendaCarrito.totalItems > 0" class="badge-carrito">{{ tiendaCarrito.totalItems > 99 ? '99+' : tiendaCarrito.totalItems }}</span>
          </div>
          <span>Carrito</span>
        </RouterLink>
        <RouterLink to="/cliente/perfil" class="tab-item" active-class="activo">
          <span class="tab-glow" aria-hidden="true"></span>
          <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Perfil</span>
        </RouterLink>
      </div>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'
import CampanaNotificaciones from '@/componentes/comunes/CampanaNotificaciones.vue'
import { useTiempoReal } from '@/composables/useTiempoReal'
import clienteHttp from '@/servicios-api/cliente-http.js'

const tienda = useTiendaAutenticacion()
const tiendaCarrito = useTiendaCarrito()
const router = useRouter()

// Estado de carga del perfil: arranca en true si el store todavía no tiene una
// identidad utilizable (localStorage vacío o sin nombres). Evita mostrar un
// avatar "vacío" que parece un error mientras llega /usuarios/perfil.
const cargandoPerfil = ref(!tienda.usuario?.nombres)

// Trae los datos frescos del propio usuario (perfil, foto, saldo) y los fusiona
// en el store. Se usa tanto al montar como cuando el socket avisa de un cambio.
async function refrescarPerfil() {
  try {
    const fresco = await clienteHttp.get('/usuarios/perfil')
    if (fresco) tienda.actualizarUsuario(fresco.usuario || fresco)
  } catch { /* si falla, se mantiene lo actual (lo cacheado) */ }
  finally { cargandoPerfil.value = false }
}

// Causa del "aparece de golpe": antes SÓLO se refrescaba al recibir un evento de
// socket. Ahora, al montar el layout, pedimos el perfil de inmediato para que la
// foto/saldo/datos estén al día desde el primer instante.
onMounted(refrescarPerfil)

// Tiempo real: si el local (admin) cambia MIS datos, se reflejan sin recargar.
useTiempoReal('usuarios', (tipo, data) => {
  if (data?.id && tienda.usuario?.id && Number(data.id) !== Number(tienda.usuario.id)) return
  refrescarPerfil()
})

const iniciales = computed(() => {
  const n = tienda.usuario?.nombres || ''
  return n.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
})

const urlFoto = computed(() => tienda.usuario?.url_foto_perfil || tienda.usuario?.foto || null)

// Sólo mostramos el esqueleto cuando de verdad no hay nada que enseñar todavía
// (ni foto ni iniciales) y seguimos esperando la respuesta. Si ya hay iniciales
// cacheadas, se ven al instante y la foto entra sola cuando llega.
const mostrarSkeletonAvatar = computed(() => cargandoPerfil.value && !urlFoto.value && !iniciales.value)

const modalLogout = ref(false)

function irPerfil() {
  router.push('/cliente/perfil')
}

function irMisReservas() {
  router.push('/cliente/mis-reservas')
}
function irMisPedidos() {
  router.push('/cliente/pedidos')
}

function cerrarSesion() {
  modalLogout.value = true
}

function confirmarCerrarSesion() {
  modalLogout.value = false
  tienda.cerrarSesion()
  // Navegación dura: re-arranca la app limpia en /login (evita quedar en
  // blanco hasta refrescar) y corta el socket de billetera/aforo.
  window.location.assign('/login')
}
</script>

<style scoped>
.layout-cliente {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh; /* fallback */
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--fondo-app);
  color: var(--texto-principal);
  isolation: isolate;
  overflow: hidden;
}

/* Ambiente de neon (mesh de orbes detras de todo) */
.ambiente-neon {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.ambiente-neon .orbe-deco {
  opacity: 0.28;
}
.orbe-1 {
  top: -140px;
  right: -90px;
  width: 340px;
  height: 340px;
}
.orbe-2 {
  bottom: -120px;
  left: -110px;
  width: 320px;
  height: 320px;
  opacity: 0.22;
}

/* Header Navbar — barra flotante de vidrio */
.navbar-top {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 clamp(1rem, 4vw, 2rem);
  background: linear-gradient(180deg, rgba(20, 12, 46, 0.9), rgba(14, 8, 33, 0.62));
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border-bottom: 1px solid var(--borde-sutil);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05) inset,
              0 10px 32px rgba(10, 6, 26, 0.45);
}
/* Hairline de neon en el borde inferior */
.navbar-top::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.6), rgba(236, 72, 153, 0.5), transparent);
  opacity: 0.7;
}

.marca-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.logo-contenedor {
  display: flex;
  align-items: center;
}
.logo-img {
  height: 40px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.55));
  transition: filter var(--trans-normal), transform var(--trans-normal);
}
.marca-cluster:hover .logo-img {
  filter: drop-shadow(0 0 18px rgba(192, 132, 252, 0.75));
  transform: translateY(-1px);
}

.acciones-usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: var(--radio-full);
  background: rgba(46, 26, 102, 0.28);
  border: 1px solid var(--borde-sutil);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05) inset;
}
.divisor-acciones {
  width: 1px;
  height: 22px;
  background: var(--borde-sutil);
  flex: none;
}
.btn-reservas-top {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--borde-sutil);
  color: var(--morado-hover);
  cursor: pointer;
  transition: transform var(--trans-normal), background var(--trans-normal),
              border-color var(--trans-normal), color var(--trans-normal),
              box-shadow var(--trans-normal);
}
.btn-reservas-top svg { width: 20px; height: 20px; }
.btn-reservas-top:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: var(--borde-activo);
  color: var(--texto-principal);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.28);
}
.btn-reservas-top:active { transform: scale(0.94); }
.btn-reservas-top:focus-visible {
  outline: none;
  border-color: var(--morado-hover);
  box-shadow: var(--glow-morado);
}

.btn-salir-top {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radio-full);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--color-error);
  cursor: pointer;
  transition: transform var(--trans-normal), background var(--trans-normal),
              border-color var(--trans-normal), color var(--trans-normal),
              box-shadow var(--trans-normal);
}
.btn-salir-top svg { width: 20px; height: 20px; }
.btn-salir-top:hover {
  background: var(--color-error);
  border-color: var(--color-error);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
}
.btn-salir-top:active { transform: scale(0.94); }
.btn-salir-top:focus-visible {
  outline: none;
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gradiente-marca);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.01em;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  transition: transform var(--trans-normal), box-shadow var(--trans-normal);
}
.user-avatar:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(236, 72, 153, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
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

/* Avatar en carga: capa neutra de vidrio (no el gradiente de marca) para que se
   lea como "cargando" y no como un avatar real vacío. */
.user-avatar.avatar-cargando {
  background: rgba(46, 26, 102, 0.35);
  box-shadow: 0 0 0 1px var(--borde-sutil) inset;
  cursor: default;
}
.avatar-skeleton {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(
    100deg,
    rgba(168, 85, 247, 0.10) 30%,
    rgba(192, 132, 252, 0.28) 50%,
    rgba(168, 85, 247, 0.10) 70%
  );
  background-size: 220% 100%;
  animation: avatar-brillo 1.15s ease-in-out infinite;
}
@keyframes avatar-brillo {
  from { background-position: 180% 0; }
  to   { background-position: -80% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .avatar-skeleton { animation: none; }
}

/* Contenido Scroll */
.contenido-scroll {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  /* Espacio para la pildora flotante */
  padding-bottom: calc(104px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

/* Columna de contenido: en celular ocupa todo; en tablet/PC se centra y limita su ancho */
.contenedor-vista {
  width: 100%;
  margin: 0 auto;
}

/* ============================================================
   Bottom Tabs — pildora de vidrio flotante (en TODAS las medidas)
   .navbar-bottom = riel de posicionamiento (no captura clics)
   .pildora-nav   = la pildora de vidrio real
   ============================================================ */
.navbar-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(14px + env(safe-area-inset-bottom));
  z-index: 50;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;
}

.pildora-nav {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  width: 100%;
  max-width: 520px;
  height: 66px;
  padding: 8px 10px;
  border-radius: var(--radio-full);
  background: linear-gradient(180deg, rgba(36, 21, 86, 0.72), rgba(14, 8, 33, 0.82));
  backdrop-filter: blur(26px) saturate(160%);
  -webkit-backdrop-filter: blur(26px) saturate(160%);
  border: 1px solid rgba(168, 85, 247, 0.28);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.09) inset,
    0 0 0 1px rgba(10, 6, 26, 0.5),
    0 18px 44px rgba(10, 6, 26, 0.6),
    0 10px 40px rgba(139, 92, 246, 0.28);
}

.tab-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--texto-secundario);
  text-decoration: none;
  gap: 3px;
  border-radius: var(--radio-full);
  transition: color var(--trans-normal), transform 0.3s var(--ease-rebote);
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  padding: 4px 2px;
}
.tab-item:hover { color: var(--texto-principal); }
.tab-item:hover .icono { transform: translateY(-2px); }
.tab-item:active { transform: scale(0.9); }
.tab-item:focus-visible {
  outline: none;
  color: var(--morado-hover);
}
.tab-item:focus-visible .icono {
  filter: drop-shadow(var(--glow-morado));
}

/* Halo interno que aparece detras del item activo */
.tab-glow {
  position: absolute;
  inset: 4px 2px;
  border-radius: var(--radio-full);
  background: radial-gradient(120% 120% at 50% 0%, rgba(168, 85, 247, 0.32), rgba(236, 72, 153, 0.14) 60%, transparent 75%);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.35s var(--ease-suave), transform 0.35s var(--ease-rebote);
  pointer-events: none;
  z-index: 0;
}

.tab-item span:not(.tab-glow) {
  position: relative;
  z-index: 1;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.005em;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: var(--trans-normal);
}

.icono {
  position: relative;
  z-index: 1;
  width: 23px;
  height: 23px;
  transition: transform 0.3s var(--ease-rebote), filter var(--trans-normal);
}

.icono-badge-wrapper {
  position: relative;
  display: flex;
}

.badge-carrito {
  position: absolute;
  top: -6px;
  right: -10px;
  z-index: 2;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: var(--radio-full);
  background: var(--rosa-acento);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  line-height: 17px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.55);
  pointer-events: none;
}

/* Item activo: capsula de vidrio iluminada + icono realzado */
.tab-item.activo {
  color: var(--morado-hover);
}
.tab-item.activo .tab-glow {
  opacity: 1;
  transform: scale(1);
}
.tab-item.activo span:not(.tab-glow) {
  font-weight: 700;
}
.tab-item.activo .icono {
  transform: scale(1.16) translateY(-1px);
  filter: drop-shadow(var(--glow-morado));
}
/* Punto indicador de neon bajo el item activo */
.tab-item.activo::after {
  content: '';
  position: absolute;
  bottom: 1px;
  width: 5px;
  height: 5px;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  box-shadow: var(--sombra-glow);
  z-index: 1;
}

/* Modal Cerrar Sesión */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(8, 4, 20, 0.72);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.modal-logout {
  background: var(--gradiente-sutil); border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl); padding: 2rem; text-align: center; max-width: 320px; width: 100%;
  box-shadow: var(--sombra-modal), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  animation: modal-entrar 0.3s var(--ease-suave) both;
}
@keyframes modal-entrar {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.icono-logout {
  width: 68px;
  height: 68px;
  margin: 0 auto 1.15rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.3);
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.22);
}
.icono-logout svg { width: 30px; height: 30px; }
.modal-logout h3 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 0.5rem; color: var(--texto-principal); }
.modal-logout p { font-size: 0.9rem; line-height: 1.5; color: var(--texto-secundario); margin-bottom: 1.75rem; }
.modal-acciones { display: flex; gap: 12px; }
.btn-cancelar {
  flex: 1; background: var(--fondo-tarjeta-alt); color: var(--texto-secundario);
  border: 1px solid var(--borde-sutil); padding: 11px; border-radius: var(--radio-md);
  font-weight: 600; cursor: pointer; transition: var(--trans-normal);
}
.btn-cancelar:hover { border-color: var(--borde-activo); color: var(--texto-principal); transform: translateY(-1px); }
.btn-cancelar:focus-visible { outline: none; border-color: var(--morado-hover); box-shadow: var(--glow-morado); }
.btn-confirmar {
  flex: 1; background: rgba(239, 68, 68, 0.15); color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.3); padding: 11px; border-radius: var(--radio-md);
  font-weight: 600; cursor: pointer; transition: var(--trans-normal);
}
.btn-confirmar:hover { background: var(--color-error); border-color: var(--color-error); color: #fff; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3); }
.btn-confirmar:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.35); }
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
    height: 62px;
    padding: 0 1rem;
  }
  .logo-img {
    height: 33px;
  }
  .navbar-bottom {
    padding: 0 12px;
  }
  .pildora-nav {
    height: 62px;
    padding: 6px 6px;
    gap: 0;
  }
  .tab-item span:not(.tab-glow) {
    font-size: 0.6rem;
  }
  .tab-item {
    gap: 3px;
  }
  .icono {
    width: 21px;
    height: 21px;
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
  .pildora-nav {
    max-width: 560px;
  }
  .tab-item span:not(.tab-glow) {
    font-size: 0.72rem;
  }
}

/* Escritorio (>1024px): interfaz centrada tipo "app", NO estirada de borde a borde.
   - El contenido se limita a una columna ancha centrada.
   - La pildora inferior gana aire y presencia. */
@media (min-width: 1025px) {
  .navbar-top {
    padding: 0 max(2rem, calc((100% - 1100px) / 2));
  }
  .contenido-scroll {
    padding-bottom: 128px;
  }
  .contenedor-vista {
    max-width: 1100px;
    padding: 0 1rem;
  }
  .navbar-bottom {
    bottom: 24px;
  }
  .pildora-nav {
    max-width: 600px;
    height: 70px;
    padding: 9px 14px;
    gap: 4px;
  }
  .tab-item span:not(.tab-glow) {
    font-size: 0.74rem;
  }
  .icono {
    width: 24px;
    height: 24px;
  }
}

/* Respeto de accesibilidad: sin movimiento */
@media (prefers-reduced-motion: reduce) {
  .modal-logout {
    animation: none;
  }
  .marca-cluster:hover .logo-img,
  .btn-reservas-top:hover,
  .btn-salir-top:hover,
  .user-avatar:hover,
  .tab-item:hover .icono,
  .tab-item.activo .icono,
  .btn-cancelar:hover,
  .btn-confirmar:hover {
    transform: none;
  }
  .tab-glow {
    transition: opacity 0.2s ease;
  }
}
</style>
