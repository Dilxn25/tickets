<template>
  <div class="vista-pos fade-in">
    <!-- Navbar POS -->
    <header class="pos-header">
      <div class="logo-area">
        <img src="@/activos/imagenes/logo-euphoria.png" alt="Euphoria" class="logo-mini" />
        <span class="badge-rol">Caja / Mesero</span>
      </div>

      <!-- Evento que atiende el mesero: filtra mesas y mapa a UN solo evento -->
      <button v-if="eventoActivo" class="chip-evento" @click="modalEvento = true" title="Cambiar de evento">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span class="chip-evento-txt">{{ eventoActivo.nombre_evento }}</span>
        <svg v-if="eventosActivos.length > 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      <button class="btn-campana fade-in" :class="{ activo: mostrarModalListos }" @click="mostrarModalListos = !mostrarModalListos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span class="campana-badge" v-if="pedidosListos.length > 0">{{ pedidosListos.length }}</span>
      </button>

      <div class="usuario-area">
        <span>Hola, <strong>{{ tienda.usuario?.nombres }}</strong></span>
        <button class="btn btn-secundario btn-sm" @click="cerrarSesion">Salir</button>
      </div>
    </header>

    <!-- Aviso sutil en un rincón: el servicio de sugerencias (IA) no está disponible -->
    <transition name="chip-ia-anim">
      <div v-if="!iaEnLinea && !avisoIaDescartado" class="chip-ia">
        <span class="chip-ia-punto" aria-hidden="true"></span>
        <span class="chip-ia-txt">Sin sugerencias por ahora</span>
        <button class="chip-ia-avisar" :class="{ enviado: avisoIaEnviado }" @click="avisarCajaIA" :disabled="avisoIaEnviado">
          {{ avisoIaEnviado ? 'Avisado ✓' : 'Avisar a caja' }}
        </button>
        <button class="chip-ia-cerrar" @click="avisoIaDescartado = true" title="Ocultar" aria-label="Ocultar aviso">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </transition>

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

      <!-- Pedidos libres (pool): los liberó otro mesero, cualquiera puede llevarlos -->
      <div v-if="pedidosPool.length" class="pool-libres">
        <div class="pool-titulo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Pedidos libres para llevar
        </div>
        <div class="grid-listos">
          <div v-for="pp in pedidosPool" :key="pp.id_comanda" class="card-listo-full card-pool">
            <div class="clf-header">
              <span class="clf-orden">Orden #{{ pp.id_comanda }}</span>
              <span class="clf-crono" :class="cronoClase(pp.fecha_listo)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {{ cronoTexto(pp.fecha_listo) }}
              </span>
            </div>
            <div class="clf-subhead"><span class="clf-destino">{{ pp.mesa ? 'Mesa ' + pp.mesa : 'Barra' }}</span></div>
            <div class="clf-cliente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>{{ pp.cliente || 'Sin registro' }}</span>
            </div>
            <div class="clf-prods">
              <div v-for="(it, i) in pp.items" :key="i" class="clf-prod-item">
                <span class="clf-cant">{{ it.cantidad }}x</span>
                <span class="clf-nom">{{ it.nombre }}</span>
              </div>
            </div>
            <button class="btn-tomar" @click="tomarPedidoPool(pp)">Yo lo llevo</button>
          </div>
        </div>
      </div>

      <div v-if="pedidosListos.length === 0 && !pedidosPool.length" class="vacio-listos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="opacity:0.3; margin-bottom:15px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <p>No tienes pedidos pendientes de recoger.</p>
        <button class="btn btn-primario mt-15" @click="mostrarModalListos = false">Volver al Menú</button>
      </div>

      <!-- APARTADO 1: EN BARRA (por recoger) -->
      <div v-if="pedidosEnBarra.length" class="apartado-listos">
        <h4 class="apartado-tit barra">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M8 22h8"></path><path d="M12 11v11"></path><path d="M5 3l7 8 7-8H5z"></path></svg>
          En barra · por recoger
          <span class="apartado-n">{{ pedidosEnBarra.length }}</span>
        </h4>
        <div class="grid-listos escalonar">
          <transition-group name="list">
            <div v-for="ped in pedidosEnBarra" :key="ped.id_comanda" class="card-listo-full">
              <div class="clf-header">
                <span class="clf-orden">Orden #{{ ped.id_comanda }}</span>
                <span class="clf-crono" :class="cronoClase(ped.fecha_listo)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {{ cronoTexto(ped.fecha_listo) }}
                </span>
              </div>
              <div class="clf-subhead">
                <span class="clf-destino" v-if="ped.mesa_espacio">Mesa {{ ped.mesa_espacio.numero_nombre }}</span>
                <span class="clf-destino vip" v-else>Barra</span>
              </div>
              <div class="clf-cliente">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>{{ ped.usuario_comanda_id_clienteTousuario ? ped.usuario_comanda_id_clienteTousuario.nombres : 'Sin registro' }}</span>
              </div>
              <div class="clf-prods">
                <div v-for="det in ped.detalle_comanda" :key="det.id_detalle" class="clf-prod-item">
                  <span class="clf-cant">{{ det.cantidad }}x</span>
                  <span class="clf-nom">{{ det.producto?.nombre_producto }}</span>
                </div>
              </div>
              <div v-if="minutosListo(ped) >= UMBRAL_LISTO_MIN" class="clf-espera">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Lleva {{ minutosListo(ped) }} min listo. Recógelo o que lo lleve otro.
              </div>
              <div class="clf-acciones">
                <button class="btn-recogido" @click="marcarRecogido(ped.id_comanda)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 6 9 17l-5-5"></path></svg>
                  Recogí de la barra
                </button>
                <button v-if="minutosListo(ped) >= UMBRAL_LISTO_MIN" class="btn-liberar" @click="liberarPedido(ped.id_comanda)">
                  Que lo lleve otro
                </button>
              </div>
            </div>
          </transition-group>
        </div>
      </div>

      <!-- APARTADO 2: RECOGIDOS (por entregar al cliente) -->
      <div v-if="pedidosRecogidos.length" class="apartado-listos">
        <h4 class="apartado-tit recog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
          Recogidos · entregar al cliente
          <span class="apartado-n">{{ pedidosRecogidos.length }}</span>
        </h4>
        <div class="grid-listos escalonar">
          <transition-group name="list">
            <div v-for="ped in pedidosRecogidos" :key="ped.id_comanda" class="card-listo-full recogido">
              <div class="clf-header">
                <span class="clf-orden">Orden #{{ ped.id_comanda }}</span>
                <span class="clf-crono" :class="cronoClase(ped.fecha_listo)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {{ cronoTexto(ped.fecha_listo) }}
                </span>
              </div>
              <div class="clf-subhead">
                <span class="clf-destino" v-if="ped.mesa_espacio">Mesa {{ ped.mesa_espacio.numero_nombre }}</span>
                <span class="clf-destino vip" v-else>Barra</span>
              </div>
              <div class="clf-cliente">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>{{ ped.usuario_comanda_id_clienteTousuario ? ped.usuario_comanda_id_clienteTousuario.nombres : 'Sin registro' }}</span>
              </div>
              <div class="clf-prods">
                <div v-for="det in ped.detalle_comanda" :key="det.id_detalle" class="clf-prod-item">
                  <span class="clf-cant">{{ det.cantidad }}x</span>
                  <span class="clf-nom">{{ det.producto?.nombre_producto }}</span>
                </div>
              </div>
              <div class="clf-acciones">
                <button
                  v-if="ped.mesa_espacio"
                  class="btn-donde-llevar"
                  @click="abrirMapaDestino(ped.mesa_espacio.id_mesa, ped.mesa_espacio.numero_nombre, ped.usuario_comanda_id_clienteTousuario ? ped.usuario_comanda_id_clienteTousuario.nombres : null)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  Dónde llevar
                </button>
                <button class="btn-entregar-full" @click="entregarPedido(ped.id_comanda)" :disabled="procesandoEntrega === ped.id_comanda">
                  <span v-if="procesandoEntrega === ped.id_comanda">Procesando...</span>
                  <span v-else style="display:flex; align-items:center; justify-content:center; gap: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Entregado al cliente
                  </span>
                </button>
              </div>
            </div>
          </transition-group>
        </div>
      </div>
    </div>

    <!-- ============================================
         VISTA 2: POS (PRODUCTOS Y CARRITO)
    ============================================= -->
    <div v-else class="pos-layout">
      <!-- PANEL IZQUIERDO: PRODUCTOS -->
      <section class="panel-productos" :class="{ 'oculto-movil': verCarritoMovil }">
        <div class="barra-buscar">
          <div class="buscador">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" v-model="busqueda" placeholder="Buscar producto por nombre..." />
          </div>
          <button
            v-if="hayCombos"
            type="button"
            class="toggle-combos"
            :class="{ activo: mostrarCombos }"
            role="switch"
            :aria-checked="mostrarCombos"
            @click="mostrarCombos = !mostrarCombos"
            :title="mostrarCombos ? 'Ocultar combos' : 'Mostrar combos'"
          >
            <span class="toggle-pista"><span class="toggle-bolita"></span></span>
            <span class="toggle-txt">Combos</span>
          </button>
        </div>

        <div class="categorias-fila">
          <button class="cat-flecha" type="button" aria-label="Categorías anteriores" @click="desplazarCategorias(-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div class="categorias-scroll" ref="scrollCategorias">
            <button class="btn-categoria" :class="{ activo: categoriaSeleccionada === null }" @click="categoriaSeleccionada = null">Todos</button>
            <button v-if="hayCombos && mostrarCombos" class="btn-categoria cat-combos" :class="{ activo: categoriaSeleccionada === 'combos' }" @click="categoriaSeleccionada = 'combos'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
              Combos
            </button>
            <button
              class="btn-categoria"
              v-for="cat in categorias"
              :key="cat.id_categoria"
              :class="{ activo: categoriaSeleccionada === cat.id_categoria }"
              @click="categoriaSeleccionada = cat.id_categoria"
            >{{ cat.nombre_categoria }}</button>
          </div>
          <button class="cat-flecha" type="button" aria-label="Categorías siguientes" @click="desplazarCategorias(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <div class="lista-productos">
          <div v-if="cargandoProductos" class="spinner-container"><div class="spinner"></div></div>
          <div v-else-if="catalogoVacio" class="vacio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <p>No hay productos que coincidan con tu búsqueda</p>
          </div>

          <template v-else>
            <!-- APARTADO COMBOS (destacado, con el detalle claro de qué incluye) -->
            <div v-if="mostrarSeccionCombos || categoriaSeleccionada === 'combos'" class="seccion-combos">
              <div class="seccion-titulo" v-if="mostrarSeccionCombos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                <span>Combos para la mesa</span>
              </div>
              <div class="grid-combos escalonar">
                <div
                  v-for="combo in combosDisponibles"
                  :key="combo.id_producto"
                  class="tarjeta-combo"
                  @click="agregarAlCarrito(combo)"
                >
                  <div class="tc-media">
                    <img v-if="combo.url_imagen" :src="combo.url_imagen" :alt="combo.nombre_producto" class="img-producto" />
                    <div v-else-if="combo.combos_como_padre && combo.combos_como_padre.length" class="tp-combo">
                      <div v-for="(c, ci) in combo.combos_como_padre.slice(0, 3)" :key="ci" class="tp-combo-cell">
                        <img v-if="c.url_imagen" :src="c.url_imagen" alt="" />
                        <span v-else class="tp-combo-ph">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path><path d="M12 15v6"></path><path d="M8 21h8"></path></svg>
                        </span>
                      </div>
                    </div>
                    <div v-else class="tp-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line></svg>
                    </div>
                    <span v-if="ahorroCombo(combo) > 0" class="tc-ahorro">Ahorra Bs {{ ahorroCombo(combo).toFixed(2) }}</span>
                    <span class="tp-add" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </span>
                  </div>
                  <div class="tc-info">
                    <h5>{{ nombreCombo(combo) }}</h5>
                    <!-- Cada componente como una mini-tarjeta clara: cantidad + qué es -->
                    <div class="tc-items">
                      <span v-for="(c, ci) in combo.combos_como_padre" :key="ci" class="tc-item">
                        <img v-if="c.url_imagen" :src="c.url_imagen" class="tc-item-img" alt="" />
                        <span v-else class="tc-item-img tc-item-ph">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path><path d="M12 15v6"></path><path d="M8 21h8"></path></svg>
                        </span>
                        <span class="tc-item-txt"><b>{{ c.cantidad }}</b> {{ nombreLimpio(c.nombre_producto) }}</span>
                      </span>
                    </div>
                    <p class="precio">Bs. {{ Number(combo.precio_base).toFixed(2) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- APARTADO PRODUCTOS (disponibles) -->
            <div v-if="categoriaSeleccionada !== 'combos' && productosSueltos.length" class="seccion-productos">
              <div class="seccion-titulo" v-if="mostrarSeccionCombos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path><path d="M12 15v6"></path><path d="M8 21h8"></path></svg>
                <span>Productos</span>
              </div>
              <div class="grid-productos escalonar">
                <div
                  v-for="prod in productosSueltos"
                  :key="prod.id_producto"
                  class="tarjeta-producto-pos"
                  @click="agregarAlCarrito(prod)"
                >
                  <div class="tp-media">
                    <img v-if="prod.url_imagen" :src="prod.url_imagen" :alt="prod.nombre_producto" class="img-producto" />
                    <div v-else class="tp-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="30" height="30"><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path><path d="M12 15v6"></path><path d="M8 21h8"></path></svg>
                      <span class="tp-ph-nombre">{{ prod.nombre_producto }}</span>
                    </div>
                    <span class="tp-add" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </span>
                  </div>
                  <div class="info-producto">
                    <h5>{{ prod.nombre_producto }}</h5>
                    <p class="precio">Bs. {{ Number(prod.precio_base).toFixed(2) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- APARTADO FUERA DE STOCK (al final, no estorba lo vendible) -->
            <div v-if="fueraDeStock.length" class="seccion-agotados">
              <div class="seccion-titulo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                <span>Fuera de stock</span>
              </div>
              <div class="grid-productos escalonar">
                <div
                  v-for="prod in fueraDeStock"
                  :key="prod.id_producto"
                  class="tarjeta-producto-pos agotado"
                  @click="agregarAlCarrito(prod)"
                >
                  <div class="tp-media">
                    <img v-if="prod.url_imagen" :src="prod.url_imagen" :alt="prod.nombre_producto" class="img-producto" />
                    <div v-else-if="prod.es_combo && prod.combos_como_padre && prod.combos_como_padre.length" class="tp-combo">
                      <div v-for="(c, ci) in prod.combos_como_padre.slice(0, 3)" :key="ci" class="tp-combo-cell">
                        <img v-if="c.url_imagen" :src="c.url_imagen" alt="" />
                        <span v-else class="tp-combo-ph">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path><path d="M12 15v6"></path><path d="M8 21h8"></path></svg>
                        </span>
                      </div>
                    </div>
                    <div v-else class="tp-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="30" height="30"><path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0z"></path><path d="M12 15v6"></path><path d="M8 21h8"></path></svg>
                      <span class="tp-ph-nombre">{{ prod.nombre_producto }}</span>
                    </div>
                    <span class="tp-agotado">Agotado</span>
                  </div>
                  <div class="info-producto">
                    <h5>{{ prod.es_combo ? nombreCombo(prod) : prod.nombre_producto }}</h5>
                    <p class="precio">Bs. {{ Number(prod.precio_base).toFixed(2) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
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

        <!-- MIS MESAS ASIGNADAS (recepción se las asigna al llegar el cliente) -->
        <div v-if="misMesas.length || eventoActivo" class="mis-mesas">
          <div class="mm-titulo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Tus mesas asignadas</span>
            <!-- Carga vs límite justo: mesas del evento ÷ meseros presentes -->
            <span v-if="reparto" class="mm-carga" :class="{ lleno: reparto.mi_carga >= reparto.limite_por_mesero }">
              {{ reparto.mi_carga }}/{{ reparto.limite_por_mesero }}
            </span>
            <button v-if="eventoActivo" class="mm-salir" @click="salirDelEvento" title="Salir del evento: tus mesas pasan a otro mesero">Salir del evento</button>
          </div>
          <div v-if="misMesas.length" class="mm-chips">
            <div v-for="m in misMesas" :key="m.id_asignacion" class="mm-chip-wrap">
              <button
                type="button" class="mm-chip"
                :class="{ sel: mesaSeleccionada && mesaSeleccionada.id_mesa === m.id_mesa }"
                @click="elegirMesaAsignada(m)"
              >
                <strong>{{ m.mesa || 'Mesa' }}</strong>
                <span v-if="m.cliente" class="mm-cli">{{ m.cliente }}</span>
                <span v-if="m.es_vip" class="mm-vip">VIP</span>
              </button>
              <!-- Cierra la atención: el grupo se fue, la mesa queda libre para el siguiente -->
              <button class="mm-cerrar" @click="cerrarAtencionMesa(m)" title="Terminé de atender esta mesa (el grupo se fue)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="13" height="13"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            </div>
          </div>
          <p v-else class="mm-vacia">Aún no tienes mesas asignadas en este evento.</p>
        </div>

        <!-- SELECTOR DE MESA -->
        <div class="selector-mesa">
          <div class="mesa-tabs">
            <button type="button" class="mesa-tab" :class="{ activo: modoMesa === 'lista' }" @click="modoMesa = 'lista'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              Lista
            </button>
            <button type="button" class="mesa-tab" :class="{ activo: modoMesa === 'buscar' }" @click="modoMesa = 'buscar'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Buscar
            </button>
            <button type="button" class="mesa-tab" @click="abrirMapaMesa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
              Mapa
            </button>
          </div>

          <!-- Modo LISTA -->
          <div v-if="modoMesa === 'lista'" class="mesa-selector-row">
            <div class="mesa-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>
            </div>
            <div class="select-mesa-wrap"><BaseSelect v-model="mesaSeleccionada" :options="opcionesMesa" @update:model-value="alCambiarMesa" /></div>
          </div>

          <!-- Modo BUSCAR (las mesas aparecen al teclear, no llenan la pantalla) -->
          <div v-else class="mesa-buscar">
            <input v-model="busquedaMesa" type="text" class="input-cliente" placeholder="Número de mesa (M1, S2...)" />
            <div class="mesa-chips">
              <button type="button" class="mesa-chip barra" :class="{ sel: !mesaSeleccionada }" @click="seleccionarMesaObj(null)">Barra</button>
              <template v-if="busquedaMesa.trim()">
                <button
                  v-for="m in mesasFiltradas" :key="m.id_mesa"
                  type="button" class="mesa-chip"
                  :class="{ sel: mesaSeleccionada && mesaSeleccionada.id_mesa === m.id_mesa }"
                  @click="seleccionarMesaObj(m)">
                  {{ m.tipo_elemento === 'silla' ? 'Silla' : 'Mesa' }} {{ m.numero_nombre }}
                </button>
                <p v-if="!mesasFiltradas.length" class="mesa-vacio">Sin coincidencias.</p>
              </template>
              <p v-else class="mesa-hint">Escribe el número para ver las mesas.</p>
            </div>
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

        <!-- Aviso: los productos de la orden forman un combo (conviene armarlo) -->
        <div v-if="comboSugeridoPorCarrito" class="combo-sugerido">
          <div class="cs-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
          </div>
          <div class="cs-texto">
            <strong>Conviene como {{ comboSugeridoPorCarrito.combo.nombre_producto }}</strong>
            <small v-if="comboSugeridoPorCarrito.ahorro > 0">Ahorra Bs {{ comboSugeridoPorCarrito.ahorro.toFixed(2) }}</small>
            <small v-else>Arma la orden como combo</small>
          </div>
          <button class="cs-btn" @click="armarComboSugerido">Armar</button>
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

        <div class="carrito-pie">
          <div class="total-carrito">
            <div class="total-meta">
              <span>Total a cobrar</span>
              <small class="total-items">{{ totalItemsCarrito }} artículo{{ totalItemsCarrito === 1 ? '' : 's' }}</small>
            </div>
            <h2>Bs. {{ totalCarrito.toFixed(2) }}</h2>
          </div>

          <button
            class="btn btn-primario btn-full btn-cobrar brillo-hover"
            :disabled="carrito.length === 0"
            @click="abrirModalCobro"
          >
            <span class="btn-cobrar-txt">Cobrar Orden</span>
            <span class="btn-cobrar-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </span>
          </button>
        </div>
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
                  <CapturaCamara modo="foto" :deshabilitado="validandoOCR" texto-guia="Coloca el comprobante dentro del marco" nombre-archivo="comprobante.jpg" @archivo="validarComprobante" />
                  <p style="text-align:center; font-size:0.8rem; margin-top:12px; color:var(--texto-secundario);">Verificamos el comprobante automáticamente</p>
                </div>
                <div v-if="validandoOCR" class="ia-verificando">
                  <div class="ia-barra"></div>
                  <p>Verificando comprobante...</p>
                </div>
                <div v-if="comprobanteValido" class="ia-ok">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="44" height="44"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <span>Comprobante aprobado</span>
                </div>
              </div>
            </div>

            <!-- TAB 2: BILLETERA -->
            <div v-if="metodoPago === 'Billetera'" class="cobro-panel">

              <!-- Billetera Verificada (Paso 2) -->
              <div v-if="billeteraVerificada" class="pin-zone fade-in">
                <svg viewBox="0 0 24 24" fill="none" style="stroke: var(--color-exito); margin-bottom: 10px;" stroke-width="2" width="40" height="40"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <p class="pin-titulo">Billetera de: {{ nombreBilleteraVerificada }}</p>
                <p class="pin-sub" style="margin-bottom: 1rem; color: rgba(255,255,255,0.5);">ID: {{ identificadorMostrado || formCobro.qr_billetera }}</p>
                
                <!-- Mostrar saldo actual -->
                <p style="text-align: center; font-size: 1.1rem; margin-bottom: 0.5rem;" 
                   :style="{ color: saldoBilleteraVerificada >= totalCarrito ? 'var(--color-exito)' : 'var(--color-error)', fontWeight: 'bold' }">
                   Saldo Disponible: Bs. {{ saldoBilleteraVerificada.toFixed(2) }}
                </p>
                
                <div v-if="saldoBilleteraVerificada < totalCarrito" style="text-align: center; color: var(--color-error); margin-bottom: 15px; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 5px; border-radius: 4px;">
                  Saldo Insuficiente
                </div>

                <div v-if="saldoBilleteraVerificada >= totalCarrito">
                  <div v-if="requierePin">
                    <p class="pin-sub" style="color: var(--color-alerta); font-weight: bold; margin-bottom: 10px;">Por seguridad, ingresa el PIN de la billetera:</p>
                    <!-- El PIN es SIEMPRE de 4 dígitos numéricos: se filtra cualquier letra -->
                    <input type="password" v-model="formCobro.pin" placeholder="••••" maxlength="4" inputmode="numeric" pattern="[0-9]*" class="input-pin" autofocus @input="soloDigitosPin" />
                  </div>
                  <div v-else style="margin-top: 15px;">
                    <button class="btn btn-primario btn-full" @click="procesarCobro">Cobrar Bs. {{ totalCarrito.toFixed(2) }}</button>
                  </div>
                </div>
                
                <button class="btn btn-secundario btn-full" style="margin-top: 1rem;" @click="billeteraVerificada = false; formCobro.qr_billetera = ''; identificadorMostrado = ''; errorCobro = ''">Cambiar Cliente</button>
              </div>

              <!-- Estado inicial (Paso 1) -->
              <div v-else class="billetera-inicio fade-in">
                <p class="cobro-instruccion">El cliente paga con su saldo Euphoria. Escanea su QR o ingresa su ID.</p>

                <CapturaCamara modo="qr" :deshabilitado="procesando" texto-guia="Coloca el QR del cliente dentro del marco" @codigo="alDetectarQr" />

                <div class="mt-15">
                  <p class="cobro-o-manual">O busca al cliente por nombre, carnet o celular:</p>
                  <div class="billetera-manual">
                    <input type="text" v-model="formCobro.qr_billetera" placeholder="Nombre, carnet o celular..." class="input-qr" @input="buscarClientesBilletera" @keydown.enter="verificarBilleteraBackend" />
                    <button class="btn btn-primario" @click="verificarBilleteraBackend" :disabled="procesando || !formCobro.qr_billetera">Buscar</button>
                  </div>
                  <!-- Coincidencias a medida que escribe (como los demás buscadores) -->
                  <transition-group name="lista" tag="div" v-if="clientesBilletera.length" class="billetera-resultados">
                    <button
                      v-for="c in clientesBilletera" :key="c.id_usuario"
                      type="button" class="billetera-item"
                      @click="elegirClienteBilletera(c)"
                    >
                      <span class="bi-avatar">{{ (c.nombres || '?').charAt(0) }}</span>
                      <span class="bi-txt">
                        <span class="bi-nombre">{{ c.nombres }} {{ c.apellidos }}</span>
                        <span class="bi-dato">{{ c.ci_carnet || c.telefono || ('ID ' + c.id_usuario) }}</span>
                      </span>
                    </button>
                  </transition-group>
                </div>
              </div>

            </div>

            <!-- TAB 3: EFECTIVO -->
            <div v-if="metodoPago === 'Efectivo'" class="cobro-panel">
              <p class="cobro-instruccion">Ingresa el monto que entrega el cliente.</p>

              <!-- Display del monto recibido (sin flechas: solo números positivos) -->
              <div class="efe-display" :class="{ ok: efectivoSuficiente }">
                <span class="efe-label">Monto recibido</span>
                <div class="efe-monto">
                  <span class="efe-moneda">Bs.</span>
                  <input
                    type="text" inputmode="decimal" v-model="montoRecibidoTexto"
                    @input="alEscribirEfectivo" placeholder="0.00" class="efe-input" autofocus
                  />
                </div>
              </div>

              <!-- Chips de billetes: arman el monto rápido (suman) -->
              <div class="efe-chips">
                <button v-for="b in billetes" :key="b" type="button" class="efe-chip" @click="sumarBillete(b)">+{{ b }}</button>
                <button type="button" class="efe-chip exacto" @click="montoExacto">Exacto</button>
                <button type="button" class="efe-chip limpiar" @click="limpiarEfectivo" :disabled="!montoRecibidoTexto">Limpiar</button>
              </div>

              <!-- Cambio / faltante en vivo -->
              <div class="efe-cambio" :class="{ falta: faltaEfectivo, listo: efectivoSuficiente }">
                <span class="efe-cambio-label">{{ faltaEfectivo ? 'Falta' : 'Cambio a devolver' }}</span>
                <span class="efe-cambio-valor">Bs. {{ Math.abs(cambioEfectivo).toFixed(2) }}</span>
              </div>
            </div>

            <div v-if="errorCobro" class="cobro-error mt-15">{{ errorCobro }}</div>
          </div>

          <!-- Pie -->
          <div class="cobro-pie">
            <button class="cobro-btn-cancel" @click="cerrarModalCobro" :disabled="procesando">Cancelar</button>
            <button v-if="metodoPago === 'Efectivo'" class="cobro-btn-ok" @click="procesarCobro" :disabled="procesando || formCobro.cambio_dado < 0">
              <span v-if="!procesando">Cobrar Bs. {{ totalCarrito.toFixed(2) }}</span>
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
              <label>Nombre o razón social *</label>
              <input v-model="formNuevoCliente.nombres" type="text" class="campo-nuevo-cliente" placeholder="Ej: Carlos Pérez / Comercial XYZ" autofocus />
            </div>
            <div class="input-grupo">
              <label>CI / Carnet / NIT <span class="opcional">(opcional)</span></label>
              <input v-model="formNuevoCliente.ci_carnet" type="text" class="campo-nuevo-cliente" placeholder="Ej: 12345678" />
            </div>
            <div class="input-grupo">
              <label>Celular <span class="opcional">(opcional)</span></label>
              <BaseTelefono v-model="formNuevoCliente.telefono" placeholder="Ej: 70000000" />
            </div>
            <div class="input-grupo">
              <label>Tipo de cliente</label>
              <div class="tipo-cliente-tabs">
                <button type="button" class="tc-tab" :class="{ activo: !formNuevoCliente.es_vip }" @click="formNuevoCliente.es_vip = false">Común</button>
                <button type="button" class="tc-tab tc-vip" :class="{ activo: formNuevoCliente.es_vip }" @click="formNuevoCliente.es_vip = true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="12 2 15 8.5 22 9.3 17 14 18.5 21 12 17.3 5.5 21 7 14 2 9.3 9 8.5 12 2"></polygon></svg>
                  VIP
                </button>
              </div>
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

    <!-- MODAL: elegir a qué EVENTO atiende el mesero (si hay 2+ activos) -->
    <Teleport to="body">
      <div v-if="modalEvento" class="mapa-overlay" @click.self="eventoActivoId && (modalEvento = false)">
        <div class="ev-sheet fade-in">
          <div class="ev-head">
            <h3>¿A qué evento atiendes?</h3>
            <p class="mapa-sub">Tus mesas y el mapa se ajustan a este evento.</p>
          </div>
          <div class="ev-lista">
            <button
              v-for="ev in eventosActivos" :key="ev.id_evento"
              class="ev-item" :class="{ activo: ev.id_evento === eventoActivoId }"
              @click="elegirEvento(ev.id_evento)">
              <span class="ev-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
              <span class="ev-item-txt">{{ ev.nombre_evento }}</span>
              <svg v-if="ev.id_evento === eventoActivoId" class="ev-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <p v-if="!eventosActivos.length" class="ev-vacio">No hay eventos activos ahora.</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL MAPA DE MESAS (elegir tocando el plano) -->
    <Teleport to="body">
      <div v-if="modalMapaMesa" class="mapa-overlay" @click.self="modalMapaMesa = false">
        <div class="mapa-sheet fade-in">
          <div class="mapa-header">
            <div v-if="mesaDestino">
              <h3>Lleva el pedido a la {{ mesaDestino.nombre ? 'mesa ' + mesaDestino.nombre : 'mesa' }}</h3>
              <p class="mapa-sub">{{ mesaDestino.cliente ? 'Cliente: ' + mesaDestino.cliente + ' · ' : '' }}la mesa en verde es tu destino.</p>
            </div>
            <div v-else>
              <h3>Elige la mesa en el mapa</h3>
              <p class="mapa-sub">Toca una mesa para asignarla a la orden.</p>
            </div>
            <button class="mapa-cerrar" @click="modalMapaMesa = false" title="Cerrar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="mapa-body">
            <div v-if="cargandoMapa" class="mapa-cargando"><div class="spinner"></div></div>
            <div v-else-if="!mapaZonas.length" class="mapa-vacio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon></svg>
              <p>No hay un mapa disponible para el evento activo.</p>
            </div>
            <div v-else v-for="z in mapaZonas" :key="z.id_zona" class="mapa-zona">
              <p class="mapa-zona-nombre">{{ z.nombre_zona }}<em v-if="z.evento"> · {{ z.evento }}</em></p>
              <div class="mapa-lienzo" :style="{ aspectRatio: String(z.proporcion || 1) }">
                <div
                  v-for="el in z.elementos" :key="el.id_mesa"
                  class="mapa-el" :class="claseElementoMapa(el)" :style="estiloElementoMapa(el)"
                  @click="elegirMesaMapa(el)">
                  <span class="mapa-el-txt">{{ el.numero_nombre }}</span>
                </div>
              </div>
            </div>
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
          
          <h3>Cobro realizado con éxito</h3>
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
            
            <div v-if="detalleExito.metodo === 'Billetera'" class="recibo-ia-footer" style="background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3);">
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
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import BaseTelefono from '@/componentes/comunes/BaseTelefono.vue'
import CapturaCamara from '@/componentes/comunes/CapturaCamara.vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
const notif = useNotificaciones()

const router = useRouter()
const tienda = useTiendaAutenticacion()

const productos = ref([])
const busqueda = ref('')
const categorias = ref([])
const categoriaSeleccionada = ref(null)
const cargandoProductos = ref(true)
// Interruptor para mostrar u ocultar los combos en el catálogo
const mostrarCombos = ref(true)
watch(mostrarCombos, (v) => {
  // Si se apaga estando en el chip "Combos", volver a "Todos"
  if (!v && categoriaSeleccionada.value === 'combos') categoriaSeleccionada.value = null
})

// Desplazamiento de las categorías con flechas (útil en escritorio, donde no
// se puede arrastrar con el dedo como en el celular).
const scrollCategorias = ref(null)
function desplazarCategorias(dir) {
  const el = scrollCategorias.value
  if (el) el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.7), behavior: 'smooth' })
}

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
const opcionesMesa = computed(() => [
  { value: null, label: 'Pedido en Barra (sin mesa)' },
  ...mesas.value.map(m => ({ value: m, label: `Mesa ${m.numero_nombre} — ${m.estado_ocupacion === 'reservada' ? 'Reservada' : 'Libre'}` })),
])
const clienteAutoAsignado = ref('')

// Mesas asignadas a este mesero (recepción se las asigna al check-in)
const misMesas = ref([])
async function cargarMisMesas() {
  try {
    const q = eventoActivoId.value ? `?evento=${eventoActivoId.value}` : ''
    misMesas.value = await clienteHttp.get(`/comandas/mis-mesas${q}`)
  } catch { misMesas.value = [] }
}
// Elegir una mesa asignada = seleccionarla en la orden (y su cliente si tiene reserva)
function elegirMesaAsignada(m) {
  const mesaObj = mesas.value.find(x => x.id_mesa === m.id_mesa)
  if (mesaObj) { mesaSeleccionada.value = mesaObj; modoMesa.value = 'lista'; alCambiarMesa() }
  else notif.advertencia(`La mesa ${m.mesa || ''} no está en el evento activo.`)
}

// Selector de mesa: 3 modos (lista / buscar / mapa)
const modoMesa = ref('lista')
const busquedaMesa = ref('')
const mesasFiltradas = computed(() => {
  const q = busquedaMesa.value.trim().toLowerCase()
  const base = mesas.value.filter(m => m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla')
  if (!q) return base
  return base.filter(m => String(m.numero_nombre || '').toLowerCase().includes(q))
})
function seleccionarMesaObj(m) {
  mesaSeleccionada.value = m
  alCambiarMesa()
}

// Mapa de mesas (elegir tocando el plano)
const modalMapaMesa = ref(false)
const mapaZonas = ref([])
const cargandoMapa = ref(false)
// Modo "destino": resalta SOLO una mesa (a dónde llevar un pedido listo)
const mesaDestino = ref(null)      // { id_mesa, nombre, cliente }
async function cargarMapaZonas() {
  cargandoMapa.value = true
  try {
    // Filtra por el EVENTO que el mesero está atendiendo (antes salían los mapas
    // de los 2 eventos activos mezclados). Sin evento elegido, cae al comportamiento
    // anterior (todos los activos) para no romper nada.
    const q = eventoActivoId.value ? `?evento=${eventoActivoId.value}` : ''
    mapaZonas.value = await clienteHttp.get(`/mesas/mapa${q}`)
  } catch { mapaZonas.value = [] }
  finally { cargandoMapa.value = false }
}

// ==== EVENTO QUE ATIENDE EL MESERO ====
// Al entrar elige a qué evento atiende (si hay 2+ activos). Todo lo suyo (mapa,
// mesas, mesas asignadas) se filtra a ESE evento. Se recuerda entre sesiones.
const eventosActivos = ref([])
const eventoActivoId = ref(Number(localStorage.getItem('euphoria_mesero_evento')) || null)
const modalEvento = ref(false)
const eventoActivo = computed(() => eventosActivos.value.find(e => e.id_evento === eventoActivoId.value) || null)
const ESTADOS_EVENTO_ACTIVO = ['promocion', 'en_transcurso', 'lleno']

async function cargarEventosActivos() {
  try {
    const todos = await clienteHttp.get('/aforo/eventos')
    eventosActivos.value = (todos || []).filter(e => ESTADOS_EVENTO_ACTIVO.includes(e.estado))
  } catch { eventosActivos.value = [] }
  // Si el evento recordado ya no está activo, se olvida
  if (eventoActivoId.value && !eventosActivos.value.some(e => e.id_evento === eventoActivoId.value)) {
    eventoActivoId.value = null
  }
  // Un solo evento activo: se elige solo. Varios y ninguno elegido: se pregunta.
  if (!eventoActivoId.value) {
    if (eventosActivos.value.length === 1) elegirEvento(eventosActivos.value[0].id_evento)
    else if (eventosActivos.value.length > 1) modalEvento.value = true
  } else {
    cargarMisMesas()
    cargarReparto()
  }
}

function elegirEvento(id) {
  eventoActivoId.value = id
  localStorage.setItem('euphoria_mesero_evento', String(id))
  modalEvento.value = false
  cargarMisMesas()
  cargarReparto()
}

// Reparto justo: cuántas mesas debería llevar cada mesero del evento
const reparto = ref(null)
async function cargarReparto() {
  if (!eventoActivoId.value) { reparto.value = null; return }
  try { reparto.value = await clienteHttp.get(`/aforo/reparto/${eventoActivoId.value}`) }
  catch { reparto.value = null }
}

// El mesero cierra la atención de una mesa: el grupo se fue, la mesa queda libre
// para el siguiente (rotación de grupos). Pide confirmación por ser irreversible.
async function cerrarAtencionMesa(m) {
  const ok = await notif.confirmar({
    titulo: `¿Cerrar la ${m.mesa || 'mesa'}?`,
    mensaje: 'El grupo se fue y la mesa queda libre para el siguiente. Esta acción no se deshace.',
    textoConfirmar: 'Sí, cerrar mesa',
  })
  if (!ok) return
  try {
    await clienteHttp.post(`/aforo/mesa/${m.id_mesa}/cerrar-atencion`)
    if (mesaSeleccionada.value?.id_mesa === m.id_mesa) { mesaSeleccionada.value = null; alCambiarMesa() }
    await cargarMisMesas()
    await cargarReparto()
    notif.exito(`${m.mesa || 'Mesa'} libre para el siguiente grupo`)
  } catch (e) {
    notif.error(e?.response?.data?.error || 'No se pudo cerrar la mesa')
  }
}

// El mesero marca su SALIDA del evento: sus mesas pasan a otro mesero presente.
async function salirDelEvento() {
  const ok = await notif.confirmar({
    titulo: '¿Salir del evento?',
    mensaje: 'Tus mesas asignadas quedarán libres para que otro mesero las tome.',
    textoConfirmar: 'Sí, salir',
  })
  if (!ok) return
  try {
    const r = await clienteHttp.post('/aforo/salir-evento', { id_evento: eventoActivoId.value })
    notif.exito(r.liberadas ? `Liberaste ${r.liberadas} mesa(s)` : 'Saliste del evento')
    eventoActivoId.value = null
    localStorage.removeItem('euphoria_mesero_evento')
    misMesas.value = []
    reparto.value = null
    await cargarEventosActivos()
  } catch (e) {
    notif.error(e?.response?.data?.error || 'No se pudo registrar tu salida')
  }
}
async function abrirMapaMesa() {
  mesaDestino.value = null
  modalMapaMesa.value = true
  await cargarMapaZonas()
}
async function abrirMapaDestino(idMesa, nombreMesa, cliente) {
  mesaDestino.value = { id_mesa: idMesa, nombre: nombreMesa, cliente }
  modalMapaMesa.value = true
  await cargarMapaZonas()
}
// Posición del elemento en el lienzo (los datos vienen en % 0-100)
function estiloElementoMapa(el) {
  return {
    left: `${el.posicion_x}%`,
    top: `${el.posicion_y}%`,
    width: `${el.ancho ?? 7}%`,
    height: `${el.alto ?? 10}%`,
    transform: `rotate(${el.rotacion || 0}deg)`,
    borderRadius: el.forma === 'redondo' ? '50%' : '8px',
  }
}
// Sin colores de estado: el mesero solo elige la mesa para llenar el campo.
// 'elegible' = mesa/silla seleccionable (toca y listo); 'deco' = elemento fijo.
function claseElementoMapa(el) {
  // Modo destino: solo la mesa objetivo resalta (verde); el resto se atenúa.
  if (mesaDestino.value) {
    return el.id_mesa === mesaDestino.value.id_mesa ? 'destino' : 'atenuado'
  }
  const elegible = (el.tipo_elemento === 'mesa' || el.tipo_elemento === 'silla') && el.es_seleccionable
  return elegible ? 'elegible' : 'deco'
}
function elegirMesaMapa(el) {
  if (mesaDestino.value) return // en modo destino no se selecciona, solo se muestra
  const elegible = (el.tipo_elemento === 'mesa' || el.tipo_elemento === 'silla') && el.es_seleccionable
  if (!elegible) return
  // Usa la mesa de la lista plana si existe (misma forma), si no el propio elemento
  const m = mesas.value.find(x => x.id_mesa === el.id_mesa) || el
  mesaSeleccionada.value = m
  alCambiarMesa()
  modalMapaMesa.value = false
  notif.info(`${el.tipo_elemento === 'silla' ? 'Silla' : 'Mesa'} ${el.numero_nombre} seleccionada`)
}

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
const formNuevoCliente = ref({ nombres: '', apellidos: '', ci_carnet: '', telefono: '', es_vip: false })

// Variables de Cobro
const modalCobro = ref(false)
const metodoPago = ref('Transferencia QR')
const procesando = ref(false)
const errorCobro = ref('')
const requierePin = ref(false)
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
// Autocompletado del pago con billetera (buscar cliente por nombre/carnet/celular)
const clientesBilletera = ref([])
let timeoutBilletera = null

// Variables para pedidos listos
const pedidosListos = ref([])
const mostrarModalListos = ref(false)
const procesandoEntrega = ref(null)

// Estado del servicio de sugerencias (IA). Se vigila para avisar si se cae.
const iaEnLinea = ref(true)
const avisoIaEnviado = ref(false)
const avisoIaDescartado = ref(false) // si el mesero lo oculta, no molestamos más
let intervaloIA = null
async function verificarEstadoIA() {
  try {
    const res = await clienteHttp.get('/recomendaciones/estado')
    const online = res.en_linea !== false
    // Si el servicio se recuperó, reseteamos para volver a avisar si cae de nuevo
    if (online && !iaEnLinea.value) { avisoIaDescartado.value = false; avisoIaEnviado.value = false }
    iaEnLinea.value = online
  } catch {
    iaEnLinea.value = true // ante un fallo del chequeo, no molestamos con la alerta
  }
}
// El mesero avisa a caja/admin que el servicio de IA está caído
async function avisarCajaIA() {
  if (avisoIaEnviado.value) return
  try {
    await clienteHttp.post('/recomendaciones/reportar-caida', { nombre: tienda.usuario?.nombres || '' })
    avisoIaEnviado.value = true
    notif.exito('Le avisamos a caja que el servicio está caído.')
    setTimeout(() => { avisoIaEnviado.value = false }, 20000) // se puede reavisar tras 20s
  } catch {
    notif.error('No se pudo enviar el aviso. Intenta de nuevo.')
  }
}

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
// Identificador corto SOLO para mostrar (el token escaneado no se pisa: ver
// verificarBilleteraBackend — es la marca de seguridad del QR privado)
const identificadorMostrado = ref('')

onMounted(async () => {
  // Verificación extra de rol
  if (tienda.usuario?.rol !== 'Mesero' && tienda.usuario?.rol !== 'Bartender' && tienda.usuario?.rol !== 'Administrador') {
    router.push('/')
    return
  }
  
  try {
    await recargarCatalogo()
    await cargarEventosActivos()   // define el evento que atiende (o lo pregunta)
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

// Carga/recarga el catálogo (productos + categorías). Se reutiliza para el
// refresco en vivo cuando el admin cambia productos/precios/promos.
async function recargarCatalogo() {
  const data = await servicioProductos.listar({ limit: 100 })
  productos.value = data.productos || data
  const catsMap = new Map()
  productos.value.forEach(p => {
    if (p.id_categoria && p.nombre_categoria) catsMap.set(p.id_categoria, p.nombre_categoria)
  })
  categorias.value = Array.from(catsMap, ([id_categoria, nombre_categoria]) => ({ id_categoria, nombre_categoria }))
}

// ---- Catálogo: combos destacados vs. productos sueltos ----
function coincideBusqueda(p) {
  if (!busqueda.value) return true
  return p.nombre_producto.toLowerCase().includes(busqueda.value.toLowerCase())
}
const hayCombos = computed(() => productos.value.some(p => p.es_combo))
// Coincide con la categoría numérica activa (o "Todos"/"combos" que no filtran por id)
function coincideCategoria(p) {
  return typeof categoriaSeleccionada.value !== 'number' || p.id_categoria === categoriaSeleccionada.value
}
// Combos DISPONIBLES (con stock) — sección destacada y chip "Combos"
const combosDisponibles = computed(() =>
  mostrarCombos.value ? productos.value.filter(p => p.es_combo && !estaAgotado(p) && coincideBusqueda(p)) : []
)
// Productos sueltos DISPONIBLES (con stock), filtrados por categoría numérica
const productosSueltos = computed(() =>
  productos.value.filter(p => !p.es_combo && !estaAgotado(p) && coincideBusqueda(p) && coincideCategoria(p))
)
// Apartado "Fuera de stock" (combos y productos agotados), respetando el filtro activo
const fueraDeStock = computed(() =>
  productos.value.filter(p => {
    if (!estaAgotado(p) || !coincideBusqueda(p)) return false
    if (p.es_combo && !mostrarCombos.value) return false // los combos ocultos no aparecen ni aquí
    if (categoriaSeleccionada.value === 'combos') return p.es_combo
    if (typeof categoriaSeleccionada.value === 'number') return !p.es_combo && p.id_categoria === categoriaSeleccionada.value
    return true // "Todos"
  })
)
// La sección de combos destacada solo aparece en "Todos" y con el interruptor encendido
const mostrarSeccionCombos = computed(() =>
  categoriaSeleccionada.value === null && mostrarCombos.value && combosDisponibles.value.length > 0
)
const catalogoVacio = computed(() =>
  !combosDisponibles.value.length && !productosSueltos.value.length && !fueraDeStock.value.length
)

// Nombre del combo legible: si es autogenerado ("A + B + C") mostramos algo corto,
// porque el detalle real va en las mini-tarjetas de abajo.
function nombreCombo(combo) {
  const n = combo.nombre_producto || ''
  if (n.includes(' + ')) {
    const total = (combo.combos_como_padre || []).reduce((a, c) => a + (Number(c.cantidad) || 1), 0)
    return `Combo · ${total} producto${total === 1 ? '' : 's'}`
  }
  return n
}
// Quita el sufijo "(x1)"/"(x6)" del nombre para que se lea limpio en las tarjetas
function nombreLimpio(nombre) {
  return String(nombre || '').replace(/\s*\(x\d+\)\s*$/i, '').trim()
}
// Ahorro del combo frente a comprar sus componentes por separado
function precioComponentes(combo) {
  return (combo.combos_como_padre || []).reduce((acc, c) => {
    const hijo = productos.value.find(p => p.id_producto === c.id_producto_hijo)
    return acc + (hijo ? Number(hijo.precio_base) * c.cantidad : 0)
  }, 0)
}
function ahorroCombo(combo) {
  const dif = precioComponentes(combo) - Number(combo.precio_base)
  return dif > 0 ? dif : 0
}

// Si lo que hay en la orden forma un combo existente, lo ofrece
const comboSugeridoPorCarrito = computed(() => {
  if (!mostrarCombos.value) return null // combos ocultos: no sugerir
  const enCarrito = new Map()
  carrito.value.forEach(it => enCarrito.set(it.producto.id_producto, (enCarrito.get(it.producto.id_producto) || 0) + it.cantidad))
  for (const combo of productos.value) {
    if (!combo.es_combo || enCarrito.has(combo.id_producto)) continue
    if (estaAgotado(combo)) continue // no ofrecer un combo sin stock
    const comps = combo.combos_como_padre || []
    if (comps.length < 2) continue
    if (comps.every(c => (enCarrito.get(c.id_producto_hijo) || 0) >= c.cantidad)) {
      return { combo, ahorro: ahorroCombo(combo) }
    }
  }
  return null
})
// Reemplaza los componentes sueltos del carrito por el combo
function armarComboSugerido() {
  const sug = comboSugeridoPorCarrito.value
  if (!sug) return
  ;(sug.combo.combos_como_padre || []).forEach(c => {
    let restante = c.cantidad
    for (let i = carrito.value.length - 1; i >= 0 && restante > 0; i--) {
      const it = carrito.value[i]
      if (it.producto.id_producto === c.id_producto_hijo) {
        const usar = Math.min(it.cantidad, restante)
        it.cantidad -= usar
        restante -= usar
        if (it.cantidad <= 0) carrito.value.splice(i, 1)
      }
    }
  })
  const ex = carrito.value.find(x => x.producto.id_producto === sug.combo.id_producto)
  if (ex) ex.cantidad++
  else carrito.value.push({ producto: sug.combo, cantidad: 1 })
  notif.exito(`Combo "${sug.combo.nombre_producto}" armado`)
}

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

// ---- Control de stock (evita armar órdenes que el backend rechazaría al cobrar) ----
// Si el producto no trae stock_actual, no se bloquea (Infinity).
function stockDisponible(prod) {
  const s = Number(prod?.stock_actual)
  return Number.isFinite(s) ? s : Infinity
}
function estaAgotado(prod) {
  return stockDisponible(prod) <= 0
}
// Cantidad ya puesta en la orden para ese producto
function cantidadEnCarrito(idProducto) {
  const it = carrito.value.find(c => c.producto.id_producto === idProducto)
  return it ? it.cantidad : 0
}

function agregarAlCarrito(prod) {
  const disp = stockDisponible(prod)
  if (disp <= 0) {
    notif.advertencia(`${prod.nombre_producto} está agotado.`)
    return
  }
  const ex = carrito.value.find(c => c.producto.id_producto === prod.id_producto)
  if ((ex ? ex.cantidad : 0) >= disp) {
    notif.advertencia(`Solo quedan ${disp} de ${prod.nombre_producto}.`)
    return
  }
  if (ex) ex.cantidad++
  else carrito.value.push({ producto: prod, cantidad: 1 })
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
      // No sugerir productos agotados
      .filter(r => { const p = productos.value.find(x => x.id_producto === r.id_producto); return !p || stockDisponible(p) > 0 })
      .slice(0, 3)
  } catch (e) {
    sugerencias.value = [] // degradación elegante: si la IA no está, no se muestran
  }
}

function agregarSugerencia(s) {
  const prod = productos.value.find(p => p.id_producto === s.id_producto)
  if (!prod) return
  const disp = stockDisponible(prod)
  if (disp <= 0) { notif.advertencia(`${prod.nombre_producto} está agotado.`); return }
  const ex = carrito.value.find(c => c.producto.id_producto === prod.id_producto)
  if ((ex ? ex.cantidad : 0) >= disp) {
    notif.advertencia(`Solo quedan ${disp} de ${prod.nombre_producto}.`)
    return
  }
  if (ex) ex.cantidad++
  else carrito.value.push({ producto: prod, cantidad: 1, precio: precioSugerido(s) }) // precio dinámico IA
  // Marcar la sugerencia como ACEPTADA para el reporte de efectividad de la IA
  // (fire-and-forget: nunca bloquea la toma de pedidos)
  if (s.id_sugerencia) {
    clienteHttp.patch(`/recomendaciones/sugerencias/${s.id_sugerencia}/aceptar`).catch(() => {})
  }
}

// Recalcular sugerencias cuando cambia la orden (con pequeño debounce)
let temporizadorSugerencias = null
watch(carrito, () => {
  clearTimeout(temporizadorSugerencias)
  temporizadorSugerencias = setTimeout(cargarSugerencias, 400)
}, { deep: true })

function sumar(idx) {
  const item = carrito.value[idx]
  const disp = stockDisponible(item.producto)
  if (item.cantidad >= disp) {
    notif.advertencia(`Solo quedan ${disp} de ${item.producto.nombre_producto}.`)
    return
  }
  item.cantidad++
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
  // Navegación dura: re-arranca la app limpia en /login (evita quedar en
  // blanco hasta refrescar) y corta sockets/intervalos del turno.
  window.location.assign('/login')
}

// Detectar si es dispositivo movil
function abrirModalCobro() {
  modalCobro.value = true
  errorCobro.value = ''
  metodoPago.value = 'Transferencia QR'
  requierePin.value = false
  ampliarQr.value = false
  comprobanteValido.value = false
  billeteraVerificada.value = false
  nombreBilleteraVerificada.value = ''
  saldoBilleteraVerificada.value = 0
  montoRecibidoTexto.value = ''
  clientesBilletera.value = []
  identificadorMostrado.value = ''
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
  metodoPago.value = metodo
  errorCobro.value = ''
  requierePin.value = false
  clientesBilletera.value = []
  if (metodo === 'Efectivo') montoRecibidoTexto.value = ''
}

// ---- Pago en EFECTIVO (solo positivos, con chips de billetes y cambio en vivo) ----
const montoRecibidoTexto = ref('')
const billetes = [10, 20, 50, 100, 200]
const recibidoNum = computed(() => {
  const n = parseFloat(montoRecibidoTexto.value)
  return Number.isFinite(n) && n > 0 ? n : 0
})
const cambioEfectivo = computed(() => recibidoNum.value - totalCarrito.value)
const faltaEfectivo = computed(() => cambioEfectivo.value < 0)
const efectivoSuficiente = computed(() => recibidoNum.value > 0 && cambioEfectivo.value >= 0)
function sincronizarEfectivo() {
  // El backend y el botón de cobro leen estos campos
  formCobro.value.monto_recibido = recibidoNum.value
  formCobro.value.cambio_dado = recibidoNum.value - totalCarrito.value
}
function alEscribirEfectivo() {
  // Solo números positivos con hasta 2 decimales (sin signos ni letras)
  let v = (montoRecibidoTexto.value || '').replace(/[^0-9.]/g, '')
  const partes = v.split('.')
  if (partes.length > 2) v = partes[0] + '.' + partes.slice(1).join('')
  const m = v.match(/^\d*(\.\d{0,2})?/)
  montoRecibidoTexto.value = m ? m[0] : v
  sincronizarEfectivo()
}
function sumarBillete(b) {
  montoRecibidoTexto.value = String(Math.round((recibidoNum.value + b) * 100) / 100)
  sincronizarEfectivo()
}
function montoExacto() {
  montoRecibidoTexto.value = totalCarrito.value.toFixed(2)
  sincronizarEfectivo()
}
function limpiarEfectivo() {
  montoRecibidoTexto.value = ''
  sincronizarEfectivo()
}

// Valida un comprobante (File) por OCR y, si es válido, auto-confirma el cobro.
// Lo emite CapturaCamara (modo foto) tras "Tomar foto" o "Subir foto".
async function validarComprobante(archivo) {
  if (!archivo) return
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
    errorCobro.value = err.response?.data?.error || err.error || 'No se pudo validar el comprobante'
  } finally {
    validandoOCR.value = false
  }
}

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
        : 'Sin registro'),
      metodo: metodoPago.value,
      transaccionId: res.id_transaccion || (res.id_comanda ? `TR-${res.id_comanda}` : 'N/D'),
      saldo_restante: res.saldo_restante
    }
    
    // Reflejar el consumo en el stock local (sin recargar todo el catálogo)
    carrito.value.forEach(it => {
      const prod = productos.value.find(p => p.id_producto === it.producto.id_producto)
      if (prod && Number.isFinite(Number(prod.stock_actual))) {
        prod.stock_actual = Math.max(0, Number(prod.stock_actual) - it.cantidad)
      }
    })

    carrito.value = []
    clienteSeleccionado.value = null
    verCarritoMovil.value = false
    mostrarExito.value = true
    cerrarModalCobro()
  } catch (err) {
    // Si el error es 403 y dice PIN requerido, mostramos el input
    if (err.error?.includes('PIN')) {
      requierePin.value = true
      errorCobro.value = 'Verificación de seguridad requerida'
    } else {
      errorCobro.value = err.error || 'Ocurrió un error al procesar el pago'
    }
  } finally {
    procesando.value = false
  }
}

function cerrarModalCobro() {
  modalCobro.value = false
  ampliarQr.value = false
  errorCobro.value = ''
  requierePin.value = false
  comprobanteValido.value = false
  billeteraVerificada.value = false
}

// Autocompletado: busca clientes a medida que el mesero escribe (nombre/carnet/celular)
function buscarClientesBilletera() {
  clearTimeout(timeoutBilletera)
  const q = (formCobro.value.qr_billetera || '').trim()
  billeteraVerificada.value = false
  if (q.length < 2) { clientesBilletera.value = []; return }
  timeoutBilletera = setTimeout(async () => {
    try {
      const res = await clienteHttp.get(`/usuarios?busqueda=${encodeURIComponent(q)}&rol=Cliente`)
      clientesBilletera.value = (res || []).slice(0, 6)
    } catch { clientesBilletera.value = [] }
  }, 300)
}
function elegirClienteBilletera(c) {
  // Se usa el carnet o el celular como identificador que reconoce la billetera
  formCobro.value.qr_billetera = c.ci_carnet || c.telefono || String(c.id_usuario)
  clientesBilletera.value = []
  verificarBilleteraBackend()
}

async function verificarBilleteraBackend() {
  clientesBilletera.value = []
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
    // SEGURIDAD: NO reemplazar lo escaneado por el identificador plano. El QR
    // privado es un token FIRMADO (tipo pago_con_pin): si se reenvía el string
    // plano al cobrar, el backend pierde la marca de privado y el PIN dejaba
    // de validarse (se cobró con PIN incorrecto). El token original viaja tal
    // cual a /comandas/crear; el identificador corto solo se MUESTRA.
    identificadorMostrado.value = res.identificador_real
    saldoBilleteraVerificada.value = res.saldo_actual
  } catch (err) {
    errorCobro.value = err.response?.data?.error || err.error || 'Billetera no encontrada o dato incorrecto.'
    billeteraVerificada.value = false
  } finally {
    procesando.value = false
  }
}

// El componente CapturaCamara (modo qr) emite el texto del QR ya decodificado,
// venga del escaneo en vivo o de una foto subida.
function alDetectarQr(texto) {
  formCobro.value.qr_billetera = texto
  verificarBilleteraBackend()
}

// El PIN solo acepta dígitos (el input aceptaba letras); con 4 dígitos cobra solo
function soloDigitosPin() {
  formCobro.value.pin = String(formCobro.value.pin || '').replace(/\D/g, '').slice(0, 4)
  if (formCobro.value.pin.length === 4) {
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
      telefono: formNuevoCliente.value.telefono,
      es_vip: formNuevoCliente.value.es_vip,
    }
    const res = await clienteHttp.post('/usuarios/cliente-rapido', payload)
    seleccionarCliente(res.usuario)
    if (res.yaExistia) avisoNitExistente.value = true
    // Cerrar despues de breve pausa si ya existia (para que lea el aviso)
    setTimeout(() => {
      modalNuevoCliente.value = false
      formNuevoCliente.value = { nombres: '', apellidos: '', ci_carnet: '', telefono: '', es_vip: false }
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
    if (pedidosListos.value.length === 0 && !pedidosPool.value.length) {
      mostrarModalListos.value = false
    }
  } catch(e) {
    notif.error('Error al entregar pedido. Intenta de nuevo.')
  } finally {
    procesandoEntrega.value = null
  }
}

// ==== REASIGNACIÓN POR TIEMPO (pool de pedidos listos) ====
const pedidosPool = ref([])
const ahoraTick = ref(Date.now())     // se refresca cada 1s para el cronómetro en vivo
let intervaloTick = null
const UMBRAL_LISTO_MIN = 3            // min. listo sin recoger antes de sugerir liberarlo
function minutosListo(ped) {
  if (!ped.fecha_listo) return 0
  return Math.floor((ahoraTick.value - new Date(ped.fecha_listo).getTime()) / 60000)
}
// Cronómetro en vivo (mm:ss) desde que el pedido quedó listo
function segundosDesde(fecha) {
  if (!fecha) return 0
  return Math.max(0, Math.floor((ahoraTick.value - new Date(fecha).getTime()) / 1000))
}
function cronoTexto(fecha) {
  const s = segundosDesde(fecha)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
// Color por umbral: 2 min amarillo, 5 min rojo, 7 min rojo intenso
function cronoClase(fecha) {
  const m = Math.floor(segundosDesde(fecha) / 60)
  if (m >= 7) return 'crono-critico'
  if (m >= 5) return 'crono-rojo'
  if (m >= 2) return 'crono-amarillo'
  return ''
}
// Apartados: "en barra" (por recoger) vs "recogidos" (por entregar al cliente)
const pedidosEnBarra = computed(() => pedidosListos.value.filter(p => p.estado_entrega !== 'recogido'))
const pedidosRecogidos = computed(() => pedidosListos.value.filter(p => p.estado_entrega === 'recogido'))
async function marcarRecogido(id) {
  try {
    await clienteHttp.post(`/comandas/${id}/recogido`)
    const p = pedidosListos.value.find(x => x.id_comanda === id)
    if (p) p.estado_entrega = 'recogido'
    notif.exito('Pedido recogido de la barra. Ahora entrégalo al cliente.')
  } catch (e) { notif.error(e?.error || 'No se pudo marcar como recogido.') }
}
async function cargarPool() {
  try { pedidosPool.value = await clienteHttp.get('/comandas/pool') }
  catch { pedidosPool.value = [] }
}
async function liberarPedido(id) {
  try {
    await clienteHttp.post(`/comandas/${id}/liberar`)
    pedidosListos.value = pedidosListos.value.filter(p => p.id_comanda !== id)
    notif.info('Pedido liberado: otro mesero puede llevarlo.')
    cargarPool()
  } catch { notif.error('No se pudo liberar el pedido.') }
}
async function tomarPedidoPool(p) {
  try {
    await clienteHttp.post(`/comandas/${p.id_comanda}/tomar`)
    pedidosPool.value = pedidosPool.value.filter(x => x.id_comanda !== p.id_comanda)
    cargarPedidosListos()
    notif.exito(`Tomaste el pedido de ${p.mesa ? 'la mesa ' + p.mesa : 'barra'}`)
    if (p.id_mesa) abrirMapaDestino(p.id_mesa, p.mesa, p.cliente)
  } catch (e) {
    notif.advertencia(e.error || 'Ese pedido ya lo tomó otro mesero.')
    cargarPool()
  }
}

onMounted(() => {
  cargarPedidosListos()
  cargarMisMesas()
  cargarPool()
  // Cronómetro en vivo: recalcula la espera cada segundo
  intervaloTick = setInterval(() => { ahoraTick.value = Date.now() }, 1000)

  // Vigilancia del servicio de sugerencias (IA): al entrar y cada 30s
  verificarEstadoIA()
  intervaloIA = setInterval(verificarEstadoIA, 30000)

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
  // Aviso de un compañero: el servicio de IA está caído (no me lo muestro a mí mismo)
  socket.on('ia_reportada', (data) => {
    if (data?.id_usuario === tienda.usuario?.id) return
    agregarToast(`${data?.reportadoPor || 'Un compañero'} avisó: el servicio de sugerencias está caído`)
  })
  // El admin cambió la configuración: aplicar en vivo, sin recargar.
  socket.on('config_actualizada', (data) => {
    if (data && 'sugerencias_activas' in data) {
      if (data.sugerencias_activas) {
        cargarSugerencias() // se reactivan: recalcular con la orden actual
      } else {
        sugerencias.value = [] // se apagaron: quitarlas al instante
      }
    }
    // El descuento de combos cambió: los precios de combo en el catálogo se actualizan.
    if (data && 'descuento_combos' in data) recargarCatalogo()
  })
  // El catálogo cambió (producto/precio/stock/promo): refrescar la lista en vivo.
  socket.on('catalogo_actualizado', () => { recargarCatalogo() })
  // Recepción me asignó una mesa
  socket.on('mesa_asignada', (data) => {
    cargarReparto()  // cambió el reparto del evento (afecta a todos)
    if (data?.id_mesero !== tienda.usuario?.id) return
    cargarMisMesas()
    agregarToast('Te asignaron una nueva mesa')
  })
  // Un compañero salió del evento: sus mesas se liberaron (cambia el reparto)
  socket.on('mesas_liberadas', () => { cargarReparto(); cargarMisMesas() })
  // Una mesa se liberó (cierre de atención/reserva): recalcular reparto
  socket.on('mesa_actualizada', () => { cargarReparto() })
  // Un pedido cayó al pool (alguien lo liberó) — cualquier mesero puede tomarlo
  socket.on('pedido_pool', () => { cargarPool() })
  // Alguien tomó un pedido del pool
  socket.on('pedido_tomado', (data) => {
    cargarPool()
    if (data?.id_mesero === tienda.usuario?.id) cargarPedidosListos()
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
  if (intervaloIA) clearInterval(intervaloIA)
  if (intervaloTick) clearInterval(intervaloTick)
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
  position: relative;
  height: 66px;
  background: linear-gradient(180deg, #1F124A 0%, #17092F 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 22px;
  border-bottom: 1px solid var(--borde-sutil);
  box-shadow: 0 8px 28px rgba(10, 6, 26, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: 10;
  flex-shrink: 0;
}
.pos-header::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.55), rgba(236, 72, 153, 0.4), transparent);
}

.logo-mini { height: 32px; margin-right: 14px; display: block; filter: drop-shadow(0 2px 8px rgba(168, 85, 247, 0.4)); }
.logo-area { display: flex; align-items: center; gap: 4px; }
.badge-rol { background: var(--gradiente-marca); padding: 6px 14px; border-radius: var(--radio-full); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; color: #fff; box-shadow: 0 3px 14px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25); }

.usuario-area { display: flex; align-items: center; gap: 15px; font-size: 0.9rem; color: var(--texto-secundario); }
.usuario-area strong { color: var(--texto-principal); }

/* Aviso sutil (chip flotante en un rincón) cuando la IA está caída */
.chip-ia {
  position: fixed; bottom: 18px; left: 16px; z-index: 40; max-width: calc(100vw - 32px);
  display: inline-flex; align-items: center; gap: 9px;
  padding: 7px 8px 7px 13px; border-radius: var(--radio-full);
  background: var(--fondo-tarjeta, #17092F); border: 1px solid rgba(251, 191, 36, 0.4);
  box-shadow: 0 8px 22px rgba(10, 6, 26, 0.5);
  font-size: 0.78rem; font-weight: 600; color: var(--texto-secundario);
}
.chip-ia-punto { width: 8px; height: 8px; border-radius: 50%; background: #FBBF24; box-shadow: 0 0 0 0 rgba(251,191,36,0.5); animation: pulso-ia 1.8s ease-out infinite; flex-shrink: 0; }
@keyframes pulso-ia { 0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.5); } 70% { box-shadow: 0 0 0 7px rgba(251,191,36,0); } 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); } }
.chip-ia-txt { white-space: nowrap; }
.chip-ia-avisar {
  flex-shrink: 0; padding: 5px 11px; border-radius: var(--radio-full); border: none; cursor: pointer;
  font-size: 0.74rem; font-weight: 800; white-space: nowrap;
  color: #1a1206; background: #FBBF24; transition: background var(--trans-normal), transform var(--trans-rapida);
}
.chip-ia-avisar:hover:not(:disabled) { background: #FCD34D; transform: translateY(-1px); }
.chip-ia-avisar:active:not(:disabled) { transform: scale(0.95); }
.chip-ia-avisar.enviado { background: rgba(34,197,94,0.2); color: #86EFAC; cursor: default; }
.chip-ia-cerrar {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: transparent; color: var(--texto-desactivado); transition: background var(--trans-normal), color var(--trans-normal);
}
.chip-ia-cerrar:hover { background: rgba(255,255,255,0.08); color: var(--texto-principal); }
.chip-ia-anim-enter-active, .chip-ia-anim-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.chip-ia-anim-enter-from, .chip-ia-anim-leave-to { opacity: 0; transform: translateY(8px); }
/* En móvil se sube para no chocar con el botón flotante del carrito */
@media (max-width: 480px) {
  .chip-ia { bottom: 84px; left: 10px; font-size: 0.74rem; }
}
@media (prefers-reduced-motion: reduce) { .chip-ia-punto { animation: none; } }

.pos-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel-productos {
  flex: 1;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1100px 520px at 15% -8%, rgba(91, 47, 184, 0.16), transparent 60%),
    var(--fondo-principal);
  padding: 22px 24px 24px;
  overflow: hidden; /* Importante: el scroll lo hace .lista-productos internamente */
}

.lista-productos {
  flex: 1;
  overflow-y: auto;
  margin: 0 -6px;
  padding: 4px 6px 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--morado-medio) transparent;
}
.lista-productos::-webkit-scrollbar { width: 8px; }
.lista-productos::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.35); border-radius: 8px; }
.lista-productos::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.55); }

.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--texto-desactivado);
  text-align: center;
}
.vacio svg { opacity: 0.5; }
.vacio p { font-size: 0.95rem; max-width: 34ch; text-wrap: balance; }

/* Barra superior: buscador + interruptor de combos */
.barra-buscar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.barra-buscar .buscador { flex: 1; margin-bottom: 0; min-width: 0; }
.toggle-combos {
  display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
  background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde);
  border-radius: var(--radio-full); padding: 8px 15px 8px 10px; cursor: pointer;
  color: var(--texto-secundario); font-weight: 700; font-size: 0.82rem; white-space: nowrap;
  transition: color var(--trans-normal), border-color var(--trans-normal), background var(--trans-normal);
}
.toggle-combos:hover { border-color: var(--borde-activo); }
.toggle-combos.activo { color: var(--texto-principal); border-color: var(--borde-activo); }
.toggle-combos:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.toggle-pista { position: relative; width: 34px; height: 20px; border-radius: var(--radio-full); background: rgba(255,255,255,0.16); transition: background 0.22s ease; flex-shrink: 0; }
.toggle-combos.activo .toggle-pista { background: var(--gradiente-marca); }
.toggle-bolita { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.35); transition: transform 0.22s ease; }
.toggle-combos.activo .toggle-bolita { transform: translateX(14px); }

.buscador {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--glass-borde);
  padding: 14px 20px;
  border-radius: var(--radio-full);
  margin-bottom: 14px;
  transition: background var(--trans-normal), border-color var(--trans-normal), box-shadow var(--trans-normal);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.buscador:hover { border-color: var(--borde-activo); }
.buscador:focus-within { background: var(--fondo-tarjeta-alt); border-color: var(--morado-brillante); box-shadow: var(--anillo-foco), var(--glow-morado); }
.buscador:focus-within svg { color: var(--morado-hover); }
.buscador svg { width: 19px; height: 19px; color: var(--texto-desactivado); margin-right: 12px; transition: color var(--trans-rapida); flex-shrink: 0; }
.buscador input { background: transparent; border: none; color: var(--texto-principal); width: 100%; min-width: 0; font-size: 0.98rem; outline: none; }
.buscador input::placeholder { color: var(--texto-desactivado); }

/* Fila de categorías con flechas (escritorio) + deslizar (móvil) */
.categorias-fila { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.cat-flecha {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: var(--radio-full);
  display: flex; align-items: center; justify-content: center;
  background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde);
  color: var(--texto-secundario); cursor: pointer;
  transition: background var(--trans-normal), color var(--trans-normal), border-color var(--trans-normal);
}
.cat-flecha:hover { background: var(--fondo-tarjeta-alt); color: var(--texto-principal); border-color: var(--borde-activo); }
.cat-flecha:active { transform: scale(0.92); }
.categorias-scroll { display: flex; gap: 10px; overflow-x: auto; min-width: 0; flex: 1; padding: 2px 2px 8px; -webkit-overflow-scrolling: touch; scrollbar-width: none; scroll-behavior: smooth; }
.categorias-scroll::-webkit-scrollbar { display: none; }
.cat-combos { display: inline-flex; align-items: center; gap: 6px; }
.cat-combos svg { flex-shrink: 0; }
/* En pantallas táctiles se desliza con el dedo: las flechas estorban */
@media (hover: none) { .cat-flecha { display: none; } }
@media (max-width: 700px) { .cat-flecha { display: none; } }

/* Secciones del catálogo (combos destacados + productos) */
.seccion-titulo { display: flex; align-items: center; gap: 8px; margin: 4px 2px 12px; color: var(--texto-principal); }
.seccion-titulo svg { color: var(--morado-hover); flex-shrink: 0; }
.seccion-titulo span { font-family: var(--fuente-titulo); font-size: 1rem; font-weight: 800; letter-spacing: -0.01em; }
.seccion-combos { margin-bottom: 22px; }
.seccion-productos { margin-bottom: 4px; }
.grid-combos { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; }

/* Tarjeta de combo (más informativa: qué incluye + ahorro) */
.tarjeta-combo {
  position: relative; display: flex; flex-direction: column; cursor: pointer; min-width: 0;
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(168,85,247,0.16), transparent 55%),
    var(--gradiente-sutil);
  border: 1px solid rgba(168,85,247,0.35); border-radius: var(--radio-xl); overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 28px rgba(10,6,26,0.38);
  transition: transform 0.35s var(--ease-suave), box-shadow 0.3s ease, border-color 0.2s ease;
  will-change: transform;
}
.tarjeta-combo:hover { transform: translateY(-6px); border-color: var(--morado-brillante); box-shadow: 0 22px 48px rgba(10,6,26,0.55), var(--glow-morado); }
.tarjeta-combo:hover .tp-add { opacity: 1; transform: translateY(0) scale(1); }
.tarjeta-combo:active { transform: translateY(-1px) scale(0.98); }
.tc-media { position: relative; height: 130px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.22); }
.tc-media .img-producto { width: 100%; height: 100%; object-fit: cover; }
.tc-ahorro {
  position: absolute; top: 10px; left: 10px; z-index: 2;
  font-size: 0.62rem; font-weight: 800; letter-spacing: 0.02em;
  padding: 4px 9px; border-radius: var(--radio-full);
  background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff;
  box-shadow: 0 4px 12px rgba(16,80,40,0.45);
}
.tc-info { padding: 12px 14px 15px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.tc-info h5 { font-family: var(--fuente-titulo); font-size: 0.95rem; font-weight: 800; margin: 0; color: var(--texto-principal); line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* Mini-tarjetas de componentes: cantidad grande + qué es (fácil de leer de un vistazo) */
.tc-items { display: flex; flex-direction: column; gap: 5px; }
.tc-item { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tc-item-img { width: 26px; height: 26px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,0.06); border: 1px solid var(--borde-sutil); }
.tc-item-ph { display: flex; align-items: center; justify-content: center; color: var(--morado-hover); }
.tc-item-txt { font-size: 0.8rem; color: var(--texto-secundario); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tc-item-txt b { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; margin-right: 3px; border-radius: var(--radio-full); background: rgba(168,85,247,0.25); color: #E9D5FF; font-size: 0.72rem; font-weight: 800; }
.tc-info .precio { color: var(--rosa-acento); font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; text-shadow: 0 0 18px rgba(236,72,153,0.35); margin-top: 2px; }

/* Apartado Fuera de stock (título apagado, se coloca al final) */
.seccion-agotados { margin-top: 8px; }
.seccion-agotados .seccion-titulo { color: var(--texto-desactivado); }
.seccion-agotados .seccion-titulo svg { color: var(--texto-desactivado); }

/* Aviso de combo en la orden */
.combo-sugerido {
  display: flex; align-items: center; gap: 12px; margin: 4px 0 12px; padding: 12px 14px;
  border-radius: var(--radio-md);
  background: linear-gradient(135deg, rgba(168,85,247,0.16), rgba(236,72,153,0.12));
  border: 1px solid rgba(168,85,247,0.4);
}
.cs-icono { flex-shrink: 0; width: 34px; height: 34px; border-radius: var(--radio-full); display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.22); color: var(--morado-hover); }
.cs-texto { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cs-texto strong { font-size: 0.86rem; color: var(--texto-principal); line-height: 1.2; }
.cs-texto small { font-size: 0.75rem; color: var(--color-exito); font-weight: 700; }
.cs-btn { flex-shrink: 0; padding: 8px 16px; border-radius: var(--radio-full); border: none; cursor: pointer; font-weight: 700; font-size: 0.82rem; color: #fff; background: var(--gradiente-marca); box-shadow: 0 4px 14px rgba(236,72,153,0.4); transition: transform var(--trans-rapida); }
.cs-btn:hover { transform: translateY(-1px); }
.cs-btn:active { transform: scale(0.95); }
.btn-categoria { white-space: nowrap; padding: 10px 18px; border-radius: var(--radio-full); background: var(--fondo-tarjeta); border: 1px solid var(--glass-borde); color: var(--texto-secundario); cursor: pointer; font-size: 0.84rem; font-weight: 600; letter-spacing: 0.01em; transition: background var(--trans-normal), color var(--trans-normal), border-color var(--trans-normal), transform var(--trans-rapida), box-shadow var(--trans-normal); }
.btn-categoria:hover { background: var(--fondo-tarjeta-alt); color: var(--texto-principal); border-color: var(--borde-activo); transform: translateY(-2px); }
.btn-categoria:active { transform: scale(0.96); }
.btn-categoria:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-categoria.activo { background: var(--gradiente-marca); color: #fff; border-color: transparent; box-shadow: var(--glow-morado); transform: translateY(-1px); }

.grid-productos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 16px;
}

.tarjeta-producto-pos {
  position: relative;
  background: var(--gradiente-sutil);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.35s var(--ease-suave), box-shadow 0.3s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 28px rgba(10, 6, 26, 0.38);
  will-change: transform;
}
.tarjeta-producto-pos:hover { transform: translateY(-6px); border-color: var(--borde-activo); box-shadow: 0 22px 48px rgba(10, 6, 26, 0.55), var(--glow-morado); }
.tarjeta-producto-pos:hover .img-producto { transform: scale(1.07); }
.tarjeta-producto-pos:hover .tp-add { opacity: 1; transform: translateY(0) scale(1); }
.tarjeta-producto-pos:active { transform: translateY(-1px) scale(0.98); }
.tarjeta-producto-pos:focus-visible { outline: none; box-shadow: var(--anillo-foco), 0 16px 36px rgba(14, 8, 33, 0.6); }

.tp-media { position: relative; height: 150px; overflow: hidden; background: rgba(0, 0, 0, 0.25); display: flex; align-items: center; justify-content: center; }
.tp-media::after {
  content: '';
  position: absolute; bottom: 0; left: 0; right: 0; height: 62px;
  background: linear-gradient(to top, var(--fondo-tarjeta-alt), transparent);
  pointer-events: none;
}
.img-producto { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s var(--ease-suave); }

/* Combos: composición de fotos solapadas (sin imagen propia) */
.tp-combo { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 0 16px; }
.tp-combo-cell {
  width: 56px; height: 56px; flex-shrink: 0;
  border-radius: 30%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid var(--fondo-tarjeta-alt);
  box-shadow: 0 6px 16px rgba(6, 3, 18, 0.5);
  display: flex; align-items: center; justify-content: center;
}
.tp-combo-cell + .tp-combo-cell { margin-left: -20px; }
.tp-combo-cell:nth-child(2) { z-index: 1; }
.tp-combo-cell:nth-child(3) { z-index: 2; }
.tp-combo-cell img { width: 100%; height: 100%; object-fit: cover; }
.tp-combo-ph { color: var(--morado-hover); opacity: 0.75; display: flex; }

/* Placeholder elegante (producto sin imagen) */
.tp-placeholder {
  position: relative; z-index: 1;
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 12px; text-align: center;
  background: radial-gradient(80% 80% at 50% 32%, rgba(168, 85, 247, 0.20), transparent 65%);
  color: var(--morado-hover);
}
.tp-placeholder svg { opacity: 0.85; filter: drop-shadow(0 4px 12px rgba(168, 85, 247, 0.4)); }
.tp-ph-nombre {
  font-family: var(--fuente-titulo);
  font-size: 0.72rem; font-weight: 700; line-height: 1.2;
  color: var(--texto-secundario); letter-spacing: 0.02em;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 100%;
}

.tp-add {
  position: absolute;
  bottom: 10px; right: 10px;
  z-index: 2;
  width: 38px; height: 38px;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 16px rgba(236, 72, 153, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  opacity: 0;
  transform: translateY(6px) scale(0.8);
  transition: opacity var(--trans-normal), transform var(--trans-normal);
}
/* En pantallas táctiles (sin hover) el botón + siempre es visible */
@media (hover: none) {
  .tp-add { opacity: 1; transform: none; }
}

/* Producto agotado: badge claro y tarjeta atenuada (no se puede pedir) */
.tp-agotado {
  position: absolute; bottom: 10px; right: 10px; z-index: 2;
  font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 4px 10px; border-radius: var(--radio-full);
  background: rgba(239, 68, 68, 0.92); color: #fff;
  box-shadow: 0 4px 12px rgba(10, 6, 26, 0.35);
}
.tarjeta-producto-pos.agotado,
.tarjeta-combo.agotado { opacity: 0.55; filter: grayscale(0.4); }
.tarjeta-producto-pos.agotado:hover,
.tarjeta-combo.agotado:hover { transform: none; border-color: var(--glass-borde); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 28px rgba(10,6,26,0.38); }
.tarjeta-producto-pos.agotado .img-producto,
.tarjeta-combo.agotado:hover .tp-add { transform: none; }
.info-producto { padding: 13px 14px 15px; text-align: left; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.info-producto h5 { font-family: var(--fuente-titulo); font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--texto-principal); line-height: 1.22; letter-spacing: -0.01em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.32em; }
.info-producto .precio { color: var(--rosa-acento); font-weight: 800; font-size: 1.2rem; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; text-shadow: 0 0 18px rgba(236, 72, 153, 0.35); }

.panel-carrito {
  position: relative;
  width: 392px;
  background:
    radial-gradient(600px 300px at 100% 0%, rgba(91, 47, 184, 0.18), transparent 60%),
    var(--fondo-sidebar);
  border-left: 1px solid var(--borde-sutil);
  display: flex;
  flex-direction: column;
  padding: 20px 22px;
  box-shadow: -18px 0 48px rgba(10, 6, 26, 0.4);
}
.panel-carrito::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(168, 85, 247, 0.5), rgba(236, 72, 153, 0.35), transparent);
}

.titulo-carrito { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; font-family: var(--fuente-titulo); color: var(--texto-principal); }

.lista-carrito { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin: 0 -6px; padding: 4px 6px; scrollbar-width: thin; scrollbar-color: var(--morado-medio) transparent; }
.lista-carrito::-webkit-scrollbar { width: 6px; }
.lista-carrito::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.35); border-radius: 6px; }
.vacio-carrito { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 4px; color: var(--texto-desactivado); text-align: center; }
.vacio-carrito svg { width: 40px; height: 40px; margin-bottom: 10px; opacity: 0.5; }
.vacio-carrito p { font-size: 0.9rem; }

.item-carrito {
  background: rgba(168,85,247,0.06);
  border: 1px solid var(--borde-sutil);
  padding: 11px 13px;
  border-radius: var(--radio-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: border-color var(--trans-rapida), background var(--trans-rapida), transform var(--trans-rapida);
}
.item-carrito:hover { border-color: var(--borde-activo); background: rgba(168,85,247,0.12); transform: translateX(2px); }
.item-info { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
.item-nombre { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-precio { color: var(--rosa-suave); font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.item-controles { display: flex; align-items: center; background: rgba(168,85,247,0.14); border-radius: var(--radio-full); flex-shrink: 0; }
.item-controles button { background: transparent; border: none; color: var(--texto-principal); width: 32px; height: 32px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; border-radius: var(--radio-full); transition: background var(--trans-rapida), transform 0.1s ease; }
.item-controles button:hover { background: rgba(168,85,247,0.3); }
.item-controles button:active { transform: scale(0.88); }
.item-controles .cantidad { width: 25px; text-align: center; font-weight: bold; font-size: 0.9rem; font-variant-numeric: tabular-nums; }

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
  font-size: 0.82rem;
  font-weight: 600;
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

.carrito-pie {
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--radio-lg);
  background: linear-gradient(160deg, rgba(46, 26, 102, 0.55), rgba(27, 16, 64, 0.55));
  border: 1px solid var(--borde-activo);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 -6px 26px rgba(10, 6, 26, 0.35);
}

.total-carrito {
  padding: 4px 6px 16px;
  margin-bottom: 14px;
  border-bottom: 1px dashed rgba(168, 85, 247, 0.35);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.total-meta { display: flex; flex-direction: column; gap: 2px; }
.total-carrito span { color: var(--texto-secundario); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.total-items { color: var(--texto-desactivado); font-size: 0.78rem; text-transform: none; letter-spacing: 0; font-weight: 500; font-variant-numeric: tabular-nums; }
.total-carrito h2 { font-family: var(--fuente-titulo); color: var(--rosa-suave); font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1; text-shadow: 0 2px 18px rgba(236, 72, 153, 0.35); }

.btn-cobrar { position: relative; height: 58px; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.01em; display: flex; align-items: center; justify-content: center; gap: 12px; transition: transform var(--trans-rapida), box-shadow var(--trans-rapida), filter var(--trans-rapida); }
.btn-cobrar:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(236, 72, 153, 0.45); }
.btn-cobrar:not(:disabled):active { transform: translateY(0) scale(0.99); }
.btn-cobrar-arrow { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radio-full); background: rgba(255, 255, 255, 0.18); transition: transform var(--trans-normal); }
.btn-cobrar:not(:disabled):hover .btn-cobrar-arrow { transform: translateX(3px); }

/* Selector de Mesa */
/* Mis mesas asignadas */
.mis-mesas { margin-bottom: 12px; padding: 10px 12px; border-radius: var(--radio-md); background: rgba(168,85,247,0.07); border: 1px solid var(--borde-sutil); }
.mm-titulo { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--morado-hover); margin-bottom: 8px; }
.mm-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.mm-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: var(--radio-full);
  background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); color: var(--texto-principal);
  cursor: pointer; font-size: 0.82rem; transition: border-color var(--trans-rapida), background var(--trans-rapida), transform var(--trans-rapida);
}
.mm-chip:hover { border-color: var(--morado-brillante); transform: translateY(-1px); }
.mm-chip.sel { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.mm-chip strong { font-weight: 800; }
.mm-cli { color: var(--texto-secundario); font-size: 0.76rem; }
.mm-chip.sel .mm-cli { color: rgba(255,255,255,0.85); }
.mm-vip { font-size: 0.6rem; font-weight: 800; padding: 2px 6px; border-radius: var(--radio-full); background: #FBBF24; color: #1a1206; }
/* Carga vs límite justo del mesero */
.mm-carga { margin-left: auto; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: var(--radio-full); background: rgba(34,197,94,0.16); color: var(--color-exito); }
.mm-carga.lleno { background: rgba(245,158,11,0.18); color: var(--color-alerta); }
.mm-salir { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.28); color: var(--color-error); border-radius: var(--radio-full); font-size: 0.68rem; font-weight: 700; padding: 4px 10px; cursor: pointer; text-transform: none; letter-spacing: 0; }
.mm-salir:hover { background: rgba(239,68,68,0.2); }
.mm-carga + .mm-salir { margin-left: 8px; }
/* Cada mesa asignada = chip + botón de cerrar atención */
.mm-chip-wrap { display: inline-flex; align-items: stretch; }
.mm-chip-wrap .mm-chip { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.mm-cerrar {
  display: inline-flex; align-items: center; justify-content: center; padding: 0 9px;
  background: rgba(34,197,94,0.1); border: 1px solid var(--borde-sutil); border-left: none;
  border-top-right-radius: var(--radio-full); border-bottom-right-radius: var(--radio-full);
  color: var(--color-exito); cursor: pointer; transition: background var(--trans-rapida);
}
.mm-cerrar:hover { background: rgba(34,197,94,0.25); }
.mm-vacia { font-size: 0.8rem; color: var(--texto-secundario); margin: 2px 0 0; }

.selector-mesa { margin-bottom: 12px; }
/* Tabs de modo de mesa (lista / buscar / mapa) */
.mesa-tabs { display: flex; gap: 6px; margin-bottom: 8px; }
.mesa-tab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 6px; border-radius: var(--radio-md); background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-secundario); font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: var(--trans-rapida); }
.mesa-tab:hover { border-color: var(--borde-activo); color: var(--texto-principal); }
.mesa-tab.activo { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.mesa-buscar { display: flex; flex-direction: column; gap: 8px; }
.mesa-chips { display: flex; flex-wrap: wrap; gap: 6px; max-height: 128px; overflow-y: auto; }
.mesa-chip { padding: 7px 12px; border-radius: var(--radio-full); background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: var(--trans-rapida); }
.mesa-chip:hover { border-color: var(--borde-activo); }
.mesa-chip.sel { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.mesa-chip.reservada { border-color: rgba(239,68,68,0.4); color: #FCA5A5; }
.mesa-chip.reservada.sel { background: var(--gradiente-marca); color: #fff; }
.mesa-chip.barra { border-style: dashed; }
.mesa-vacio { font-size: 0.8rem; color: var(--texto-desactivado); padding: 4px; }
.mesa-hint { font-size: 0.8rem; color: var(--texto-desactivado); padding: 4px; }
.mesa-selector-row { display: flex; align-items: center; gap: 10px; background: var(--fondo-input); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); padding: 4px 12px; transition: var(--trans-rapida); }
.mesa-selector-row:focus-within { border-color: var(--morado-brillante); }
.mesa-icono { color: var(--texto-secundario); display: flex; align-items: center; flex-shrink: 0; }
.select-mesa-wrap { flex: 1; min-width: 0; }
/* El disparador se integra en la barra (sin borde/fondo propios) */
.select-mesa-wrap :deep(.bs-disparador),
.select-mesa-wrap :deep(.bs-abierto .bs-disparador) {
  background: transparent; border: none; box-shadow: none; padding: 8px 0; min-height: 38px;
}
.cliente-auto-mesa { display: flex; align-items: center; gap: 6px; background: rgba(34, 197, 94,0.08); border: 1px solid rgba(34, 197, 94,0.25); border-radius: 8px; padding: 8px 12px; font-size: 0.8rem; color: var(--color-exito); margin-top: 6px; }

/* Buscador de Cliente */
.buscador-cliente { margin-bottom: 12px; position: relative; }
.buscador-cliente-row { display: flex; gap: 8px; align-items: center; }
.input-cliente { flex: 1; background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 11px 14px; border-radius: var(--radio-md); font-size: 0.88rem; outline: none; transition: var(--trans-rapida); }
.input-cliente:focus { border-color: var(--morado-brillante); box-shadow: 0 0 0 3px rgba(168,85,247,0.15); }
.btn-nuevo-cliente { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; box-shadow: 0 3px 12px rgba(236, 72, 153,0.3); transition: 0.2s; }
.btn-nuevo-cliente:active { transform: scale(0.93); }
.resultados-cliente { position: absolute; top: 100%; left: 0; right: 0; z-index: 200; background: var(--fondo-oscuro); border: 1px solid var(--borde-sutil); border-radius: 12px; overflow: hidden; margin-top: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.item-cliente { padding: 12px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; transition: 0.15s; }
.item-cliente:hover { background: rgba(168,85,247,0.12); }
.item-cliente strong { font-size: 0.9rem; }
.item-cliente small { color: var(--texto-secundario); font-size: 0.78rem; }
.cliente-seleccionado { display: flex; justify-content: space-between; align-items: center; background: rgba(34, 197, 94,0.08); border: 1px solid rgba(34, 197, 94,0.25); padding: 10px 12px; border-radius: 10px; margin-top: 8px; font-size: 0.88rem; color: var(--color-exito); }
.btn-quitar-cliente { background: rgba(239, 68, 68,0.1); border: 1px solid rgba(239, 68, 68,0.25); color: var(--color-error); width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.15s; }
.btn-quitar-cliente:hover { background: rgba(239, 68, 68,0.2); }

/* ============================
   MODAL DE COBRO — Mobile First
   ============================ */
.cobro-overlay { position: fixed; inset: 0; background: rgba(6, 3, 18, 0.82); z-index: 5000; display: flex; align-items: flex-end; justify-content: center; animation: fadeOverlay 0.2s ease; }
@keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }
.cobro-sheet { background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-xl) var(--radio-xl) 0 0; width: 100%; max-width: 540px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--sombra-modal); }

.cobro-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; background: var(--fondo-sidebar); border-bottom: 1px solid var(--borde-sutil); flex-shrink: 0; }
.cobro-label { font-size: 0.75rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.cobro-total { font-family: var(--fuente-titulo); font-size: 2rem; font-weight: 800; letter-spacing: -0.01em; color: var(--rosa-suave); margin: 0; font-variant-numeric: tabular-nums; }
.cobro-cerrar { background: rgba(168,85,247,0.1); border: none; color: var(--texto-principal); width: 36px; height: 36px; border-radius: var(--radio-full); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: var(--trans-rapida); }
.cobro-cerrar:hover { background: rgba(239,68,68,0.18); color: var(--color-error); }

.cobro-tabs { display: flex; flex-shrink: 0; border-bottom: 1px solid var(--borde-sutil); }
.cobro-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 4px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--texto-secundario); cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: var(--trans-normal); }
.cobro-tab svg { flex-shrink: 0; }
.cobro-tab:hover:not(.activo) { color: var(--texto-principal); background: rgba(168,85,247,0.04); }
.cobro-tab.activo { color: var(--rosa-acento); border-bottom-color: var(--rosa-acento); background: rgba(168,85,247,0.06); }

.cobro-cuerpo { flex: 1; overflow-y: auto; padding: 0; }
.cobro-panel { padding: 24px 20px; }
.cobro-instruccion { color: var(--texto-secundario); font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; text-align: center; }
.cobro-error { color: var(--color-error); background: rgba(239, 68, 68,0.1); border: 1px solid rgba(239, 68, 68,0.3); border-radius: 8px; padding: 12px 16px; text-align: center; font-size: 0.9rem; margin: 0 20px 20px; }

.cobro-pie { padding: 16px 20px; background: rgba(14,8,33,0.4); display: flex; gap: 10px; flex-shrink: 0; border-top: 1px solid var(--borde-sutil); }
.cobro-btn-cancel { flex: 0 0 auto; padding: 14px 20px; background: rgba(168,85,247,0.08); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); color: var(--texto-secundario); font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: var(--trans-rapida); }
.cobro-btn-cancel:hover { background: rgba(168,85,247,0.16); color: var(--texto-principal); }
.cobro-btn-cancel:active { transform: scale(0.97); }
.cobro-btn-ok { flex: 1; padding: 14px; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); border: none; border-radius: 14px; color: #fff; font-size: 1rem; font-weight: 700; letter-spacing: 0.01em; cursor: pointer; box-shadow: 0 4px 20px rgba(236, 72, 153,0.3); transition: transform var(--trans-rapida), box-shadow var(--trans-rapida); font-variant-numeric: tabular-nums; }
.cobro-btn-ok:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(236, 72, 153,0.42); }
.cobro-btn-ok:not(:disabled):active { transform: translateY(0) scale(0.99); }
.cobro-btn-ok:disabled { opacity: 0.5; cursor: not-allowed; }

/* QR Transferencia */
.qr-row { display: flex; gap: 16px; align-items: center; margin-bottom: 4px; }
.qr-mini { width: 100px; height: 100px; border-radius: 12px; border: 2px solid var(--rosa-acento); flex-shrink: 0; }
.qr-acciones { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.qr-total-txt { font-size: 1.1rem; font-weight: 600; }
.btn-accion-qr { display: flex; align-items: center; gap: 8px; background: rgba(168,85,247,0.1); border: 1px solid var(--borde-activo); color: var(--morado-hover); padding: 10px 14px; border-radius: var(--radio-md); cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: var(--trans-rapida); }
.btn-accion-qr:hover { background: rgba(168,85,247,0.2); color: var(--texto-principal); }

/* OCR zona */
.ocr-zona { background: rgba(168,85,247,0.04); border: 1px dashed var(--borde-sutil); border-radius: var(--radio-md); padding: 24px; text-align: center; }
.btn-camara-label { display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, var(--morado-brillante), var(--rosa-acento)); color: #fff; padding: 14px 20px; border-radius: 30px; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 20px rgba(236, 72, 153,0.35); transition: 0.2s; }
.btn-camara-label:active { transform: scale(0.97); }
.ia-verificando { color: var(--color-info); font-weight: 600; position: relative; overflow: hidden; padding: 20px 0; }
.ia-barra { width: 100%; height: 3px; background: var(--color-info); position: absolute; top: 0; left: 0; animation: scan 1.5s infinite; box-shadow: 0 0 10px var(--color-info); }
.ia-ok { color: var(--color-exito); font-weight: 700; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 10px; }
@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }

/* Billetera */
.billetera-inicio { display: flex; flex-direction: column; align-items: stretch; gap: 18px; }
.cobro-o-manual { text-align: center; font-size: 0.8rem; color: var(--texto-secundario); margin: 0 0 8px; }
.billetera-manual { display: flex; gap: 0.5rem; }
.billetera-manual .input-qr { flex: 1; }
.billetera-manual .btn { padding: 0 1.5rem; white-space: nowrap; }
/* Autocompletado de billetera */
.billetera-resultados { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.billetera-item {
  display: flex; align-items: center; gap: 10px; text-align: left; width: 100%;
  padding: 9px 12px; border-radius: var(--radio-md); cursor: pointer;
  background: rgba(168,85,247,0.06); border: 1px solid var(--borde-sutil); color: var(--texto-principal);
  transition: background var(--trans-rapida), border-color var(--trans-rapida), transform var(--trans-rapida);
}
.billetera-item:hover { background: rgba(168,85,247,0.14); border-color: var(--borde-activo); transform: translateX(2px); }
.billetera-item:active { transform: scale(0.99); }
.bi-avatar { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; color: #fff; background: var(--gradiente-marca); text-transform: uppercase; }
.bi-txt { display: flex; flex-direction: column; min-width: 0; }
.bi-nombre { font-size: 0.88rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bi-dato { font-size: 0.76rem; color: var(--texto-secundario); }
.input-qr { width: 100%; box-sizing: border-box; min-width: 0; padding: 14px; border-radius: var(--radio-md); border: 1px solid var(--borde-sutil); background: var(--fondo-input); color: var(--texto-principal); font-size: 1rem; outline: none; text-align: center; }
.input-qr:focus { border-color: var(--morado-brillante); box-shadow: 0 0 0 3px rgba(168,85,247,0.15); }

/* PIN */
.pin-zone { display: flex; flex-direction: column; align-items: center; padding: 20px 0; text-align: center; }
.pin-titulo { font-family: var(--fuente-titulo); font-weight: 700; font-size: 1.1rem; margin: 12px 0 4px; color: var(--texto-principal); }
.pin-sub { font-size: 0.85rem; color: var(--texto-secundario); margin-bottom: 16px; }
.input-pin { width: 200px; max-width: 100%; box-sizing: border-box; text-align: center; font-size: 2.5rem; letter-spacing: 15px; background: transparent; border: none; border-bottom: 3px solid var(--morado-brillante); color: var(--texto-principal); padding: 10px 0; outline: none; }
.input-pin:focus { border-bottom-color: var(--rosa-acento); }

/* ===== Pago en EFECTIVO (rediseño con chips y cambio en vivo) ===== */
.efe-display {
  position: relative; overflow: hidden;
  border-radius: var(--radio-lg); padding: 16px 20px 18px; margin-bottom: 14px;
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(168,85,247,0.14), transparent 60%),
    var(--fondo-tarjeta-alt, rgba(255,255,255,0.04));
  border: 1px solid var(--borde-sutil);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.efe-display.ok { border-color: rgba(34,197,94,0.5); box-shadow: 0 0 0 1px rgba(34,197,94,0.25), 0 0 24px rgba(34,197,94,0.14); }
.efe-label { font-size: 0.72rem; color: var(--texto-secundario); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.efe-monto { display: flex; align-items: baseline; gap: 8px; margin-top: 6px; }
.efe-moneda { font-family: var(--fuente-titulo); font-size: 1.4rem; font-weight: 800; color: var(--texto-secundario); }
.efe-input {
  flex: 1; min-width: 0; width: 100%; background: transparent; border: none; outline: none;
  font-family: var(--fuente-titulo); font-size: clamp(2rem, 9vw, 2.8rem); font-weight: 800;
  color: var(--texto-principal); font-variant-numeric: tabular-nums; padding: 0;
}
.efe-input::placeholder { color: var(--texto-desactivado); }

.efe-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.efe-chip {
  flex: 1 1 auto; min-width: 58px; padding: 11px 10px; border-radius: var(--radio-md);
  background: rgba(168,85,247,0.08); border: 1px solid var(--borde-sutil); color: var(--texto-principal);
  font-weight: 800; font-size: 0.92rem; cursor: pointer; font-variant-numeric: tabular-nums;
  transition: background var(--trans-rapida), border-color var(--trans-rapida), transform var(--trans-rapida);
}
.efe-chip:hover { background: rgba(168,85,247,0.2); border-color: var(--borde-activo); transform: translateY(-2px); }
.efe-chip:active { transform: scale(0.94); }
.efe-chip.exacto { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.4); color: #86EFAC; }
.efe-chip.exacto:hover { background: rgba(34,197,94,0.22); }
.efe-chip.limpiar { background: transparent; color: var(--texto-secundario); }
.efe-chip.limpiar:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

.efe-cambio {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-radius: var(--radio-md);
  background: rgba(255,255,255,0.04); border: 1px solid var(--borde-sutil);
  transition: background 0.3s ease, border-color 0.3s ease;
}
.efe-cambio.listo { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.35); }
.efe-cambio.falta { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
.efe-cambio-label { font-size: 0.75rem; color: var(--texto-secundario); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.efe-cambio-valor { font-family: var(--fuente-titulo); font-size: 1.7rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--texto-principal); transition: color 0.3s ease; }
.efe-cambio.listo .efe-cambio-valor { color: var(--color-exito); }
.efe-cambio.falta .efe-cambio-valor { color: var(--color-error); }
@media (prefers-reduced-motion: reduce) {
  .efe-chip:hover, .efe-chip:active { transform: none; }
}

/* QR Fullscreen */
.qr-fullscreen { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
.qr-fullscreen-img { width: min(88vw, 380px); height: min(88vw, 380px); border-radius: 16px; border: 3px solid var(--rosa-acento); box-shadow: 0 0 40px rgba(236,72,153,0.3); }
.qr-fullscreen-hint { color: rgba(255,255,255,0.4); margin-top: 24px; font-size: 0.9rem; }

/* Modal Exito */
.exito-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.exito-card { background: var(--fondo-tarjeta); border: 1px solid rgba(34, 197, 94,0.4); border-radius: 24px; padding: 40px 30px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); max-width: 320px; text-align: center; animation: pop 0.3s ease; }
.exito-card h3 { font-size: 1.4rem; color: var(--color-exito); }
.exito-card p { font-size: 0.9rem; color: var(--texto-secundario); }
@keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

.ia-aprobado svg { width: 50px; height: 50px; }

/* Efectivo Gigante */
.input-efectivo-grande { text-align: center; margin-bottom: 20px; }
.input-efectivo-grande label { font-weight: 800; color: var(--texto-secundario); letter-spacing: 2px; font-size: 0.8rem; }
.input-monto-gigante { width: 100%; box-sizing: border-box; text-align: center; font-size: clamp(2.2rem, 11vw, 3.5rem); font-weight: 800; font-family: var(--fuente-titulo); background: transparent; border: none; border-bottom: 3px solid var(--morado-brillante); color: var(--texto-principal); padding: 10px 0; margin-top: 10px; outline: none; }
.input-monto-gigante:focus { border-bottom-color: var(--rosa-acento); }
.cambio-mostrar { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 20px; border-radius: 12px; text-align: center; }
.cambio-mostrar h2 { color: var(--color-exito); margin-top: 5px; font-size: 2.5rem; }
.cambio-negativo { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
.cambio-negativo h2 { color: var(--color-error); }

.mt-15 { margin-top: 15px; }

/* Buscador Cliente */
.buscador-cliente { position: relative; margin-bottom: 15px; }
.input-cliente { flex: 1; background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-principal); padding: 10px; border-radius: var(--radio-md); font-size: 0.9rem; }
.input-cliente:focus { border-color: var(--morado-brillante); outline: none; }
.btn-nuevo-cliente { background: var(--gradiente-marca); border: none; color: #fff; width: 40px; height: 40px; border-radius: var(--radio-md); font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--trans-rapida); }
.btn-nuevo-cliente:active { transform: scale(0.95); }
.resultados-cliente { position: absolute; top: 100%; left: 0; right: 0; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); border-radius: var(--radio-md); max-height: 200px; overflow-y: auto; z-index: 100; margin-top: 5px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
.item-cliente { padding: 10px; border-bottom: 1px solid var(--borde-sutil); cursor: pointer; display: flex; flex-direction: column; }
.item-cliente:hover { background: rgba(168,85,247,0.12); }
.item-cliente small { color: var(--texto-secundario); font-size: 0.75rem; }
.cliente-seleccionado { display: flex; justify-content: space-between; align-items: center; background: rgba(34, 197, 94,0.1); border: 1px solid rgba(34, 197, 94,0.3); padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 0.9rem; color: var(--color-exito); }
.btn-quitar-cliente { background: transparent; border: none; color: var(--color-error); cursor: pointer; font-size: 1.1rem; }

/* Modal Nuevo Cliente Centrado */
.modal-overlay-centrado {
  position: fixed;
  inset: 0;
  background: rgba(6, 3, 18, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  padding: 20px;
  animation: fadeOverlay 0.2s ease;
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
  background: var(--fondo-input);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  padding: 14px 16px;
  border-radius: var(--radio-md);
  font-size: 1rem;
  outline: none;
  transition: var(--trans-rapida);
}
.campo-nuevo-cliente:focus {
  border-color: var(--morado-brillante);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.15);
}
.input-grupo { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.input-grupo label {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--morado-hover);
}
.input-grupo label .opcional { color: var(--texto-desactivado); font-weight: 600; text-transform: none; letter-spacing: 0; }
/* Selector de tipo de cliente (común / VIP) */
.tipo-cliente-tabs { display: flex; gap: 8px; }
.tc-tab {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border-radius: var(--radio-md); cursor: pointer; font-weight: 700; font-size: 0.85rem;
  background: var(--fondo-input); border: 1px solid var(--borde-sutil); color: var(--texto-secundario);
  transition: border-color var(--trans-rapida), background var(--trans-rapida), color var(--trans-rapida);
}
.tc-tab:hover { border-color: var(--borde-activo); color: var(--texto-principal); }
.tc-tab.activo { background: rgba(168,85,247,0.16); border-color: var(--morado-brillante); color: var(--texto-principal); }
.tc-tab.tc-vip.activo { background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(236,72,153,0.15)); border-color: #FBBF24; color: #FCD34D; }
.mensaje-error {
  color: var(--color-error); background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radio-md);
  padding: 10px 14px; font-size: 0.85rem; font-weight: 600; text-align: center;
}
/* Loader del botón de confirmar cobro */
.loader {
  width: 20px; height: 20px; display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff; border-radius: var(--radio-full);
  animation: girarLoader 0.7s linear infinite;
}
@keyframes girarLoader { to { transform: rotate(360deg); } }
.modal-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid var(--borde-sutil);
  background: rgba(168,85,247,0.04);
}
.modal-cabecera h2 {
  font-family: var(--fuente-titulo);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--texto-principal);
  margin: 0;
}
.btn-cerrar-modal-cliente {
  background: rgba(168,85,247,0.1);
  border: none;
  color: var(--texto-secundario);
  width: 32px;
  height: 32px;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-cerrar-modal-cliente:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
  transform: rotate(90deg);
}
.modal-nuevo-pie {
  padding: 20px 25px;
  background: rgba(14,8,33,0.4);
  display: flex;
  gap: 12px;
  border-top: 1px solid var(--borde-sutil);
}
.modal-nuevo-pie .btn-cancelar {
  background: rgba(168,85,247,0.08);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  padding: 12px 20px;
  border-radius: var(--radio-md);
  font-weight: 600;
  cursor: pointer;
  transition: var(--trans-rapida);
  flex: 1;
}
.modal-nuevo-pie .btn-cancelar:hover {
  background: rgba(168,85,247,0.16);
}
.modal-nuevo-pie .btn-confirmar {
  background: var(--gradiente-marca);
  border: none;
  color: #fff;
  padding: 12px 20px;
  border-radius: var(--radio-md);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.3);
  transition: all 0.2s ease;
  flex: 1.5;
}
.modal-nuevo-pie .btn-confirmar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4);
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
  background: rgba(34, 197, 94,0.1);
  border: 1px solid rgba(34, 197, 94,0.3);
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
  border: 1px solid rgba(34, 197, 94, 0.3);
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
  font-family: var(--fuente-titulo);
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
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid rgba(34, 197, 94, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
}
.recibo-ia {
  width: 100%;
  background: rgba(168,85,247,0.05);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-lg);
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
  color: var(--texto-principal);
  font-weight: 700;
}
.recibo-val.destacado {
  color: var(--color-exito);
  font-size: 1.25rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.recibo-val.badge-metodo {
  background: rgba(168,85,247,0.14);
  padding: 4px 10px;
  border-radius: var(--radio-sm);
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
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.15);
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
  background: var(--gradiente-marca);
  border: none;
  border-radius: var(--radio-md);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(236, 72, 153,0.3);
  transition: all 0.2s ease;
}
.btn-exito-continuar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(236, 72, 153,0.4);
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
    background: rgba(168,85,247,0.1);
    border: 1px solid var(--borde-sutil);
    color: var(--texto-secundario);
    padding: 8px 14px;
    border-radius: var(--radio-md);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: var(--trans-rapida);
  }
  .btn-volver-productos:active {
    background: rgba(168,85,247,0.18);
  }

  .btn-flotante-carrito-movil {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: var(--gradiente-marca);
    padding: 16px 24px;
    border-radius: var(--radio-lg);
    box-shadow: 0 10px 25px rgba(236, 72, 153, 0.45);
    color: #fff;
    font-weight: 700;
    z-index: 999;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .btn-flotante-carrito-movil strong { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .btn-flotante-carrito-movil:active {
    transform: scale(0.96);
    box-shadow: 0 6px 18px rgba(236, 72, 153, 0.4);
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
    gap: 10px;
  }
  /* Cada zona conserva su ancho natural (flex-shrink:0) y se reduce el tamaño:
     así el badge nunca se desborda sobre la campana. */
  .logo-area { flex-shrink: 0; gap: 6px; overflow: hidden; }
  .logo-mini { height: 24px; margin-right: 4px; flex-shrink: 0; }
  .badge-rol { padding: 4px 9px; font-size: 0.6rem; white-space: nowrap; flex-shrink: 0; }
  .usuario-area {
    gap: 8px;
    font-size: 0.8rem;
    flex-shrink: 0;
  }
  /* En pantallas angostas ocultamos el saludo y dejamos solo el botón Salir */
  .usuario-area > span { display: none; }
  .btn-campana {
    width: 40px;
    height: 40px;
    margin: 0;
    flex-shrink: 0;
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
  background: rgba(168,85,247,0.1);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  width: 44px;
  height: 44px;
  border-radius: var(--radio-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--trans-normal);
  margin: 0 15px;
}
.btn-campana:hover {
  background: rgba(168,85,247,0.2);
  border-color: var(--borde-activo);
  transform: scale(1.05);
}
.btn-campana:active { transform: scale(0.95); }
.btn-campana:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.btn-campana.activo {
  background: rgba(34, 197, 94, 0.15);
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
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
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
  margin-bottom: 18px;
  background: var(--gradiente-sutil);
  padding: 14px 18px;
  border-radius: var(--radio-lg);
  border: 1px solid var(--borde-sutil);
}
.vpl-titulo {
  display: flex;
  align-items: center;
  gap: 15px;
}
.vpl-titulo h2 {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 1.5rem;
  color: var(--texto-principal);
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
  position: relative;
  background: var(--fondo-tarjeta);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: var(--radio-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow: hidden;
  transition: transform var(--trans-normal), box-shadow var(--trans-normal), border-color var(--trans-normal);
}
.card-listo-full::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-exito), rgba(34, 197, 94, 0.2));
}
.card-listo-full:hover {
  transform: translateY(-3px);
  border-color: var(--color-exito);
  box-shadow: 0 12px 30px rgba(14, 8, 33, 0.5), 0 0 22px rgba(34, 197, 94, 0.18);
}

.clf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.clf-orden {
  font-family: var(--fuente-titulo);
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
  font-variant-numeric: tabular-nums;
}
.clf-destino {
  background: var(--gradiente-marca);
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 4px 12px;
  border-radius: var(--radio-full);
}
.clf-destino.vip { background: var(--morado-medio); }

.clf-cliente {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: var(--texto-secundario);
  background: rgba(14,8,33,0.4);
  padding: 8px 12px;
  border-radius: var(--radio-md);
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
  color: #0E0821;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: var(--radio-sm);
  font-size: 0.85rem;
  min-width: 32px;
  text-align: center;
}
.clf-nom {
  color: var(--texto-principal);
  font-size: 1rem;
}

.clf-espera { display: flex; align-items: center; gap: 7px; margin: 4px 0 8px; padding: 8px 10px; border-radius: var(--radio-md); font-size: 0.78rem; font-weight: 600; color: #FBBF24; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); }
.clf-espera svg { flex-shrink: 0; }
/* Cronómetro en vivo del pedido listo (Fase L): 2min amarillo, 6min rojo, 10min crítico */
.clf-crono { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; font-weight: 800; font-size: 0.82rem; padding: 3px 10px; border-radius: 999px; color: var(--texto-secundario); background: rgba(168,85,247,0.12); border: 1px solid var(--borde-sutil); }
.clf-crono.crono-amarillo { color: #FCD34D; background: rgba(245,158,11,0.16); border-color: rgba(245,158,11,0.4); }
.clf-crono.crono-rojo { color: #FCA5A5; background: rgba(239,68,68,0.16); border-color: rgba(239,68,68,0.45); }
.clf-crono.crono-critico { color: #fff; background: rgba(239,68,68,0.85); border-color: #ef4444; animation: cronoPulso 1s ease-in-out infinite; }
@keyframes cronoPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 5px rgba(239,68,68,0); } }
.clf-subhead { margin-bottom: 8px; }
/* Apartados del mesero: en barra / recogidos (R8) */
.apartado-listos { margin-bottom: 24px; }
.apartado-tit { display: flex; align-items: center; gap: 8px; font-family: var(--fuente-titulo); font-size: 1rem; font-weight: 800; margin-bottom: 12px; }
.apartado-tit.barra { color: #FCD34D; }
.apartado-tit.barra svg { color: #FBBF24; }
.apartado-tit.recog { color: #86EFAC; }
.apartado-tit.recog svg { color: #4ADE80; }
.apartado-n { background: rgba(168,85,247,0.2); color: var(--morado-hover); font-size: 0.72rem; font-weight: 800; border-radius: 999px; padding: 1px 9px; }
.card-listo-full.recogido { border-color: rgba(34,197,94,0.4); }
.btn-recogido { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: var(--radio-md); border: 1px solid rgba(251,191,36,0.5); background: rgba(251,191,36,0.14); color: #FCD34D; font-weight: 700; font-size: 0.92rem; cursor: pointer; transition: background 0.15s ease; }
.btn-recogido:hover { background: rgba(251,191,36,0.25); color: #fff; }
.btn-liberar { width: 100%; padding: 10px; border-radius: var(--radio-md); cursor: pointer; font-weight: 700; font-size: 0.9rem; background: rgba(251,191,36,0.14); color: #FCD34D; border: 1px solid rgba(251,191,36,0.4); transition: background var(--trans-normal); }
.btn-liberar:hover { background: rgba(251,191,36,0.24); }
/* Pool de pedidos libres */
.pool-libres { margin-bottom: 22px; }
.pool-titulo { display: flex; align-items: center; gap: 8px; font-family: var(--fuente-titulo); font-size: 1rem; font-weight: 800; color: #FCD34D; margin-bottom: 12px; }
.pool-titulo svg { color: #FBBF24; }
.card-pool { border-color: rgba(251,191,36,0.35) !important; background: rgba(251,191,36,0.05); }
.btn-tomar { margin-top: auto; width: 100%; padding: 12px; border-radius: var(--radio-md); cursor: pointer; font-weight: 800; font-size: 1rem; color: #1a1206; background: linear-gradient(135deg, #FBBF24, #F59E0B); border: none; transition: transform var(--trans-rapida); }
.btn-tomar:hover { transform: translateY(-1px); }
.btn-tomar:active { transform: scale(0.98); }
.clf-acciones { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
.btn-donde-llevar {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 10px; border-radius: var(--radio-md); cursor: pointer;
  font-weight: 700; font-size: 0.9rem;
  background: rgba(168,85,247,0.12); color: var(--morado-hover); border: 1px solid var(--borde-sutil);
  transition: background var(--trans-normal), border-color var(--trans-normal);
}
.btn-donde-llevar:hover { background: rgba(168,85,247,0.22); border-color: var(--borde-activo); }
.btn-entregar-full {
  width: 100%;
  padding: 12px;
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-exito);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: var(--radio-md);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: var(--trans-normal);
}
.btn-entregar-full:hover:not(:disabled) {
  background: var(--color-exito);
  color: #0E0821;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(34,197,94,0.3);
}
.btn-entregar-full:active:not(:disabled) { transform: translateY(0) scale(0.99); }
.btn-entregar-full:disabled { opacity: 0.6; cursor: not-allowed; }

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
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-left: 4px solid var(--color-exito);
  color: var(--texto-principal);
  padding: 12px 20px;
  border-radius: var(--radio-md);
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

/* Accesibilidad: respetar preferencia de movimiento reducido */
@media (prefers-reduced-motion: reduce) {
  .tarjeta-producto-pos,
  .tarjeta-producto-pos:hover,
  .card-listo-full,
  .card-listo-full:hover,
  .btn-cobrar:not(:disabled):hover,
  .btn-entregar-full:hover:not(:disabled),
  .btn-campana:hover {
    transform: none;
  }
  .tarjeta-producto-pos:hover .img-producto { transform: none; }
}

/* ===== Modal mapa de mesas ===== */
.mapa-overlay {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(6, 3, 18, 0.72);
}
/* Chip del evento activo en el header */
.chip-evento {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: var(--radio-full);
  background: rgba(168,85,247,0.14); border: 1px solid var(--borde-activo, rgba(168,85,247,0.5));
  color: var(--texto-principal); font-weight: 700; font-size: 0.82rem; cursor: pointer;
  max-width: 220px; transition: background 0.2s ease, border-color 0.2s ease;
}
.chip-evento:hover { background: rgba(168,85,247,0.24); }
.chip-evento svg { color: var(--morado-hover); flex-shrink: 0; }
.chip-evento-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Modal de selección de evento */
.ev-sheet {
  width: 100%; max-width: 440px; background: var(--fondo-tarjeta, #17092F);
  border: 1px solid var(--glass-borde, rgba(168,85,247,0.3)); border-radius: var(--radio-xl);
  box-shadow: 0 30px 70px rgba(0,0,0,0.6); overflow: hidden;
}
.ev-head { padding: 20px 22px 6px; }
.ev-head h3 { font-family: var(--fuente-titulo); font-size: 1.25rem; font-weight: 800; color: var(--texto-principal); margin: 0; }
.ev-lista { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px 20px; }
.ev-item {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  padding: 14px 16px; border-radius: var(--radio-lg);
  background: var(--gradiente-sutil, rgba(255,255,255,0.03)); border: 1px solid var(--borde-sutil);
  color: var(--texto-principal); font-weight: 700; font-size: 0.95rem; cursor: pointer;
  transition: border-color 0.2s ease, transform 0.15s ease;
}
.ev-item:hover { border-color: var(--borde-activo); transform: translateY(-1px); }
.ev-item.activo { border-color: var(--morado-brillante); background: rgba(168,85,247,0.12); }
.ev-item-ic { color: var(--morado-hover); display: flex; }
.ev-item-txt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.ev-item-check { color: var(--color-exito); flex-shrink: 0; }
.ev-vacio { text-align: center; color: var(--texto-secundario); font-size: 0.86rem; padding: 20px 0; }
.mapa-sheet {
  width: 100%; max-width: 620px; max-height: 90dvh; display: flex; flex-direction: column;
  background: var(--fondo-tarjeta, #17092F); border: 1px solid var(--glass-borde, rgba(168,85,247,0.3));
  border-radius: var(--radio-xl); box-shadow: 0 30px 70px rgba(0,0,0,0.6); overflow: hidden;
}
.mapa-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--borde-sutil); }
.mapa-header h3 { font-family: var(--fuente-titulo); font-size: 1.1rem; font-weight: 800; color: var(--texto-principal); margin: 0; }
.mapa-sub { font-size: 0.78rem; color: var(--texto-secundario); margin: 3px 0 0; }
.mapa-cerrar { flex-shrink: 0; background: rgba(255,255,255,0.06); border: none; color: var(--texto-secundario); width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.mapa-cerrar:hover { background: rgba(255,255,255,0.12); color: var(--texto-principal); }
.mapa-body { padding: 18px 20px calc(20px + env(safe-area-inset-bottom)); overflow-y: auto; }
.mapa-cargando { display: flex; justify-content: center; padding: 3rem; }
.mapa-vacio { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 2.5rem 1rem; color: var(--texto-secundario); text-align: center; }
.mapa-vacio svg { color: var(--morado-brillante); opacity: 0.6; }
.mapa-zona + .mapa-zona { margin-top: 22px; }
.mapa-zona-nombre { font-size: 0.85rem; font-weight: 700; color: var(--texto-principal); margin: 0 0 8px; }
.mapa-zona-nombre em { font-style: normal; color: var(--texto-desactivado); font-weight: 500; }
.mapa-lienzo {
  position: relative; width: 100%; border-radius: var(--radio-lg);
  background:
    linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 100% 9%,
    linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px) 0 0 / 9% 100%,
    var(--fondo-app, #0b0618);
  border: 1px solid var(--borde-sutil); overflow: hidden;
}
.mapa-el {
  position: absolute; display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; font-weight: 800; color: #fff; box-sizing: border-box; user-select: none;
}
.mapa-el-txt { padding: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.6); pointer-events: none; }
/* Todas las mesas se ven igual: el mesero solo elige y llena el campo */
.mapa-el.elegible { background: rgba(168,85,247,0.2); border: 2px solid rgba(168,85,247,0.6); color: #E9D5FF; cursor: pointer; transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; }
.mapa-el.elegible:hover { background: rgba(168,85,247,0.38); transform: scale(1.06); box-shadow: 0 0 16px rgba(168,85,247,0.5); }
.mapa-el.deco { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--texto-desactivado); }
/* Modo destino: la mesa objetivo en verde pulsante, el resto atenuado */
.mapa-el.destino { background: rgba(34,197,94,0.35); border: 2px solid #22C55E; color: #fff; box-shadow: 0 0 0 0 rgba(34,197,94,0.6); animation: pulso-destino 1.6s ease-out infinite; z-index: 2; }
@keyframes pulso-destino { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); } 70% { box-shadow: 0 0 0 14px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
.mapa-el.atenuado { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--texto-desactivado); opacity: 0.5; }
@media (prefers-reduced-motion: reduce) { .mapa-el.destino { animation: none; } }
@media (max-width: 480px) {
  .mapa-body { padding: 14px 16px; }
}

/* Pantallas muy angostas: el badge de rol es decorativo, se oculta para que
   logo + campana + Salir siempre quepan sin desbordar ni sobreponerse. */
@media (max-width: 360px) {
  .badge-rol { display: none; }
}
</style>
