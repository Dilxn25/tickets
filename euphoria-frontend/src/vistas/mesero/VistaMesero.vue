<template>
  <div class="vista-pos fade-in">
    <!-- Navbar POS -->
    <header class="pos-header">
      <div class="logo-area">
        <img src="@/activos/imagenes/logo-euphoria.png" alt="Logo" class="logo-mini" />
        <span class="badge-rol">Caja / Mesero</span>
      </div>

      <button class="btn-campana fade-in" :class="{ activo: mostrarModalListos }" @click="mostrarModalListos = !mostrarModalListos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span class="campana-badge" v-if="pedidosListos.length > 0">{{ pedidosListos.length }}</span>
      </button>

      <div class="usuario-area">
        <span>Hola, <strong>{{ tienda.usuario?.nombres }}</strong></span>
        <button class="btn btn-secundario btn-sm" @click="cerrarSesion">Salir</button>
      </div>
    </header>

    <!-- ============================================
         VISTA 1: PEDIDOS LISTOS PARA RECOGER 
         (Oculta el POS para evitar sobreposiciones)
    ============================================= -->
    <div v-if="mostrarModalListos" class="vista-pedidos-listos fade-in">
      <div class="vpl-header">
        <div class="vpl-titulo">
          <svg viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2" width="28" height="28"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <h2>Pedidos Listos en Barra</h2>
        </div>
        <button class="btn btn-secundario" @click="mostrarModalListos = false" style="display:flex; align-items:center; gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Volver a Tomar Órdenes
        </button>
      </div>

      <div v-if="pedidosListos.length === 0" class="vacio-listos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="opacity:0.3; margin-bottom:15px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <p>No tienes pedidos pendientes de recoger.</p>
        <button class="btn btn-primario mt-15" @click="mostrarModalListos = false">Volver al Menú</button>
      </div>

      <div v-else class="grid-listos">
        <transition-group name="list">
          <div v-for="ped in pedidosListos" :key="ped.id_comanda" class="card-listo-full">
            <div class="clf-header">
              <span class="clf-orden">Orden #{{ ped.id_comanda }}</span>
              <span class="clf-destino" v-if="ped.mesa_espacio">
                Mesa {{ ped.mesa_espacio.numero_nombre }}
              </span>
              <span class="clf-destino vip" v-else>
                Barra/VIP
              </span>
            </div>
            
            <div class="clf-cliente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>{{ ped.usuario_comanda_id_clienteTousuario ? ped.usuario_comanda_id_clienteTousuario.nombres : 'Sin Registro' }}</span>
            </div>
            
            <div class="clf-prods">
              <div v-for="det in ped.detalle_comanda" :key="det.id_detalle" class="clf-prod-item">
                <span class="clf-cant">{{ det.cantidad }}x</span>
                <span class="clf-nom">{{ det.producto?.nombre_producto }}</span>
              </div>
            </div>

            <button class="btn-entregar-full" @click="entregarPedido(ped.id_comanda)" :disabled="procesandoEntrega === ped.id_comanda">
              <span v-if="procesandoEntrega === ped.id_comanda">Procesando...</span>
              <span v-else style="display:flex; align-items:center; justify-content:center; gap: 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Marcar como Entregado
              </span>
            </button>
          </div>
        </transition-group>
      </div>
    </div>

    <!-- ============================================
         VISTA 2: POS (PRODUCTOS Y CARRITO)
    ============================================= -->
    <div v-else class="pos-layout">
      <!-- PANEL IZQUIERDO: PRODUCTOS -->
      <section class="panel-productos" :class="{ 'oculto-movil': verCarritoMovil }">
        <div class="buscador">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" v-model="busqueda" placeholder="Buscar producto por nombre..." />
        </div>

        <div class="categorias-scroll">
          <button class="btn-categoria" :class="{ activo: categoriaSeleccionada === null }" @click="categoriaSeleccionada = null">Todos</button>
          <button
            class="btn-categoria"
            v-for="cat in categorias"
            :key="cat.id_categoria"
            :class="{ activo: categoriaSeleccionada === cat.id_categoria }"
            @click="categoriaSeleccionada = cat.id_categoria"
          >{{ cat.nombre_categoria }}</button>
        </div>

        <div class="lista-productos">
          <div v-if="cargandoProductos" class="spinner-container"><div class="spinner"></div></div>
          <div v-else-if="productosFiltrados.length === 0" class="vacio">No hay productos disponibles</div>
          
          <div v-else class="grid-productos">
            <div 
              v-for="prod in productosFiltrados" 
              :key="prod.id_producto" 
              class="tarjeta-producto-pos"
              @click="agregarAlCarrito(prod)"
            >
              <img :src="prod.url_imagen || 'https://via.placeholder.com/150?text=No+Img'" :alt="prod.nombre_producto" class="img-producto" />
              <div class="info-producto">
                <h5>{{ prod.nombre_producto }}</h5>
                <p class="precio">Bs. {{ prod.precio_base }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Botón flotante móvil para ver la orden actual -->
        <div v-if="carrito.length > 0" class="btn-flotante-carrito-movil" @click="verCarritoMovil = true">
          <span class="carrito-badge">{{ totalItemsCarrito }}</span>
          <span>Ver Orden Actual</span>
          <strong>Bs. {{ totalCarrito.toFixed(2) }} →</strong>
        </div>
      </section>

      <!-- PANEL DERECHO: CARRITO Y COBRO -->
      <section class="panel-carrito" :class="{ 'mostrar-movil': verCarritoMovil }">
        <div class="header-carrito-seccion">
          <button class="btn-volver-productos" @click="verCarritoMovil = false" title="Volver a Productos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Agregar más</span>
          </button>
          <h3 class="titulo-carrito" style="margin: 0;">Orden Actual</h3>
        </div>
        
        <!-- SELECTOR DE MESA -->
        <div class="selector-mesa">
          <div class="mesa-selector-row">
            <div class="mesa-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>
            </div>
            <select v-model="mesaSeleccionada" @change="alCambiarMesa" class="select-mesa">
              <option :value="null">Pedido en Barra (sin mesa)</option>
              <option v-for="mesa in mesas" :key="mesa.id_mesa" :value="mesa">
                Mesa {{ mesa.numero_nombre }} — {{ mesa.estado_ocupacion === 'reservada' ? 'Reservada' : 'Libre' }}
              </option>
            </select>
          </div>
          <div v-if="mesaSeleccionada && clienteAutoAsignado" class="cliente-auto-mesa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Reserva de <strong>{{ clienteAutoAsignado }}</strong> asignada automaticamente
          </div>
        </div>

        <div class="buscador-cliente">
          <div class="buscador-cliente-row">
            <input type="text" v-model="busquedaCliente" @input="buscarClientes" placeholder="Buscar cliente (CI, Nombre)..." class="input-cliente" />
            <button class="btn-nuevo-cliente" @click="modalNuevoCliente = true" title="Registrar nuevo cliente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          
          <div v-if="clientesBuscados.length > 0" class="resultados-cliente">
            <div v-for="cli in clientesBuscados" :key="cli.id_usuario" class="item-cliente" @click="seleccionarCliente(cli)">
              <strong>{{ cli.nombres }} {{ cli.apellidos }}</strong>
              <small>{{ cli.ci_carnet || cli.telefono || cli.correo }}</small>
            </div>
          </div>

          <div v-if="clienteSeleccionado" class="cliente-seleccionado">
            <span>Cliente: <strong>{{ clienteSeleccionado.nombres }}</strong></span>
            <button class="btn-quitar-cliente" @click="quitarCliente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div class="lista-carrito">
          <div v-if="carrito.length === 0" class="vacio-carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <p>Aún no hay productos en la orden</p>
          </div>
          
          <div v-for="(item, index) in carrito" :key="index" class="item-carrito">
            <div class="item-info">
              <span class="item-nombre">{{ item.producto.nombre_producto }}</span>
              <span class="item-precio">
                Bs. {{ precioItem(item).toFixed(2) }}
                <span v-if="item.precio != null" class="etiqueta-ia" title="Precio sugerido por IA">IA</span>
              </span>
            </div>
            <div class="item-controles">
              <button @click="restar(index)">-</button>
              <span class="cantidad">{{ item.cantidad }}</span>
              <button @click="sumar(index)">+</button>
            </div>
          </div>
        </div>

        <!-- Sugerencias del motor de recomendación (IA) -->
        <div v-if="carrito.length > 0 && sugerencias.length > 0" class="seccion-sugerencias">
          <div class="sugerencias-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21l2.3-7.4-6-4.6h7.6z"></path></svg>
            <span>La mesa también suele pedir</span>
          </div>
          <div class="sugerencias-lista">
            <button
              v-for="s in sugerencias"
              :key="s.id_producto"
              class="chip-sugerencia"
              @click="agregarSugerencia(s)"
              type="button"
              :title="`${(s.probabilidad * 100).toFixed(0)}% de probabilidad de que la acepten a este precio`"
            >
              <span class="chip-nombre">{{ s.nombre }}</span>
              <span class="chip-meta">
                <span class="chip-prob">{{ (s.probabilidad * 100).toFixed(0) }}%</span>
                <span class="chip-precio">Bs {{ precioSugerido(s).toFixed(2) }}</span>
              </span>
              <span class="chip-mas">+</span>
            </button>
          </div>
        </div>

        <div class="total-carrito">
          <span>Total a cobrar</span>
          <h2>Bs. {{ totalCarrito.toFixed(2) }}</h2>
        </div>

        <button 
          class="btn btn-primario btn-full btn-cobrar" 
          :disabled="carrito.length === 0"
          @click="abrirModalCobro"
        >
          Cobrar Orden
        </button>
      </section>
    </div>

    <!-- MODAL DE COBRO -->
    <Teleport to="body">
      <div v-if="modalCobro" class="cobro-overlay" @click.self="cerrarModalCobro">
        <div class="cobro-sheet fade-in">

          <!-- Cabecera -->
          <div class="cobro-header">
            <div>
              <p class="cobro-label">Total a cobrar</p>
              <h2 class="cobro-total">Bs. {{ totalCarrito.toFixed(2) }}</h2>
            </div>
            <button class="cobro-cerrar" @click="cerrarModalCobro">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="cobro-tabs">
            <button :class="['cobro-tab', { activo: metodoPago === 'Transferencia QR' }]" @click="cambiarMetodo('Transferencia QR')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><path d="M14 14h3v3"></path><path d="M17 17h3v3"></path></svg>
              Transferencia
            </button>
            <button :class="['cobro-tab', { activo: metodoPago === 'Billetera' }]" @click="cambiarMetodo('Billetera')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              Billetera
            </button>
            <button :class="['cobro-tab', { activo: metodoPago === 'Efectivo' }]" @click="cambiarMetodo('Efectivo')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Efectivo
            </button>
          </div>

          <!-- Cuerpo -->
          <div class="cobro-cuerpo">

            <!-- TAB 1: TRANSFERENCIA -->
            <div v-if="metodoPago === 'Transferencia QR'" class="cobro-panel">
              <p class="cobro-instruccion">El cliente transfiere al QR del establecimiento y sube el comprobante.</p>

              <div class="qr-row">
                <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR Pago" class="qr-mini" />
                <div class="qr-acciones">
                  <p class="qr-total-txt">Total: <strong>Bs. {{ totalCarrito.toFixed(2) }}</strong></p>
                  <button class="btn-accion-qr" @click="ampliarQr = true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                    Ampliar QR
                  </button>
                </div>
              </div>

              <div class="ocr-zona mt-15">
                <div v-if="!validandoOCR && !comprobanteValido">
                  <label class="btn-camara-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    Fotografiar Comprobante
                    <input type="file" accept="image/*" capture="environment" @change="alSeleccionarComprobanteYValidar" style="display:none;" />
                  </label>
                  <p style="text-align:center; font-size:0.8rem; margin-top:12px; color:var(--texto-secundario);">La IA verificara el comprobante automaticamente</p>
                </div>
                <div v-if="validandoOCR" class="ia-verificando">
                  <div class="ia-barra"></div>
                  <p>Verificando comprobante...</p>
                </div>
                <div v-if="comprobanteValido" class="ia-ok">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="44" height="44"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <span>Comprobante Aprobado</span>
                </div>
              </div>
            </div>

            <!-- TAB 2: BILLETERA -->
            <div v-if="metodoPago === 'Billetera'" class="cobro-panel">

              <!-- Billetera Verificada (Paso 2) -->
              <div v-if="billeteraVerificada" class="pin-zone fade-in">
                <svg viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito); margin-bottom: 10px;" stroke-width="2" width="40" height="40"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <p class="pin-titulo">Billetera de: {{ nombreBilleteraVerificada }}</p>
                <p class="pin-sub" style="margin-bottom: 1rem; color: rgba(255,255,255,0.5);">ID: {{ formCobro.qr_billetera }}</p>
                
                <!-- Mostrar saldo actual -->
                <p style="text-align: center; font-size: 1.1rem; margin-bottom: 0.5rem;" 
                   :style="{ color: saldoBilleteraVerificada >= totalCarrito ? 'var(--color-exito)' : 'var(--color-error)', fontWeight: 'bold' }">
                   Saldo Disponible: Bs. {{ saldoBilleteraVerificada.toFixed(2) }}
                </p>
                
                <div v-if="saldoBilleteraVerificada < totalCarrito" style="text-align: center; color: var(--color-error); margin-bottom: 15px; font-weight: bold; background: rgba(239, 71, 111, 0.1); padding: 5px; border-radius: 4px;">
                  Saldo Insuficiente
                </div>

                <div v-if="saldoBilleteraVerificada >= totalCarrito">
                  <div v-if="requierePin">
                    <p class="pin-sub" style="color: var(--color-alerta); font-weight: bold; margin-bottom: 10px;">Por seguridad (QR Privado), ingresa el PIN:</p>
                    <input type="password" v-model="formCobro.pin" placeholder="••••" maxlength="4" class="input-pin" autofocus @input="verificarPinLleno" />
                  </div>
                  <div v-else style="margin-top: 15px;">
                    <button class="btn btn-primario btn-full" @click="procesarCobro">Cobrar Bs. {{ totalCarrito.toFixed(2) }}</button>
                  </div>
                </div>
                
                <button class="btn btn-secundario btn-full" style="margin-top: 1rem;" @click="billeteraVerificada = false; formCobro.qr_billetera = ''; errorCobro = ''">Cambiar Cliente</button>
              </div>

              <!-- Estado inicial (Paso 1) -->
              <div v-else class="billetera-inicio fade-in">
                <p class="cobro-instruccion">El cliente paga con su saldo Euphoria. Escanea su QR personal o ingresa su ID.</p>
                
                <div v-if="!camaraActiva" style="display: flex; gap: 10px; margin-bottom: 15px;">
                  <button class="btn btn-primario" style="flex: 1; padding: 0.8rem; font-size: 0.85rem;" @click="activarCamaraScanner" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="margin-bottom: 4px; display: block; margin: 0 auto;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    Escanear en Vivo
                  </button>

                  <label class="btn btn-secundario" style="flex: 1; padding: 0.8rem; font-size: 0.85rem; text-align: center; cursor: pointer; margin: 0; display: block;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="margin-bottom: 4px; display: block; margin: 0 auto;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    Foto Nativa
                    <input type="file" accept="image/*" capture="environment" @change="escanearQrDesdeImagen" style="display:none;" />
                  </label>
                </div>
                
                <div v-show="camaraActiva" class="camara-zona fade-in">
                  <!-- Contenedor del video con overlay de enfoque -->
                  <div class="qr-scanner-wrapper">
                    <div id="reader"></div>
                    <!-- Overlay oscuro con recorte central -->
                    <div class="qr-overlay">
                      <div class="qr-overlay-top"></div>
                      <div class="qr-overlay-middle">
                        <div class="qr-overlay-side"></div>
                        <!-- Cuadro de enfoque -->
                        <div class="qr-viewfinder" :class="{ 'qr-detected': qrDetectado }">
                          <span class="corner tl"></span>
                          <span class="corner tr"></span>
                          <span class="corner bl"></span>
                          <span class="corner br"></span>
                          <!-- Línea de escaneo animada -->
                          <div class="scan-line" v-if="!qrDetectado"></div>
                        </div>
                        <div class="qr-overlay-side"></div>
                      </div>
                      <div class="qr-overlay-bottom">
                        <p class="qr-hint" v-if="!qrDetectado">Apunta la cámara al código QR del cliente</p>
                        <p class="qr-hint qr-hint-ok" v-else><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> Código detectado</p>
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-secundario btn-full" style="margin-top: 12px;" @click="detenerEscaneoCamara" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                    Detener Cámara
                  </button>
                </div>
                
                <div class="mt-15" v-if="!camaraActiva">
                  <p style="text-align:center; font-size:0.8rem; color:var(--texto-secundario); margin-bottom:8px;">O ingresa el ID corto, carnet o celular:</p>
                  <div style="display: flex; gap: 0.5rem;">
                    <input type="text" v-model="formCobro.qr_billetera" placeholder="Ej: 5576, 1234567..." class="input-qr" style="flex: 1; margin:0;" @keydown.enter="verificarBilleteraBackend" />
                    <button class="btn btn-primario" style="padding: 0 1.5rem;" @click="verificarBilleteraBackend" :disabled="procesando || !formCobro.qr_billetera">Buscar</button>
                  </div>
                </div>
              </div>

            </div>

            <!-- TAB 3: EFECTIVO -->
            <div v-if="metodoPago === 'Efectivo'" class="cobro-panel">
              <p class="cobro-instruccion">Ingresa el monto que entrega el cliente.</p>
              <div class="efectivo-display">
                <label class="efectivo-label">MONTO RECIBIDO (Bs.)</label>
                <input type="number" v-model="formCobro.monto_recibido" @input="calcularCambio" placeholder="0.00" class="efectivo-input" autofocus />
              </div>
              <div class="cambio-display" :class="{ 'cambio-insuf': formCobro.cambio_dado < 0 }">
                <span class="cambio-label">CAMBIO A DEVOLVER</span>
                <span class="cambio-valor">Bs. {{ (formCobro.cambio_dado || 0).toFixed(2) }}</span>
              </div>
            </div>

            <div v-if="errorCobro" class="cobro-error mt-15">{{ errorCobro }}</div>
          </div>

          <!-- Pie -->
          <div class="cobro-pie">
            <button class="cobro-btn-cancel" @click="cerrarModalCobro" :disabled="procesando">Cancelar</button>
            <button v-if="metodoPago === 'Efectivo'" class="cobro-btn-ok" @click="procesarCobro" :disabled="procesando || formCobro.cambio_dado < 0">
              <span v-if="!procesando">Confirmar Bs. {{ totalCarrito.toFixed(2) }}</span>
              <span v-else class="loader"></span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- MODAL NUEVO CLIENTE RAPIDO -->
    <Teleport to="body">
      <div v-if="modalNuevoCliente" class="modal-overlay-centrado" @click.self="modalNuevoCliente=false">
        <div class="modal-nuevo-cliente fade-in">
          <div class="modal-cabecera">
            <h2>Registrar Cliente</h2>
            <button class="btn-cerrar-modal-cliente" @click="modalNuevoCliente=false" title="Cerrar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-nuevo-body">
            <div class="input-grupo">
              <label>CI / Carnet / NIT</label>
              <input v-model="formNuevoCliente.ci_carnet" type="text" class="campo-nuevo-cliente" placeholder="Ej: 12345678" autofocus />
            </div>
            <div class="input-grupo">
              <label>Razon Social *</label>
              <input v-model="formNuevoCliente.nombres" type="text" class="campo-nuevo-cliente" placeholder="Nombre o razon social" />
            </div>
            <div v-if="avisoNitExistente" class="aviso-nit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              Cliente ya registrado — seleccionado automaticamente
            </div>
            <div v-if="errorNuevoCliente" class="mensaje-error">{{ errorNuevoCliente }}</div>
          </div>
          <div class="modal-nuevo-pie">
            <button class="btn-cancelar" @click="modalNuevoCliente=false" :disabled="creandoCliente">Cancelar</button>
            <button class="btn-confirmar" @click="crearClienteRapido" :disabled="creandoCliente || !formNuevoCliente.nombres">
              {{ creandoCliente ? 'Buscando...' : 'Confirmar y Seleccionar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- OVERLAY QR AMPLIADO -->
    <Teleport to="body">
      <div v-if="ampliarQr" class="qr-fullscreen" @click="ampliarQr = false">
        <img src="@/activos/imagenes/QRPago euphoria.jpeg" alt="QR Pago" class="qr-fullscreen-img" />
        <p class="qr-fullscreen-hint">Toca para cerrar</p>
      </div>
    </Teleport>

    <!-- MODAL DE EXITO CON DETALLE TRANQUILIZADOR (IA & OCR) -->
    <Teleport to="body">
      <div v-if="mostrarExito" class="exito-overlay" @click.self="mostrarExito = false">
        <div class="exito-card-detallado fade-in">
          <!-- Icono neón de éxito -->
          <div class="exito-icono-anillo">
            <svg viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="3" width="48" height="48"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          
          <h3>¡Cobro Realizado con Éxito!</h3>
          <p class="exito-sub">La orden se envió automáticamente a la barra para su preparación.</p>

          <!-- Detalle del Recibo IA -->
          <div class="recibo-ia">
            <div class="recibo-fila">
              <span class="recibo-etiq">Monto Cobrado</span>
              <span class="recibo-val destacado">Bs. {{ detalleExito.monto.toFixed(2) }}</span>
            </div>
            <div class="recibo-fila">
              <span class="recibo-etiq">Cliente</span>
              <span class="recibo-val">{{ detalleExito.cliente }}</span>
            </div>
            <div class="recibo-fila">
              <span class="recibo-etiq">Método Pago</span>
              <span class="recibo-val badge-metodo">{{ detalleExito.metodo }}</span>
            </div>
            <div class="recibo-fila">
              <span class="recibo-etiq">Transacción</span>
              <span class="recibo-val-mono">{{ detalleExito.transaccionId }}</span>
            </div>
            
            <div v-if="detalleExito.metodo === 'Transferencia QR'" class="recibo-ia-footer">
              <svg viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Comprobante validado por IA OCR Euphoria</span>
            </div>
            
            <div v-if="detalleExito.metodo === 'Billetera'" class="recibo-ia-footer" style="background: rgba(157, 78, 221, 0.1); border-color: rgba(157, 78, 221, 0.3);">
              <svg viewBox="0 0 24 24" fill="none" style="stroke: var(--morado-brillante)" stroke-width="2" width="14" height="14"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <span>Pago descontado. Saldo actual: <strong style="color: var(--morado-brillante);">Bs. {{ (detalleExito.saldo_restante || 0).toFixed(2) }}</strong></span>
            </div>
          </div>

          <button class="btn-exito-continuar" @click="mostrarExito = false">
            Listo / Continuar
          </button>
        </div>
      </div>
    </Teleport>
    <!-- SE ELIMINÓ EL PANEL FLOTANTE A FAVOR DEL BANNER INLINE -->

    <!-- TOAST NOTIFICATIONS -->
    <div class="toast-container">
      <transition-group name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast-item">
          <svg viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito)" stroke-width="2" width="24" height="24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          {{ t.mensaje }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { io } from 'socket.io-client'
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'
import clienteHttp from '@/servicios-api/cliente-http.js'
import { servicioProductos } from '@/servicios-api/servicio-productos.js'
import { servicioComandas } from '@/servicios-api/servicio-comandas.js'

import { Html5Qrcode } from "html5-qrcode"

const router = useRouter()
const tienda = useTiendaAutenticacion()

const productos = ref([])
const busqueda = ref('')
const categorias = ref([])
const categoriaSeleccionada = ref(null)
const cargandoProductos = ref(true)

const carrito = ref([])
const verCarritoMovil = ref(false)

// Sugerencias del motor de recomendación (IA)
const sugerencias = ref([])
const totalItemsCarrito = computed(() => {
  return carrito.value.reduce((acc, item) => acc + item.cantidad, 0)
})

// Mesa y zona
const mesas = ref([])
const mesaSeleccionada = ref(null)
const clienteAutoAsignado = ref('')

// Variables de Cliente
const busquedaCliente = ref('')
const clientesBuscados = ref([])
const clienteSeleccionado = ref(null)
let timeoutBusqueda = null

// Modal Nuevo Cliente
const modalNuevoCliente = ref(false)
const creandoCliente = ref(false)
const errorNuevoCliente = ref('')
const avisoNitExistente = ref(false)
const formNuevoCliente = ref({ nombres: '', apellidos: '', ci_carnet: '', telefono: '' })

// Variables de Cobro
const modalCobro = ref(false)
const metodoPago = ref('Transferencia QR')
const procesando = ref(false)
const errorCobro = ref('')
const requierePin = ref(false)
const camaraActiva = ref(false)
const mostrarExito = ref(false)
const detalleExito = ref({
  monto: 0,
  cliente: '',
  metodo: '',
  transaccionId: '',
  saldo_restante: 0
})
const ampliarQr = ref(false)
const validandoOCR = ref(false)
const comprobanteValido = ref(false)
const billeteraVerificada = ref(false)
const nombreBilleteraVerificada = ref('')
const saldoBilleteraVerificada = ref(0)

// Variables para pedidos listos
const pedidosListos = ref([])
const mostrarModalListos = ref(false)
const procesandoEntrega = ref(null)

// Variables para toasts (notificaciones en tiempo real)
const toasts = ref([])
function agregarToast(mensaje) {
  const id = Date.now()
  toasts.value.push({ id, mensaje })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 5000)
}

let socket = null

const formCobro = ref({
  qr_billetera: '',
  pin: '',
  monto_recibido: 0,
  cambio_dado: 0,
  url_comprobante_ya_subido: null,
  ocr_transaccion_id: ''
})

onMounted(async () => {
  // Verificación extra de rol
  if (tienda.usuario?.rol !== 'Mesero' && tienda.usuario?.rol !== 'Bartender' && tienda.usuario?.rol !== 'Administrador') {
    router.push('/')
    return
  }
  
  try {
    const data = await servicioProductos.listar({ limit: 100 })
    productos.value = data.productos || data

    const catsMap = new Map()
    productos.value.forEach(p => {
      if (p.id_categoria && p.nombre_categoria) {
        catsMap.set(p.id_categoria, p.nombre_categoria)
      }
    })
    categorias.value = Array.from(catsMap, ([id_categoria, nombre_categoria]) => ({ id_categoria, nombre_categoria }))

    // Cargar mesas disponibles
    try {
      const resMesas = await clienteHttp.get('/mesas')
      // Agregar opcion de barra al inicio
      mesas.value = resMesas || []
    } catch (e) {
      console.warn('No se pudieron cargar las mesas:', e)
    }
    
  } catch (err) {
    console.error('Error al cargar productos:', err)
  } finally {
    cargandoProductos.value = false
  }
})

const productosFiltrados = computed(() => {
  let filtrados = productos.value
  
  if (categoriaSeleccionada.value !== null) {
    filtrados = filtrados.filter(p => p.id_categoria === categoriaSeleccionada.value)
  }
  
  if (busqueda.value) {
    const p = busqueda.value.toLowerCase()
    filtrados = filtrados.filter(pr => pr.nombre_producto.toLowerCase().includes(p))
  }
  
  return filtrados
})

const totalCarrito = computed(() => {
  return carrito.value.reduce((acc, item) => acc + (precioItem(item) * item.cantidad), 0)
})

// Precio efectivo de un item (dinámico si se fijó; si no, el precio base)
function precioItem(item) {
  return item.precio != null ? item.precio : Number(item.producto.precio_base)
}

// Redondea a un precio "atractivo": termina en .90 / .40 / .50 / .60 / .00 (un decimal).
// Ej: 13.45 -> 13.50, 12.87 -> 12.90, 12.34 -> 12.40.
function precioAtractivo(p) {
  const entero = Math.floor(p)
  const dec = p - entero
  const opciones = [0, 0.4, 0.5, 0.6, 0.9]
  let mejor = 0, dmin = Infinity
  for (const o of opciones) {
    const d = Math.abs(dec - o)
    if (d < dmin) { dmin = d; mejor = o }
  }
  return Math.round((entero + mejor) * 100) / 100
}

// Precio dinámico sugerido para una recomendación, dentro de un rango automático (±) del base.
// Más probabilidad de aceptación -> se sugiere cobrar más cerca del máximo; menos -> pequeño descuento.
function precioSugerido(s) {
  const prod = productos.value.find(p => p.id_producto === s.id_producto)
  if (!prod) return 0
  const base = Number(prod.precio_base)
  const min = base * 0.85, max = base * 1.20
  return precioAtractivo(min + (max - min) * (s.probabilidad || 0))
}

function agregarAlCarrito(prod) {
  const ex = carrito.value.find(c => c.producto.id_producto === prod.id_producto)
  if (ex) {
    ex.cantidad++
  } else {
    carrito.value.push({ producto: prod, cantidad: 1 })
  }
}

// ---- Recomendaciones (IA) ----
// Pide al backend las sugerencias según lo que ya hay en la orden y las muestra.
async function cargarSugerencias() {
  if (carrito.value.length === 0) {
    sugerencias.value = []
    return
  }
  try {
    const ids = carrito.value.map(c => c.producto.id_producto)
    const res = await clienteHttp.post('/recomendaciones', { productos_en_mesa: ids, k: 4 })
    const enOrden = new Set(ids)
    sugerencias.value = (res.recomendaciones || [])
      .filter(r => !enOrden.has(r.id_producto))
      .slice(0, 3)
  } catch (e) {
    sugerencias.value = [] // degradación elegante: si la IA no está, no se muestran
  }
}

function agregarSugerencia(s) {
  const prod = productos.value.find(p => p.id_producto === s.id_producto)
  if (!prod) return
  const ex = carrito.value.find(c => c.producto.id_producto === prod.id_producto)
  if (ex) {
    ex.cantidad++
  } else {
    // Se agrega al precio dinámico sugerido por la IA
    carrito.value.push({ producto: prod, cantidad: 1, precio: precioSugerido(s) })
  }
}

// Recalcular sugerencias cuando cambia la orden (con pequeño debounce)
let temporizadorSugerencias = null
watch(carrito, () => {
  clearTimeout(temporizadorSugerencias)
  temporizadorSugerencias = setTimeout(cargarSugerencias, 400)
}, { deep: true })

function sumar(idx) {
  carrito.value[idx].cantidad++
}

function restar(idx) {
  if (carrito.value[idx].cantidad > 1) {
    carrito.value[idx].cantidad--
  } else {
    carrito.value.splice(idx, 1)
  }
}

function cerrarSesion() {
  tienda.cerrarSesion()
  router.push('/login')
}

// Detectar si es dispositivo movil
const esCelular = ref(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))

function abrirModalCobro() {
  modalCobro.value = true
  errorCobro.value = ''
  metodoPago.value = 'Transferencia QR'
  requierePin.value = false
  camaraActiva.value = false
  ampliarQr.value = false
  comprobanteValido.value = false
  billeteraVerificada.value = false
  nombreBilleteraVerificada.value = ''
  saldoBilleteraVerificada.value = 0
  formCobro.value = {
    qr_billetera: '',
    pin: '',
    monto_recibido: 0,
    cambio_dado: -totalCarrito.value,
    url_comprobante_ya_subido: null,
    ocr_transaccion_id: '',
    id_mesa: mesaSeleccionada.value?.id_mesa || null
  }
  if (clienteSeleccionado.value) formCobro.value.id_cliente = clienteSeleccionado.value.id_usuario
}

function cambiarMetodo(metodo) {
  if (camaraActiva.value) {
    detenerEscaneoCamara()
    camaraActiva.value = false
  }
  metodoPago.value = metodo
  errorCobro.value = ''
  requierePin.value = false
}

function activarCamaraScanner() {
  camaraActiva.value = true
  errorCobro.value = ''
  nextTick(() => {
    iniciarEscaneoCamara()
  })
}

function calcularCambio() {
  const recibido = parseFloat(formCobro.value.monto_recibido) || 0
  formCobro.value.cambio_dado = recibido - totalCarrito.value
}

async function alSeleccionarComprobanteYValidar(e) {
  if (e.target.files.length > 0) {
    const archivo = e.target.files[0]
    
    // Enviar al motor de validación OCR
    validandoOCR.value = true
    errorCobro.value = ''
    try {
      const formData = new FormData()
      formData.append('comprobante', archivo)
      formData.append('monto_esperado', totalCarrito.value)
      
      const res = await clienteHttp.post('/comandas/validar-comprobante', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (res.valido) {
        comprobanteValido.value = true
        formCobro.value.url_comprobante_ya_subido = res.url_comprobante
        formCobro.value.ocr_transaccion_id = res.transaccionId
        // AUTO-CONFIRMAR EL PAGO DE TRANSFERENCIA
        await procesarCobro()
      }
    } catch (err) {
      errorCobro.value = err.response?.data?.error || err.error || 'No se pudo validar el comprobante mediante IA'
    } finally {
      validandoOCR.value = false
    }
  }
}

const esCobroValido = computed(() => {
  if (metodoPago.value === 'Efectivo' && formCobro.value.cambio_dado < 0) return false
  if (metodoPago.value === 'Transferencia QR' && !comprobanteValido.value) return false
  if (metodoPago.value === 'Billetera' && !formCobro.value.qr_billetera) return false
  return true
})

async function procesarCobro() {
  errorCobro.value = ''
  procesando.value = true
  
  try {
    // Si escaneó la billetera y es la primera vez, el backend nos dirá si requiere PIN.
    // Para simplificar, enviaremos todo en el primer intento.
    const productosOrden = carrito.value.map(c => ({
      id_producto: c.producto.id_producto,
      cantidad: c.cantidad,
      // precio dinámico (si se fijó desde una sugerencia); el backend lo valida dentro del rango
      ...(c.precio != null ? { precio_unitario: c.precio } : {}),
      subtotal: precioItem(c) * c.cantidad
    }))
    
    const res = await servicioComandas.crear({
      productos: productosOrden,
      metodo_pago: metodoPago.value,
      ...formCobro.value
    })
    
    // Exito - Guardar detalles para el recibo antes de limpiar
    detalleExito.value = {
      monto: totalCarrito.value,
      cliente: res.nombres_cliente || (clienteSeleccionado.value 
        ? `${clienteSeleccionado.value.nombres} ${clienteSeleccionado.value.apellidos || ''}`.trim()
        : 'Sin registro / Barra'),
      metodo: metodoPago.value,
      transaccionId: res.id_transaccion || (res.id_comanda ? `TR-${res.id_comanda}` : 'N/D'),
      saldo_restante: res.saldo_restante
    }
    
    carrito.value = []
    clienteSeleccionado.value = null
    verCarritoMovil.value = false
    mostrarExito.value = true
    cerrarModalCobro()
  } catch (err) {
    // Si el error es 403 y dice PIN requerido, mostramos el input
    if (err.error?.includes('PIN')) {
      requierePin.value = true
      errorCobro.value = 'Verificación de Seguridad Requerida'
      detenerEscaneoCamara()
    } else {
      errorCobro.value = err.error || 'Ocurrió un error al procesar el pago'
      if (metodoPago.value === 'Billetera' && !requierePin.value) iniciarEscaneoCamara()
    }
  } finally {
    procesando.value = false
  }
}

function cerrarModalCobro() {
  if (camaraActiva.value) {
    detenerEscaneoCamara()
    camaraActiva.value = false
  }
  modalCobro.value = false
  ampliarQr.value = false
  errorCobro.value = ''
  requierePin.value = false
  comprobanteValido.value = false
  billeteraVerificada.value = false
}

async function verificarBilleteraBackend() {
  if (!formCobro.value.qr_billetera) return
  errorCobro.value = ''
  procesando.value = true
  try {
    const res = await clienteHttp.post('/comandas/verificar-billetera', {
      qr_billetera: formCobro.value.qr_billetera
    })
    billeteraVerificada.value = true
    nombreBilleteraVerificada.value = res.nombre_usuario
    requierePin.value = res.requiere_pin
    formCobro.value.qr_billetera = res.identificador_real
    saldoBilleteraVerificada.value = res.saldo_actual
  } catch (err) {
    errorCobro.value = err.response?.data?.error || err.error || 'Billetera no encontrada o dato incorrecto.'
    billeteraVerificada.value = false
  } finally {
    procesando.value = false
  }
}

let scannerInstancia = null
const qrDetectado = ref(false)

async function escanearQrDesdeImagen(e) {
  if (e.target.files.length === 0) return
  
  const file = e.target.files[0]
  try {
    procesando.value = true
    errorCobro.value = ''
    const html5QrCode = new Html5Qrcode("reader")
    const decodedText = await html5QrCode.scanFile(file, true)
    formCobro.value.qr_billetera = decodedText
    await verificarBilleteraBackend()
  } catch (err) {
    errorCobro.value = 'No se pudo detectar un QR claro en la foto. Asegúrate de enfocar bien e intenta de nuevo.'
    console.error('Error leyendo QR:', err)
  } finally {
    procesando.value = false
  }
}

function iniciarEscaneoCamara() {
  qrDetectado.value = false
  scannerInstancia = new Html5Qrcode("reader")
  scannerInstancia.start(
    { facingMode: "environment" },
    { fps: 10 },
    async (decodedText) => {
      // Feedback visual: mostrar cuadro verde antes de detener
      qrDetectado.value = true
      setTimeout(async () => {
        detenerEscaneoCamara()
        formCobro.value.qr_billetera = decodedText
        await verificarBilleteraBackend()
      }, 400)
    },
    (errorMessage) => {
      // Ignorar errores de frame mientras busca
    }
  ).catch(err => {
    errorCobro.value = "No se pudo acceder a la cámara. Permisos denegados."
    camaraActiva.value = false
  })
}

function detenerEscaneoCamara() {
  qrDetectado.value = false
  if (scannerInstancia && scannerInstancia.isScanning) {
    scannerInstancia.stop().then(() => {
      scannerInstancia.clear()
    }).catch(e => console.error("Error al detener cámara", e))
  }
  camaraActiva.value = false
}

function procesarCobroSiHayQr() {
  // ya no lo auto-procesamos para cobrar directo, solo verificamos
  if (formCobro.value.qr_billetera && formCobro.value.qr_billetera.trim() !== '') {
    verificarBilleteraBackend()
  }
}

function verificarPinLleno() {
  if (formCobro.value.pin && formCobro.value.pin.length === 4) {
    procesarCobro()
  }
}

// Al cambiar de mesa buscar si hay reserva activa
async function alCambiarMesa() {
  clienteAutoAsignado.value = ''
  if (!mesaSeleccionada.value) {
    // Pedido en barra: limpiar cliente autollenado si lo habia
    return
  }
  try {
    const res = await clienteHttp.get(`/mesas/${mesaSeleccionada.value.id_mesa}/reserva`)
    if (res && res.cliente) {
      clienteSeleccionado.value = res.cliente
      clienteAutoAsignado.value = `${res.cliente.nombres} ${res.cliente.apellidos}`.trim()
    }
  } catch {
    // Sin reserva asociada — normal
  }
}

function buscarClientes() {
  clearTimeout(timeoutBusqueda)
  if (!busquedaCliente.value || busquedaCliente.value.length < 2) {
    clientesBuscados.value = []
    return
  }
  
  timeoutBusqueda = setTimeout(async () => {
    try {
      const res = await clienteHttp.get(`/usuarios?busqueda=${busquedaCliente.value}&rol=Cliente`)
      clientesBuscados.value = res
    } catch (error) {
      console.error('Error buscando clientes:', error)
    }
  }, 300)
}

function seleccionarCliente(cli) {
  clienteSeleccionado.value = cli
  busquedaCliente.value = ''
  clientesBuscados.value = []
}

function quitarCliente() {
  clienteSeleccionado.value = null
}

async function crearClienteRapido() {
  creandoCliente.value = true
  errorNuevoCliente.value = ''
  avisoNitExistente.value = false
  try {
    const payload = {
      ci_carnet: formNuevoCliente.value.ci_carnet,
      nombres: formNuevoCliente.value.nombres,
      apellidos: '',
      telefono: ''
    }
    const res = await clienteHttp.post('/usuarios/cliente-rapido', payload)
    seleccionarCliente(res.usuario)
    if (res.yaExistia) avisoNitExistente.value = true
    // Cerrar despues de breve pausa si ya existia (para que lea el aviso)
    setTimeout(() => {
      modalNuevoCliente.value = false
      formNuevoCliente.value = { nombres: '', apellidos: '', ci_carnet: '', telefono: '' }
      avisoNitExistente.value = false
    }, res.yaExistia ? 1500 : 0)
  } catch (error) {
    errorNuevoCliente.value = error.response?.data?.error || 'Error al registrar cliente'
  } finally {
    creandoCliente.value = false
  }
}

// ==== GESTIÓN DE PEDIDOS LISTOS ====
async function cargarPedidosListos() {
  try {
    const res = await clienteHttp.get('/comandas/mis-listos')
    pedidosListos.value = res
  } catch(e) {
    console.error('Error al cargar pedidos listos', e)
  }
}

async function entregarPedido(id) {
  procesandoEntrega.value = id
  try {
    await clienteHttp.patch(`/comandas/${id}/estado`, { estado: 'Completada' })
    pedidosListos.value = pedidosListos.value.filter(p => p.id_comanda !== id)
    if (pedidosListos.value.length === 0) {
      mostrarModalListos.value = false
    }
  } catch(e) {
    alert('Error al entregar pedido. Intenta de nuevo.')
  } finally {
    procesandoEntrega.value = null
  }
}

onMounted(() => {
  cargarPedidosListos()
  
  socket = io({ path: '/socket.io' })
  socket.on('pedido_listo', (data) => {
    if (data.id_mesero === tienda.usuario?.id) {
      cargarPedidosListos()
      agregarToast(`¡El pedido #${data.id_comanda} está listo en la barra!`)
      // Intentar reproducir sonido de notificación
      try {
        const audio = new Audio('/notificacion.mp3')
        audio.play().catch(e => {})
      } catch (e) {}
    }
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.vista-pos {
  /* Mapeo de variables locales indefinidas hacia la paleta global */
  --fondo-principal: var(--fondo-app);
  --fondo-oscuro: var(--fondo-sidebar);
  --color-primario: var(--rosa-acento);
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--fondo-principal);
}

.pos-header {
  height: 60px;
  background: var(--fondo-oscuro);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.logo-mini { height: 30px; margin-right: 15px; }
.logo-area { display: flex; align-items: center; }
.badge-rol { background: var(--morado-brillante); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; color: #fff;}

.usuario-area { display: flex; align-items: center; gap: 15px; font-size: 0.9rem; }

.pos-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel-productos {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--fondo-principal);
  padding: 20px;
  overflow: hidden; /* Importante: el scroll lo hace .lista-productos internamente */
}

.lista-productos {
  flex: 1;
  overflow-y: auto;
}

.buscador {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.05);
  padding: 12px 20px;
  border-radius: 30px;
  margin-bottom: 20px;
}
.buscador svg { width: 20px; height: 20px; color: var(--texto-secundario); margin-right: 10px; }
.buscador input { background: transparent; border: none; color: #fff; width: 100%; font-size: 1rem; outline: none; }

.categorias-scroll { display: flex; gap: 10px; overflow-x: auto; margin-bottom: 20px; padding-bottom: 5px; }
.categorias-scroll::-webkit-scrollbar { height: 4px; }
.categorias-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
.btn-categoria { padding: 8px 16px; border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--texto-secundario); white-space: nowrap; cursor: pointer; transition: 0.2s; font-weight: 500; }
.btn-categoria:hover { background: rgba(255,255,255,0.1); }
.btn-categoria.activo { background: var(--morado-brillante); color: #fff; border-color: var(--morado-brillante); }

.grid-productos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
}

.tarjeta-producto-pos {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
}
.tarjeta-producto-pos:hover { transform: translateY(-5px); border-color: var(--rosa-acento); }

.img-producto { width: 100%; height: 120px; object-fit: cover; }
.info-producto { padding: 12px; text-align: center; }
.info-producto h5 { font-size: 0.95rem; margin-bottom: 5px; color: var(--texto-principal); }
.info-producto .precio { color: var(--color-primario); font-weight: 700; font-size: 1.1rem; }

.panel-carrito {
  width: 380px;
  background: var(--fondo-oscuro);
  border-left: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.titulo-carrito { margin-bottom: 20px; font-size: 1.2rem; }

.lista-carrito { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.vacio-carrito { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--texto-desactivado); }
.vacio-carrito svg { width: 40px; height: 40px; margin-bottom: 10px; opacity: 0.5; }

.item-carrito {
  background: rgba(255,255,255,0.03);
  padding: 12px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.item-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.item-nombre { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-precio { color: var(--color-primario); font-size: 0.85rem; }

.item-controles { display: flex; align-items: center; background: rgba(255,255,255,0.1); border-radius: 20px; flex-shrink: 0; }
.item-controles button { background: transparent; border: none; color: #fff; width: 32px; height: 32px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; }
.item-controles .cantidad { width: 25px; text-align: center; font-weight: bold; font-size: 0.9rem; }

/* Sugerencias IA */
.seccion-sugerencias {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--borde-sutil);
}
.sugerencias-titulo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--rosa-acento);
  margin-bottom: 10px;
}
.sugerencias-lista {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-sugerencia {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-activo);
  color: var(--texto-principal);
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.chip-sugerencia:hover {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border-color: transparent;
  transform: translateY(-1px);
}
.chip-mas {
  font-weight: 800;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.85;
}
.chip-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chip-prob {
  background: rgba(34, 197, 94, 0.18);
  color: var(--color-exito);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
}
.chip-precio {
  color: var(--texto-secundario);
  font-size: 0.78rem;
  font-weight: 700;
}
.chip-sugerencia:hover .chip-prob { background: rgba(255,255,255,0.25); color: #fff; }
.chip-sugerencia:hover .chip-precio { color: #fff; }
.etiqueta-ia {
  font-size: 0.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  color: #fff;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  vertical-align: middle;
}

.total-carrito {
  margin-top: 20px;
  padding: 20px 0;
  border-top: 1px dashed rgba(255,255,255,0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.total-carrito h2 { color: var(--color-primario); font-size: 1.8rem; }

.btn-cobrar { height: 60px; font-size: 1.2rem; }

/* Selector de Mesa */
.selector-mesa { margin-bottom: 12px; }
.mesa-selector-row { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 4px 12px; }
.mesa-icono { color: var(--texto-secundario); display: flex; align-items: center; flex-shrink: 0; }
.select-mesa { flex: 1; background: transparent; border: none; color: #fff; font-size: 0.9rem; padding: 10px 0; outline: none; cursor: pointer; }
.select-mesa option { background: var(--fondo-oscuro); color: #fff; }
.cliente-auto-mesa { display: flex; align-items: center; gap: 6px; background: rgba(46,204,113,0.08); border: 1px solid rgba(46,204,113,0.25); border-radius: 8px; padding: 8px 12px; font-size: 0.8rem; color: var(--color-exito); margin-top: 6px; }

/* Buscador de Cliente */
.buscador-cliente { margin-bottom: 12px; position: relative; }
.buscador-cliente-row { display: flex; gap: 8px; align-items: center; }
.input-cliente { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 11px 14px; border-radius: 12px; font-size: 0.88rem; outline: none; transition: 0.2s; }
.input-cliente:focus { border-color: var(--morado-brillante); background: rgba(255,255,255,0.07); }
.btn-nuevo-cliente { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; box-shadow: 0 3px 12px rgba(219,39,119,0.3); transition: 0.2s; }
.btn-nuevo-cliente:active { transform: scale(0.93); }
.resultados-cliente { position: absolute; top: 100%; left: 0; right: 0; z-index: 200; background: var(--fondo-oscuro); border: 1px solid var(--borde-sutil); border-radius: 12px; overflow: hidden; margin-top: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.item-cliente { padding: 12px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; transition: 0.15s; }
.item-cliente:hover { background: rgba(255,255,255,0.06); }
.item-cliente strong { font-size: 0.9rem; }
.item-cliente small { color: var(--texto-secundario); font-size: 0.78rem; }
.cliente-seleccionado { display: flex; justify-content: space-between; align-items: center; background: rgba(46,204,113,0.08); border: 1px solid rgba(46,204,113,0.25); padding: 10px 12px; border-radius: 10px; margin-top: 8px; font-size: 0.88rem; color: var(--color-exito); }
.btn-quitar-cliente { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.25); color: var(--color-error); width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.15s; }
.btn-quitar-cliente:hover { background: rgba(231,76,60,0.2); }

/* ============================
   MODAL DE COBRO — Mobile First
   ============================ */
.cobro-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 5000; display: flex; align-items: flex-end; justify-content: center; }
.cobro-sheet { background: var(--fondo-tarjeta); border-radius: 24px 24px 0 0; width: 100%; max-width: 540px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }

.cobro-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; background: var(--fondo-oscuro); border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.cobro-label { font-size: 0.75rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.cobro-total { font-size: 2rem; font-weight: 800; color: var(--color-primario); margin: 0; }
.cobro-cerrar { background: rgba(255,255,255,0.08); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.cobro-cerrar:active { background: rgba(255,255,255,0.15); }

.cobro-tabs { display: flex; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
.cobro-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 4px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--texto-secundario); cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: 0.2s; }
.cobro-tab svg { flex-shrink: 0; }
.cobro-tab.activo { color: var(--rosa-acento); border-bottom-color: var(--rosa-acento); background: rgba(255,255,255,0.02); }

.cobro-cuerpo { flex: 1; overflow-y: auto; padding: 0; }
.cobro-panel { padding: 24px 20px; }
.cobro-instruccion { color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; text-align: center; }
.cobro-error { color: var(--color-error); background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); border-radius: 8px; padding: 12px 16px; text-align: center; font-size: 0.9rem; margin: 0 20px 20px; }

.cobro-pie { padding: 16px 20px; background: rgba(0,0,0,0.25); display: flex; gap: 10px; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.06); }
.cobro-btn-cancel { flex: 0 0 auto; padding: 14px 20px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; color: var(--texto-secundario); font-size: 0.95rem; font-weight: 600; cursor: pointer; }
.cobro-btn-ok { flex: 1; padding: 14px; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); border: none; border-radius: 14px; color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(219,39,119,0.3); transition: 0.2s; }
.cobro-btn-ok:disabled { opacity: 0.5; cursor: not-allowed; }

/* QR Transferencia */
.qr-row { display: flex; gap: 16px; align-items: center; margin-bottom: 4px; }
.qr-mini { width: 100px; height: 100px; border-radius: 12px; border: 2px solid var(--rosa-acento); flex-shrink: 0; }
.qr-acciones { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.qr-total-txt { font-size: 1.1rem; font-weight: 600; }
.btn-accion-qr { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: 0.2s; }
.btn-accion-qr:active { background: rgba(255,255,255,0.12); }

/* OCR zona */
.ocr-zona { background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 14px; padding: 24px; text-align: center; }
.btn-camara-label { display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); color: #fff; padding: 14px 20px; border-radius: 30px; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 20px rgba(219,39,119,0.35); transition: 0.2s; }
.btn-camara-label:active { transform: scale(0.97); }
.ia-verificando { color: var(--color-info); font-weight: 600; position: relative; overflow: hidden; padding: 20px 0; }
.ia-barra { width: 100%; height: 3px; background: var(--color-info); position: absolute; top: 0; left: 0; animation: scan 1.5s infinite; box-shadow: 0 0 10px var(--color-info); }
.ia-ok { color: var(--color-exito); font-weight: 700; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 10px; }
@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }

/* Billetera */
.billetera-inicio { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.btn-activar-camara { display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); color: #fff; border: none; padding: 16px 28px; border-radius: 30px; font-weight: 700; font-size: 1.05rem; cursor: pointer; box-shadow: 0 4px 20px rgba(155,89,182,0.4); transition: 0.2s; }
.btn-activar-camara:active { transform: scale(0.97); }
.camara-zona { display: flex; flex-direction: column; gap: 12px; }
.btn-stop-camara { display: flex; align-items: center; gap: 8px; background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: var(--color-error); padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; align-self: center; }
.input-qr { width: 100%; box-sizing: border-box; min-width: 0; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); color: #fff; font-size: 1rem; outline: none; text-align: center; }
.input-qr:focus { border-color: var(--morado-brillante); }

/* === QR SCANNER OVERLAY === */
.qr-scanner-wrapper { position: relative; width: 100%; border-radius: 16px; overflow: hidden; background: #000; }
.qr-scanner-wrapper #reader { width: 100%; height: 300px; }
.qr-scanner-wrapper #reader__dashboard_section_csr,
.qr-scanner-wrapper #reader__status_span { display: none !important; }
.qr-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; pointer-events: none; }
.qr-overlay-top, .qr-overlay-bottom { flex: 1; background: rgba(0,0,0,0.55); }
.qr-overlay-middle { display: flex; flex-direction: row; }
.qr-overlay-side { flex: 1; background: rgba(0,0,0,0.55); }
.qr-overlay-bottom { display: flex; align-items: flex-start; justify-content: center; padding-top: 10px; }
.qr-viewfinder { width: 220px; height: 220px; position: relative; transition: box-shadow 0.3s ease; }
.qr-viewfinder.qr-detected { box-shadow: 0 0 0 3px var(--color-exito) inset, 0 0 20px rgba(6,214,160,0.5); }
.corner { position: absolute; width: 22px; height: 22px; border-color: #fff; border-style: solid; transition: border-color 0.3s ease; }
.qr-viewfinder.qr-detected .corner { border-color: var(--color-exito); }
.corner.tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.corner.tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
.scan-line { position: absolute; left: 8px; right: 8px; height: 2px; background: linear-gradient(90deg, transparent, var(--morado-brillante), var(--color-info), var(--morado-brillante), transparent); box-shadow: 0 0 8px rgba(170,59,255,0.8); animation: scan-move 1.8s ease-in-out infinite; }
@keyframes scan-move { 0% { top: 10px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: calc(100% - 10px); opacity: 0; } }
.qr-hint { color: rgba(255,255,255,0.75); font-size: 0.78rem; text-align: center; margin: 0; padding: 0 8px; text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.qr-hint-ok { color: var(--color-exito); font-weight: 700; font-size: 0.85rem; }


/* PIN */
.pin-zone { display: flex; flex-direction: column; align-items: center; padding: 20px 0; text-align: center; }
.pin-titulo { font-weight: 700; font-size: 1.1rem; margin: 12px 0 4px; }
.pin-sub { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 16px; }
.input-pin { width: 200px; max-width: 100%; box-sizing: border-box; text-align: center; font-size: 2.5rem; letter-spacing: 15px; background: transparent; border: none; border-bottom: 3px solid var(--morado-brillante); color: #fff; padding: 10px 0; outline: none; }
.input-pin:focus { border-bottom-color: var(--rosa-acento); }

/* Efectivo */
.efectivo-display { text-align: center; margin-bottom: 20px; }
.efectivo-label { font-size: 0.7rem; color: var(--texto-secundario); letter-spacing: 2px; font-weight: 700; }
.efectivo-input { width: 100%; box-sizing: border-box; text-align: center; font-size: clamp(2rem, 10vw, 3rem); font-weight: 800; background: transparent; border: none; border-bottom: 3px solid var(--morado-brillante); color: #fff; padding: 10px 0; margin-top: 10px; outline: none; }
.efectivo-input:focus { border-bottom-color: var(--rosa-acento); }
.cambio-display { background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); padding: 18px 20px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; }
.cambio-label { font-size: 0.75rem; color: var(--texto-secundario); font-weight: 700; letter-spacing: 1px; }
.cambio-valor { font-size: 1.8rem; font-weight: 800; color: var(--color-exito); }
.cambio-insuf { background: rgba(231,76,60,0.1); border-color: rgba(231,76,60,0.3); }
.cambio-insuf .cambio-valor { color: var(--color-error); }

/* QR Fullscreen */
.qr-fullscreen { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
.qr-fullscreen-img { width: min(88vw, 380px); height: min(88vw, 380px); border-radius: 16px; border: 3px solid var(--rosa-acento); box-shadow: 0 0 40px rgba(236,72,153,0.3); }
.qr-fullscreen-hint { color: rgba(255,255,255,0.4); margin-top: 24px; font-size: 0.9rem; }

/* Modal Exito */
.exito-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.exito-card { background: var(--fondo-tarjeta); border: 1px solid rgba(46,204,113,0.4); border-radius: 24px; padding: 40px 30px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); max-width: 320px; text-align: center; animation: pop 0.3s ease; }
.exito-card h3 { font-size: 1.4rem; color: var(--color-exito); }
.exito-card p { font-size: 0.9rem; color: var(--texto-secundario); }
@keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

#reader { width: 100%; min-height: 220px; }

.ia-aprobado svg { width: 50px; height: 50px; }
@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }

/* Efectivo Gigante */
.input-efectivo-grande { text-align: center; margin-bottom: 20px; }
.input-efectivo-grande label { font-weight: 800; color: var(--texto-secundario); letter-spacing: 2px; font-size: 0.8rem; }
.input-monto-gigante { width: 100%; box-sizing: border-box; text-align: center; font-size: clamp(2.2rem, 11vw, 3.5rem); font-weight: 800; background: transparent; border: none; border-bottom: 3px solid var(--morado-brillante); color: #fff; padding: 10px 0; margin-top: 10px; outline: none; }
.input-monto-gigante:focus { border-bottom-color: var(--rosa-acento); }
.cambio-mostrar { background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.3); padding: 20px; border-radius: 12px; text-align: center; }
.cambio-mostrar h2 { color: var(--color-exito); margin-top: 5px; font-size: 2.5rem; }
.cambio-negativo { background: rgba(231, 76, 60, 0.1); border-color: rgba(231, 76, 60, 0.3); }
.cambio-negativo h2 { color: var(--color-error); }

.mt-15 { margin-top: 15px; }

/* Buscador Cliente */
.buscador-cliente { position: relative; margin-bottom: 15px; }
.input-cliente { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px; font-size: 0.9rem; }
.input-cliente:focus { border-color: var(--morado-brillante); outline: none; }
.btn-nuevo-cliente { background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); border: none; color: #fff; width: 40px; height: 40px; border-radius: 8px; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
.btn-nuevo-cliente:active { transform: scale(0.95); }
.resultados-cliente { position: absolute; top: 100%; left: 0; right: 0; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 100; margin-top: 5px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
.item-cliente { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; display: flex; flex-direction: column; }
.item-cliente:hover { background: rgba(255,255,255,0.05); }
.item-cliente small { color: var(--texto-secundario); font-size: 0.75rem; }
.cliente-seleccionado { display: flex; justify-content: space-between; align-items: center; background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 0.9rem; color: var(--color-exito); }
.btn-quitar-cliente { background: transparent; border: none; color: var(--color-error); cursor: pointer; font-size: 1.1rem; }

/* Modal Nuevo Cliente Centrado */
.modal-overlay-centrado {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  padding: 20px;
}
.modal-nuevo-cliente {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  overflow: hidden;
}
.modal-nuevo-body {
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.campo-nuevo-cliente {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.15);
  color: #fff;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: 0.2s;
}
.campo-nuevo-cliente:focus {
  border-color: var(--morado-brillante);
  background: rgba(255,255,255,0.08);
}
.modal-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}
.modal-cabecera h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}
.btn-cerrar-modal-cliente {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: var(--texto-secundario);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-cerrar-modal-cliente:hover {
  background: rgba(231, 76, 60, 0.2);
  color: var(--color-error);
  transform: rotate(90deg);
}
.modal-nuevo-pie {
  padding: 20px 25px;
  background: rgba(0,0,0,0.25);
  display: flex;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.modal-nuevo-pie .btn-cancelar {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--texto-principal);
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}
.modal-nuevo-pie .btn-cancelar:hover {
  background: rgba(255, 255, 255, 0.15);
}
.modal-nuevo-pie .btn-confirmar {
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border: none;
  color: #fff;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(219, 39, 119, 0.3);
  transition: all 0.2s ease;
  flex: 1.5;
}
.modal-nuevo-pie .btn-confirmar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(219, 39, 119, 0.4);
}
.modal-nuevo-pie .btn-confirmar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.aviso-nit {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(46,204,113,0.1);
  border: 1px solid rgba(46,204,113,0.3);
  color: var(--color-exito);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
}

.header-carrito-seccion {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}
.btn-volver-productos {
  display: none;
}
.btn-flotante-carrito-movil {
  display: none;
}

/* Estilos del Recibo de Éxito IA */
.exito-card-detallado {
  background: var(--fondo-tarjeta);
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 24px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  max-width: 400px;
  width: 90%;
  text-align: center;
  animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.exito-card-detallado h3 {
  font-size: 1.35rem;
  color: var(--color-exito);
  font-weight: 800;
  margin: 5px 0 0;
}
.exito-sub {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  margin: 0;
  line-height: 1.4;
}
.exito-icono-anillo {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: rgba(46, 204, 113, 0.1);
  border: 2px solid rgba(46, 204, 113, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(46, 204, 113, 0.2);
}
.recibo-ia {
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 10px 0;
  text-align: left;
}
.recibo-fila {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
}
.recibo-etiq {
  color: var(--texto-secundario);
  font-weight: 500;
}
.recibo-val {
  color: #fff;
  font-weight: 700;
}
.recibo-val.destacado {
  color: var(--color-exito);
  font-size: 1.25rem;
  font-weight: 900;
}
.recibo-val.badge-metodo {
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}
.recibo-val-mono {
  font-family: monospace;
  color: var(--rosa-acento);
  font-weight: bold;
}
.recibo-ia-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(46, 204, 113, 0.06);
  border: 1px solid rgba(46, 204, 113, 0.15);
  border-radius: 10px;
  padding: 8px;
  font-size: 0.78rem;
  color: var(--color-exito);
  font-weight: 600;
  margin-top: 5px;
}
.btn-exito-continuar {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(219,39,119,0.3);
  transition: all 0.2s ease;
}
.btn-exito-continuar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(219,39,119,0.4);
}
.btn-exito-continuar:active {
  transform: scale(0.97);
}

/* Responsive Mobile */
@media (max-width: 768px) {
  .pos-layout {
    position: relative;
    height: calc(100vh - 60px);
    height: calc(100dvh - 60px);
    overflow: hidden;
  }
  
  .panel-productos {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 15px;
  }
  .panel-productos.oculto-movil {
    display: none !important;
  }
  
  .panel-carrito {
    width: 100% !important;
    height: 100% !important;
    border-left: none;
    position: absolute;
    inset: 0;
    z-index: 980;
    background: var(--fondo-principal);
    display: none !important;
    flex-direction: column;
    padding: 15px;
  }
  .panel-carrito.mostrar-movil {
    display: flex !important;
  }
  
  .btn-volver-productos {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--texto-secundario);
    padding: 8px 14px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-volver-productos:active {
    background: rgba(255, 255, 255, 0.15);
  }
  
  .btn-flotante-carrito-movil {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento));
    padding: 16px 24px;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(219, 39, 119, 0.45);
    color: #fff;
    font-weight: 700;
    z-index: 999;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-flotante-carrito-movil:active {
    transform: scale(0.96);
  }
  .carrito-badge {
    background: #fff;
    color: var(--rosa-acento);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 800;
  }
  
  .grid-productos {
    grid-template-columns: repeat(2, 1fr);
  }
  .btn-cobrar {
    margin-bottom: 20px;
  }
}

/* Tablet: aprovechar mejor el ancho del carrito lateral */
@media (min-width: 769px) and (max-width: 1024px) {
  .panel-carrito {
    width: min(340px, 40vw);
  }
}

/* Celular angosto: evitar desbordes de inputs grandes y modales */
@media (max-width: 480px) {
  .pos-header {
    padding: 0 12px;
  }
  .usuario-area {
    gap: 8px;
    font-size: 0.8rem;
  }
  .btn-campana {
    margin: 0 8px;
  }
  .cobro-panel {
    padding: 20px 16px;
  }
  .cobro-header {
    padding: 16px 16px 12px;
  }
  .cobro-total {
    font-size: 1.6rem;
  }
  .cobro-pie {
    padding: 14px 16px;
  }
  /* PIN: reducir tracking para que quepan los 4 digitos sin cortar */
  .input-pin {
    font-size: 2rem;
    letter-spacing: 10px;
    width: 100%;
  }
  .qr-row {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  .qr-mini {
    align-self: center;
  }
  .modal-nuevo-body {
    padding: 20px 16px;
  }
  .modal-cabecera,
  .modal-nuevo-pie {
    padding: 16px;
  }
  .exito-card-detallado {
    padding: 24px 18px;
  }
  .grid-productos {
    gap: 10px;
  }
}

/* CSS PARA LA CAMPANA EN EL HEADER */
.btn-campana {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 15px;
}
.btn-campana:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}
.btn-campana.activo {
  background: rgba(6, 214, 160, 0.15);
  border-color: var(--color-exito);
  color: var(--color-exito);
}
.campana-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-error);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  animation: pulse-rojo 2s infinite;
}
@keyframes pulse-rojo {
  0% { box-shadow: 0 0 0 0 rgba(239, 71, 111, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(239, 71, 111, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 71, 111, 0); }
}

/* VISTA: PEDIDOS LISTOS (REEMPLAZO DEL BANNER/MODAL) */
.vista-pedidos-listos {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--fondo-app);
  overflow-y: auto;
}

.vpl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.vpl-titulo {
  display: flex;
  align-items: center;
  gap: 15px;
}
.vpl-titulo h2 {
  margin: 0;
  font-size: 1.5rem;
  color: white;
}

.vacio-listos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--texto-secundario);
  text-align: center;
}
.vacio-listos p {
  font-size: 1.1rem;
}
.mt-15 { margin-top: 15px; }

.grid-listos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.card-listo-full {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(6, 214, 160, 0.3);
  border-left: 5px solid var(--color-exito);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.card-listo-full:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.clf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.clf-orden {
  font-size: 1.3rem;
  font-weight: 900;
  color: white;
}
.clf-destino {
  background: var(--rosa-acento);
  color: white;
  font-weight: bold;
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 12px;
}
.clf-destino.vip { background: var(--morado-medio); }

.clf-cliente {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: var(--texto-secundario);
  background: rgba(0,0,0,0.2);
  padding: 8px 12px;
  border-radius: 8px;
}

.clf-prods {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0;
}
.clf-prod-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.clf-cant {
  background: var(--color-exito);
  color: black;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  min-width: 32px;
  text-align: center;
}
.clf-nom {
  color: white;
  font-size: 1rem;
}

.btn-entregar-full {
  margin-top: auto;
  width: 100%;
  padding: 12px;
  background: rgba(6, 214, 160, 0.1);
  color: var(--color-exito);
  border: 1px solid rgba(6, 214, 160, 0.4);
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-entregar-full:hover:not(:disabled) {
  background: var(--color-exito);
  color: black;
}

@media (max-width: 768px) {
  .vpl-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  .grid-listos {
    grid-template-columns: 1fr;
  }
}


/* TOASTS NOTIFICATIONS */
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
  pointer-events: none;
}

.toast-item {
  background: rgba(0,0,0,0.85);
  border-left: 4px solid var(--color-exito);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: bold;
  font-size: 0.95rem;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  pointer-events: auto;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.4s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
