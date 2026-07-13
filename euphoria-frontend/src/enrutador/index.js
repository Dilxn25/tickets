import { createRouter, createWebHistory } from 'vue-router'
import { useTiendaAutenticacion } from '../tiendas/tienda-autenticacion.js'

// Login se carga de forma inmediata (es lo primero que ve el usuario).
import VistaLogin from '../vistas/publica/VistaLogin.vue'

// El resto de las vistas se cargan bajo demanda (lazy-load): cada una se
// descarga solo cuando el usuario entra a ella. Así el arranque no baja las
// 30 vistas juntas y cada rol solo trae lo suyo.
const Disposicion = {
  Admin:    () => import('../vistas/administrador/DisposicionAdmin.vue'),
  Simple:   () => import('../vistas/DisposicionSimple.vue'),
  Cliente:  () => import('../vistas/cliente/DisposicionCliente.vue'),
}

const rutas = [
  // Raíz → redirige según rol
  { path: '/', redirect: '/login' },

  // Pública
  { path: '/login', name: 'Login', component: VistaLogin, meta: { publica: true } },

  // Administrador (layout completo con sidebar)
  {
    path: '/administrador',
    component: Disposicion.Admin,
    meta: { requiereAuth: true, rolPermitido: 'administrador' },
    children: [
      // El admin entra directo a su dashboard (Reportes)
      { path: '', redirect: '/administrador/reportes' },
      { path: 'usuarios', name: 'AdminUsuarios', component: () => import('../vistas/administrador/VistaUsuarios.vue') },
      { path: 'productos', name: 'AdminProductos', component: () => import('../vistas/administrador/VistaProductos.vue') },
      { path: 'eventos', name: 'AdminEventos', component: () => import('../vistas/administrador/VistaEventos.vue') },
      { path: 'ventas', name: 'AdminVentas', component: () => import('../vistas/administrador/VistaVentas.vue') },
      { path: 'zonas', name: 'AdminZonas', component: () => import('../vistas/administrador/VistaMapas.vue') },
      { path: 'aforo', name: 'AdminAforo', component: () => import('../vistas/administrador/VistaAforoAdmin.vue') },
      { path: 'ia', name: 'AdminIA', component: () => import('../vistas/administrador/VistaIA.vue') },
      { path: 'fidelizacion', name: 'AdminFidelizacion', component: () => import('../vistas/administrador/VistaFidelizacion.vue') },
      { path: 'reportes', name: 'AdminReportes', component: () => import('../vistas/administrador/VistaReportes.vue') },
    ],
  },

  // Otros roles (layout con navbar)
  {
    path: '/cajero',
    component: Disposicion.Simple,
    meta: { requiereAuth: true, rolPermitido: 'cajero' },
    children: [{ path: '', name: 'Cajero', component: () => import('../vistas/cajero/VistaCajeroV2.vue') }],
  },
  {
    path: '/mesero',
    name: 'Mesero',
    component: () => import('../vistas/mesero/VistaMesero.vue'),
    meta: { requiereAuth: true, rolPermitido: 'mesero' }
  },
  {
    path: '/recepcionista',
    component: Disposicion.Simple,
    meta: { requiereAuth: true, rolPermitido: 'recepcionista' },
    children: [{ path: '', name: 'Recepcionista', component: () => import('../vistas/recepcionista/VistaRecepcionista.vue') }],
  },
  {
    path: '/bartender',
    component: Disposicion.Simple,
    meta: { requiereAuth: true, rolPermitido: 'bartender' },
    children: [{ path: '', name: 'Bartender', component: () => import('../vistas/bartender/VistaBartender.vue') }],
  },

  // Cliente (Mobile-First UI)
  {
    path: '/cliente',
    component: Disposicion.Cliente,
    meta: { requiereAuth: true, rolPermitido: 'cliente' },
    children: [
      { path: '', redirect: '/cliente/inicio' },
      { path: 'inicio', name: 'ClienteInicio', component: () => import('../vistas/cliente/VistaInicioCliente.vue') },
      { path: 'catalogo', name: 'ClienteCatalogo', component: () => import('../vistas/cliente/VistaCatalogo.vue') },
      { path: 'billetera', name: 'ClienteBilletera', component: () => import('../vistas/cliente/VistaBilletera.vue') },
      { path: 'movimientos', name: 'ClienteMovimientos', component: () => import('../vistas/cliente/VistaMovimientos.vue') },
      { path: 'pedidos', name: 'ClientePedidos', component: () => import('../vistas/cliente/VistaPedidos.vue') },
      { path: 'eventos', name: 'ClienteEventos', component: () => import('../vistas/cliente/VistaEventosCliente.vue') },
      { path: 'eventos/:id', name: 'ClienteDetalleEvento', component: () => import('../vistas/cliente/VistaDetalleEventoCliente.vue') },
      { path: 'reservar/:idEvento', name: 'ClienteReservar', component: () => import('../vistas/cliente/VistaReservaMapa.vue') },
      { path: 'grupo/:idEvento', name: 'ClienteGrupo', component: () => import('../vistas/cliente/VistaSolicitudGrupo.vue') },
      { path: 'mis-reservas', name: 'ClienteMisReservas', component: () => import('../vistas/cliente/VistaMisReservas.vue') },
      { path: 'carrito', name: 'ClienteCarrito', component: () => import('../vistas/cliente/VistaCarrito.vue') },
      { path: 'perfil', name: 'ClientePerfil', component: () => import('../vistas/cliente/VistaPerfil.vue') }
    ],
  },

  // 404 y Vista de Error Generica
  { path: '/no-encontrada', name: 'NoEncontrada', component: () => import('../vistas/VistaNoEncontrada.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/no-encontrada' },
]

const enrutador = createRouter({
  history: createWebHistory(),
  routes: rutas,
})

// Toast "sin permiso": reutiliza un único elemento para evitar que se apilen
// múltiples avisos idénticos al navegar rápido a rutas no permitidas.
const ID_TOAST_SIN_PERMISO = 'toast-sin-permiso'
let temporizadorToastSinPermiso = null

function mostrarToastSinPermiso() {
  // Si ya existe un toast, reinicia su temporizador en lugar de crear otro.
  let div = document.getElementById(ID_TOAST_SIN_PERMISO)
  if (!div) {
    div = document.createElement('div')
    div.id = ID_TOAST_SIN_PERMISO
    div.style.position = 'fixed'
    div.style.top = '20px'
    div.style.left = '50%'
    div.style.transform = 'translateX(-50%)'
    div.style.background = 'rgba(239, 71, 111, 0.95)'
    div.style.color = '#FFF'
    div.style.padding = '12px 24px'
    div.style.borderRadius = '10px'
    div.style.display = 'flex'
    div.style.alignItems = 'center'
    div.style.gap = '10px'
    div.style.zIndex = '9999'
    div.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    div.style.fontWeight = '600'
    div.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4), 0 0 10px rgba(239,71,111,0.2)'
    div.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>No tienes permiso para acceder a esta área.</span>
    `
    document.body.appendChild(div)
  }

  // Reinicia visibilidad y temporizador (evita apilado y reaparece si estaba desvaneciéndose).
  div.style.transition = ''
  div.style.opacity = '1'
  if (temporizadorToastSinPermiso) clearTimeout(temporizadorToastSinPermiso)
  temporizadorToastSinPermiso = setTimeout(() => {
    div.style.transition = 'opacity 0.4s ease'
    div.style.opacity = '0'
    setTimeout(() => div.remove(), 400)
  }, 3000)
}

// Control de acceso de navegación global
enrutador.beforeEach((to, from, next) => {
  const tienda = useTiendaAutenticacion()

  if (to.meta.requiereAuth && !tienda.estaAutenticado) {
    return next('/login')
  }

  if (to.path === '/login' && tienda.estaAutenticado) {
    return next(`/${tienda.rolRuta}`)
  }

  // Verificación de rol para rutas protegidas
  if (to.meta.rolPermitido && tienda.estaAutenticado) {
    if (to.meta.rolPermitido !== tienda.rolRuta) {
      mostrarToastSinPermiso()
      return next(`/${tienda.rolRuta}`)
    }
  }

  next()
})

export default enrutador
