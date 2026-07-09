<template>
  <div class="sg-vista">
    <header class="sg-head">
      <button class="sg-volver" @click="$router.back()" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div>
        <h1>Reserva para grupo grande</h1>
        <p>Marca los lugares donde te gustaría estar. Son tentativos: el local revisa y te confirma.</p>
      </div>
    </header>

    <div v-if="cargando" class="sg-cargando"><div class="spinner"></div></div>

    <template v-else-if="enviada">
      <div class="sg-exito">
        <div class="sg-exito-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2>Solicitud enviada</h2>
        <p>El local revisará tus lugares tentativos para {{ nombreEvento }} y te contactará para confirmar.</p>
        <button class="sg-btn" @click="$router.push('/cliente/mis-reservas')">Ver mis reservas</button>
      </div>
    </template>

    <template v-else>
      <!-- Mapa -->
      <div v-for="z in zonas" :key="z.id_zona" class="sg-zona">
        <div class="sg-zona-tit">{{ z.nombre_zona }} <span>· Bs {{ Number(z.precio_entrada_base).toFixed(0) }} p/pers</span></div>
        <div class="sg-plano" :style="{ aspectRatio: z.proporcion || 1.6 }">
          <button
            v-for="el in z.mesa_espacio" :key="el.id_mesa" type="button"
            class="sg-elem" :class="claseElem(el)" :style="estiloElem(el)"
            :disabled="!esElegible(el)"
            @click="alternar(el, z)"
          >
            <span>{{ el.numero_nombre }}</span>
          </button>
        </div>
      </div>

      <!-- Tentativas elegidas -->
      <div v-if="tentativas.length" class="sg-tent">
        <span class="sg-tent-lbl">Lugares tentativos:</span>
        <div class="sg-chips">
          <span v-for="t in tentativas" :key="t.id_mesa" class="sg-chip">
            {{ t.nombre }}
            <button @click="quitar(t.id_mesa)" aria-label="Quitar">×</button>
          </span>
        </div>
      </div>

      <!-- Datos -->
      <div class="sg-campo">
        <label>¿Cuántas personas van?</label>
        <div class="stepper">
          <button type="button" @click="personas = Math.max(1, personas - 1)">−</button>
          <span>{{ personas }}</span>
          <button type="button" @click="personas++">+</button>
        </div>
      </div>
      <div class="sg-campo">
        <label>Motivo / detalles</label>
        <textarea v-model="motivo" rows="3" maxlength="255" placeholder="Ej: Cumpleaños de 15 personas, queremos estar juntos cerca de la pista."></textarea>
      </div>

      <button class="sg-btn sg-enviar" :disabled="enviando" @click="enviar">
        {{ enviando ? 'Enviando…' : 'Enviar solicitud' }}
      </button>
      <p class="sg-nota">El local puede ajustar los lugares según disponibilidad. Esto no cobra nada todavía.</p>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { servicioReservas } from '@/servicios-api/servicio-reservas.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const route = useRoute()
const notif = useNotificaciones()
const idEvento = Number(route.params.idEvento)

const zonas = ref([])
const cargando = ref(true)
const tentativas = ref([]) // [{ id_mesa, nombre }]
const personas = ref(8)
const motivo = ref('')
const enviando = ref(false)
const enviada = ref(false)
const nombreEvento = ref('')

const TAM = { mesa: { w: 9, h: 9 }, silla: { w: 5, h: 5 }, barra: { w: 14, h: 6 } }

function esElegible(el) {
  return (el.tipo_elemento === 'mesa' || el.tipo_elemento === 'silla') && el.es_seleccionable && el.estado_ocupacion === 'libre'
}
function claseElem(el) {
  if (tentativas.value.some(t => t.id_mesa === el.id_mesa)) return 'sel'
  if (esElegible(el)) return 'elegible'
  if (el.es_seleccionable && el.estado_ocupacion !== 'libre') return 'ocupada'
  return 'deco'
}
function estiloElem(el) {
  const def = TAM[el.tipo_elemento] || TAM.mesa
  const estilo = {
    left: `${el.posicion_x}%`, top: `${el.posicion_y}%`,
    width: `${el.ancho != null ? el.ancho : def.w}%`,
    height: `${el.alto != null ? el.alto : def.h}%`,
    transform: `rotate(${el.rotacion || 0}deg)`,
  }
  if (el.forma) estilo.borderRadius = el.forma === 'redondo' ? '50%' : '8px'
  return estilo
}

function alternar(el) {
  if (!esElegible(el)) return
  const i = tentativas.value.findIndex(t => t.id_mesa === el.id_mesa)
  if (i >= 0) tentativas.value.splice(i, 1)
  else tentativas.value.push({ id_mesa: el.id_mesa, nombre: `${el.tipo_elemento === 'silla' ? 'Silla' : 'Mesa'} ${el.numero_nombre}` })
}
function quitar(id) {
  const i = tentativas.value.findIndex(t => t.id_mesa === id)
  if (i >= 0) tentativas.value.splice(i, 1)
}

async function enviar() {
  if (enviando.value) return
  enviando.value = true
  try {
    await servicioReservas.solicitarGrupo({
      id_evento: idEvento,
      cantidad_personas: personas.value,
      motivo: motivo.value.trim(),
      mesas_tentativas: tentativas.value,
    })
    enviada.value = true
  } catch (err) {
    const data = err?.response?.data || err
    notif.error(data?.error || 'No se pudo enviar la solicitud.')
  } finally { enviando.value = false }
}

onMounted(async () => {
  try {
    const data = await servicioReservas.obtenerMapaEvento(idEvento)
    zonas.value = data || []
    nombreEvento.value = zonas.value[0]?.evento?.nombre_evento || 'el evento'
  } catch { zonas.value = [] }
  finally { cargando.value = false }
})
</script>

<style scoped>
.sg-vista { padding: 16px; max-width: 760px; margin: 0 auto; padding-bottom: 140px; }
.sg-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.sg-volver { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta); color: var(--texto-principal); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.sg-volver svg { width: 20px; height: 20px; }
.sg-head h1 { font-size: 1.25rem; font-weight: 800; color: var(--texto-principal); }
.sg-head p { font-size: 0.85rem; color: var(--texto-secundario); margin-top: 3px; line-height: 1.4; }

.sg-cargando { display: flex; justify-content: center; padding: 3rem; }
.spinner { width: 34px; height: 34px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

.sg-zona { margin-bottom: 18px; }
.sg-zona-tit { font-size: 0.82rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 8px; }
.sg-zona-tit span { color: var(--texto-secundario); font-weight: 500; }
.sg-plano { position: relative; width: 100%; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 14px; overflow: hidden; }
.sg-elem { position: absolute; display: flex; align-items: center; justify-content: center; border: 1.5px solid transparent; font-size: 0.6rem; font-weight: 700; color: #fff; cursor: pointer; padding: 0; transform-origin: center; }
.sg-elem span { pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92%; }
.sg-elem.elegible { background: rgba(168,85,247,0.5); border-color: var(--morado-brillante); }
.sg-elem.elegible:active { background: rgba(168,85,247,0.8); }
.sg-elem.sel { background: var(--gradiente-marca); border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
.sg-elem.ocupada { background: rgba(120,120,140,0.35); cursor: not-allowed; }
.sg-elem.deco { background: rgba(80,80,100,0.2); cursor: default; }

.sg-tent { margin-bottom: 16px; }
.sg-tent-lbl { font-size: 0.78rem; font-weight: 700; color: var(--texto-secundario); }
.sg-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.sg-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: rgba(168,85,247,0.14); border: 1px solid var(--borde-activo); color: var(--texto-principal); font-size: 0.8rem; font-weight: 600; }
.sg-chip button { border: none; background: none; color: var(--texto-secundario); font-size: 1.1rem; line-height: 1; cursor: pointer; }

.sg-campo { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.sg-campo > label { font-size: 0.8rem; font-weight: 700; color: var(--texto-principal); }
.sg-campo textarea { background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); border-radius: 12px; padding: 12px; font-size: 0.9rem; resize: vertical; font-family: inherit; outline: none; }
.sg-campo textarea:focus { border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }
.stepper { display: inline-flex; align-items: center; gap: 16px; align-self: flex-start; }
.stepper button { width: 42px; height: 42px; border-radius: 12px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-size: 1.3rem; font-weight: 700; cursor: pointer; }
.stepper span { min-width: 30px; text-align: center; font-weight: 800; font-size: 1.2rem; color: var(--texto-principal); }

.sg-btn { width: 100%; padding: 14px; border-radius: 14px; border: none; background: var(--gradiente-marca); color: #fff; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
.sg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.sg-nota { font-size: 0.76rem; color: var(--texto-desactivado); text-align: center; margin-top: 10px; line-height: 1.4; }

.sg-exito { text-align: center; padding: 3rem 1rem; }
.sg-exito-ic { width: 72px; height: 72px; border-radius: 50%; background: rgba(34,197,94,0.18); color: var(--color-exito); display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; }
.sg-exito-ic svg { width: 36px; height: 36px; }
.sg-exito h2 { font-size: 1.3rem; font-weight: 800; color: var(--texto-principal); margin-bottom: 8px; }
.sg-exito p { font-size: 0.9rem; color: var(--texto-secundario); line-height: 1.5; max-width: 40ch; margin: 0 auto 20px; }
</style>
