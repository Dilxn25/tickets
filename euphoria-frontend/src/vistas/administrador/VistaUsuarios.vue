<template>
  <div class="vista-usuarios fade-in">
    <header class="vista-cabecera aparecer-subir">
      <div class="titulo-bloque">
        <h2 class="vista-titulo">Administración de usuarios</h2>
        <p class="vista-subtitulo">Gestiona los accesos y roles del sistema</p>
      </div>
      <div class="cabecera-acciones">
        <button class="btn btn-secundario hover-crecer" @click="abrirModalRoles()">Gestionar roles</button>
        <button class="btn btn-primario brillo-hover hover-crecer" @click="abrirModal()">+ Nuevo usuario</button>
      </div>
    </header>

    <section class="stats-tira aparecer-subir" aria-label="Resumen de usuarios">
      <div class="stat-celda">
        <span class="stat-etiqueta">Usuarios</span>
        <span class="stat-numero">{{ usuarios.length }}</span>
      </div>
      <div class="stat-celda">
        <span class="stat-etiqueta">Activos</span>
        <span class="stat-numero stat-exito">{{ usuarios.filter(u => u.estado_cuenta === 'activo').length }}</span>
      </div>
      <div class="stat-celda">
        <span class="stat-etiqueta">Bloqueados</span>
        <span class="stat-numero stat-error">{{ usuarios.filter(u => u.estado_cuenta !== 'activo').length }}</span>
      </div>
      <div class="stat-celda">
        <span class="stat-etiqueta">Roles</span>
        <span class="stat-numero">{{ rolesDb.length }}</span>
      </div>
    </section>

    <div class="filtros-barra superficie aparecer-subir">
      <div class="buscador-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" class="buscador-icono"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="busqueda" class="campo buscador-input" placeholder="Buscar por nombre, correo o CI…" />
      </div>
      <div class="campo-filtro">
        <BaseSelect v-model="filtroRol" :options="opcionesFiltroRol" placeholder="Todos los roles" />
      </div>
      <div class="campo-filtro">
        <BaseSelect v-model="filtroEstado" :options="opcionesFiltroEstado" placeholder="Todos los estados" />
      </div>
      <span class="filtros-conteo">{{ usuariosFiltrados.length }} resultado{{ usuariosFiltrados.length === 1 ? '' : 's' }}</span>
    </div>

    <div class="tabla-panel superficie aparecer-subir">
      <div class="tabla-scroll">
      <table class="tabla responsiva">
        <thead><tr>
          <th>Usuario</th><th>CI/Carnet</th><th>Correo</th><th>Rol</th><th>Estado</th><th class="th-acciones">Acciones</th>
        </tr></thead>
        <tbody>
          <tr v-if="!usuariosFiltrados.length">
            <td colspan="6" class="celda-vacia">
              <div class="estado-vacio">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
                <p class="estado-vacio-titulo">No hay usuarios que coincidan</p>
                <span class="estado-vacio-texto">Ajusta la búsqueda o los filtros para ver más resultados.</span>
              </div>
            </td>
          </tr>
          <tr v-for="u in listaPaginada" :key="u.id_usuario" class="fila-tabla fila-entra">
            <td class="sin-label">
              <div class="usuario-celda">
                <div class="avatar-tabla">{{ iniciales(u) }}</div>
                <span class="nombre-tabla">{{ u.nombres }} {{ u.apellidos }}</span>
              </div>
            </td>
            <td class="texto-sec celda-mono" data-label="CI/Carnet">{{ u.ci_carnet || '—' }}</td>
            <td class="texto-sec" data-label="Correo">{{ u.correo }}</td>
            <td data-label="Rol"><span class="badge badge-rol"><span class="punto-rol" :style="{ background: colorRol(u.rol) }" />{{ u.rol }}</span></td>
            <td data-label="Estado">
              <span class="punto-cuenta" :class="u.estado_cuenta === 'activo' ? 'activa' : 'bloqueada'"
                    :title="u.estado_cuenta === 'activo' ? 'Cuenta activa' : 'Cuenta bloqueada'"
                    role="img" :aria-label="u.estado_cuenta === 'activo' ? 'Cuenta activa' : 'Cuenta bloqueada'"></span>
            </td>
            <td class="sin-label">
              <div class="acciones">
                <button class="btn-acc" @click="abrirModal(u)" title="Editar usuario" aria-label="Editar usuario">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button
                  v-if="!esUsuarioActual(u)"
                  class="btn-acc acc-bloquear"
                  :class="{ activa: u.estado_cuenta !== 'activo' }"
                  @click="alternarEstado(u)"
                  :title="u.estado_cuenta === 'activo' ? 'Bloquear el acceso' : 'Desbloquear el acceso'"
                  :aria-label="u.estado_cuenta === 'activo' ? 'Bloquear usuario' : 'Desbloquear usuario'"
                >
                  <svg v-if="u.estado_cuenta === 'activo'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <Paginacion
      :total="usuariosFiltrados.length"
      :pagina="pagina"
      :limite="limite"
      @update:pagina="pagina = $event"
      @update:limite="l => { limite = l; pagina = 1 }"
    />

    <!-- Modal Crear / Editar -->
    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
        <div class="modal fade-in">
          <div class="modal-cabecera">
            <h3>{{ usuarioEditando ? 'Editar usuario' : 'Nuevo usuario' }}</h3>
            <button class="btn-x" @click="cerrarModal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <form class="modal-form" @submit.prevent="guardarUsuario">
            <div class="form-fila">
              <div class="grupo-campo"><label class="etiqueta">Nombres *</label><input v-model="form.nombres" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" /></div>
              <div class="grupo-campo"><label class="etiqueta">Apellidos *</label><input v-model="form.apellidos" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" /></div>
            </div>
            <div class="form-fila">
              <div class="grupo-campo"><label class="etiqueta">CI/Carnet</label><input v-model="form.ci_carnet" class="campo" /></div>
              <div class="grupo-campo"><label class="etiqueta">Teléfono</label><BaseTelefono v-model="form.telefono" /></div>
            </div>
            <div class="form-fila">
              <div class="grupo-campo"><label class="etiqueta">Correo *</label><input v-model="form.correo" type="email" class="campo" required /></div>
              <div class="grupo-campo"><label class="etiqueta">Rol *</label>
                <BaseSelect v-model="form.id_rol" :options="opcionesRolForm" placeholder="Seleccionar rol…" />
              </div>
            </div>
            <div class="grupo-campo" v-if="!usuarioEditando"><label class="etiqueta">Contraseña *</label><input v-model="form.password" type="password" class="campo" required minlength="6" /></div>
            <div class="modal-footer" :style="{ justifyContent: usuarioEditando ? 'space-between' : 'flex-end' }">
              <button v-if="usuarioEditando" type="button" class="btn btn-peligro" @click="iniciarReseteo">Resetear contraseña</button>
              <div style="display:flex; gap:0.75rem;">
                <button type="button" class="btn btn-secundario" @click="cerrarModal">Cancelar</button>
                <button type="submit" class="btn btn-primario">{{ usuarioEditando ? 'Guardar' : 'Crear' }}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal Gestión de Roles -->
    <Teleport to="body">
      <div v-if="modalRolesAbierto" class="modal-fondo" @click.self="modalRolesAbierto=false">
        <div class="modal fade-in" style="max-width:400px">
          <div class="modal-cabecera">
            <h3>Gestionar roles</h3>
            <button class="btn-x" @click="modalRolesAbierto=false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div style="padding:1.5rem">
            <div style="display:flex; gap:10px; margin-bottom:1rem;">
              <input v-model="nuevoRolNombre" class="campo" placeholder="Nuevo rol..." />
              <button class="btn btn-primario" @click="crearRol">Añadir</button>
            </div>
            <ul class="escalonar" style="list-style:none; padding:0; display:flex; flex-direction:column; gap:8px;">
              <li v-for="r in rolesDb" :key="r.id_rol" class="fila-rol" style="display:flex; justify-content:space-between; align-items:center; background:var(--fondo-tarjeta-alt); padding:8px 12px; border-radius:var(--radio-md);">
                <span>{{ r.nombre_rol }}</span>
                <button class="btn btn-sm btn-peligro" @click="eliminarRol(r)">Eliminar</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Alerta Bloqueo Admin -->
    <Teleport to="body">
      <div v-if="modalAlertaAdmin" class="modal-fondo" @click.self="modalAlertaAdmin=false">
        <div class="modal fade-in" style="max-width:400px; text-align: center; border-left: 4px solid var(--color-error);">
          <div class="modal-cabecera" style="justify-content: center; border: none; padding-bottom: 0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 10px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style="padding:0 1.5rem 1.5rem 1.5rem;">
            <h3 style="color: var(--texto-principal); margin-bottom: 10px;">Acción crítica</h3>
            <p style="color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
              Estás a punto de bloquear a un <strong>administrador</strong> ({{ adminABanear?.nombres }}).
              Esto le impedirá el acceso total al sistema. ¿Deseas continuar?
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <button class="btn btn-secundario" style="flex:1;" @click="modalAlertaAdmin=false">Cancelar</button>
              <button class="btn btn-peligro" style="flex:1;" @click="confirmarBanAdmin">Sí, bloquear</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Alerta Reset Password -->
    <Teleport to="body">
      <div v-if="modalAlertaReset" class="modal-fondo" @click.self="modalAlertaReset=false">
        <div class="modal fade-in" style="max-width:400px; text-align: center; border-left: 4px solid var(--color-alerta);">
          <div class="modal-cabecera" style="justify-content: center; border: none; padding-bottom: 0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-alerta)" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 10px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style="padding:0 1.5rem 1.5rem 1.5rem;">
            <h3 style="color: var(--texto-principal); margin-bottom: 10px;">¿Resetear contraseña?</h3>
            <p style="color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
              La contraseña de <strong>{{ usuarioEditando?.nombres }}</strong> se restablecerá a la contraseña temporal <strong>123456</strong>. Compártela con el usuario para que pueda ingresar y cambiarla desde su perfil. ¿Estás seguro?
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <button class="btn btn-secundario" style="flex:1;" @click="modalAlertaReset=false">Cancelar</button>
              <button class="btn btn-primario" style="flex:1; background: var(--color-alerta); color: #000;" @click="confirmarReseteo">Sí, resetear</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { servicioUsuarios } from '@/servicios-api/servicio-usuarios.js'
import { servicioRoles }    from '@/servicios-api/servicio-roles.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import Paginacion from '@/componentes/comunes/Paginacion.vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import BaseTelefono from '@/componentes/comunes/BaseTelefono.vue'
import { useTiempoReal } from '@/composables/useTiempoReal'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()
const tiendaAuth = useTiendaAutenticacion()

// Color sutil por rol: solo un punto, para escanear la tabla sin recargar el diseño.
const COLORES_ROL = {
  'Administrador': '#a855f7',
  'Cajero':        '#22c55e',
  'Mesero':        '#3b82f6',
  'Recepcionista': '#ec4899',
  'Bartender':     '#f59e0b',
  'Cliente':       '#06b6d4',
}
const colorRol = (nombre) => COLORES_ROL[nombre] || '#8b8b96'

const opcionesFiltroRol = computed(() => [
  { value: '', label: 'Todos los roles' },
  ...rolesDb.value.map(r => ({ value: r.nombre_rol, label: r.nombre_rol, color: colorRol(r.nombre_rol) })),
])
const opcionesFiltroEstado = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo',   label: 'Activo',   color: '#22c55e' },
  { value: 'inactivo', label: 'Inactivo', color: '#ef4444' },
]
const opcionesRolForm = computed(() =>
  rolesDb.value.map(r => ({ value: r.id_rol, label: r.nombre_rol, color: colorRol(r.nombre_rol) }))
)

const busqueda     = ref(''); const filtroRol = ref(''); const filtroEstado = ref(''); const cargando = ref(false)
const pagina       = ref(1);  const limite = ref(20)
const usuarios     = ref([])
const rolesDb      = ref([])
const modalAbierto = ref(false); const usuarioEditando  = ref(null)
const modalRolesAbierto = ref(false); const nuevoRolNombre = ref('')
const modalAlertaAdmin  = ref(false); const adminABanear  = ref(null)
const modalAlertaReset  = ref(false)
const form = reactive({ nombres:'', apellidos:'', ci_carnet:'', telefono:'', correo:'', id_rol:'', password:'' })

async function cargarUsuarios() {
  cargando.value = true
  try {
    const [data, rolesData] = await Promise.all([
      servicioUsuarios.listar({ busqueda: busqueda.value, rol: filtroRol.value, estado: filtroEstado.value }),
      servicioRoles.listar()
    ])
    usuarios.value = data
    rolesDb.value  = rolesData
  } catch (error) { console.error('Error cargando datos:', error) }
  finally { cargando.value = false }
}

const usuariosFiltrados = computed(() => {
  return usuarios.value.filter(u => {
    const matchBusqueda = (u.nombres + ' ' + u.apellidos + ' ' + u.correo + ' ' + (u.ci_carnet||'') + ' ' + (u.telefono||'')).toLowerCase().includes(busqueda.value.toLowerCase())
    const matchRol      = filtroRol.value    ? u.rol          === filtroRol.value    : true
    const matchEstado   = filtroEstado.value ? u.estado_cuenta === filtroEstado.value : true
    return matchBusqueda && matchRol && matchEstado
  })
})

const listaPaginada = computed(() => {
  const ini = (pagina.value - 1) * limite.value
  return usuariosFiltrados.value.slice(ini, ini + limite.value)
})

// El filtrado es instantáneo en cliente (computed). Solo reiniciamos la página
// al cambiar un filtro; ya no hay refetch por tecla (esa era la causa del lag).
watch([busqueda, filtroRol, filtroEstado], () => { pagina.value = 1 })

onMounted(() => { cargarUsuarios() })
// Tiempo real: si un usuario cambia sus datos (o los cambia otro admin), refrescar.
useTiempoReal('usuarios', () => cargarUsuarios())

const iniciales = u => `${(u.nombres || '?').charAt(0)}${(u.apellidos || '').charAt(0)}`.toUpperCase()

function abrirModal(u = null) {
  usuarioEditando.value = u
  if (u) {
    const rolEncontrado = rolesDb.value.find(r => r.nombre_rol === u.rol)
    Object.assign(form, { ...u, id_rol: rolEncontrado?.id_rol || '', password: '' })
  } else {
    Object.assign(form, { nombres:'', apellidos:'', ci_carnet:'', telefono:'', correo:'', id_rol: rolesDb.value[0]?.id_rol || '', password:'' })
  }
  modalAbierto.value = true
}

function cerrarModal() { modalAbierto.value = false }

async function guardarUsuario() {
  if (/\d/.test(form.nombres) || /\d/.test(form.apellidos)) {
    notif.advertencia('Nombres y apellidos no pueden contener números.'); return
  }
  const editando = !!usuarioEditando.value
  try {
    const payload = { nombres: form.nombres, apellidos: form.apellidos, ci_carnet: form.ci_carnet, telefono: form.telefono, correo: form.correo, id_rol: form.id_rol }
    if (usuarioEditando.value) {
      await servicioUsuarios.editar(usuarioEditando.value.id_usuario, payload)
    } else {
      if (form.password.length < 6) { notif.advertencia('La contraseña debe tener al menos 6 caracteres'); return }
      payload.password = form.password
      await servicioUsuarios.crear(payload)
    }
    cerrarModal(); cargarUsuarios()
    notif.exito(editando ? 'Usuario actualizado' : 'Usuario creado')
  } catch (error) { notif.error(error.error || 'Error al guardar usuario') }
}

const esUsuarioActual = (user) => tiendaAuth.usuario?.id != null && user.id_usuario === tiendaAuth.usuario.id

async function alternarEstado(user) {
  if (esUsuarioActual(user) && user.estado_cuenta === 'activo') {
    notif.advertencia('No puedes bloquear tu propia cuenta.'); return
  }
  if (user.rol === 'Administrador' && user.estado_cuenta === 'activo') {
    adminABanear.value = user; modalAlertaAdmin.value = true; return
  }
  ejecutarCambioEstado(user)
}

async function confirmarBanAdmin() {
  if (!adminABanear.value) return
  await ejecutarCambioEstado(adminABanear.value)
  modalAlertaAdmin.value = false; adminABanear.value = null
}

async function ejecutarCambioEstado(user) {
  try {
    await servicioUsuarios.cambiarEstado(user.id_usuario, user.estado_cuenta === 'activo' ? 'inactivo' : 'activo')
    cargarUsuarios()
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    notif.error(error.error || 'Error al cambiar el estado del usuario')
  }
}

function iniciarReseteo()    { modalAlertaReset.value = true }

async function confirmarReseteo() {
  if (!usuarioEditando.value) return
  try {
    const res = await servicioUsuarios.resetearPassword(usuarioEditando.value.id_usuario)
    notif.exito(res.mensaje); modalAlertaReset.value = false; cerrarModal()
  } catch (error) { notif.error(error.error || 'Error al resetear la contraseña') }
}

function abrirModalRoles() { modalRolesAbierto.value = true }

async function crearRol() {
  if (!nuevoRolNombre.value) return
  try {
    await servicioRoles.crear({ nombre_rol: nuevoRolNombre.value })
    nuevoRolNombre.value = ''
    rolesDb.value = await servicioRoles.listar()
    notif.exito('Rol creado')
  } catch { notif.error('Error al crear rol') }
}

async function eliminarRol(rol) {
  if (rol.nombre_rol === 'Administrador') { notif.advertencia('No puedes eliminar el rol de Administrador.'); return }
  const ok = await notif.confirmar({
    variante: 'peligro',
    titulo: `Eliminar rol "${rol.nombre_rol}"`,
    mensaje: 'Los usuarios que tengan este rol serán reasignados al rol "Otro". ¿Deseas continuar?',
    textoConfirmar: 'Sí, eliminar',
  })
  if (!ok) return
  try {
    await servicioRoles.eliminar(rol.id_rol)
    rolesDb.value = await servicioRoles.listar()
    cargarUsuarios()
    notif.exito('Rol eliminado')
  } catch { notif.error('Error al eliminar rol') }
}
</script>

<style scoped>
.vista-usuarios { display:flex; flex-direction:column; }
.vista-cabecera { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.25rem; gap:1rem; flex-wrap:wrap; }
.titulo-bloque  { min-width:0; }
.vista-titulo   { font-family:var(--fuente-titulo); font-size:1.75rem; font-weight:800; color:var(--texto-principal); letter-spacing:-0.025em; line-height:1.1; margin-bottom:.3rem; text-wrap:balance; }
.vista-subtitulo { color:var(--texto-secundario); font-size:.9rem; line-height:1.5; }
.cabecera-acciones { display:flex; gap:.625rem; flex-wrap:wrap; }

/* Tira de métricas rápidas (densidad de herramienta) */
.stats-tira     { display:grid; grid-template-columns:repeat(4, 1fr); gap:.75rem; margin-bottom:1.1rem; }
.stat-celda     { position:relative; display:flex; flex-direction:column; gap:.15rem; padding:.85rem 1.1rem; border-radius:var(--radio-lg); background:var(--gradiente-sutil); border:1px solid var(--borde-sutil); box-shadow:inset 0 1px 0 rgba(255,255,255,.05); overflow:hidden; }
.stat-celda::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--gradiente-marca); opacity:.85; }
.stat-etiqueta  { font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--texto-desactivado); }
.stat-numero    { font-family:var(--fuente-titulo); font-size:1.85rem; font-weight:800; line-height:1; letter-spacing:-.02em; color:var(--texto-principal); font-variant-numeric:tabular-nums; }
.stat-exito     { color:var(--color-exito); }
.stat-error     { color:var(--color-error); }

.filtros-barra  { display:flex; gap:.7rem; margin-bottom:1.1rem; flex-wrap:wrap; align-items:center; padding:.85rem; }
.buscador-wrap  { position:relative; flex:1 1 260px; min-width:200px; max-width:380px; }
.buscador-icono { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--texto-desactivado); pointer-events:none; }
.buscador-input { width:100%; padding-left:40px; }
.campo-filtro   { flex:0 1 180px; min-width:150px; }
.filtros-conteo { margin-left:auto; padding:.35rem .7rem; border-radius:var(--radio-full); background:rgba(168,85,247,.12); border:1px solid var(--borde-sutil); font-size:.75rem; font-weight:600; color:var(--texto-secundario); font-variant-numeric:tabular-nums; white-space:nowrap; flex-shrink:0; }

.tabla-panel    { overflow:hidden; }
.tabla-scroll   { overflow-x:auto; }
.tabla          { width:100%; border-collapse:collapse; min-width:600px; }
.tabla th       { padding:14px 16px; text-align:left; font-size:.7rem; color:var(--texto-secundario); font-weight:700; text-transform:uppercase; letter-spacing:.07em; border-bottom:1px solid var(--borde-sutil); background:linear-gradient(180deg, rgba(168,85,247,.12), rgba(168,85,247,.04)); backdrop-filter:blur(6px); position:sticky; top:0; z-index:1; }
.tabla th.th-acciones { text-align:right; }
.tabla td       { padding:13px 16px; }
.fila-tabla     { border-bottom:1px solid var(--borde-sutil); transition:background-color .2s var(--ease-suave), box-shadow .2s ease; }
.fila-tabla:last-child  { border-bottom:none; }
.fila-tabla:hover       { background:rgba(168,85,247,.08); box-shadow:inset 3px 0 0 var(--morado-brillante); }
.celda-vacia    { text-align:center; color:var(--texto-desactivado); padding:3.5rem 1.5rem; }
.estado-vacio   { display:flex; flex-direction:column; align-items:center; gap:.6rem; }
.estado-vacio svg { color:var(--morado-brillante); opacity:.7; }
.estado-vacio-titulo { color:var(--texto-secundario); font-size:.95rem; font-weight:600; }
.estado-vacio-texto  { color:var(--texto-desactivado); font-size:.82rem; max-width:34ch; line-height:1.5; }
.usuario-celda  { display:flex; align-items:center; gap:11px; }
.avatar-tabla   { width:36px; height:36px; border-radius:50%; background:var(--gradiente-marca); display:flex; align-items:center; justify-content:center; font-size:.74rem; font-weight:700; letter-spacing:.02em; color:#fff; flex-shrink:0; box-shadow:0 2px 10px rgba(168,85,247,.4), inset 0 1px 0 rgba(255,255,255,.18); transition:transform .2s var(--ease-rebote), box-shadow .2s ease; }
.fila-tabla:hover .avatar-tabla { transform:scale(1.08); box-shadow:0 4px 16px rgba(236,72,153,.45), inset 0 1px 0 rgba(255,255,255,.22); }
.nombre-tabla   { font-size:.9rem; font-weight:600; letter-spacing:-.01em; }
.texto-sec      { color:var(--texto-secundario); font-size:.85rem; }
.celda-mono     { font-variant-numeric:tabular-nums; letter-spacing:.01em; }
.con-punto      { display:inline-flex; align-items:center; gap:6px; }
.con-punto::before { content:''; width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 6px currentColor; flex-shrink:0; }
/* Badges refinados: pill con borde tintado y numeración tabular */
.tabla .badge   { border-radius:var(--radio-full); font-weight:600; letter-spacing:.01em; padding:.28rem .65rem; }
.tabla .badge-info { background:rgba(168,85,247,.14); color:var(--morado-hover); border:1px solid var(--borde-sutil); }
.tabla .badge-rol { display:inline-flex; align-items:center; gap:7px; background:var(--fondo-tarjeta-alt); color:var(--texto-principal); border:1px solid var(--borde-sutil); font-weight:600; }
.punto-rol { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.tabla .badge-exito.con-punto { background:rgba(34,197,94,.12); border:1px solid rgba(34,197,94,.32); color:var(--color-exito); }
.tabla .badge-error.con-punto { background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.32); color:var(--color-error); }
.acciones       { display:flex; gap:6px; justify-content:flex-end; }
/* Acciones con icono: la tabla deja de repetir "Editar/Bloquear" en cada fila */
.btn-acc {
  display:grid; place-items:center; width:32px; height:32px; cursor:pointer;
  border-radius:var(--radio-md); border:1px solid var(--borde-sutil);
  background:rgba(255,255,255,.04); color:var(--texto-secundario);
  transition:var(--trans-rapida);
}
.btn-acc svg { width:16px; height:16px; }
.btn-acc:hover { border-color:var(--morado-brillante); background:rgba(168,85,247,.16); color:var(--texto-principal); transform:translateY(-2px); }
.btn-acc.acc-bloquear:hover { border-color:var(--color-error); background:rgba(239,68,68,.15); color:var(--color-error); }
.btn-acc.acc-bloquear.activa { color:var(--color-alerta); border-color:rgba(245,158,11,.4); }
.btn-acc.acc-bloquear.activa:hover { border-color:var(--color-exito); background:rgba(34,197,94,.15); color:var(--color-exito); }

/* Estado de la cuenta: un punto, no una palabra repetida 21 veces */
.punto-cuenta { display:inline-block; width:11px; height:11px; border-radius:50%; }
.punto-cuenta.activa { background:var(--color-exito); box-shadow:0 0 0 3px rgba(34,197,94,.18); }
.punto-cuenta.bloqueada { background:var(--color-error); box-shadow:0 0 0 3px rgba(239,68,68,.18); }
.fila-tabla td:last-child .acciones { justify-content:flex-end; }
.acciones .btn:active { transform:translateY(1px); }
.btn-x:focus-visible, .acciones .btn:focus-visible, .cabecera-acciones .btn:focus-visible { outline:2px solid var(--morado-brillante); outline-offset:2px; }
.fila-rol       { transition:background-color .2s var(--ease-suave), transform .2s var(--ease-suave); }
.fila-rol:hover { background:rgba(168,85,247,.16) !important; transform:translateX(2px); }
.modal-fondo    { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:100; padding:1rem; }
.modal          { background:var(--fondo-tarjeta); border:1px solid var(--borde-sutil); border-radius:var(--radio-xl); width:100%; max-width:520px; box-shadow:var(--sombra-modal); max-height:90dvh; overflow-y:auto; }
.modal-cabecera { display:flex; justify-content:space-between; align-items:center; padding:1.2rem 1.5rem; border-bottom:1px solid var(--borde-sutil); }
.modal-cabecera h3 { font-size:1.15rem; font-weight:700; letter-spacing:-.01em; }
.btn-x          { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:none; border:none; border-radius:var(--radio-sm); color:var(--texto-secundario); font-size:1.1rem; cursor:pointer; transition:color .2s ease, background-color .2s ease, transform .2s var(--ease-rebote); }
.btn-x:hover    { color:var(--color-error); background:rgba(239,68,68,.12); transform:rotate(90deg); }
.modal-form     { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
.form-fila      { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.grupo-campo    { display:flex; flex-direction:column; gap:6px; }
.etiqueta       { font-size:.8rem; color:var(--texto-secundario); font-weight:600; letter-spacing:.01em; }
.modal-footer   { display:flex; justify-content:flex-end; gap:.75rem; padding-top:.5rem; flex-wrap:wrap; }

/* Tablet: 481px - 1024px */
@media(max-width:1024px) {
  .modal { max-width:min(520px, 92vw); }
  .cabecera-acciones { width:100%; }
  .cabecera-acciones .btn { flex:1 1 auto; }
}

/* Móvil intermedio: la tira de métricas pasa a 2 columnas */
@media(max-width:640px) {
  .stats-tira { grid-template-columns:repeat(2, 1fr); }
}

/* Celular: <=480px */
@media(max-width:480px) {
  .form-fila { grid-template-columns:1fr; }
  .titulo-bloque { width:100%; }
  .buscador-wrap { flex:1 1 100%; max-width:none; }
  .campo-filtro { flex:1 1 100%; max-width:none; min-width:0; }
  .filtros-barra .campo { max-width:none !important; }
  .filtros-conteo { margin-left:0; }
  .stat-numero { font-size:1.6rem; }
  .modal { max-width:100%; border-radius:var(--radio-lg); }
  .modal-cabecera { padding:1rem 1.1rem; }
  .modal-form { padding:1.1rem; }
  .modal-footer { flex-direction:column-reverse; align-items:stretch; justify-content:flex-start !important; }
  .modal-footer > div[style] { display:flex; gap:.75rem; }
  .modal-footer > div[style] .btn { flex:1; }
  .modal-footer .btn { width:100%; }
  .acciones { flex-wrap:wrap; }
}

/* Se mantiene el breakpoint original para no romper diseños intermedios */
@media(max-width:500px) { .form-fila { grid-template-columns:1fr; } }

@media (prefers-reduced-motion: reduce) {
  .fila-tabla, .avatar-tabla, .fila-tabla:hover .avatar-tabla,
  .btn-x, .btn-x:hover, .fila-rol, .fila-rol:hover, .acciones .btn { transition:none; transform:none; }
}
</style>
