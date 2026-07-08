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
      <!-- Logo: wordmark expandido / monograma cuando está colapsado -->
      <div class="sidebar-logo-area">
        <span class="sidebar-logo-halo" aria-hidden="true" />
        <img
          v-if="!colapsado"
          src="@/activos/imagenes/logo-euphoria.png"
          alt="Euphoria"
          class="sidebar-logo-img sidebar-logo-grande"
        />
        <span v-else class="sidebar-logo-mono" role="img" aria-label="Euphoria">
          <svg class="logo-mono-e" viewBox="0 0 240 265" aria-hidden="true"><defs><linearGradient id="grad-logo-e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="0.5" stop-color="#A855F7"/><stop offset="1" stop-color="#EC4899"/></linearGradient></defs><path d="M109 39L96 39L95 40L90 41L85 44L76 54L72 62L72 64L70 68L70 71L69 72L69 75L68 76L68 83L67 84L67 109L68 110L68 118L69 119L69 124L70 125L70 129L71 130L71 134L74 142L74 145L81 163L84 162L102 144L106 138L133 112L139 104L157 87L157 85L154 81L152 76L150 73L148 72L148 70L146 67L142 64L142 62L125 46L113 40L110 40Z M108 54L109 55L111 55L112 56L115 57L117 59L118 59L132 73L132 74L137 80L137 86L126 97L126 98L125 99L124 99L121 102L121 103L91 133L87 133L86 132L86 130L85 129L85 125L84 124L84 121L83 120L83 112L82 111L82 83L83 82L83 76L84 75L84 72L85 71L85 69L86 68L86 67L87 66L89 61L95 55L96 55L97 54Z M100 7L74 15L58 24L40 39L25 58L15 78L8 103L7 153L12 175L23 200L35 218L52 235L91 255L137 258L161 252L181 242L210 214L223 191L233 152L232 122L218 76L154 141L160 163L160 191L156 201L148 208L138 208L125 201L110 185L107 176L215 63L189 31L164 15L131 6Z M102 22L130 21L154 27L182 44L195 60L195 64L87 176L99 195L116 213L138 223L152 222L163 216L173 200L176 176L172 144L208 107L214 108L217 121L217 159L211 181L201 201L191 215L178 226L159 237L138 243L116 244L96 241L62 224L46 209L36 193L22 153L22 108L28 86L39 63L58 42L70 34Z" fill="url(#grad-logo-e)" fill-rule="evenodd"/></svg>
        </span>
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
          <!-- Centro de notificaciones: stock bajo + resumen del negocio -->
          <div class="notif-centro">
            <button type="button" class="btn-campana" :class="{ 'con-pendientes': totalPendientes }" title="Notificaciones" @click.stop="alternarNotif">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span v-if="totalPendientes" class="campana-badge">{{ totalPendientes }}</span>
            </button>
            <transition name="notif-fade">
              <div v-if="notifAbierto" class="notif-panel" @click.stop>
                <div class="notif-cab">
                  <span>Notificaciones</span>
                  <span class="notif-hora">actualizado {{ notifHora }}</span>
                </div>

                <!-- Motor de IA caído: crítico, el mesero se queda sin sugerencias -->
                <div v-if="motorIACaido" class="notif-sec">
                  <p class="notif-sec-titulo critico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Motor de IA fuera de línea
                  </p>
                  <RouterLink to="/administrador/ia" class="notif-item critico-fondo" @click="notifAbierto = false">
                    <span class="notif-item-nombre">El mesero no recibe sugerencias. Revisar el servicio.</span>
                  </RouterLink>
                </div>

                <div class="notif-sec">
                  <p class="notif-sec-titulo" :class="stockBajoLista.length ? 'alerta' : ''">
                    <svg v-if="stockBajoLista.length" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>
                    Inventario (umbral: 30 uds.)
                  </p>
                  <ul v-if="stockBajoLista.length" class="notif-lista">
                    <li v-for="p in stockBajoLista" :key="p.id_producto" class="notif-item">
                      <span class="notif-item-nombre">{{ p.nombre_producto }}</span>
                      <span class="notif-item-valor" :class="{ critico: p.stock_actual <= 10 }">{{ p.stock_actual }} uds.</span>
                    </li>
                  </ul>
                  <p v-else class="notif-vacio ok">Todo el stock está sano — nada que reponer.</p>
                </div>

                <!-- Solicitudes de recuperación de cuenta (clientes que pidieron ayuda) -->
                <div class="notif-sec">
                  <p class="notif-sec-titulo" :class="solicitudesRec.length ? 'alerta' : ''">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    Recuperación de cuentas
                  </p>
                  <ul v-if="solicitudesRec.length" class="notif-lista">
                    <li v-for="s in solicitudesRec" :key="s.id_solicitud" class="notif-item notif-solicitud">
                      <div class="sol-datos">
                        <span class="notif-item-nombre">{{ s.correo }}</span>
                        <span class="sol-contacto">{{ s.nombre_contacto || 'Sin nombre' }}</span>
                        <div class="sol-senales">
                          <template v-if="s.cuenta">
                            <span class="sol-senal" :class="senalCi(s).clase">CI {{ senalCi(s).simbolo }}</span>
                            <span class="sol-senal" :class="senalTel(s).clase">Tel. {{ senalTel(s).simbolo }}</span>
                          </template>
                          <span v-else class="sol-senal mal">No existe cuenta con ese correo</span>
                        </div>
                        <p v-if="s.mensaje" class="sol-mensaje">{{ s.mensaje }}</p>
                      </div>
                      <div class="sol-acciones">
                        <button v-if="s.cuenta" type="button" class="sol-btn sol-btn-reset" :disabled="atendiendoId === s.id_solicitud" @click="resolverSolicitud(s)">
                          {{ atendiendoId === s.id_solicitud ? '…' : 'Restablecer' }}
                        </button>
                        <button type="button" class="sol-btn" :disabled="atendiendoId === s.id_solicitud" @click="atenderSolicitud(s)">
                          Atendida
                        </button>
                      </div>
                    </li>
                  </ul>
                  <p v-else class="notif-vacio ok">Sin solicitudes pendientes.</p>

                  <!-- Tras restablecer: clave temporal + avisar al cliente por fuera -->
                  <div v-if="resueltaInfo" class="sol-resuelta">
                    <div class="sol-resuelta-cab">
                      <span>Clave temporal de {{ resueltaInfo.nombre }}</span>
                      <button type="button" class="sol-x" @click="resueltaInfo = null" title="Cerrar">✕</button>
                    </div>
                    <div class="sol-clave">{{ resueltaInfo.password }}</div>
                    <p class="sol-resuelta-nota">Avísale su nueva clave (no tiene acceso a la app todavía):</p>
                    <div class="sol-avisos">
                      <a v-if="linkWhatsapp(resueltaInfo)" :href="linkWhatsapp(resueltaInfo)" target="_blank" rel="noopener" class="sol-aviso wa">WhatsApp</a>
                      <a :href="linkCorreo(resueltaInfo)" class="sol-aviso mail">Correo</a>
                    </div>
                  </div>

                  <p v-if="solicitudesRec.length" class="sol-pie">Valida su identidad con las señales de CI/teléfono (o pídele el CI físico). Luego «Restablecer» pone su clave temporal en 123456 y te da los botones para avisarle.</p>
                </div>

                <div class="notif-sec">
                  <p class="notif-sec-titulo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Operación en curso
                  </p>
                  <div class="notif-kpis">
                    <div class="notif-kpi"><span class="nk-label">Pedidos pendientes</span><span class="nk-valor">{{ pedidosEnCurso.pendientes }}</span></div>
                    <div class="notif-kpi"><span class="nk-label">En preparación</span><span class="nk-valor">{{ pedidosEnCurso.preparando }}</span></div>
                  </div>
                </div>

                <div class="notif-sec">
                  <p class="notif-sec-titulo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    Resumen del negocio
                  </p>
                  <div class="notif-kpis">
                    <div class="notif-kpi"><span class="nk-label">Ventas</span><span class="nk-valor">Bs. {{ resumenNotif.ingresos.toFixed(0) }}</span></div>
                    <div class="notif-kpi"><span class="nk-label">Comandas</span><span class="nk-valor">{{ resumenNotif.comandas }}</span></div>
                    <div class="notif-kpi"><span class="nk-label">Más vendido</span><span class="nk-valor nk-texto">{{ resumenNotif.topProducto }}</span></div>
                    <div class="notif-kpi"><span class="nk-label">Método principal</span><span class="nk-valor nk-texto">{{ resumenNotif.metodoTop }}</span></div>
                  </div>
                </div>

                <RouterLink to="/administrador/reportes" class="notif-ver-reportes" @click="notifAbierto = false">
                  Ver reportes completos
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13"><polyline points="9 18 15 12 9 6"/></svg>
                </RouterLink>
              </div>
            </transition>
          </div>
          <span class="badge-online">
            <span class="badge-online-punto" />
            En línea
          </span>
        </div>
      </header>

      <!-- Vista: KeepAlive conserva vivas TODAS las vistas ya visitadas para
           que volver a ellas sea instantáneo (sin refetch ni pantalla vacía).
           Las vistas con intervalos/sockets (Ventas, Reportes, Aforo) los
           arrancan/detienen con onActivated/onDeactivated. -->
      <div class="vista-admin fade-in">
        <RouterView v-slot="{ Component }">
          <KeepAlive :include="['VistaUsuarios', 'VistaProductos', 'VistaEventos', 'VistaVentas', 'VistaMapas', 'VistaReportes', 'VistaAforoAdmin', 'VistaIA']">
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const tienda = useTiendaAutenticacion()
const router = useRouter()
const ruta   = useRoute()

const anchoVentana = ref(window.innerWidth)
const esMovil      = computed(() => anchoVentana.value <= 768)
const colapsado    = ref(esMovil.value)

function actualizarAncho() {
  // Solo forzar el estado cuando se CRUZA el breakpoint móvil; antes,
  // cualquier resize reseteaba el colapsado que el usuario había elegido
  const eraMovil = esMovil.value
  anchoVentana.value = window.innerWidth
  if (esMovil.value !== eraMovil) colapsado.value = esMovil.value
}
// ALERTA DE STOCK BAJO para el dueño: al entrar al panel (y cada 10 min)
// se revisa el inventario; si algo está en 30 uds. o menos, salta el aviso
const notif = useNotificaciones()
const UMBRAL_STOCK = 30
let intervaloStock = null
// La lista de stock bajo alimenta también el CENTRO DE NOTIFICACIONES (campana)
const stockBajoLista = ref([])
async function revisarStockBajo(conToast = true) {
  try {
    const res = await clienteHttp.get('/productos')
    // Incluye COMBOS: si el admin les gestiona stock manual, también deben alertar
    const lista = (Array.isArray(res) ? res : (res.productos || []))
      .filter(p => p.stock_actual <= UMBRAL_STOCK)
      .sort((a, b) => a.stock_actual - b.stock_actual)
    stockBajoLista.value = lista
    if (conToast && lista.length) {
      const detalle = lista.slice(0, 4).map(p => `${p.nombre_producto}: ${p.stock_actual} uds.`).join(' · ')
      notif.advertencia(
        `REPONER STOCK — ${lista.length} producto(s) en ${UMBRAL_STOCK} unidades o menos. ${detalle}${lista.length > 4 ? ' y más...' : ''}`
      )
    }
  } catch { /* sin bloqueo si el backend no responde */ }
}

// ── Centro de notificaciones (campana del navbar) ────────────────────────
const notifAbierto = ref(false)
const notifHora = ref('')
const resumenNotif = ref({ ingresos: 0, comandas: 0, topProducto: '—', metodoTop: '—' })
const motorIACaido = ref(false)
const pedidosEnCurso = ref({ pendientes: 0, preparando: 0 })
// La bolita cuenta TODO lo que requiere acción del dueño: stock bajo + motor caído + recuperaciones
const totalPendientes = computed(() =>
  stockBajoLista.value.length + (motorIACaido.value ? 1 : 0) + solicitudesRec.value.length
)

// ── Solicitudes de recuperación de cuenta (el cliente pidió ayuda al local) ──
const solicitudesRec = ref([])
const atendiendoId = ref(null)
async function cargarSolicitudesRec() {
  try {
    const res = await clienteHttp.get('/usuarios/solicitudes-recuperacion?estado=pendiente')
    solicitudesRec.value = res.solicitudes || []
  } catch { /* se mantiene la última lista conocida */ }
}
// Señal de identidad: ✓ coincide (verde), ✗ no coincide (rojo), — sin datos
function senalDato(tieneDato, tieneRegistrado, coincide) {
  if (!tieneDato || !tieneRegistrado) return { clase: 'neutro', simbolo: '—' }
  return coincide ? { clase: 'ok', simbolo: '✓' } : { clase: 'mal', simbolo: '✗' }
}
function senalCi(s)  { return senalDato(!!s.ci_contacto, !!s.cuenta?.tiene_ci_registrado, !!s.cuenta?.ci_coincide) }
function senalTel(s) { return senalDato(!!s.telefono, !!s.cuenta?.tiene_telefono_registrado, !!s.cuenta?.telefono_coincide) }
async function atenderSolicitud(s) {
  atendiendoId.value = s.id_solicitud
  try {
    await clienteHttp.patch(`/usuarios/solicitudes-recuperacion/${s.id_solicitud}/atender`)
    notif.exito('Solicitud marcada como atendida.')
    await cargarSolicitudesRec()
  } catch (err) {
    notif.error(err?.error || 'No se pudo marcar la solicitud. Intenta de nuevo.')
  } finally {
    atendiendoId.value = null
  }
}

// Restablecer: resetea la contraseña a la temporal y muestra la clave + botones
// para avisar al cliente (no tiene acceso a la app, se le avisa por fuera).
const resueltaInfo = ref(null) // { nombre, correo, telefono, password }
async function resolverSolicitud(s) {
  atendiendoId.value = s.id_solicitud
  try {
    const res = await clienteHttp.patch(`/usuarios/solicitudes-recuperacion/${s.id_solicitud}/resolver`)
    resueltaInfo.value = {
      nombre: res.contacto?.nombre || s.nombre_contacto || 'Cliente',
      correo: res.contacto?.correo || s.correo,
      telefono: res.contacto?.telefono || null,
      password: res.password_temporal,
    }
    notif.exito('Contraseña restablecida. Avísale al cliente su clave temporal.')
    await cargarSolicitudesRec()
  } catch (err) {
    notif.error(err?.error || 'No se pudo restablecer la contraseña.')
  } finally {
    atendiendoId.value = null
  }
}
// Bolivia: 8 dígitos → prefijo 591 para el enlace de WhatsApp
function linkWhatsapp(info) {
  const digitos = String(info.telefono || '').replace(/\D/g, '')
  if (!digitos) return null
  const numero = digitos.startsWith('591') ? digitos : `591${digitos}`
  const msg = `Hola ${info.nombre}, tu contraseña de Euphoria fue restablecida. Tu clave temporal es: ${info.password}. Ingresa y cámbiala desde tu perfil.`
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
}
function linkCorreo(info) {
  const asunto = 'Tu cuenta de Euphoria fue restablecida'
  const cuerpo = `Hola ${info.nombre},\n\nRestablecimos tu contraseña. Tu clave temporal es: ${info.password}\n\nIngresa con ella y cámbiala desde tu perfil.\n\n— Euphoria`
  return `mailto:${info.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
}
async function cargarResumenNotif() {
  try {
    const r = await clienteHttp.get('/comandas/resumen-ventas')
    const metodos = r.por_metodo || []
    const top = metodos.length ? metodos.reduce((m, x) => (x.cantidad > m.cantidad ? x : m)) : null
    resumenNotif.value = {
      ingresos: r.totales?.ingresos ?? 0,
      comandas: r.totales?.num_comandas ?? 0,
      topProducto: r.ranking_productos?.[0]?.nombre || '—',
      metodoTop: top ? top.metodo : '—',
    }
    notifHora.value = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
  } catch { /* el panel muestra los últimos datos conocidos */ }
  // Estado del motor de IA (si está caído, es algo que el dueño debe resolver)
  try {
    const est = await clienteHttp.get('/recomendaciones/estado')
    motorIACaido.value = !est?.en_linea
  } catch { motorIACaido.value = true }
  // Pedidos en curso (informativo para el dueño)
  try {
    const [pen, pre] = await Promise.all([
      clienteHttp.get('/comandas?estado=Pendiente&pagina=1&limite=1'),
      clienteHttp.get('/comandas?estado=Preparando&pagina=1&limite=1'),
    ])
    pedidosEnCurso.value = { pendientes: pen.total ?? 0, preparando: pre.total ?? 0 }
  } catch { /* se mantienen los últimos valores */ }
}
function alternarNotif() {
  notifAbierto.value = !notifAbierto.value
  if (notifAbierto.value) {
    // Al abrir, se refresca todo en silencio (sin toast repetido)
    revisarStockBajo(false)
    cargarResumenNotif()
    cargarSolicitudesRec()
  }
}
function cerrarNotifFuera() { notifAbierto.value = false }

onMounted(() => {
  window.addEventListener('resize', actualizarAncho)
  document.addEventListener('click', cerrarNotifFuera)
  revisarStockBajo()
  cargarResumenNotif()
  cargarSolicitudesRec()
  // El chequeo periódico refresca stock Y el estado del resto (motor IA, pedidos, recuperaciones)
  intervaloStock = setInterval(() => { revisarStockBajo(); cargarResumenNotif(); cargarSolicitudesRec() }, 10 * 60 * 1000)
})
onUnmounted(() => {
  window.removeEventListener('resize', actualizarAncho)
  document.removeEventListener('click', cerrarNotifFuera)
  if (intervaloStock) clearInterval(intervaloStock)
})

const menuItems = [
  { ruta: 'usuarios',  nombre: 'Usuarios',   icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { ruta: 'productos', nombre: 'Productos',  icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 20 16z"/></svg>' },
  { ruta: 'eventos',   nombre: 'Eventos',    icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { ruta: 'ventas',    nombre: 'Ventas',     icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
  { ruta: 'zonas',     nombre: 'Planos',     icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>' },
  { ruta: 'aforo',     nombre: 'Aforo',      icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><circle cx="12" cy="12" r="10" opacity="0.25"/></svg>' },
  { ruta: 'reportes',  nombre: 'Reportes',   icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
  { ruta: 'ia',        nombre: 'Panel IA',   icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.4L22 18l-2.1.6L19 21l-.9-2.4L16 18l2.1-.6z"/></svg>' },
  { ruta: 'fidelizacion', nombre: 'Clientes', icono: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
]

const rutaActual   = computed(() => ruta.path)
const tituloPagina = computed(() => menuItems.find(m => ruta.path.includes(m.ruta))?.nombre ?? 'Panel')
const iniciales    = computed(() => (tienda.usuario?.nombres ?? '').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase())
const urlFoto      = computed(() => tienda.usuario?.url_foto_perfil ?? tienda.usuario?.foto ?? null)

function cerrar() {
  tienda.cerrarSesion()
  // Navegación dura: re-arranca la app limpia en /login (evita el estado
  // colgado que dejaba la pantalla en blanco hasta refrescar) y limpia
  // sockets/intervalos/fetches en vuelo del panel.
  window.location.assign('/login')
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
  /* sin backdrop-filter: sobre fondo plano no aporta y puede pintar
     un rectángulo de luz en algunas GPUs al repintar */
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

/* Tablet: sidebar como drawer flotante, ancho acotado.
   OJO: la regla de colapsado debe seguir ganando aquí, si no el botón
   hamburguesa "no cierra" (solo cambiaban los iconos). */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar-euphoria {
    width: min(var(--ancho-sidebar), 240px);
  }
  .sidebar-euphoria.sidebar-angosto {
    width: 76px;
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
/* Monograma para el sidebar colapsado (el wordmark no cabe en 76px).
   La "e" ES la del logo (SVG trazado del glifo real que cargó el usuario),
   con el mismo acabado NEÓN del logo grande: sin recuadro, glow morado/rosa. */
.sidebar-logo-mono {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.34s var(--ease-suave), filter 0.3s ease;
}
.logo-mono-e {
  width: 42px;
  height: 42px;
  /* Trazo con el degradado de marca (mismo que el wordmark) recortado al path */
  color: var(--morado-brillante);
  fill: url(#grad-logo-e);
  filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.65)) drop-shadow(0 0 18px rgba(236, 72, 153, 0.35));
}
.sidebar-logo-mono:hover {
  transform: scale(1.08);
}
.sidebar-logo-mono:hover .logo-mono-e {
  filter: drop-shadow(0 0 14px rgba(168, 85, 247, 0.8)) drop-shadow(0 0 22px rgba(236, 72, 153, 0.5));
}

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
  background: var(--fondo-app);
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
/* ─── Centro de notificaciones ──────────────────────────────────────────── */
.notif-centro { position: relative; }
.btn-campana {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  border-radius: 11px;
  border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta);
  color: var(--texto-secundario);
  cursor: pointer;
  transition: border-color .18s ease, color .18s ease, transform .18s ease;
}
.btn-campana:hover { border-color: var(--morado-brillante); color: var(--texto-principal); transform: translateY(-1px); }
.campana-badge {
  position: absolute; top: -6px; right: -6px;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  color: #fff; font-size: .68rem; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(236, 72, 153, .5);
}
.notif-panel {
  position: absolute; top: calc(100% + 10px); right: 0;
  width: 340px; max-height: 70vh; overflow-y: auto;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-lg);
  box-shadow: 0 18px 44px rgba(0, 0, 0, .55), 0 0 0 1px rgba(168, 85, 247, .12);
  z-index: 200;
  padding: 14px;
}
.notif-cab {
  display: flex; justify-content: space-between; align-items: baseline;
  font-weight: 800; font-size: .95rem; color: var(--texto-principal);
  padding-bottom: 10px; margin-bottom: 10px;
  border-bottom: 1px solid var(--borde-sutil);
}
.notif-hora { font-size: .7rem; font-weight: 500; color: var(--texto-desactivado); }
.notif-sec { margin-bottom: 12px; }
.notif-sec-titulo {
  display: flex; align-items: center; gap: 6px;
  margin: 0 0 8px; font-size: .72rem; font-weight: 800;
  letter-spacing: .06em; text-transform: uppercase; color: var(--texto-secundario);
}
.notif-sec-titulo.alerta { color: var(--color-alerta); }
.notif-sec-titulo.critico { color: var(--color-error); }
.notif-item.critico-fondo {
  background: rgba(239, 68, 68, .08); border-color: rgba(239, 68, 68, .3);
  text-decoration: none; color: inherit; cursor: pointer;
}
.notif-item.critico-fondo:hover { background: rgba(239, 68, 68, .15); }
.notif-vacio.ok { color: var(--color-exito); font-style: normal; font-weight: 600; }
.btn-campana.con-pendientes { border-color: rgba(236, 72, 153, .55); color: var(--texto-principal); }
.notif-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.notif-item {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 7px 10px; border-radius: var(--radio-md);
  background: rgba(245, 158, 11, .07); border: 1px solid rgba(245, 158, 11, .18);
}
.notif-item-nombre { font-size: .82rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notif-item-valor { flex-shrink: 0; font-size: .8rem; font-weight: 800; color: var(--color-alerta); }
.notif-item-valor.critico { color: var(--color-error); }
.notif-vacio { margin: 0; font-size: .8rem; color: var(--texto-desactivado); font-style: italic; }
/* Solicitudes de recuperación de cuenta */
.notif-item.notif-solicitud {
  align-items: flex-start;
  background: rgba(168, 85, 247, .07);
  border-color: rgba(168, 85, 247, .22);
}
.sol-datos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.sol-contacto {
  font-size: .74rem; color: var(--texto-secundario);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sol-senales { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.sol-senal {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: var(--radio-full);
  font-size: .66rem; font-weight: 800; letter-spacing: .03em;
}
.sol-senal.ok     { color: var(--color-exito); background: rgba(34, 197, 94, .12); border: 1px solid rgba(34, 197, 94, .3); }
.sol-senal.mal    { color: var(--color-error); background: rgba(239, 68, 68, .1); border: 1px solid rgba(239, 68, 68, .3); }
.sol-senal.neutro { color: var(--texto-desactivado); background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil); }
.sol-mensaje {
  margin: 2px 0 0; font-size: .72rem; line-height: 1.35;
  color: var(--texto-desactivado); white-space: normal; word-break: break-word;
}
.sol-btn {
  flex-shrink: 0;
  padding: 6px 10px; border-radius: var(--radio-md);
  border: 1px solid rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .1);
  color: var(--color-exito);
  font-family: var(--fuente-principal);
  font-size: .72rem; font-weight: 700;
  cursor: pointer;
  transition: background .18s ease;
}
.sol-btn:hover:not(:disabled) { background: rgba(34, 197, 94, .2); }
.sol-btn:disabled { opacity: .6; cursor: wait; }
.sol-btn:focus-visible { outline: 2px solid var(--color-exito); outline-offset: 2px; }
.sol-acciones { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.sol-btn-reset {
  border-color: rgba(168, 85, 247, .4);
  background: rgba(168, 85, 247, .14);
  color: var(--morado-hover);
}
.sol-btn-reset:hover:not(:disabled) { background: rgba(168, 85, 247, .24); }
.sol-resuelta {
  margin-top: 10px; padding: 10px 12px; border-radius: var(--radio-md);
  background: rgba(168, 85, 247, .1); border: 1px solid rgba(168, 85, 247, .3);
}
.sol-resuelta-cab {
  display: flex; align-items: center; justify-content: space-between;
  font-size: .68rem; font-weight: 700; color: var(--texto-secundario);
  text-transform: uppercase; letter-spacing: .04em;
}
.sol-x { background: none; border: none; color: var(--texto-desactivado); cursor: pointer; font-size: .8rem; padding: 2px; }
.sol-x:hover { color: var(--texto-principal); }
.sol-clave {
  margin: 6px 0; font-family: var(--fuente-titulo); font-weight: 800;
  font-size: 1.5rem; letter-spacing: .18em; color: var(--texto-principal);
  text-align: center;
}
.sol-resuelta-nota { margin: 0 0 8px; font-size: .68rem; color: var(--texto-desactivado); }
.sol-avisos { display: flex; gap: 8px; }
.sol-aviso {
  flex: 1; text-align: center; text-decoration: none;
  padding: 7px 10px; border-radius: var(--radio-md);
  font-size: .74rem; font-weight: 700;
  transition: filter .18s ease;
}
.sol-aviso.wa { background: #1fab54; color: #fff; }
.sol-aviso.mail { background: rgba(168, 85, 247, .18); color: var(--morado-hover); border: 1px solid rgba(168, 85, 247, .35); }
.sol-aviso:hover { filter: brightness(1.1); }
.sol-pie { margin: 8px 0 0; font-size: .68rem; line-height: 1.45; color: var(--texto-desactivado); }
.notif-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.notif-kpi {
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 10px; border-radius: var(--radio-md);
  background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-sutil);
}
.nk-label { font-size: .64rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--texto-desactivado); }
.nk-valor { font-size: 1rem; font-weight: 800; color: var(--texto-principal); font-family: var(--fuente-titulo); }
.nk-valor.nk-texto { font-size: .8rem; line-height: 1.25; }
.notif-ver-reportes {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px; border-radius: var(--radio-md);
  background: rgba(168, 85, 247, .12); border: 1px solid rgba(168, 85, 247, .3);
  color: var(--morado-hover); font-size: .82rem; font-weight: 700; text-decoration: none;
  transition: background .18s ease;
}
.notif-ver-reportes:hover { background: rgba(168, 85, 247, .2); }
.notif-fade-enter-active, .notif-fade-leave-active { transition: opacity .16s ease, transform .16s ease; }
.notif-fade-enter-from, .notif-fade-leave-to { opacity: 0; transform: translateY(-6px); }
@media (max-width: 480px) {
  .notif-panel { position: fixed; top: 62px; right: 10px; left: 10px; width: auto; }
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
