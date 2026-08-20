<template>
  <div class="contenedor-movimientos entrada-cine">
    <!-- Cabecera compacta -->
    <header class="cabecera-movimientos">
      <button class="btn-volver" type="button" aria-label="Volver" @click="volver">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h1 class="titulo-movimientos">Tus movimientos</h1>
      <RouterLink to="/cliente/pedidos" class="link-pedidos">Mis pedidos</RouterLink>
    </header>

    <!-- Filtros rápidos por tipo -->
    <div v-if="!cargando && !errorCarga && movimientos.length > 0" class="filtros-movimientos" role="group" aria-label="Filtrar movimientos">
      <button
        v-for="f in FILTROS"
        :key="f.valor"
        type="button"
        class="chip-filtro"
        :class="{ activo: filtroActivo === f.valor }"
        @click="filtroActivo = f.valor"
      >
        {{ f.etiqueta }}
      </button>
    </div>

    <!-- Filtro por evento: SOLO los eventos a los que este cliente asistió -->
    <div v-if="misEventos.length && !cargando && !errorCarga" class="filtros-movimientos filtros-eventos" role="group" aria-label="Filtrar por evento">
      <span class="lbl-eventos">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        Tus eventos
      </span>
      <button type="button" class="chip-filtro" :class="{ activo: eventoActivo === null }" @click="setEvento(null)">Todos</button>
      <button
        v-for="ev in misEventos"
        :key="ev.id_evento"
        type="button"
        class="chip-filtro"
        :class="{ activo: eventoActivo === ev.id_evento }"
        @click="setEvento(ev.id_evento)"
      >
        {{ ev.nombre }}
      </button>
    </div>

    <!-- Skeleton mientras carga -->
    <div v-if="cargando" class="lista-movimientos" aria-hidden="true">
      <div v-for="n in 6" :key="n" class="mov-fila mov-esqueleto">
        <span class="mov-icono"></span>
        <span class="mov-info">
          <span class="esq-linea esq-ancha"></span>
          <span class="esq-linea"></span>
        </span>
      </div>
    </div>

    <!-- Error con reintento -->
    <div v-else-if="errorCarga" class="historial-vacio">
      <div class="icono-vacio icono-error">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <p class="titulo-vacio">No pudimos traer tus movimientos</p>
      <p class="subtitulo-vacio">Revisa tu conexión e inténtalo de nuevo.</p>
      <button class="btn-reintentar" type="button" @click="cargarMovimientos">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Reintentar
      </button>
    </div>

    <!-- Vacío total -->
    <div v-else-if="movimientos.length === 0" class="historial-vacio">
      <div class="icono-vacio">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
          <path d="M2 10h20"></path>
        </svg>
      </div>
      <p class="titulo-vacio">Tu historia empieza con una recarga</p>
      <p class="subtitulo-vacio">Recarga saldo y cada recarga, trago y reserva de tus noches aparecerá aquí.</p>
    </div>

    <!-- Vacío por filtro -->
    <div v-else-if="movimientosFiltrados.length === 0" class="historial-vacio">
      <div class="icono-vacio">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      <p class="titulo-vacio">Nada por aquí todavía</p>
      <p class="subtitulo-vacio">No tienes movimientos de este tipo. Prueba con otro filtro.</p>
    </div>

    <!-- Lista completa -->
    <div v-else class="lista-movimientos escalonar">
      <component
        :is="esTocable(mov) ? 'button' : 'div'"
        v-for="mov in movimientosFiltrados"
        :key="`${mov.tipo}-${mov.id}`"
        class="mov-fila"
        :class="[`mov-${mov.tipo}`, { 'mov-tocable': esTocable(mov) }]"
        :type="esTocable(mov) ? 'button' : undefined"
        @click="esTocable(mov) && abrirDetalle(mov)"
      >
        <span class="mov-icono" aria-hidden="true">
          <!-- Recarga: flecha entrando -->
          <svg v-if="mov.tipo === 'recarga'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="3" x2="12" y2="15"></line>
            <polyline points="6 9 12 15 18 9"></polyline>
            <line x1="4" y1="21" x2="20" y2="21"></line>
          </svg>
          <!-- Consumo: copa -->
          <svg v-else-if="mov.tipo === 'consumo'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 22h8"></path>
            <path d="M12 11v11"></path>
            <path d="m19 3-7 8-7-8Z"></path>
          </svg>
          <!-- Devolución: flecha que regresa -->
          <svg v-else-if="mov.tipo === 'reembolso'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
          </svg>
          <!-- Retiro: flecha saliendo -->
          <svg v-else-if="mov.tipo === 'retiro'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="21" x2="12" y2="9"></line>
            <polyline points="6 15 12 9 18 15"></polyline>
            <line x1="4" y1="3" x2="20" y2="3"></line>
          </svg>
          <!-- Reserva: ticket -->
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
            <path d="M13 5v2"></path>
            <path d="M13 11v2"></path>
            <path d="M13 17v2"></path>
          </svg>
        </span>

        <span class="mov-info">
          <span class="mov-titulo">{{ mov.titulo }}</span>
          <span v-if="mov.detalle" class="mov-detalle">{{ mov.detalle }}</span>
          <span class="mov-fecha">{{ formatoFecha(mov.fecha) }}</span>
        </span>

        <span class="mov-lado">
          <span class="mov-monto" :class="{ 'mov-monto-positivo': Number(mov.monto) > 0 }">{{ formatoMonto(mov.monto) }}</span>
          <!-- Historial de saldo: cuánto tenía antes y cuánto quedó después -->
          <span v-if="mov.saldo_antes != null" class="mov-saldos" title="Saldo antes y después de este movimiento">
            Bs {{ formatoMoneda(mov.saldo_antes) }} → <b>Bs {{ formatoMoneda(mov.saldo_despues) }}</b>
          </span>
          <span v-if="mov.estado && mov.estado !== 'completada'" :class="['badge', `badge-${mov.estado}`]">{{ mov.estado }}</span>
          <span v-if="esTocable(mov)" class="mov-ver">Ver detalle
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </span>
      </component>
    </div>

    <!-- MODAL DETALLE DE CONSUMO -->
    <Teleport to="body">
      <div v-if="modalConsumo" class="modal-overlay" @click.self="cerrarDetalleConsumo">
        <div class="modal-detalles modal-consumo">
          <div class="modal-header">
            <h2>Tu consumo</h2>
            <button class="btn-cerrar" @click="cerrarDetalleConsumo" type="button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div v-if="cargandoConsumo" class="consumo-cargando">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
              <p>Trayendo tu pedido…</p>
            </div>

            <template v-else-if="consumoDetalle">
              <div class="consumo-items">
                <div v-for="(item, i) in consumoDetalle.items" :key="i" class="consumo-item">
                  <img v-if="item.imagen" :src="item.imagen" :alt="item.nombre" class="consumo-img" loading="lazy" />
                  <span v-else class="consumo-img consumo-img-ph" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M8 22h8"></path>
                      <path d="M12 11v11"></path>
                      <path d="m19 3-7 8-7-8Z"></path>
                    </svg>
                  </span>
                  <span class="consumo-item-info">
                    <span class="consumo-item-nombre">{{ item.nombre }}</span>
                    <span class="consumo-item-cant">{{ item.cantidad }} × Bs. {{ formatoMoneda(item.precio) }}</span>
                  </span>
                  <span class="consumo-item-subtotal">Bs. {{ formatoMoneda(item.subtotal) }}</span>
                </div>
              </div>

              <div class="consumo-total">
                <span>Total de la ronda</span>
                <strong>Bs. {{ formatoMoneda(consumoDetalle.total) }}</strong>
              </div>

              <div class="consumo-meta">
                <p v-if="consumoDetalle.atendido_por" class="consumo-meta-fila">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {{ consumoDetalle.atendido_por === 'Pedido desde tu app' ? consumoDetalle.atendido_por : `Te atendió ${consumoDetalle.atendido_por}` }}
                </p>
                <p v-if="consumoDetalle.metodo_pago" class="consumo-meta-fila">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                    <path d="M2 10h20"></path>
                  </svg>
                  Pagado con {{ consumoDetalle.metodo_pago }}
                </p>
                <p v-if="consumoDetalle.fecha" class="consumo-meta-fila">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {{ formatoFecha(consumoDetalle.fecha) }}
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- MODAL DETALLE DE DEVOLUCIÓN (desglose claro: original, retenido, devuelto) -->
      <div v-if="modalReembolso && reembolsoDetalle" class="modal-overlay" @click.self="cerrarDetalleReembolso">
        <div class="modal-detalles modal-reembolso">
          <div class="modal-header">
            <h2>Detalle de la devolución</h2>
            <button class="btn-cerrar" @click="cerrarDetalleReembolso" type="button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="reemb-desglose">
              <div class="reemb-fila">
                <span class="reemb-lbl">Pedido original</span>
                <span class="reemb-val">Bs. {{ formatoMoneda(reembolsoDetalle.total_original) }}</span>
              </div>
              <div class="reemb-fila reemb-retenido">
                <span class="reemb-lbl">
                  Comisión retenida por el local
                  <span v-if="reembolsoDetalle.comision_pct" class="reemb-pct">{{ reembolsoDetalle.comision_pct }}%</span>
                </span>
                <span class="reemb-val">− Bs. {{ formatoMoneda(reembolsoDetalle.comision_retenida) }}</span>
              </div>
              <div class="reemb-fila reemb-total">
                <span class="reemb-lbl">Devuelto a tu billetera</span>
                <span class="reemb-val">+ Bs. {{ formatoMoneda(reembolsoDetalle.devuelto) }}</span>
              </div>
            </div>
            <p v-if="!reembolsoDetalle.comision_retenida" class="reemb-nota">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
              Te devolvimos el total: no hubo comisión.
            </p>
            <p v-else class="reemb-nota">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              La comisión aplica por devolver dentro de las 24 h previas al evento.
            </p>
            <p class="reemb-fecha">{{ formatoFecha(reembolsoDetalle.fecha) }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useRouter } from 'vue-router'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import { formatoMoneda, formatoMonto, formatoFecha } from '@/utilidades/formato.js'

const router = useRouter()
const notif = useNotificaciones()
let socket = null

function volver() {
  router.back()
}

// ===== MOVIMIENTOS (lista completa) =====
const movimientos = ref([])
const cargando = ref(true)
const errorCarga = ref(false)

async function cargarMovimientos(silencioso = false) {
  if (!silencioso) { cargando.value = true; errorCarga.value = false }
  try {
    const params = eventoActivo.value ? { evento: eventoActivo.value } : {}
    const res = await servicioBilletera.obtenerMovimientos(params)
    movimientos.value = res?.movimientos || []
  } catch (error) {
    console.error('Error cargando movimientos:', error)
    if (!silencioso) errorCarga.value = true
  } finally {
    cargando.value = false
  }
}

// ===== Filtro por evento asistido =====
// Solo salen los eventos donde ESTE cliente tuvo una reserva/entrada.
const misEventos = ref([])
const eventoActivo = ref(null)
async function cargarMisEventos() {
  try { misEventos.value = await servicioBilletera.misEventos() }
  catch { misEventos.value = [] }
}
function setEvento(id) {
  eventoActivo.value = id
  cargarMovimientos()
}

// Filtros rápidos por tipo
const FILTROS = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'recarga', etiqueta: 'Recargas' },
  { valor: 'consumo', etiqueta: 'Pedidos' },
  { valor: 'reserva', etiqueta: 'Reservas' },
  { valor: 'reembolso', etiqueta: 'Devoluciones' },
  { valor: 'retiro', etiqueta: 'Retiros' }
]
const filtroActivo = ref('todos')

const movimientosFiltrados = computed(() => {
  if (filtroActivo.value === 'todos') return movimientos.value
  return movimientos.value.filter(mov => mov.tipo === filtroActivo.value)
})

function esConsumoTocable(mov) {
  return mov.tipo === 'consumo' && !!mov.id_comanda
}
function esReembolsoTocable(mov) {
  return mov.tipo === 'reembolso'
}
// ¿La fila abre un detalle? (consumo o devolución)
function esTocable(mov) {
  return esConsumoTocable(mov) || esReembolsoTocable(mov)
}
function abrirDetalle(mov) {
  if (esConsumoTocable(mov)) return abrirDetalleConsumo(mov)
  if (esReembolsoTocable(mov)) return abrirDetalleReembolso(mov)
}

// Detalle de una devolución: desglose (original, retenido, devuelto). No requiere
// llamada al backend: los montos ya vienen en el movimiento.
const modalReembolso = ref(false)
const reembolsoDetalle = ref(null)
function abrirDetalleReembolso(mov) {
  reembolsoDetalle.value = mov
  modalReembolso.value = true
}
function cerrarDetalleReembolso() {
  modalReembolso.value = false
  reembolsoDetalle.value = null
}

// Detalle de un consumo (productos con imagen, quién atendió, total)
const modalConsumo = ref(false)
const cargandoConsumo = ref(false)
const consumoDetalle = ref(null)

async function abrirDetalleConsumo(mov) {
  if (!esConsumoTocable(mov)) return
  modalConsumo.value = true
  cargandoConsumo.value = true
  consumoDetalle.value = null
  try {
    consumoDetalle.value = await servicioBilletera.detalleConsumo(mov.id_comanda)
  } catch (error) {
    console.error('Error cargando detalle de consumo:', error)
    modalConsumo.value = false
    notif.error('No pudimos traer el detalle de tu consumo. Inténtalo de nuevo.')
  } finally {
    cargandoConsumo.value = false
  }
}

function cerrarDetalleConsumo() {
  modalConsumo.value = false
  consumoDetalle.value = null
}

// Moneda, monto con signo y fecha vienen de la utilidad compartida
// (@/utilidades/formato.js) para que se vean IGUAL en toda la app.

const idUsuario = JSON.parse(localStorage.getItem('euphoria_usuario') || '{}')?.id

onMounted(() => {
  cargarMovimientos()
  cargarMisEventos()
  // Tiempo real: los movimientos se refrescan solos cuando cambia el saldo
  // (recarga, consumo, reserva, retiro o devolución del propio usuario).
  socket = io({ path: '/socket.io' })
  socket.on('billetera_actualizada', (d) => {
    if (!d || d.id_usuario == null || d.id_usuario === idUsuario) cargarMovimientos(true)
  })
})
onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.contenedor-movimientos {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem 96px;
  min-width: 0;
}

/* Cabecera compacta */
.cabecera-movimientos {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.15rem;
}
.link-pedidos {
  margin-left: auto; font-size: 0.82rem; font-weight: 700; text-decoration: none;
  color: var(--morado-hover); padding: 7px 14px; border-radius: var(--radio-full);
  background: rgba(168,85,247,0.12); border: 1px solid var(--borde-sutil); white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.link-pedidos:hover { background: rgba(168,85,247,0.22); border-color: var(--borde-activo); }

.btn-volver {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s var(--ease-suave);
}

.btn-volver:hover {
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.12);
  transform: translateY(-2px);
}

.btn-volver:active { transform: translateY(0) scale(0.94); }

.btn-volver:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.titulo-movimientos {
  margin: 0;
  color: var(--texto-principal);
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 1.45rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

/* Filtros rápidos */
.filtros-movimientos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.1rem;
}

.chip-filtro {
  padding: 0.4rem 0.95rem;
  border-radius: var(--radio-full);
  border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta);
  color: var(--texto-secundario);
  font-family: inherit;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease;
}

.chip-filtro:hover { border-color: var(--borde-activo); color: var(--texto-principal); }

.chip-filtro.activo {
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.15);
  color: var(--morado-hover);
}

.chip-filtro:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

/* ============ LISTA DE MOVIMIENTOS (mismo diseño que la billetera) ============ */
.lista-movimientos {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-width: 0;
}

.mov-fila {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  min-width: 0;
  background: linear-gradient(155deg, var(--fondo-tarjeta-alt), var(--fondo-tarjeta));
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 0.9rem 1rem;
  text-align: left;
  color: var(--texto-principal);
  font-family: inherit;
  font-size: inherit;
}

button.mov-fila {
  cursor: pointer;
  transition: transform 0.25s var(--ease-cine), border-color 0.25s ease, box-shadow 0.25s var(--ease-cine);
}

button.mov-fila:hover {
  transform: translateY(-2px);
  border-color: var(--borde-activo);
  box-shadow: 0 14px 30px -14px rgba(168, 85, 247, 0.55), inset 0 1px 0 rgba(255,255,255,0.06);
}

button.mov-fila:active { transform: translateY(0) scale(0.995); }

button.mov-fila:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.mov-icono {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-md);
  border: 1px solid var(--glass-borde);
}

.mov-recarga .mov-icono {
  color: var(--color-exito);
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.35);
}

.mov-consumo .mov-icono {
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.14);
  border-color: rgba(168, 85, 247, 0.35);
}

.mov-reserva .mov-icono {
  color: var(--rosa-suave);
  background: rgba(236, 72, 153, 0.14);
  border-color: rgba(236, 72, 153, 0.35);
}

.mov-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.mov-titulo {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--texto-principal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mov-detalle {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mov-fecha {
  font-size: 0.72rem;
  color: var(--texto-desactivado);
  font-variant-numeric: tabular-nums;
}

.mov-lado {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}

.mov-monto {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 0.98rem;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.mov-monto-positivo { color: var(--color-exito); }

/* Historial de saldo: "tenía → quedó" en cada movimiento */
.mov-saldos {
  font-size: 0.7rem;
  color: var(--texto-desactivado);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.mov-saldos b { color: var(--texto-secundario); font-weight: 700; }

/* Fila de eventos asistidos */
.filtros-eventos { align-items: center; }
.lbl-eventos {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--texto-desactivado); margin-right: 2px;
}

.mov-ver {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--morado-hover);
}

@media (max-width: 420px) {
  .mov-fila { padding: 0.8rem 0.8rem; gap: 0.7rem; }
  .mov-icono { width: 38px; height: 38px; }
}

/* Skeleton de movimientos */
.mov-esqueleto { pointer-events: none; }
.mov-esqueleto .mov-icono {
  background: rgba(168, 85, 247, 0.08);
  border-color: var(--borde-sutil);
}
.esq-linea {
  display: block;
  height: 10px;
  width: 45%;
  border-radius: 6px;
  background: rgba(196, 181, 224, 0.14);
  animation: esqPulso 1.4s ease-in-out infinite;
}
.esq-ancha { width: 70%; height: 12px; }
@keyframes esqPulso {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}

/* Estados vacío y error */
.historial-vacio {
  background: var(--fondo-tarjeta);
  border: 1px dashed var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: 3.5rem 2rem;
  text-align: center;
  color: var(--texto-secundario);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.icono-vacio {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  margin-bottom: 0.75rem;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--borde-sutil);
}

.icono-error {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.titulo-vacio {
  margin: 0;
  color: var(--texto-principal);
  font-weight: 700;
  font-size: 1.05rem;
}

.subtitulo-vacio {
  margin: 0;
  font-size: 0.9rem;
  max-width: 34ch;
  line-height: 1.5;
  color: var(--texto-secundario);
  text-wrap: pretty;
}

.btn-reintentar {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.9rem;
  padding: 0.6rem 1.4rem;
  border-radius: var(--radio-full);
  border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta-alt);
  color: var(--morado-hover);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s var(--ease-suave);
}

.btn-reintentar:hover {
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.12);
  transform: translateY(-2px);
}

.btn-reintentar:active { transform: translateY(0) scale(0.98); }

.btn-reintentar:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

/* Badges de estado (recargas pendientes / rechazadas) */
.badge {
  display: inline-block;
  padding: 0.22rem 0.5rem;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.badge-completada, .badge-completado {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-exito);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-pendiente {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-alerta);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.badge-rechazada, .badge-rechazado {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* ============ MODAL DETALLE DE CONSUMO ============ */
/* Overlay en Teleport a body con z-index >= 1000 (navbar del cliente: z-50). */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 3, 20, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
}

.modal-detalles {
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(236,72,153,0.14), transparent 55%),
    linear-gradient(165deg, #241556 0%, #150a30 100%);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl);
  padding: 2rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  max-width: 420px;
  width: 90%;
  max-height: 90dvh;
  overflow-y: auto;
  box-shadow: 0 30px 80px rgba(7, 3, 20, 0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 30px rgba(168, 85, 247, 0.28);
  animation: modalAparece 0.28s var(--ease-suave) both;
}

.modal-consumo { max-width: 440px; }
.modal-reembolso { max-width: 400px; }
.reemb-desglose { display: flex; flex-direction: column; gap: 2px; }
.reemb-fila {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 4px;
}
.reemb-fila + .reemb-fila { border-top: 1px solid var(--borde-sutil); }
.reemb-lbl { font-size: 0.9rem; color: var(--texto-secundario); display: inline-flex; align-items: center; gap: 8px; }
.reemb-val { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--texto-principal); }
.reemb-pct {
  font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: var(--radio-full);
  background: rgba(239, 68, 68, 0.15); color: #f87171;
}
.reemb-retenido .reemb-val { color: #f87171; }
.reemb-total { margin-top: 4px; padding-top: 14px; border-top: 1px solid var(--borde-activo) !important; }
.reemb-total .reemb-lbl { color: var(--texto-principal); font-weight: 700; }
.reemb-total .reemb-val { color: var(--color-exito, #34d399); font-size: 1.15rem; }
.reemb-nota {
  display: flex; align-items: flex-start; gap: 7px;
  margin-top: 14px; font-size: 0.8rem; line-height: 1.4; color: var(--texto-secundario);
}
.reemb-nota svg { flex-shrink: 0; margin-top: 2px; color: var(--morado-hover); }
.reemb-fecha { margin-top: 12px; font-size: 0.76rem; color: var(--texto-desactivado); text-align: center; }

@keyframes modalAparece {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
  color: var(--texto-principal);
  font-family: var(--fuente-titulo);
  font-size: 1.3rem;
}

.btn-cerrar {
  background: none;
  border: none;
  color: var(--texto-secundario);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--trans-normal);
}

.btn-cerrar:hover {
  color: var(--texto-principal);
  background: rgba(255, 255, 255, 0.08);
}

.btn-cerrar:active { transform: scale(0.92); }

.btn-cerrar:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.modal-body { margin-bottom: 0.5rem; }

.consumo-cargando {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  padding: 2rem 0;
  color: var(--texto-secundario);
}

.consumo-cargando p { margin: 0; font-size: 0.9rem; }
.consumo-cargando svg { color: var(--morado-hover); }

.spin { animation: spin 2s linear infinite; }

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.consumo-items {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}

.consumo-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--radio-md);
  padding: 0.6rem 0.8rem;
  min-width: 0;
}

.consumo-img {
  width: 52px;
  height: 52px;
  border-radius: var(--radio-md);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
}

.consumo-img-ph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.12);
}

.consumo-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.consumo-item-nombre {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--texto-principal);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.consumo-item-cant {
  font-size: 0.78rem;
  color: var(--texto-secundario);
  font-variant-numeric: tabular-nums;
}

.consumo-item-subtotal {
  flex-shrink: 0;
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 0.92rem;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.consumo-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: var(--radio-md);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.35);
  margin-bottom: 1rem;
}

.consumo-total span {
  color: var(--texto-secundario);
  font-size: 0.85rem;
  font-weight: 600;
}

.consumo-total strong {
  font-family: var(--fuente-titulo);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.consumo-meta {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.consumo-meta-fila {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--texto-secundario);
  font-size: 0.85rem;
}

.consumo-meta-fila svg {
  color: var(--morado-hover);
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .modal-detalles {
    padding: 1.25rem;
    padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
  }
}

/* ============ MOVIMIENTO REDUCIDO ============ */
@media (prefers-reduced-motion: reduce) {
  .modal-detalles { animation: none; }
  .esq-linea { animation: none; opacity: 0.7; }
  button.mov-fila:hover,
  .btn-volver:hover,
  .btn-reintentar:hover { transform: none; }
}
</style>
