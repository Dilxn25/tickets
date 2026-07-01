<template>
  <div class="vista-reserva fade-in">
    <!-- Encabezado -->
    <div class="cabecera">
      <button class="btn-volver" @click="volver" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div class="cabecera-texto">
        <h1 class="titulo">Reservar mesa</h1>
        <p class="subtitulo">{{ nombreEvento || 'Elige tu mesa en el mapa' }}</p>
      </div>
      <RouterLink to="/cliente/mis-reservas" class="btn-mias" title="Mis reservas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
      </RouterLink>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="cargando">
      <div class="spinner"></div>
      <p>Cargando el mapa...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="estado-msg">
      <p>No se pudo cargar el mapa. Revisa tu conexión.</p>
      <button class="btn-primario" @click="cargar">Reintentar</button>
    </div>

    <!-- Sin zonas/mesas -->
    <div v-else-if="!zonas.length" class="estado-msg">
      <p>Este evento aún no tiene un mapa de mesas disponible.</p>
    </div>

    <template v-else>
      <!-- Selector de zona -->
      <div v-if="zonas.length > 1" class="tabs-zona">
        <button
          v-for="z in zonas" :key="z.id_zona"
          class="tab-zona" :class="{ activo: z.id_zona === idZonaSel }"
          @click="idZonaSel = z.id_zona">
          {{ z.nombre_zona }}
        </button>
      </div>

      <!-- Leyenda -->
      <div class="leyenda">
        <span class="lg"><i class="pt libre"></i> Libre</span>
        <span class="lg"><i class="pt ocupada"></i> Reservada</span>
        <span class="lg"><i class="pt deco"></i> Fijo</span>
      </div>

      <!-- Mapa -->
      <div class="lienzo-wrap">
        <div class="lienzo" :style="{ aspectRatio: String(proporcionPlano) }">
          <div
            v-for="el in elementosZona" :key="el.id_mesa"
            class="elemento" :class="claseElemento(el)"
            :style="estiloElemento(el)"
            @click="seleccionar(el)">
            <span class="etq">{{ el.numero_nombre }}</span>
          </div>
        </div>
      </div>

      <p class="ayuda-mapa">Toca una mesa libre para reservarla.</p>
    </template>

    <!-- Hoja inferior: mesa seleccionada -->
    <div v-if="mesaSel" class="hoja-overlay" @click.self="mesaSel = null">
      <div class="hoja">
        <div class="hoja-barra"></div>
        <div class="hoja-cab">
          <div>
            <h3>Mesa {{ mesaSel.numero_nombre }}</h3>
            <p class="hoja-zona">{{ nombreZonaSel }}</p>
          </div>
          <div class="precio">{{ formatoBs(precioMesa(mesaSel)) }}</div>
        </div>

        <div class="hoja-datos">
          <div class="dato">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            <span>Hasta {{ mesaSel.capacidad_sillas || 1 }} personas</span>
          </div>
          <div class="stepper">
            <button @click="personas = Math.max(1, personas - 1)" aria-label="Menos">−</button>
            <span>{{ personas }}</span>
            <button @click="personas = Math.min(mesaSel.capacidad_sillas || 20, personas + 1)" aria-label="Más">+</button>
          </div>
        </div>

        <p v-if="msgError" class="hoja-error">{{ msgError }}</p>

        <button class="btn-primario grande" :disabled="reservando" @click="reservar">
          {{ reservando ? 'Reservando...' : `Reservar por ${formatoBs(precioMesa(mesaSel))}` }}
        </button>
        <button class="btn-texto" @click="mesaSel = null">Cancelar</button>
      </div>
    </div>

    <!-- Modal PIN -->
    <div v-if="pidiendoPin" class="modal-overlay">
      <div class="modal-pin">
        <h3>Confirma con tu PIN</h3>
        <p>Ingresa tu PIN de 4 dígitos para autorizar el pago.</p>
        <input
          v-model="pin" type="password" inputmode="numeric" maxlength="4"
          class="input-pin" placeholder="••••" @keyup.enter="reservar" />
        <p v-if="msgError" class="hoja-error">{{ msgError }}</p>
        <div class="modal-acciones">
          <button class="btn-texto" @click="cancelarPin">Cancelar</button>
          <button class="btn-primario" :disabled="reservando || pin.length !== 4" @click="reservar">
            {{ reservando ? 'Verificando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal éxito -->
    <div v-if="reservaOk" class="modal-overlay">
      <div class="modal-exito">
        <div class="check-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h3>¡Reserva confirmada!</h3>
        <p class="exito-sub">Mesa {{ reservaOk.entrada.mesa }} · {{ reservaOk.entrada.zona }}</p>

        <img :src="reservaOk.qr" alt="QR de acceso" class="qr-img" />
        <p class="codigo">Código: <b>{{ reservaOk.entrada.codigo_ingreso }}</b></p>
        <p class="saldo-rest">Saldo restante: {{ formatoBs(reservaOk.saldo_restante) }}</p>

        <!-- Combos sugeridos -->
        <div v-if="reservaOk.combos_sugeridos && reservaOk.combos_sugeridos.length" class="combos">
          <p class="combos-titulo">Completa tu noche con un combo</p>
          <div class="combos-lista">
            <div v-for="(c, i) in reservaOk.combos_sugeridos" :key="i" class="combo-chip">
              <span class="combo-nombre">{{ c.nombre }}</span>
              <span class="combo-precio">
                <s>{{ formatoBs(c.precio_normal) }}</s>
                <b>{{ formatoBs(c.precio_combo) }}</b>
              </span>
            </div>
          </div>
        </div>

        <div class="modal-acciones col">
          <button class="btn-primario grande" @click="irMisReservas">Ver mis reservas</button>
          <button class="btn-texto" @click="cerrarExito">Seguir en el mapa</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { servicioReservas } from '@/servicios-api/servicio-reservas.js'

const route = useRoute()
const router = useRouter()
const idEvento = Number(route.params.idEvento)

const zonas = ref([])
const idZonaSel = ref(null)
const cargando = ref(true)
const error = ref(false)
const nombreEvento = ref('')

const mesaSel = ref(null)
const personas = ref(1)
const reservando = ref(false)
const msgError = ref('')
const pidiendoPin = ref(false)
const pin = ref('')
const reservaOk = ref(null)

let socket = null

// Tamaños por defecto (en %) cuando el elemento no trae ancho/alto
const TAM_DEFECTO = {
  mesa: { w: 11, h: 11 },
  silla: { w: 5, h: 5 },
  barra: { w: 26, h: 7 },
  escenario: { w: 34, h: 14 },
  pared: { w: 3, h: 22 },
  area: { w: 42, h: 45 },
}

const zonaSel = computed(() => zonas.value.find(z => z.id_zona === idZonaSel.value) || null)
const nombreZonaSel = computed(() => zonaSel.value?.nombre_zona || '')
const elementosZona = computed(() => zonaSel.value?.mesa_espacio || [])
const proporcionPlano = computed(() => Number(zonaSel.value?.proporcion) || 1.6)

function esReservable(el) {
  return el.tipo_elemento === 'mesa' && el.es_seleccionable
}

function claseElemento(el) {
  const c = [`tipo-${el.tipo_elemento || 'mesa'}`]
  if (esReservable(el)) {
    c.push(el.estado_ocupacion === 'libre' ? 'libre' : 'ocupada')
  } else {
    c.push('deco')
  }
  return c
}

function estiloElemento(el) {
  const def = TAM_DEFECTO[el.tipo_elemento] || TAM_DEFECTO.mesa
  const w = el.ancho != null ? el.ancho : def.w
  const h = el.alto != null ? el.alto : def.h
  const estilo = {
    left: `${el.posicion_x}%`,
    top: `${el.posicion_y}%`,
    width: `${w}%`,
    height: `${h}%`,
    transform: `rotate(${el.rotacion || 0}deg)`,
  }
  if (el.forma) estilo.borderRadius = el.forma === 'redondo' ? '50%' : '8px'
  return estilo
}

function precioMesa(el) {
  if (el.precio != null) return Number(el.precio)
  return Number(zonaSel.value?.precio_entrada_base || 0)
}

function formatoBs(n) {
  return `Bs ${Number(n || 0).toFixed(2)}`
}

function seleccionar(el) {
  if (!esReservable(el)) return
  if (el.estado_ocupacion !== 'libre') {
    msgError.value = ''
    return
  }
  mesaSel.value = el
  personas.value = 1
  msgError.value = ''
}

async function reservar() {
  if (!mesaSel.value) return
  reservando.value = true
  msgError.value = ''
  try {
    const r = await servicioReservas.reservarMesa(
      mesaSel.value.id_mesa,
      personas.value,
      pidiendoPin.value ? pin.value : undefined
    )
    reservaOk.value = r
    pidiendoPin.value = false
    pin.value = ''
    // Marcar la mesa como reservada localmente
    mesaSel.value.estado_ocupacion = 'reservada'
    mesaSel.value = null
  } catch (err) {
    const data = err?.response?.data || err
    if (data?.requiere_pin) {
      pidiendoPin.value = true
      msgError.value = data?.error === 'PIN incorrecto' ? 'PIN incorrecto, intenta de nuevo' : ''
    } else {
      msgError.value = data?.error || 'No se pudo completar la reserva'
      // Si la mesa fue tomada por otro, refrescamos el mapa
      if (err?.response?.status === 409) {
        mesaSel.value = null
        cargar()
      }
    }
  } finally {
    reservando.value = false
  }
}

function cancelarPin() {
  pidiendoPin.value = false
  pin.value = ''
  msgError.value = ''
}

function cerrarExito() {
  reservaOk.value = null
}
function irMisReservas() {
  router.push('/cliente/mis-reservas')
}
function volver() {
  router.back()
}

async function cargar() {
  cargando.value = true
  error.value = false
  try {
    const data = await servicioReservas.obtenerMapaEvento(idEvento)
    zonas.value = data || []
    if (zonas.value.length && !zonas.value.find(z => z.id_zona === idZonaSel.value)) {
      idZonaSel.value = zonas.value[0].id_zona
    }
    // Nombre del evento (si viene en alguna zona o lo dejamos genérico)
    nombreEvento.value = route.query.nombre || ''
  } catch (err) {
    console.error('Error cargando mapa de reserva:', err)
    error.value = true
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargar()
  // Tiempo real: si otra persona reserva una mesa, se refleja en el mapa
  socket = io()
  socket.on('mesa_actualizada', (datos) => {
    for (const z of zonas.value) {
      const m = z.mesa_espacio?.find(e => e.id_mesa === datos.id_mesa)
      if (m) m.estado_ocupacion = datos.estado
    }
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.vista-reserva { padding: 1rem; padding-bottom: 90px; }

/* Cabecera */
.cabecera { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
.cabecera-texto { flex: 1; min-width: 0; }
.titulo { font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); line-height: 1.1; }
.subtitulo { font-size: 0.82rem; color: var(--texto-secundario); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-volver, .btn-mias {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  color: var(--texto-principal); cursor: pointer;
}
.btn-mias { color: var(--rosa-acento); text-decoration: none; }
.btn-volver svg, .btn-mias svg { width: 20px; height: 20px; }

/* Estados */
.cargando, .estado-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 3rem 1rem; color: var(--texto-secundario); text-align: center; }
.spinner { width: 38px; height: 38px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

/* Tabs de zona */
.tabs-zona { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 0.6rem; }
.tab-zona {
  padding: 8px 16px; border-radius: 999px; white-space: nowrap;
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario); font-weight: 600; font-size: 0.85rem;
}
.tab-zona.activo { background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); color: #fff; border-color: transparent; }

/* Leyenda */
.leyenda { display: flex; gap: 16px; margin-bottom: 0.6rem; font-size: 0.75rem; color: var(--texto-secundario); }
.lg { display: inline-flex; align-items: center; gap: 6px; }
.pt { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
.pt.libre { background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); }
.pt.ocupada { background: rgba(239,68,68,0.6); }
.pt.deco { background: rgba(255,255,255,0.18); }

/* Lienzo del mapa */
.lienzo-wrap {
  width: 100%; border-radius: 16px; overflow: hidden;
  border: 1px solid var(--borde-sutil);
  background:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 100% 8.33%,
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 8.33% 100%,
    var(--fondo-tarjeta);
}
.lienzo { position: relative; width: 100%; aspect-ratio: 3 / 2; }

.elemento {
  position: absolute;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px; box-sizing: border-box;
  font-size: 0.7rem; font-weight: 700; color: #fff; text-align: center;
  overflow: hidden; user-select: none; z-index: 1;
}
.etq { padding: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.6); pointer-events: none; }

/* Mesas reservables */
.elemento.libre {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border: 2px solid rgba(255,255,255,0.35); cursor: pointer;
  box-shadow: 0 4px 14px rgba(219,39,119,0.35);
}
.elemento.libre:active { transform: scale(0.96); }
.elemento.ocupada {
  background: rgba(239,68,68,0.28); border: 2px dashed rgba(239,68,68,0.7);
  color: rgba(255,255,255,0.7); cursor: not-allowed;
}

/* Decorativos */
.elemento.deco { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.14); color: var(--texto-secundario); }
.elemento.tipo-barra { background: rgba(155,89,182,0.22); border: 1px solid rgba(155,89,182,0.4); border-radius: 8px; }
.elemento.tipo-escenario { background: repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 8px, rgba(255,255,255,0.02) 8px, rgba(255,255,255,0.02) 16px); border: 1px solid rgba(255,255,255,0.2); letter-spacing: 2px; }
.elemento.tipo-pared { background: repeating-linear-gradient(45deg, rgba(255,255,255,0.25), rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 8px); border-radius: 3px; }
.elemento.tipo-silla { border-radius: 50%; }
/* Área/Zona: recuadro visual detrás de las mesas, con etiqueta en la esquina */
.elemento.tipo-area {
  z-index: 0;
  align-items: flex-start; justify-content: flex-start;
  background: rgba(155,89,182,0.09);
  border: 2px dashed rgba(155,89,182,0.55);
  border-radius: 12px;
}
.elemento.tipo-area .etq {
  margin: 6px; padding: 2px 9px;
  background: rgba(0,0,0,0.42); border-radius: 6px;
  font-size: 0.7rem; letter-spacing: 0.03em; text-transform: uppercase;
  text-shadow: none;
}

.ayuda-mapa { text-align: center; font-size: 0.78rem; color: var(--texto-secundario); margin-top: 0.6rem; }

/* Hoja inferior */
.hoja-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 90; display: flex; align-items: flex-end; }
.hoja {
  width: 100%; background: var(--fondo-tarjeta); border-top-left-radius: 22px; border-top-right-radius: 22px;
  padding: 12px 1.2rem 1.6rem; box-shadow: 0 -10px 30px rgba(0,0,0,0.4);
  animation: subir 0.25s ease; max-width: 640px; margin: 0 auto;
}
@keyframes subir { from { transform: translateY(100%); } to { transform: translateY(0); } }
.hoja-barra { width: 44px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); margin: 0 auto 14px; }
.hoja-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 1rem; }
.hoja-cab h3 { font-size: 1.2rem; font-weight: 800; color: var(--texto-principal); }
.hoja-zona { font-size: 0.8rem; color: var(--texto-secundario); }
.precio { font-size: 1.2rem; font-weight: 800; color: var(--rosa-acento); white-space: nowrap; }

.hoja-datos { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.dato { display: flex; align-items: center; gap: 8px; color: var(--texto-secundario); font-size: 0.88rem; }
.dato svg { width: 18px; height: 18px; }
.stepper { display: flex; align-items: center; gap: 14px; }
.stepper button { width: 34px; height: 34px; border-radius: 10px; background: var(--fondo-app); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-size: 1.2rem; font-weight: 700; }
.stepper span { min-width: 20px; text-align: center; font-weight: 700; color: var(--texto-principal); }

.hoja-error { color: var(--color-error); font-size: 0.82rem; margin-bottom: 0.6rem; text-align: center; }

/* Botones */
.btn-primario {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff; border: none; padding: 11px 20px; border-radius: 12px;
  font-size: 0.95rem; font-weight: 700; box-shadow: 0 4px 15px rgba(219,39,119,0.3);
  transition: transform 0.15s; cursor: pointer;
}
.btn-primario.grande { width: 100%; padding: 14px; font-size: 1rem; }
.btn-primario:disabled { opacity: 0.6; }
.btn-primario:active { transform: scale(0.98); }
.btn-texto { width: 100%; background: none; border: none; color: var(--texto-secundario); padding: 10px; font-weight: 600; margin-top: 6px; cursor: pointer; }

/* Modales */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.2rem; }
.modal-pin, .modal-exito {
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 20px;
  padding: 1.6rem; text-align: center; max-width: 340px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.modal-pin h3, .modal-exito h3 { font-size: 1.2rem; font-weight: 800; color: var(--texto-principal); margin-bottom: 0.4rem; }
.modal-pin p { font-size: 0.84rem; color: var(--texto-secundario); margin-bottom: 1rem; }
.input-pin {
  width: 140px; text-align: center; font-size: 1.6rem; letter-spacing: 10px;
  padding: 10px; border-radius: 12px; background: var(--fondo-app);
  border: 1px solid var(--borde-sutil); color: var(--texto-principal); margin: 0 auto 0.6rem;
}
.modal-acciones { display: flex; gap: 10px; margin-top: 0.8rem; }
.modal-acciones.col { flex-direction: column; }

/* Éxito */
.check-ok { width: 64px; height: 64px; margin: 0 auto 0.8rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.35); }
.check-ok svg { width: 32px; height: 32px; }
.exito-sub { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 1rem; }
.qr-img { width: 190px; height: 190px; border-radius: 14px; background: #fff; padding: 8px; margin: 0 auto 0.8rem; display: block; }
.codigo { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 0.2rem; }
.codigo b { color: var(--texto-principal); letter-spacing: 1px; }
.saldo-rest { font-size: 0.85rem; color: var(--morado-brillante); font-weight: 600; margin-bottom: 1rem; }

/* Combos */
.combos { text-align: left; margin-bottom: 1rem; }
.combos-titulo { font-size: 0.82rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 0.5rem; }
.combos-lista { display: flex; flex-direction: column; gap: 8px; }
.combo-chip { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; border-radius: 12px; background: var(--fondo-app); border: 1px solid var(--borde-sutil); }
.combo-nombre { font-size: 0.82rem; color: var(--texto-principal); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.combo-precio { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.combo-precio s { font-size: 0.75rem; color: var(--texto-desactivado); }
.combo-precio b { font-size: 0.9rem; color: var(--rosa-acento); }
</style>
