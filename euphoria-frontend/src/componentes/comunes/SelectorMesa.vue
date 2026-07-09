<template>
  <div class="sel-mesa">
    <!-- Modos: Lista / Buscar / Mapa (igual que el POS del mesero) -->
    <div class="sm-tabs" role="tablist">
      <button type="button" class="sm-tab" :class="{ activo: modo === 'lista' }" @click="modo = 'lista'">Lista</button>
      <button type="button" class="sm-tab" :class="{ activo: modo === 'buscar' }" @click="modo = 'buscar'">Buscar</button>
      <button type="button" class="sm-tab" :class="{ activo: modo === 'mapa' }" @click="abrirMapa">Mapa</button>
    </div>

    <!-- LISTA -->
    <div v-if="modo === 'lista'" class="sm-lista">
      <BaseSelect v-model="seleccion" :options="opcionesMesa" :placeholder="mesasElegibles.length ? 'Elige una mesa' : 'Sin mesas libres'" />
    </div>

    <!-- BUSCAR -->
    <div v-else-if="modo === 'buscar'" class="sm-buscar">
      <input v-model="busqueda" class="sm-input" type="text" placeholder="Escribe el número o nombre de la mesa…" autocomplete="off" />
      <div v-if="busqueda.trim()" class="sm-chips">
        <button
          v-for="m in mesasFiltradas" :key="m.id_mesa" type="button"
          class="sm-chip" :class="{ activo: m.id_mesa === modelValue }"
          @click="elegir(m)"
        >
          {{ etiquetaMesa(m) }}
        </button>
        <p v-if="!mesasFiltradas.length" class="sm-vacio">Sin coincidencias.</p>
      </div>
      <p v-else class="sm-hint">Escribe para ver las mesas libres.</p>
    </div>

    <!-- Mesa elegida (resumen) -->
    <div v-if="mesaElegida" class="sm-elegida">
      <span class="sm-elegida-nom">{{ etiquetaMesa(mesaElegida) }}</span>
      <span v-if="mesaElegida.precio != null" class="sm-elegida-precio">Bs {{ Number(mesaElegida.precio).toFixed(2) }}</span>
      <button type="button" class="sm-quitar" @click="elegir(null)" aria-label="Quitar mesa">×</button>
    </div>

    <!-- MAPA (modal) -->
    <Teleport to="body">
      <div v-if="mapaAbierto" class="sm-overlay" @click.self="mapaAbierto = false">
        <div class="sm-modal">
          <header class="sm-modal-cab">
            <b>Toca una mesa libre</b>
            <button type="button" class="sm-cerrar" @click="mapaAbierto = false" aria-label="Cerrar">×</button>
          </header>
          <div class="sm-mapa-scroll">
            <div v-for="z in zonasConMesas" :key="z.id_zona" class="sm-zona">
              <div class="sm-zona-tit">{{ z.nombre_zona }}</div>
              <div class="sm-plano" :style="{ aspectRatio: (z.proporcion || 1.6) }">
                <button
                  v-for="m in z.mesas" :key="m.id_mesa" type="button"
                  class="sm-elem" :class="claseElem(m)"
                  :style="estiloElem(m)"
                  :disabled="!esElegible(m)"
                  @click="esElegible(m) && elegirDesdeMapa(m)"
                >
                  <span>{{ m.numero_nombre }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseSelect from './BaseSelect.vue'

const props = defineProps({
  // zonas: [{ id_zona, nombre_zona, proporcion, mesas: [{ id_mesa, numero_nombre, precio, posicion_x, posicion_y, ancho, alto, rotacion, forma, tipo_elemento, es_seleccionable, estado_ocupacion }] }]
  zonas: { type: Array, default: () => [] },
  modelValue: { type: [Number, null], default: null },
})
const emit = defineEmits(['update:modelValue', 'cambio'])

const modo = ref('lista')
const busqueda = ref('')
const mapaAbierto = ref(false)

// Todas las mesas/sillas libres y reservables del evento.
const mesasElegibles = computed(() => {
  const out = []
  for (const z of props.zonas || []) {
    for (const m of z.mesas || []) {
      if ((m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') && m.es_seleccionable && m.estado_ocupacion === 'libre') {
        out.push({ ...m, nombre_zona: z.nombre_zona })
      }
    }
  }
  return out
})

const zonasConMesas = computed(() => (props.zonas || []).filter(z => (z.mesas || []).length))

function etiquetaMesa(m) {
  const tipo = m.tipo_elemento === 'silla' ? 'Silla' : 'Mesa'
  const cap = m.capacidad_sillas ? ` · ${m.capacidad_sillas} pers` : ''
  return `${tipo} ${m.numero_nombre}${cap}`
}

const opcionesMesa = computed(() => mesasElegibles.value.map(m => ({
  value: m.id_mesa,
  label: `${etiquetaMesa(m)}${m.precio != null ? ' · Bs ' + Number(m.precio).toFixed(0) : ''}`,
})))

const mesasFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return []
  return mesasElegibles.value.filter(m => String(m.numero_nombre).toLowerCase().includes(q))
})

const mesaElegida = computed(() => mesasElegibles.value.find(m => m.id_mesa === props.modelValue) || null)

// v-model del BaseSelect (lista)
const seleccion = computed({
  get: () => props.modelValue,
  set: (v) => elegir(mesasElegibles.value.find(m => m.id_mesa === v) || null),
})

function elegir(m) {
  emit('update:modelValue', m ? m.id_mesa : null)
  emit('cambio', m || null)
}

function elegirDesdeMapa(m) {
  elegir(m)
  mapaAbierto.value = false
}

function abrirMapa() {
  modo.value = 'mapa'
  mapaAbierto.value = true
}

// Si la mesa elegida deja de estar libre (refresco), se limpia.
watch(() => props.zonas, () => {
  if (props.modelValue && !mesasElegibles.value.some(m => m.id_mesa === props.modelValue)) {
    elegir(null)
  }
})

// ---- Render del plano (mismo criterio que el POS del mesero: monocromo) ----
function esElegible(m) {
  return (m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') && m.es_seleccionable && m.estado_ocupacion === 'libre'
}
function claseElem(m) {
  if (m.id_mesa === props.modelValue) return 'sel'
  if (esElegible(m)) return 'elegible'
  if (m.estado_ocupacion !== 'libre' && m.es_seleccionable) return 'ocupada'
  return 'deco'
}
function estiloElem(m) {
  return {
    left: (m.posicion_x || 0) + '%',
    top: (m.posicion_y || 0) + '%',
    width: (m.ancho || 8) + '%',
    height: (m.alto || 8) + '%',
    transform: `translate(-50%, -50%) rotate(${m.rotacion || 0}deg)`,
    borderRadius: m.forma === 'redondo' ? '50%' : '8px',
  }
}
</script>

<style scoped>
.sel-mesa { display: flex; flex-direction: column; gap: 10px; }
.sm-tabs { display: inline-flex; gap: 4px; padding: 4px; background: var(--fondo-app); border: 1px solid var(--borde-sutil); border-radius: var(--radio-full); align-self: flex-start; }
.sm-tab { padding: 6px 16px; border: none; background: none; color: var(--texto-secundario); font-weight: 700; font-size: 0.82rem; border-radius: var(--radio-full); cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.sm-tab.activo { background: var(--gradiente-marca); color: #fff; }

.sm-input { width: 100%; box-sizing: border-box; background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 11px 14px; border-radius: var(--radio-md); font-size: 0.92rem; outline: none; }
.sm-input:focus { border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }
.sm-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.sm-chip { padding: 8px 14px; border-radius: var(--radio-full); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta-alt, rgba(255,255,255,0.04)); color: var(--texto-principal); font-weight: 600; font-size: 0.84rem; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
.sm-chip:hover { border-color: var(--morado-brillante); }
.sm-chip.activo { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.sm-hint, .sm-vacio { font-size: 0.8rem; color: var(--texto-desactivado); }

.sm-elegida { display: inline-flex; align-items: center; gap: 10px; align-self: flex-start; padding: 8px 12px; border-radius: var(--radio-md); background: rgba(168,85,247,0.12); border: 1px solid var(--borde-activo); }
.sm-elegida-nom { font-weight: 700; color: var(--texto-principal); font-size: 0.88rem; }
.sm-elegida-precio { color: var(--rosa-acento); font-weight: 700; font-size: 0.84rem; }
.sm-quitar { width: 22px; height: 22px; border-radius: 50%; border: none; background: rgba(255,255,255,0.1); color: var(--texto-principal); font-size: 1.1rem; line-height: 1; cursor: pointer; }
.sm-quitar:hover { background: rgba(239,68,68,0.3); }

/* Mapa modal */
.sm-overlay { position: fixed; inset: 0; z-index: 1200; background: rgba(6,4,16,0.75); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.sm-modal { width: min(680px, 96vw); max-height: 90vh; display: flex; flex-direction: column; background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: var(--radio-xl); overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.6); }
.sm-modal-cab { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--borde-sutil); }
.sm-modal-cab b { color: var(--texto-principal); font-size: 1rem; }
.sm-cerrar { width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: var(--texto-principal); font-size: 1.3rem; line-height: 1; cursor: pointer; }
.sm-cerrar:hover { background: rgba(255,255,255,0.16); }
.sm-mapa-scroll { overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 18px; }
.sm-zona-tit { font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
.sm-plano { position: relative; width: 100%; background: var(--fondo-app); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); overflow: hidden; }
.sm-elem { position: absolute; display: flex; align-items: center; justify-content: center; border: 1.5px solid transparent; font-size: 0.62rem; font-weight: 700; color: #fff; cursor: pointer; padding: 0; }
.sm-elem span { pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92%; }
.sm-elem.elegible { background: rgba(168,85,247,0.55); border-color: var(--morado-brillante); }
.sm-elem.elegible:hover { background: rgba(168,85,247,0.85); }
.sm-elem.sel { background: var(--gradiente-marca); border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
.sm-elem.ocupada { background: rgba(120,120,140,0.35); cursor: not-allowed; }
.sm-elem.deco { background: rgba(80,80,100,0.2); cursor: default; }
</style>
