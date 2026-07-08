<template>
  <div class="pedidos-vista">
    <header class="ped-header">
      <button class="ped-volver" @click="$router.back()" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <h1>Mis pedidos</h1>
    </header>

    <div v-if="cargando" class="ped-estado"><div class="spinner"></div></div>

    <div v-else-if="!pedidos.length" class="ped-vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="46" height="46"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      <p>Todavía no tienes pedidos.</p>
    </div>

    <ul v-else class="ped-lista">
      <li v-for="p in pedidos" :key="p.id_comanda" class="ped-item">
        <div class="ped-top">
          <span class="ped-fecha">{{ formatearFecha(p.fecha) }}</span>
          <span class="ped-estado-chip" :class="claseEstado(p.estado)">{{ p.estado }}</span>
        </div>
        <ul class="ped-items">
          <li v-for="(it, i) in p.items" :key="i">
            <span class="ped-cant">{{ it.cantidad }}×</span> {{ it.nombre }}
          </li>
        </ul>
        <div class="ped-meta">
          <span class="ped-badge" :class="'origen-' + p.origen">{{ etiquetaOrigen(p.origen) }}</span>
          <span class="ped-badge metodo">{{ p.metodo_pago }}</span>
          <span v-if="p.modo_entrega" class="ped-badge entrega">{{ p.modo_entrega === 'llevar' ? 'A la mesa' : 'En barra' }}</span>
          <span v-if="p.mesa" class="ped-badge">Mesa {{ p.mesa }}</span>
          <span class="ped-total">Bs. {{ p.total.toFixed(2) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'

const pedidos = ref([])
const cargando = ref(true)

function formatearFecha(f) {
  try { return new Date(f).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}
function etiquetaOrigen(o) {
  return o === 'app' ? 'Desde tu app' : (o === 'caja' ? 'En caja' : 'Con el mesero')
}
function claseEstado(e) {
  const s = (e || '').toLowerCase()
  if (s === 'listo' || s === 'completada') return 'ok'
  if (s === 'cancelada') return 'cancel'
  return 'proceso'
}

onMounted(async () => {
  try { pedidos.value = await clienteHttp.get('/comandas/mis-pedidos') }
  catch { pedidos.value = [] }
  finally { cargando.value = false }
})
</script>

<style scoped>
.pedidos-vista { max-width: 720px; margin: 0 auto; padding: 16px 16px 90px; }
.ped-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.ped-volver { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-principal); cursor: pointer; }
.ped-header h1 { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; margin: 0; color: var(--texto-principal); }
.ped-estado { display: flex; justify-content: center; padding: 3rem; }
.ped-vacio { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 3rem 1rem; color: var(--texto-secundario); text-align: center; }
.ped-vacio svg { color: var(--morado-brillante); opacity: 0.6; }
.ped-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.ped-item { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-lg); padding: 14px 16px; }
.ped-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ped-fecha { font-size: 0.8rem; color: var(--texto-secundario); }
.ped-estado-chip { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 10px; border-radius: var(--radio-full); }
.ped-estado-chip.ok { background: rgba(34,197,94,0.16); color: #86EFAC; }
.ped-estado-chip.proceso { background: rgba(168,85,247,0.16); color: #E9D5FF; }
.ped-estado-chip.cancel { background: rgba(239,68,68,0.16); color: #FCA5A5; }
.ped-items { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.ped-items li { font-size: 0.9rem; color: var(--texto-principal); }
.ped-cant { color: var(--morado-hover); font-weight: 800; }
.ped-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.ped-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 9px; border-radius: var(--radio-full); background: rgba(255,255,255,0.06); color: var(--texto-secundario); border: 1px solid var(--borde-sutil); }
.ped-badge.origen-app { background: rgba(168,85,247,0.18); color: #E9D5FF; border-color: transparent; }
.ped-badge.metodo { background: rgba(236,72,153,0.14); color: #F9A8D4; border-color: transparent; }
.ped-total { margin-left: auto; font-family: var(--fuente-titulo); font-weight: 800; color: var(--rosa-acento); font-variant-numeric: tabular-nums; }
</style>
