<template>
  <div class="vista-ia fade-in">

    <!-- Cabecera -->
    <div class="ia-cabecera">
      <div class="ia-cabecera-info">
        <h2 class="ia-titulo">Panel de IA</h2>
        <p class="ia-subtitulo">Combos, descuentos y sugerencias al mesero</p>
      </div>
      <div class="ia-cabecera-acciones">
        <button v-if="!estado.en_linea || cargandoEstado" class="btn-secundario" @click="cargarEstado" :disabled="cargandoEstado">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          {{ cargandoEstado ? 'Verificando...' : 'Reintentar' }}
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="ia-kpis escalonar">
      <div class="ia-kpi" :class="estado.en_linea ? 'k-verde' : 'k-rojo'">
        <div class="ia-kpi-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
        </div>
        <div class="ia-kpi-info">
          <span class="ia-kpi-label">Motor de IA</span>
          <span class="ia-kpi-valor">{{ estado.en_linea ? 'En línea' : 'Sin conexión' }}</span>
        </div>
      </div>
      <div class="ia-kpi k-morado">
        <div class="ia-kpi-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
        </div>
        <div class="ia-kpi-info">
          <span class="ia-kpi-label">Descuento en combos</span>
          <span class="ia-kpi-valor">{{ config.descuento_combos }}%</span>
        </div>
      </div>
      <div class="ia-kpi" :class="config.sugerencias_activas ? 'k-verde' : 'k-amarillo'">
        <div class="ia-kpi-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"></path><path d="M19 15l.9 2.4L22 18l-2.1.6L19 21l-.9-2.4L16 18l2.1-.6z"></path></svg>
        </div>
        <div class="ia-kpi-info">
          <span class="ia-kpi-label">Sugerencias al mesero</span>
          <span class="ia-kpi-valor">{{ config.sugerencias_activas ? 'Activas' : 'Pausadas' }}</span>
        </div>
      </div>
      <div class="ia-kpi k-rosa">
        <div class="ia-kpi-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </div>
        <div class="ia-kpi-info">
          <span class="ia-kpi-label">Combos detectados</span>
          <span class="ia-kpi-valor">{{ combos.length }}</span>
        </div>
      </div>
    </div>

    <div class="ia-dos-col">
      <!-- Columna principal: combos sugeridos -->
      <div class="ia-col-main">
        <div class="tarjeta-ia">
          <div class="tarjeta-ia-head">
            <div>
              <h3>Combos sugeridos por la IA</h3>
              <span class="sub">Lo que más se compra junto. Es sugerencia: no cambia los precios reales.</span>
            </div>
            <div class="toggle-tam">
              <button :class="{ activo: tamCombos === 2 }" @click="cambiarTamCombos(2)">Pares</button>
              <button :class="{ activo: tamCombos === 3 }" @click="cambiarTamCombos(3)">Tríos</button>
              <button :class="{ activo: tamCombos === 4 }" @click="cambiarTamCombos(4)">Cuartetos</button>
            </div>
          </div>

          <div v-if="combos.length" class="combos-grid">
            <div v-for="(c, i) in combos" :key="i" class="combo-card">
              <div class="combo-imgs">
                <img v-for="p in c.productos" :key="p.id_producto" :src="p.url_imagen || sinImagen" :alt="p.nombre" @error="imgRota" />
                <span class="combo-mas">+</span>
              </div>
              <div class="combo-info">
                <p class="combo-nombre">{{ c.nombre }}</p>
                <p class="combo-veces">Comprados juntos {{ c.veces }} veces</p>
                <p v-if="c.razon" class="combo-razon" :title="c.razon">{{ c.razon }}</p>
                <div class="combo-precios">
                  <span class="precio-normal">Bs. {{ c.precio_normal.toFixed(2) }}</span>
                  <span class="precio-combo">Bs. {{ c.precio_combo.toFixed(2) }}</span>
                  <span class="badge-descuento">-{{ c.descuento_pct }}%</span>
                </div>
                <button class="btn-crear-combo" :disabled="creandoCombo"
                        @click="crearComboReal(c.nombre, c.precio_combo, c.productos.map(p => ({ id_producto: p.id_producto, cantidad: 1 })))">
                  Convertir en combo real
                </button>
              </div>
            </div>
          </div>
          <div v-else class="vacio">Aún no hay suficiente historial de ventas para detectar combos de este tamaño.</div>
        </div>

        <!-- Packs para mesa: aprendidos de los patrones reales de las mesas grandes -->
        <div class="tarjeta-ia">
          <div class="tarjeta-ia-head">
            <div>
              <h3>Packs para mesa</h3>
              <span class="sub">Lo que más repiten las mesas grandes, para ofrecer al reservar</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="icono-sutil"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>
          </div>
          <div v-if="packs.length" class="packs-grid">
            <div v-for="(pk, i) in packs" :key="i" class="pack-card">
              <div class="pack-head">
                <span class="pack-nombre">{{ pk.nombre }}</span>
                <span class="badge-descuento">-{{ pk.descuento_pct }}%</span>
              </div>
              <!-- La vista vende: imágenes individuales solapadas, como los combos -->
              <div class="combo-imgs pack-imgs">
                <img v-for="it in pk.items" :key="it.id_producto" :src="it.url_imagen || sinImagen" :alt="it.nombre" @error="imgRota" />
                <span class="combo-mas">+</span>
              </div>
              <p class="pack-desc" :title="pk.razon || pk.descripcion">{{ pk.descripcion }}</p>
              <ul class="pack-items">
                <li v-for="it in pk.items" :key="it.id_producto">
                  <span class="pack-cant">{{ it.cantidad }}×</span> {{ it.nombre }}
                </li>
              </ul>
              <div class="pack-precios">
                <span class="precio-normal">Bs. {{ pk.precio_normal.toFixed(2) }}</span>
                <span class="precio-combo">Bs. {{ pk.precio_pack.toFixed(2) }}</span>
              </div>
              <button class="btn-crear-combo" :disabled="creandoCombo"
                      @click="crearComboReal(pk.nombre, pk.precio_pack, pk.items.map(it => ({ id_producto: it.id_producto, cantidad: it.cantidad })))">
                Convertir en combo real
              </button>
            </div>
          </div>
          <div v-else class="vacio">No hay stock suficiente para armar packs ahora mismo.</div>
        </div>

        <!-- Efectividad REAL de la IA: qué tanto acepta la gente lo sugerido -->
        <div class="tarjeta-ia">
          <div class="tarjeta-ia-head">
            <div>
              <h3>Efectividad real de la IA</h3>
              <span class="sub">Cuánto acepta la gente lo que la IA sugiere</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="icono-sutil"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <!-- Filtros: por fechas o por evento (para comparar, ej. qué acepta la gente en cada fiesta) -->
          <div class="efe-filtros">
            <div class="efe-filtro"><BaseFecha v-model="efeDesde" placeholder="Desde" :max="efeHasta || ''" @update:model-value="filtrarEfectividad" /></div>
            <div class="efe-filtro"><BaseFecha v-model="efeHasta" placeholder="Hasta" :min="efeDesde || ''" @update:model-value="filtrarEfectividad" /></div>
            <div class="efe-filtro" style="min-width:180px">
              <BaseSelect :model-value="efeEvento" :options="opcionesEventosEfe" placeholder="Todos los eventos"
                          @update:model-value="v => { efeEvento = v; filtrarEfectividad() }" />
            </div>
          </div>
          <div v-if="efectividad.mas_aceptado" class="efe-destacado">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Lo que más acepta la gente: <strong>{{ efectividad.mas_aceptado.nombre }}</strong>
            ({{ efectividad.mas_aceptado.aceptadas }} aceptadas · {{ efectividad.mas_aceptado.tasa }}%)
          </div>
          <div class="efe-kpis">
            <div class="efe-kpi"><span class="efe-label">Sugerencias mostradas</span><span class="efe-valor">{{ efectividad.mostradas }}</span></div>
            <div class="efe-kpi"><span class="efe-label">Aceptadas por clientes</span><span class="efe-valor" style="color:var(--color-exito)">{{ efectividad.aceptadas }}</span></div>
            <div class="efe-kpi"><span class="efe-label">Tasa de aceptación</span><span class="efe-valor" style="color:var(--morado-hover)">{{ efectividad.tasa }}%</span></div>
          </div>
          <template v-if="(efectividad.top || []).some(t => t.mostradas > 0)">
            <p class="efe-sub">Por producto sugerido:</p>
            <div v-for="t in efectividad.top" :key="t.nombre" class="efe-fila">
              <div class="efe-fila-textos">
                <span class="efe-nombre">{{ t.nombre }}</span>
                <span class="efe-detalle">{{ t.aceptadas }} de {{ t.mostradas }} · {{ t.tasa }}%</span>
              </div>
              <div class="efe-pista"><div class="efe-barra" :style="{ width: t.tasa + '%' }"></div></div>
            </div>
          </template>
          <div v-else class="vacio chico">Todavía no hay datos: se llenan solos a medida que el mesero use las sugerencias en pedidos reales.</div>
        </div>
      </div>

      <!-- Columna lateral: configuración + probador -->
      <div class="ia-col-side">
        <div class="tarjeta-ia">
          <div class="tarjeta-ia-head">
            <div>
              <h3>Configuración</h3>
              <span class="sub">Se aplica al instante en mesero y combos</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="icono-sutil"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>

          <div class="campo-config">
            <span class="campo-config-label">Descuento de los combos</span>
            <div class="stepper-descuento">
              <button class="stepper-btn" @click="ajustarDescuento(-5)" :disabled="formDescuento <= 0" aria-label="Bajar 5%">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <div class="stepper-valor">
                <span class="stepper-numero">{{ formDescuento }}</span><span class="stepper-pct">%</span>
              </div>
              <button class="stepper-btn" @click="ajustarDescuento(5)" :disabled="formDescuento >= 90" aria-label="Subir 5%">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
            <div class="presets-descuento">
              <button v-for="p in [5, 10, 15, 20, 25]" :key="p"
                      class="preset-pct" :class="{ activo: formDescuento === p }"
                      @click="formDescuento = p">{{ p }}%</button>
            </div>
            <span class="campo-config-ayuda">El precio final se redondea (.90, .50).</span>
          </div>

          <label class="campo-config campo-toggle">
            <div>
              <span class="campo-config-label">Sugerencias en la toma de pedidos</span>
              <span class="campo-config-ayuda">Si se pausa, el mesero no ve recomendaciones.</span>
            </div>
            <button class="toggle" :class="{ activo: formSugerencias }" @click.prevent="formSugerencias = !formSugerencias" role="switch" :aria-checked="formSugerencias">
              <span class="toggle-bola"></span>
            </button>
          </label>

          <!-- Premio por perfil completo (módulo cliente): % y tope en Bs -->
          <div class="campo-config">
            <span class="campo-config-label">Premio por perfil completo</span>
            <span class="campo-config-ayuda">Se aplica una sola vez, en su próximo pedido con billetera.</span>
            <div class="premio-fila">
              <div class="premio-campo">
                <label class="premio-mini-label">Descuento</label>
                <div class="premio-input-wrap">
                  <input v-model.number="formPremioPct" type="number" min="0" max="90" step="5" class="premio-input" />
                  <span class="premio-sufijo">%</span>
                </div>
              </div>
              <div class="premio-campo">
                <label class="premio-mini-label">Tope</label>
                <div class="premio-input-wrap">
                  <span class="premio-prefijo">Bs</span>
                  <input v-model.number="formPremioMax" type="number" min="0" step="5" class="premio-input" />
                </div>
              </div>
            </div>
          </div>

          <button class="btn-guardar" :disabled="guardando || !hayCambios" @click="guardarConfig">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>

          <!-- Diagnóstico del vigía del correo del banco (2ª validación de depósitos) -->
          <div class="vigia-box">
            <div class="vigia-head">
              <span class="demo-label">Vigía del correo del banco</span>
              <button type="button" class="btn-demo" :disabled="probandoVigia" @click="probarVigia">
                {{ probandoVigia ? 'Probando…' : 'Probar conexión' }}
              </button>
            </div>
            <p v-if="vigiaResultado" class="vigia-msg" :class="vigiaResultado.ok ? 'ok' : 'mal'">
              {{ vigiaResultado.mensaje }}
            </p>
          </div>
        </div>

        <div class="tarjeta-ia">
          <div class="tarjeta-ia-head">
            <div>
              <h3>Probador de sugerencias</h3>
              <span class="sub">Arma una mesa y mira qué recomienda la IA</span>
            </div>
            <div class="switch-combos">
              <span>Ocultar combos</span>
              <button type="button" class="toggle" :class="{ activo: ocultarCombos }"
                      @click.stop="alternarOcultarCombos"
                      role="switch" :aria-checked="ocultarCombos" title="Quitar los combos de la lista de productos">
                <span class="toggle-bola"></span>
              </button>
            </div>
          </div>

          <!-- Interruptor real/demo + cliente: para demostrar la personalización -->
          <div class="demo-ia">
            <div class="demo-fila">
              <span class="demo-label">Modelo:
                <strong>{{ modeloIA.modo === 'demo' ? 'Demostración (personalizado)' : 'Real (producción)' }}</strong>
              </span>
              <button type="button" class="btn-demo" :class="{ activo: modeloIA.modo === 'demo' }"
                      :disabled="conmutandoModelo || (modeloIA.modo !== 'demo' && !(modeloIA.disponibles || []).includes('demo'))"
                      @click="conmutarModelo(modeloIA.modo === 'demo' ? 'real' : 'demo')">
                {{ conmutandoModelo ? 'Cambiando…' : (modeloIA.modo === 'demo' ? 'Volver al modelo real' : 'Usar datos para la demostración') }}
              </button>
            </div>
            <div v-if="modeloIA.modo === 'demo'" class="demo-fila">
              <span class="demo-label">Cliente:</span>
              <BaseSelect v-model="clienteProbador" :options="opcionesClientes" placeholder="Nuevo (sin historial)" />
            </div>
            <p v-if="modeloIA.modo === 'demo'" class="demo-nota">
              Con historial recomienda a su gusto; "Nuevo" cae a lo popular.
            </p>
          </div>

          <!-- Cuadrícula visual: toca un producto para ponerlo/quitarlo de la mesa -->
          <div class="probador-grid">
            <button v-for="p in productosProbador" :key="p.id_producto" class="prod-mini"
                    :class="{ sel: enMesa(p.id_producto) }" :title="p.nombre_producto"
                    @click="toggleMesa(p)">
              <img :src="p.url_imagen || sinImagen" :alt="p.nombre_producto" @error="imgRota" />
              <span class="prod-mini-nombre">{{ p.nombre_producto }}</span>
            </button>
          </div>
          <p class="probador-conteo">
            {{ mesa.length ? mesa.length + ' producto(s) en la mesa' : 'Mesa vacía · sugiere según el cliente' }}
          </p>

          <button class="btn-guardar" :disabled="probando" @click="probarSugerencias">
            {{ probando ? 'Consultando IA...' : 'Pedir sugerencias' }}
          </button>

          <div v-if="resultado" class="probador-resultado">
            <p v-if="resultado.desactivado" class="vacio chico">Las sugerencias están pausadas: actívalas arriba para probar.</p>
            <p v-else-if="resultado.error" class="vacio chico">{{ resultado.error }}</p>
            <template v-else-if="(resultado.recomendaciones || []).length">
              <p class="resultado-titulo">La IA sugiere:</p>
              <div v-for="r in resultado.recomendaciones" :key="r.id_producto" class="bloque-sugerencia">
                <div class="fila-sugerencia">
                  <span class="sug-nombre">{{ r.nombre }}</span>
                  <span class="sug-prob">{{ formatoProbabilidad(r.probabilidad) }}</span>
                  <span v-if="r.afinidad_cliente >= 0.15" class="sug-prob afin" title="Coincide con lo que suele pedir el cliente">{{ (r.afinidad_cliente * 100).toFixed(0) }}% gusto</span>
                </div>
                <ul v-if="(r.razones || []).length" class="sug-razones">
                  <li v-for="(rz, i) in r.razones" :key="i">{{ rz }}</li>
                </ul>
              </div>
            </template>
            <p v-else class="vacio chico">La IA no encontró sugerencias para esa combinación.</p>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onActivated } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import BaseFecha from '@/componentes/comunes/BaseFecha.vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()
const sinImagen = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" rx="10" fill="%232a1a4a"/></svg>'

// Estado del microservicio
const estado = ref({ en_linea: false, url: '' })
const cargandoEstado = ref(false)

// Configuración
const config = ref({ descuento_combos: 10, sugerencias_activas: true, premio_pct: 10, premio_max: 50 })
const formDescuento = ref(10)
const formSugerencias = ref(true)
const formPremioPct = ref(10)
const formPremioMax = ref(50)
const guardando = ref(false)

// Probabilidad del modelo SIEMPRE visible (1 decimal si es chica, "< 0,1%" si es ínfima):
// nunca una sugerencia sin número, que parece inventada.
function formatoProbabilidad(p) {
  const v = Number(p || 0) * 100
  if (v >= 1) return `${v.toFixed(0)}%`
  if (v >= 0.1) return `${v.toFixed(1).replace('.', ',')}%`
  return '< 0,1%'
}
const hayCambios = computed(() =>
  formDescuento.value !== config.value.descuento_combos ||
  formSugerencias.value !== config.value.sugerencias_activas ||
  Number(formPremioPct.value) !== config.value.premio_pct ||
  Number(formPremioMax.value) !== config.value.premio_max
)

// Combos (tam 2 = pares, 3 = tríos) con caché local: el cambio es INSTANTÁNEO
const combos = ref([])
const tamCombos = ref(2)
const ocultarCombos = ref(false)
const combosCache = { 2: null, 3: null, 4: null }
function cambiarTamCombos(t) {
  if (tamCombos.value === t) return
  tamCombos.value = t
  combos.value = combosCache[t] || []
  if (!combosCache[t]) cargarCombos()
}
// Si una imagen de producto está rota, se reemplaza por el placeholder
function imgRota(e) { e.target.src = sinImagen }
// Lista del probador: al activar "Ocultar combos" desaparecen los productos es_combo
const productosProbador = computed(() =>
  ocultarCombos.value ? productos.value.filter(p => !p.es_combo) : productos.value
)
function alternarOcultarCombos() {
  ocultarCombos.value = !ocultarCombos.value
  // si se ocultan, los combos que estaban en la mesa simulada se quitan también
  if (ocultarCombos.value) {
    const idsCombos = new Set(productos.value.filter(p => p.es_combo).map(p => p.id_producto))
    mesa.value = mesa.value.filter(m => !idsCombos.has(m.id_producto))
  }
}

// Packs para mesa (patrones reales de mesas grandes, aprendidos del historial)
const packs = ref([])
async function cargarPacks() {
  try {
    const res = await clienteHttp.get('/recomendaciones/packs')
    packs.value = res.packs || []
  } catch { packs.value = [] }
}

// Stepper del descuento: pasos de 5, acotado 0-90
function ajustarDescuento(delta) {
  const v = Math.min(Math.max((Number(formDescuento.value) || 0) + delta, 0), 90)
  formDescuento.value = v
}

// Efectividad real (sugerencias mostradas vs aceptadas) con filtros fecha/evento
const efectividad = ref({ mostradas: 0, aceptadas: 0, tasa: 0, top: [], mas_aceptado: null })
const efeDesde = ref('')
const efeHasta = ref('')
const efeEvento = ref('')
const listadoEventos = ref([])
const opcionesEventosEfe = computed(() => [
  { value: '', label: 'Todos los eventos' },
  ...listadoEventos.value.map(e => ({ value: e.id_evento, label: e.nombre_evento }))
])
async function cargarEfectividad() {
  try {
    const params = new URLSearchParams()
    if (efeEvento.value) params.append('evento', efeEvento.value)
    else {
      if (efeDesde.value) params.append('desde', efeDesde.value)
      if (efeHasta.value) params.append('hasta', efeHasta.value)
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    efectividad.value = await clienteHttp.get(`/recomendaciones/efectividad${qs}`)
  } catch (e) { console.warn('Error cargando efectividad IA:', e) }
}
function filtrarEfectividad() { cargarEfectividad() }
async function cargarEventos() {
  try {
    const res = await clienteHttp.get('/eventos')
    listadoEventos.value = res.eventos || []
  } catch (e) { console.warn(e) }
}

// Convertir una sugerencia (combo o pack) en producto combo REAL
const creandoCombo = ref(false)
async function crearComboReal(nombre, precio, items) {
  if (creandoCombo.value) return
  creandoCombo.value = true
  try {
    const res = await clienteHttp.post('/recomendaciones/crear-combo', { nombre, precio, items })
    if (res.ya_existia) {
      notif.advertencia(`Ese combo ya existía como "${res.nombre}" (mismos productos, sin importar el orden). Solo se actualizó el precio: Bs. ${Number(res.precio_anterior).toFixed(2)} → Bs. ${Number(res.precio_nuevo).toFixed(2)}.`)
    } else {
      notif.exito(`Combo "${res.nombre}" creado como producto real. Ya aparece en Productos.`)
    }
  } catch (e) {
    notif.error(e?.error || 'No se pudo crear el combo.')
  } finally { creandoCombo.value = false }
}

// Probador
const productos = ref([])
const productoSel = ref('')
const mesa = ref([])
const probando = ref(false)
const resultado = ref(null)

// Modelo real/demo + cliente (demostración de personalización)
const modeloIA = ref({ modo: 'real', personalizado: false, disponibles: ['real'] })
const conmutandoModelo = ref(false)
const clienteProbador = ref('')
const clientesDemo = ref([])
// Diagnóstico del vigía del correo del banco
const probandoVigia = ref(false)
const vigiaResultado = ref(null)
async function probarVigia() {
  probandoVigia.value = true
  vigiaResultado.value = null
  try {
    vigiaResultado.value = await clienteHttp.get('/comandas/vigia-estado')
  } catch {
    vigiaResultado.value = { ok: false, mensaje: 'No se pudo probar el vigía (revisá que el backend esté arriba).' }
  } finally {
    probandoVigia.value = false
  }
}
const opcionesClientes = computed(() => [
  { value: '', label: 'Nuevo (sin historial)' },
  ...clientesDemo.value.map(c => ({ value: c.id, label: `${c.nombre} · ${c.comandas} pedidos` })),
])

async function cargarModelo() {
  try {
    modeloIA.value = await clienteHttp.get('/recomendaciones/modelo')
    // Si ya está en demo al cargar, traer los clientes para el selector.
    if (modeloIA.value.modo === 'demo') await cargarClientesProbador()
  } catch { /* queda en real */ }
}
async function cargarClientesProbador() {
  try { clientesDemo.value = await clienteHttp.get('/recomendaciones/clientes-demo') } catch { clientesDemo.value = [] }
}
async function conmutarModelo(modo) {
  conmutandoModelo.value = true
  try {
    const r = await clienteHttp.put('/recomendaciones/modelo', { modo })
    if (r && r.ok === false) notif.advertencia(r.error || 'El modelo de demostración no está disponible en este entorno.')
    await cargarModelo()
    if (modeloIA.value.modo === 'demo') await cargarClientesProbador()
    else clienteProbador.value = ''
    resultado.value = null
  } catch { notif.error('No se pudo cambiar el modelo de IA.') }
  finally { conmutandoModelo.value = false }
}
const opcionesProductos = computed(() =>
  productos.value
    .filter(p => !mesa.value.some(m => m.id_producto === p.id_producto))
    .map(p => ({ value: p.id_producto, label: p.nombre_producto }))
)

async function cargarEstado() {
  cargandoEstado.value = true
  try {
    estado.value = await clienteHttp.get('/recomendaciones/estado')
  } catch { estado.value = { en_linea: false, url: '' } }
  finally { cargandoEstado.value = false }
}

async function cargarConfig() {
  try {
    config.value = await clienteHttp.get('/recomendaciones/config')
    formDescuento.value = config.value.descuento_combos
    formSugerencias.value = config.value.sugerencias_activas
    formPremioPct.value = config.value.premio_pct
    formPremioMax.value = config.value.premio_max
  } catch (e) { console.warn('Error cargando config IA:', e) }
}

async function cargarCombos() {
  const t = tamCombos.value
  try {
    const res = await clienteHttp.get(`/recomendaciones/combos?tam=${t}`)
    combosCache[t] = res.combos || []
    if (tamCombos.value === t) combos.value = combosCache[t]
  } catch { if (tamCombos.value === t) combos.value = [] }
}
// Precargar el OTRO tamaño en segundo plano para que el toggle no espere nunca
async function precargarCombos() {
  const otro = tamCombos.value === 2 ? 3 : 2
  try {
    const res = await clienteHttp.get(`/recomendaciones/combos?tam=${otro}`)
    combosCache[otro] = res.combos || []
  } catch { /* silencioso */ }
}

async function cargarProductos() {
  try {
    const res = await clienteHttp.get('/productos')
    productos.value = Array.isArray(res) ? res : (res.productos || [])
  } catch (e) { console.warn(e) }
}

async function guardarConfig() {
  const pct = Number(formDescuento.value)
  if (isNaN(pct) || pct < 0 || pct > 90) {
    notif.advertencia('El descuento debe ser un número entre 0 y 90.')
    return
  }
  const premioPct = Number(formPremioPct.value)
  const premioMax = Number(formPremioMax.value)
  if (isNaN(premioPct) || premioPct < 0 || premioPct > 90) {
    notif.advertencia('El porcentaje del premio debe estar entre 0 y 90.')
    return
  }
  if (isNaN(premioMax) || premioMax < 0) {
    notif.advertencia('El tope del premio debe ser un número mayor o igual a 0.')
    return
  }
  guardando.value = true
  try {
    config.value = await clienteHttp.put('/recomendaciones/config', {
      descuento_combos: pct,
      sugerencias_activas: formSugerencias.value,
      premio_pct: premioPct,
      premio_max: premioMax
    })
    formDescuento.value = config.value.descuento_combos
    formSugerencias.value = config.value.sugerencias_activas
    formPremioPct.value = config.value.premio_pct
    formPremioMax.value = config.value.premio_max
    notif.exito('Configuración de la IA guardada.')
    combosCache[2] = combosCache[3] = null // el descuento cambió: invalidar caché local
    cargarCombos().then(precargarCombos) // los precios reflejan el nuevo descuento
    cargarPacks()
  } catch (e) {
    notif.error(e?.error || 'No se pudo guardar la configuración.')
  } finally {
    guardando.value = false
  }
}

function enMesa(id) {
  return mesa.value.some(m => m.id_producto === id)
}
function toggleMesa(p) {
  if (enMesa(p.id_producto)) {
    mesa.value = mesa.value.filter(m => m.id_producto !== p.id_producto)
  } else {
    mesa.value.push({ id_producto: p.id_producto, nombre: p.nombre_producto })
  }
}

async function probarSugerencias() {
  probando.value = true
  resultado.value = null
  try {
    resultado.value = await clienteHttp.post('/recomendaciones', {
      productos_en_mesa: mesa.value.map(p => p.id_producto),
      k: 3,
      probador: true, // no contamina las métricas de efectividad real
      id_cliente: clienteProbador.value || null, // personalización (modelo demo)
    })
  } catch {
    resultado.value = { recomendaciones: [], error: 'No se pudo consultar la IA.' }
  } finally {
    probando.value = false
  }
}

// KeepAlive: todo se carga una sola vez; al volver a la vista solo se
// refrescan en silencio el estado del motor y la efectividad (lo que cambia).
let yaCargado = false
onActivated(() => {
  if (!yaCargado) {
    yaCargado = true
    cargarEstado()
    cargarConfig()
    cargarCombos().then(precargarCombos)
    cargarProductos()
    cargarEfectividad()
    cargarPacks()
    cargarEventos()
    cargarModelo()
  } else {
    // Refresco silencioso al volver a la vista: lo dinámico se mantiene fresco
    // (los datos previos siguen visibles mientras llegan los nuevos)
    cargarEstado()
    cargarEfectividad()
    cargarPacks()
    cargarCombos().then(precargarCombos)
  }
})
</script>

<style scoped>
/* Cabecera de vidrio (mismo lenguaje que el resto del admin) */
.ia-cabecera {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 24px 28px;
  margin-bottom: 22px;
  border-radius: var(--radio-xl);
  /* Sin backdrop-filter: sobre fondo plano no aporta y en algunas GPUs
     pinta un "campo de luz" rectangular al repintar con el hover. */
  background: var(--fondo-tarjeta);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 48px rgba(10, 6, 26, 0.5);
  overflow: hidden;
}
.ia-cabecera::before {
  content: '';
  position: absolute;
  top: -60%; right: -6%;
  width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.22), transparent 65%);
  pointer-events: none;
}
.ia-cabecera-info {
  position: relative;
  padding-left: 16px;
}
.ia-cabecera-info::before {
  content: '';
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 3px;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  box-shadow: var(--glow-morado);
}
.ia-titulo {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.65rem, 2.4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  margin: 0 0 6px;
  color: var(--texto-principal);
}
.ia-subtitulo {
  font-size: 0.9rem;
  color: var(--texto-secundario);
  margin: 0;
  max-width: 62ch;
}
.ia-cabecera-acciones { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.badge-estado {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.badge-estado.ok { background: rgba(46, 204, 113, 0.08); border: 1px solid rgba(46, 204, 113, 0.25); color: var(--color-exito); }
.badge-estado.mal { background: rgba(231, 76, 60, 0.08); border: 1px solid rgba(231, 76, 60, 0.3); color: var(--color-error); }
.punto-estado { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }

/* KPIs */
.ia-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.ia-kpi {
  --acento: var(--morado-brillante);
  --tinte: rgba(168, 85, 247, 0.14);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: var(--radio-lg);
  background: var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}
.ia-kpi::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--acento), transparent 80%);
}
.k-verde   { --acento: var(--color-exito); --tinte: rgba(34, 197, 94, 0.14); }
.k-rojo    { --acento: var(--color-error); --tinte: rgba(239, 68, 68, 0.14); }
.k-morado  { --acento: var(--morado-brillante); }
.k-amarillo{ --acento: var(--color-alerta); --tinte: rgba(245, 158, 11, 0.14); }
.k-rosa    { --acento: var(--rosa-acento); --tinte: rgba(236, 72, 153, 0.15); }
.ia-kpi-icono {
  width: 46px; height: 46px;
  border-radius: var(--radio-md);
  display: flex; align-items: center; justify-content: center;
  color: var(--acento);
  background: var(--tinte);
  border: 1px solid color-mix(in srgb, var(--acento) 28%, transparent);
  flex-shrink: 0;
}
.ia-kpi-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ia-kpi-label { font-size: 0.7rem; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.5px; }
.ia-kpi-valor { font-size: 1.25rem; font-weight: 900; color: #fff; line-height: 1; }

/* Dos columnas */
.ia-dos-col {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1200px) {
  .ia-dos-col { grid-template-columns: 1fr; }
}
.ia-col-main, .ia-col-side { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

/* Tarjetas */
.tarjeta-ia {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  padding: 22px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 18px 48px rgba(10, 6, 26, 0.5);
}
.tarjeta-ia-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--borde-sutil);
}
.tarjeta-ia-head h3 { margin: 0 0 4px; font-size: 1.1rem; font-weight: 800; color: #fff; }
.tarjeta-ia-head .sub { font-size: 0.8rem; color: var(--texto-secundario); }
.icono-sutil {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 38px; height: 38px;
  padding: 8px;
  border-radius: var(--radio-md);
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--glass-borde);
}

/* Combos */
/* Carrusel horizontal: se desliza para ver todos los combos con imágenes grandes */
.combos-grid {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 10px;
  scrollbar-width: thin;
  scrollbar-color: var(--morado-medio) transparent;
}
.combos-controles { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.combo-card {
  flex: 0 0 320px;
  scroll-snap-align: start;
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radio-lg);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: border-color 0.2s ease, transform 0.2s var(--ease-suave);
}
.combo-card:hover { border-color: rgba(168, 85, 247, 0.4); transform: translateY(-2px); }
.combo-imgs { position: relative; display: flex; align-items: center; flex-shrink: 0; }
.combo-imgs img {
  width: 58px; height: 58px;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid var(--fondo-tarjeta);
  background: var(--fondo-tarjeta-alt);
}
.combo-imgs img + img { margin-left: -14px; }
.combo-mas {
  position: absolute;
  bottom: -6px; left: 50%;
  transform: translateX(-50%);
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--gradiente-marca);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.combo-info { min-width: 0; }
.combo-nombre { margin: 0 0 3px; font-size: 0.86rem; font-weight: 700; color: var(--texto-principal); }
.combo-veces { margin: 0 0 4px; font-size: 0.74rem; color: var(--texto-secundario); }
.combo-razon {
  margin: 0 0 8px;
  font-size: 0.7rem;
  color: var(--morado-hover);
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.combo-precios { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.precio-normal { font-size: 0.78rem; color: var(--texto-desactivado); text-decoration: line-through; }
.precio-combo { font-size: 0.95rem; font-weight: 800; color: var(--color-exito); }
.badge-descuento {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 800;
  background: rgba(236, 72, 153, 0.14);
  color: var(--rosa-acento);
  border: 1px solid rgba(236, 72, 153, 0.3);
}

/* Configuración */
.campo-config { display: block; margin-bottom: 18px; }
.campo-config-label { display: block; font-size: 0.84rem; font-weight: 700; color: var(--texto-principal); margin-bottom: 6px; }
.campo-config-ayuda { display: block; font-size: 0.74rem; color: var(--texto-secundario); margin-top: 5px; }
/* Premio por perfil completo */
.premio-fila { display: flex; gap: 12px; margin-top: 10px; }
.premio-campo { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.premio-mini-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--texto-desactivado); }
.premio-input-wrap {
  display: flex; align-items: center; gap: 6px;
  background: var(--fondo-input, var(--fondo-tarjeta-alt));
  border: 1px solid var(--borde-sutil); border-radius: var(--radio-md);
  padding: 0 12px;
}
.premio-input-wrap:focus-within { border-color: var(--morado-brillante); box-shadow: 0 0 0 3px rgba(168,85,247,0.18); }
.premio-input {
  flex: 1; min-width: 0; background: none; border: none; outline: none;
  color: var(--texto-principal); font-family: var(--fuente-titulo);
  font-size: 1.1rem; font-weight: 800; padding: 10px 0;
}
.premio-prefijo, .premio-sufijo { color: var(--texto-secundario); font-weight: 700; font-size: 0.9rem; }
/* Stepper premium del descuento (− valor +) */
.stepper-descuento {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 10px;
}
.stepper-btn {
  width: 46px;
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
  background: var(--fondo-tarjeta-alt);
  color: var(--texto-principal);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--trans-rapida);
}
.stepper-btn:hover:not(:disabled) {
  background: var(--gradiente-marca);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35);
}
.stepper-btn:active:not(:disabled) { transform: scale(0.95); }
.stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.stepper-valor {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  padding: 10px 16px;
  border-radius: var(--radio-md);
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.10), rgba(0, 0, 0, 0.2));
  border: 1px solid rgba(168, 85, 247, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.stepper-numero {
  font-size: 1.9rem;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.stepper-pct { font-size: 1rem; font-weight: 800; color: var(--morado-hover); }
.presets-descuento { display: flex; gap: 6px; flex-wrap: wrap; }
.preset-pct {
  flex: 1;
  min-width: 48px;
  padding: 7px 0;
  border-radius: 999px;
  border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta-alt);
  color: var(--texto-secundario);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: var(--trans-rapida);
  font-family: var(--fuente-principal);
}
.preset-pct:hover { border-color: var(--borde-activo); color: var(--texto-principal); }
.preset-pct.activo {
  background: var(--gradiente-marca);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 3px 10px rgba(168, 85, 247, 0.3);
}
.campo-toggle { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.toggle {
  width: 48px; height: 26px;
  border-radius: 20px;
  border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta-alt);
  position: relative;
  cursor: pointer;
  transition: background 0.25s ease, border-color 0.25s ease;
  flex-shrink: 0;
}
.toggle-bola {
  position: absolute;
  top: 2px; left: 2px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--texto-secundario);
  transition: transform 0.25s var(--ease-suave), background 0.25s ease;
}
.toggle.activo { background: var(--gradiente-marca); border-color: transparent; }
.toggle.activo .toggle-bola { transform: translateX(22px); background: #fff; }
/* Foco contenido SOLO en el interruptor (antes iluminaba todo el contorno) */
.toggle:focus { outline: none; box-shadow: none; }
.toggle:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.35); }
.switch-combos {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.switch-combos span {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-guardar {
  width: 100%;
  padding: 11px 16px;
  border: none;
  border-radius: var(--radio-md);
  background: var(--gradiente-marca);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.2s var(--ease-suave), box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 4px 16px rgba(168, 85, 247, 0.3);
  font-family: var(--fuente-principal);
}
.btn-guardar:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(168, 85, 247, 0.45); }
.btn-guardar:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-secundario {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: var(--radio-md);
  border: 1px solid var(--borde-activo);
  background: transparent;
  color: var(--morado-hover);
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
  transition: var(--trans-rapida);
  font-family: var(--fuente-principal);
  white-space: nowrap;
}
.btn-secundario:hover:not(:disabled) { background: var(--morado-medio); color: #fff; }
.btn-secundario:disabled { opacity: 0.45; cursor: not-allowed; }

/* Probador — cuadrícula visual de productos */
.probador-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 2px;
}
.prod-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 9px 4px 7px;
  border-radius: 12px;
  border: 1px solid var(--borde-sutil);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: var(--trans-rapida);
  font-family: var(--fuente-principal);
}
.prod-mini img {
  width: 42px;
  height: 42px;
  object-fit: cover;
  border-radius: 9px;
  background: var(--fondo-tarjeta-alt);
}
.prod-mini-nombre {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--texto-secundario);
  text-align: center;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.prod-mini:hover { border-color: var(--borde-activo); transform: translateY(-1px); }
.prod-mini.sel {
  border-color: var(--morado-brillante);
  background: rgba(168, 85, 247, 0.16);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
}
.prod-mini.sel .prod-mini-nombre { color: #fff; }
.probador-conteo {
  margin: 0 0 12px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--texto-secundario);
  text-align: center;
}
.probador-agregar { display: flex; gap: 10px; margin-bottom: 14px; }
.mesa-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.chip-mesa {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--texto-principal);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.3);
}
.chip-x {
  width: 18px; height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: var(--texto-principal);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s ease;
}
.chip-x:hover { background: rgba(239, 68, 68, 0.5); }
.probador-resultado {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--borde-sutil);
}
.resultado-titulo { margin: 0 0 10px; font-size: 0.82rem; font-weight: 700; color: var(--morado-hover); text-transform: uppercase; letter-spacing: 0.5px; }
.fila-sugerencia {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radio-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 6px;
}
.sug-nombre { font-size: 0.86rem; font-weight: 600; color: var(--texto-principal); }
.sug-prob { font-size: 0.8rem; font-weight: 800; color: var(--color-exito); font-variant-numeric: tabular-nums; }
.sug-prob.afin { color: var(--rosa-acento, #e0378b); }

.vacio {
  padding: 26px 10px;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
  font-size: 0.88rem;
}
.vacio.chico { padding: 12px 6px; }

/* Toggle Pares / Tríos */
.toggle-tam {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  flex-shrink: 0;
}
.toggle-tam button {
  border: none;
  background: transparent;
  color: var(--texto-secundario);
  padding: 6px 14px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--fuente-principal);
}
.toggle-tam button.activo {
  background: var(--gradiente-marca);
  color: #fff;
  box-shadow: 0 3px 10px rgba(168, 85, 247, 0.3);
}

/* Razones del porqué en el probador */
.bloque-sugerencia { margin-bottom: 10px; }
.sug-razones {
  margin: 6px 0 0;
  padding: 0 0 0 14px;
  list-style: none;
}
.sug-razones li {
  position: relative;
  font-size: 0.76rem;
  color: var(--texto-secundario);
  padding: 2px 0 2px 12px;
  line-height: 1.35;
}
.sug-razones li::before {
  content: '';
  position: absolute;
  left: 0; top: 9px;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--morado-hover);
  box-shadow: 0 0 5px var(--morado-hover);
}

/* Packs para mesa */
.packs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.pack-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: var(--radio-lg);
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(168, 85, 247, 0.10), transparent 60%),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(168, 85, 247, 0.22);
  transition: border-color 0.2s ease, transform 0.2s var(--ease-suave);
}
.pack-card:hover { border-color: rgba(236, 72, 153, 0.45); transform: translateY(-2px); }
.pack-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
.pack-nombre { font-size: 0.95rem; font-weight: 800; color: #fff; }
.pack-desc {
  margin: 0 0 10px; font-size: 0.74rem; color: var(--texto-secundario); line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.pack-items { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 5px; flex: 1; }
.pack-items li { font-size: 0.82rem; color: var(--texto-principal); font-weight: 600; }
.pack-cant {
  display: inline-block;
  min-width: 26px;
  text-align: center;
  padding: 1px 5px;
  margin-right: 4px;
  border-radius: 7px;
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid rgba(168, 85, 247, 0.3);
}
.pack-precios {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--borde-sutil);
}

/* Botón convertir en combo real */
.btn-crear-combo {
  margin-top: 10px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radio-md);
  border: 1px solid var(--borde-activo);
  background: rgba(168, 85, 247, 0.08);
  color: var(--morado-hover);
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
  transition: var(--trans-rapida);
  font-family: var(--fuente-principal);
}
.btn-crear-combo:hover:not(:disabled) {
  background: var(--gradiente-marca);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35);
}
.btn-crear-combo:disabled { opacity: 0.45; cursor: not-allowed; }

/* Imágenes en packs (misma estética solapada que los combos) */
.pack-imgs { margin-bottom: 12px; }
.pack-imgs img { width: 52px; height: 52px; }

/* Filtros y destacado de efectividad */
.efe-filtros {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.efe-filtro { flex: 1 1 140px; min-width: 130px; }
.efe-destacado {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  margin-bottom: 14px;
  border-radius: var(--radio-md);
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--texto-principal);
  font-size: 0.84rem;
  font-weight: 600;
}
.efe-destacado svg { color: var(--color-alerta); flex-shrink: 0; }
.efe-destacado strong { color: var(--color-alerta); }

/* Efectividad real */
.efe-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.efe-kpi {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px;
  border-radius: var(--radio-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}
.efe-label { font-size: 0.68rem; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.5px; }
.efe-valor { font-size: 1.5rem; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; }
.efe-sub { margin: 0 0 10px; font-size: 0.78rem; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.5px; }
.efe-fila { margin-bottom: 10px; }
.efe-fila-textos { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
.efe-nombre { font-size: 0.84rem; font-weight: 700; color: var(--texto-principal); }
.efe-detalle { font-size: 0.78rem; color: var(--texto-secundario); font-variant-numeric: tabular-nums; }
.efe-pista { height: 8px; border-radius: 5px; background: rgba(255, 255, 255, 0.05); overflow: hidden; }
.efe-barra { height: 100%; border-radius: 5px; background: var(--gradiente-marca); transition: width 0.9s var(--ease-suave); }
@media (max-width: 560px) {
  .efe-kpis { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .ia-cabecera { padding: 18px; }
  .tarjeta-ia { padding: 16px; }
  .combos-grid { grid-template-columns: 1fr; }
  /* En móvil el head de cada tarjeta se apila: el título ocupa todo el ancho
     y los controles (toggle de tamaño, interruptor) pasan a su propia fila */
  .tarjeta-ia-head { flex-direction: column; align-items: stretch; gap: 10px; }
  .switch-combos { justify-content: flex-start; }
  .toggle-tam { align-self: flex-start; }
}

/* Bloque de demostración (interruptor real/demo + cliente) */
.demo-ia {
  margin: 4px 0 14px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.demo-fila { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: space-between; }
.demo-label { font-size: 0.86rem; opacity: 0.85; }
.demo-label strong { opacity: 1; }
.btn-demo {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s, opacity .15s;
}
.btn-demo:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
.btn-demo.activo { background: var(--rosa-acento, #e0378b); border-color: transparent; color: #fff; }
.btn-demo:disabled { opacity: 0.45; cursor: not-allowed; }
.demo-nota { font-size: 0.78rem; opacity: 0.6; margin: 0; line-height: 1.4; }

/* Diagnóstico del vigía del correo */
.vigia-box { margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); }
.vigia-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.vigia-msg { font-size: 0.82rem; margin: 10px 0 0; line-height: 1.4; }
.vigia-msg.ok { color: #34c759; }
.vigia-msg.mal { color: #ff6b6b; }
</style>
