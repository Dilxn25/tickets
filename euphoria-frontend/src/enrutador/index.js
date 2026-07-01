import { createRouter, createWebHistory } from 'vue-router'
import { useTiendaAutenticacion } from '../tiendas/tienda-autenticacion.js'

// ---- Vistas Públicas ----
import VistaLogin from '../vistas/publica/VistaLogin.vue'

// ---- Layouts ----
import DisposicionAdmin from '../vistas/administrador/DisposicionAdmin.vue'
import DisposicionSimple from '../vistas/DisposicionSimple.vue'

// ---- Admin: módulos activos ----
import VistaUsuarios from '../vistas/administrador/VistaUsuarios.vue'
import VistaProductos from '../vistas/administrador/VistaProductos.vue'
import VistaEventos from '../vistas/administrador/VistaEventos.vue'
import VistaReportes from '../vistas/administrador/VistaReportes.vue'
import VistaVentas from '../vistas/administrador/VistaVentas.vue'

// ---- En Construcción (otros roles y módulos) ----
import VistaEnConstruccion from '../vistas/VistaEnConstruccion.vue'
import VistaCajero from '../vistas/cajero/VistaCajero.vue'

import DisposicionCliente from '../vistas/cliente/DisposicionCliente.vue'
import VistaInicioCliente from '../vistas/cliente/VistaInicioCliente.vue'
import VistaCatalogo from '../vistas/cliente/VistaCatalogo.vue'
import VistaEventosCliente from '../vistas/cliente/VistaEventosCliente.vue'
import VistaDetalleEventoCliente from '../vistas/cliente/VistaDetalleEventoCliente.vue'
import VistaPerfil from '../vistas/cliente/VistaPerfil.vue'
import VistaBilletera from '../vistas/cliente/VistaBilletera.vue'
import VistaCarrito from '../vistas/cliente/VistaCarrito.vue'

import VistaMesero from '../vistas/mesero/VistaMesero.vue'

import VistaBartender from '../vistas/bartender/VistaBartender.vue'

const rutas = [
  // Raíz → redirige según rol
  { path: '/', redirect: '/login' },

  // Pública
  { path: '/login', name: 'Login', component: VistaLogin, meta: { publica: true } },

  // Administrador (layout completo con sidebar)
  {
    path: '/administrador',
    component: DisposicionAdmin,
    meta: { requiereAuth: true, rolPermitido: 'administrador' },
    children: [
      { path: '', redirect: '/administrador/usuarios' },
      { path: 'usuarios', name: 'AdminUsuarios', component: VistaUsuarios },
      { path: 'productos', name: 'AdminProductos', component: VistaProductos },
      { path: 'eventos', name: 'AdminEventos', component: VistaEventos },
      { path: 'ventas', name: 'AdminVentas', component: VistaVentas },
      { path: 'zonas', name: 'AdminZonas', component: VistaEnConstruccion },
      { path: 'aforo', name: 'AdminAforo', component: VistaEnConstruccion },
      { path: 'ia', name: 'AdminIA', component: VistaEnConstruccion },
      { path: 'reportes', name: 'AdminReportes', component: VistaReportes },
    ],
  },

  // Otros roles (layout con navbar)
  {
    path: '/cajero',
    component: DisposicionSimple,
    meta: { requiereAuth: true, rolPermitido: 'cajero' },
    children: [{ path: '', name: 'Cajero', component: VistaCajero }],
  },
  {
    path: '/mesero',
    name: 'Mesero',
    component: VistaMesero,
    meta: { requiereAuth: true, rolPermitido: 'mesero' }
  },
  {
    path: '/recepcionista',
    component: DisposicionSimple,
    meta: { requiereAuth: true, rolPermitido: 'recepcionista' },
    children: [{ path: '', name: 'Recepcionista', component: VistaEnConstruccion }],
  },
  {
    path: '/bartender',
    component: DisposicionSimple,
    meta: { requiereAuth: true, rolPermitido: 'bartender' },
    children: [{ path: '', name: 'Bartender', component: VistaBartender }],
  },

  // Cliente (Mobile-First UI)
  {
    path: '/cliente',
    component: DisposicionCliente,
    meta: { requiereAuth: true, rolPermitido: 'cliente' },
    children: [
      { path: '', redirect: '/cliente/inicio' },
      { path: 'inicio', name: 'ClienteInicio', component: VistaInicioCliente },
      { path: 'catalogo', name: 'ClienteCatalogo', component: VistaCatalogo },
      { path: 'billetera', name: 'ClienteBilletera', component: VistaBilletera },
      { path: 'eventos', name: 'ClienteEventos', component: VistaEventosCliente },
      { path: 'eventos/:id', name: 'ClienteDetalleEvento', component: VistaDetalleEventoCliente },
      { path: 'carrito', name: 'ClienteCarrito', component: VistaCarrito },
      { path: 'perfil', name: 'ClientePerfil', component: VistaPerfil }
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
      const div = document.createElement('div')
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
      setTimeout(() => {
        div.style.transition = 'opacity 0.4s ease'
        div.style.opacity = '0'
        setTimeout(() => div.remove(), 400)
      }, 3000)

      return next(`/${tienda.rolRuta}`)
    }
  }

  next()
})

export default enrutador
