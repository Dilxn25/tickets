<template>
  <div class="vista-recep">
    <!-- Encabezado -->
    <header class="recep-head">
      <div class="recep-head-txt">
        <h1 class="titulo">Recepción</h1>
      </div>
      <label v-if="eventos.length" class="selector-wrap">
        <span class="selector-lbl">Evento activo</span>
        <div class="selector-caja">
          <BaseSelect v-model="idEventoSel" :options="opcionesEvento" placeholder="Selecciona un evento" @update:model-value="cambiarEvento" />
        </div>
      </label>
    </header>

    <!-- Alertas de saturación -->
    <div v-if="zonasEnAlerta.length" class="alertas">
      <div v-for="z in zonasEnAlerta" :key="z.id_zona" class="alerta" :class="z.estado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span v-if="z.estado === 'lleno'"><b>{{ z.nombre_zona }}</b> llegó al aforo máximo ({{ z.aforo_actual }}/{{ z.capacidad }})</span>
        <span v-else><b>{{ z.nombre_zona }}</b> casi llena: {{ z.porcentaje }}% ({{ z.aforo_actual }}/{{ z.capacidad }})</span>
      </div>
    </div>

    <div class="recep-grid">
      <!-- Columna izquierda: flujos de ingreso en pestañas -->
      <section class="panel col-flujos">
        <nav class="rec-tabs" role="tablist">
          <button class="rec-tab" :class="{ activo: pestana === 'reserva' }" @click="pestana = 'reserva'" role="tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path></svg>
            <span>Ingreso por reserva</span>
          </button>
          <button class="rec-tab" :class="{ activo: pestana === 'noche' }" @click="pestana = 'noche'" role="tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            <span>Ingreso de la noche</span>
          </button>
          <button class="rec-tab" :class="{ activo: pestana === 'grupos' }" @click="pestana = 'grupos'" role="tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Grupos grandes</span>
            <span v-if="solicitudes.length" class="rec-tab-badge">{{ solicitudes.length }}</span>
          </button>
        </nav>

        <!-- ============ PESTAÑA 1: INGRESO POR RESERVA ============ -->
        <div v-show="pestana === 'reserva'" class="flujo">
          <CapturaCamara modo="qr" texto-guia="Coloca el QR de la entrada dentro del marco" @codigo="alEscanearEntrada" />

          <div class="separador"><span>o ingresa el código</span></div>
          <form class="form-codigo" @submit.prevent="validarCodigo">
            <!-- El código siempre se ve y se busca en MAYÚSCULAS aunque el
                 recepcionista escriba minúsculas -->
            <input v-model="codigoManual" @input="codigoManual = codigoManual.toUpperCase()" type="text" class="input-codigo" placeholder="Ej: 6ADB2FF8F57C" maxlength="20" autocapitalize="characters" style="text-transform: uppercase;" />
            <button class="btn-primario" type="submit" :disabled="procesando || !codigoManual.trim()">Validar</button>
          </form>

          <!-- Ingreso por tandas -->
          <transition name="fade">
            <div v-if="pendiente" class="tanda">
              <div class="tanda-cab">
                <b>{{ pendiente.cliente }}</b>
                <span class="tanda-zona">{{ pendiente.mesa ? 'Mesa ' + pendiente.mesa + ' · ' : '' }}{{ pendiente.zona }}</span>
              </div>
              <div class="tanda-cupos">
                <span class="tanda-dato"><i>Cupos del QR</i><b>{{ pendiente.cantidad_personas }}</b></span>
                <span class="tanda-dato"><i>Ya adentro</i><b>{{ pendiente.cantidad_ingresada }}</b></span>
                <span class="tanda-dato tanda-rest"><i>Quedan</i><b>{{ pendiente.restantes }}</b></span>
              </div>
              <div class="tanda-fila">
                <span class="tanda-lbl">¿Cuántas personas entran ahora?</span>
                <div class="stepper">
                  <button type="button" @click="pendiente.cantidad = Math.max(1, pendiente.cantidad - 1)" aria-label="Menos">−</button>
                  <span>{{ pendiente.cantidad }}</span>
                  <button type="button" @click="pendiente.cantidad = Math.min(pendiente.restantes, pendiente.cantidad + 1)" aria-label="Más">+</button>
                </div>
              </div>
              <div class="tanda-acciones">
                <button class="btn-sec" type="button" @click="pendiente = null">Cancelar</button>
                <button class="btn-primario" type="button" :disabled="procesando" @click="confirmarIngreso">
                  Registrar ingreso de {{ pendiente.cantidad }}
                </button>
              </div>
            </div>
          </transition>

          <ResultadoRecep :resultado="resultado" />
          <PanelMesero
            v-if="asignacionPendiente"
            :asignacion="asignacionPendiente" :meseros="meserosLista"
            v-model="meseroElegido" :cargando="asignandoMesero"
            @confirmar="confirmarMesero" @cerrar="asignacionPendiente = null"
          />
        </div>

        <!-- ============ PESTAÑA 2: INGRESO DE LA NOCHE (WALK-IN) ============ -->
        <div v-show="pestana === 'noche'" class="flujo">
          <div class="walk-tipo">
            <button class="wt-op" :class="{ activo: walkTipo === 'general' }" @click="walkTipo = 'general'">
              <b>Entrada general</b><span>Cobra por persona</span>
            </button>
            <button class="wt-op" :class="{ activo: walkTipo === 'mesa' }" @click="walkTipo = 'mesa'">
              <b>Reservar mesa</b><span>Cobra el precio de la mesa</span>
            </button>
          </div>

          <!-- General: elegir plano/zona -->
          <div v-if="walkTipo === 'general'" class="walk-campo">
            <label class="walk-lbl">Plano / zona</label>
            <BaseSelect v-model="walkZonaId" :options="opcionesZona" placeholder="Elige el plano" />
            <div class="walk-cant">
              <span class="walk-lbl">Personas</span>
              <div class="stepper">
                <button type="button" @click="walkCantidad = Math.max(1, walkCantidad - 1)" aria-label="Menos">−</button>
                <span>{{ walkCantidad }}</span>
                <button type="button" @click="walkCantidad++" aria-label="Más">+</button>
              </div>
            </div>
          </div>

          <!-- Mesa: selector de mesa 3 modos -->
          <div v-else class="walk-campo">
            <label class="walk-lbl">Mesa</label>
            <SelectorMesa :zonas="planos" v-model="walkMesaId" @cambio="walkMesaObj = $event" />
          </div>

          <!-- Cliente opcional -->
          <div class="walk-campo">
            <label class="walk-lbl">Cliente <span class="walk-opt">(opcional — para vincular sus consumos)</span></label>
            <div v-if="!walkCliente" class="gest-buscar">
              <input v-model="busquedaWalk" @input="buscarClientesWalk" class="input-codigo gest-input" placeholder="Nombre, correo o CI…" autocomplete="off" />
              <ul v-if="walkEncontrados.length" class="gest-resultados">
                <li v-for="c in walkEncontrados" :key="c.id_usuario" @click="elegirClienteWalk(c)">
                  <b>{{ c.nombre }}</b><span>{{ c.correo }}{{ c.ci_carnet ? ' · CI ' + c.ci_carnet : '' }}</span>
                </li>
              </ul>
            </div>
            <div v-else class="gest-cliente-sel">
              <div class="gcs-datos"><b>{{ walkCliente.nombre }}</b><span>{{ walkCliente.correo }}</span></div>
              <button class="btn-cambiar" type="button" @click="walkCliente = null">Quitar</button>
            </div>
          </div>

          <!-- Método de pago -->
          <div class="walk-campo">
            <label class="walk-lbl">Cobro</label>
            <div class="walk-metodos">
              <button class="wm" :class="{ activo: walkMetodo === 'efectivo' }" @click="walkMetodo = 'efectivo'">Efectivo</button>
              <button class="wm" :class="{ activo: walkMetodo === 'qr' }" @click="walkMetodo = 'qr'">QR / transferencia</button>
              <button class="wm cortesia" :class="{ activo: walkMetodo === 'cortesia' }" @click="walkMetodo = 'cortesia'">Cortesía</button>
            </div>
            <p v-if="walkMetodo === 'cortesia'" class="walk-nota">Cortesía = ingreso de invitación, sin cobro (Bs 0).</p>
          </div>

          <!-- Detalle EFECTIVO: monto recibido + cambio (igual que el POS del mesero) -->
          <div v-if="walkMetodo === 'efectivo' && montoWalk > 0" class="efe-bloque">
            <div class="efe-display" :class="{ ok: walkSuficiente }">
              <span class="efe-label">Monto recibido</span>
              <div class="efe-monto">
                <span class="efe-moneda">Bs.</span>
                <input type="text" inputmode="decimal" v-model="walkRecibidoTexto" @input="walkEscribir" placeholder="0.00" class="efe-input" />
              </div>
            </div>
            <div class="efe-chips">
              <button v-for="b in billetes" :key="b" type="button" class="efe-chip" @click="walkSumarBillete(b)">+{{ b }}</button>
              <button type="button" class="efe-chip exacto" @click="walkExacto">Exacto</button>
              <button type="button" class="efe-chip limpiar" @click="walkRecibidoTexto = ''" :disabled="!walkRecibidoTexto">Limpiar</button>
            </div>
            <div class="efe-cambio" :class="{ falta: walkFalta, listo: walkSuficiente }">
              <span>{{ walkFalta ? 'Falta' : 'Cambio a devolver' }}</span>
              <b>Bs. {{ Math.abs(walkCambio).toFixed(2) }}</b>
            </div>
          </div>

          <!-- Detalle QR: comprobante opcional (foto) -->
          <div v-else-if="walkMetodo === 'qr' && montoWalk > 0" class="efe-bloque">
            <p class="walk-nota">El cliente paga por QR/transferencia. Puedes adjuntar el comprobante como respaldo.</p>
            <CapturaCamara modo="foto" texto-guia="Coloca el comprobante dentro del marco" @archivo="walkComprobante = $event" />
            <p v-if="walkComprobante" class="walk-ok-comp">Comprobante adjuntado.</p>
          </div>

          <!-- Total + registrar -->
          <div class="walk-total">
            <div class="walk-monto">
              <span>Total a cobrar</span>
              <b :class="{ cero: montoWalk === 0 }">Bs {{ montoWalk.toFixed(2) }}</b>
            </div>
            <button class="btn-primario btn-registrar" :disabled="!puedeRegistrarWalk || registrandoWalk" @click="registrarWalkIn">
              {{ registrandoWalk ? 'Registrando…' : (walkMetodo === 'efectivo' && montoWalk > 0 ? 'Cobrar Bs ' + montoWalk.toFixed(2) : 'Registrar ingreso') }}
            </button>
          </div>

          <ResultadoRecep :resultado="resultadoWalk" />
          <PanelMesero
            v-if="asignacionWalk"
            :asignacion="asignacionWalk" :meseros="meserosLista"
            v-model="meseroElegido" :cargando="asignandoMesero"
            @confirmar="confirmarMeseroWalk" @cerrar="asignacionWalk = null"
          />
        </div>

        <!-- ============ PESTAÑA 3: GRUPOS GRANDES ============ -->
        <div v-show="pestana === 'grupos'" class="flujo">
          <!-- Bandeja de solicitudes -->
          <div class="solicitudes">
            <!-- La bandeja se actualiza sola por socket (solicitud_grupo). -->
            <div class="sol-cab">
              <b>Solicitudes de clientes</b>
            </div>
            <div v-if="!solicitudes.length" class="sol-vacia">No hay solicitudes pendientes.</div>
            <div v-else class="sol-lista">
              <button v-for="s in solicitudes" :key="s.id_solicitud" class="sol-item" :class="{ activo: solSel && solSel.id_solicitud === s.id_solicitud }" @click="abrirSolicitud(s)">
                <div class="sol-item-top">
                  <b>{{ s.cliente }}</b>
                  <span class="sol-pers">{{ s.cantidad_personas }} pers</span>
                </div>
                <span class="sol-motivo">{{ s.motivo || 'Sin detalle' }}</span>
                <div class="sol-tent-chips">
                  <span v-for="m in s.mesas_tentativas" :key="m.id_mesa" class="sol-mchip" :class="m.libre ? 'lib' : 'ocu'">{{ m.nombre }}</span>
                  <span v-if="s.estado === 'propuesta'" class="sol-estado-chip">Propuesta enviada</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Gestión de la solicitud seleccionada -->
          <div v-if="solSel" class="sol-gestion">
            <div class="sg-cab">
              <div>
                <b>{{ solSel.cliente }}</b>
                <span class="sg-sub">{{ solSel.cantidad_personas }} personas · {{ solSel.motivo || 'sin detalle' }}</span>
                <span v-if="solSel.telefono" class="sg-sub">Tel: {{ solSel.telefono }}</span>
              </div>
              <button class="btn-cambiar" @click="solSel = null">Cerrar</button>
            </div>

            <div class="sg-tent">
              <span class="sg-lbl">Lugares que pidió el cliente:</span>
              <div class="sg-mesas">
                <span v-for="m in solSel.mesas_tentativas" :key="m.id_mesa" class="sol-mchip" :class="m.libre ? 'lib' : 'ocu'">
                  {{ m.nombre }} · {{ m.libre ? 'libre' : 'ocupada' }}
                </span>
              </div>
            </div>

            <!-- Todas libres → confirmar tal cual -->
            <div v-if="solSel.todas_libres" class="sg-ok">
              <p>Todos los lugares están libres: puedes confirmar la reserva tal como la pidió.</p>
              <button class="btn-primario" :disabled="gestionandoSol" @click="confirmarSolicitud">
                {{ gestionandoSol ? 'Confirmando…' : 'Confirmar tal cual' }}
              </button>
            </div>

            <!-- Alguna ocupada → proponer alternativa -->
            <div v-else class="sg-prop">
              <p class="sg-aviso">Algún lugar ya no está libre. No puedes confirmar tal cual: arma una propuesta y envíasela al cliente para que la confirme.</p>
              <span class="sg-lbl">Propón mesas disponibles (toca para elegir):</span>
              <div class="sg-libres">
                <button
                  v-for="m in mesasLibresEvento" :key="m.id_mesa" type="button"
                  class="sol-mchip elegible" :class="{ sel: propuestaSel.includes(m.id_mesa) }"
                  @click="togglePropuesta(m)"
                >{{ etiquetaMesaProp(m) }}</button>
                <p v-if="!mesasLibresEvento.length" class="gest-vacio">No quedan mesas libres en el evento.</p>
              </div>
              <button class="btn-primario" :disabled="!propuestaSel.length || gestionandoSol" @click="proponerSolicitud">
                {{ gestionandoSol ? 'Enviando…' : `Enviar propuesta (${propuestaSel.length})` }}
              </button>
            </div>
          </div>

          <ResultadoRecep :resultado="resultadoGestion" />

          <!-- Reserva directa (sin solicitud previa) -->
          <details class="reserva-directa">
            <summary>O arma una reserva directa en el mostrador</summary>
            <div class="gest-grid">
              <div class="gest-col">
                <label class="gest-lbl">1 · Cliente</label>
                <div v-if="!clienteSel" class="gest-buscar">
                  <input v-model="busquedaCliente" @input="buscarClientes" class="input-codigo gest-input" placeholder="Nombre, correo o CI…" autocomplete="off" />
                  <ul v-if="clientesEncontrados.length" class="gest-resultados">
                    <li v-for="c in clientesEncontrados" :key="c.id_usuario" @click="seleccionarCliente(c)">
                      <b>{{ c.nombre }}</b><span>{{ c.correo }}{{ c.ci_carnet ? ' · CI ' + c.ci_carnet : '' }}</span>
                    </li>
                  </ul>
                  <p v-else-if="busquedaCliente.trim().length >= 2 && !buscandoCliente" class="gest-vacio">Sin coincidencias.</p>
                </div>
                <div v-else class="gest-cliente-sel">
                  <div class="gcs-datos"><b>{{ clienteSel.nombre }}</b><span>{{ clienteSel.correo }}</span></div>
                  <button class="btn-cambiar" type="button" @click="cambiarCliente">Cambiar</button>
                </div>
              </div>
              <div class="gest-col">
                <label class="gest-lbl">2 · Mesa a asignar</label>
                <SelectorMesa :zonas="planos" v-model="mesaSelGestion" />
                <label class="gest-check">
                  <input type="checkbox" v-model="cortesia" />
                  <span>Cortesía (sin costo)</span>
                </label>
              </div>
              <div class="gest-col gest-accion">
                <button class="btn-primario btn-asignar" type="button" :disabled="!clienteSel || !mesaSelGestion || asignando" @click="asignarReserva">
                  {{ asignando ? 'Asignando…' : 'Asignar mesa' }}
                </button>
                <p class="gest-tip">Puedes asignar varias mesas al mismo cliente, una por una.</p>
              </div>
            </div>
          </details>
        </div>
      </section>

      <!-- Columna derecha: aforo en vivo -->
      <section class="panel col-aforo">
        <div class="aforo-cab">
          <div class="aforo-cab-txt">
            <h2 class="panel-titulo">Aforo en vivo</h2>
            <span class="live"><span class="live-dot"></span>En vivo</span>
          </div>
          <div class="total-badge" :class="estadoTotal">
            <span class="total-num">{{ aforoTotal }}</span>
            <span class="total-cap">/ {{ capacidadTotal }}</span>
          </div>
        </div>
        <div class="barra barra-total">
          <div class="barra-relleno" :class="estadoTotal" :style="{ width: Math.min(100, capacidadTotal ? Math.round((aforoTotal / capacidadTotal) * 100) : 0) + '%' }"></div>
        </div>

        <div v-if="cargando" class="cargando"><div class="spinner"></div></div>
        <div v-else-if="!zonas.length" class="vacio">
          <b>Sin zonas configuradas</b>
          <span>Este evento todavía no tiene zonas para controlar el aforo.</span>
        </div>
        <div v-else class="lista-zonas">
          <div v-for="z in zonas" :key="z.id_zona" class="zona" :class="z.estado">
            <div class="zona-cab">
              <span class="zona-nombre">{{ z.nombre_zona }}</span>
              <span class="zona-num" :class="z.estado">{{ z.aforo_actual }}<i>/{{ z.capacidad }}</i></span>
            </div>
            <div class="zona-medida">
              <div class="barra">
                <div class="barra-relleno" :class="z.estado" :style="{ width: Math.min(100, z.porcentaje) + '%' }"></div>
              </div>
              <span class="zona-pct" :class="z.estado">{{ z.porcentaje }}%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { servicioAforo } from '@/servicios-api/servicio-aforo.js'
import { servicioReservas } from '@/servicios-api/servicio-reservas.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'
import SelectorMesa from '@/componentes/comunes/SelectorMesa.vue'
import ResultadoRecep from './ResultadoRecep.vue'
import PanelMesero from './PanelMesero.vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()

const eventos = ref([])
const idEventoSel = ref(null)
// Etiqueta bonita del estado del evento (para que el recepcionista sepa cuál
// está en curso, cuál es próximo y cuál terminó — antes todos parecían activos).
const ESTADO_EVENTO = {
  planificacion: 'Planificación', promocion: 'Próximo',
  en_transcurso: 'En curso', lleno: 'Lleno', terminado: 'Terminado',
}
const opcionesEvento = computed(() => eventos.value.map(e => ({
  value: e.id_evento,
  label: `${e.nombre_evento} · ${ESTADO_EVENTO[e.estado] || e.estado}`,
})))
const zonas = ref([])
const aforoTotal = ref(0)
const capacidadTotal = ref(0)
const estadoTotal = ref('ok')
const cargando = ref(true)

const pestana = ref('reserva')

// ---- Ingreso por reserva ----
const codigoManual = ref('')
const procesando = ref(false)
const resultado = ref(null)
const pendiente = ref(null)

// ---- Asignación de mesero (compartida reserva/walk-in) ----
const asignacionPendiente = ref(null)
const asignacionWalk = ref(null)
const meserosLista = ref([])
const meseroElegido = ref(null)
const asignandoMesero = ref(false)

// ---- Walk-in ----
const planos = ref([])
const walkTipo = ref('general')
const walkZonaId = ref(null)
const walkMesaId = ref(null)
const walkMesaObj = ref(null)
const walkCantidad = ref(1)
const walkMetodo = ref('efectivo')
const walkCliente = ref(null)
const busquedaWalk = ref('')
const walkEncontrados = ref([])
const registrandoWalk = ref(false)
const resultadoWalk = ref(null)
let debounceWalk = null

// Cobro en efectivo (mismo patrón que el POS del mesero)
const billetes = [10, 20, 50, 100, 200]
const walkRecibidoTexto = ref('')
const walkComprobante = ref(null)
const walkRecibidoNum = computed(() => {
  const n = parseFloat(walkRecibidoTexto.value)
  return Number.isFinite(n) && n > 0 ? n : 0
})
const walkCambio = computed(() => walkRecibidoNum.value - montoWalk.value)
const walkFalta = computed(() => walkCambio.value < 0)
const walkSuficiente = computed(() => walkRecibidoNum.value > 0 && walkCambio.value >= 0)
function walkEscribir() {
  let v = (walkRecibidoTexto.value || '').replace(/[^0-9.]/g, '')
  const m = v.match(/^\d*\.?\d{0,2}/)
  walkRecibidoTexto.value = m ? m[0] : v
}
function walkSumarBillete(b) {
  walkRecibidoTexto.value = String(Math.round((walkRecibidoNum.value + b) * 100) / 100)
}
function walkExacto() { walkRecibidoTexto.value = montoWalk.value.toFixed(2) }

// Puede registrar: si es efectivo con monto, exige recibido suficiente
const puedeRegistrarWalk = computed(() => {
  if (!puedeWalkIn.value) return false
  if (walkMetodo.value === 'efectivo' && montoWalk.value > 0) return walkSuficiente.value
  return true
})

const opcionesZona = computed(() => planos.value.map(z => ({
  value: z.id_zona,
  label: `${z.nombre_zona} · Bs ${Number(z.precio_entrada_base).toFixed(0)} p/pers · ${z.disponibles} libres`,
})))

const montoWalk = computed(() => {
  if (walkMetodo.value === 'cortesia') return 0
  if (walkTipo.value === 'mesa') {
    return walkMesaObj.value?.precio != null ? Number(walkMesaObj.value.precio) : 0
  }
  const z = planos.value.find(z => z.id_zona === walkZonaId.value)
  return z ? Number(z.precio_entrada_base) * walkCantidad.value : 0
})

const puedeWalkIn = computed(() =>
  walkTipo.value === 'mesa' ? !!walkMesaId.value : !!walkZonaId.value
)

let socket = null

// ---- Reserva gestionada (grupos grandes) ----
const busquedaCliente = ref('')
const clientesEncontrados = ref([])
const buscandoCliente = ref(false)
const clienteSel = ref(null)
const mesaSelGestion = ref(null)
const cortesia = ref(false)
const asignando = ref(false)
const resultadoGestion = ref(null)
let debounceBuscar = null

// ---- Solicitudes de grupo grande (Fase I / R2) ----
const solicitudes = ref([])
const cargandoSol = ref(false)
const solSel = ref(null)
const gestionandoSol = ref(false)
const propuestaSel = ref([])

// Mesas libres del evento (para armar la contrapropuesta)
const mesasLibresEvento = computed(() => {
  const out = []
  for (const z of planos.value) for (const m of (z.mesas || [])) {
    if ((m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') && m.es_seleccionable && m.estado_ocupacion === 'libre') out.push(m)
  }
  return out
})
function etiquetaMesaProp(m) { return `${m.tipo_elemento === 'silla' ? 'Silla' : 'Mesa'} ${m.numero_nombre}` }
function togglePropuesta(m) {
  const i = propuestaSel.value.indexOf(m.id_mesa)
  if (i >= 0) propuestaSel.value.splice(i, 1)
  else propuestaSel.value.push(m.id_mesa)
}

const zonasEnAlerta = computed(() => zonas.value.filter(z => z.estado === 'alerta' || z.estado === 'lleno'))

function aplicarAforo(data) {
  zonas.value = data.zonas || []
  aforoTotal.value = data.aforo_total || 0
  capacidadTotal.value = data.capacidad_total || 0
  estadoTotal.value = data.estado_total || 'ok'
}

async function cargarAforo() {
  if (!idEventoSel.value) return
  cargando.value = true
  try { aplicarAforo(await servicioAforo.obtenerAforoEvento(idEventoSel.value)) }
  catch (err) { console.error('Error cargando aforo:', err) }
  finally { cargando.value = false }
}

async function cargarPlanos() {
  if (!idEventoSel.value) { planos.value = []; return }
  try {
    const r = await servicioAforo.obtenerPlanos(idEventoSel.value)
    planos.value = (r.zonas || []).map(z => ({ ...z, mesas: z.mesas || [] }))
  } catch { planos.value = [] }
}

async function cambiarEvento() {
  await Promise.all([cargarAforo(), cargarPlanos(), cargarSolicitudes()])
  walkZonaId.value = null; walkMesaId.value = null; walkMesaObj.value = null
  mesaSelGestion.value = null
}

function mostrarResultado(ref_, tipo, titulo, detalle) {
  ref_.value = { tipo, titulo, detalle }
  setTimeout(() => { if (ref_.value && ref_.value.titulo === titulo) ref_.value = null }, 7000)
}

// ---------- Ingreso por reserva ----------
async function consultarEntrada(payload) {
  procesando.value = true
  resultado.value = null
  try {
    const r = await servicioAforo.validar({ ...payload, consultar: true })
    if (r.completo) {
      mostrarResultado(resultado, 'error', 'Ya ingresó completa', `${r.cliente} · ${r.cantidad_ingresada}/${r.cantidad_personas} ya ingresaron`)
      pendiente.value = null
      return
    }
    pendiente.value = {
      payload, cliente: r.cliente, mesa: r.mesa, zona: r.zona, evento: r.evento,
      cantidad_personas: r.cantidad_personas, cantidad_ingresada: r.cantidad_ingresada,
      restantes: r.restantes, cantidad: r.restantes,
    }
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado(resultado, 'error', 'No válida', data?.error || 'No se pudo leer la entrada')
    pendiente.value = null
  } finally { procesando.value = false }
}

async function confirmarIngreso() {
  if (!pendiente.value) return
  const { payload, cantidad } = pendiente.value
  procesando.value = true
  try {
    const r = await servicioAforo.validar({ ...payload, cantidad })
    const a = r.aforo
    mostrarResultado(resultado, 'ok', r.completo ? 'Ingreso completo' : 'Ingreso parcial',
      `${r.cliente} · entraron ${r.personas} (${r.cantidad_ingresada}/${r.cantidad_personas})${r.mesa ? ' · Mesa ' + r.mesa : ''} · ${a.nombre_zona} ${a.aforo_actual}/${a.capacidad}`)
    const i = zonas.value.findIndex(z => z.id_zona === a.id_zona)
    if (i >= 0) zonas.value[i] = { ...zonas.value[i], ...a }
    recomputarTotales()
    pendiente.value = null
    if (r.mesa_ya_asignada) {
      mostrarResultado(resultado, 'ok', 'Mesa ya asignada', `${r.mesa ? 'Mesa ' + r.mesa + ' · ' : ''}la atiende ${r.mesa_ya_asignada.nombre}`)
    } else if (r.id_mesa && r.mesero_sugerido) {
      await cargarMeseros()
      meseroElegido.value = r.mesero_sugerido.id_usuario
      asignacionPendiente.value = { id_mesa: r.id_mesa, id_entrada: r.id_entrada, cliente: r.cliente, mesa: r.mesa }
    }
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado(resultado, 'error', data?.aforo_lleno ? 'Aforo lleno' : 'No se pudo validar', data?.error || 'No se pudo registrar el ingreso')
  } finally { procesando.value = false }
}

function validarCodigo() {
  const c = codigoManual.value.trim()
  if (!c) return
  consultarEntrada({ codigo: c })
  codigoManual.value = ''
}

function alEscanearEntrada(texto) {
  consultarEntrada({ token: texto })
}

// ---------- Asignación de mesero ----------
async function cargarMeseros() {
  try { meserosLista.value = await servicioAforo.listarMeseros() } catch { meserosLista.value = [] }
}

async function confirmarMesero() {
  if (!asignacionPendiente.value || !meseroElegido.value) return
  asignandoMesero.value = true
  try {
    await servicioAforo.asignarMesero({
      id_mesa: asignacionPendiente.value.id_mesa,
      id_entrada: asignacionPendiente.value.id_entrada,
      id_mesero: meseroElegido.value,
    })
    const m = meserosLista.value.find(x => x.id_usuario === meseroElegido.value)
    mostrarResultado(resultado, 'ok', 'Mesero asignado', `${asignacionPendiente.value.mesa ? 'Mesa ' + asignacionPendiente.value.mesa + ' · ' : ''}${m ? m.nombre : 'mesero'} atenderá a ${asignacionPendiente.value.cliente || 'el cliente'}`)
    asignacionPendiente.value = null
  } catch (e) {
    mostrarResultado(resultado, 'error', 'No se pudo asignar', e.error || 'Intenta de nuevo')
  } finally { asignandoMesero.value = false }
}

async function confirmarMeseroWalk() {
  if (!asignacionWalk.value || !meseroElegido.value) return
  asignandoMesero.value = true
  try {
    await servicioAforo.asignarMesero({
      id_mesa: asignacionWalk.value.id_mesa,
      id_entrada: asignacionWalk.value.id_entrada,
      id_mesero: meseroElegido.value,
    })
    const m = meserosLista.value.find(x => x.id_usuario === meseroElegido.value)
    mostrarResultado(resultadoWalk, 'ok', 'Mesero asignado', `${asignacionWalk.value.mesa ? 'Mesa ' + asignacionWalk.value.mesa + ' · ' : ''}${m ? m.nombre : 'mesero'} atenderá la mesa`)
    asignacionWalk.value = null
  } catch (e) {
    mostrarResultado(resultadoWalk, 'error', 'No se pudo asignar', e.error || 'Intenta de nuevo')
  } finally { asignandoMesero.value = false }
}

// ---------- Walk-in ----------
function buscarClientesWalk() {
  clearTimeout(debounceWalk)
  const q = busquedaWalk.value.trim()
  if (q.length < 2) { walkEncontrados.value = []; return }
  debounceWalk = setTimeout(async () => {
    try { walkEncontrados.value = (await servicioReservas.buscarCliente(q)).clientes || [] }
    catch { walkEncontrados.value = [] }
  }, 350)
}
function elegirClienteWalk(c) { walkCliente.value = c; walkEncontrados.value = []; busquedaWalk.value = '' }

async function registrarWalkIn() {
  if (!puedeWalkIn.value) return
  registrandoWalk.value = true
  resultadoWalk.value = null
  try {
    const datos = {
      cantidad: walkCantidad.value,
      metodo_pago: walkMetodo.value,
      id_cliente: walkCliente.value?.id_usuario || null,
    }
    if (walkTipo.value === 'mesa') datos.id_mesa = walkMesaId.value
    else datos.id_zona = walkZonaId.value
    const r = await servicioAforo.walkIn(datos)
    mostrarResultado(resultadoWalk, 'ok', 'Ingreso registrado',
      `${r.personas} pers · ${r.mesa ? 'Mesa ' + r.mesa + ' · ' : ''}${r.zona} · ${r.metodo_pago === 'cortesia' ? 'Cortesía' : 'Bs ' + Number(r.monto).toFixed(2)} · aforo ${r.aforo.aforo_actual}/${r.aforo.capacidad}`)
    // Reset campos
    walkMesaId.value = null; walkMesaObj.value = null; walkCantidad.value = 1; walkCliente.value = null
    walkRecibidoTexto.value = ''; walkComprobante.value = null
    await Promise.all([cargarAforo(), cargarPlanos()])
    // Si entró a una mesa, ofrecer asignar mesero
    if (r.id_mesa && r.mesero_sugerido) {
      await cargarMeseros()
      meseroElegido.value = r.mesero_sugerido.id_usuario
      asignacionWalk.value = { id_mesa: r.id_mesa, id_entrada: r.id_entrada, cliente: walkCliente.value?.nombre, mesa: r.mesa }
    }
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado(resultadoWalk, 'error', 'No se pudo registrar', data?.error || 'Intenta de nuevo')
  } finally { registrandoWalk.value = false }
}

// ---------- Reserva gestionada / grupos ----------
function buscarClientes() {
  clearTimeout(debounceBuscar)
  const q = busquedaCliente.value.trim()
  if (q.length < 2) { clientesEncontrados.value = []; return }
  buscandoCliente.value = true
  debounceBuscar = setTimeout(async () => {
    try { clientesEncontrados.value = (await servicioReservas.buscarCliente(q)).clientes || [] }
    catch { clientesEncontrados.value = [] }
    finally { buscandoCliente.value = false }
  }, 350)
}
function seleccionarCliente(c) { clienteSel.value = c; clientesEncontrados.value = []; busquedaCliente.value = '' }
function cambiarCliente() { clienteSel.value = null; mesaSelGestion.value = null; resultadoGestion.value = null }

async function asignarReserva() {
  if (!clienteSel.value || !mesaSelGestion.value) return
  asignando.value = true
  resultadoGestion.value = null
  try {
    const r = await servicioReservas.reservaGestionada({
      id_cliente: clienteSel.value.id_usuario,
      id_mesa: mesaSelGestion.value,
      metodo_pago: cortesia.value ? 'cortesia' : 'efectivo',
    })
    const e = r.entrada
    mostrarResultado(resultadoGestion, 'ok', `Mesa ${e.mesa} asignada a ${e.cliente}`,
      `Código ${e.codigo_ingreso} · ${e.cantidad_personas} pers · ${e.metodo_pago === 'cortesia' ? 'Cortesía' : 'Bs ' + Number(e.monto_pagado).toFixed(2)} · aparece en «Mis reservas» del cliente`)
    mesaSelGestion.value = null
    await Promise.all([cargarPlanos(), cargarAforo()])
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado(resultadoGestion, 'error', 'No se pudo asignar', data?.error || 'Intenta de nuevo.')
  } finally { asignando.value = false }
}

// ---------- Solicitudes de grupo grande (Fase I) ----------
async function cargarSolicitudes() {
  cargandoSol.value = true
  try { solicitudes.value = await servicioReservas.solicitudesGrupo() }
  catch { solicitudes.value = [] }
  finally { cargandoSol.value = false }
}
function abrirSolicitud(s) {
  solSel.value = s
  propuestaSel.value = []
}
async function confirmarSolicitud() {
  if (!solSel.value) return
  gestionandoSol.value = true
  try {
    const r = await servicioReservas.confirmarSolicitudGrupo(solSel.value.id_solicitud)
    mostrarResultado(resultadoGestion, 'ok', 'Reserva confirmada', r.mensaje || 'Se crearon las reservas del grupo.')
    solSel.value = null
    await Promise.all([cargarSolicitudes(), cargarPlanos(), cargarAforo()])
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado(resultadoGestion, 'error', 'No se pudo confirmar', data?.error || 'Intenta de nuevo')
    await cargarSolicitudes()
  } finally { gestionandoSol.value = false }
}
async function proponerSolicitud() {
  if (!solSel.value || !propuestaSel.value.length) return
  gestionandoSol.value = true
  try {
    const mesas = mesasLibresEvento.value
      .filter(m => propuestaSel.value.includes(m.id_mesa))
      .map(m => ({ id_mesa: m.id_mesa, nombre: etiquetaMesaProp(m) }))
    const r = await servicioReservas.proponerSolicitudGrupo(solSel.value.id_solicitud, mesas)
    mostrarResultado(resultadoGestion, 'ok', 'Propuesta enviada', r.mensaje || 'El cliente debe confirmarla.')
    solSel.value = null
    await cargarSolicitudes()
  } catch (err) {
    const data = err?.response?.data || err
    mostrarResultado(resultadoGestion, 'error', 'No se pudo proponer', data?.error || 'Intenta de nuevo')
  } finally { gestionandoSol.value = false }
}

function recomputarTotales() {
  aforoTotal.value = zonas.value.reduce((s, z) => s + z.aforo_actual, 0)
  capacidadTotal.value = zonas.value.reduce((s, z) => s + z.capacidad, 0)
  const pct = capacidadTotal.value > 0 ? Math.round((aforoTotal.value / capacidadTotal.value) * 100) : 0
  estadoTotal.value = pct >= 100 ? 'lleno' : (pct >= 85 ? 'alerta' : 'ok')
}

onMounted(async () => {
  try {
    eventos.value = await servicioAforo.listarEventos()
    if (eventos.value.length) {
      idEventoSel.value = eventos.value[0].id_evento
      await cambiarEvento()
    } else { cargando.value = false }
  } catch (err) { console.error('Error cargando eventos:', err); cargando.value = false }

  socket = io()
  socket.on('aforo_actualizado', (resumen) => {
    if (resumen.id_evento !== idEventoSel.value) return
    const i = zonas.value.findIndex(z => z.id_zona === resumen.id_zona)
    if (i >= 0) zonas.value[i] = { ...zonas.value[i], ...resumen }
    recomputarTotales()
  })
  socket.on('mesa_actualizada', () => { if (idEventoSel.value) cargarPlanos() })
  socket.on('solicitud_grupo', (d) => {
    cargarSolicitudes()
    // Aviso activo cuando entra una solicitud NUEVA (no en respuesta a confirmada/propuesta)
    if (!d || !d.estado) notif.info('Nueva solicitud de reserva de grupo grande')
  })
})

onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<style scoped>
.vista-recep { padding: var(--esp-5); max-width: 1240px; margin: 0 auto; width: 100%; }
.recep-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--esp-4); margin-bottom: var(--esp-5); flex-wrap: wrap; }
.titulo { font-family: var(--fuente-titulo); font-size: clamp(1.6rem, 3.4vw, 2rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: var(--texto-principal); }
.subtitulo { font-size: 0.92rem; color: var(--texto-secundario); margin-top: 6px; }
.selector-wrap { display: flex; flex-direction: column; gap: 5px; min-width: 220px; }
.selector-lbl { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--texto-desactivado); padding-left: 2px; }
.selector-caja { position: relative; min-width: 220px; }

.alertas { display: flex; flex-direction: column; gap: var(--esp-2); margin-bottom: var(--esp-4); }
.alerta { display: flex; align-items: center; gap: var(--esp-3); padding: var(--esp-3) var(--esp-4); border-radius: var(--radio-md); font-size: 0.86rem; }
.alerta svg { width: 20px; height: 20px; flex-shrink: 0; }
.alerta.alerta { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.35); color: var(--color-alerta); }
.alerta.lleno { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: var(--color-error); }

.recep-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--esp-5); align-items: start; }
@media (max-width: 980px) { .recep-grid { grid-template-columns: 1fr; } }

.panel { position: relative; overflow: hidden; background: var(--gradiente-sutil); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl); padding: var(--esp-5); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 44px rgba(10,6,26,0.5); }
.panel-titulo { font-family: var(--fuente-titulo); font-size: 1.15rem; font-weight: 700; letter-spacing: -0.015em; color: var(--texto-principal); }

/* Pestañas de flujo */
.rec-tabs { display: flex; gap: 6px; margin-bottom: var(--esp-4); overflow-x: auto; padding-bottom: 4px; }
.rec-tab { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid var(--borde-sutil); background: var(--fondo-app); color: var(--texto-secundario); border-radius: var(--radio-full); font-weight: 700; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
.rec-tab svg { width: 17px; height: 17px; }
.rec-tab.activo { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.flujo { display: flex; flex-direction: column; gap: var(--esp-4); }
.flujo-desc { font-size: 0.85rem; color: var(--texto-secundario); line-height: 1.5; }

.separador { display: flex; align-items: center; text-align: center; color: var(--texto-desactivado); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 2px 0; }
.separador::before, .separador::after { content: ''; flex: 1; height: 1px; background: var(--borde-sutil); }
.separador span { padding: 0 12px; }
.form-codigo { display: flex; gap: var(--esp-2); }
.input-codigo { flex: 1; min-width: 0; background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 12px 15px; border-radius: var(--radio-md); font-size: 0.95rem; font-variant-numeric: tabular-nums; outline: none; }
.input-codigo:focus { border-color: var(--morado-brillante); box-shadow: var(--anillo-foco); }
.gest-input { text-transform: none; letter-spacing: normal; }
.btn-primario { background: var(--gradiente-marca); color: #fff; border: none; padding: 12px 22px; border-radius: var(--radio-md); font-weight: 700; cursor: pointer; white-space: nowrap; transition: transform 0.15s ease, box-shadow 0.2s ease; box-shadow: 0 6px 18px rgba(168,85,247,0.3); }
.btn-primario:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236,72,153,0.45); }
.btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sec { background: rgba(168,85,247,0.08); border: 1px solid var(--borde-activo); color: var(--morado-hover); padding: 12px; border-radius: var(--radio-md); font-weight: 600; cursor: pointer; }
.btn-sec:hover { background: rgba(168,85,247,0.16); color: var(--texto-principal); }

/* Ingreso por tandas */
.tanda { padding: var(--esp-4); border-radius: var(--radio-lg); background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-activo); display: flex; flex-direction: column; gap: var(--esp-3); }
.tanda-cab { display: flex; flex-direction: column; gap: 2px; }
.tanda-cab b { font-size: 1.08rem; font-weight: 700; color: var(--texto-principal); }
.tanda-zona { font-size: 0.82rem; color: var(--texto-secundario); }
.tanda-cupos { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--esp-2); }
.tanda-dato { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: var(--radio-md); background: rgba(14,8,33,0.5); border: 1px solid var(--borde-sutil); }
.tanda-dato i { font-style: normal; font-size: 0.68rem; text-transform: uppercase; color: var(--texto-desactivado); }
.tanda-dato b { font-family: var(--fuente-titulo); font-size: 1.3rem; font-weight: 800; line-height: 1; color: var(--texto-principal); }
.tanda-rest { border-color: var(--borde-activo); }
.tanda-rest b { color: var(--morado-hover); }
.tanda-fila { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); flex-wrap: wrap; padding-top: var(--esp-3); border-top: 1px solid var(--borde-sutil); }
.tanda-lbl { font-size: 0.86rem; color: var(--texto-principal); font-weight: 600; }
.stepper { display: flex; align-items: center; gap: 14px; }
.stepper button { width: 38px; height: 38px; border-radius: var(--radio-md); background: var(--fondo-app); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-size: 1.25rem; font-weight: 700; line-height: 1; cursor: pointer; }
.stepper button:hover { border-color: var(--borde-activo); background: rgba(168,85,247,0.14); color: var(--morado-hover); }
.stepper span { min-width: 26px; text-align: center; font-weight: 800; font-size: 1.15rem; color: var(--texto-principal); }
.tanda-acciones { display: flex; gap: var(--esp-3); }
.tanda-acciones .btn-primario, .tanda-acciones .btn-sec { flex: 1; }

/* Walk-in */
.walk-tipo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wt-op { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-app); cursor: pointer; text-align: left; transition: border-color 0.15s ease, background 0.15s ease; }
.wt-op b { color: var(--texto-principal); font-size: 0.92rem; }
.wt-op span { color: var(--texto-secundario); font-size: 0.76rem; }
.wt-op.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.12); }
.walk-campo { display: flex; flex-direction: column; gap: 8px; }
.walk-lbl { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--texto-desactivado); }
.walk-opt { text-transform: none; letter-spacing: normal; font-weight: 500; color: var(--texto-desactivado); }
.walk-cant { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); }
.walk-metodos { display: flex; gap: 8px; flex-wrap: wrap; }
.wm { flex: 1; min-width: 90px; padding: 10px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-app); color: var(--texto-secundario); font-weight: 700; font-size: 0.82rem; cursor: pointer; }
.wm.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.14); color: var(--texto-principal); }
.wm.cortesia.activo { border-color: #FBBF24; background: rgba(251,191,36,0.14); color: #FCD34D; }
.walk-nota { font-size: 0.78rem; color: #FCD34D; }
/* Cobro en efectivo (mismo lenguaje visual que el POS del mesero) */
.efe-bloque { display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: var(--radio-lg); background: var(--fondo-app); border: 1px solid var(--borde-sutil); }
.efe-display { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: var(--radio-md); background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.efe-display.ok { border-color: rgba(34,197,94,0.5); box-shadow: 0 0 16px rgba(34,197,94,0.12); }
.efe-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-desactivado); font-weight: 700; }
.efe-monto { display: flex; align-items: baseline; gap: 8px; }
.efe-moneda { font-size: 1.1rem; font-weight: 700; color: var(--texto-secundario); }
.efe-input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--texto-principal); font-family: var(--fuente-titulo); font-size: 1.9rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.efe-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.efe-chip { flex: 1; min-width: 62px; padding: 9px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta); color: var(--texto-principal); font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
.efe-chip:hover:not(:disabled) { border-color: var(--morado-brillante); background: rgba(168,85,247,0.12); }
.efe-chip.exacto { color: var(--morado-hover); }
.efe-chip.limpiar { color: var(--texto-secundario); }
.efe-chip:disabled { opacity: 0.5; cursor: not-allowed; }
.efe-cambio { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: var(--radio-md); background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); }
.efe-cambio span { font-size: 0.82rem; color: var(--texto-secundario); }
.efe-cambio b { font-family: var(--fuente-titulo); font-size: 1.25rem; font-weight: 800; color: var(--color-exito); font-variant-numeric: tabular-nums; }
.efe-cambio.falta { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
.efe-cambio.falta b { color: var(--color-error); }
.walk-ok-comp { font-size: 0.8rem; color: var(--color-exito); font-weight: 600; }

.walk-total { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); padding-top: var(--esp-3); border-top: 1px solid var(--borde-sutil); flex-wrap: wrap; }
.walk-monto { display: flex; flex-direction: column; gap: 2px; }
.walk-monto span { font-size: 0.74rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.06em; }
.walk-monto b { font-family: var(--fuente-titulo); font-size: 1.6rem; font-weight: 800; color: var(--rosa-acento); }
.walk-monto b.cero { color: #FCD34D; }
.btn-registrar { padding: 13px 24px; }

/* Grupos / gestionada */
.solicitudes { padding: var(--esp-4); border-radius: var(--radio-lg); background: var(--fondo-app); border: 1px solid var(--borde-sutil); }
.sol-cab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sol-cab b { color: var(--texto-principal); font-size: 0.92rem; }
.btn-refrescar-sm { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--borde-sutil); background: none; color: var(--texto-secundario); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-refrescar-sm svg { width: 15px; height: 15px; }
.girar { animation: girar 0.8s linear infinite; }
.sol-vacia { font-size: 0.82rem; color: var(--texto-desactivado); padding: 8px 0; }
.sol-lista { display: flex; flex-direction: column; gap: 8px; }
.sol-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta); cursor: pointer; text-align: left; transition: border-color 0.15s ease; }
.sol-item:hover, .sol-item.activo { border-color: var(--morado-brillante); }
.sol-item-top { display: flex; align-items: center; justify-content: space-between; }
.sol-item-top b { color: var(--texto-principal); font-size: 0.9rem; }
.sol-pers { font-size: 0.74rem; font-weight: 700; color: var(--morado-hover); background: rgba(168,85,247,0.14); padding: 2px 8px; border-radius: 999px; }
.sol-motivo { font-size: 0.8rem; color: var(--texto-secundario); }
.sol-tent-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.sol-mchip { font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; border: 1px solid transparent; }
.sol-mchip.lib { background: rgba(34,197,94,0.14); color: #86EFAC; border-color: rgba(34,197,94,0.3); }
.sol-mchip.ocu { background: rgba(239,68,68,0.14); color: #FCA5A5; border-color: rgba(239,68,68,0.3); }
.sol-mchip.elegible { background: var(--fondo-tarjeta); color: var(--texto-principal); border-color: var(--borde-sutil); cursor: pointer; }
.sol-mchip.elegible:hover { border-color: var(--morado-brillante); }
.sol-mchip.elegible.sel { background: var(--gradiente-marca); color: #fff; border-color: transparent; }
.sol-estado-chip { font-size: 0.66rem; font-weight: 800; padding: 3px 9px; border-radius: 999px; background: rgba(99,102,241,0.18); color: #C7D2FE; }

.rec-tab-badge { background: var(--color-error); color: #fff; font-size: 0.68rem; font-weight: 800; border-radius: 999px; padding: 1px 7px; min-width: 18px; text-align: center; }

/* Gestión de solicitud */
.sol-gestion { margin-top: var(--esp-4); padding: var(--esp-4); border-radius: var(--radio-lg); background: var(--fondo-app); border: 1px solid var(--borde-activo); display: flex; flex-direction: column; gap: var(--esp-3); }
.sg-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--esp-3); }
.sg-cab b { color: var(--texto-principal); font-size: 1rem; }
.sg-sub { display: block; font-size: 0.8rem; color: var(--texto-secundario); margin-top: 2px; }
.sg-lbl { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-desactivado); }
.sg-tent { display: flex; flex-direction: column; gap: 8px; }
.sg-mesas, .sg-libres { display: flex; flex-wrap: wrap; gap: 6px; }
.sg-ok { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: var(--radio-md); background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); }
.sg-ok p { font-size: 0.85rem; color: #86EFAC; }
.sg-prop { display: flex; flex-direction: column; gap: 10px; }
.sg-aviso { font-size: 0.85rem; color: #FCA5A5; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); padding: 10px 12px; border-radius: var(--radio-md); }

.reserva-directa { margin-top: var(--esp-4); border: 1px dashed var(--borde-sutil); border-radius: var(--radio-md); padding: var(--esp-3) var(--esp-4); }
.reserva-directa summary { cursor: pointer; font-size: 0.86rem; font-weight: 700; color: var(--texto-secundario); }
.reserva-directa summary:hover { color: var(--texto-principal); }
.reserva-directa .gest-grid { margin-top: var(--esp-4); }

.gest-grid { display: grid; grid-template-columns: 1.2fr 1fr auto; gap: var(--esp-4); align-items: start; }
@media (max-width: 720px) { .gest-grid { grid-template-columns: 1fr; } }
.gest-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.gest-lbl { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--texto-desactivado); }
.gest-buscar { position: relative; }
.gest-input { width: 100%; box-sizing: border-box; }
.gest-resultados { list-style: none; margin: 6px 0 0; padding: 4px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo); border-radius: var(--radio-md); position: absolute; left: 0; right: 0; z-index: 20; max-height: 260px; overflow-y: auto; box-shadow: 0 16px 40px rgba(10,6,26,0.6); }
.gest-resultados li { display: flex; flex-direction: column; gap: 1px; padding: 9px 11px; border-radius: var(--radio-sm); cursor: pointer; }
.gest-resultados li:hover { background: rgba(168,85,247,0.14); }
.gest-resultados li b { font-size: 0.9rem; color: var(--texto-principal); }
.gest-resultados li span { font-size: 0.76rem; color: var(--texto-secundario); }
.gest-vacio { font-size: 0.8rem; color: var(--texto-desactivado); }
.gest-cliente-sel { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); padding: 10px 14px; border-radius: var(--radio-md); background: var(--fondo-tarjeta-alt); border: 1px solid var(--borde-activo); }
.gcs-datos { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.gcs-datos b { font-size: 0.92rem; color: var(--texto-principal); }
.gcs-datos span { font-size: 0.76rem; color: var(--texto-secundario); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-cambiar { flex-shrink: 0; background: none; border: 1px solid var(--borde-sutil); color: var(--morado-hover); padding: 6px 12px; border-radius: var(--radio-md); font-size: 0.78rem; font-weight: 700; cursor: pointer; }
.gest-check { display: inline-flex; align-items: center; gap: 8px; font-size: 0.84rem; color: var(--texto-secundario); cursor: pointer; margin-top: 2px; }
.gest-check input { width: 17px; height: 17px; accent-color: var(--morado-brillante); cursor: pointer; }
.gest-accion { justify-content: flex-start; }
.btn-asignar { width: 100%; padding: 13px 20px; }
.gest-tip { font-size: 0.72rem; color: var(--texto-desactivado); line-height: 1.4; }
.btn-cerrar-sol { width: 100%; margin-top: 4px; }

/* Aforo en vivo */
.aforo-cab { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-3); margin-bottom: var(--esp-4); }
.aforo-cab-txt { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.live { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--morado-hover); }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-exito); animation: latir 1.8s ease-in-out infinite; }
@keyframes latir { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); } 50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); } }
.total-badge { display: inline-flex; align-items: baseline; gap: 4px; font-family: var(--fuente-titulo); padding: 8px 16px; border-radius: var(--radio-full); }
.total-num { font-size: 1.5rem; font-weight: 800; line-height: 1; }
.total-cap { font-size: 0.95rem; font-weight: 600; opacity: 0.75; }
.total-badge.ok { background: rgba(168,85,247,0.18); color: var(--morado-hover); }
.total-badge.alerta { background: rgba(245,158,11,0.15); color: var(--color-alerta); }
.total-badge.lleno { background: rgba(239,68,68,0.15); color: var(--color-error); }
.barra-total { height: 12px; margin-bottom: var(--esp-5); }
.cargando { display: flex; justify-content: center; padding: 2.5rem; }
.spinner { width: 34px; height: 34px; border: 4px solid var(--borde-sutil); border-top-color: var(--morado-brillante); border-radius: var(--radio-full); animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
.vacio { display: flex; flex-direction: column; align-items: center; gap: var(--esp-2); color: var(--texto-secundario); font-size: 0.85rem; text-align: center; padding: var(--esp-6) var(--esp-4); }
.vacio b { color: var(--texto-principal); font-size: 0.95rem; }
.lista-zonas { display: flex; flex-direction: column; gap: var(--esp-2); }
.zona { padding: 12px 14px; border-radius: var(--radio-md); border: 1px solid transparent; }
.zona.alerta { background: rgba(245,158,11,0.05); }
.zona.lleno { background: rgba(239,68,68,0.06); }
.zona-cab { display: flex; align-items: center; justify-content: space-between; gap: var(--esp-2); margin-bottom: 8px; }
.zona-nombre { font-size: 0.92rem; font-weight: 600; color: var(--texto-principal); }
.zona-num { font-family: var(--fuente-titulo); font-size: 1.05rem; font-weight: 800; }
.zona-num i { font-style: normal; font-size: 0.8rem; font-weight: 600; opacity: 0.6; }
.zona-num.ok { color: var(--morado-hover); }
.zona-num.alerta { color: var(--color-alerta); }
.zona-num.lleno { color: var(--color-error); }
.zona-medida { display: flex; align-items: center; gap: var(--esp-3); }
.barra { flex: 1; height: 10px; background: var(--fondo-app); border: 1px solid var(--borde-sutil); border-radius: var(--radio-full); overflow: hidden; }
.barra-relleno { height: 100%; border-radius: var(--radio-full); transition: width 0.5s var(--ease-suave); }
.barra-relleno.ok { background: var(--gradiente-marca); }
.barra-relleno.alerta { background: linear-gradient(90deg, var(--color-alerta), #f59e0b); }
.barra-relleno.lleno { background: linear-gradient(90deg, var(--color-error), #dc2626); }
.zona-pct { flex-shrink: 0; min-width: 38px; text-align: right; font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); }
.zona-pct.ok { color: var(--morado-hover); }
.zona-pct.alerta { color: var(--color-alerta); }
.zona-pct.lleno { color: var(--color-error); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 520px) {
  .panel { padding: var(--esp-4); }
  .selector-wrap { width: 100%; min-width: 0; }
  .tanda-cupos { grid-template-columns: 1fr; }
  .walk-tipo { grid-template-columns: 1fr; }
}
</style>
