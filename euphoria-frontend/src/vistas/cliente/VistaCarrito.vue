<template>
  <div class="contenedor-carrito">
    <div class="carrito-header-mini aparecer-subir">
      <h1>Tu pedido</h1>
      <span v-if="items.length > 0" class="badge-items">{{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}</span>
      <span v-else class="badge-items">Vacío</span>
    </div>


    <!-- Carrito Vacío -->
    <div v-if="items.length === 0" class="carrito-vacio aparecer-subir">
      <div class="icono-vacio-envoltura efecto-flotar">
        <svg class="icono-vacio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </div>
      <h2 class="titulo-vacio">Tu carrito está vacío</h2>
      <p>Agrega bebidas o productos desde el catálogo para verlos aquí.</p>
      <RouterLink to="/cliente/catalogo" class="btn btn-primario hover-elevar brillo-hover">
        Ver productos
      </RouterLink>
    </div>

    <!-- Contenido Carrito -->
    <div v-else class="carrito-contenido aparecer-subir">
      <div class="lista-items escalonar">
        <div v-for="item in items" :key="item.id" class="item-carrito">
          <img :src="item.imagen" :alt="item.nombre" class="imagen-item" />
          <div class="info-item">
            <h3>{{ item.nombre }}</h3>
            <p class="precio-unitario">Bs. {{ item.precio.toFixed(2) }}</p>
          </div>
          <div class="cantidad-control">
            <button class="btn-cantidad" @click="disminuirCantidad(item.id)" type="button">−</button>
            <span class="cantidad">{{ item.cantidad }}</span>
            <button class="btn-cantidad" @click="aumentarCantidad(item.id)" type="button">+</button>
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

      <!-- Resumen Minimalista -->
      <div class="resumen-mini">
        <div class="resumen-mini-contenido">
          <h2>Resumen</h2>
          <div class="fila-mini">
            <span>Subtotal</span>
            <span>Bs. {{ subtotal.toFixed(2) }}</span>
          </div>
          <div class="fila-mini total-mini">
            <span>Total</span>
            <span>Bs. {{ total.toFixed(2) }}</span>
          </div>
          
          <div class="botones-mini">
            <button class="btn-pago-mini" @click="irAPagar" :disabled="!puedeComprar || cargandoPago" :title="getRazonDeshabilitado" type="button">
              {{ textoBotonPago }}
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
  padding-bottom: 100px;
  background: var(--fondo-principal);
}

/* HEADER MINIMALISTA */
.carrito-header-mini {
  display: flex;
  align-items: center;
  gap: var(--esp-4);
  margin-bottom: var(--esp-6);
  padding-bottom: var(--esp-4);
  border-bottom: 1px solid var(--borde-sutil);
}

.carrito-header-mini h1 {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.7rem, 1.4rem + 1.2vw, 2.05rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0;
  margin-right: auto;
  color: var(--texto-principal);
  text-wrap: balance;
}

.badge-items {
  background: rgba(168, 85, 247, 0.12);
  color: var(--morado-hover);
  border: 1px solid var(--borde-activo);
  padding: 0.32rem 0.95rem;
  border-radius: var(--radio-full);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* SECCIÓN SIN RESERVA */
.seccion-sin-reserva {
  margin-bottom: 2rem;
}

.alerta-sin-reserva {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  background: rgba(255, 193, 7, 0.1);
  border: 2px solid var(--amarillo-alerta);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.icono-alerta {
  width: 40px;
  height: 40px;
  background: var(--amarillo-alerta);
  color: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.contenido-alerta {
  flex: 1;
}

.titulo-alerta {
  font-weight: 700;
  color: var(--texto-principal);
  margin: 0 0 0.5rem 0;
}

.mensaje-alerta {
  color: var(--texto-secundario);
  margin: 0;
  font-size: 0.9rem;
}

/* OPCIONES PAGO */
.opciones-pago {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.opcion-reserva,
.opcion-codigo {
  background: var(--fondo-tarjeta);
  border: 1px solid rgba(170, 59, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
}

.icono-opcion {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, var(--morado-brillante), var(--azul-profundo));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.titulo-opcion {
  margin: 0 0 0.3rem 0;
  color: var(--texto-principal);
  font-weight: 700;
}

.descripcion-opcion {
  color: var(--texto-secundario);
  font-size: 0.85rem;
  margin: 0 0 0.8rem 0;
}

.link-opcion {
  display: inline-block;
  color: var(--morado-brillante);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s;
}

.link-opcion:hover {
  text-decoration: underline;
}

/* CAMPO CÓDIGO */
.campo-codigo {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.input-codigo {
  flex: 1;
  padding: 0.6rem;
  background: var(--fondo-principal);
  border: 1px solid rgba(170, 59, 255, 0.2);
  border-radius: 6px;
  color: var(--texto-principal);
  font-size: 0.9rem;
}

.input-codigo:focus {
  outline: none;
  border-color: var(--morado-brillante);
}

.btn-validar-codigo {
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, var(--morado-brillante), var(--azul-profundo));
  border: none;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.btn-validar-codigo:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(157, 78, 221, 0.3);
}

.btn-validar-codigo:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-codigo {
  color: var(--color-error);
  font-size: 0.8rem;
  margin: 0.5rem 0 0 0;
}

.exito-codigo {
  color: var(--verde-fresco);
  font-size: 0.8rem;
  margin: 0.5rem 0 0 0;
}

/* ALERTA CÓDIGO VÁLIDO */
.alerta-codigo-valido {
  display: flex;
  gap: 1rem;
  align-items: center;
  background: rgba(6, 214, 160, 0.1);
  border: 2px solid var(--verde-fresco);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.icono-check {
  width: 40px;
  height: 40px;
  background: var(--verde-fresco);
  color: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.contenido-check {
  flex: 1;
}

.titulo-check {
  font-weight: 700;
  color: var(--texto-principal);
  margin: 0 0 0.3rem 0;
}

.mensaje-check {
  color: var(--texto-secundario);
  margin: 0;
  font-size: 0.9rem;
}

/* CARRITO VACÍO */
.carrito-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4.5rem 2rem 5rem;
}

.icono-vacio-envoltura {
  width: 108px;
  height: 108px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  background: radial-gradient(circle at 50% 35%, rgba(168, 85, 247, 0.16), rgba(168, 85, 247, 0.03) 70%);
  border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 12px 32px rgba(168, 85, 247, 0.12);
  margin-bottom: var(--esp-5);
}

.icono-vacio {
  width: 52px;
  height: 52px;
  color: var(--morado-hover);
}

.titulo-vacio {
  font-family: var(--fuente-titulo);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
  margin: 0 0 var(--esp-2) 0;
}

.carrito-vacio p {
  color: var(--texto-secundario);
  font-size: 1rem;
  line-height: 1.5;
  max-width: 42ch;
  text-wrap: pretty;
  margin: 0 0 var(--esp-6) 0;
}

/* CONTENIDO CARRITO */
.carrito-contenido {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 2rem;
}

.lista-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.item-carrito {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-4);
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: var(--esp-3) var(--esp-4);
  transition: transform 0.25s var(--ease-suave), border-color 0.25s ease, box-shadow 0.25s ease;
}
.item-carrito:hover {
  border-color: var(--borde-activo);
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(168, 85, 247, 0.14);
}

.imagen-item {
  width: 54px;
  height: 54px;
  object-fit: cover;
  border-radius: var(--radio-md);
  flex-shrink: 0;
  border: 1px solid var(--borde-sutil);
  transition: border-color 0.25s ease;
}
.item-carrito:hover .imagen-item {
  border-color: var(--borde-activo);
}

.info-item {
  flex: 1 1 120px;
  min-width: 0; /* Permite achicarse sin romper layout */
}

.info-item h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin: 0 0 0.3rem 0;
}

.precio-unitario {
  color: var(--texto-secundario);
  font-weight: 500;
  font-size: 0.9rem;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.cantidad-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-md);
  padding: 0.3rem;
}

.btn-cantidad {
  background: var(--gradiente-marca);
  border: none;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: var(--radio-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
  transition: var(--trans-rapida);
}

.btn-cantidad:hover {
  transform: translateY(-1px);
  box-shadow: var(--sombra-glow);
}
.btn-cantidad:active {
  transform: scale(0.94);
  box-shadow: none;
}
.btn-cantidad:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--fondo-input), 0 0 0 4px var(--borde-activo);
}

.cantidad {
  min-width: 24px;
  text-align: center;
  font-weight: 700;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.subtotal {
  text-align: right;
  min-width: 70px;
  white-space: nowrap;
}

.subtotal .label {
  display: none;
}

.subtotal .valor {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  color: var(--morado-hover);
  font-size: 1.15rem;
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
  background: rgba(239, 68, 68, 0.1);
}
.btn-eliminar:active { transform: scale(0.92); }
.btn-eliminar:focus-visible {
  outline: none;
  color: var(--color-error);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.35);
}

/* RESUMEN MINIMALISTA */
.resumen-mini {
  width: 300px;
  background: transparent;
  position: sticky;
  top: 20px;
}

.resumen-mini-contenido {
  background: var(--gradiente-sutil);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
  padding: var(--esp-5);
  box-shadow: var(--sombra-tarjeta);
}

.resumen-mini h2 {
  font-family: var(--fuente-titulo);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin: 0 0 var(--esp-4) 0;
  border-bottom: 1px solid var(--borde-sutil);
  padding-bottom: var(--esp-3);
}

.fila-mini {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.9rem;
  color: var(--texto-secundario);
  margin-bottom: var(--esp-3);
}
.fila-mini span:last-child {
  font-variant-numeric: tabular-nums;
  color: var(--texto-principal);
  font-weight: 600;
}

.total-mini {
  margin-top: var(--esp-4);
  padding: var(--esp-4);
  border-radius: var(--radio-md);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-activo);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin-bottom: var(--esp-5);
}
.total-mini span:last-child {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  color: var(--morado-hover);
  font-variant-numeric: tabular-nums;
}

.botones-mini {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.btn-pago-mini {
  width: 100%;
  padding: 0.9rem;
  background: var(--gradiente-marca);
  color: #fff;
  border: none;
  border-radius: var(--radio-full);
  font-weight: 700;
  font-size: 0.98rem;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(168, 85, 247, 0.3);
  transition: transform 0.25s var(--ease-suave), box-shadow 0.25s ease, opacity 0.2s ease;
}
.btn-pago-mini:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(236, 72, 153, 0.4), var(--glow-morado); }
.btn-pago-mini:active:not(:disabled) { transform: translateY(0) scale(0.99); box-shadow: 0 4px 12px rgba(168, 85, 247, 0.28); }
.btn-pago-mini:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--fondo-tarjeta), 0 0 0 4px var(--borde-activo); }
.btn-pago-mini:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

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
  font-size: 0.9rem;
  transition: var(--trans-normal);
}
.btn-volver-mini:hover {
  background: rgba(168, 85, 247, 0.14);
  border-color: var(--morado-brillante);
  color: var(--texto-principal);
}
.btn-volver-mini:active { transform: scale(0.99); }
.btn-volver-mini:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--fondo-tarjeta), 0 0 0 4px var(--borde-activo);
}

/* ALERTAS */
.alerta {
  margin-top: var(--esp-4);
  padding: var(--esp-4);
  border-radius: var(--radio-md);
  font-size: 0.88rem;
  line-height: 1.45;
  border: 1px solid;
  font-variant-numeric: tabular-nums;
  animation: subirEntrada 0.35s var(--ease-suave) both;
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

/* RESPONSIVE */

/* TABLET: 481px - 1024px */
@media (min-width: 481px) and (max-width: 1024px) {
  .carrito-contenido {
    flex-direction: column;
  }
  .resumen-mini {
    width: 100%;
    position: static;
  }
}

/* TABLET / MÓVIL: apila el resumen y da espacio a los controles */
@media (max-width: 768px) {
  .carrito-contenido {
    flex-direction: column;
  }
  .resumen-mini {
    width: 100%;
    position: static;
  }
  .info-item {
    flex: 1 1 100%;
    margin-bottom: 0.5rem;
  }
  .cantidad-control {
    margin-right: auto;
  }
}

/* MÓVIL: <=480px — evita que cantidad y subtotal queden apretados */
@media (max-width: 480px) {
  .contenedor-carrito {
    padding: 1rem 0.75rem;
    padding-bottom: 100px;
  }

  .item-carrito {
    gap: 0.75rem;
    padding: 0.75rem;
  }

  /* Nombre + precio ocupan el ancho junto a la imagen */
  .info-item {
    flex: 1 1 calc(100% - 66px);
    margin-bottom: 0;
  }

  /* Fila inferior: controles a la izquierda, subtotal a la derecha, sin apretarse */
  .cantidad-control {
    order: 2;
    margin-right: 0;
    padding: 0.35rem;
    gap: 0.75rem;
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

  .subtotal .label {
    display: block;
    font-size: 0.7rem;
    color: var(--texto-secundario);
    margin: 0 0 0.15rem 0;
  }

  .subtotal .valor {
    font-size: 1.05rem;
  }

  /* Botón eliminar cómodo para tocar, arriba a la derecha */
  .btn-eliminar {
    order: 1;
    align-self: flex-start;
    padding: 0.4rem;
    min-width: 34px;
    min-height: 34px;
  }
}

/* MOVIMIENTO REDUCIDO: respeta la preferencia de accesibilidad */
@media (prefers-reduced-motion: reduce) {
  .alerta,
  .item-carrito,
  .btn-pago-mini,
  .btn-cantidad,
  .btn-eliminar,
  .btn-volver-mini {
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
