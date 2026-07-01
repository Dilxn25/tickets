<template>
  <div class="vista-usuarios fade-in">
    <div class="vista-cabecera">
      <div>
        <h2 class="vista-titulo">Administración de Usuarios</h2>
        <p class="vista-subtitulo">Gestiona los accesos y roles del sistema</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secundario" @click="abrirModalRoles()">Gestionar Roles</button>
        <button class="btn btn-primario" @click="abrirModal()">+ Nuevo Usuario</button>
      </div>
    </div>
    <div class="filtros-barra">
      <input v-model="busqueda" class="campo" placeholder="🔍 Buscar..." style="max-width:300px" />
      <select v-model="filtroRol" class="campo" style="max-width:180px">
        <option value="">Todos los roles</option>
        <option v-for="r in rolesDb" :key="r.id_rol" :value="r.nombre_rol">{{ r.nombre_rol }}</option>
      </select>
      <select v-model="filtroEstado" class="campo" style="max-width:180px">
        <option value="">Todos los estados</option>
        <option value="activo">activo</option>
        <option value="inactivo">inactivo</option>
      </select>
    </div>
    <div class="tarjeta tabla-wrapper">
      <table class="tabla">
        <thead><tr>
          <th>Usuario</th><th>CI/Carnet</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          <tr v-if="!usuariosFiltrados.length">
            <td colspan="6" class="celda-vacia">Sin resultados</td>
          </tr>
          <tr v-for="u in listaPaginada" :key="u.id_usuario" class="fila-tabla">
            <td>
              <div class="usuario-celda">
                <div class="avatar-tabla">{{ iniciales(u) }}</div>
                <span class="nombre-tabla">{{ u.nombres }} {{ u.apellidos }}</span>
              </div>
            </td>
            <td class="texto-sec">{{ u.ci_carnet || '-' }}</td>
            <td class="texto-sec">{{ u.correo }}</td>
            <td><span class="badge badge-info">{{ u.rol }}</span></td>
            <td><span :class="u.estado_cuenta==='activo'?'badge badge-exito':'badge badge-error'">{{ u.estado_cuenta }}</span></td>
            <td>
              <div class="acciones">
                <button class="btn btn-sm btn-secundario" @click="abrirModal(u)">Editar</button>
                <button
                  v-if="!esUsuarioActual(u)"
                  class="btn btn-sm btn-peligro"
                  @click="alternarEstado(u)"
                >
                  {{ u.estado_cuenta === 'activo' ? 'Bloquear' : 'Desbloquear' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
            <h3>{{ usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
            <button class="btn-x" @click="cerrarModal">✕</button>
          </div>
          <form class="modal-form" @submit.prevent="guardarUsuario">
            <div class="form-fila">
              <div class="grupo-campo"><label class="etiqueta">Nombres *</label><input v-model="form.nombres" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" /></div>
              <div class="grupo-campo"><label class="etiqueta">Apellidos *</label><input v-model="form.apellidos" class="campo" required pattern="[A-Za-zÁÉÍÓÚáéíóúñÑ ]+" title="Solo letras" /></div>
            </div>
            <div class="form-fila">
              <div class="grupo-campo"><label class="etiqueta">CI/Carnet</label><input v-model="form.ci_carnet" class="campo" /></div>
              <div class="grupo-campo"><label class="etiqueta">Teléfono</label><input v-model="form.telefono" class="campo" /></div>
            </div>
            <div class="form-fila">
              <div class="grupo-campo"><label class="etiqueta">Correo *</label><input v-model="form.correo" type="email" class="campo" required /></div>
              <div class="grupo-campo"><label class="etiqueta">Rol *</label>
                <select v-model="form.id_rol" class="campo" required>
                  <option v-for="r in rolesDb" :key="r.id_rol" :value="r.id_rol">{{ r.nombre_rol }}</option>
                </select>
              </div>
            </div>
            <div class="grupo-campo" v-if="!usuarioEditando"><label class="etiqueta">Contraseña *</label><input v-model="form.password" type="password" class="campo" required minlength="6" /></div>
            <div class="modal-footer" :style="{ justifyContent: usuarioEditando ? 'space-between' : 'flex-end' }">
              <button v-if="usuarioEditando" type="button" class="btn btn-peligro" @click="iniciarReseteo">Resetear Contraseña</button>
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
            <h3>Gestionar Roles</h3>
            <button class="btn-x" @click="modalRolesAbierto=false">✕</button>
          </div>
          <div style="padding:1.5rem">
            <div style="display:flex; gap:10px; margin-bottom:1rem;">
              <input v-model="nuevoRolNombre" class="campo" placeholder="Nuevo rol..." />
              <button class="btn btn-primario" @click="crearRol">Añadir</button>
            </div>
            <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:8px;">
              <li v-for="r in rolesDb" :key="r.id_rol" style="display:flex; justify-content:space-between; align-items:center; background:var(--fondo-tarjeta-alt); padding:8px 12px; border-radius:var(--radio-md);">
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
            <h3 style="color: var(--texto-principal); margin-bottom: 10px;">¡Acción Crítica!</h3>
            <p style="color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
              Estás a punto de bloquear a un <strong>ADMINISTRADOR</strong> ({{ adminABanear?.nombres }}).
              Esto le impedirá el acceso total al sistema. ¿Estás absolutamente seguro?
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <button class="btn btn-secundario" style="flex:1;" @click="modalAlertaAdmin=false">Cancelar</button>
              <button class="btn btn-peligro" style="flex:1;" @click="confirmarBanAdmin">Sí, Bloquear</button>
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
            <h3 style="color: var(--texto-principal); margin-bottom: 10px;">¿Resetear Contraseña?</h3>
            <p style="color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
              La contraseña de <strong>{{ usuarioEditando?.nombres }}</strong> se restablecerá a una contraseña temporal que el usuario deberá cambiar en su primer inicio de sesión. ¿Estás seguro?
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <button class="btn btn-secundario" style="flex:1;" @click="modalAlertaReset=false">Cancelar</button>
              <button class="btn btn-primario" style="flex:1; background: var(--color-alerta); color: #000;" @click="confirmarReseteo">Sí, Resetear</button>
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

const tiendaAuth = useTiendaAutenticacion()

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

let debounceFiltros = null
watch([busqueda, filtroRol, filtroEstado], () => {
  pagina.value = 1
  clearTimeout(debounceFiltros)
  debounceFiltros = setTimeout(() => { cargarUsuarios() }, 350)
})

onMounted(() => { cargarUsuarios() })

const iniciales = u => `${u.nombres[0]}${u.apellidos[0]}`.toUpperCase()

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
    alert('Nombres y apellidos no pueden contener números.'); return
  }
  try {
    const payload = { nombres: form.nombres, apellidos: form.apellidos, ci_carnet: form.ci_carnet, telefono: form.telefono, correo: form.correo, id_rol: form.id_rol }
    if (usuarioEditando.value) {
      await servicioUsuarios.editar(usuarioEditando.value.id_usuario, payload)
    } else {
      if (form.password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return }
      payload.password = form.password
      await servicioUsuarios.crear(payload)
    }
    cerrarModal(); cargarUsuarios()
  } catch (error) { alert(error.error || 'Error al guardar usuario') }
}

const esUsuarioActual = (user) => tiendaAuth.usuario?.id != null && user.id_usuario === tiendaAuth.usuario.id

async function alternarEstado(user) {
  if (esUsuarioActual(user) && user.estado_cuenta === 'activo') {
    alert('No puedes bloquear tu propia cuenta.'); return
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
    alert(error.error || 'Error al cambiar el estado del usuario')
  }
}

function iniciarReseteo()    { modalAlertaReset.value = true }

async function confirmarReseteo() {
  if (!usuarioEditando.value) return
  try {
    const res = await servicioUsuarios.resetearPassword(usuarioEditando.value.id_usuario)
    alert(res.mensaje); modalAlertaReset.value = false; cerrarModal()
  } catch (error) { alert(error.error || 'Error al resetear la contraseña') }
}

function abrirModalRoles() { modalRolesAbierto.value = true }

async function crearRol() {
  if (!nuevoRolNombre.value) return
  try {
    await servicioRoles.crear({ nombre_rol: nuevoRolNombre.value })
    nuevoRolNombre.value = ''
    rolesDb.value = await servicioRoles.listar()
  } catch { alert('Error al crear rol') }
}

async function eliminarRol(rol) {
  if (rol.nombre_rol === 'Administrador') { alert('No puedes eliminar el rol de Administrador.'); return }
  if (!confirm(`¿Eliminar el rol "${rol.nombre_rol}"? Los usuarios con este rol podrían quedar sin rol asignado.`)) return
  try {
    await servicioRoles.eliminar(rol.id_rol)
    rolesDb.value = await servicioRoles.listar()
    cargarUsuarios()
  } catch { alert('Error al eliminar rol') }
}
</script>

<style scoped>
.vista-cabecera { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; gap:1rem; flex-wrap:wrap; }
.vista-titulo   { font-size:1.4rem; margin-bottom:.2rem; }
.vista-subtitulo { color:var(--texto-secundario); font-size:.85rem; }
.filtros-barra  { display:flex; gap:.75rem; margin-bottom:1.2rem; flex-wrap:wrap; }
.tabla-wrapper  { padding:0; overflow-x:auto; }
.tabla          { width:100%; border-collapse:collapse; min-width:600px; }
.tabla th       { padding:12px 16px; text-align:left; font-size:.75rem; color:var(--texto-desactivado); font-weight:600; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--borde-sutil); }
.tabla td       { padding:12px 16px; }
.fila-tabla     { border-bottom:1px solid var(--borde-sutil); transition:var(--trans-rapida); }
.fila-tabla:last-child  { border-bottom:none; }
.fila-tabla:hover       { background:rgba(74,44,143,.15); }
.celda-vacia    { text-align:center; color:var(--texto-desactivado); padding:3rem; }
.usuario-celda  { display:flex; align-items:center; gap:10px; }
.avatar-tabla   { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,var(--morado-brillante),var(--rosa-acento)); display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:700; color:#fff; flex-shrink:0; }
.nombre-tabla   { font-size:.88rem; font-weight:500; }
.texto-sec      { color:var(--texto-secundario); font-size:.85rem; }
.acciones       { display:flex; gap:6px; }
.modal-fondo    { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:100; padding:1rem; }
.modal          { background:var(--fondo-tarjeta); border:1px solid var(--borde-sutil); border-radius:var(--radio-xl); width:100%; max-width:520px; box-shadow:var(--sombra-modal); max-height:90dvh; overflow-y:auto; }
.modal-cabecera { display:flex; justify-content:space-between; align-items:center; padding:1.2rem 1.5rem; border-bottom:1px solid var(--borde-sutil); }
.modal-cabecera h3 { font-size:1.1rem; }
.btn-x          { background:none; border:none; color:var(--texto-secundario); font-size:1.1rem; cursor:pointer; }
.btn-x:hover    { color:var(--color-error); }
.modal-form     { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
.form-fila      { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.grupo-campo    { display:flex; flex-direction:column; gap:6px; }
.etiqueta       { font-size:.8rem; color:var(--texto-secundario); font-weight:500; }
.modal-footer   { display:flex; justify-content:flex-end; gap:.75rem; padding-top:.5rem; flex-wrap:wrap; }

/* Tablet: 481px - 1024px */
@media(max-width:1024px) {
  .modal { max-width:min(520px, 92vw); }
}

/* Celular: <=480px */
@media(max-width:480px) {
  .form-fila { grid-template-columns:1fr; }
  .vista-cabecera > div[style] { width:100%; }
  .filtros-barra .campo { max-width:none !important; flex:1 1 100%; }
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
</style>
