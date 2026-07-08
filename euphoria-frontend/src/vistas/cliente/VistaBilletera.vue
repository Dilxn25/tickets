<template>
  <div class="contenedor-billetera entrada-cine">
    <!-- Encabezado compacto -->
    <header class="hero-billetera">
      <div class="hero-billetera-contenido">
        <h1 class="titulo-principal-billetera">Mi billetera</h1>
        <p class="hero-billetera-sub">Tu dinero para la noche.</p>
      </div>
    </header>

    <div class="billetera-layout-grid">
      <!-- Columna Izquierda: Tarjeta y Acciones -->
      <div class="panel-izquierdo">
        <!-- TARJETA PRINCIPAL TYPE BILLETERA/CREDITO -->
        <div class="tarjeta-billetera hover-elevar">
          <div class="tarjeta-brillo" aria-hidden="true"></div>
          <!-- Fila Superior -->
          <div class="fila-superior">
            <div class="grupo-saldo">
              <p class="etiqueta-pequena">Saldo disponible</p>
              <p class="valor-grande"><span class="valor-moneda">Bs.</span>{{ formatoMoneda(saldo) }}</p>
            </div>
            <div class="grupo-marca">
              <img src="@/activos/imagenes/logo-euphoria.png" alt="Logotipo de Euphoria" class="img-logo" />
            </div>
          </div>

          <div class="tarjeta-media">
            <span class="chip-tarjeta" aria-hidden="true">
              <span class="chip-lineas"></span>
            </span>
            <span class="tarjeta-wordmark">Euphoria Club · Wallet</span>
          </div>

          <!-- Fila Inferior -->
          <div class="fila-inferior">
            <div class="columna-pin">
              <p class="etiqueta-pequena">PIN transaccional</p>
              <div class="pin-display-flex">
                <button
                  v-if="pinRevelado"
                  class="pin-cajas"
                  type="button"
                  title="Toca para ocultar"
                  @click="ocultarPinRevelado"
                >
                  <span v-for="(digito, i) in pinRevelado.split('')" :key="i" class="pin-caja">{{ digito }}</span>
                  <span class="pin-cuenta" aria-hidden="true">{{ segundosPin }}</span>
                </button>
                <span v-else class="pin-oculto-nuevo">••••</span>
                <button
                  v-if="tienePin && !pinRevelado"
                  class="btn-ojo-pin"
                  type="button"
                  aria-label="Ver mi PIN"
                  title="Ver mi PIN"
                  @click="abrirRevelarPin"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <span class="pin-estado" :class="{ 'pin-estado-activo': tienePin }">{{ tienePin ? 'Configurado' : 'Sin configurar' }}</span>
              </div>
            </div>

            <div class="columna-acciones-tarjeta">
              <button class="btn-pildora" @click="intentarConfigurarPin" type="button">
                {{ tienePin ? 'Cambiar PIN' : 'Configurar PIN' }}
              </button>
              <button class="btn-pildora btn-pildora-resaltado" @click="abrirModalRecarga" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Recargar saldo
              </button>
            </div>
          </div>
        </div>

        <!-- Acciones para Generar QRs (Pago) -->
        <p class="acciones-titulo">Pagar en barra</p>
        <div class="acciones-billetera escalonar">
          <button class="btn-abrir-recarga btn-pagar" @click="mostrarQRRapido('sin_pin')" type="button">
            <span class="qr-tile-icono">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M7 7h.01"></path>
                <path d="M17 7h.01"></path>
                <path d="M7 17h.01"></path>
                <path d="M17 17h.01"></path>
              </svg>
            </span>
            <span class="qr-tile-texto">
              <span class="qr-tile-titulo">QR público</span>
              <span class="qr-tile-sub">Cobro directo</span>
            </span>
          </button>
          <button class="btn-abrir-recarga btn-pagar btn-privado" @click="mostrarQRRapido('con_pin')" type="button">
            <span class="qr-tile-icono">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M7 7h.01"></path>
                <path d="M17 7h.01"></path>
                <path d="M7 17h.01"></path>
                <path d="M17 17h.01"></path>
                <rect x="10" y="10" width="4" height="4" rx="1" ry="1"></rect>
              </svg>
            </span>
            <span class="qr-tile-texto">
              <span class="qr-tile-titulo">QR privado</span>
              <span class="qr-tile-sub">Protegido con PIN</span>
            </span>
          </button>
        </div>

      </div> <!-- Fin Panel Izquierdo -->

      <!-- Columna Derecha: Movimientos -->
      <div class="panel-derecho">
        <section class="seccion-movimientos">
          <div class="movimientos-encabezado">
            <h2>Tus movimientos</h2>
          </div>

          <!-- Skeleton mientras carga -->
          <div v-if="cargandoMovimientos" class="lista-movimientos" aria-hidden="true">
            <div v-for="n in 3" :key="n" class="mov-fila mov-esqueleto">
              <span class="mov-icono"></span>
              <span class="mov-info">
                <span class="esq-linea esq-ancha"></span>
                <span class="esq-linea"></span>
              </span>
            </div>
          </div>

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

          <div v-else class="lista-movimientos escalonar">
            <component
              :is="esConsumoTocable(mov) ? 'button' : 'div'"
              v-for="mov in movimientosVisibles"
              :key="`${mov.tipo}-${mov.id}`"
              class="mov-fila"
              :class="[`mov-${mov.tipo}`, { 'mov-tocable': esConsumoTocable(mov) }]"
              :type="esConsumoTocable(mov) ? 'button' : undefined"
              @click="esConsumoTocable(mov) && abrirDetalleConsumo(mov)"
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
                <span v-if="mov.estado && mov.estado !== 'completada'" :class="['badge', `badge-${mov.estado}`]">{{ mov.estado }}</span>
                <span v-if="esConsumoTocable(mov)" class="mov-ver">Ver detalle
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </span>
            </component>

            <button
              v-if="movimientos.length > LIMITE_MOVIMIENTOS"
              class="btn-ver-todos"
              type="button"
              @click="router.push('/cliente/movimientos')"
            >
              Ver todos ({{ movimientos.length }})
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </section>
      </div> <!-- Fin Panel Derecho -->
    </div> <!-- Fin Billetera Layout Grid -->

    <!-- MODAL CAMBIAR PIN -->
    <Teleport to="body">
    <div v-if="modalCambiarPin" class="modal-overlay" @click.self="abrirModalCambiarPin">
      <div class="modal-cambiar-pin">
        <div class="modal-header">
          <h2>{{ tienePin ? 'Cambiar PIN transaccional' : 'Configurar PIN transaccional' }}</h2>
          <button class="btn-cerrar" @click="abrirModalCambiarPin" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="tienePin" class="campo-pin">
            <label>PIN actual</label>
            <div class="input-pin-wrapper">
              <input
                v-model="pinActual"
                :type="mostrarPinActual ? 'text' : 'password'"
                placeholder="0000"
                maxlength="4"
                inputmode="numeric"
                pattern="[0-9]*"
                @keypress="soloNumeros"
                class="input-pin"
              />
              <button class="btn-ojo-input" @click="mostrarPinActual = !mostrarPinActual" type="button" title="Mostrar/ocultar PIN">
                <svg v-if="mostrarPinActual" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              </button>
            </div>
          </div>
          <div class="campo-pin">
            <label>Nuevo PIN (4 dígitos)</label>
            <div class="input-pin-wrapper">
              <input
                v-model="nuevoPin"
                :type="mostrarNuevoPin ? 'text' : 'password'"
                placeholder="0000"
                maxlength="4"
                inputmode="numeric"
                pattern="[0-9]*"
                @keypress="soloNumeros"
                class="input-pin"
              />
              <button class="btn-ojo-input" @click="mostrarNuevoPin = !mostrarNuevoPin" type="button" title="Mostrar/ocultar PIN">
                <svg v-if="mostrarNuevoPin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              </button>
            </div>
          </div>
          <div class="campo-pin">
            <label>Confirmar PIN</label>
            <div class="input-pin-wrapper">
              <input
                v-model="confirmarPin"
                :type="mostrarConfirmarPin ? 'text' : 'password'"
                placeholder="0000"
                maxlength="4"
                inputmode="numeric"
                pattern="[0-9]*"
                @keypress="soloNumeros"
                class="input-pin"
              />
              <button class="btn-ojo-input" @click="mostrarConfirmarPin = !mostrarConfirmarPin" type="button" title="Mostrar/ocultar PIN">
                <svg v-if="mostrarConfirmarPin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              </button>
            </div>
          </div>
          <p v-if="errorPin" class="error-mensaje">{{ errorPin }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" @click="abrirModalCambiarPin" type="button">Cancelar</button>
          <button class="btn-guardar" @click="guardarPin" :disabled="!puedoGuardarPin" type="button">
            Guardar PIN
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- MODAL VER PIN (ojito con contraseña) -->
    <Teleport to="body">
      <div v-if="modalRevelarPin" class="modal-overlay" @click.self="cerrarRevelarPin">
        <div class="modal-ver-pin" role="dialog" aria-modal="true" aria-label="Ver mi PIN">
          <div class="verpin-candado" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 class="verpin-titulo">Ver mi PIN</h2>
          <p class="verpin-sub">Confirma tu contraseña.</p>

          <div class="input-pin-wrapper">
            <input
              v-model="passwordRevelar"
              :type="mostrarPasswordRevelar ? 'text' : 'password'"
              placeholder="Tu contraseña"
              aria-label="Contraseña de tu cuenta"
              autocomplete="current-password"
              class="input-pin input-password"
              @keyup.enter="confirmarRevelarPin"
            />
            <button class="btn-ojo-input" @click="mostrarPasswordRevelar = !mostrarPasswordRevelar" type="button" title="Mostrar/ocultar contraseña">
              <svg v-if="mostrarPasswordRevelar" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            </button>
          </div>

          <p v-if="errorRevelar" class="error-mensaje verpin-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ errorRevelar }}
          </p>
          <button v-if="requiereReconfigurar" class="btn-guardar btn-reconfigurar" type="button" @click="irAReconfigurarPin">
            Configurar un PIN nuevo
          </button>

          <div class="verpin-acciones">
            <button class="btn-cancelar" @click="cerrarRevelarPin" type="button">Cancelar</button>
            <button class="btn-guardar" @click="confirmarRevelarPin" :disabled="!passwordRevelar || revelandoPin" type="button">
              {{ revelandoPin ? 'Verificando…' : 'Ver PIN' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
    </Teleport>

    <!-- MODAL RECARGAR SALDO -->
    <Teleport to="body">
    <div v-if="modalRecarga" class="modal-overlay" @click.self="abrirModalRecarga">
      <div class="modal-recarga">
        <div class="modal-header">
          <h2>Recargar saldo</h2>
          <button class="btn-cerrar" @click="abrirModalRecarga" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p v-if="sinBilletera" class="nota-primera-recarga">
            Esta será tu primera recarga: tu billetera se creará automáticamente al completarla.
          </p>
          <!-- QR Predeterminado -->
          <div class="info-recarga-paso"><span class="num-paso">1</span> Escanea el QR para transferir</div>
          <div class="subseccion-qr-predeterminado">
            <div class="contenedor-qr-default">
              <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="Código QR para transferir el pago a Euphoria" class="qr-imagen" />
              <button class="btn-ampliar-qr" @click="ampliarQRDefault" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                Ver grande
              </button>
            </div>
          </div>

          <!-- Monto Input -->
          <div class="info-recarga-paso"><span class="num-paso">2</span> Ingresa el monto transferido</div>
          <div class="campo-monto">
            <div class="montos-rapidos">
              <button
                v-for="m in MONTOS_RAPIDOS"
                :key="m"
                type="button"
                class="chip-monto"
                :class="{ activo: montoIngresado === m }"
                :disabled="procesandoOCR || !!archivoComprobante"
                @click="usarMontoRapido(m)"
              >
                Bs. {{ m }}
              </button>
            </div>
            <div class="input-monto" :class="{ 'input-monto-error': errorMonto, 'input-monto-valido': montoIngresado >= 10 && !errorMonto, 'input-monto-bloqueado': procesandoOCR || !!archivoComprobante }">
              <span class="prefijo">Bs.</span>
              <input
                v-model.number="montoIngresado"
                type="number"
                inputmode="decimal"
                placeholder="50"
                min="10"
                max="100000"
                step="0.01"
                :disabled="procesandoOCR || !!archivoComprobante"
                @blur="validarMonto"
                class="input-field"
              />
              <svg v-if="montoIngresado >= 10 && !errorMonto" class="icono-check-valido" width="24" height="24" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <p v-if="errorMonto" class="error-mensaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMonto }}
            </p>
          </div>

          <!-- Subir Comprobante -->
          <div class="info-recarga-paso"><span class="num-paso">3</span> Sube tu comprobante para validarlo</div>
          <div class="campo-comprobante">
            <div v-if="!archivoComprobante" class="opciones-comprobante">
              <button type="button" class="btn-opcion-comprobante" :disabled="procesandoOCR" @click="triggerUpload">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span>Subir imagen</span>
              </button>
              <button type="button" class="btn-opcion-comprobante" :disabled="procesandoOCR" @click="abrirCamara">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>Tomar foto</span>
              </button>
            </div>

            <div v-else class="vista-previa-comprobante">
              <div class="info-archivo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="stroke: var(--morado-brillante)" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="nombre-archivo">{{ archivoComprobante.name }}</span>
              </div>
              <button class="btn-eliminar-archivo" @click="limpiarArchivo" type="button" title="Eliminar archivo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <input
              ref="inputFile"
              type="file"
              accept="image/*"
              @change="cargarComprobante"
              class="input-file-hidden"
            />

            <!-- OCR Processing -->
            <div v-if="procesandoOCR" class="estado-ocr">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
              <p>Validando comprobante...</p>
            </div>
            <p v-if="ocrExitoso" class="exito-mensaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Comprobante validado correctamente
            </p>
            <p v-if="errorOCR" class="warning-mensaje">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {{ errorOCR }}
            </p>
          </div>

          <!-- Fin Subir Comprobante -->
        </div>
      </div>
    </div>
    </Teleport>

    <!-- CÁMARA PARA FOTOGRAFIAR EL COMPROBANTE -->
    <Teleport to="body">
      <div v-if="camaraAbierta" class="camara-overlay">
        <video ref="videoCamara" class="camara-video" autoplay playsinline muted></video>
        <div class="camara-guia">
          <div class="guia-marco" aria-hidden="true">
            <span class="guia-esquina ge-tl"></span>
            <span class="guia-esquina ge-tr"></span>
            <span class="guia-esquina ge-bl"></span>
            <span class="guia-esquina ge-br"></span>
          </div>
          <p class="guia-texto">Encuadra tu comprobante aquí</p>
        </div>
        <div class="camara-controles">
          <button type="button" class="btn-camara-cancelar" @click="cerrarCamara">Cancelar</button>
          <button type="button" class="btn-capturar" aria-label="Capturar foto" @click="capturarFoto">
            <span class="btn-capturar-interno" aria-hidden="true"></span>
          </button>
          <span class="camara-espaciador" aria-hidden="true"></span>
        </div>
      </div>
    </Teleport>

    <!-- QR A PANTALLA COMPLETA (fondo blanco, brillo alto para el escáner) -->
    <Teleport to="body">
      <div v-if="qrAmpliado" class="qr-fullscreen" @click="qrAmpliado = null">
        <p class="qr-fs-titulo">{{ tituloQRAmpliado }}</p>
        <img
          v-if="qrAmpliado === 'sin_pin'"
          :src="datosQR.qr_sin_pin.imagen"
          alt="Código QR de pago público ampliado"
          class="qr-fs-img"
        />
        <img
          v-else-if="qrAmpliado === 'con_pin'"
          :src="datosQR.qr_con_pin.imagen"
          alt="Código QR de pago privado ampliado"
          class="qr-fs-img"
        />
        <img
          v-else
          src="@/activos/imagenes/QRPago euphoria.jpeg"
          alt="Código QR de pago a Euphoria ampliado"
          class="qr-fs-img"
        />
        <p v-if="identificadorQRAmpliado" class="qr-fs-codigo">ID: {{ identificadorQRAmpliado }}</p>
        <p class="qr-fs-hint">Toca para cerrar</p>
      </div>
    </Teleport>

    <!-- MODAL ÉXITO -->
    <Teleport to="body">
    <div v-if="modalExito" class="modal-overlay" @click.self="modalExito = false">
      <div class="modal-detalles modal-exito">
        <div class="icono-exito">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 style="color: white; margin-top: 1rem;">{{ tituloExito }}</h2>
        <p style="color: var(--texto-secundario); margin: 1rem 0;">{{ mensajeExito }}</p>
        <button class="btn-pildora" @click="modalExito = false" type="button" style="margin-top: 1rem; width: 100%;">
          Entendido
        </button>
      </div>
    </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
import { servicioBilletera } from '@/servicios-api/servicio-billetera.js'
import clienteHttp from '@/servicios-api/cliente-http.js'

const router = useRouter()
const tienda = useTiendaAutenticacion()
const notif = useNotificaciones()
const usuario = computed(() => tienda.usuario?.nombre || 'Cliente')

// Estado billetera
const saldo = ref(0)
// Nunca guardamos ni mostramos el PIN en claro. Solo reflejamos si existe.
const tienePin = ref(false)
const sinBilletera = ref(false)
const generandoQR = ref(false)
const modalExito = ref(false)
const tituloExito = ref('Operación exitosa')
const mensajeExito = ref('')
let socketBilletera = null

// Modal cambiar PIN
const modalCambiarPin = ref(false)
const pinActual = ref('')
const nuevoPin = ref('')
const confirmarPin = ref('')
const errorPin = ref('')
const mostrarPinActual = ref(false)
const mostrarNuevoPin = ref(false)
const mostrarConfirmarPin = ref(false)

// Modal Recargar
const modalRecarga = ref(false)
const montoIngresado = ref('')
const errorMonto = ref('')
const archivoComprobante = ref(null)
const procesandoOCR = ref(false)
const comprobanteProcesado = ref(false)
const ocrExitoso = ref(false)
const errorOCR = ref('')
const inputFile = ref(null)
const urlComprobanteGenerado = ref('')

function triggerUpload() {
  if (inputFile.value) {
    inputFile.value.click()
  }
}

// ===== OJITO DEL PIN: revelar con contraseña (con ticket de 5 minutos) =====
const modalRevelarPin = ref(false)
const passwordRevelar = ref('')
const mostrarPasswordRevelar = ref(false)
const errorRevelar = ref('')
const requiereReconfigurar = ref(false)
const revelandoPin = ref(false)
// El PIN revelado vive solo en memoria unos segundos y se limpia al salir.
const pinRevelado = ref('')
const segundosPin = ref(0)
let intervaloPin = null

// Ticket temporal: mientras viva (5 min en backend, 4.5 aquí por margen),
// el ojito muestra el PIN directo sin volver a pedir la contraseña.
const CLAVE_TICKET_PIN = 'euphoria_ticket_pin'

function ticketPinVigente() {
  try {
    const datos = JSON.parse(sessionStorage.getItem(CLAVE_TICKET_PIN) || 'null')
    if (datos?.ticket && Number(datos.hasta) > Date.now()) return datos.ticket
  } catch (e) { /* valor corrupto: se descarta */ }
  sessionStorage.removeItem(CLAVE_TICKET_PIN)
  return null
}

function guardarTicketPin(ticket) {
  if (!ticket) return
  sessionStorage.setItem(CLAVE_TICKET_PIN, JSON.stringify({ ticket, hasta: Date.now() + 4.5 * 60 * 1000 }))
}

// Éxito compartido (contraseña o ticket): guarda el ticket nuevo y muestra el PIN.
function aplicarPinRevelado(res) {
  guardarTicketPin(res?.ticket)
  pinRevelado.value = String(res?.pin ?? '')
  segundosPin.value = 10
  if (intervaloPin) clearInterval(intervaloPin)
  intervaloPin = setInterval(() => {
    segundosPin.value -= 1
    if (segundosPin.value <= 0) ocultarPinRevelado()
  }, 1000)
}

function abrirModalPassword() {
  modalRevelarPin.value = true
  passwordRevelar.value = ''
  errorRevelar.value = ''
  requiereReconfigurar.value = false
  mostrarPasswordRevelar.value = false
}

// Toque del ojito: si hay ticket vigente se muestra directo; si no, contraseña.
async function abrirRevelarPin() {
  if (revelandoPin.value) return
  const ticket = ticketPinVigente()
  if (ticket) {
    revelandoPin.value = true
    try {
      const res = await servicioBilletera.revelarPin({ ticket })
      if (res?.requiere_reconfigurar) {
        abrirModalPassword()
        requiereReconfigurar.value = true
        errorRevelar.value = res.mensaje || res.error || 'Tu PIN no puede mostrarse. Configúralo de nuevo para poder verlo.'
        return
      }
      aplicarPinRevelado(res)
      return
    } catch (error) {
      // Ticket vencido o inválido: se limpia y se pide la contraseña.
      sessionStorage.removeItem(CLAVE_TICKET_PIN)
      console.error('Ticket de PIN no aceptado:', error)
    } finally {
      revelandoPin.value = false
    }
  }
  abrirModalPassword()
}

function cerrarRevelarPin() {
  modalRevelarPin.value = false
  passwordRevelar.value = ''
  errorRevelar.value = ''
  requiereReconfigurar.value = false
}

async function confirmarRevelarPin() {
  if (!passwordRevelar.value || revelandoPin.value) return
  revelandoPin.value = true
  errorRevelar.value = ''
  try {
    const res = await servicioBilletera.revelarPin({ password: passwordRevelar.value })
    // Algunos backends responden 200 con el flag; se cubre igual que el error.
    if (res?.requiere_reconfigurar) {
      requiereReconfigurar.value = true
      errorRevelar.value = res.mensaje || res.error || 'Tu PIN no puede mostrarse. Configúralo de nuevo para poder verlo.'
      return
    }
    aplicarPinRevelado(res)
    cerrarRevelarPin()
  } catch (error) {
    if (error?.requiere_reconfigurar) {
      requiereReconfigurar.value = true
      errorRevelar.value = error.error || 'Tu PIN no puede mostrarse. Configúralo de nuevo para poder verlo.'
    } else {
      errorRevelar.value = error?.error || 'Contraseña incorrecta. Inténtalo de nuevo.'
    }
    console.error('Error revelando PIN:', error)
  } finally {
    revelandoPin.value = false
  }
}

function ocultarPinRevelado() {
  pinRevelado.value = ''
  segundosPin.value = 0
  if (intervaloPin) {
    clearInterval(intervaloPin)
    intervaloPin = null
  }
}

function irAReconfigurarPin() {
  cerrarRevelarPin()
  abrirModalCambiarPin()
}

// ===== MOVIMIENTOS (recargas + consumos + reservas) =====
const movimientos = ref([])
const cargandoMovimientos = ref(true)

// Solo se muestran los primeros 5; "Ver todos (N)" abre /cliente/movimientos.
const LIMITE_MOVIMIENTOS = 5
const movimientosVisibles = computed(() => movimientos.value.slice(0, LIMITE_MOVIMIENTOS))

async function cargarMovimientos() {
  try {
    const res = await servicioBilletera.obtenerMovimientos()
    movimientos.value = res?.movimientos || []
  } catch (error) {
    console.error('Error cargando movimientos:', error)
  } finally {
    cargandoMovimientos.value = false
  }
}

function esConsumoTocable(mov) {
  return mov.tipo === 'consumo' && !!mov.id_comanda
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

// QR
const qrAmpliado = ref(null)
const datosQR = ref({
  qr_sin_pin: { identificador: '', imagen: '' },
  qr_con_pin: { identificador: '', imagen: '' }
})

const tituloQRAmpliado = computed(() => {
  if (qrAmpliado.value === 'sin_pin') return 'QR público · Cobro directo'
  if (qrAmpliado.value === 'con_pin') return 'QR privado · Protegido con PIN'
  return 'QR de recarga Euphoria'
})

const identificadorQRAmpliado = computed(() => {
  if (qrAmpliado.value === 'sin_pin') return datosQR.value.qr_sin_pin.identificador
  if (qrAmpliado.value === 'con_pin') return datosQR.value.qr_con_pin.identificador
  return ''
})

// Abrir Modal Recarga
function abrirModalRecarga() {
  modalRecarga.value = !modalRecarga.value
  if (!modalRecarga.value) {
    limpiarFormularioRecarga()
  }
}

function limpiarFormularioRecarga() {
  montoIngresado.value = ''
  errorMonto.value = ''
  archivoComprobante.value = null
  comprobanteProcesado.value = false
  ocrExitoso.value = false
  errorOCR.value = ''
}

// Montos rápidos de recarga
const MONTOS_RAPIDOS = [50, 100, 200, 500]
function usarMontoRapido(monto) {
  if (procesandoOCR.value || archivoComprobante.value) return
  montoIngresado.value = monto
  errorMonto.value = ''
}

// Validar monto
function validarMonto() {
  errorMonto.value = ''
  if (!montoIngresado.value) return

  let monto = parseFloat(montoIngresado.value)
  if (isNaN(monto)) {
    errorMonto.value = 'Debe ser un número válido'
    return
  }
  if (monto < 10) {
    errorMonto.value = 'Mínimo Bs. 10'
    return
  }
  if (monto > 100000) {
    errorMonto.value = 'Máximo Bs. 100,000'
    return
  }

  // Mantener montoIngresado siempre como número (v-model.number). El formateo con
  // dos decimales es solo para presentación, no se reasigna al modelo.
  montoIngresado.value = Math.floor(monto * 100) / 100
}

// Validar entrada de PIN (solo números)
function soloNumeros(e) {
  if (!/[0-9]/.test(e.key)) {
    e.preventDefault()
  }
}

// El PIN vive en la billetera: si aún no existe (se crea con la primera recarga),
// el backend rechazaría el POST /pin, así que se guía al usuario antes de abrir el modal.
function intentarConfigurarPin() {
  if (sinBilletera.value) {
    notif.advertencia('Tu billetera se crea con tu primera recarga. Recarga saldo y luego configura tu PIN.')
    return
  }
  abrirModalCambiarPin()
}

// Abrir/cerrar modal cambiar PIN
function abrirModalCambiarPin() {
  modalCambiarPin.value = !modalCambiarPin.value
  if (!modalCambiarPin.value) {
    pinActual.value = ''
    nuevoPin.value = ''
    confirmarPin.value = ''
    errorPin.value = ''
  }
}

// Validar y guardar PIN
const puedoGuardarPin = computed(() => {
  if (!nuevoPin.value || !confirmarPin.value) return false
  if (tienePin.value && pinActual.value.length !== 4) return false
  if (nuevoPin.value.length !== 4 || confirmarPin.value.length !== 4) return false
  if (!/^\d+$/.test(nuevoPin.value)) return false
  if (nuevoPin.value !== confirmarPin.value) {
    errorPin.value = 'Los PINs no coinciden'
    return false
  }
  errorPin.value = ''
  return true
})

async function guardarPin() {
  if (!puedoGuardarPin.value) return

  try {
    await servicioBilletera.actualizarPin(nuevoPin.value, tienePin.value ? pinActual.value : undefined)
    // No persistimos el PIN en claro; solo marcamos que ya existe uno configurado.
    tienePin.value = true
    abrirModalCambiarPin()

    // Mostrar modal de éxito
    tituloExito.value = 'PIN actualizado'
    mensajeExito.value = 'Tu PIN transaccional ha sido actualizado con éxito.'
    modalExito.value = true
  } catch (error) {
    // requiere_pin_actual: el backend exige el PIN vigente para poder cambiarlo.
    if (error?.requiere_pin_actual && !tienePin.value) tienePin.value = true
    errorPin.value = error.error || 'Error al guardar el PIN en el servidor'
    console.error(error)
  }
}

// Cargar comprobante
function cargarComprobante(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorOCR.value = 'Solo se aceptan imágenes'
    return
  }

  // Forzar la validación del monto aunque el usuario no haya salido del input (@blur)
  validarMonto()

  if(!montoIngresado.value || errorMonto.value) {
    errorOCR.value = 'Ingresa un monto válido primero'
    return
  }

  archivoComprobante.value = file
  procesarOCR(file)
}

// ===== TOMAR FOTO AL COMPROBANTE (cámara trasera) =====
const camaraAbierta = ref(false)
const videoCamara = ref(null)
let streamCamara = null

async function abrirCamara() {
  if (procesandoOCR.value || camaraAbierta.value) return

  // Mismo camino que subir archivo: primero un monto válido.
  validarMonto()
  if (!montoIngresado.value || errorMonto.value) {
    errorOCR.value = 'Ingresa un monto válido primero'
    return
  }
  errorOCR.value = ''

  // Sin cámara disponible (permiso, hardware o contexto no seguro): respaldo con archivos.
  if (!navigator.mediaDevices?.getUserMedia) {
    notif.advertencia('No pudimos abrir la cámara en este dispositivo. Elige la foto desde tus archivos.')
    triggerUpload()
    return
  }

  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    })
    camaraAbierta.value = true
    await nextTick()
    if (videoCamara.value) {
      videoCamara.value.srcObject = streamCamara
    } else {
      cerrarCamara()
    }
  } catch (error) {
    console.error('Error abriendo la cámara:', error)
    cerrarCamara()
    notif.advertencia('No pudimos abrir la cámara. Elige la foto desde tus archivos.')
    triggerUpload()
  }
}

function cerrarCamara() {
  if (streamCamara) {
    streamCamara.getTracks().forEach(t => t.stop())
    streamCamara = null
  }
  camaraAbierta.value = false
}

function capturarFoto() {
  const video = videoCamara.value
  if (!video || !video.videoWidth) return

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)

  canvas.toBlob((blob) => {
    cerrarCamara()
    if (!blob) {
      notif.error('No se pudo capturar la foto. Inténtalo de nuevo.')
      return
    }
    // La foto sigue EXACTAMENTE el mismo camino que un archivo elegido.
    const file = new File([blob], 'comprobante-foto.jpg', { type: 'image/jpeg' })
    archivoComprobante.value = file
    procesarOCR(file)
  }, 'image/jpeg', 0.92)
}

// Limpiar el archivo subido si hubo un error o seleccionó mal
function limpiarArchivo() {
  archivoComprobante.value = null
  comprobanteProcesado.value = false
  ocrExitoso.value = false
  errorOCR.value = ''
  if (inputFile.value) {
    inputFile.value.value = ''
  }
}

// Procesar OCR (simulado como antes, integrando la interfaz)
async function procesarOCR(file) {
  procesandoOCR.value = true
  errorOCR.value = ''
  ocrExitoso.value = false

  try {
    const formData = new FormData()
    formData.append('comprobante', file)
    formData.append('monto_esperado', montoIngresado.value)

    const res = await clienteHttp.post('/comandas/validar-comprobante', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.valido) {
      ocrExitoso.value = true
      comprobanteProcesado.value = true
      urlComprobanteGenerado.value = res.url_comprobante
      procesandoOCR.value = false // Liberar flag antes de llamar a completar

      // Llamar a completar recarga automáticamente tras validación exitosa
      await completarRecarga()
    } else {
      // El backend respondió 200 pero el comprobante no es válido (ilegible o monto no coincide).
      // limpiarArchivo() resetea errorOCR, por eso se asigna el mensaje después.
      limpiarArchivo()
      errorOCR.value = res.mensaje || res.error || 'El comprobante no pudo validarse. Verifica el monto e inténtalo de nuevo.'
    }
  } catch (error) {
    console.error('Error en OCR:', error)
    // limpiarArchivo() resetea errorOCR, por eso se asigna el mensaje después;
    // sin esto el input queda "ocupado" y no se puede reintentar con el mismo archivo.
    const mensaje = error.response?.data?.error || error.error || 'No se pudo validar el comprobante mediante IA'
    limpiarArchivo()
    errorOCR.value = mensaje
  } finally {
    procesandoOCR.value = false
  }
}

// Validar si puede recargar
const puedeRecargar = computed(() => {
  return (
    montoIngresado.value >= 10 &&
    montoIngresado.value <= 100000 &&
    archivoComprobante.value &&
    ocrExitoso.value &&
    !procesandoOCR.value
  )
})

// Completar Recarga Directa
async function completarRecarga() {
  if (!puedeRecargar.value) return

  try {
    const res = await servicioBilletera.iniciarRecarga(parseFloat(montoIngresado.value), urlComprobanteGenerado.value)
    saldo.value = res.saldo_nuevo
    sinBilletera.value = false
    await cargarMovimientos()
    modalRecarga.value = false

    // Mostrar modal en vez de alert
    tituloExito.value = 'Recarga completada'
    mensajeExito.value = `Tu nuevo saldo es Bs. ${res.saldo_nuevo.toFixed(2)}`
    modalExito.value = true
  } catch (error) {
    errorMonto.value = 'Error al completar la recarga.'
    console.error(error)
  }
}

// Mostrar QR Rápido (Pago)
async function mostrarQRRapido(tipo) {
  if (sinBilletera.value) {
    notif.advertencia('Aún no tienes billetera: se crea con tu primera recarga de saldo.')
    return
  }
  if (generandoQR.value) return
  generandoQR.value = true
  try {
    const res = await servicioBilletera.generarQRsPago()

    // Mostrar el identificador real (qr_publico) sin acortarlo ni alterarlo:
    // es el valor exacto que el cajero busca en la BD, cualquier transformación rompe el match.
    datosQR.value = res
    qrAmpliado.value = tipo
  } catch (error) {
    console.error('Error generando QRs:', error)
    notif.error('Error al generar los QRs de pago')
  } finally {
    generandoQR.value = false
  }
}

function ampliarQRDefault() {
  qrAmpliado.value = 'default'
}

// Cargar saldo
async function cargarSaldo() {
  try {
    const res = await servicioBilletera.obtenerSaldo()
    saldo.value = res.saldo_actual || 0
    sinBilletera.value = !!res.sin_billetera
    // Requiere que el backend exponga el flag booleano tiene_pin en GET /saldo.
    if (res.tiene_pin !== undefined) {
      tienePin.value = !!res.tiene_pin
    }
  } catch (error) {
    console.error('Error cargando saldo:', error)
  }
}

// Formato moneda
function formatoMoneda(valor) {
  return parseFloat(valor).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Monto de movimiento con signo (+ recargas / − consumos y reservas)
function formatoMonto(monto) {
  const n = Number(monto) || 0
  return `${n > 0 ? '+' : n < 0 ? '−' : ''} Bs. ${formatoMoneda(Math.abs(n))}`
}

// Formato fecha (fecha y hora por separado, criterio global del proyecto)
function formatoFecha(fecha) {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('es-BO')} · ${d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`
}

onMounted(async () => {
  await cargarSaldo()
  await cargarMovimientos()

  // Conectar WebSocket para sincronización en tiempo real
  socketBilletera = io() // Por defecto usa el mismo host/puerto y la ruta de vite se encarga del proxy

  socketBilletera.on('billetera_actualizada', async (datos) => {
    if (datos.id_usuario === tienda.usuario?.id) {
      // El evento ya no trae el saldo (privacidad); se consulta autenticado.
      await cargarSaldo()
      await cargarMovimientos()
    }
  })
})

onUnmounted(() => {
  if (socketBilletera) {
    socketBilletera.disconnect()
  }
  ocultarPinRevelado()
  cerrarCamara()
})
</script>

<style scoped>
/* Alias locales mapeados a la paleta global Euphoria (variables.css).
   Se definen en el contenedor raiz para que hereden a todos los hijos. */
.contenedor-billetera {
  --azul-profundo:   var(--rosa-acento);
  --verde-fresco:    var(--color-exito);
  --rojo-suave:      var(--color-error);
  --fondo-principal: var(--fondo-app);
  --borde-color:     var(--borde-sutil);
}

.contenedor-billetera {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem 96px;
}

.billetera-layout-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
}

/* Tablet: dos columnas (tarjeta + movimientos) para aprovechar el ancho */
@media (min-width: 640px) {
  .billetera-layout-grid {
    grid-template-columns: minmax(320px, 400px) 1fr;
    gap: 2rem;
  }
}
@media (min-width: 1024px) {
  .billetera-layout-grid {
    grid-template-columns: 420px 1fr;
    gap: 3rem;
  }
}
.panel-derecho { min-width: 0; }
.panel-izquierdo { min-width: 0; }

/* Encabezado compacto */
.hero-billetera {
  position: relative;
  margin-bottom: 1.35rem;
  padding: 0.25rem 0.15rem 0;
}

.hero-billetera-contenido {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  max-width: 640px;
}

.titulo-principal-billetera {
  color: var(--texto-principal);
  margin: 0;
  font-family: var(--fuente-titulo);
  font-weight: 800;
  font-size: 1.65rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-wrap: balance;
}

.hero-billetera-sub {
  margin: 0.3rem 0 0;
  color: var(--texto-secundario);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 52ch;
  text-wrap: pretty;
}

@media (max-width: 600px) {
  .hero-billetera { margin-bottom: 1.15rem; }
}

/* TARJETA BILLETERA */
.tarjeta-billetera {
  position: relative;
  isolation: isolate;
  width: 100%;
  padding: 2rem 2.25rem 2.25rem;
  border-radius: 26px;
  background:
    radial-gradient(130% 120% at 100% 0%, rgba(236,72,153,0.42), transparent 55%),
    radial-gradient(120% 120% at 0% 100%, rgba(139,92,246,0.55), transparent 60%),
    linear-gradient(150deg, #2a1268 0%, #4a1f9e 42%, #7b2fb8 72%, #b83a8f 100%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 30px 70px -20px rgba(120, 30, 140, 0.7),
    0 10px 26px rgba(19, 6, 48, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  overflow: hidden;
  /* Mantiene proporción de tarjeta: no se estira a full-width dejando huecos. */
  max-width: 460px;
  margin: 0 auto 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

/* Halo perimetral sutil bajo la tarjeta */
.tarjeta-billetera::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  box-shadow: inset 0 -40px 70px -30px rgba(0, 0, 0, 0.5);
}

/* Sheen diagonal que cruza la tarjeta */
.tarjeta-brillo {
  position: absolute;
  top: -60%;
  left: -30%;
  width: 55%;
  height: 220%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0.08) 55%, transparent 100%);
  transform: rotate(8deg) translateX(-30%);
  filter: blur(2px);
  transition: transform 1.1s var(--ease-cine);
}

.tarjeta-billetera:hover .tarjeta-brillo {
  transform: rotate(8deg) translateX(360%);
}

.tarjeta-billetera > *:not(.tarjeta-brillo) {
  position: relative;
  z-index: 2;
}

/* Chip + wordmark central */
.tarjeta-media {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.chip-tarjeta {
  position: relative;
  width: 44px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(150deg, #f7e08a 0%, #d9b24a 45%, #b8862b 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.35);
  flex-shrink: 0;
  overflow: hidden;
}

.chip-lineas {
  position: absolute;
  inset: 6px 8px;
  border-radius: 3px;
  background:
    linear-gradient(to right, transparent 45%, rgba(120,80,10,0.55) 45%, rgba(120,80,10,0.55) 55%, transparent 55%),
    linear-gradient(to bottom, transparent 45%, rgba(120,80,10,0.55) 45%, rgba(120,80,10,0.55) 55%, transparent 55%);
  border: 1px solid rgba(120,80,10,0.4);
}

.tarjeta-wordmark {
  font-family: var(--fuente-titulo);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.7);
}

.fila-superior {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 1;
}

.grupo-saldo {
  display: flex;
  flex-direction: column;
}

.grupo-marca {
  display: flex;
  align-items: flex-start;
}

.img-logo {
  height: 28px;
  width: auto;
  opacity: 0.9;
}

.fila-inferior {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 1;
  gap: 1.5rem;
}

.columna-pin {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pin-display-flex {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.pin-oculto-nuevo {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 6px;
  color: white;
  margin-top: 5px;
}

/* PIN revelado: 4 dígitos en cajitas elegantes + cuenta regresiva sutil */
.pin-cajas {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  padding: 0;
  margin-top: 4px;
  cursor: pointer;
}

.pin-caja {
  width: 30px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 2px 8px rgba(19, 6, 48, 0.35);
  color: #fff;
  font-family: var(--fuente-titulo);
  font-size: 1.3rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
  animation: pinCajaEntra 0.3s var(--ease-suave) both;
}

.pin-caja:nth-child(2) { animation-delay: 0.05s; }
.pin-caja:nth-child(3) { animation-delay: 0.1s; }
.pin-caja:nth-child(4) { animation-delay: 0.15s; }

@keyframes pinCajaEntra {
  from { opacity: 0; transform: translateY(6px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.pin-cuenta {
  margin-left: 0.3rem;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.68rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.btn-ojo-pin {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: var(--radio-full);
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  flex-shrink: 0;
  transition: var(--trans-normal);
}

.btn-ojo-pin:hover {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  transform: scale(1.08);
}

.btn-ojo-pin:active { transform: scale(0.94); }

.btn-ojo-pin:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 2px;
}

.pin-estado {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.02em;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radio-full);
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.18);
  white-space: nowrap;
}

.pin-estado-activo {
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(34, 197, 94, 0.45);
  color: #bbf7d0;
}

.columna-acciones-tarjeta {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-end;
}

.btn-pildora {
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  padding: 0.5rem 1.2rem;
  border-radius: var(--radio-full);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: var(--trans-normal);
  width: 100%;
  justify-content: center;
}

.btn-pildora:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.btn-pildora:active {
  transform: translateY(0) scale(0.98);
}

.btn-pildora:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 2px;
}

.btn-pildora-resaltado {
  background: rgba(255, 255, 255, 0.95);
  color: var(--morado-medio);
  border-color: transparent;
  font-weight: 700;
}
.btn-pildora-resaltado:hover {
  background: #fff;
  box-shadow: 0 6px 18px rgba(19, 6, 48, 0.35);
}

.etiqueta-pequena {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: 0 0 0.4rem 0;
}

.valor-grande {
  font-family: var(--fuente-titulo);
  font-size: clamp(2.6rem, 8vw, 3.3rem);
  font-weight: 800;
  color: white;
  margin: 0;
  letter-spacing: -0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 20px rgba(19, 6, 48, 0.45);
}

.valor-moneda {
  font-size: 0.42em;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(255,255,255,0.78);
  margin-right: 0.4rem;
  vertical-align: 0.5em;
}

/* RESPONSIVIDAD TARJETA */
@media (max-width: 900px) {
  .tarjeta-billetera { padding: 2rem; }
  .valor-grande { font-size: 2.4rem; }
}

@media (max-width: 600px) {
  .tarjeta-billetera { padding: 1.2rem; }
  .valor-grande { font-size: 2rem; }

  /* Mantener en la misma fila para no desperdiciar la esquina inferior derecha */
  .fila-inferior { flex-direction: row; align-items: flex-end; gap: 0.5rem; }

  .columna-acciones-tarjeta { width: auto; align-items: flex-end; }
  .btn-pildora { font-size: 0.8rem; padding: 0.5rem 0.8rem; }
  .pin-caja { width: 25px; height: 33px; font-size: 1.1rem; }
  .pin-cuenta { width: 22px; height: 22px; font-size: 0.62rem; }
}

/* ACCIONES BILLETERA (PAGOS) */
.acciones-titulo {
  font-family: var(--fuente-titulo);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--texto-secundario);
  margin: 0 auto 0.85rem;
  padding-left: 0.15rem;
  max-width: 460px;
}

.acciones-billetera {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  margin: 0 auto 1.5rem;
  max-width: 460px;
}

.btn-abrir-recarga {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: linear-gradient(155deg, var(--fondo-tarjeta-alt), var(--fondo-tarjeta));
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  padding: 1rem 1.1rem;
  border-radius: var(--radio-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  min-width: 0;
  transition: transform 0.3s var(--ease-cine), box-shadow 0.3s var(--ease-cine), border-color 0.3s ease;
}

.qr-tile-icono {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-md);
  color: #fff;
  background: rgba(168, 85, 247, 0.16);
  border: 1px solid var(--glass-borde);
  transition: transform 0.3s var(--ease-cine), background 0.3s ease;
}

.qr-tile-texto {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.qr-tile-titulo {
  font-family: var(--fuente-titulo);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}

.qr-tile-sub {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--texto-secundario);
}

.btn-privado .qr-tile-icono {
  background: rgba(236, 72, 153, 0.16);
  border-color: rgba(236, 72, 153, 0.4);
}

.btn-abrir-recarga:hover {
  transform: translateY(-3px);
  border-color: var(--borde-activo);
  box-shadow: 0 16px 34px -14px rgba(168, 85, 247, 0.6), inset 0 1px 0 rgba(255,255,255,0.08);
}

.btn-abrir-recarga:hover .qr-tile-icono {
  transform: scale(1.06);
  background: rgba(168, 85, 247, 0.28);
}

.btn-privado:hover {
  box-shadow: 0 16px 34px -14px rgba(236, 72, 153, 0.6), inset 0 1px 0 rgba(255,255,255,0.08);
}

.btn-privado:hover .qr-tile-icono {
  background: rgba(236, 72, 153, 0.3);
}

.btn-abrir-recarga:active {
  transform: translateY(0) scale(0.98);
}

.btn-abrir-recarga:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

@media (max-width: 420px) {
  .acciones-billetera { grid-template-columns: 1fr; }
}

/* ============ MOVIMIENTOS ============ */
.movimientos-encabezado {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1.4rem;
}

.seccion-movimientos h2 {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.5rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--texto-principal);
  text-wrap: balance;
}

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
  .mov-ver span { display: none; }
}

/* Botón Ver todos / Ver menos */
.btn-ver-todos {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.35rem;
  padding: 0.55rem 1.4rem;
  border-radius: var(--radio-full);
  border: 1px solid var(--borde-sutil);
  background: var(--fondo-tarjeta);
  color: var(--morado-hover);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s var(--ease-suave);
}

.btn-ver-todos:hover {
  border-color: var(--borde-activo);
  background: rgba(168, 85, 247, 0.12);
  transform: translateY(-2px);
}

.btn-ver-todos:active { transform: translateY(0) scale(0.98); }

.btn-ver-todos:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
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

/* Estado vacío */
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

/* ============ MODALES ============ */
/* Todos los overlays van en Teleport a body con z-index >= 1000 para quedar
   por encima del navbar inferior del cliente (z-index 50). */
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

.modal-cambiar-pin,
.modal-recarga,
.modal-detalles {
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(236,72,153,0.14), transparent 55%),
    linear-gradient(165deg, #241556 0%, #150a30 100%);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl);
  padding: 2rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  max-width: 500px;
  width: 90%;
  max-height: 90dvh;
  overflow-y: auto;
  box-shadow: 0 30px 80px rgba(7, 3, 20, 0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 30px rgba(168, 85, 247, 0.28);
  animation: modalAparece 0.28s var(--ease-suave) both;
}

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

.modal-body { margin-bottom: 1.5rem; }

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 1rem;
}

.btn-cancelar,
.btn-guardar {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-cancelar {
  background: rgba(255,255,255,0.05);
  color: var(--texto-principal);
}

.btn-cancelar:hover { background: rgba(255,255,255,0.1); }

.btn-guardar {
  background: linear-gradient(135deg, var(--morado-brillante), var(--azul-profundo));
  color: white;
}

.btn-guardar:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(168, 85, 247, 0.35);
}

.btn-guardar:active:not(:disabled),
.btn-cancelar:active {
  transform: translateY(0) scale(0.98);
}

.btn-guardar:focus-visible,
.btn-cancelar:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.btn-guardar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* CAMBIO PIN */
.campo-pin { margin-bottom: 1.5rem; }

.campo-pin label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--texto-secundario);
  font-size: 0.9rem;
  font-weight: 600;
}

.input-pin-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-pin {
  width: 100%;
  padding: 1rem;
  padding-right: 3rem;
  background: var(--fondo-principal);
  border: 1px solid var(--borde-color);
  border-radius: 8px;
  color: var(--texto-principal);
  font-size: 1.5rem;
  letter-spacing: 4px;
  text-align: center;
  transition: border-color 0.3s;
}

.input-pin:focus {
  outline: none;
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.18);
}

/* La contraseña de la cuenta no es un PIN: tipografía normal */
.input-password {
  font-size: 1rem;
  letter-spacing: normal;
  text-align: left;
}

.btn-ojo-input {
  position: relative;
  right: 10px;
  background: none;
  border: none;
  color: var(--texto-secundario);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-ojo-input:hover { color: var(--texto-principal); }

/* MODAL VER PIN (compacto y centrado) */
.modal-ver-pin {
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(236,72,153,0.14), transparent 55%),
    linear-gradient(165deg, #241556 0%, #150a30 100%);
  border: 1px solid var(--borde-activo);
  border-radius: var(--radio-xl);
  padding: 1.75rem 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 350px;
  max-height: 90dvh;
  overflow-y: auto;
  text-align: center;
  box-shadow: 0 30px 80px rgba(7, 3, 20, 0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 30px rgba(168, 85, 247, 0.28);
  animation: modalAparece 0.28s var(--ease-suave) both;
}

.verpin-candado {
  width: 44px;
  height: 44px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid var(--borde-sutil);
}

.verpin-titulo {
  margin: 0.8rem 0 0.2rem;
  font-family: var(--fuente-titulo);
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
}

.verpin-sub {
  margin: 0 0 1.15rem;
  color: var(--texto-secundario);
  font-size: 0.88rem;
}

.verpin-error {
  justify-content: center;
  text-align: left;
}

.verpin-error svg { flex-shrink: 0; }

.verpin-acciones {
  display: flex;
  gap: 0.7rem;
  margin-top: 1.25rem;
}

.verpin-acciones .btn-cancelar,
.verpin-acciones .btn-guardar {
  flex: 1;
  padding: 0.75rem 1rem;
}

.btn-reconfigurar {
  width: 100%;
  margin-top: 0.75rem;
}

.info-recarga-paso {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  color: var(--texto-principal);
  margin-bottom: 0.6rem;
  font-size: 0.95rem;
}

.num-paso {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(168, 85, 247, 0.35);
}

/* Ajuste de inputs de PIN en pantallas muy pequeñas */
@media (max-width: 480px) {
  .modal-cambiar-pin,
  .modal-recarga {
    padding: 1.25rem;
    padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
    width: 94%;
  }
  .modal-ver-pin {
    padding: 1.5rem 1.25rem;
    padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
  }
  .input-pin {
    font-size: 1.25rem;
    letter-spacing: 3px;
    padding: 0.85rem;
    padding-right: 2.75rem;
  }
  .input-password { font-size: 1rem; letter-spacing: normal; }
}

/* RECARGA */
.subseccion-qr-predeterminado {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  background: var(--fondo-principal);
  border: 1px solid var(--borde-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.contenedor-qr-default {
  position: relative;
  display: inline-block;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.contenedor-qr-default .qr-imagen {
  display: block;
  width: 100%;
  max-width: 180px;
  height: auto;
  background: white;
  padding: 8px;
}

.btn-ampliar-qr {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 10, 46, 0.92);
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 20px;
  color: white;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-ampliar-qr:hover {
  background: var(--morado-brillante);
  transform: translateX(-50%) scale(1.05);
}

.btn-ampliar-qr:active {
  transform: translateX(-50%) scale(0.98);
}

.btn-ampliar-qr:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 2px;
}

.campo-monto,
.campo-comprobante {
  background: var(--fondo-principal);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.input-monto {
  display: flex;
  align-items: center;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-color);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color var(--trans-normal), box-shadow var(--trans-normal);
}

.input-monto:focus-within {
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.18);
}

.input-monto-bloqueado { opacity: 0.6; }

.input-monto-valido {
  border-color: var(--color-exito) !important;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.input-monto-error {
  border-color: var(--color-error) !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.icono-check-valido { margin-right: 1rem; }

.montos-rapidos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.chip-monto {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--borde-color);
  background: var(--fondo-tarjeta);
  color: var(--texto-principal);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--trans-normal), background var(--trans-normal), color var(--trans-normal);
}

.chip-monto:hover:not(:disabled) { border-color: var(--morado-brillante); }

.chip-monto.activo {
  border-color: var(--morado-brillante);
  background: rgba(168, 85, 247, 0.15);
  color: var(--morado-brillante);
}

.chip-monto:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nota-primera-recarga {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.35);
  color: var(--texto-principal);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 0.88rem;
  margin-bottom: 1.25rem;
}

.prefijo {
  padding: 0 1rem;
  color: var(--texto-secundario);
  font-weight: 600;
}

.input-field {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  color: var(--texto-principal);
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
}

.input-field:focus { outline: none; }

.error-mensaje,
.exito-mensaje {
  margin: 0.5rem 0 0 0;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.error-mensaje { color: var(--rojo-suave); }
.exito-mensaje { color: var(--verde-fresco); }

.warning-mensaje {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-alerta);
  font-size: 0.85rem;
  margin-top: 0.5rem;
  background: rgba(245, 158, 11, 0.1);
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

/* Dos opciones para el comprobante: subir imagen o tomar foto */
.opciones-comprobante {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  min-width: 0;
}

.btn-opcion-comprobante {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  background: var(--fondo-tarjeta);
  border: 2px dashed var(--borde-color);
  border-radius: 10px;
  padding: 1.4rem 0.75rem;
  color: var(--texto-secundario);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.3s ease, background 0.3s ease, color 0.3s ease, transform 0.2s ease;
}

.btn-opcion-comprobante:hover:not(:disabled) {
  border-color: var(--morado-brillante);
  background: rgba(168, 85, 247, 0.08);
  color: var(--texto-principal);
}

.btn-opcion-comprobante:active:not(:disabled) { transform: scale(0.98); }

.btn-opcion-comprobante:focus-visible {
  outline: 2px solid var(--borde-activo);
  outline-offset: 2px;
}

.btn-opcion-comprobante:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-file-hidden { display: none; }

/* ============ CÁMARA DEL COMPROBANTE ============ */
.camara-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: #000;
}

.camara-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camara-guia {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  padding: 1.5rem 1.5rem 9rem;
  pointer-events: none;
}

/* Recuadro guía vertical ~3:4 con esquinas resaltadas */
.guia-marco {
  position: relative;
  width: min(78vw, 42dvh);
  aspect-ratio: 3 / 4;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 18px;
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.45);
}

.guia-esquina {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 4px solid var(--morado-hover);
}

.ge-tl { top: -2px; left: -2px; border-right: none; border-bottom: none; border-top-left-radius: 18px; }
.ge-tr { top: -2px; right: -2px; border-left: none; border-bottom: none; border-top-right-radius: 18px; }
.ge-bl { bottom: -2px; left: -2px; border-right: none; border-top: none; border-bottom-left-radius: 18px; }
.ge-br { bottom: -2px; right: -2px; border-left: none; border-top: none; border-bottom-right-radius: 18px; }

.guia-texto {
  margin: 0;
  color: #fff;
  font-weight: 600;
  font-size: 0.92rem;
  text-align: center;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.85);
}

.camara-controles {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 1.25rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.btn-camara-cancelar {
  justify-self: start;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--radio-full);
  color: #fff;
  padding: 0.55rem 1.15rem;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s ease;
}

.btn-camara-cancelar:hover { background: rgba(255, 255, 255, 0.18); }

.btn-camara-cancelar:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 2px;
}

.btn-capturar {
  justify-self: center;
  width: 74px;
  height: 74px;
  border-radius: var(--radio-full);
  background: rgba(255, 255, 255, 0.22);
  border: 3px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.btn-capturar-interno {
  width: 56px;
  height: 56px;
  border-radius: var(--radio-full);
  background: #fff;
  transition: transform 0.15s ease;
}

.btn-capturar:hover .btn-capturar-interno { transform: scale(0.94); }
.btn-capturar:active .btn-capturar-interno { transform: scale(0.85); }

.btn-capturar:focus-visible {
  outline: 3px solid var(--morado-hover);
  outline-offset: 3px;
}

.camara-espaciador { justify-self: end; }

.estado-ocr {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--morado-brillante);
  border-radius: 8px;
  padding: 1rem;
  color: var(--texto-principal);
  margin-top: 1rem;
  font-size: 0.9rem;
}

.spin { animation: spin 2s linear infinite; }

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.vista-previa-comprobante {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-archivo {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  overflow: hidden;
}

.nombre-archivo {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  font-size: 0.9rem;
  color: var(--verde-fresco);
  font-weight: 600;
}

.btn-eliminar-archivo {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
}

.btn-eliminar-archivo:hover {
  background: var(--color-error);
  color: white;
  transform: scale(1.1);
}

.btn-eliminar-archivo:active { transform: scale(0.95); }

.btn-eliminar-archivo:focus-visible {
  outline: 2px solid var(--color-error);
  outline-offset: 2px;
}

/* MODAL DETALLE CONSUMO */
.modal-consumo { max-width: 440px; }

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

/* MODAL DETALLES / ÉXITO */
.modal-detalles { max-width: 420px; }

.modal-exito {
  text-align: center;
  padding: 2rem !important;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icono-exito {
  background: rgba(34, 197, 94, 0.1);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

@media (max-width: 600px) {
  .modal-detalles {
    padding: 1.25rem;
    padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
    max-height: 90dvh;
    overflow-y: auto;
  }
}

/* ============ QR A PANTALLA COMPLETA (fondo blanco) ============ */
.qr-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: var(--esp-5, 24px);
  background: #fff;
  cursor: pointer;
  animation: qrFsEntrada 0.2s ease-out both;
}

.qr-fs-img {
  width: min(80vw, 80vh);
  max-width: 100%;
  max-height: 80vh;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}

.qr-fs-titulo {
  margin: 0;
  color: #1a1030;
  font-weight: 800;
  font-size: 1.05rem;
  font-family: var(--fuente-titulo);
  letter-spacing: -0.01em;
  text-align: center;
}

.qr-fs-codigo {
  margin: 0;
  color: #1a1030;
  font-weight: 800;
  font-size: clamp(0.9rem, 3.5vw, 1.2rem);
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  font-family: monospace;
  text-align: center;
  word-break: break-all;
  max-width: 90vw;
}

.qr-fs-hint {
  margin: 0;
  color: #6b6480;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
}

@keyframes qrFsEntrada {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ============ MOVIMIENTO REDUCIDO ============ */
@media (prefers-reduced-motion: reduce) {
  .tarjeta-billetera:hover .tarjeta-brillo { transform: rotate(8deg) translateX(-30%); }
  .modal-cambiar-pin,
  .modal-recarga,
  .modal-detalles,
  .modal-ver-pin,
  .qr-fullscreen { animation: none; }
  .pin-caja { animation: none; }
  .esq-linea { animation: none; opacity: 0.7; }
  .btn-abrir-recarga:hover,
  button.mov-fila:hover,
  .btn-pildora:hover,
  .btn-ver-todos:hover,
  .btn-ojo-pin:hover { transform: none; }
}
</style>
