<template>
  <div class="campana-wrap">
    <button class="campana-btn" @click="alternar" title="Notificaciones" aria-label="Notificaciones">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      <span v-if="noLeidas > 0" class="campana-badge">{{ noLeidas > 9 ? '9+' : noLeidas }}</span>
    </button>

    <Teleport to="body">
      <div v-if="abierto" class="cn-overlay" @click.self="abierto = false">
        <div class="cn-panel" :style="panelPos">
          <header class="cn-head">
            <b>Notificaciones</b>
          </header>
          <div class="cn-tabs">
            <button class="cn-tab" :class="{ activo: tab === 'nuevas' }" @click="tab = 'nuevas'">
              Nuevas <span v-if="noLeidas" class="cn-tab-n">{{ noLeidas }}</span>
            </button>
            <button class="cn-tab" :class="{ activo: tab === 'leidas' }" @click="tab = 'leidas'">Leídas</button>
            <button v-if="tab === 'nuevas' && noLeidas > 0" class="cn-accion" @click="leerTodas">Marcar leídas</button>
            <button v-if="tab === 'leidas' && leidas.length" class="cn-accion borrar" @click="borrarLeidas">Borrar todas</button>
          </div>

          <div v-if="!visibles.length" class="cn-vacia">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="34" height="34"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path></svg>
            <span>{{ tab === 'nuevas' ? 'Sin novedades por ahora' : 'No hay notificaciones leídas' }}</span>
          </div>
          <ul v-else class="cn-lista">
            <li v-for="n in visibles" :key="n.id_notificacion" class="cn-item" :class="[{ nolei: !n.leida }, 'tipo-' + n.tipo]">
              <span class="cn-ic" @click="abrir(n)">
                <svg v-if="n.tipo === 'reserva'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"></path></svg>
                <svg v-else-if="n.tipo === 'propuesta'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"></path></svg>
                <svg v-else-if="n.tipo === 'pedido'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </span>
              <div class="cn-txt" @click="abrir(n)">
                <b>{{ n.titulo }}</b>
                <span>{{ n.mensaje }}</span>
                <i>{{ hace(n.fecha) }}</i>
              </div>
              <button class="cn-borrar" title="Borrar" @click.stop="borrar(n)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const router = useRouter()
const auth = useTiendaAutenticacion()
const notificaciones = ref([])
const noLeidas = ref(0)
const abierto = ref(false)
const tab = ref('nuevas')
const panelPos = ref({})
let socket = null

const nuevas = computed(() => notificaciones.value.filter(n => !n.leida))
const leidas = computed(() => notificaciones.value.filter(n => n.leida))
const visibles = computed(() => tab.value === 'nuevas' ? nuevas.value : leidas.value)

async function cargar() {
  try {
    const r = await clienteHttp.get('/notificaciones')
    notificaciones.value = r.notificaciones || []
    noLeidas.value = r.no_leidas || 0
  } catch { /* sin notificaciones */ }
}
function alternar(e) {
  abierto.value = !abierto.value
  if (abierto.value) {
    const rect = e.currentTarget.getBoundingClientRect()
    // En celular el panel se muestra como hoja inferior (CSS); no se ancla al botón.
    if (window.innerWidth <= 560) {
      panelPos.value = {}
    } else {
      panelPos.value = { top: (rect.bottom + 8) + 'px', right: Math.max(12, window.innerWidth - rect.right) + 'px' }
    }
    tab.value = 'nuevas'
    cargar()
  }
}
async function leerTodas() {
  try { await clienteHttp.patch('/notificaciones/leer-todas', {}) } catch {}
  notificaciones.value.forEach(n => n.leida = true)
  noLeidas.value = 0
}
async function abrir(n) {
  if (!n.leida) {
    try { await clienteHttp.patch(`/notificaciones/${n.id_notificacion}/leida`, {}) } catch {}
    n.leida = true
    noLeidas.value = Math.max(0, noLeidas.value - 1)
  }
  abierto.value = false
  if (n.url) router.push(n.url)
}
async function borrar(n) {
  try { await clienteHttp.delete(`/notificaciones/${n.id_notificacion}`) } catch {}
  const i = notificaciones.value.findIndex(x => x.id_notificacion === n.id_notificacion)
  if (i >= 0) {
    if (!notificaciones.value[i].leida) noLeidas.value = Math.max(0, noLeidas.value - 1)
    notificaciones.value.splice(i, 1)
  }
}
async function borrarLeidas() {
  try { await clienteHttp.delete('/notificaciones/leidas') } catch {}
  notificaciones.value = notificaciones.value.filter(n => !n.leida)
}
function hace(fecha) {
  const s = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

onMounted(() => {
  cargar()
  const urlBackend = import.meta.env.VITE_URL_BACKEND || 'http://localhost:3000'
  socket = io(urlBackend)
  socket.on('notificacion', (d) => {
    if (d?.id_usuario && auth.usuario && d.id_usuario === auth.usuario.id) cargar()
  })
})
onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.campana-wrap { position: relative; display: inline-flex; }
.campana-btn { position: relative; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--fondo-tarjeta, rgba(255,255,255,0.05)); border: 1px solid var(--borde-sutil); color: var(--texto-principal); cursor: pointer; transition: border-color 0.2s ease; }
.campana-btn:hover { border-color: var(--morado-brillante); }
.campana-btn svg { width: 19px; height: 19px; }
.campana-badge { position: absolute; top: -3px; right: -3px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; background: var(--color-error); color: #fff; font-size: 0.62rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px var(--fondo-app); }

.cn-overlay { position: fixed; inset: 0; z-index: 3000; }
.cn-panel { position: fixed; width: min(360px, 92vw); max-height: 70vh; display: flex; flex-direction: column; background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.6); animation: cnUp 0.2s ease; }
@keyframes cnUp { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.cn-head { padding: 13px 16px 10px; border-bottom: 1px solid var(--borde-sutil); }
.cn-head b { color: var(--texto-principal); font-size: 0.95rem; }
.cn-tabs { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--borde-sutil); }
.cn-tab { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: var(--fondo-app); color: var(--texto-secundario); font-size: 0.78rem; font-weight: 700; cursor: pointer; }
.cn-tab.activo { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.cn-tab-n { background: rgba(255,255,255,0.25); border-radius: 999px; padding: 0 6px; font-size: 0.66rem; }
.cn-accion { margin-left: auto; background: none; border: none; color: var(--morado-hover); font-size: 0.76rem; font-weight: 700; cursor: pointer; }
.cn-accion.borrar { color: #FCA5A5; }
.cn-vacia { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 2.5rem 1rem; color: var(--texto-desactivado); font-size: 0.85rem; }
.cn-vacia svg { opacity: 0.5; }
.cn-lista { list-style: none; margin: 0; padding: 6px; flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 4px; }
.cn-item { display: flex; align-items: flex-start; gap: 11px; padding: 11px 12px; border-radius: 12px; position: relative; transition: background 0.15s ease; }
.cn-item:hover { background: rgba(168,85,247,0.08); }
.cn-item.nolei { background: rgba(168,85,247,0.06); }
.cn-ic { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; }
.cn-ic svg { width: 17px; height: 17px; }
.cn-item.tipo-reserva .cn-ic { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.cn-item.tipo-propuesta .cn-ic { background: linear-gradient(135deg, #6366F1, #EC4899); }
.cn-item.tipo-pedido .cn-ic { background: linear-gradient(135deg, #22C55E, #10B981); }
.cn-item.tipo-info .cn-ic, .cn-item.tipo-premio .cn-ic { background: linear-gradient(135deg, #EC4899, #F59E0B); }
.cn-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; cursor: pointer; }
.cn-txt b { color: var(--texto-principal); font-size: 0.86rem; }
.cn-txt span { color: var(--texto-secundario); font-size: 0.78rem; line-height: 1.35; }
.cn-txt i { color: var(--texto-desactivado); font-size: 0.68rem; font-style: normal; margin-top: 2px; }
.cn-borrar { flex-shrink: 0; width: 24px; height: 24px; border-radius: 6px; border: none; background: none; color: var(--texto-desactivado); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cn-borrar:hover { background: rgba(239,68,68,0.15); color: #FCA5A5; }

/* ── Celular: hoja inferior a todo el ancho ────────────────────────────── */
@media (max-width: 560px) {
  .cn-overlay {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }
  .cn-panel {
    position: relative;
    top: auto !important;
    right: auto !important;
    left: auto !important;
    bottom: auto;
    width: 100%;
    max-width: 100%;
    max-height: 82vh;
    border-radius: 22px 22px 0 0;
    border-bottom: none;
    box-shadow: 0 -12px 40px rgba(0,0,0,0.55);
    padding-top: 8px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    animation: cnHoja 0.28s cubic-bezier(.22,1,.36,1);
  }
  /* Asa superior para reforzar el gesto de hoja */
  .cn-panel::before {
    content: "";
    display: block;
    width: 38px;
    height: 4px;
    margin: 2px auto 8px;
    border-radius: 999px;
    background: var(--borde-activo, rgba(255,255,255,0.25));
  }
  .cn-head { padding: 4px 16px 10px; }
  .cn-tabs { padding: 10px 14px; flex-wrap: wrap; }
  .cn-item { padding: 12px 12px; }
  .cn-ic { width: 36px; height: 36px; }
}
@keyframes cnHoja { from { transform: translateY(100%); } to { transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .cn-panel { animation: none; }
}
</style>
