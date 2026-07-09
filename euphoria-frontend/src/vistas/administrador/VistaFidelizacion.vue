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
            <span v-if="c.premio_activo" class="fid-premio-chip">{{ c.premio_desc || 'Premio activo' }}</span>
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
          <button class="fid-btn premio" @click="abrirPremio(c)" :disabled="c.ocupado">
            {{ c.premio_activo ? 'Cambiar premio' : 'Dar premio' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: dar premio flexible (descuento % o producto de cortesía) -->
    <Teleport to="body">
      <div v-if="premioModal" class="pm-overlay" @click.self="premioModal = null">
        <div class="pm-modal">
          <h3>Premiar a {{ premioModal.nombre }}</h3>
          <div class="pm-tipos">
            <button class="pm-tipo" :class="{ activo: premioTipo === 'descuento' }" @click="premioTipo = 'descuento'">Descuento %</button>
            <button class="pm-tipo" :class="{ activo: premioTipo === 'producto' }" @click="premioTipo = 'producto'">Producto de cortesía</button>
          </div>

          <div v-if="premioTipo === 'descuento'" class="pm-campo">
            <label>Porcentaje de descuento (máx. 50%)</label>
            <div class="pm-pct">
              <input type="range" min="5" max="50" step="5" v-model.number="premioPct" />
              <span class="pm-pct-val">{{ premioPct }}%</span>
            </div>
            <p class="pm-nota">Se aplicará en su próximo pago con billetera, una sola vez.</p>
          </div>

          <div v-else class="pm-campo">
            <label>Producto de cortesía</label>
            <select v-model="premioProducto" class="pm-select">
              <option :value="null" disabled>Elige un producto…</option>
              <option v-for="p in productos" :key="p.id_producto" :value="p.id_producto">{{ p.nombre_producto }}</option>
            </select>
            <p class="pm-nota">Queda como vale de cortesía visible para el cliente.</p>
          </div>

          <div class="pm-acciones">
            <button class="pm-btn cancelar" @click="premioModal = null">Cancelar</button>
            <button class="pm-btn confirmar" :disabled="guardandoPremio || (premioTipo === 'producto' && !premioProducto)" @click="confirmarPremio">
              {{ guardandoPremio ? 'Guardando…' : 'Dar premio' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()
const clientes = ref([])
const cargando = ref(true)
const productos = ref([])

// Estado del modal de premio flexible
const premioModal = ref(null)      // cliente a premiar
const premioTipo = ref('descuento')
const premioPct = ref(15)
const premioProducto = ref(null)
const guardandoPremio = ref(false)

async function cargar() {
  cargando.value = true
  try { clientes.value = await clienteHttp.get('/usuarios/recurrentes') }
  catch { clientes.value = [] }
  finally { cargando.value = false }
}

async function cargarProductos() {
  try {
    const r = await clienteHttp.get('/productos')
    productos.value = (Array.isArray(r) ? r : r.productos || []).filter(p => !p.es_combo)
  } catch { productos.value = [] }
}

function abrirPremio(c) {
  premioModal.value = c
  premioTipo.value = 'descuento'
  premioPct.value = 15
  premioProducto.value = null
}

async function confirmarPremio() {
  if (!premioModal.value) return
  guardandoPremio.value = true
  try {
    const cuerpo = premioTipo.value === 'producto'
      ? { tipo: 'producto', id_producto: premioProducto.value }
      : { tipo: 'descuento', valor_pct: premioPct.value }
    await clienteHttp.post(`/usuarios/${premioModal.value.id_usuario}/premio`, cuerpo)
    notif.exito(`Premio otorgado a ${premioModal.value.nombre}`)
    premioModal.value = null
    await cargar()
  } catch (err) {
    const data = err?.response?.data || err
    notif.error(data?.error || 'No se pudo otorgar el premio')
  } finally { guardandoPremio.value = false }
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
onMounted(() => { cargar(); cargarProductos() })
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

/* Modal de premio flexible */
.pm-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(6,4,16,0.7); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.pm-modal { width: min(440px, 96vw); background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: var(--radio-xl); padding: var(--esp-5); box-shadow: 0 24px 60px rgba(0,0,0,0.6); }
.pm-modal h3 { font-family: var(--fuente-titulo); font-size: 1.2rem; font-weight: 800; color: var(--texto-principal); margin-bottom: 16px; }
.pm-tipos { display: flex; gap: 8px; margin-bottom: 16px; }
.pm-tipo { flex: 1; padding: 10px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-app); color: var(--texto-secundario); font-weight: 700; font-size: 0.84rem; cursor: pointer; }
.pm-tipo.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.14); color: var(--texto-principal); }
.pm-campo { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.pm-campo > label { font-size: 0.82rem; font-weight: 700; color: var(--texto-principal); }
.pm-pct { display: flex; align-items: center; gap: 14px; }
.pm-pct input[type=range] { flex: 1; accent-color: var(--morado-brillante); }
.pm-pct-val { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; color: var(--rosa-acento); min-width: 56px; text-align: right; }
.pm-select { background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 11px 14px; border-radius: var(--radio-md); font-size: 0.9rem; outline: none; }
.pm-select:focus { border-color: var(--morado-brillante); }
.pm-nota { font-size: 0.76rem; color: var(--texto-desactivado); line-height: 1.4; }
.pm-acciones { display: flex; gap: 10px; }
.pm-btn { flex: 1; padding: 12px; border-radius: var(--radio-md); border: none; font-weight: 700; cursor: pointer; }
.pm-btn.cancelar { background: rgba(255,255,255,0.06); color: var(--texto-secundario); border: 1px solid var(--borde-sutil); }
.pm-btn.confirmar { background: var(--gradiente-marca); color: #fff; }
.pm-btn.confirmar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
