<template>
  <div class="vista-reserva entrada-cine">
    <!-- Cabecera compacta: volver + título en una línea + subtítulo pequeño -->
    <header class="cabecera">
      <button class="btn-volver" @click="volver" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div class="cabecera-texto">
        <h1 class="titulo">Reservar mesa</h1>
        <p class="subtitulo">{{ nombreEvento || 'Elige tu mesa en el mapa' }}</p>
      </div>
      <RouterLink to="/cliente/mis-reservas" class="btn-mias" title="Mis reservas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        <span>Mis reservas</span>
      </RouterLink>
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
        <!-- Leyenda compacta -->
        <div class="leyenda">
          <span class="lg"><i class="pt libre"></i> Libre</span>
          <span class="lg"><i class="pt ocupada"></i> Reservada</span>
          <span class="lg"><i class="pt en-vista"></i> Alguien la ve</span>
          <span class="lg"><i class="pt sel"></i> Tu elección</span>
        </div>

        <!-- Mapa -->
        <div class="lienzo-wrap">
          <div class="lienzo" :style="{ aspectRatio: String(proporcionPlano) }">
            <div
              v-for="el in elementosZona" :key="el.id_mesa"
              class="elemento" :class="claseElemento(el)"
              :style="estiloElemento(el)"
              @click="seleccionar(el)">
              <span class="etq">{{ etiquetaElemento(el) }}</span>
              <span
                v-if="esReservable(el) && el.estado_ocupacion === 'libre'"
                class="precio-tag" aria-hidden="true">
                {{ formatoBsCorto(precioMesa(el)) }}
              </span>
              <span v-if="esReservable(el) && el.estado_ocupacion === 'libre' && estaEnVista(el.id_mesa)" class="ojo-vista" title="Alguien está viendo este lugar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="11" height="11"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
              </span>
            </div>
          </div>
        </div>

        <div v-if="leyendaZonas.length" class="leyenda-zonas">
          <span v-for="lz in leyendaZonas" :key="lz.precio" class="leyenda-item">
            <span class="leyenda-punto" :style="{ background: lz.color }"></span>
            <b>Bs {{ lz.precio }}</b>
          </span>
        </div>

        <p class="ayuda-mapa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ayuda-icono"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"></path><path d="M11 12V4a1.5 1.5 0 0 1 3 0v8"></path><path d="M14 6.5a1.5 1.5 0 0 1 3 0V16a5 5 0 0 1-5 5h-1.5a5 5 0 0 1-4.2-2.3L4 15s.8-1.4 2.4-.9L8 15"></path></svg>
          Toca una mesa o silla libre para reservarla.
        </p>
      </template>
    </template>

    <!-- Panel de mesa seleccionada: bottom-sheet compacto que NO tapa el mapa -->
    <Teleport to="body">
      <Transition name="hoja">
        <div v-if="mesaSel" class="hoja" role="dialog" aria-label="Mesa seleccionada">
          <div class="hoja-barra" aria-hidden="true"></div>
          <button class="hoja-cerrar" @click="mesaSel = null" aria-label="Cerrar panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div class="hoja-cab">
            <div class="hoja-tit">
              <h3 v-if="esPieSel">Entrada de pie</h3>
              <h3 v-else>{{ mesaSel.tipo_elemento === 'silla' ? 'Silla' : 'Mesa' }} {{ mesaSel.numero_nombre }}</h3>
              <p class="hoja-zona">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                {{ nombreZonaSel }} · {{ esPieSel ? 'sin asiento, de pie' : (mesaSel.tipo_elemento === 'silla' ? '1 persona' : (mesaSel.capacidad_sillas || 1) + ' personas') }}
              </p>
            </div>
            <div class="precio">{{ formatoBs(precioMesa(mesaSel)) }}</div>
          </div>

          <p class="hoja-nota">
            {{ esPieSel
              ? 'Compras UNA entrada de pie (sin asiento asignado) en esta zona.'
              : (mesaSel.tipo_elemento === 'silla'
                ? 'Reservas un asiento para ti.'
                : 'Compras la mesa entera. Tu QR sirve para ' + (mesaSel.capacidad_sillas || 1) + ' ingresos: puedes entrar por tandas (ej. 3 ahora y el resto después).') }}
          </p>

          <!-- Disponibilidad de la pista, en vivo (baja al comprar y temporalmente al ser vista) -->
          <p v-if="esPieSel" class="hoja-disp" :class="{ agotado: pistaDisponibles(mesaSel) <= 0 }">
            {{ pistaDisponibles(mesaSel) > 0
              ? 'Quedan ' + pistaDisponibles(mesaSel) + ' de ' + (mesaSel.capacidad_sillas || 0) + ' lugares'
              : 'Sin lugares disponibles ahora mismo' }}
            <em v-if="viewersDe(mesaSel.id_mesa) > 0" class="hoja-disp-nota"> · {{ viewersDe(mesaSel.id_mesa) }} mirándola ahora</em>
          </p>

          <p v-if="!esPieSel && mesaSel && estaEnVista(mesaSel.id_mesa)" class="hoja-vista">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            Otra persona también está mirando este lugar. ¡Reserva rápido!
          </p>
          <p v-if="msgError" class="hoja-error">{{ msgError }}</p>

          <button class="btn-primario grande brillo-hover" :disabled="reservando || (esPieSel && pistaDisponibles(mesaSel) <= 0)" @click="esPieSel ? comprarPieEntrada() : reservar()">
            {{ reservando ? 'Procesando...' : (esPieSel ? `Comprar de pie por ${formatoBs(precioMesa(mesaSel))}` : `Reservar por ${formatoBs(precioMesa(mesaSel))}`) }}
          </button>
        </div>
      </Transition>

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
          <p class="exito-sub">{{ reservaOk.entrada.mesa ? (tipoReservado === 'silla' ? 'Silla ' : 'Mesa ') + reservaOk.entrada.mesa + ' · ' : '' }}{{ reservaOk.entrada.zona }}</p>

          <img :src="reservaOk.qr" alt="QR de acceso" class="qr-img" />
          <p class="codigo">Código: <b>{{ reservaOk.entrada.codigo_ingreso }}</b></p>
          <p class="saldo-rest">Saldo restante: {{ formatoBs(reservaOk.saldo_restante) }}</p>

          <!-- PACKS PARA MESA de la IA: patrones reales de mesas grandes, con imágenes -->
          <div v-if="tipoReservado === 'mesa' && packs.length" class="packs-mesa">
            <p class="combos-titulo">Arma tu mesa de una vez</p>
            <div class="packs-mesa-lista">
              <button v-for="(pk, i) in packs" :key="'pk' + i" class="pack-mesa" type="button" @click="agregarPack(pk)">
                <span class="pack-mesa-imgs">
                  <img v-for="(it, j) in pk.items.slice(0, 3)" :key="j" :src="it.url_imagen || ''"
                       :alt="it.nombre" @error="$event.target.style.visibility = 'hidden'" />
                </span>
                <span class="pack-mesa-info">
                  <span class="pack-mesa-nombre">{{ pk.nombre }}</span>
                  <span class="pack-mesa-detalle">{{ resumenPack(pk) }}</span>
                  <span class="pack-mesa-precio"><s>{{ formatoBs(pk.precio_normal) }}</s> <b>{{ formatoBs(pk.precio_pack) }}</b></span>
                </span>
                <svg class="pack-mesa-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>

          <!-- Combos sugeridos (tocar para agregarlos al carrito) -->
          <div v-else-if="reservaOk.combos_sugeridos && reservaOk.combos_sugeridos.length" class="combos">
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
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { mapaColorPorPrecio, colorPorPrecio } from '@/utilidades/colores-zona.js'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { servicioReservas } from '@/servicios-api/servicio-reservas.js'
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const route = useRoute()
const router = useRouter()
const tiendaCarrito = useTiendaCarrito()
const tienda = useTiendaAutenticacion()
const idEvento = Number(route.params.idEvento)
const productosCompletos = ref([])

const zonas = ref([])
const idZonaSel = ref(null)
const cargando = ref(true)
const error = ref(false)
const nombreEvento = ref('')

const mesaSel = ref(null)
const personas = ref(1)
// Packs para mesa de la IA: se ofrecen al confirmar la reserva de una MESA
const packs = ref([])
const tipoReservado = ref('')
const reservando = ref(false)
const msgError = ref('')
const pidiendoPin = ref(false)
const pin = ref('')
const accionPin = ref('mesa') // 'mesa' | 'campo' | 'pie' — qué confirma el PIN
const reservaOk = ref(null)

// Presencia en vivo: quiénes están VIENDO cada lugar ahora → { id_mesa: { socketId: nombre } }.
const viendoOtros = ref({})
let miMesaVista = null
// Cuántas OTRAS personas están viendo un lugar (no cuenta mi propia vista).
function viewersDe(id_mesa) { return Object.keys(viendoOtros.value[id_mesa] || {}).length }
function estaEnVista(id_mesa) { return viewersDe(id_mesa) > 0 }

let socket = null

// Avisa a los demás qué lugar estoy mirando (o que lo dejé).
function emitirPresencia(el) {
  if (!socket) return
  if (miMesaVista && (!el || miMesaVista !== el.id_mesa)) {
    socket.emit('dejar_mesa', { id_zona: idZonaSel.value, id_mesa: miMesaVista })
    miMesaVista = null
  }
  if (el && ['mesa', 'silla', 'area'].includes(el.tipo_elemento)) {
    miMesaVista = el.id_mesa
    socket.emit('viendo_mesa', { id_evento: idEvento, id_zona: el.id_zona || idZonaSel.value, id_mesa: el.id_mesa, nombre: tienda.usuario?.nombres || 'Alguien' })
  }
}
watch(mesaSel, (nuevo) => emitirPresencia(nuevo))

// Disponibilidad de la pista: total de parados − vendidas − los que la ven ahora (temporal).
function pistaDisponibles(area) {
  const total = Number(area?.capacidad_sillas) || 0
  const vendidas = Number(zonaSel.value?.vendidas_pie) || 0
  return Math.max(0, total - vendidas - viewersDe(area?.id_mesa))
}

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

// Etiqueta a mostrar: el nombre propio, o el tipo (Barra/Escenario/Zona) para que
// el cliente se ubique aunque el elemento no tenga nombre. La pared es decorativa.
function etiquetaElemento(el) {
  if (el.numero_nombre) return el.numero_nombre
  return ({ barra: 'Barra', escenario: 'Escenario', area: 'Zona', pared: '' })[el.tipo_elemento] || ''
}

function claseElemento(el) {
  const c = [`tipo-${el.tipo_elemento || 'mesa'}`]
  if (esReservable(el)) {
    c.push(el.estado_ocupacion === 'libre' ? 'libre' : 'ocupada')
    // Resalta en el mapa la mesa que el cliente tiene elegida en el panel
    if (mesaSel.value && mesaSel.value.id_mesa === el.id_mesa) c.push('sel')
    // Alguien más lo está viendo ahora mismo (presencia en vivo)
    if (el.estado_ocupacion === 'libre' && estaEnVista(el.id_mesa)) c.push('en-vista')
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
  // Color por zona (según precio): el área se tiñe entera; las mesas/sillas llevan
  // un aro del color de su zona SIN tapar el estado libre/ocupada.
  const color = colorElemento(el)
  if (color) {
    if (el.tipo_elemento === 'area') {
      estilo.borderColor = color
      estilo.background = color + '22'
      estilo.boxShadow = `inset 0 0 24px ${color}2e`
    } else if (esReservable(el)) {
      estilo.outline = `2px solid ${color}`
      estilo.outlineOffset = '1px'
    }
  }
  return estilo
}

function precioMesa(el) {
  if (el.precio != null) return Number(el.precio)
  return Number(zonaSel.value?.precio_entrada_base || 0)
}

// Color por zona (mismo criterio de precio en todo el evento, para que sea consistente).
const mapaColores = computed(() => {
  const precios = []
  for (const z of zonas.value) {
    for (const m of (z.mesa_espacio || [])) {
      precios.push(m.precio != null ? Number(m.precio) : Number(z.precio_entrada_base || 0))
    }
  }
  return mapaColorPorPrecio(precios)
})
function colorElemento(el) {
  const precio = el.precio != null ? Number(el.precio) : Number(zonaSel.value?.precio_entrada_base || 0)
  return colorPorPrecio(precio, mapaColores.value)
}
// Leyenda: SOLO color + precio (sin nombres), un ítem por precio distinto.
const leyendaZonas = computed(() => {
  const precios = new Set()
  for (const z of zonas.value) {
    for (const m of (z.mesa_espacio || [])) {
      const precio = m.precio != null ? Number(m.precio) : Number(z.precio_entrada_base || 0)
      if (precio > 0) precios.add(precio)
    }
  }
  return [...precios]
    .map(precio => ({ precio, color: colorPorPrecio(precio, mapaColores.value) }))
    .filter(x => x.color)
    .sort((a, b) => b.precio - a.precio)
})

function formatoBs(n) {
  return `Bs ${Number(n || 0).toFixed(2)}`
}

// Version corta para la etiqueta de precio dentro del mapa (poco espacio)
function formatoBsCorto(n) {
  const v = Number(n || 0)
  return `Bs ${Number.isInteger(v) ? v : v.toFixed(2)}`
}

const esPieSel = computed(() => mesaSel.value?.tipo_elemento === 'area')
function seleccionar(el) {
  // Área/pista con precio: se compra entrada de pie.
  if (el.tipo_elemento === 'area') {
    const precio = el.precio != null ? Number(el.precio) : Number(zonaSel.value?.precio_entrada_base || 0)
    if (!(precio > 0)) return // área sin precio: decorativa
    mesaSel.value = el
    personas.value = 1
    msgError.value = ''
    return
  }
  if (!esReservable(el)) return
  if (el.estado_ocupacion !== 'libre') {
    msgError.value = ''
    return
  }
  mesaSel.value = el
  personas.value = 1
  msgError.value = ''
}

// Comprar entrada de pie tocando el área/pista del mapa.
async function comprarPieEntrada() {
  if (!mesaSel.value) return
  reservando.value = true
  msgError.value = ''
  try {
    const r = await servicioReservas.comprarPie(mesaSel.value.id_mesa, pidiendoPin.value ? pin.value : undefined)
    reservaOk.value = r
    tipoReservado.value = 'campo'
    tiendaCarrito.setEventoActivo(String(idEvento))
    localStorage.setItem('euphoria_evento_actual', JSON.stringify({ id: idEvento, nombre: nombreEvento.value || '' }))
    pidiendoPin.value = false
    pin.value = ''
    mesaSel.value = null
    cargar()
  } catch (err) {
    const data = err?.response?.data || err
    if (data?.requiere_pin) {
      pidiendoPin.value = true
      accionPin.value = 'pie'
      msgError.value = data?.error === 'PIN incorrecto' ? 'PIN incorrecto, intenta de nuevo' : ''
    } else {
      msgError.value = data?.error || 'No se pudo comprar la entrada de pie'
    }
  } finally {
    reservando.value = false
  }
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
    tipoReservado.value = mesaSel.value.tipo_elemento
    pidiendoPin.value = false
    pin.value = ''
    // El cliente ya está "dentro" de este evento: habilita el catálogo/carrito
    // y el banner "Estás en vivo" del inicio
    tiendaCarrito.setEventoActivo(String(idEvento))
    localStorage.setItem('euphoria_evento_actual', JSON.stringify({ id: idEvento, nombre: nombreEvento.value || '' }))
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
      if (data?.__status === 409) {
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
    tipoReservado.value = 'campo'
    tiendaCarrito.setEventoActivo(String(idEvento))
    localStorage.setItem('euphoria_evento_actual', JSON.stringify({ id: idEvento, nombre: nombreEvento.value || '' }))
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
  else if (accionPin.value === 'pie') comprarPieEntrada()
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

// Agrega un PACK completo al carrito (cada producto con su cantidad del patrón).
// Se aplica el DESCUENTO del pack a cada producto y se marca como 'combo' para que
// el backend valide y cobre el precio con descuento (no el de catálogo).
function agregarPack(pk) {
  let agregado = false
  // Factor de descuento implícito del pack (precio_pack / precio_normal).
  const factor = (Number(pk.precio_pack) > 0 && Number(pk.precio_normal) > 0)
    ? Number(pk.precio_pack) / Number(pk.precio_normal) : 1
  for (const it of pk.items || []) {
    const prod = productosCompletos.value.find(x => x.id_producto === it.id_producto)
    if (prod) {
      // Cada producto del pack va con su propia foto (sin mutar el original):
      // - combos: su composición (2-3 fotos solapadas, como en su tarjeta)
      // - simples sin foto: la foto que trae el item del pack
      let prodConImagen = prod
      if (prod.es_combo) {
        const imagenes = (prod.combos_como_padre || [])
          .map(c => c.url_imagen || c.producto?.url_imagen || '')
          .filter(Boolean)
          .slice(0, 3)
        if (imagenes.length) {
          prodConImagen = { ...prod, url_imagen: prod.url_imagen || imagenes[0], imagenes_combo: imagenes }
        } else if (!prod.url_imagen && it.url_imagen) {
          prodConImagen = { ...prod, url_imagen: it.url_imagen }
        }
      } else if (!prod.url_imagen && it.url_imagen) {
        prodConImagen = { ...prod, url_imagen: it.url_imagen }
      }
      // Aplica el descuento del pack a este producto y lo marca como combo.
      const baseNum = parseFloat(prodConImagen.precio_base) || 0
      prodConImagen = {
        ...prodConImagen,
        precio_base: Math.round(baseNum * factor * 100) / 100,
        estado_promocion: false,
        combo: true,
      }
      for (let n = 0; n < (it.cantidad || 1); n++) tiendaCarrito.agregarItem(prodConImagen)
      agregado = true
    }
  }
  if (agregado) router.push('/cliente/carrito')
  else msgError.value = 'No se pudo agregar el pack. Intenta desde el catálogo.'
}
// Resumen corto del pack: "1× Ron + 4× RedBull"
function resumenPack(pk) {
  return (pk.items || []).map(it => `${it.cantidad}× ${it.nombre.split(' de ')[0].split(' (')[0]}`).join(' + ')
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
  // Packs para mesa de la IA (patrones reales de mesas grandes) — se ofrecen al reservar
  clienteHttp.get('/recomendaciones/packs').then(r => { packs.value = (r.packs || []).slice(0, 3) }).catch(() => {})
  // Tiempo real: si otra persona reserva una mesa, se refleja en el mapa
  socket = io()
  socket.emit('entrar_mapa', { id_evento: idEvento })
  socket.on('mesa_actualizada', (datos) => {
    for (const z of zonas.value) {
      const m = z.mesa_espacio?.find(e => e.id_mesa === datos.id_mesa)
      if (m) m.estado_ocupacion = datos.estado
    }
    // Si alguien reservó, deja de estar "en vista".
    if (datos.id_mesa != null) {
      const copia = { ...viendoOtros.value }; delete copia[datos.id_mesa]; viendoOtros.value = copia
    }
  })
  // Presencia: alguien está VIENDO un lugar (aún no reserva). Contamos por socket.
  socket.on('viendo_mesa', ({ id_mesa, nombre, socketId }) => {
    if (id_mesa == null || !socketId) return
    const prev = viendoOtros.value[id_mesa] || {}
    viendoOtros.value = { ...viendoOtros.value, [id_mesa]: { ...prev, [socketId]: nombre || 'Alguien' } }
  })
  socket.on('dejar_mesa', ({ id_mesa, socketId }) => {
    const prev = viendoOtros.value[id_mesa]
    if (!prev || !socketId) return
    const copia = { ...prev }; delete copia[socketId]
    const nuevo = { ...viendoOtros.value }
    if (Object.keys(copia).length) nuevo[id_mesa] = copia
    else delete nuevo[id_mesa]
    viendoOtros.value = nuevo
  })
  // Alguien compró una entrada de pie: baja la disponibilidad de esa zona en vivo.
  socket.on('pie_comprado', ({ id_zona }) => {
    const z = zonas.value.find(x => x.id_zona === id_zona)
    if (z) z.vendidas_pie = (Number(z.vendidas_pie) || 0) + 1
  })
})

onUnmounted(() => {
  if (socket) {
    if (miMesaVista) socket.emit('dejar_mesa', { id_zona: idZonaSel.value, id_mesa: miMesaVista })
    socket.disconnect()
  }
})
</script>

<style scoped>
.vista-reserva { padding: 1rem; padding-bottom: 90px; max-width: 680px; margin: 0 auto; }

/* Cabecera compacta: una fila (volver + título/subtítulo + mis reservas) */
.cabecera {
  display: flex; align-items: center; gap: 12px;
  min-width: 0;
  padding: var(--esp-1) 0;
  margin-bottom: 0.9rem;
}
.cabecera-texto { flex: 1; min-width: 0; }
.titulo {
  font-family: var(--fuente-titulo); font-size: 1.25rem; font-weight: 800;
  letter-spacing: -0.02em; line-height: 1.15; color: var(--texto-principal);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.subtitulo { font-size: 0.78rem; color: var(--texto-secundario); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.btn-volver {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
  color: var(--texto-principal); cursor: pointer;
  transition: transform 0.3s var(--ease-cine), border-color 0.25s, background 0.25s, box-shadow 0.3s;
}
.btn-mias {
  display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
  height: 40px; padding: 0 15px; border-radius: var(--radio-full);
  background: rgba(236,72,153,0.1); border: 1px solid rgba(236,72,153,0.32);
  color: var(--rosa-suave); text-decoration: none; cursor: pointer;
  font-size: 0.8rem; font-weight: 700; letter-spacing: 0.01em; white-space: nowrap;
  transition: transform 0.3s var(--ease-cine), border-color 0.25s, background 0.25s, box-shadow 0.3s;
}
.btn-volver:hover { border-color: var(--borde-activo); transform: translateY(-2px); box-shadow: var(--glow-morado); }
.btn-mias:hover { border-color: rgba(236,72,153,0.6); transform: translateY(-2px); box-shadow: var(--glow-rosa); background: rgba(236,72,153,0.16); }
.btn-volver:active, .btn-mias:active { transform: scale(0.94); }
.btn-volver svg, .btn-mias svg { width: 19px; height: 19px; }

/* Estados */
.cargando, .estado-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.1rem; padding: 3.5rem 1.25rem; color: var(--texto-secundario); text-align: center; text-wrap: balance; }
.estado-msg p { max-width: 34ch; line-height: 1.5; }
.spinner { width: 38px; height: 38px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: 50%; animation: girar 0.9s linear infinite; box-shadow: var(--sombra-glow); }
@keyframes girar { to { transform: rotate(360deg); } }

/* Tabs de zona: control segmentado tipo pildora */
.tabs-zona {
  display: flex; gap: 8px; overflow-x: auto; padding: 5px; margin-bottom: 0.85rem;
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

/* Leyenda: chips pequeños en UNA sola fila, scrolleable si no cabe */
.leyenda {
  display: flex; flex-wrap: nowrap; gap: 8px; align-items: center;
  width: fit-content; max-width: 100%;
  margin: 0 auto 0.85rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; scrollbar-width: none;
  font-size: 0.72rem; font-weight: 600; color: var(--texto-secundario);
}
.leyenda::-webkit-scrollbar { display: none; }
.lg {
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; flex-shrink: 0;
  padding: 5px 11px; border-radius: var(--radio-full);
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil);
}
.pt { width: 10px; height: 10px; border-radius: var(--radio-sm); display: inline-block; flex-shrink: 0; }
.pt.libre { background: #22C55E; box-shadow: 0 0 10px rgba(34,197,94,0.6); }
.pt.ocupada { background: #EF4444; box-shadow: 0 0 10px rgba(239,68,68,0.5); }
.pt.sel { background: var(--rosa-acento); box-shadow: 0 0 10px rgba(236,72,153,0.6); }
.pt.deco { background: rgba(196,181,224,0.4); }

/* Lienzo del mapa — acotado y centrado */
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

/* Etiqueta de precio dentro de las mesas libres */
.precio-tag {
  position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
  padding: 1px 6px; border-radius: var(--radio-full);
  background: rgba(6,3,18,0.65);
  font-size: 0.56rem; font-weight: 700; letter-spacing: 0.01em;
  color: #BBF7D0; white-space: nowrap; max-width: calc(100% - 4px);
  overflow: hidden; text-overflow: ellipsis; pointer-events: none;
}
/* En móvil los elementos del plano son muy chicos: la etiqueta de precio
   tapaba el nombre de la mesa. El precio se ve al seleccionarla. */
@media (max-width: 700px) {
  .precio-tag { display: none; }
}

/* Mesas libres: verdes y pulsando suavemente (afford de "tocables") */
.elemento.libre {
  background: rgba(34,197,94,0.16);
  border: 2px solid rgba(34,197,94,0.55);
  color: #4ADE80; cursor: pointer;
  box-shadow: 0 4px 14px rgba(34,197,94,0.22);
  transition: box-shadow 0.2s, background 0.2s, border-color 0.2s;
  animation: pulsoLibre 2.6s ease-in-out infinite;
}
@keyframes pulsoLibre {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0), 0 4px 14px rgba(34,197,94,0.22); }
  50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0.14), 0 4px 18px rgba(34,197,94,0.4); }
}
.elemento.libre:hover { background: rgba(34,197,94,0.28); border-color: rgba(74,222,128,0.85); }
.elemento.ocupada {
  background: rgba(239,68,68,0.14); border: 2px solid rgba(239,68,68,0.5);
  color: #F87171; cursor: not-allowed;
}

/* Mesa elegida: resaltada en rosa neon por encima del resto */
.elemento.sel {
  background: rgba(236,72,153,0.32);
  border: 2px solid var(--rosa-suave);
  color: #fff; z-index: 3;
  box-shadow: 0 0 0 4px rgba(236,72,153,0.22), 0 8px 24px rgba(236,72,153,0.5);
  animation: none;
}
.elemento.sel .precio-tag { color: #FBCFE8; }

/* Alguien más está viendo este lugar ahora (presencia en vivo) */
.elemento.en-vista {
  border-color: #F5B301 !important;
  box-shadow: 0 0 0 2px rgba(245,179,1,0.5), 0 0 14px rgba(245,179,1,0.55);
  animation: pulso-vista 1.3s ease-in-out infinite;
}
@keyframes pulso-vista {
  0%, 100% { box-shadow: 0 0 0 2px rgba(245,179,1,0.5), 0 0 8px rgba(245,179,1,0.4); }
  50% { box-shadow: 0 0 0 3px rgba(245,179,1,0.7), 0 0 18px rgba(245,179,1,0.7); }
}
.ojo-vista {
  position: absolute; top: 2px; right: 2px;
  display: inline-flex; color: #F5B301;
  filter: drop-shadow(0 0 3px rgba(245,179,1,0.8));
  pointer-events: none;
}
.pt.en-vista { background: #F5B301; box-shadow: 0 0 10px rgba(245,179,1,0.6); }

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

.ayuda-mapa {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  text-align: center; font-size: 0.8rem; color: var(--texto-secundario); margin-top: 0.9rem;
}
.ayuda-icono { width: 15px; height: 15px; flex-shrink: 0; color: var(--morado-hover); }

/* Leyenda de zonas por color */
.leyenda-zonas {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 14px;
  margin-top: 0.9rem;
}
.leyenda-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.76rem; color: var(--texto-secundario);
}
.leyenda-item b { color: var(--texto-principal); font-weight: 700; }
.leyenda-punto {
  width: 11px; height: 11px; border-radius: 50%;
  box-shadow: 0 0 7px currentColor; flex-shrink: 0;
}

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
  display: inline-block; font-size: 0.8rem; font-weight: 600;
  margin: 0.9rem 0 1.4rem; padding: 6px 14px; border-radius: var(--radio-full);
  background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.28); color: #4ADE80;
}
.campo-disp.agotado { color: var(--color-error); background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }

/* ===== Bottom-sheet de mesa seleccionada =====
   Sin overlay oscuro: el mapa sigue visible y tocable. Compacto y flotante. */
.hoja {
  position: fixed; z-index: 1200;
  left: 10px; right: 10px; bottom: 10px;
  margin-inline: auto; max-width: 540px;
  background: linear-gradient(165deg, var(--fondo-tarjeta-alt), var(--fondo-tarjeta));
  border: 1px solid var(--borde-activo);
  border-radius: 22px;
  padding: 8px 1.2rem calc(1.1rem + env(safe-area-inset-bottom));
  box-shadow: 0 -6px 24px rgba(6,3,18,0.5), 0 18px 44px rgba(6,3,18,0.65), 0 0 30px rgba(168,85,247,0.28);
}
.hoja-enter-active { transition: transform 0.35s var(--ease-cine), opacity 0.3s ease; }
.hoja-leave-active { transition: transform 0.25s ease, opacity 0.2s ease; }
.hoja-enter-from, .hoja-leave-to { transform: translateY(calc(100% + 24px)); opacity: 0; }

.hoja-barra { width: 46px; height: 5px; border-radius: var(--radio-full); background: rgba(196,181,224,0.4); margin: 4px auto 12px; }
.hoja-cerrar {
  position: absolute; top: 12px; right: 12px;
  width: 34px; height: 34px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(168,85,247,0.1); border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario); cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.hoja-cerrar:hover { color: var(--texto-principal); background: rgba(168,85,247,0.2); border-color: var(--borde-activo); }
.hoja-cerrar svg { width: 16px; height: 16px; }

.hoja-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 0.8rem; padding-right: 38px; }
.hoja-tit { min-width: 0; }
.hoja-cab h3 { font-family: var(--fuente-titulo); font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; color: var(--texto-principal); line-height: 1.1; }
.hoja-zona {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.8rem; color: var(--texto-secundario); margin-top: 5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hoja-zona svg { width: 14px; height: 14px; flex-shrink: 0; color: var(--morado-hover); }
.precio { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--rosa-acento); white-space: nowrap; text-shadow: 0 0 22px rgba(236,72,153,0.3); }

.hoja-nota { font-size: 0.8rem; color: var(--texto-secundario); line-height: 1.5; text-wrap: pretty; background: rgba(168,85,247,0.1); border: 1px solid var(--glass-borde); border-radius: var(--radio-lg); padding: 10px 13px; margin-bottom: 0.9rem; }
.hoja-error { color: var(--color-error); font-size: 0.82rem; margin-bottom: 0.6rem; text-align: center; }
.hoja-vista {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  color: #F5B301; font-size: 0.8rem; font-weight: 600;
  margin-bottom: 0.6rem; text-align: center;
}
.hoja-disp {
  text-align: center; font-size: 0.85rem; font-weight: 700;
  color: var(--color-exito); margin-bottom: 0.6rem;
}
.hoja-disp.agotado { color: var(--color-error); }
.hoja-disp-nota { font-weight: 500; font-style: normal; color: #F5B301; }

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

/* Modales (fondo oscurecido SIN blur) */
.modal-overlay { position: fixed; inset: 0; background: rgba(6,3,18,0.8); z-index: 1300; display: flex; align-items: center; justify-content: center; padding: 1.2rem; }
.modal-pin, .modal-exito {
  position: relative; overflow: hidden; isolation: isolate;
  background: var(--gradiente-sutil); border: 1px solid var(--glass-borde); border-radius: var(--radio-xl);
  padding: 1.9rem 1.7rem; text-align: center; max-width: 350px; width: 100%;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), var(--sombra-modal), var(--sombra-glow);
  animation: aparecer-modal 0.4s var(--ease-cine);
}
/* El modal de exito puede crecer (QR + packs): scrollea DENTRO, nunca se sale */
.modal-exito {
  max-height: calc(100dvh - 2.4rem);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.modal-pin::before, .modal-exito::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 220px; z-index: -1; pointer-events: none;
  background: radial-gradient(100% 100% at 50% -10%, rgba(168,85,247,0.2), transparent 70%);
}
@keyframes aparecer-modal { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
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
.qr-img { width: 196px; height: 196px; max-width: 100%; border-radius: var(--radio-lg); background: #fff; padding: 10px; margin: 0 auto 1rem; display: block; box-shadow: 0 12px 30px rgba(6,3,18,0.5), var(--sombra-glow); }
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

/* Packs para mesa (IA): tarjetas con imágenes solapadas — "se conquista con la vista" */
.packs-mesa { margin-top: 1.1rem; text-align: left; }
.packs-mesa-lista { display: flex; flex-direction: column; gap: 9px; }
.pack-mesa {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 13px; border-radius: var(--radio-lg);
  background: rgba(46,26,102,0.4); border: 1px solid var(--glass-borde);
  text-align: left; cursor: pointer; font: inherit;
  transition: transform 0.3s var(--ease-cine), border-color 0.25s, box-shadow 0.3s, background 0.25s;
}
.pack-mesa:hover { border-color: var(--borde-activo); box-shadow: var(--glow-morado); transform: translateY(-2px); background: rgba(168,85,247,0.12); }
.pack-mesa:active { transform: scale(0.98); }
.pack-mesa-imgs { display: flex; flex-shrink: 0; }
.pack-mesa-imgs img {
  width: 40px; height: 40px; border-radius: 50%; object-fit: cover;
  border: 2px solid var(--morado-medio); background: var(--fondo-tarjeta);
}
.pack-mesa-imgs img + img { margin-left: -13px; }
.pack-mesa-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pack-mesa-nombre { font-size: 0.86rem; font-weight: 700; color: var(--texto-principal); }
.pack-mesa-detalle { font-size: 0.72rem; color: var(--texto-secundario); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pack-mesa-precio { font-size: 0.8rem; }
.pack-mesa-precio s { color: var(--texto-desactivado); margin-right: 6px; }
.pack-mesa-precio b { color: var(--color-exito); font-size: 0.92rem; }
.pack-mesa-add { width: 20px; height: 20px; color: var(--morado-hover); flex-shrink: 0; }
.combos-lista { display: flex; flex-direction: column; gap: 9px; }
.combo-chip { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border-radius: var(--radio-lg); background: rgba(46,26,102,0.4); border: 1px solid var(--glass-borde); width: 100%; text-align: left; cursor: pointer; font: inherit; transition: transform 0.3s var(--ease-cine), border-color 0.25s, box-shadow 0.3s, background 0.25s; }
.combo-chip:hover { border-color: var(--borde-activo); box-shadow: var(--glow-morado); transform: translateY(-2px); background: rgba(168,85,247,0.12); }
.combo-chip:active { transform: scale(0.98); }
.combo-add { width: 18px; height: 18px; color: var(--morado-hover); flex-shrink: 0; }
.combo-nombre { font-size: 0.82rem; color: var(--texto-principal); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.combo-precio { display: flex; align-items: center; gap: 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.combo-precio s { font-size: 0.75rem; color: var(--texto-desactivado); }
.combo-precio b { font-size: 0.9rem; color: var(--rosa-acento); }

/* Responsivo: cabecera mas compacta en movil, hoja a todo el ancho */
@media (max-width: 480px) {
  .vista-reserva { padding: 0.75rem; padding-bottom: 90px; }
  .btn-mias span { display: none; }
  .btn-mias { padding: 0; width: 40px; justify-content: center; }
  .leyenda { font-size: 0.7rem; }
  .campo-card { padding: 2rem 1.35rem 1.75rem; }
  .hoja { left: 8px; right: 8px; bottom: 8px; padding: 8px 1rem calc(1rem + env(safe-area-inset-bottom)); }
  .hoja-cab h3 { font-size: 1.15rem; }
  .precio { font-size: 1.25rem; }
}

/* Pantallas grandes: la hoja flota centrada sin ocupar todo el ancho */
@media (min-width: 768px) {
  .hoja { bottom: 18px; }
}

/* Foco visible para navegacion por teclado */
.btn-volver:focus-visible, .btn-mias:focus-visible, .tab-zona:focus-visible,
.btn-primario:focus-visible, .btn-texto:focus-visible, .combo-chip:focus-visible,
.pack-mesa:focus-visible, .hoja-cerrar:focus-visible,
.elemento.libre:focus-visible {
  outline: 2px solid var(--morado-hover); outline-offset: 2px;
}

/* Respeta la preferencia de menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .modal-pin, .modal-exito, .check-ok { animation: none; }
  .elemento.libre { animation: none; }
  .hoja-enter-active, .hoja-leave-active { transition: none; }
  .btn-volver, .btn-mias, .tab-zona, .btn-primario, .combo-chip, .pack-mesa,
  .elemento.libre, .input-pin { transition: none; }
}
</style>
