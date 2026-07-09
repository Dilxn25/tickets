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
            <button v-if="noLeidas > 0" class="cn-marcar" @click="leerTodas">Marcar leídas</button>
          </header>
          <div v-if="!notificaciones.length" class="cn-vacia">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="34" height="34"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path></svg>
            <span>Sin novedades por ahora</span>
          </div>
          <ul v-else class="cn-lista">
            <li v-for="n in notificaciones" :key="n.id_notificacion" class="cn-item" :class="[{ nolei: !n.leida }, 'tipo-' + n.tipo]" @click="abrir(n)">
              <span class="cn-ic">
                <svg v-if="n.tipo === 'reserva'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"></path></svg>
                <svg v-else-if="n.tipo === 'propuesta'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"></path></svg>
                <svg v-else-if="n.tipo === 'pedido'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </span>
              <div class="cn-txt">
                <b>{{ n.titulo }}</b>
                <span>{{ n.mensaje }}</span>
                <i>{{ hace(n.fecha) }}</i>
              </div>
              <span v-if="!n.leida" class="cn-punto"></span>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const router = useRouter()
const auth = useTiendaAutenticacion()
const notificaciones = ref([])
const noLeidas = ref(0)
const abierto = ref(false)
const panelPos = ref({})
let socket = null

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
    panelPos.value = { top: (rect.bottom + 8) + 'px', right: Math.max(12, window.innerWidth - rect.right) + 'px' }
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
.cn-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid var(--borde-sutil); }
.cn-head b { color: var(--texto-principal); font-size: 0.95rem; }
.cn-marcar { background: none; border: none; color: var(--morado-hover); font-size: 0.78rem; font-weight: 700; cursor: pointer; }
.cn-vacia { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 2.5rem 1rem; color: var(--texto-desactivado); font-size: 0.85rem; }
.cn-vacia svg { opacity: 0.5; }
.cn-lista { list-style: none; margin: 0; padding: 6px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.cn-item { display: flex; align-items: flex-start; gap: 11px; padding: 11px 12px; border-radius: 12px; cursor: pointer; position: relative; transition: background 0.15s ease; }
.cn-item:hover { background: rgba(168,85,247,0.08); }
.cn-item.nolei { background: rgba(168,85,247,0.06); }
.cn-ic { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; }
.cn-ic svg { width: 17px; height: 17px; }
.cn-item.tipo-reserva .cn-ic { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.cn-item.tipo-propuesta .cn-ic { background: linear-gradient(135deg, #6366F1, #EC4899); }
.cn-item.tipo-pedido .cn-ic { background: linear-gradient(135deg, #22C55E, #10B981); }
.cn-item.tipo-info .cn-ic, .cn-item.tipo-premio .cn-ic { background: linear-gradient(135deg, #EC4899, #F59E0B); }
.cn-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cn-txt b { color: var(--texto-principal); font-size: 0.86rem; }
.cn-txt span { color: var(--texto-secundario); font-size: 0.78rem; line-height: 1.35; }
.cn-txt i { color: var(--texto-desactivado); font-size: 0.68rem; font-style: normal; margin-top: 2px; }
.cn-punto { position: absolute; top: 14px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background: var(--morado-brillante); }
</style>
