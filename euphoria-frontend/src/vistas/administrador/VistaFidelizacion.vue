<template>
  <div class="fidelizacion-vista">
    <!-- Encabezado con KPIs -->
    <header class="fid-header">
      <div class="fid-head-txt">
        <h2><span class="fid-head-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span> Fidelización</h2>
        <p class="fid-sub">Tus clientes que más consumen. Prémialos y conviértelos en habituales.</p>
      </div>
      <button class="btn-refrescar" @click="cargar" :disabled="cargando" title="Actualizar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" :class="{ girar: cargando }"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
      </button>
    </header>

    <div v-if="!cargando && clientes.length" class="fid-kpis">
      <div class="kpi">
        <span class="kpi-ic clientes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path></svg></span>
        <div><b>{{ clientes.length }}</b><span>Clientes fieles</span></div>
      </div>
      <div class="kpi">
        <span class="kpi-ic consumo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></span>
        <div><b>Bs {{ consumoTotal.toFixed(0) }}</b><span>Consumo total</span></div>
      </div>
      <div class="kpi">
        <span class="kpi-ic vip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.5 5.8 21 7 14 2 9.3 9 8.5 12 2"></polygon></svg></span>
        <div><b>{{ totalVip }}</b><span>Clientes VIP</span></div>
      </div>
    </div>

    <div v-if="cargando" class="fid-estado"><div class="spinner"></div></div>

    <div v-else-if="!clientes.length" class="fid-vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="48" height="48"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      <p>Aún no hay consumo registrado de clientes.</p>
    </div>

    <div v-else class="fid-lista">
      <TransitionGroup name="fid-in">
        <div v-for="(c, i) in clientes" :key="c.id_usuario" class="fid-card" :class="{ top: i < 3 }" :style="{ '--d': i * 55 + 'ms' }">
          <div class="fid-rank" :class="'r' + (i + 1)">
            <svg v-if="i < 3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"></circle><path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.12"></path></svg>
            <span>{{ i + 1 }}</span>
          </div>
          <div class="fid-avatar" :class="{ vip: c.es_vip }">{{ inicial(c.nombre) }}</div>
          <div class="fid-info">
            <div class="fid-nombre">
              {{ c.nombre }}
              <span v-if="c.es_vip" class="fid-vip">★ VIP</span>
              <span v-if="c.premio_activo" class="fid-premio-chip">{{ c.premio_desc || 'Premio activo' }}</span>
            </div>
            <div class="fid-datos">
              <span>{{ c.visitas }} pedido{{ c.visitas === 1 ? '' : 's' }}</span>
              <span v-if="c.top_producto" class="fid-top">Prefiere {{ c.top_producto }}</span>
            </div>
            <div class="fid-barra">
              <div class="fid-barra-fill" :style="{ width: pct(c) + '%' }"></div>
            </div>
          </div>
          <div class="fid-derecha">
            <span class="fid-consumo">Bs {{ c.consumo.toFixed(2) }}</span>
            <div class="fid-acciones">
              <button class="fid-btn" :class="{ activo: c.es_vip }" @click="alternarVip(c)" :disabled="c.ocupado" :title="c.es_vip ? 'Quitar VIP' : 'Marcar VIP'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.5 5.8 21 7 14 2 9.3 9 8.5 12 2"></polygon></svg>
              </button>
              <button class="fid-btn premio" @click="abrirPremio(c)" :disabled="c.ocupado" :title="c.premio_activo ? 'Cambiar premio' : 'Dar premio'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                <span class="fid-btn-txt">{{ c.premio_activo ? 'Cambiar' : 'Premio' }}</span>
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Modal: dar premio flexible (descuento % o producto de cortesía) -->
    <Teleport to="body">
      <div v-if="premioModal" class="pm-overlay" @click.self="premioModal = null">
        <div class="pm-modal">
          <div class="pm-head">
            <span class="pm-head-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg></span>
            <h3>Premiar a {{ premioModal.nombre }}</h3>
          </div>
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
import { ref, computed, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()
const clientes = ref([])
const cargando = ref(true)
const productos = ref([])

const premioModal = ref(null)
const premioTipo = ref('descuento')
const premioPct = ref(15)
const premioProducto = ref(null)
const guardandoPremio = ref(false)

const consumoTotal = computed(() => clientes.value.reduce((a, c) => a + (c.consumo || 0), 0))
const totalVip = computed(() => clientes.value.filter(c => c.es_vip).length)
const maxConsumo = computed(() => Math.max(1, ...clientes.value.map(c => c.consumo || 0)))
function pct(c) { return Math.round((c.consumo / maxConsumo.value) * 100) }
function inicial(nombre) { return (nombre || '?').trim().charAt(0).toUpperCase() }

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
.fid-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.fid-header h2 { display: flex; align-items: center; gap: 10px; font-family: var(--fuente-titulo); font-size: 1.5rem; font-weight: 800; margin: 0; color: var(--texto-principal); }
.fid-head-ic { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #EC4899, #A855F7); color: #fff; box-shadow: 0 6px 18px rgba(236,72,153,0.4); }
.fid-head-ic svg { width: 20px; height: 20px; }
.fid-sub { font-size: 0.88rem; color: var(--texto-secundario); margin: 4px 0 0; }
.btn-refrescar { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-secundario); cursor: pointer; transition: border-color 0.2s ease, color 0.2s ease; }
.btn-refrescar:hover { border-color: var(--morado-brillante); color: var(--morado-hover); }
.girar { animation: giro 0.8s linear infinite; }
@keyframes giro { to { transform: rotate(360deg); } }

/* KPIs */
.fid-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
@media (max-width: 640px) { .fid-kpis { grid-template-columns: 1fr; } }
.kpi { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); position: relative; overflow: hidden; }
.kpi::after { content: ''; position: absolute; inset: 0; opacity: 0.5; pointer-events: none; background: radial-gradient(120% 100% at 0 0, rgba(168,85,247,0.08), transparent 60%); }
.kpi-ic { flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
.kpi-ic svg { width: 20px; height: 20px; }
.kpi-ic.clientes { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.kpi-ic.consumo { background: linear-gradient(135deg, #EC4899, #F43F5E); }
.kpi-ic.vip { background: linear-gradient(135deg, #FBBF24, #F59E0B); }
.kpi div { display: flex; flex-direction: column; }
.kpi b { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); line-height: 1; }
.kpi span { font-size: 0.74rem; color: var(--texto-secundario); margin-top: 3px; }

.fid-estado { display: flex; justify-content: center; padding: 3rem; }
.spinner { width: 34px; height: 34px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: 50%; animation: giro 1s linear infinite; }
.fid-vacio { padding: 3rem; text-align: center; color: var(--texto-secundario); }
.fid-vacio svg { color: var(--morado-brillante); opacity: 0.5; margin-bottom: 12px; }

/* Lista */
.fid-lista { display: flex; flex-direction: column; gap: 12px; }
.fid-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 18px; position: relative; overflow: hidden; transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; }
.fid-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; transition: background 0.2s ease; }
.fid-card:hover { transform: translateY(-2px); border-color: var(--borde-activo); box-shadow: 0 12px 30px rgba(10,6,26,0.4); }
.fid-card.top::before { background: linear-gradient(180deg, #FBBF24, #EC4899); }

.fid-rank { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; position: relative; font-family: var(--fuente-titulo); font-weight: 800; font-size: 0.92rem; background: rgba(168,85,247,0.12); color: var(--morado-hover); }
.fid-rank svg { position: absolute; width: 34px; height: 34px; opacity: 0.28; }
.fid-rank span { position: relative; z-index: 1; }
.fid-rank.r1 { background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.15)); color: #FCD34D; }
.fid-rank.r2 { background: rgba(203,213,225,0.18); color: #E2E8F0; }
.fid-rank.r3 { background: rgba(217,119,66,0.2); color: #FBB88A; }

.fid-avatar { flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--fuente-titulo); font-weight: 800; font-size: 1.15rem; color: #fff; background: linear-gradient(135deg, #6366F1, #A855F7); box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); }
.fid-avatar.vip { background: linear-gradient(135deg, #FBBF24, #EC4899); box-shadow: 0 0 0 2px rgba(251,191,36,0.4), inset 0 1px 0 rgba(255,255,255,0.25); }

.fid-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.fid-nombre { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-weight: 700; color: var(--texto-principal); }
.fid-vip { font-size: 0.62rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: linear-gradient(135deg, #FBBF24, #F59E0B); color: #1a1206; }
.fid-premio-chip { font-size: 0.62rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: rgba(34,197,94,0.18); color: #86EFAC; }
.fid-datos { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.8rem; color: var(--texto-secundario); }
.fid-top { color: var(--texto-desactivado); }
.fid-barra { height: 5px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.fid-barra-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #A855F7, #EC4899); box-shadow: 0 0 8px rgba(168,85,247,0.4); transition: width 0.6s var(--ease-suave, ease); }

.fid-derecha { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.fid-consumo { font-family: var(--fuente-titulo); font-weight: 800; font-size: 1.05rem; color: var(--rosa-acento); font-variant-numeric: tabular-nums; }
.fid-acciones { display: flex; gap: 6px; }
.fid-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 0.78rem; background: var(--fondo-tarjeta-alt, rgba(255,255,255,0.05)); border: 1px solid var(--borde-sutil); color: var(--texto-secundario); white-space: nowrap; transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease, transform 0.12s ease; }
.fid-btn:hover:not(:disabled) { border-color: var(--borde-activo); color: var(--texto-principal); transform: translateY(-1px); }
.fid-btn:active:not(:disabled) { transform: translateY(0) scale(0.96); }
.fid-btn.activo { background: linear-gradient(135deg, rgba(251,191,36,0.22), rgba(236,72,153,0.14)); border-color: #FBBF24; color: #FCD34D; }
.fid-btn.premio { color: #86EFAC; }
.fid-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Animación de entrada escalonada */
.fid-in-enter-active { transition: opacity 0.4s ease, transform 0.4s ease; transition-delay: var(--d, 0ms); }
.fid-in-enter-from { opacity: 0; transform: translateY(14px); }

@media (max-width: 640px) {
  .fid-btn-txt { display: none; }
  .fid-card { gap: 10px; padding: 12px; }
  .fid-avatar { width: 38px; height: 38px; font-size: 1rem; }
}

/* Modal de premio flexible */
.pm-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(6,4,16,0.72); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; animation: pmFade 0.2s ease; }
@keyframes pmFade { from { opacity: 0; } to { opacity: 1; } }
.pm-modal { width: min(440px, 96vw); background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: 22px; padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.6); animation: pmUp 0.25s var(--ease-rebote, ease); }
@keyframes pmUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
.pm-head { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
.pm-head-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(135deg, #22C55E, #10B981); box-shadow: 0 6px 16px rgba(34,197,94,0.35); }
.pm-modal h3 { font-family: var(--fuente-titulo); font-size: 1.2rem; font-weight: 800; color: var(--texto-principal); }
.pm-tipos { display: flex; gap: 8px; margin-bottom: 16px; }
.pm-tipo { flex: 1; padding: 10px; border-radius: 12px; border: 1px solid var(--borde-sutil); background: var(--fondo-app); color: var(--texto-secundario); font-weight: 700; font-size: 0.84rem; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease; }
.pm-tipo.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.14); color: var(--texto-principal); }
.pm-campo { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.pm-campo > label { font-size: 0.82rem; font-weight: 700; color: var(--texto-principal); }
.pm-pct { display: flex; align-items: center; gap: 14px; }
.pm-pct input[type=range] { flex: 1; accent-color: var(--morado-brillante); }
.pm-pct-val { font-family: var(--fuente-titulo); font-size: 1.5rem; font-weight: 800; color: var(--rosa-acento); min-width: 60px; text-align: right; }
.pm-select { background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 11px 14px; border-radius: 12px; font-size: 0.9rem; outline: none; }
.pm-select:focus { border-color: var(--morado-brillante); }
.pm-nota { font-size: 0.76rem; color: var(--texto-desactivado); line-height: 1.4; }
.pm-acciones { display: flex; gap: 10px; }
.pm-btn { flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.2s ease; }
.pm-btn.cancelar { background: rgba(255,255,255,0.06); color: var(--texto-secundario); border: 1px solid var(--borde-sutil); }
.pm-btn.confirmar { background: var(--gradiente-marca); color: #fff; box-shadow: 0 6px 18px rgba(168,85,247,0.3); }
.pm-btn.confirmar:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236,72,153,0.4); }
.pm-btn.confirmar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
