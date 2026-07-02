<template>
  <div class="contenedor-carrito entrada-cine textura-grano">
    <!-- Orbes de neon ambientales -->
    <div class="orbe-deco morado orbe-uno"></div>
    <div class="orbe-deco rosa orbe-dos"></div>

    <!-- ENCABEZADO -->
    <header class="carrito-hero">
      <div class="hero-fila">
        <h1 class="titulo-vista">Tu pedido</h1>
        <span v-if="items.length > 0" class="badge-items">
          {{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}
        </span>
        <span v-else class="badge-items">Vacío</span>
      </div>
      <p class="hero-sub">Revisa tus productos y paga con tu billetera.</p>
    </header>


    <!-- Carrito Vacío -->
    <div v-if="items.length === 0" class="carrito-vacio superficie textura-grano aparecer-subir">
      <div class="icono-vacio-envoltura efecto-flotar">
        <svg class="icono-vacio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </div>
      <h2 class="titulo-vacio">Tu carrito está vacío</h2>
      <p>Agrega bebidas o productos desde el catálogo para verlos aquí.</p>
      <RouterLink to="/cliente/catalogo" class="cta-isla brillo-hover">
        <span>Ver productos</span>
        <span class="cta-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </span>
      </RouterLink>
    </div>

    <!-- Contenido Carrito -->
    <div v-else class="carrito-contenido aparecer-subir">
      <!-- Columna de items -->
      <div class="columna-items">
        <div class="lista-encabezado">
          <h2 class="lista-titulo">Productos</h2>
          <span class="lista-hairline"></span>
        </div>
        <div class="lista-items escalonar">
          <div v-for="item in items" :key="item.id" class="item-carrito hover-elevar">
            <div class="item-media">
              <img :src="item.imagen" :alt="item.nombre" class="imagen-item" />
            </div>
            <div class="info-item">
              <h3>{{ item.nombre }}</h3>
              <p class="precio-unitario">Bs. {{ item.precio.toFixed(2) }} <span class="por-unidad">c/u</span></p>
            </div>
            <div class="cantidad-control">
              <button class="btn-cantidad" @click="disminuirCantidad(item.id)" type="button" aria-label="Disminuir">−</button>
              <span class="cantidad">{{ item.cantidad }}</span>
              <button class="btn-cantidad" @click="aumentarCantidad(item.id)" type="button" aria-label="Aumentar">+</button>
            </div>
            <div class="subtotal">
              <p class="label">Subtotal</p>
              <p class="valor">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</p>
            </div>
            <button class="btn-eliminar" @click="eliminarItem(item.id)" title="Eliminar" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Resumen destacado -->
      <aside class="resumen-mini">
        <div class="resumen-mini-contenido bezel">
          <div class="bezel-core resumen-core textura-grano">
            <h2 class="resumen-titulo">Resumen</h2>

            <div class="fila-mini">
              <span>Unidades</span>
              <span>{{ totalItems }}</span>
            </div>
            <div class="fila-mini">
              <span>Subtotal</span>
              <span>Bs. {{ subtotal.toFixed(2) }}</span>
            </div>

            <div class="total-mini">
              <span class="total-etiqueta">Total a pagar</span>
              <span class="total-cifra">
                <span class="total-moneda">Bs.</span>{{ total.toFixed(2) }}
              </span>
            </div>

            <div class="botones-mini">
              <button class="btn-pago-mini cta-isla" @click="irAPagar" :disabled="!puedeComprar || cargandoPago" :title="getRazonDeshabilitado" type="button">
                <span class="pago-texto">{{ textoBotonPago }}</span>
                <span class="cta-icono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </span>
              </button>
              <RouterLink to="/cliente/catalogo" class="btn-volver-mini" type="button">
                Volver al catálogo
              </RouterLink>
            </div>

            <div v-if="errorCargaSaldo" class="alerta alerta-error">
              {{ errorCargaSaldo }}
            </div>

            <div v-else-if="!cargandoSaldo && saldoInsuficiente" class="alerta alerta-error">
              Tu saldo de Bs. {{ saldo.toFixed(2) }} es insuficiente. Te falta Bs. {{ (total - saldo).toFixed(2) }}
            </div>

            <div v-if="mensajeExito" class="alerta alerta-exito">
              {{ mensajeExito }}
            </div>

            <div v-if="errorPago" class="alerta alerta-error">
              {{ errorPago }}
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { storeToRefs } from 'pinia'

const router = useRouter()
const tienda = useTiendaAutenticacion()
const tiendaCarrito = useTiendaCarrito()
const { items, subtotal, total, totalItems } = storeToRefs(tiendaCarrito)

const saldo = ref(0)
const qrPublico = ref('')
const cargandoSaldo = ref(true)
const errorCargaSaldo = ref('')
const cargandoPago = ref(false)
const mensajeExito = ref('')
const errorPago = ref('')

// Subtotal y total se manejan en el store directamente

const saldoInsuficiente = computed(() => {
  // No consideramos insuficiente el saldo hasta tenerlo cargado
  if (cargandoSaldo.value || errorCargaSaldo.value) return false
  return saldo.value < total.value
})

const puedeComprar = computed(() => {
  return !cargandoSaldo.value && !errorCargaSaldo.value && !saldoInsuficiente.value && items.value.length > 0
})

const textoBotonPago = computed(() => {
  if (cargandoSaldo.value) return 'Cargando...'
  if (cargandoPago.value) return 'Procesando pago...'
  if (saldoInsuficiente.value) return 'Saldo Insuficiente'
  return 'Pagar con Billetera'
})

const getRazonDeshabilitado = computed(() => {
  if (cargandoSaldo.value) return 'Cargando saldo...'
  if (errorCargaSaldo.value) return errorCargaSaldo.value
  if (items.value.length === 0) return 'Carrito vacío'
  if (saldoInsuficiente.value) return 'Tu saldo es insuficiente'
  return ''
})

function aumentarCantidad(id) {
  tiendaCarrito.aumentarCantidad(id)
}

function disminuirCantidad(id) {
  tiendaCarrito.disminuirCantidad(id)
}

function eliminarItem(id) {
  tiendaCarrito.eliminarItem(id)
}

async function irAPagar() {
  if (!puedeComprar.value || cargandoPago.value) return
  cargandoPago.value = true

  try {
    // Reutilizamos el qr_publico obtenido al cargar el saldo para evitar una segunda petición
    if (!qrPublico.value) throw new Error('No se pudo obtener el identificador de la billetera')

    const formData = new FormData()
    formData.append('metodo_pago', 'Billetera')
    formData.append('qr_billetera', qrPublico.value)
    formData.append('id_cliente', tienda.usuario.id)

    // Preparar el array de productos esperado por el backend
    const productosParaBackend = items.value.map(i => ({
      id_producto: i.id,
      cantidad: i.cantidad
    }))
    formData.append('productos', JSON.stringify(productosParaBackend))

    const resPago = await clienteHttp.post('/comandas/crear', formData)

    // Actualizamos el saldo local con el saldo_restante que responde el backend
    if (resPago && resPago.saldo_restante !== undefined && resPago.saldo_restante !== null) {
      saldo.value = resPago.saldo_restante
    }

    tiendaCarrito.vaciarCarrito()
    mensajeExito.value = '¡Pedido pagado exitosamente! Pasando a preparación.'
    setTimeout(() => {
      router.push('/cliente/catalogo') // Volver al catálogo
    }, 2000)

  } catch (error) {
    console.error('Error al pagar:', error)
    errorPago.value = error.error || error.message || 'Error al procesar el pago'
  } finally {
    cargandoPago.value = false
  }
}

async function cargarSaldo() {
  cargandoSaldo.value = true
  errorCargaSaldo.value = ''
  try {
    const res = await servicioBilletera.obtenerSaldo()
    saldo.value = res.saldo_actual || 0
    qrPublico.value = res.qr_publico || ''
  } catch (error) {
    console.error('Error cargando saldo:', error)
    errorCargaSaldo.value = 'No se pudo cargar tu saldo. Intenta recargar la página.'
  } finally {
    cargandoSaldo.value = false
  }
}

onMounted(async () => {
  await cargarSaldo()
})
</script>

<style scoped>
.contenedor-carrito {
  --azul-profundo: var(--color-info);
  --verde-fresco: var(--color-exito);
  --rojo-suave: var(--color-error);
  --amarillo-alerta: var(--color-alerta);
  --fondo-principal: var(--fondo-app);
}

.contenedor-carrito {
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(1.5rem, 1rem + 2vw, 3rem) 1rem 120px;
  overflow: clip;
}

/* Orbes ambientales */
.orbe-deco { z-index: 0; }
.orbe-uno {
  width: 460px; height: 460px;
  top: -160px; right: -120px;
  opacity: 0.28;
}
.orbe-dos {
  width: 400px; height: 400px;
  bottom: 40px; left: -160px;
  opacity: 0.22;
}

/* ===== ENCABEZADO ===== */
.carrito-hero {
  position: relative;
  z-index: 1;
  margin-bottom: clamp(1.25rem, 0.9rem + 1.6vw, 2rem);
}

.hero-fila {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--esp-3);
}

.titulo-vista {
  margin: 0;
  margin-right: auto;
  font-family: var(--fuente-titulo);
  font-size: clamp(1.55rem, 1.2rem + 1.4vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--texto-principal);
  text-wrap: balance;
}

.hero-sub {
  margin: 0.45rem 0 0;
  color: var(--texto-secundario);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 48ch;
  text-wrap: pretty;
}

.badge-items {
  background: rgba(168, 85, 247, 0.12);
  color: var(--morado-hover);
  border: 1px solid var(--borde-activo);
  padding: 0.4rem 1.05rem;
  border-radius: var(--radio-full);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 20px rgba(168, 85, 247, 0.22);
  align-self: center;
}

/* ===== CARRITO VACÍO ===== */
.carrito-vacio {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: clamp(3rem, 2rem + 4vw, 5.5rem) 2rem;
  border-radius: var(--radio-xl);
}

.icono-vacio-envoltura {
  position: relative;
  z-index: 1;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  background: radial-gradient(circle at 50% 32%, rgba(168, 85, 247, 0.22), rgba(168, 85, 247, 0.02) 72%);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 16px 44px rgba(168, 85, 247, 0.2);
  margin-bottom: var(--esp-5);
}

.icono-vacio {
  width: 56px;
  height: 56px;
  color: var(--morado-hover);
}

.titulo-vacio {
  position: relative;
  z-index: 1;
  font-family: var(--fuente-titulo);
  font-size: clamp(1.4rem, 1.1rem + 1.2vw, 1.8rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--texto-principal);
  margin: 0 0 var(--esp-2) 0;
}

.carrito-vacio p {
  position: relative;
  z-index: 1;
  color: var(--texto-secundario);
  font-size: 1rem;
  line-height: 1.55;
  max-width: 42ch;
  text-wrap: pretty;
  margin: 0 0 var(--esp-6) 0;
}

.carrito-vacio .cta-isla {
  position: relative;
  z-index: 1;
  text-decoration: none;
}

/* ===== CONTENIDO CARRITO (BENTO) ===== */
.carrito-contenido {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 372px;
  align-items: start;
  gap: clamp(1.25rem, 0.75rem + 1.5vw, 2.25rem);
}

.columna-items {
  min-width: 0;
}

.lista-encabezado {
  display: flex;
  align-items: center;
  gap: var(--esp-4);
  margin-bottom: var(--esp-4);
}

.lista-titulo {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
  white-space: nowrap;
}

.lista-hairline {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--borde-sutil), transparent);
}

.lista-items {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* ---- Item premium ---- */
.item-carrito {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-4);
  background: var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-lg);
  padding: 0.85rem 1.1rem;
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 30px rgba(10, 6, 26, 0.4);
  overflow: hidden;
}
.item-carrito::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--gradiente-marca);
  opacity: 0;
  transition: opacity 0.25s var(--ease-cine);
}
.item-carrito:hover::before { opacity: 1; }

.item-media {
  padding: 4px;
  border-radius: calc(var(--radio-md) + 4px);
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid var(--glass-borde);
  flex-shrink: 0;
}

.imagen-item {
  display: block;
  width: 58px;
  height: 58px;
  object-fit: cover;
  border-radius: var(--radio-md);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.info-item {
  flex: 1 1 130px;
  min-width: 0;
}

.info-item h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
  margin: 0 0 0.25rem 0;
}

.precio-unitario {
  color: var(--texto-secundario);
  font-weight: 500;
  font-size: 0.9rem;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.por-unidad {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.cantidad-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(10, 6, 26, 0.45);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-full);
  padding: 0.32rem;
}

.btn-cantidad {
  background: var(--gradiente-marca);
  border: none;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
  transition: transform 0.25s var(--ease-cine), box-shadow 0.25s ease;
}
.btn-cantidad:hover {
  transform: translateY(-1px) scale(1.06);
  box-shadow: 0 6px 18px rgba(236, 72, 153, 0.4), var(--sombra-glow);
}
.btn-cantidad:active {
  transform: scale(0.92);
  box-shadow: none;
}
.btn-cantidad:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--fondo-tarjeta), 0 0 0 4px var(--borde-activo);
}

.cantidad {
  min-width: 26px;
  text-align: center;
  font-weight: 700;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.subtotal {
  text-align: right;
  min-width: 84px;
  white-space: nowrap;
}

.subtotal .label {
  display: block;
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--texto-terciario, var(--texto-secundario));
  margin: 0 0 0.15rem 0;
}

.subtotal .valor {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  color: var(--morado-hover);
  font-size: 1.2rem;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.btn-eliminar {
  background: transparent;
  border: none;
  color: var(--texto-secundario);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1rem;
  border-radius: var(--radio-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}
.btn-eliminar:hover {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.12);
}
.btn-eliminar:active { transform: scale(0.9); }
.btn-eliminar:focus-visible {
  outline: none;
  color: var(--color-error);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4);
}

/* ===== RESUMEN DESTACADO ===== */
.resumen-mini {
  position: sticky;
  top: 24px;
}

.resumen-mini-contenido {
  border-radius: var(--radio-xl);
}

.resumen-core {
  padding: clamp(1.4rem, 1rem + 1vw, 1.9rem);
}

.resumen-titulo {
  margin: 0 0 var(--esp-5);
  font-family: var(--fuente-titulo);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}

.fila-mini {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.92rem;
  color: var(--texto-secundario);
  padding: 0.55rem 0;
}
.fila-mini + .fila-mini {
  border-top: 1px solid var(--borde-sutil);
}
.fila-mini span:last-child {
  font-variant-numeric: tabular-nums;
  color: var(--texto-principal);
  font-weight: 600;
}

/* Total protagonista */
.total-mini {
  margin: var(--esp-4) 0 var(--esp-5);
  padding: var(--esp-4) var(--esp-4) calc(var(--esp-4) + 2px);
  border-radius: var(--radio-lg);
  background: linear-gradient(150deg, rgba(168, 85, 247, 0.16), rgba(236, 72, 153, 0.1));
  border: 1px solid var(--borde-activo);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 30px rgba(168, 85, 247, 0.18);
}

.total-etiqueta {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--morado-hover);
  margin-bottom: 0.4rem;
}

.total-cifra {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-family: var(--fuente-titulo);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  font-size: clamp(2.2rem, 1.6rem + 3vw, 2.9rem);
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}
.total-moneda {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--morado-hover);
  align-self: center;
}

.botones-mini {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* Botón de pago (CTA isla a ancho completo) */
.btn-pago-mini {
  width: 100%;
  justify-content: space-between;
  padding: 15px 15px 15px 24px;
  font-size: 1rem;
}
.pago-texto { line-height: 1; }
.btn-pago-mini:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  filter: grayscale(0.35);
}
.btn-pago-mini:disabled .cta-icono { transform: none; }

.btn-volver-mini {
  width: 100%;
  padding: 0.85rem;
  background: rgba(168, 85, 247, 0.06);
  color: var(--morado-hover);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-full);
  text-align: center;
  font-weight: 600;
  text-decoration: none;
  font-size: 0.92rem;
  transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.2s ease;
}
.btn-volver-mini:hover {
  background: rgba(168, 85, 247, 0.16);
  border-color: var(--morado-brillante);
  color: var(--texto-principal);
}
.btn-volver-mini:active { transform: scale(0.99); }
.btn-volver-mini:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--fondo-tarjeta), 0 0 0 4px var(--borde-activo);
}

/* ===== ALERTAS ===== */
.alerta {
  margin-top: var(--esp-4);
  padding: var(--esp-4);
  border-radius: var(--radio-md);
  font-size: 0.88rem;
  line-height: 1.45;
  border: 1px solid;
  font-variant-numeric: tabular-nums;
  animation: subirEntrada 0.35s var(--ease-cine) both;
}

.alerta-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.3);
}

.alerta-exito {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-exito);
  border-color: rgba(34, 197, 94, 0.3);
}

/* ===== RESPONSIVE ===== */

/* Tablet: colapsa a una columna, resumen deja de ser sticky */
@media (max-width: 1024px) {
  .carrito-contenido {
    grid-template-columns: 1fr;
  }
  .resumen-mini {
    position: static;
  }
}

@media (max-width: 768px) {
  .info-item {
    flex: 1 1 100%;
    margin-bottom: 0.25rem;
  }
  .cantidad-control {
    margin-right: auto;
  }
}

/* Móvil: reordena la fila inferior para que respire */
@media (max-width: 480px) {
  .contenedor-carrito {
    padding: 1rem 0.75rem 110px;
  }

  .item-carrito {
    gap: 0.75rem;
    padding: 0.8rem;
  }

  .info-item {
    flex: 1 1 calc(100% - 74px);
    margin-bottom: 0;
  }

  .cantidad-control {
    order: 2;
    margin-right: 0;
    padding: 0.35rem;
    gap: 0.7rem;
  }

  .btn-cantidad {
    width: 34px;
    height: 34px;
  }

  .subtotal {
    order: 3;
    flex: 1;
    min-width: 0;
    text-align: right;
  }

  .subtotal .valor {
    font-size: 1.08rem;
  }

  .btn-eliminar {
    order: 1;
    align-self: flex-start;
    padding: 0.4rem;
    min-width: 34px;
    min-height: 34px;
  }
}

/* ===== MOVIMIENTO REDUCIDO ===== */
@media (prefers-reduced-motion: reduce) {
  .alerta,
  .item-carrito,
  .btn-pago-mini,
  .btn-cantidad,
  .btn-eliminar,
  .btn-volver-mini,
  .efecto-flotar {
    animation: none;
    transition: none;
  }
  .item-carrito:hover,
  .btn-pago-mini:hover:not(:disabled),
  .btn-cantidad:hover {
    transform: none;
  }
}
</style>
