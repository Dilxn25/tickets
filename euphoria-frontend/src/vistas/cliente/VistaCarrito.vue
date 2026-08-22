<template>
  <div class="contenedor-carrito entrada-cine">
    <!-- Sin orbes decorativos: el fondo es el UNO uniforme de la app, sin
         recuadros ni bordes recortados (se veían como líneas en escritorio) -->
    <div class="carrito-interior">
    <!-- ENCABEZADO -->
    <header class="carrito-hero">
      <div class="hero-fila">
        <h1 class="titulo-vista">Tu pedido</h1>
        <span class="badge-items" :class="{ 'badge-vacio': items.length === 0 }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <template v-if="items.length > 0">
            <Transition name="pop" mode="out-in">
              <span :key="items.length" class="badge-num">{{ items.length }}</span>
            </Transition>
            <span>{{ items.length === 1 ? 'producto' : 'productos' }}</span>
          </template>
          <span v-else>Vacío</span>
        </span>
      </div>
      <p class="hero-sub">Revisa tu pedido y paga con tu billetera.</p>
    </header>


    <!-- Pago exitoso (estado propio: antes el mensaje quedaba oculto al vaciarse el carrito) -->
    <div v-if="mensajeExito" class="carrito-vacio exito-panel superficie textura-grano aparecer-subir">
      <div class="confeti" aria-hidden="true">
        <i v-for="n in 14" :key="n" class="papel" :style="{ '--i': n }"></i>
      </div>
      <div class="icono-vacio-envoltura exito-check">
        <svg class="icono-vacio" viewBox="0 0 24 24" fill="none" stroke="var(--color-exito)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <h2 class="titulo-vacio">¡Pedido pagado!</h2>
      <p>{{ mensajeExito }}</p>
      <p v-if="premioAplicado > 0" class="premio-exito">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
        Premio aplicado: −Bs. {{ formatoMoneda(premioAplicado) }} · Pagaste Bs. {{ formatoMoneda(totalCobrado) }}
      </p>
      <p v-if="cortesiaCanjeada" class="premio-exito">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
        Cortesía incluida: {{ cortesiaCanjeada }} · Bs. {{ formatoMoneda(0) }}
      </p>
      <p class="saldo-exito">Saldo restante: <b>Bs. {{ formatoMoneda(saldo) }}</b></p>
      <RouterLink to="/cliente/catalogo" class="cta-isla brillo-hover">
        <span>Seguir pidiendo</span>
        <span class="cta-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </span>
      </RouterLink>
    </div>

    <!-- Carrito Vacío -->
    <div v-else-if="items.length === 0" class="pedido-vacio aparecer-subir">
      <div class="pv-arte" aria-hidden="true">
        <svg class="pv-copa" viewBox="0 0 120 120" fill="none">
          <defs>
            <linearGradient id="pvGradCopa" x1="24" y1="16" x2="94" y2="102" gradientUnits="userSpaceOnUse">
              <stop stop-color="#A855F7"/>
              <stop offset="1" stop-color="#EC4899"/>
            </linearGradient>
          </defs>
          <!-- Copa martini -->
          <path d="M32 26h56L60 64z" stroke="url(#pvGradCopa)" stroke-width="3.2" stroke-linejoin="round"/>
          <path d="M41 38h38" stroke="url(#pvGradCopa)" stroke-width="2" opacity="0.5" stroke-linecap="round"/>
          <line x1="60" y1="64" x2="60" y2="92" stroke="url(#pvGradCopa)" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M45 96h30" stroke="url(#pvGradCopa)" stroke-width="3.2" stroke-linecap="round"/>
          <!-- Cereza con palillo -->
          <circle cx="75" cy="21" r="4.5" stroke="#F472B6" stroke-width="2.4"/>
          <line x1="73" y1="25.5" x2="66.5" y2="38" stroke="#F472B6" stroke-width="2.4" stroke-linecap="round"/>
          <!-- Chispas -->
          <path class="pv-chispa pv-chispa-a" d="M26 12v8M22 16h8" stroke="#C084FC" stroke-width="2.2" stroke-linecap="round"/>
          <path class="pv-chispa pv-chispa-b" d="M99 42v6M96 45h6" stroke="#F472B6" stroke-width="2" stroke-linecap="round"/>
          <circle class="pv-chispa pv-chispa-c" cx="92" cy="12" r="2" fill="#C084FC"/>
        </svg>
      </div>
      <h2 class="pv-titulo">Tu pedido está vacío</h2>
      <p class="pv-sub">Tragos, combos y más te esperan en el catálogo.</p>
      <RouterLink to="/cliente/catalogo" class="cta-isla brillo-hover pv-cta">
        <span>Ir al catálogo</span>
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
          <span class="lista-conteo">{{ totalItems }} {{ totalItems === 1 ? 'unidad' : 'unidades' }}</span>
        </div>
        <TransitionGroup name="item" tag="div" class="lista-items escalonar">
          <article v-for="item in items" :key="item.linea ?? item.id" class="item-carrito" :class="{ 'item-cortesia': item.cortesia }">
            <!-- Combos: su composición en fotos solapadas, igual que en su tarjeta -->
            <div
              class="item-media"
              :class="{ 'media-combo': (item.imagenes?.length || 0) > 1, 'solapa-3': (item.imagenes?.length || 0) >= 3 }">
              <template v-if="(item.imagenes?.length || 0) > 1">
                <img v-for="(img, j) in item.imagenes.slice(0, 3)" :key="j" :src="img" class="foto-combo" alt="" />
              </template>
              <img v-else-if="item.imagen || item.imagenes?.[0]" :src="item.imagen || item.imagenes[0]" :alt="item.nombre" class="imagen-item" />
              <div v-else class="imagen-item imagen-inicial" aria-hidden="true">{{ (item.nombre || '?')[0] }}</div>
            </div>

            <div class="info-item">
              <h3>{{ item.nombre }}</h3>
              <!-- Línea cortesía: regalo canjeado a Bs 0 (el precio normal va tachado) -->
              <p v-if="item.cortesia" class="precio-unitario">
                <span class="badge-cortesia">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="11" height="11" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                  Cortesía
                </span>
                <s v-if="precioCatalogoCortesia(item) > 0" class="precio-tachado">Bs. {{ formatoMoneda(precioCatalogoCortesia(item)) }}</s>
                <b class="precio-cero">Bs. {{ formatoMoneda(0) }}</b>
              </p>
              <!-- Combo agrupado: el precio vale por el PAQUETE completo; el
                   stepper lleva otro combo entero (no unidades sueltas) -->
              <template v-else-if="item.esComboAgrupado">
                <p class="combo-detalle">{{ (item.productos || []).map(p => `${p.cantidad}× ${p.nombre}`).join(' · ') }}</p>
                <p class="precio-unitario">
                  <span class="badge-combo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="11" height="11" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                    Combo
                  </span>
                  Bs. {{ formatoMoneda(item.precio) }} <span class="por-unidad">por combo</span>
                </p>
              </template>
              <p v-else class="precio-unitario">Bs. {{ formatoMoneda(item.precio) }} <span class="por-unidad">c/u</span></p>
            </div>

            <button class="btn-eliminar" @click="eliminarItem(item)" title="Quitar del pedido" aria-label="Quitar del pedido" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>

            <div class="item-acciones">
              <!-- Cortesía: cantidad fija 1, sin stepper (si la quita puede volver a agregarla) -->
              <span v-if="item.cortesia" class="cortesia-fija">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                1 unidad de regalo
              </span>
              <div v-else class="cantidad-control">
                <button class="btn-cantidad" @click="disminuirCantidad(item)" type="button" aria-label="Disminuir">−</button>
                <Transition name="pop" mode="out-in">
                  <span :key="item.cantidad" class="cantidad">{{ item.cantidad }}</span>
                </Transition>
                <button class="btn-cantidad" @click="aumentarCantidad(item)" type="button" aria-label="Aumentar">+</button>
              </div>

              <div class="subtotal">
                <p class="label">Subtotal</p>
                <p class="valor" :class="{ 'valor-cortesia': item.cortesia }">Bs. {{ formatoMoneda(item.precio * item.cantidad) }}</p>
              </div>
            </div>
          </article>
        </TransitionGroup>

        <!-- Pie de la lista: rellena y equilibra la columna, da confianza al pagar -->
        <div class="lista-pie" aria-hidden="false">
          <div class="pie-item">
            <span class="pie-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
            </span>
            Pago protegido con tu billetera Euphoria.
          </div>
          <div class="pie-item">
            <span class="pie-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </span>
            Preparamos tu pedido apenas confirmes.
          </div>
        </div>
      </div>

      <!-- Resumen destacado -->
      <aside class="resumen-mini">
        <div class="resumen-mini-contenido bezel">
          <div class="bezel-core resumen-core textura-grano">
            <h2 class="resumen-titulo">Resumen</h2>

            <div class="fila-mini">
              <span class="fila-etiqueta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                Unidades
              </span>
              <span>{{ totalItems }}</span>
            </div>
            <div class="fila-mini">
              <span class="fila-etiqueta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                Subtotal
              </span>
              <span>Bs. {{ formatoMoneda(subtotal) }}</span>
            </div>
            <div class="fila-mini fila-saldo">
              <span class="fila-etiqueta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="2" y="6" width="20" height="14" rx="2"></rect>
                  <path d="M2 10h20"></path>
                  <path d="M17 15h.01"></path>
                </svg>
                Tu saldo
              </span>
              <span :class="saldoInsuficiente ? 'saldo-rojo' : 'saldo-verde'">{{ cargandoSaldo ? '…' : 'Bs. ' + formatoMoneda(saldo) }}</span>
            </div>

            <!-- Premio de fidelización (perfil / descuento / cortesía) -->
            <div v-if="premioActivo" class="premio-resumen">
              <div class="premio-fila">
                <span class="premio-etiqueta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                  {{ premioEtiqueta }}
                </span>
                <span v-if="descuentoPremio > 0" class="premio-monto">−Bs. {{ formatoMoneda(descuentoPremio) }}</span>
              </div>
              <div v-if="descuentoPremio > 0" class="premio-fila premio-total">
                <span>Pagarías</span>
                <span>Bs. {{ formatoMoneda(totalConPremio) }}</span>
              </div>
              <!-- Canje de cortesía: el cliente elige recibirla en ESTE pedido (línea a Bs 0) -->
              <button
                v-if="premioTipo?.tipo === 'prod' && premioProducto && !cortesiaEnCarrito"
                type="button" class="btn-canje" @click="agregarCortesia">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                Agregar a este pedido
              </button>
              <span v-else-if="premioTipo?.tipo === 'prod' && cortesiaEnCarrito" class="canje-hecho">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="14" height="14" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
                En tu pedido · Bs. {{ formatoMoneda(0) }}
              </span>
              <p class="premio-nota">{{ premioNota }}</p>
            </div>

            <div class="total-mini">
              <span class="total-etiqueta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Total a pagar
              </span>
              <span class="total-cifra">
                <span class="total-moneda">Bs.</span>{{ formatoMoneda(totalAnimado) }}
              </span>
            </div>

            <!-- Selector de evento: si tiene reserva en varios eventos -->
            <div v-if="tieneReserva && necesitaElegirEvento" class="evento-sel">
              <span class="entrega-lbl">¿Para qué evento es el pedido?</span>
              <div class="evento-chips">
                <button v-for="e in misIngresos" :key="e.id_entrada" type="button" class="ev-chip" :class="{ activo: entradaElegida === e.id_entrada }" @click="entradaElegida = e.id_entrada">
                  {{ e.nombre_evento }}<span v-if="e.mesa"> · Mesa {{ e.mesa }}</span>
                  <span v-if="e.ingresado" class="ev-in">· dentro</span>
                </button>
              </div>
            </div>

            <!-- Entrega: solo cuando YA ingresó al evento -->
            <div v-if="tieneReserva && yaIngreso" class="entrega-mini">
              <span class="entrega-lbl">¿Cómo lo quieres? <em class="entrega-opt">(opcional, también lo eliges luego)</em></span>
              <div class="entrega-tabs">
                <button type="button" class="ent-tab" :class="{ activo: modoEntrega === 'barra' }" @click="modoEntrega = 'barra'">Recojo en barra</button>
                <button type="button" class="ent-tab" :class="{ activo: modoEntrega === 'llevar' }" @click="modoEntrega = 'llevar'">Que me lo lleven</button>
              </div>
            </div>

            <!-- Tiene reserva pero aún no ingresó: puede pagar, elige entrega al entrar -->
            <div v-else-if="tieneReserva && !yaIngreso" class="aviso-ingreso">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>Puedes pagar ahora. Cuando ingreses al evento eliges si <b>recoges en barra</b> o <b>te lo llevan</b> a tu lugar.</span>
            </div>

            <!-- Gate: no tiene reserva en ningún evento -->
            <div v-if="!cargandoIngresos && !tieneReserva" class="gate-evento">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <b>Primero reserva tu lugar</b>
              <p>Con tu reserva lista podrás pedir desde la app.</p>
              <RouterLink to="/cliente/eventos" class="gate-btn">Ver eventos y reservar</RouterLink>
            </div>

            <div class="botones-mini">
              <button v-if="tieneReserva" class="btn-pago-mini cta-isla" @click="irAPagar" :disabled="!puedeComprar || cargandoPago" :title="getRazonDeshabilitado" type="button">
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
              Te falta Bs. {{ formatoMoneda(total - saldo) }} para completar el pago.
              <RouterLink to="/cliente/billetera" class="cta-recargar">Recargar billetera</RouterLink>
            </div>

            <div v-if="errorPago" class="alerta alerta-error">
              {{ errorPago }}
            </div>
          </div>
        </div>
      </aside>
    </div>
    </div><!-- /carrito-interior -->

    <!-- Modal PIN: la billetera protegida pide el PIN también al pagar el carrito -->
    <Teleport to="body">
      <div v-if="pidiendoPin" class="modal-pin-overlay">
        <div class="modal-pin-caja">
          <h3>Confirma con tu PIN</h3>
          <p>Autoriza el pago de Bs. {{ formatoMoneda(total) }} con tu PIN.</p>
          <input
            v-model="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4"
            class="input-pin-carrito" placeholder="••••" @input="pin = pin.replace(/\D/g, '').slice(0, 4)" @keyup.enter="pin.length === 4 && irAPagar()" />
          <p v-if="errorPago" class="pin-error">{{ errorPago }}</p>
          <div class="modal-pin-acciones">
            <button class="btn-pin-cancelar" type="button" @click="cancelarPin">Cancelar</button>
            <button class="btn-pin-ok" type="button" :disabled="cargandoPago || pin.length !== 4" @click="irAPagar">
              {{ cargandoPago ? 'Verificando…' : 'Confirmar pago' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { io } from 'socket.io-client'
import { RouterLink, useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useTiendaCarrito } from '@/tiendas/tienda-carrito.js'
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import { servicioReservas } from '@/servicios-api/servicio-reservas.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { storeToRefs } from 'pinia'
import { formatoMoneda } from '@/utilidades/formato.js'

const router = useRouter()
const tienda = useTiendaAutenticacion()
const tiendaCarrito = useTiendaCarrito()
const { items, subtotal, total, totalItems } = storeToRefs(tiendaCarrito)

const saldo = ref(0)
const qrPublico = ref('')
const cargandoSaldo = ref(true)
const errorCargaSaldo = ref('')
const cargandoPago = ref(false)
const modoEntrega = ref('') // sin preselección: el cliente elige barra/llevar (o lo define luego en Mis pedidos)
const mensajeExito = ref('')
const errorPago = ref('')

// Gate de pago: el cliente solo puede pedir si YA ingresó a un evento.
// Si ingresó a varios, elige a cuál va el pedido.
const misIngresos = ref([])
const cargandoIngresos = ref(true)
const entradaElegida = ref(null)
// El cliente puede PEDIR si tiene reserva; solo elige ENTREGA si ya ingresó.
const tieneReserva = computed(() => misIngresos.value.length > 0)
const necesitaElegirEvento = computed(() => misIngresos.value.length > 1)
const reservaElegida = computed(() => misIngresos.value.find(e => e.id_entrada === entradaElegida.value) || null)
const yaIngreso = computed(() => !!reservaElegida.value?.ingresado)
async function cargarIngresos() {
  cargandoIngresos.value = true
  try {
    misIngresos.value = await servicioReservas.misIngresos()
    if (misIngresos.value.length && !entradaElegida.value) entradaElegida.value = misIngresos.value[0].id_entrada
  } catch { misIngresos.value = [] }
  finally { cargandoIngresos.value = false }
}

// Premio por perfil completo: el backend descuenta un % (con tope) al pagar.
// El % y el tope se leen de la config real (obtenerConfigPremio); si falla,
// caemos a 10% / Bs 50 para no romper el estimado del resumen.
const premioAplicado = ref(0)
const totalCobrado = ref(0)
const premioPct = ref(10)
const premioMax = ref(50)
// Nombre real del producto de cortesía (prod:ID). Se resuelve del catálogo vigente
// porque el backend solo entrega el ID en usuario.premio_perfil (no el nombre).
const premioProdNombre = ref('')
// Producto completo del catálogo para poder CANJEAR la cortesía: al agregarlo
// el store crea una línea aparte a Bs 0 con cantidad fija 1.
const premioProducto = ref(null)
// Nombre de la cortesía ya canjeada en el pago (para el panel de éxito)
const cortesiaCanjeada = ref('')
// Premio activo del cliente: 'pendiente' (perfil), 'desc:N' (descuento fidelización)
// o 'prod:ID' (cortesía de producto, no descuenta dinero). El backend aplica lo mismo.
const premioTipo = computed(() => {
  const p = tienda.usuario?.premio_perfil
  if (!p || p === 'usado') return null
  if (p === 'pendiente') return { tipo: 'perfil' }
  if (p.startsWith('desc:')) return { tipo: 'desc', pct: Math.min(Math.max(parseFloat(p.slice(5)) || 0, 0), 50) }
  if (p.startsWith('prod:')) return { tipo: 'prod', id: parseInt(p.slice(5), 10) || 0 }
  return null
})
const premioActivo = computed(() => !!premioTipo.value && items.value.length > 0)
const premioEtiqueta = computed(() => {
  const pt = premioTipo.value
  if (!pt) return ''
  if (pt.tipo === 'perfil') return `Tienes ${premioPct.value}% de descuento en tu próximo pedido`
  if (pt.tipo === 'desc') return `Tienes ${pt.pct}% de descuento en tu próximo pedido`
  return premioProdNombre.value ? `Cortesía: ${premioProdNombre.value}` : 'Cortesía de producto para ti'
})
const descuentoPremio = computed(() => {
  const pt = premioTipo.value
  if (!pt) return 0
  if (pt.tipo === 'perfil') return Math.min(subtotal.value * (premioPct.value / 100), premioMax.value)
  if (pt.tipo === 'desc') return Math.round(subtotal.value * (pt.pct / 100) * 100) / 100
  return 0 // cortesía de producto: se entrega aparte, no descuenta el total
})
const totalConPremio = computed(() => Math.max(total.value - descuentoPremio.value, 0))
// ¿La cortesía del premio ya está en el carrito como línea de regalo?
const cortesiaEnCarrito = computed(() => {
  const pt = premioTipo.value
  if (pt?.tipo !== 'prod') return false
  return items.value.some(i => i.cortesia && i.id === pt.id)
})
// Nota del bloque de premio según el tipo y si la cortesía ya va en el pedido
const premioNota = computed(() => {
  if (descuentoPremio.value > 0) return 'El descuento se aplica al pagar con tu billetera.'
  if (cortesiaEnCarrito.value) return 'Tu cortesía va en este pedido a Bs. 0.00.'
  if (premioProducto.value) return 'Agrégala a este pedido o pídela al local al atenderte.'
  return 'El local te dará esta cortesía al atenderte.'
})

// Canje de cortesía: el cliente decide recibirla en ESTE pedido. El store crea
// una línea separada a Bs 0 (cantidad fija 1) y el backend valida y cobra 0.
function agregarCortesia() {
  const prod = premioProducto.value
  if (!prod || cortesiaEnCarrito.value) return
  const r = tiendaCarrito.agregarItem({ ...prod, cortesia: true })
  if (r && r.ok === false) errorPago.value = r.mensaje || 'No se pudo agregar la cortesía.'
  else errorPago.value = ''
}

// Precio de catálogo de la línea cortesía (para mostrarlo tachado junto al Bs 0).
// Se lee del campo que guarde el store o, en su defecto, del producto del premio.
function precioCatalogoCortesia(item) {
  const n = Number(item.precio_normal ?? item.precio_original ?? item.precio_base ?? premioProducto.value?.precio_base ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Subtotal y total se manejan en el store directamente

// --- UI: total que "cuenta" al cambiar (solo presentación, no toca la lógica) ---
const totalAnimado = ref(total.value || 0)
let rafTotal = null
function animarTotal(desde, hasta) {
  if (typeof window === 'undefined') { totalAnimado.value = hasta; return }
  const reducirMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducirMovimiento || !Number.isFinite(desde) || !Number.isFinite(hasta)) {
    totalAnimado.value = hasta
    return
  }
  if (rafTotal) cancelAnimationFrame(rafTotal)
  const duracion = 450
  const inicio = performance.now()
  const paso = (t) => {
    const progreso = Math.min((t - inicio) / duracion, 1)
    const suavizado = 1 - Math.pow(1 - progreso, 3)
    totalAnimado.value = desde + (hasta - desde) * suavizado
    if (progreso < 1) rafTotal = requestAnimationFrame(paso)
    else rafTotal = null
  }
  rafTotal = requestAnimationFrame(paso)
}
watch(total, (nuevo, viejo) => animarTotal(viejo ?? 0, nuevo ?? 0))
onBeforeUnmount(() => { if (rafTotal) cancelAnimationFrame(rafTotal) })

const saldoInsuficiente = computed(() => {
  // No consideramos insuficiente el saldo hasta tenerlo cargado
  if (cargandoSaldo.value || errorCargaSaldo.value) return false
  return saldo.value < total.value
})

const puedeComprar = computed(() => {
  return !cargandoSaldo.value && !errorCargaSaldo.value && !saldoInsuficiente.value && items.value.length > 0 && tieneReserva.value
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

// El store identifica cada línea por su clave: linea ?? id (las cortesías van
// en una línea aparte del mismo producto, por eso no basta el id).
function aumentarCantidad(item) {
  const r = tiendaCarrito.aumentarCantidad(item.linea ?? item.id)
  if (r && r.ok === false) errorPago.value = r.mensaje || 'No hay más stock disponible.'
  else errorPago.value = ''
}

function disminuirCantidad(item) {
  tiendaCarrito.disminuirCantidad(item.linea ?? item.id)
  errorPago.value = ''
}

function eliminarItem(item) {
  tiendaCarrito.eliminarItem(item.linea ?? item.id)
}

// PIN de la billetera (si está protegida, el backend lo exige también aquí)
const pidiendoPin = ref(false)
const pin = ref('')
function cancelarPin() {
  pidiendoPin.value = false
  pin.value = ''
  errorPago.value = ''
  cargandoPago.value = false
}

async function irAPagar() {
  if ((!puedeComprar.value && !pidiendoPin.value) || cargandoPago.value) return
  cargandoPago.value = true
  errorPago.value = ''

  try {
    // Reutilizamos el qr_publico obtenido al cargar el saldo para evitar una segunda petición
    if (!qrPublico.value) throw new Error('No se pudo obtener el identificador de la billetera')

    const formData = new FormData()
    formData.append('metodo_pago', 'Billetera')
    formData.append('qr_billetera', qrPublico.value)
    formData.append('id_cliente', tienda.usuario.id)
    if (pidiendoPin.value && pin.value) formData.append('pin', pin.value)

    // Array de productos para el backend: los combos AGRUPADOS se expanden a
    // sus productos reales (cantidad del componente × combos llevados) con el
    // precio con descuento por unidad y el flag 'combo' (el backend lo valida
    // contra el % del config). Las cortesías van con su flag y el resto igual.
    const productosParaBackend = tiendaCarrito.itemsParaCheckout()
    formData.append('productos', JSON.stringify(productosParaBackend))
    formData.append('modo_entrega', modoEntrega.value)
    if (entradaElegida.value) formData.append('id_entrada', entradaElegida.value)

    const resPago = await clienteHttp.post('/comandas/crear', formData)

    // Actualizamos el saldo local con el saldo_restante que responde el backend
    if (resPago && resPago.saldo_restante !== undefined && resPago.saldo_restante !== null) {
      saldo.value = resPago.saldo_restante
    }

    // Premio de perfil completo aplicado por el backend en este pago
    if (resPago && Number(resPago.premio_aplicado) > 0) {
      premioAplicado.value = Number(resPago.premio_aplicado)
      totalCobrado.value = Number(resPago.total_cobrado ?? 0)
      // El premio ya se usó: lo reflejamos en el store local para ocultar la fila del resumen
      if (tienda.usuario) {
        tienda.usuario.premio_perfil = 'usado'
        localStorage.setItem('euphoria_usuario', JSON.stringify(tienda.usuario))
      }
    }

    // Cortesía canjeada en este pedido: el backend ya consumió el premio, lo
    // reflejamos localmente para no volver a ofrecerla (y avisamos en el éxito).
    const lineaCortesia = items.value.find(i => i.cortesia)
    if (lineaCortesia) {
      cortesiaCanjeada.value = lineaCortesia.nombre || premioProdNombre.value || 'tu regalo'
      if (tienda.usuario) {
        tienda.usuario.premio_perfil = 'usado'
        localStorage.setItem('euphoria_usuario', JSON.stringify(tienda.usuario))
      }
    }

    pidiendoPin.value = false
    pin.value = ''
    tiendaCarrito.vaciarCarrito()
    mensajeExito.value = 'Tu pedido pasó a preparación. Te avisamos apenas esté listo.'

  } catch (error) {
    console.error('Error al pagar:', error)
    if (error?.requiere_pin) {
      // La billetera pide PIN: abrimos el modal (o avisamos si fue incorrecto)
      pidiendoPin.value = true
      errorPago.value = error?.error === 'PIN incorrecto' ? 'PIN incorrecto, intenta de nuevo' : ''
      pin.value = ''
    } else {
      errorPago.value = error.error || error.message || 'Error al procesar el pago'
    }
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

// El % y tope del premio salen de la config real; si falla, dejamos 10 / 50.
async function cargarConfigPremio() {
  try {
    const cfg = await servicioBilletera.obtenerConfigPremio()
    const pct = Number(cfg?.pct)
    const max = Number(cfg?.max)
    if (Number.isFinite(pct) && pct > 0) premioPct.value = pct
    if (Number.isFinite(max) && max > 0) premioMax.value = max
  } catch {
    premioPct.value = 10
    premioMax.value = 50
  }
}

async function sincronizarPrecios() {
  try {
    const prods = await clienteHttp.get('/productos')
    const lista = Array.isArray(prods) ? prods : (prods.productos || [])
    const cambio = tiendaCarrito.actualizarPrecios(lista)
    if (cambio) errorPago.value = 'Algunos precios del catálogo cambiaron: tu carrito ya está actualizado.'
    // Si el premio activo es una cortesía de producto, resolvemos su nombre real
    // del catálogo (el backend solo entrega el ID en usuario.premio_perfil) y
    // guardamos el producto completo para poder canjearla (agregarla a Bs 0).
    const pt = premioTipo.value
    if (pt?.tipo === 'prod' && pt.id) {
      const prod = lista.find(x => x.id_producto === pt.id)
      if (prod?.nombre_producto) premioProdNombre.value = prod.nombre_producto
      if (prod) premioProducto.value = prod
    }
  } catch { /* si falla, el backend igual cobra el precio vigente */ }
}

let socketCarrito = null
onMounted(async () => {
  // Saneo: si quedó una línea cortesía de una sesión anterior pero el premio ya
  // no está disponible (o cambió de producto), se retira; el backend la rechazaría.
  const pt = premioTipo.value
  for (const i of [...items.value]) {
    if (i.cortesia && (pt?.tipo !== 'prod' || i.id !== pt.id)) tiendaCarrito.eliminarItem(i.linea ?? i.id)
  }
  await cargarSaldo()
  // Config del premio (estimado del resumen): no bloquea el saldo ni el pago
  cargarConfigPremio()
  // Entradas ingresadas (gate + selector de evento)
  cargarIngresos()
  // Sincronizar los precios del carrito con el catálogo vigente
  // (el backend cobra el precio actual: lo mostrado debe coincidir)
  await sincronizarPrecios()
  // Tiempo real: cambios de premio/descuento o del catálogo se reflejan en el resumen.
  socketCarrito = io({ path: '/socket.io' })
  socketCarrito.on('config_actualizada', (data) => {
    if (data && ('premio_pct' in data || 'premio_max' in data || 'descuento_combos' in data)) {
      cargarConfigPremio(); sincronizarPrecios()
    }
  })
  socketCarrito.on('catalogo_actualizado', () => sincronizarPrecios())
})
onBeforeUnmount(() => { if (socketCarrito) socketCarrito.disconnect() })
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
  /* Fondo único de la app: sin orbes ni texturas que se recorten en bordes.
     El min-height solo aplica en escritorio (layout a dos columnas); en móvil/
     tablet se ajusta al contenido para no dejar un hueco negro grande. */
  padding-bottom: 120px;
}
@media (min-width: 900px) {
  .contenedor-carrito { min-height: calc(100dvh - 180px); }
}

/* Contenido centrado */
.carrito-interior {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
  padding: clamp(1.5rem, 1rem + 2vw, 2.75rem) 1rem 0;
  min-height: inherit;
  display: flex;
  flex-direction: column;
}

/* Orbes ambientales */
.orbe-deco { z-index: 0; }
.orbe-uno {
  width: 460px; height: 460px;
  top: -160px; right: -120px;
  opacity: 0.26;
}
.orbe-dos {
  width: 420px; height: 420px;
  bottom: -60px; left: -180px;
  opacity: 0.2;
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
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
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
.badge-items svg { flex-shrink: 0; }
.badge-num { display: inline-block; min-width: 1ch; text-align: center; }
.badge-vacio { opacity: 0.75; }

/* Contador animado (badge y stepper) */
.pop-enter-active,
.pop-leave-active {
  transition: transform 0.18s var(--ease-rebote), opacity 0.18s ease;
}
.pop-enter-from { transform: translateY(7px) scale(0.6); opacity: 0; }
.pop-leave-to { transform: translateY(-7px) scale(0.6); opacity: 0; }

/* ===== CARRITO VACÍO / ÉXITO ===== */
.carrito-vacio {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: clamp(3rem, 2rem + 4vw, 5.5rem) 2rem;
  border-radius: var(--radio-xl);
  overflow: hidden;
}

/* --- Estado vacío: ilustración + CTA, centrado vertical --- */
.pedido-vacio {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: min(56dvh, 520px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 1rem;
}
.pv-arte {
  position: relative;
  width: 128px;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--esp-4);
}
.pv-arte::before {
  content: '';
  position: absolute;
  inset: -22px;
  border-radius: var(--radio-full);
  background: radial-gradient(circle, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.07) 55%, transparent 72%);
  pointer-events: none;
}
.pv-copa {
  position: relative;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 16px rgba(168, 85, 247, 0.45));
  animation: pvFlotar 4.5s ease-in-out infinite;
}
@keyframes pvFlotar {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
.pv-chispa { animation: pvTitila 2.8s ease-in-out infinite; }
.pv-chispa-b { animation-delay: 0.9s; }
.pv-chispa-c { animation-delay: 1.6s; }
@keyframes pvTitila {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 1; }
}
.pv-titulo {
  margin: 0 0 var(--esp-2);
  font-family: var(--fuente-titulo);
  font-size: clamp(1.35rem, 1.1rem + 1.1vw, 1.7rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--texto-principal);
}
.pv-sub {
  margin: 0 0 var(--esp-5);
  color: var(--texto-secundario);
  font-size: 0.95rem;
  line-height: 1.5;
  max-width: 34ch;
  text-wrap: pretty;
}
.pv-cta {
  text-decoration: none;
  padding: 15px 18px 15px 28px;
  font-size: 1rem;
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

/* --- Estado de éxito celebratorio --- */
.exito-panel {
  border: 1px solid rgba(34, 197, 94, 0.28);
}
.exito-check {
  background: radial-gradient(circle at 50% 32%, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.02) 72%);
  border-color: rgba(34, 197, 94, 0.3);
  animation: latidoExito 1.8s var(--ease-suave) 0.2s 3;
}
.exito-check .icono-vacio {
  animation: brotarCheck 0.6s var(--ease-rebote) 0.1s backwards;
}
@keyframes latidoExito {
  0%, 100% { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 0 rgba(34, 197, 94, 0.35); }
  40% { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 26px rgba(34, 197, 94, 0); }
}
@keyframes brotarCheck {
  from { transform: scale(0.4) rotate(-12deg); opacity: 0; }
  to { transform: scale(1) rotate(0deg); opacity: 1; }
}

/* Confeti CSS (una sola pasada, sin librerías) */
.confeti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
  z-index: 0;
}
.papel {
  position: absolute;
  top: -16px;
  left: calc(2% + var(--i) * 6.6%);
  width: 8px;
  height: 14px;
  border-radius: 2px;
  background: var(--morado-brillante);
  opacity: 0;
  animation: caerConfeti 2.9s ease-in calc(var(--i) * 0.09s) forwards;
}
.papel:nth-child(3n) { background: var(--rosa-acento); width: 7px; height: 11px; }
.papel:nth-child(4n) { background: var(--color-exito); }
.papel:nth-child(5n) { background: #FDE68A; height: 9px; border-radius: 50%; }
@keyframes caerConfeti {
  0% { opacity: 0; transform: translateY(0) rotate(0deg); }
  8% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translateY(min(420px, 70vh)) rotate(560deg); }
}

/* ===== CONTENIDO CARRITO (dos columnas equilibradas y centradas) ===== */
.carrito-contenido {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  grid-template-rows: 1fr;
  align-items: stretch;
  gap: clamp(1.25rem, 0.75rem + 1.5vw, 2rem);
}

.columna-items {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.lista-encabezado {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
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

.lista-conteo {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--texto-desactivado);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.lista-items {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Micro-animaciones de la lista (TransitionGroup) */
.item-move,
.item-enter-active {
  transition: all 0.4s var(--ease-cine);
}
.item-leave-active {
  transition: all 0.32s var(--ease-cine);
  position: absolute;
  left: 0;
  right: 0;
  z-index: 0;
}
.item-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}
.item-leave-to {
  opacity: 0;
  transform: translateX(36px) scale(0.94);
}

/* ---- Item: imagen protagonista + grid fluido ---- */
.item-carrito {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  grid-template-areas: "media info control subtotal eliminar";
  align-items: center;
  gap: var(--esp-4);
  background: linear-gradient(160deg, var(--fondo-tarjeta-alt), var(--fondo-tarjeta));
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-lg);
  padding: 0.9rem 1.05rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 30px rgba(10, 6, 26, 0.4);
  overflow: hidden;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.item-carrito:hover {
  border-color: var(--borde-activo);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 14px 36px rgba(10, 6, 26, 0.5), 0 0 24px rgba(168, 85, 247, 0.14);
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

/* Stepper + subtotal: en escritorio son columnas del grid;
   en móvil se agrupan en su propia fila (ver media query) */
.item-acciones {
  display: contents;
}

.item-media {
  grid-area: media;
  width: 84px;
  height: 84px;
  padding: 3px;
  border-radius: var(--radio-lg);
  background: linear-gradient(140deg, rgba(168, 85, 247, 0.55), rgba(236, 72, 153, 0.35));
  box-shadow: 0 8px 22px rgba(168, 85, 247, 0.22);
  flex-shrink: 0;
}

.imagen-item {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: cover;
  border-radius: calc(var(--radio-lg) - 3px);
}

/* ---- Combos: 2-3 fotos de su composición solapadas (como su tarjeta) ---- */
.item-media.media-combo {
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(95% 95% at 22% 14%, rgba(168, 85, 247, 0.28), transparent 62%),
    radial-gradient(100% 105% at 82% 88%, rgba(236, 72, 153, 0.22), transparent 58%),
    var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 22px rgba(10, 6, 26, 0.35);
}
.foto-combo {
  width: 58%;
  aspect-ratio: 1;
  height: auto;
  flex-shrink: 0;
  border-radius: var(--radio-full);
  object-fit: cover;
  border: 2px solid var(--fondo-tarjeta-alt);
  background: var(--fondo-tarjeta);
  box-shadow: 0 4px 12px rgba(6, 3, 18, 0.5);
}
.foto-combo + .foto-combo { margin-left: -26%; }
.media-combo .foto-combo:nth-child(2) {
  position: relative;
  z-index: 1;
  transform: scale(1.08);
}
.media-combo.solapa-3 .foto-combo { width: 46%; }
.media-combo.solapa-3 .foto-combo + .foto-combo { margin-left: -20%; }

.info-item {
  grid-area: info;
  min-width: 0;
}

.info-item h3 {
  font-family: var(--fuente-titulo);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--texto-principal);
  margin: 0 0 0.3rem 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.precio-unitario {
  color: var(--texto-secundario);
  font-weight: 500;
  font-size: 0.84rem;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.por-unidad {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.cantidad-control {
  grid-area: control;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(10, 6, 26, 0.5);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-full);
  padding: 4px;
  width: max-content;
}

.btn-cantidad {
  background: var(--gradiente-marca);
  border: none;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
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
  display: inline-block;
  min-width: 26px;
  text-align: center;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}

.subtotal {
  grid-area: subtotal;
  text-align: right;
  min-width: 88px;
  white-space: nowrap;
}

.subtotal .label {
  display: block;
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--texto-desactivado);
  margin: 0 0 0.15rem 0;
}

.subtotal .valor {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  color: var(--morado-hover);
  font-size: 1.25rem;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

/* ---- Línea cortesía: regalo canjeado a Bs 0 (filo ámbar + badge) ---- */
.item-cortesia { border-color: rgba(253, 230, 138, 0.32); }
.item-cortesia::before {
  background: linear-gradient(180deg, #F59E0B, #EC4899);
  opacity: 1;
}
.badge-cortesia {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 2px 8px;
  margin-right: 0.4rem;
  border-radius: var(--radio-full);
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(253, 230, 138, 0.4);
  color: #FDE68A;
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  vertical-align: middle;
}
.badge-cortesia svg { flex-shrink: 0; }
/* ---- Línea de combo agrupado: el precio vale por el paquete entero ---- */
.badge-combo {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 2px 8px;
  margin-right: 0.4rem;
  border-radius: var(--radio-full);
  background: rgba(168, 85, 247, 0.16);
  border: 1px solid rgba(192, 132, 252, 0.4);
  color: var(--morado-hover);
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  vertical-align: middle;
}
.badge-combo svg { flex-shrink: 0; }
.combo-detalle {
  margin: 2px 0 4px;
  font-size: 0.74rem;
  color: var(--texto-secundario);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.precio-tachado {
  text-decoration: line-through;
  color: var(--texto-desactivado);
  margin-right: 0.35rem;
}
.precio-cero { color: #FDE68A; font-weight: 800; }
/* Cantidad fija de la cortesía (sin stepper): chip informativo en su lugar */
.cortesia-fija {
  grid-area: control;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: max-content;
  padding: 9px 14px;
  border-radius: var(--radio-full);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(253, 230, 138, 0.3);
  color: #FDE68A;
  font-weight: 700;
  font-size: 0.78rem;
  white-space: nowrap;
}
.cortesia-fija svg { flex-shrink: 0; }
.subtotal .valor.valor-cortesia { color: #FDE68A; }

.btn-eliminar {
  grid-area: eliminar;
  background: transparent;
  border: 1px solid transparent;
  color: var(--texto-secundario);
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radio-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.btn-eliminar:hover {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
}
.btn-eliminar:active { transform: scale(0.9); }
.btn-eliminar:focus-visible {
  outline: none;
  color: var(--color-error);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4);
}

/* ---- Pie de lista: sella y equilibra la columna izquierda ---- */
.lista-pie {
  margin-top: auto;
  padding-top: var(--esp-5);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.pie-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--texto-secundario);
}
.pie-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--radio-full);
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--borde-sutil);
}

/* ===== RESUMEN DESTACADO ===== */
.resumen-mini {
  position: sticky;
  top: 24px;
  align-self: start;
  min-width: 0;
}

.resumen-mini-contenido {
  border-radius: var(--radio-xl);
}

.resumen-core {
  padding: clamp(1.5rem, 1.1rem + 1vw, 2rem);
}

.resumen-titulo {
  margin: 0 0 var(--esp-5);
  font-family: var(--fuente-titulo);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}

.fila-mini {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.92rem;
  color: var(--texto-secundario);
  padding: 0.55rem 0;
}
.fila-mini + .fila-mini {
  border-top: 1px solid var(--borde-sutil);
}
.fila-mini > span:last-child {
  font-variant-numeric: tabular-nums;
  color: var(--texto-principal);
  font-weight: 600;
}

.fila-etiqueta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.fila-etiqueta svg {
  color: var(--morado-hover);
  flex-shrink: 0;
}

/* Total protagonista */
.total-mini {
  margin: var(--esp-5) 0;
  padding: var(--esp-4) var(--esp-4) calc(var(--esp-4) + 2px);
  border-radius: var(--radio-lg);
  background: linear-gradient(150deg, rgba(168, 85, 247, 0.16), rgba(236, 72, 153, 0.1));
  border: 1px solid var(--borde-activo);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 30px rgba(168, 85, 247, 0.18);
}

.total-etiqueta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--morado-hover);
  margin-bottom: 0.4rem;
}
.total-etiqueta svg { flex-shrink: 0; }

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

/* Premio por perfil completo en el resumen */
.evento-sel { margin-bottom: 12px; }
.evento-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.ev-chip { padding: 8px 12px; border-radius: 12px; border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta); color: var(--texto-secundario); font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
.ev-chip.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.14); color: var(--texto-principal); }
.ev-in { color: var(--color-exito); font-weight: 700; }
.aviso-ingreso { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; padding: 12px 14px; border-radius: 12px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); }
.aviso-ingreso svg { flex-shrink: 0; color: #C7D2FE; margin-top: 1px; }
.aviso-ingreso span { font-size: 0.82rem; color: var(--texto-secundario); line-height: 1.45; }
.aviso-ingreso b { color: var(--texto-principal); }
.gate-evento { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 22px 16px; border-radius: 16px; background: rgba(168,85,247,0.06); border: 1px dashed var(--borde-activo); }
.gate-evento svg { color: var(--morado-hover); margin-bottom: 2px; }
.gate-evento b { color: var(--texto-principal); font-size: 1rem; }
.gate-evento p { font-size: 0.82rem; color: var(--texto-secundario); line-height: 1.45; max-width: 40ch; }
.gate-btn { margin-top: 8px; padding: 11px 20px; border-radius: 12px; background: var(--gradiente-marca); color: #fff; font-weight: 700; font-size: 0.86rem; text-decoration: none; }

.premio-resumen {
  margin: var(--esp-5) 0 0;
  padding: 12px 14px;
  border-radius: var(--radio-lg);
  background: linear-gradient(150deg, rgba(245, 158, 11, 0.14), rgba(236, 72, 153, 0.08));
  border: 1px solid rgba(253, 230, 138, 0.4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 20px rgba(245, 158, 11, 0.14);
}
.premio-fila {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.86rem;
  font-variant-numeric: tabular-nums;
}
.premio-etiqueta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  font-weight: 700;
  color: #FDE68A;
  line-height: 1.3;
}
.premio-etiqueta svg { flex-shrink: 0; }
.premio-monto {
  font-weight: 800;
  color: #FDE68A;
  white-space: nowrap;
}
.premio-total {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed rgba(253, 230, 138, 0.3);
  color: var(--texto-secundario);
}
.premio-total span:last-child {
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--texto-principal);
}
.premio-nota {
  margin: 7px 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--texto-desactivado);
}

/* Canje de cortesía: botón compacto dentro del bloque de premio */
.btn-canje {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: var(--radio-full);
  border: 1px solid rgba(253, 230, 138, 0.45);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.24), rgba(236, 72, 153, 0.14));
  color: #FDE68A;
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 6px 16px rgba(245, 158, 11, 0.16);
  transition: transform 0.2s var(--ease-cine), box-shadow 0.2s ease, background 0.2s ease;
}
.btn-canje svg { flex-shrink: 0; }
.btn-canje:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.34), rgba(236, 72, 153, 0.2));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 22px rgba(245, 158, 11, 0.26);
}
.btn-canje:active { transform: scale(0.98); }
.btn-canje:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--fondo-tarjeta), 0 0 0 4px rgba(253, 230, 138, 0.5);
}
/* Cortesía ya agregada: confirmación compacta en el mismo bloque */
.canje-hecho {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 10px;
  padding: 6px 12px;
  border-radius: var(--radio-full);
  background: rgba(34, 197, 94, 0.14);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #86EFAC;
  font-weight: 700;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}
.canje-hecho svg { flex-shrink: 0; }

/* Premio aplicado en el estado de éxito */
.carrito-vacio .premio-exito {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 var(--esp-3);
  padding: 9px 16px;
  border-radius: var(--radio-full);
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(253, 230, 138, 0.4);
  color: #FDE68A;
  font-weight: 700;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.18);
}
.carrito-vacio .premio-exito svg { flex-shrink: 0; }

.botones-mini {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* Selector recoger / llevar (autoservicio del cliente) */
.entrega-mini { margin: 0.9rem 0; }
.entrega-lbl { display: block; font-size: 0.78rem; color: var(--texto-secundario); margin-bottom: 8px; font-weight: 600; }
.entrega-tabs { display: flex; gap: 8px; }
.ent-tab {
  flex: 1; padding: 10px; border-radius: var(--radio-md); cursor: pointer; font-weight: 700; font-size: 0.82rem;
  background: rgba(255,255,255,0.04); border: 1px solid var(--borde-sutil); color: var(--texto-secundario);
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.ent-tab:hover { border-color: var(--borde-activo); color: var(--texto-principal); }
.ent-tab.activo { background: rgba(168,85,247,0.18); border-color: var(--morado-brillante); color: var(--texto-principal); }

/* Botón de pago (CTA isla a ancho completo) */
.btn-pago-mini {
  width: 100%;
  justify-content: space-between;
  padding: 16px 16px 16px 24px;
  font-size: 1.02rem;
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

/* Imagen faltante: inicial del producto (evita el ícono de imagen rota) */
.imagen-inicial {
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fuente-titulo); font-weight: 800; font-size: 1.9rem;
  color: var(--morado-hover); background: var(--fondo-tarjeta-alt);
}
/* Saldo siempre visible en el resumen */
.fila-saldo { border-top: 1px dashed var(--borde-sutil); padding-top: 8px; margin-top: 4px; }
.saldo-verde { color: var(--color-exito) !important; font-weight: 700; }
.saldo-rojo { color: var(--color-error) !important; font-weight: 700; }
.cta-recargar {
  display: inline-block; margin-top: 8px; padding: 7px 14px;
  border-radius: var(--radio-md); background: var(--gradiente-marca);
  color: #fff; font-weight: 700; font-size: 0.82rem; text-decoration: none;
}
.saldo-exito { margin-top: 6px; color: var(--texto-secundario); }
.saldo-exito b { color: var(--color-exito); }
.exito-check svg { stroke: var(--color-exito); }

/* Modal PIN del pago (fondo sólido oscuro, sin blur) */
.modal-pin-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(6, 3, 18, 0.86);
  display: flex; align-items: center; justify-content: center;
  padding: 1.2rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom, 0px));
}
.modal-pin-caja {
  width: 100%; max-width: 360px; padding: 1.6rem;
  max-height: 90dvh; overflow-y: auto;
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl); box-shadow: var(--sombra-modal), 0 0 40px rgba(168, 85, 247, 0.18);
  text-align: center;
  animation: subirEntrada 0.3s var(--ease-cine) both;
}
.modal-pin-caja h3 { font-family: var(--fuente-titulo); font-size: 1.25rem; margin-bottom: 0.4rem; }
.modal-pin-caja p { font-size: 0.85rem; color: var(--texto-secundario); line-height: 1.5; margin-bottom: 1rem; }
.input-pin-carrito {
  width: 140px; max-width: 100%; padding: 12px; text-align: center; letter-spacing: 12px;
  font-size: 1.4rem; font-weight: 800; border-radius: var(--radio-md);
  border: 1px solid var(--borde-sutil); background: var(--fondo-tarjeta-alt); color: var(--texto-principal);
}
.input-pin-carrito:focus { outline: none; border-color: var(--morado-brillante); box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.22); }
.pin-error { margin-top: 10px; color: var(--color-error); font-size: 0.82rem; font-weight: 600; }
.modal-pin-acciones { display: flex; gap: 10px; margin-top: 1.2rem; }
.btn-pin-cancelar {
  flex: 1; padding: 11px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil);
  background: none; color: var(--texto-secundario); font-weight: 600; cursor: pointer;
}
.btn-pin-ok {
  flex: 1.4; padding: 11px; border-radius: var(--radio-md); border: none;
  background: var(--gradiente-marca); color: #fff; font-weight: 700; cursor: pointer;
}
.btn-pin-ok:disabled { opacity: 0.5; cursor: not-allowed; }

.alerta-exito {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-exito);
  border-color: rgba(34, 197, 94, 0.3);
}

/* ===== RESPONSIVE ===== */

/* Escritorio: fila de item con proporciones estables
   (imagen | nombre+precio | stepper | subtotal | eliminar) */
@media (min-width: 1025px) {
  .carrito-contenido {
    grid-template-columns: minmax(0, 1fr) 384px;
    gap: 2rem;
  }
  .item-carrito {
    grid-template-columns: 72px minmax(0, 1fr) auto 116px 40px;
    column-gap: var(--esp-4);
    padding: 0.85rem 1.15rem;
  }
  .item-media {
    width: 72px;
    height: 72px;
  }
  .info-item h3 {
    font-size: 1.02rem;
    -webkit-line-clamp: 1;
  }
  .cantidad-control { padding: 3px; }
  .btn-cantidad {
    width: 34px;
    height: 34px;
    font-size: 1.1rem;
  }
  .cantidad {
    min-width: 24px;
    font-size: 1rem;
  }
  .subtotal { min-width: 116px; }
  .subtotal .valor { font-size: 1.18rem; }
}

/* Tablet: colapsa a una columna, resumen deja de ser sticky y va debajo */
@media (max-width: 1024px) {
  .carrito-contenido {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
  }
  .resumen-mini {
    position: static;
  }
  /* En una sola columna el pie ya no equilibra nada: queda pegado a la lista */
  .lista-pie {
    margin-top: var(--esp-4);
  }
}

/* Item en dos filas: imagen + nombre arriba; stepper y subtotal en su
   propia fila separada por un filo, alineados entre sí */
@media (max-width: 640px) {
  .item-carrito {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      "media info eliminar"
      "acciones acciones acciones";
    row-gap: 0.8rem;
    column-gap: var(--esp-3);
    align-items: center;
  }

  .item-media {
    width: 72px;
    height: 72px;
  }

  .btn-eliminar { align-self: start; }

  .item-acciones {
    grid-area: acciones;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--esp-3);
    min-width: 0;
    border-top: 1px solid var(--borde-sutil);
    padding-top: 0.8rem;
  }

  /* Subtotal en línea: "SUBTOTAL  Bs. 70.00" con baseline alineada */
  .subtotal {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .subtotal .label { margin: 0; }
  .subtotal .valor { font-size: 1.2rem; }
}

/* Móvil chico: márgenes ajustados, todo sigue dentro de 390px */
@media (max-width: 480px) {
  .contenedor-carrito {
    padding: 1rem 0.75rem 110px;
    min-height: auto; /* se ajusta al contenido (evita el hueco negro grande) */
  }
  .carrito-interior { min-height: auto; }

  .item-carrito {
    padding: 0.85rem 0.9rem;
  }

  .item-media {
    width: 66px;
    height: 66px;
  }

  .info-item h3 { font-size: 1rem; }

  .btn-cantidad {
    width: 38px;
    height: 38px;
    font-size: 1.15rem;
  }
  .cantidad { min-width: 22px; font-size: 1rem; }

  .subtotal .valor {
    font-size: 1.15rem;
  }

  .btn-eliminar {
    width: 36px;
    height: 36px;
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
  .efecto-flotar,
  .exito-check,
  .exito-check .icono-vacio,
  .pv-copa,
  .pv-chispa,
  .modal-pin-caja {
    animation: none;
    transition: none;
  }
  .papel { display: none; }
  .item-move,
  .item-enter-active,
  .item-leave-active,
  .pop-enter-active,
  .pop-leave-active {
    transition: none;
  }
  .item-carrito:hover,
  .btn-pago-mini:hover:not(:disabled),
  .btn-cantidad:hover {
    transform: none;
  }
}
</style>
