<template>
  <section class="ficha fade-in">
    <!-- Cabecera: quién es -->
    <header class="f-cab">
      <button class="f-volver" @click="$emit('cerrar')" title="Volver a buscar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="18" height="18"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <span class="f-avatar">{{ iniciales }}</span>
      <div class="f-quien">
        <b>{{ cliente.nombres }} {{ cliente.apellidos }}</b>
        <small v-if="cliente.qr_publico" class="f-codigo">{{ cliente.qr_publico }}</small>
      </div>
      <div class="f-saldo" v-if="!cliente.sin_billetera">
        <small>Saldo</small>
        <b>Bs {{ formatoMonto(cliente.saldo) }}</b>
      </div>
    </header>

    <!-- Sin billetera: solo ofrecer crearla -->
    <div v-if="cliente.sin_billetera" class="f-sin-billetera">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="30" height="30"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 12h.01"></path><path d="M2 11h20"></path></svg>
      <p>Aún no tiene billetera.</p>
    </div>

    <!-- Acciones -->
    <nav v-else class="f-acciones">
      <button :class="['f-accion', { activa: panel === 'recarga' }]" @click="alternar('recarga')">
        <span class="f-accion-ic entrada">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
        </span>
        Recargar
      </button>
      <button :class="['f-accion', { activa: panel === 'retiro' }]" @click="alternar('retiro')">
        <span class="f-accion-ic salida">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        </span>
        Retirar
      </button>
      <button :class="['f-accion', { activa: panel === 'movimientos' }]" @click="alternar('movimientos')">
        <span class="f-accion-ic neutra">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        </span>
        Movimientos
      </button>
      <button :class="['f-accion', { activa: panel === 'qrs' }]" @click="alternar('qrs')">
        <span class="f-accion-ic neutra">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
        </span>
        QRs
      </button>
      <button :class="['f-accion', { activa: panel === 'pin' }]" @click="alternar('pin')">
        <span class="f-accion-ic neutra">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </span>
        PIN
      </button>
    </nav>

    <!-- Panel activo -->
    <div class="f-panel" v-if="panel && !cliente.sin_billetera">
      <PanelRecarga v-if="panel === 'recarga'" :cliente="cliente" @hecho="operacionHecha" />
      <PanelRetiroDirecto v-else-if="panel === 'retiro'" :cliente="cliente" @hecho="operacionHecha" />
      <MovimientosCliente v-else-if="panel === 'movimientos'" :cliente="cliente" />
      <QrsCliente v-else-if="panel === 'qrs'" :cliente="cliente" />
      <PinCliente v-else-if="panel === 'pin'" :cliente="cliente" @hecho="operacionHecha" />
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import PanelRecarga from './PanelRecarga.vue'
import PanelRetiroDirecto from './PanelRetiroDirecto.vue'
import MovimientosCliente from './MovimientosCliente.vue'
import QrsCliente from './QrsCliente.vue'
import PinCliente from './PinCliente.vue'

const props = defineProps({ cliente: { type: Object, required: true } })
const emit = defineEmits(['cerrar', 'refrescar'])

const panel = ref('recarga')
function alternar(p) { panel.value = panel.value === p ? null : p }
function operacionHecha() { emit('refrescar') }

const iniciales = computed(() => `${(props.cliente.nombres || '?')[0] || ''}${(props.cliente.apellidos || '')[0] || ''}`.toUpperCase())
function formatoMonto(v) {
  const n = Number(v) || 0
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.ficha { display: flex; flex-direction: column; gap: 16px; }
.f-cab {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; border-radius: 20px;
  background: linear-gradient(135deg, rgba(139,92,246,0.16), rgba(236,72,153,0.08));
  border: 1px solid var(--borde-activo);
}
.f-volver {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: 12px;
  border: 1px solid var(--borde-sutil); background: rgba(255,255,255,0.05);
  color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.f-volver:hover { border-color: var(--borde-activo); }
.f-avatar {
  flex-shrink: 0; width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 1.1rem;
}
.f-quien { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.f-quien b { color: var(--texto-principal); font-size: 1.05rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.f-codigo {
  align-self: flex-start; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em;
  color: var(--morado-hover); background: rgba(168,85,247,0.14);
  padding: 2px 9px; border-radius: 999px;
}
.f-saldo { flex-shrink: 0; text-align: right; display: flex; flex-direction: column; }
.f-saldo small { font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--texto-desactivado); }
.f-saldo b { font-size: 1.35rem; font-weight: 800; color: var(--color-exito); font-variant-numeric: tabular-nums; }

.f-sin-billetera {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 2.2rem 1rem; color: var(--texto-secundario); text-align: center;
  border: 1px dashed var(--borde-sutil); border-radius: 16px;
}
.f-sin-billetera svg { color: var(--morado-brillante); opacity: 0.7; }
.f-sin-billetera p { margin: 0; font-size: 0.9rem; }

.f-acciones { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.f-accion {
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  padding: 12px 6px 10px; border-radius: 16px; cursor: pointer;
  background: var(--fondo-tarjeta); border: 1.5px solid var(--borde-sutil);
  color: var(--texto-secundario); font-weight: 700; font-size: 0.74rem;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.15s ease;
}
.f-accion:hover { border-color: var(--borde-activo); transform: translateY(-1px); }
.f-accion.activa { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); color: var(--texto-principal); }
.f-accion-ic {
  width: 38px; height: 38px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.f-accion-ic.entrada { background: linear-gradient(135deg, #16A34A, #059669); }
.f-accion-ic.salida { background: linear-gradient(135deg, #D97706, #B45309); }
.f-accion-ic.neutra { background: linear-gradient(135deg, #8B5CF6, #6366F1); }

.f-panel { border: 1px solid var(--borde-sutil); border-radius: 20px; padding: 16px; background: var(--fondo-tarjeta); }

@media (max-width: 560px) {
  .f-acciones { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .f-accion { padding: 10px 4px 8px; font-size: 0.7rem; }
  .f-cab { flex-wrap: wrap; padding: 14px; }
  .f-saldo { flex-basis: 100%; text-align: left; flex-direction: row; align-items: baseline; gap: 8px; }
  .f-saldo b { font-size: 1.2rem; }
  .f-panel { padding: 12px; }
}
</style>
