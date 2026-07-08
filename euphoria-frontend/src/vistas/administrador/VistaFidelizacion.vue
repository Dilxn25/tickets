<template>
  <div class="fidelizacion-vista">
    <header class="fid-header">
      <div>
        <h2>Fidelización</h2>
        <p class="fid-sub">Tus clientes que más consumen. Márcalos VIP o dales un premio.</p>
      </div>
      <button class="btn-refrescar" @click="cargar" :disabled="cargando" title="Actualizar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" :class="{ girar: cargando }"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
      </button>
    </header>

    <div v-if="cargando" class="fid-estado"><div class="spinner"></div></div>

    <div v-else-if="!clientes.length" class="fid-vacio">
      <p>Aún no hay consumo registrado de clientes.</p>
    </div>

    <div v-else class="fid-lista">
      <div v-for="(c, i) in clientes" :key="c.id_usuario" class="fid-card">
        <div class="fid-rank">{{ i + 1 }}</div>
        <div class="fid-info">
          <div class="fid-nombre">
            {{ c.nombre }}
            <span v-if="c.es_vip" class="fid-vip">VIP</span>
            <span v-if="c.premio_pendiente" class="fid-premio-chip">Premio activo</span>
          </div>
          <div class="fid-datos">
            <span>{{ c.visitas }} pedido{{ c.visitas === 1 ? '' : 's' }}</span>
            <span class="fid-consumo">Bs. {{ c.consumo.toFixed(2) }}</span>
            <span v-if="c.top_producto" class="fid-top">Prefiere: {{ c.top_producto }}</span>
          </div>
        </div>
        <div class="fid-acciones">
          <button class="fid-btn" :class="{ activo: c.es_vip }" @click="alternarVip(c)" :disabled="c.ocupado">
            {{ c.es_vip ? '★ VIP' : 'Marcar VIP' }}
          </button>
          <button class="fid-btn premio" @click="darPremio(c)" :disabled="c.ocupado || c.premio_pendiente">
            {{ c.premio_pendiente ? 'Premiado' : 'Dar premio' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()
const clientes = ref([])
const cargando = ref(true)

async function cargar() {
  cargando.value = true
  try { clientes.value = await clienteHttp.get('/usuarios/recurrentes') }
  catch { clientes.value = [] }
  finally { cargando.value = false }
}
async function alternarVip(c) {
  c.ocupado = true
  try {
    const r = await clienteHttp.patch(`/usuarios/${c.id_usuario}/vip`, { es_vip: !c.es_vip })
    c.es_vip = r.es_vip
    notif.exito(c.es_vip ? `${c.nombre} ahora es VIP` : `${c.nombre} ya no es VIP`)
  } catch { notif.error('No se pudo actualizar el VIP') }
  finally { c.ocupado = false }
}
async function darPremio(c) {
  const ok = await notif.confirmar({
    titulo: 'Dar premio de fidelización',
    mensaje: `Se aplicará un descuento en el próximo consumo de ${c.nombre}. ¿Confirmas?`,
    textoConfirmar: 'Dar premio',
  })
  if (!ok) return
  c.ocupado = true
  try {
    await clienteHttp.post(`/usuarios/${c.id_usuario}/premio`)
    c.premio_pendiente = true
    notif.exito(`Premio otorgado a ${c.nombre}`)
  } catch { notif.error('No se pudo otorgar el premio') }
  finally { c.ocupado = false }
}

onMounted(cargar)
</script>

<style scoped>
.fidelizacion-vista { padding: 8px 4px; }
.fid-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.fid-header h2 { font-family: var(--fuente-titulo); font-size: 1.5rem; font-weight: 800; margin: 0; color: var(--texto-principal); }
.fid-sub { font-size: 0.88rem; color: var(--texto-secundario); margin: 4px 0 0; }
.btn-refrescar { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-secundario); cursor: pointer; }
.girar { animation: giro 0.8s linear infinite; }
@keyframes giro { to { transform: rotate(360deg); } }
.fid-estado { display: flex; justify-content: center; padding: 3rem; }
.fid-vacio { padding: 3rem; text-align: center; color: var(--texto-secundario); }
.fid-lista { display: flex; flex-direction: column; gap: 10px; }
.fid-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); }
.fid-rank { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; background: rgba(168,85,247,0.15); color: var(--morado-hover); }
.fid-info { flex: 1; min-width: 0; }
.fid-nombre { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-weight: 700; color: var(--texto-principal); }
.fid-vip { font-size: 0.62rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: linear-gradient(135deg, #FBBF24, #F59E0B); color: #1a1206; }
.fid-premio-chip { font-size: 0.62rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: rgba(34,197,94,0.18); color: #86EFAC; }
.fid-datos { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; font-size: 0.82rem; color: var(--texto-secundario); }
.fid-consumo { color: var(--rosa-acento); font-weight: 700; }
.fid-top { color: var(--texto-desactivado); }
.fid-acciones { display: flex; gap: 8px; flex-shrink: 0; }
.fid-btn { padding: 8px 14px; border-radius: var(--radio-full); cursor: pointer; font-weight: 700; font-size: 0.8rem; background: var(--fondo-tarjeta-alt, rgba(255,255,255,0.05)); border: 1px solid var(--borde-sutil); color: var(--texto-secundario); white-space: nowrap; transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; }
.fid-btn:hover:not(:disabled) { border-color: var(--borde-activo); color: var(--texto-principal); }
.fid-btn.activo { background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(236,72,153,0.12)); border-color: #FBBF24; color: #FCD34D; }
.fid-btn.premio { color: #86EFAC; }
.fid-btn:disabled { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 640px) {
  .fid-card { flex-wrap: wrap; }
  .fid-acciones { width: 100%; }
  .fid-acciones .fid-btn { flex: 1; }
}
</style>
