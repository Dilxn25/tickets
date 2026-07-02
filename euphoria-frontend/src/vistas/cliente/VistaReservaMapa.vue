<template>
  <div class="vista-reserva entrada-cine">
    <!-- Encabezado / hero -->
    <header class="cabecera textura-grano">
      <div class="orbe-deco morado orbe-a" aria-hidden="true"></div>
      <div class="orbe-deco rosa orbe-b" aria-hidden="true"></div>

      <div class="cabecera-top">
        <button class="btn-volver" @click="volver" aria-label="Volver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <RouterLink to="/cliente/mis-reservas" class="btn-mias" title="Mis reservas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          <span>Mis reservas</span>
        </RouterLink>
      </div>

      <div class="cabecera-texto">
        <h1 class="titulo">Reservar mesa</h1>
        <p class="subtitulo">{{ nombreEvento || 'Elige tu mesa en el mapa' }}</p>
      </div>
    </header>

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

      <!-- ZONA GENERAL / DE PIE (campo): no hay mapa, se compra entrada general -->
      <div v-if="zonaSel && zonaSel.es_general" class="campo-card">
        <div class="campo-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <h3 class="campo-titulo">{{ zonaSel.nombre_zona }}</h3>
        <p class="campo-sub">Entrada general de pie · sin asiento asignado</p>
        <div class="campo-precio">{{ formatoBs(zonaSel.precio_entrada_base) }}</div>
        <p class="campo-disp" :class="{ agotado: (zonaSel.disponibles_general ?? 0) <= 0 }">
          {{ (zonaSel.disponibles_general ?? 0) > 0
            ? 'Quedan ' + zonaSel.disponibles_general + ' de ' + zonaSel.capacidad_maxima + ' entradas'
            : 'Entradas agotadas' }}
        </p>
        <p v-if="msgError" class="hoja-error">{{ msgError }}</p>
        <button class="btn-primario grande brillo-hover" :disabled="reservando || (zonaSel.disponibles_general ?? 0) <= 0" @click="comprarCampoEntrada">
          {{ reservando ? 'Procesando...' : `Comprar entrada de pie por ${formatoBs(zonaSel.precio_entrada_base)}` }}
        </button>
      </div>

      <!-- ZONA CON ASIENTOS: mapa para elegir mesa/silla -->
      <template v-else>
        <!-- Leyenda -->
        <div class="leyenda superficie">
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

        <p class="ayuda-mapa">Toca una mesa o silla libre para reservarla.</p>
      </template>
    </template>

    <!-- Hoja inferior: mesa seleccionada -->
    <div v-if="mesaSel" class="hoja-overlay" @click.self="mesaSel = null">
      <div class="hoja">
        <div class="hoja-barra"></div>
        <div class="hoja-cab">
          <div>
            <h3>{{ mesaSel.tipo_elemento === 'silla' ? 'Silla' : 'Mesa' }} {{ mesaSel.numero_nombre }}</h3>
            <p class="hoja-zona">{{ nombreZonaSel }}</p>
          </div>
          <div class="precio">{{ formatoBs(precioMesa(mesaSel)) }}</div>
        </div>

        <div class="hoja-datos">
          <div class="dato">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            <span v-if="mesaSel.tipo_elemento === 'silla'">Asiento individual · 1 persona</span>
            <span v-else>Mesa completa · QR para {{ mesaSel.capacidad_sillas || 1 }} personas</span>
          </div>
        </div>
        <p class="hoja-nota">
          {{ mesaSel.tipo_elemento === 'silla'
            ? 'Reservas un asiento para ti.'
            : 'Compras la mesa entera. Tu QR sirve para ' + (mesaSel.capacidad_sillas || 1) + ' ingresos: puedes entrar por tandas (ej. 3 ahora y el resto después).' }}
        </p>

        <p v-if="msgError" class="hoja-error">{{ msgError }}</p>

        <button class="btn-primario grande brillo-hover" :disabled="reservando" @click="reservar">
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
          class="input-pin" placeholder="••••" @keyup.enter="confirmarPin" />
        <p v-if="msgError" class="hoja-error">{{ msgError }}</p>
        <div class="modal-acciones">
          <button class="btn-texto" @click="cancelarPin">Cancelar</button>
          <button class="btn-primario" :disabled="reservando || pin.length !== 4" @click="confirmarPin">
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
        <p class="exito-sub">{{ reservaOk.entrada.mesa ? 'Mesa ' + reservaOk.entrada.mesa + ' · ' : '' }}{{ reservaOk.entrada.zona }}</p>

        <img :src="reservaOk.qr" alt="QR de acceso" class="qr-img" />
        <p class="codigo">Código: <b>{{ reservaOk.entrada.codigo_ingreso }}</b></p>
        <p class="saldo-rest">Saldo restante: {{ formatoBs(reservaOk.saldo_restante) }}</p>

        <!-- Combos sugeridos (tocar para agregarlos al carrito) -->
        <div v-if="reservaOk.combos_sugeridos && reservaOk.combos_sugeridos.length" class="combos">
          <p class="combos-titulo">Completa tu noche con un combo</p>
          <div class="combos-lista">
            <button
              v-for="(c, i) in reservaOk.combos_sugeridos" :key="i"
              class="combo-chip" type="button" @click="agregarCombo(c)">
              <span class="combo-nombre">{{ c.nombre }}</span>
              <span class="combo-precio">
                <s>{{ formatoBs(c.precio_normal) }}</s>
                <b>{{ formatoBs(c.precio_combo) }}</b>
              </span>
              <svg class="combo-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </button>
          </div>
        </div>

        <div class="modal-acciones col">
          <button class="btn-primario grande brillo-hover" @click="irMisReservas">Ver mis reservas</button>
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
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'

const route = useRoute()
const router = useRouter()
const tiendaCarrito = useTiendaCarrito()
const idEvento = Number(route.params.idEvento)
const productosCompletos = ref([])

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
const accionPin = ref('mesa') // 'mesa' | 'campo' — qué confirma el PIN
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
  return (el.tipo_elemento === 'mesa' || el.tipo_elemento === 'silla') && el.es_seleccionable
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
      accionPin.value = 'mesa'
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

// Comprar entrada general / de pie (campo) en la zona general seleccionada
async function comprarCampoEntrada() {
  if (!idZonaSel.value) return
  reservando.value = true
  msgError.value = ''
  try {
    const r = await servicioReservas.comprarCampo(
      idZonaSel.value,
      pidiendoPin.value ? pin.value : undefined
    )
    reservaOk.value = r
    pidiendoPin.value = false
    pin.value = ''
    cargar() // refresca disponibles
  } catch (err) {
    const data = err?.response?.data || err
    if (data?.requiere_pin) {
      pidiendoPin.value = true
      accionPin.value = 'campo'
      msgError.value = data?.error === 'PIN incorrecto' ? 'PIN incorrecto, intenta de nuevo' : ''
    } else {
      msgError.value = data?.error || 'No se pudo comprar la entrada de pie'
    }
  } finally {
    reservando.value = false
  }
}

// El modal de PIN confirma la acción pendiente (reserva de mesa/silla o entrada de pie)
function confirmarPin() {
  if (accionPin.value === 'campo') comprarCampoEntrada()
  else reservar()
}

function cancelarPin() {
  pidiendoPin.value = false
  pin.value = ''
  msgError.value = ''
}

function cerrarExito() {
  reservaOk.value = null
}
// Agrega ambos productos del combo sugerido al carrito y lleva al carrito
function agregarCombo(c) {
  let agregado = false
  for (const p of c.productos || []) {
    const prod = productosCompletos.value.find(x => x.id_producto === p.id_producto)
    if (prod) { tiendaCarrito.agregarItem(prod); agregado = true }
  }
  if (agregado) router.push('/cliente/carrito')
  else msgError.value = 'No se pudo agregar el combo. Intenta desde el catálogo.'
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
  // Catálogo completo para poder agregar combos sugeridos al carrito
  servicioProductos.listar().then(p => { productosCompletos.value = p || [] }).catch(() => {})
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
.vista-reserva { padding: 1rem; padding-bottom: 90px; max-width: 680px; margin: 0 auto; }

/* Cabecera / hero de vidrio con orbes de neon */
.cabecera {
  position: relative; overflow: hidden; isolation: isolate;
  border-radius: var(--radio-xl); padding: 1rem 1.35rem 1.25rem;
  margin-bottom: 1.2rem;
  background: var(--glass-fondo); border: 1px solid var(--glass-borde);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 20px 52px rgba(10,6,26,0.55);
}
.cabecera .orbe-a { width: 260px; height: 260px; top: -140px; right: -70px; opacity: 0.4; }
.cabecera .orbe-b { width: 210px; height: 210px; bottom: -150px; left: -80px; opacity: 0.3; }

.cabecera-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 0.9rem; }
.cabecera-texto { position: relative; z-index: 1; }
.titulo {
  font-family: var(--fuente-titulo); font-size: 1.75rem; font-weight: 800;
  letter-spacing: -0.02em; line-height: 1.1; color: var(--texto-principal);
}
.subtitulo { font-size: 0.9rem; color: var(--texto-secundario); margin-top: 0.35rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.btn-volver {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
  background: rgba(46,26,102,0.5); border: 1px solid var(--glass-borde);
  color: var(--texto-principal); cursor: pointer;
  transition: transform 0.3s var(--ease-cine), border-color 0.25s, background 0.25s, box-shadow 0.3s;
}
.btn-mias {
  display: inline-flex; align-items: center; gap: 9px; flex-shrink: 0;
  height: 44px; padding: 0 18px; border-radius: var(--radio-full);
  background: rgba(236,72,153,0.1); border: 1px solid rgba(236,72,153,0.32);
  color: var(--rosa-suave); text-decoration: none; cursor: pointer;
  font-size: 0.82rem; font-weight: 700; letter-spacing: 0.01em; white-space: nowrap;
  transition: transform 0.3s var(--ease-cine), border-color 0.25s, background 0.25s, box-shadow 0.3s;
}
.btn-volver:hover { border-color: var(--borde-activo); transform: translateY(-2px); box-shadow: var(--glow-morado); }
.btn-mias:hover { border-color: rgba(236,72,153,0.6); transform: translateY(-2px); box-shadow: var(--glow-rosa); background: rgba(236,72,153,0.16); }
.btn-volver:active, .btn-mias:active { transform: scale(0.94); }
.btn-volver svg, .btn-mias svg { width: 20px; height: 20px; }

/* Estados */
.cargando, .estado-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.1rem; padding: 3.5rem 1.25rem; color: var(--texto-secundario); text-align: center; text-wrap: balance; }
.estado-msg p { max-width: 34ch; line-height: 1.5; }
.spinner { width: 38px; height: 38px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 0.9s linear infinite; box-shadow: var(--sombra-glow); }
@keyframes girar { to { transform: rotate(360deg); } }

/* Tabs de zona: control segmentado tipo pildora */
.tabs-zona {
  display: flex; gap: 8px; overflow-x: auto; padding: 5px; margin-bottom: 1rem;
  border-radius: var(--radio-full);
  background: rgba(46,26,102,0.32); border: 1px solid var(--glass-borde);
  -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.tabs-zona::-webkit-scrollbar { display: none; }
.tab-zona {
  flex: 0 0 auto; /* nunca se encogen: evita que se aplasten/sobrepongan */
  padding: 9px 18px; border-radius: var(--radio-full); white-space: nowrap; cursor: pointer;
  background: transparent; border: 1px solid transparent;
  color: var(--texto-secundario); font-weight: 700; font-size: 0.85rem; letter-spacing: 0.01em;
  transition: transform 0.3s var(--ease-cine), color 0.25s, box-shadow 0.3s, background 0.25s;
}
.tab-zona:hover:not(.activo) { color: var(--texto-principal); background: rgba(168,85,247,0.1); }
.tab-zona:active { transform: scale(0.96); }
.tab-zona.activo { background: var(--gradiente-marca); color: #fff; box-shadow: 0 6px 20px rgba(168,85,247,0.4); }

/* Leyenda: barra de vidrio con puntos luminosos */
.leyenda {
  display: flex; flex-wrap: wrap; gap: 18px; align-items: center;
  padding: 11px 18px; border-radius: var(--radio-full) !important;
  margin-bottom: 0.85rem; font-size: 0.76rem; font-weight: 600; color: var(--texto-secundario);
}
.lg { display: inline-flex; align-items: center; gap: 8px; }
.pt { width: 11px; height: 11px; border-radius: var(--radio-sm); display: inline-block; }
.pt.libre { background: #22C55E; box-shadow: 0 0 10px rgba(34,197,94,0.6); }
.pt.ocupada { background: #EF4444; box-shadow: 0 0 10px rgba(239,68,68,0.5); }
.pt.deco { background: rgba(196,181,224,0.4); }

/* Lienzo del mapa — acotado y centrado para que no crezca gigante ni se
   sobreponga con la barra de pestañas en pantallas grandes. */
.lienzo-wrap {
  width: 100%; max-width: 600px; margin: 0 auto;
  border-radius: 20px; overflow: hidden; position: relative; z-index: 0;
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 44px rgba(10,6,26,0.5), var(--sombra-glow);
  background:
    linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 100% 8.33%,
    linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 8.33% 100%,
    radial-gradient(120% 80% at 50% 0%, rgba(91,47,184,0.28), transparent 70%),
    var(--fondo-tarjeta);
}
/* min-height defensivo: si por cualquier motivo aspect-ratio no aplica, el
   lienzo nunca colapsa a 0 (lo que apilaría los elementos unos sobre otros). */
.lienzo { position: relative; width: 100%; aspect-ratio: 3 / 2; min-height: 220px; }

.elemento {
  position: absolute;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px; box-sizing: border-box;
  font-size: 0.7rem; font-weight: 700; color: #fff; text-align: center;
  overflow: hidden; user-select: none; z-index: 1;
}
.etq { padding: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.6); pointer-events: none; }

/* Mesas reservables (segun el diseno: libre = verde, ocupada = rojo) */
.elemento.libre {
  background: rgba(34,197,94,0.16);
  border: 2px solid rgba(34,197,94,0.55);
  color: #4ADE80; cursor: pointer;
  box-shadow: 0 4px 14px rgba(34,197,94,0.22);
  transition: transform 0.12s, box-shadow 0.2s, background 0.2s;
}
.elemento.libre:hover { background: rgba(34,197,94,0.26); box-shadow: 0 6px 20px rgba(34,197,94,0.35); }
.elemento.libre:active { transform: scale(0.96); }
.elemento.ocupada {
  background: rgba(239,68,68,0.14); border: 2px solid rgba(239,68,68,0.5);
  color: #F87171; cursor: not-allowed;
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

.ayuda-mapa { text-align: center; font-size: 0.8rem; color: var(--texto-secundario); margin-top: 0.9rem; }

/* Zona general / de pie (campo) */
.campo-card {
  position: relative; overflow: hidden; isolation: isolate;
  max-width: 440px; margin: 0.75rem auto; text-align: center;
  background: var(--gradiente-sutil); border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl); padding: 2.4rem 1.75rem 2rem;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 22px 54px rgba(10,6,26,0.55);
}
.campo-card::before {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(110% 70% at 50% -10%, rgba(168,85,247,0.22), transparent 65%);
}
.campo-icono {
  width: 72px; height: 72px; margin: 0 auto 1.1rem; border-radius: 22px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(168,85,247,0.16); color: var(--morado-hover);
  border: 1px solid var(--borde-activo); box-shadow: var(--glow-morado);
}
.campo-icono svg { width: 34px; height: 34px; }
.campo-titulo { font-family: var(--fuente-titulo); font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); line-height: 1.1; }
.campo-sub { font-size: 0.86rem; color: var(--texto-secundario); margin-top: 0.35rem; margin-bottom: 1.1rem; }
.campo-precio { font-family: var(--fuente-titulo); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--rosa-acento); line-height: 1; text-shadow: 0 0 30px rgba(236,72,153,0.35); }
.campo-disp {
  display: inline-block; font-size: 0.8rem; font-weight: 600; color: var(--texto-secundario);
  margin: 0.9rem 0 1.4rem; padding: 6px 14px; border-radius: var(--radio-full);
  background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.28); color: #4ADE80;
}
.campo-disp.agotado { color: var(--color-error); background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }

/* Hoja inferior */
.hoja-overlay { position: fixed; inset: 0; background: rgba(6,3,18,0.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 90; display: flex; align-items: flex-end; }
.hoja {
  position: relative; overflow: hidden; isolation: isolate;
  width: 100%; background: var(--gradiente-sutil);
  border: 1px solid var(--glass-borde); border-bottom: none;
  border-top-left-radius: 28px; border-top-right-radius: 28px;
  padding: 14px 1.4rem 1.8rem; box-shadow: 0 -18px 44px rgba(6,3,18,0.6);
  animation: subir 0.32s var(--ease-cine); max-width: 640px; margin: 0 auto;
}
.hoja::before {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(90% 60% at 80% -5%, rgba(236,72,153,0.16), transparent 60%),
              radial-gradient(90% 60% at 15% -5%, rgba(168,85,247,0.18), transparent 60%);
}
@keyframes subir { from { transform: translateY(100%); } to { transform: translateY(0); } }
.hoja-barra { width: 46px; height: 5px; border-radius: var(--radio-full); background: rgba(196,181,224,0.4); margin: 0 auto 18px; }
.hoja-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 1.1rem; }
.hoja-cab h3 { font-family: var(--fuente-titulo); font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); line-height: 1.1; }
.hoja-zona { font-size: 0.82rem; color: var(--texto-secundario); margin-top: 4px; }
.precio { font-family: var(--fuente-titulo); font-size: 1.55rem; font-weight: 800; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--rosa-acento); white-space: nowrap; text-shadow: 0 0 22px rgba(236,72,153,0.3); }

.hoja-datos { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
.dato { display: flex; align-items: center; gap: 10px; color: var(--texto-secundario); font-size: 0.88rem; }
.dato svg { width: 20px; height: 20px; color: var(--morado-hover); flex-shrink: 0; }
.stepper { display: flex; align-items: center; gap: 14px; }
.stepper button { width: 34px; height: 34px; border-radius: 10px; background: var(--fondo-app); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-size: 1.2rem; font-weight: 700; }
.stepper span { min-width: 20px; text-align: center; font-weight: 700; color: var(--texto-principal); }

.hoja-nota { font-size: 0.82rem; color: var(--texto-secundario); line-height: 1.55; text-wrap: pretty; background: rgba(168,85,247,0.1); border: 1px solid var(--glass-borde); border-radius: var(--radio-lg); padding: 13px 15px; margin-bottom: 1.1rem; }
.hoja-error { color: var(--color-error); font-size: 0.82rem; margin-bottom: 0.6rem; text-align: center; }

/* Botones */
.btn-primario {
  background: var(--gradiente-marca);
  color: #fff; border: none; padding: 12px 22px; border-radius: var(--radio-full);
  font-size: 0.95rem; font-weight: 700; letter-spacing: 0.01em; box-shadow: 0 10px 26px rgba(236,72,153,0.35);
  transition: transform 0.35s var(--ease-cine), box-shadow 0.35s var(--ease-cine); cursor: pointer;
}
.btn-primario.grande { width: 100%; padding: 15px; font-size: 1rem; }
.btn-primario:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(236,72,153,0.45), var(--glow-morado); }
.btn-primario:disabled { opacity: 0.5; box-shadow: none; cursor: not-allowed; }
.btn-primario:active:not(:disabled) { transform: scale(0.98); }
.btn-texto { width: 100%; background: none; border: none; color: var(--texto-secundario); padding: 11px; font-weight: 600; margin-top: 6px; cursor: pointer; border-radius: var(--radio-full); transition: color 0.2s, background 0.2s; }
.btn-texto:hover { color: var(--texto-principal); background: rgba(168,85,247,0.08); }

/* Modales */
.modal-overlay { position: fixed; inset: 0; background: rgba(6,3,18,0.72); backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.2rem; }
.modal-pin, .modal-exito {
  position: relative; overflow: hidden; isolation: isolate;
  background: var(--gradiente-sutil); border: 1px solid var(--glass-borde); border-radius: var(--radio-xl);
  padding: 1.9rem 1.7rem; text-align: center; max-width: 350px; width: 100%;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), var(--sombra-modal), var(--sombra-glow);
  animation: aparecer-modal 0.4s var(--ease-cine);
}
.modal-pin::before, .modal-exito::before {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(100% 60% at 50% -10%, rgba(168,85,247,0.2), transparent 60%);
}
@keyframes aparecer-modal { from { opacity: 0; transform: translateY(14px) scale(0.96); filter: blur(4px); } to { opacity: 1; transform: none; filter: blur(0); } }
.modal-pin h3, .modal-exito h3 { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); margin-bottom: 0.45rem; }
.modal-pin p { font-size: 0.84rem; color: var(--texto-secundario); line-height: 1.5; margin-bottom: 1rem; }
.input-pin {
  width: 170px; text-align: center; font-size: 1.7rem; letter-spacing: 12px;
  font-variant-numeric: tabular-nums; padding: 13px; border-radius: var(--radio-lg); background: var(--fondo-input);
  border: 1px solid var(--borde-sutil); color: var(--texto-principal); margin: 0 auto 0.6rem;
  transition: border-color 0.25s, box-shadow 0.3s;
}
.input-pin:focus { outline: none; border-color: var(--borde-activo); box-shadow: var(--glow-morado); }
.modal-acciones { display: flex; gap: 10px; margin-top: 1rem; }
.modal-acciones.col { flex-direction: column; }

/* Éxito */
.check-ok { width: 72px; height: 72px; margin: 0 auto 1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(34,197,94,0.16); color: #22c55e; border: 1px solid rgba(34,197,94,0.4); box-shadow: 0 0 34px rgba(34,197,94,0.4); animation: aparecer-check 0.5s var(--ease-rebote); }
@keyframes aparecer-check { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.check-ok svg { width: 36px; height: 36px; }
.exito-sub { font-size: 0.86rem; color: var(--texto-secundario); margin-bottom: 1.2rem; }
.qr-img { width: 196px; height: 196px; border-radius: var(--radio-lg); background: #fff; padding: 10px; margin: 0 auto 1rem; display: block; box-shadow: 0 12px 30px rgba(6,3,18,0.5), var(--sombra-glow); }
.codigo { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 0.3rem; }
.codigo b { color: var(--texto-principal); letter-spacing: 1px; font-variant-numeric: tabular-nums; }
.saldo-rest {
  display: inline-block; font-size: 0.82rem; color: var(--morado-hover); font-weight: 700;
  font-variant-numeric: tabular-nums; margin-bottom: 1.2rem; padding: 6px 14px;
  border-radius: var(--radio-full); background: rgba(168,85,247,0.1); border: 1px solid var(--glass-borde);
}

/* Combos */
.combos { text-align: left; margin-bottom: 1.2rem; }
.combos-titulo { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--morado-hover); margin-bottom: 0.7rem; }
.combos-lista { display: flex; flex-direction: column; gap: 9px; }
.combo-chip { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border-radius: var(--radio-lg); background: rgba(46,26,102,0.4); border: 1px solid var(--glass-borde); width: 100%; text-align: left; cursor: pointer; font: inherit; transition: transform 0.3s var(--ease-cine), border-color 0.25s, box-shadow 0.3s, background 0.25s; }
.combo-chip:hover { border-color: var(--borde-activo); box-shadow: var(--glow-morado); transform: translateY(-2px); background: rgba(168,85,247,0.12); }
.combo-chip:active { transform: scale(0.98); }
.combo-add { width: 18px; height: 18px; color: var(--morado-hover); flex-shrink: 0; }
.combo-nombre { font-size: 0.82rem; color: var(--texto-principal); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.combo-precio { display: flex; align-items: center; gap: 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.combo-precio s { font-size: 0.75rem; color: var(--texto-desactivado); }
.combo-precio b { font-size: 0.9rem; color: var(--rosa-acento); }

/* Responsivo: colapso a 1 columna y hero mas compacto en movil */
@media (max-width: 480px) {
  .vista-reserva { padding: 0.75rem; padding-bottom: 90px; }
  .cabecera { padding: 1rem 1.1rem 1.35rem; }
  .btn-mias span { display: none; }
  .btn-mias { padding: 0; width: 44px; justify-content: center; }
  .leyenda { gap: 14px; padding: 10px 14px; }
  .campo-card { padding: 2rem 1.35rem 1.75rem; }
}

/* Foco visible para navegacion por teclado */
.btn-volver:focus-visible, .btn-mias:focus-visible, .tab-zona:focus-visible,
.btn-primario:focus-visible, .btn-texto:focus-visible, .combo-chip:focus-visible,
.elemento.libre:focus-visible {
  outline: 2px solid var(--morado-hover); outline-offset: 2px;
}

/* Respeta la preferencia de menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .modal-pin, .modal-exito, .check-ok, .hoja { animation: none; }
  .btn-volver, .btn-mias, .tab-zona, .btn-primario, .combo-chip,
  .elemento.libre, .input-pin { transition: none; }
}
</style>
