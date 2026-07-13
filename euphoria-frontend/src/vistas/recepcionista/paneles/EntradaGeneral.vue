<template>
  <Teleport to="body">
    <div class="eg-overlay" @click.self="$emit('cerrar')">
      <div class="eg-sheet fade-in">
        <header class="eg-cab">
          <b>Entrada general</b>
          <button class="eg-x" @click="$emit('cerrar')" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <!-- Zona -->
        <div class="eg-zonas">
          <button v-for="z in zonasGenerales" :key="z.id_zona" type="button" :class="['eg-zona', { activa: zonaId === z.id_zona }]" @click="zonaId = z.id_zona">
            <b>{{ z.nombre_zona }}</b>
            <small>Bs {{ Number(z.precio_entrada_base).toFixed(0) }} · {{ z.disponibles }} libres</small>
          </button>
        </div>

        <!-- Personas -->
        <div class="eg-personas">
          <span>Personas</span>
          <div class="eg-stepper">
            <button type="button" @click="cantidad = Math.max(1, cantidad - 1)">−</button>
            <b>{{ cantidad }}</b>
            <button type="button" @click="cantidad++">+</button>
          </div>
        </div>

        <BuscadorCliente v-model="cliente" placeholder="Cliente (opcional)" />

        <!-- Cobro -->
        <div class="eg-metodos">
          <button v-for="mp in metodos" :key="mp.v" type="button" :class="['eg-metodo', { activo: metodo === mp.v }]" @click="metodo = mp.v">
            <span v-html="mp.icono"></span>
            {{ mp.t }}
          </button>
        </div>
        <div v-if="metodo === 'efectivo' && total > 0" class="eg-efectivo">
          <div class="eg-recibido">
            <span>Recibí Bs.</span>
            <input v-model="recibidoTexto" @input="limpiarRecibido" type="text" inputmode="decimal" :placeholder="total.toFixed(2)" />
            <button type="button" class="eg-chip" @click="recibidoTexto = total.toFixed(2)">Exacto</button>
          </div>
          <p v-if="recibido > 0" :class="['eg-cambio', cambio >= 0 ? 'ok' : 'falta']">
            {{ cambio >= 0 ? 'Cambio' : 'Falta' }} <b>Bs {{ Math.abs(cambio).toFixed(2) }}</b>
          </p>
        </div>

        <p v-if="error" class="eg-error">{{ error }}</p>
        <button class="eg-cta" :disabled="!puede || trabajando" @click="registrar">
          {{ trabajando ? '…' : (total > 0 && metodo !== 'cortesia' ? `Cobrar Bs ${total.toFixed(2)} y registrar` : `Registrar ${cantidad}`) }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import BuscadorCliente from '@/componentes/comunes/BuscadorCliente.vue'

const props = defineProps({ zonas: { type: Array, default: () => [] } })
const emit = defineEmits(['cerrar', 'hecho'])

const zonasGenerales = computed(() => props.zonas.filter(z => z.es_general || z.capacidad > 0))
const zonaId = ref(zonasGenerales.value[0]?.id_zona || null)
const cantidad = ref(1)
const cliente = ref(null)
const metodo = ref('efectivo')
const metodos = [
  { v: 'efectivo', t: 'Efectivo', icono: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>' },
  { v: 'qr', t: 'QR', icono: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>' },
  { v: 'cortesia', t: 'Cortesía', icono: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>' },
]
const total = computed(() => {
  if (metodo.value === 'cortesia') return 0
  const z = zonasGenerales.value.find(x => x.id_zona === zonaId.value)
  return (Number(z?.precio_entrada_base) || 0) * cantidad.value
})
const recibidoTexto = ref('')
const recibido = computed(() => { const n = parseFloat(recibidoTexto.value); return Number.isFinite(n) && n > 0 ? n : 0 })
const cambio = computed(() => recibido.value - total.value)
function limpiarRecibido() { recibidoTexto.value = (recibidoTexto.value || '').replace(/[^0-9.]/g, '').match(/^\d*\.?\d{0,2}/)?.[0] || '' }
const puede = computed(() => {
  if (!zonaId.value) return false
  if (metodo.value === 'efectivo' && total.value > 0) return recibido.value >= total.value
  return true
})

const trabajando = ref(false)
const error = ref('')
async function registrar() {
  if (!puede.value || trabajando.value) return
  trabajando.value = true
  error.value = ''
  try {
    await clienteHttp.post('/aforo/walk-in', {
      id_zona: zonaId.value,
      cantidad: cantidad.value,
      cantidad_ahora: cantidad.value, // en general todos entran ya
      metodo_pago: metodo.value,
      id_cliente: cliente.value?.id_usuario || null,
    })
    emit('hecho')
  } catch (e) {
    error.value = e?.error || 'No se pudo registrar el ingreso.'
  } finally { trabajando.value = false }
}
</script>

<style scoped>
.eg-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(6,3,18,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
.eg-sheet { width: min(440px, 94vw); margin: auto; background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: 22px; padding: 18px 16px; display: flex; flex-direction: column; gap: 13px; }
.eg-cab { display: flex; align-items: center; justify-content: space-between; }
.eg-cab b { color: var(--texto-principal); font-size: 1.05rem; font-family: var(--fuente-titulo); }
.eg-x { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.07); color: var(--texto-principal); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.eg-zonas { display: flex; flex-direction: column; gap: 8px; }
.eg-zona { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 12px 14px; border-radius: 14px; border: 1.5px solid var(--borde-sutil); background: rgba(255,255,255,0.02); cursor: pointer; }
.eg-zona b { color: var(--texto-principal); font-size: 0.9rem; }
.eg-zona small { color: var(--texto-desactivado); font-size: 0.74rem; }
.eg-zona.activa { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); }
.eg-personas { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.84rem; font-weight: 700; color: var(--texto-secundario); }
.eg-stepper { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--borde-sutil); border-radius: 999px; padding: 3px; }
.eg-stepper button { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(168,85,247,0.12); color: var(--texto-principal); font-size: 1.15rem; cursor: pointer; }
.eg-stepper b { min-width: 30px; text-align: center; color: var(--texto-principal); font-size: 1.05rem; }
.eg-metodos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.eg-metodo { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 11px 4px; border-radius: 13px; border: 1.5px solid var(--borde-sutil); background: none; color: var(--texto-secundario); font-weight: 700; font-size: 0.74rem; cursor: pointer; }
.eg-metodo.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.1); color: var(--texto-principal); }
.eg-efectivo { display: flex; flex-direction: column; gap: 8px; }
.eg-recibido { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 13px; background: var(--fondo-input, rgba(255,255,255,0.04)); border: 1.5px solid var(--borde-sutil); }
.eg-recibido span { font-size: 0.8rem; font-weight: 800; color: var(--texto-desactivado); flex-shrink: 0; }
.eg-recibido input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--texto-principal); font-size: 1.15rem; font-weight: 800; padding: 7px 0; }
.eg-chip { flex-shrink: 0; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--borde-sutil); background: rgba(168,85,247,0.07); color: var(--texto-principal); font-weight: 700; font-size: 0.76rem; cursor: pointer; }
.eg-cambio { margin: 0; font-size: 0.85rem; color: var(--texto-secundario); }
.eg-cambio.ok b { color: var(--color-exito); }
.eg-cambio.falta b { color: var(--color-error); }
.eg-error { margin: 0; font-size: 0.84rem; color: var(--color-error); }
.eg-cta { padding: 13px; border: none; border-radius: 14px; background: var(--gradiente-marca); color: #fff; font-weight: 800; font-size: 0.92rem; cursor: pointer; }
.eg-cta:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
