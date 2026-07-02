<template>
  <div class="vista-reportes fade-in">
    <div class="vista-cabecera">
      <div class="vista-cabecera-info">
        <h2 class="vista-titulo">Reportes</h2>
        <p class="vista-subtitulo">Panorama en vivo de ventas, personal, inventario y billetera digital</p>
      </div>
      <div class="cabecera-acciones">
        <span class="badge-tiempo-real">
          <span class="punto-verde animate-pulse">●</span> Actualizado en vivo
        </span>
        <button class="btn-sincronizar brillo-hover" @click="exportarPDF">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Exportar PDF
        </button>
      </div>
    </div>

    <!-- FILTRO DE PERIODO GLOBAL (afecta a todo el reporte) -->
    <div class="barra-filtro-periodo">
      <span class="filtro-periodo-titulo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        Periodo
      </span>
      <div class="filtro-presets">
        <button class="btn-preset" :class="{ activo: presetActivo === 'hoy' }" @click="presetFecha('hoy')">Hoy</button>
        <button class="btn-preset" :class="{ activo: presetActivo === 'semana' }" @click="presetFecha('semana')">7 días</button>
        <button class="btn-preset" :class="{ activo: presetActivo === 'mes' }" @click="presetFecha('mes')">Este mes</button>
        <button class="btn-preset" :class="{ activo: presetActivo === 'todo' }" @click="presetFecha('todo')">Todo</button>
      </div>
      <div class="filtro-rango-personalizado">
        <label class="etiqueta-filtro">Desde</label>
        <input type="date" class="input-filtro" v-model="filtroDesde" @change="cambioFechaManual" />
        <label class="etiqueta-filtro">Hasta</label>
        <input type="date" class="input-filtro" v-model="filtroHasta" @change="cambioFechaManual" />
      </div>
    </div>

    <!-- 1. SECCIÓN DE GRÁFICOS PREMIUM (AHORA PRIMERO) -->
    <div class="grid-graficos fade-in">
      <!-- 1. Tendencia de Ventas (Gráfico 2D vectorizado en neon) -->
      <div class="tarjeta-grafico">
        <div class="grafico-header">
          <div class="grafico-header-info">
            <h3 class="grafico-titulo">Tendencia de Ventas 2D</h3>
            <span class="subtexto-grafico">Curva de ingresos cronológica de las últimas comandas cobradas</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        </div>
        <div class="grafico-contenido-2d">
          <svg viewBox="0 0 360 160" class="svg-tendencia-2d">
            <defs>
              <linearGradient id="grad-neon-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--morado-brillante)" stop-opacity="0.3" />
                <stop offset="100%" stop-color="var(--morado-brillante)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <!-- Cuadrícula premium de fondo -->
            <line x1="20" y1="20" x2="340" y2="20" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="20" y1="65" x2="340" y2="65" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="20" y1="110" x2="340" y2="110" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="20" y1="130" x2="340" y2="130" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
            
            <!-- Ejes y Etiquetas del Gráfico 2D -->
            <text x="12" y="15" fill="rgba(255,255,255,0.3)" font-size="9" font-weight="700">Bs. (Ingresos)</text>
            <text x="310" y="142" fill="rgba(255,255,255,0.3)" font-size="9" font-weight="700">Comandas →</text>
            
            <!-- Área de relleno de degradado -->
            <path v-if="salesTrendFillPoints" :d="salesTrendFillPoints" fill="url(#grad-neon-fill)" />
            
            <!-- Línea de trazado vector principal -->
            <path v-if="salesTrendPoints" :d="salesTrendPoints" fill="none" stroke="var(--morado-brillante)" stroke-width="3" stroke-linecap="round" class="linea-tendencia-neon" />
            
            <!-- Puntos vectoriales con sus etiquetas de datos exactas en Bs. -->
            <g v-for="(pt, idx) in trendComandas" :key="idx">
              <!-- Círculo del nodo de venta -->
              <circle :cx="pt.x" :cy="pt.y" r="5" fill="#fff" stroke="var(--morado-brillante)" stroke-width="2.5" />
              <!-- Etiqueta de valor flotando sobre el nodo -->
              <text :x="pt.x" :y="pt.y - 12" fill="#fff" font-size="10.5" font-weight="800" text-anchor="middle" class="texto-nodo-grafico">
                Bs. {{ pt.subtotal.toFixed(0) }}
              </text>
            </g>
          </svg>
          <div v-if="trendComandas.length === 0" class="texto-sutil texto-centro" style="padding: 30px 0;">
            Aún no hay comandas para graficar la tendencia de ventas.
          </div>
        </div>
      </div>

      <!-- 2. Ventas por Categoría -->
      <div class="tarjeta-grafico">
        <div class="grafico-header">
          <div class="grafico-header-info">
            <h3 class="grafico-titulo">Ventas por Categoría</h3>
            <span class="subtexto-grafico">Ingresos divididos por categorías de producto en barra y mesas</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        </div>
        <div class="grafico-contenido">
          <div v-for="cat in datosCategorias" :key="cat.nombre" class="fila-barra">
            <div class="barra-etiqueta">
              <span class="categoria-nombre">{{ cat.nombre }}</span>
              <span class="categoria-monto">Bs. {{ cat.total.toFixed(2) }}</span>
            </div>
            <div class="barra-pista">
              <div class="barra-progreso" :style="{ width: cat.porcentaje + '%', background: cat.color }"></div>
            </div>
          </div>
          <div v-if="datosCategorias.length === 0" class="texto-sutil texto-centro" style="padding: 20px 0;">
            Aún no se han registrado comandas para categorizar ventas.
          </div>
        </div>
      </div>

      <!-- 3. Torta de Métodos de Pago -->
      <div class="tarjeta-grafico">
        <div class="grafico-header">
          <div class="grafico-header-info">
            <h3 class="grafico-titulo">Métodos de Cobro</h3>
            <span class="subtexto-grafico">Participación porcentual de ingresos</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>
        </div>
        <div class="grafico-contenido-anillos">
          <div class="anillos-visual">
            <svg viewBox="0 0 200 200" class="svg-torta">
              <!-- Sector 1: Efectivo -->
              <circle cx="100" cy="100" r="50" fill="transparent"
                      stroke="var(--color-exito)" stroke-width="100"
                      :stroke-dasharray="(porcentajeEfectivo * 3.14159) + ' 314.159'"
                      stroke-dashoffset="0"
                      class="torta-sector" />
              <!-- Sector 2: Transferencia QR -->
              <circle cx="100" cy="100" r="50" fill="transparent"
                      stroke="var(--color-info)" stroke-width="100"
                      :stroke-dasharray="(porcentajeQR * 3.14159) + ' 314.159'"
                      :stroke-dashoffset="-(porcentajeEfectivo * 3.14159)"
                      class="torta-sector" />
              <!-- Sector 3: Billetera -->
              <circle cx="100" cy="100" r="50" fill="transparent"
                      stroke="var(--morado-brillante)" stroke-width="100"
                      :stroke-dasharray="(porcentajeBilletera * 3.14159) + ' 314.159'"
                      :stroke-dashoffset="-((porcentajeEfectivo + porcentajeQR) * 3.14159)"
                      class="torta-sector" />

              <!-- Etiquetas textuales sobre la torta -->
              <g v-if="porcentajeEfectivo > 15">
                <text x="100" y="60" fill="#fff" font-size="14" font-weight="900" text-anchor="middle" class="texto-nodo-grafico">
                  {{ porcentajeEfectivo }}% Efectivo
                </text>
              </g>
              <g v-if="porcentajeQR > 15">
                <text x="150" y="125" fill="#fff" font-size="14" font-weight="900" text-anchor="middle" class="texto-nodo-grafico">
                  {{ porcentajeQR }}% QR
                </text>
              </g>
              <g v-if="porcentajeBilletera > 15">
                <text x="50" y="125" fill="#fff" font-size="14" font-weight="900" text-anchor="middle" class="texto-nodo-grafico">
                  {{ porcentajeBilletera }}% Billetera
                </text>
              </g>
            </svg>
          </div>
          <div class="anillos-leyenda">
            <div class="leyenda-item">
              <span class="punto-leyenda" style="background:var(--color-exito);"></span>
              <div class="leyenda-info">
                <span class="l-nombre">Efectivo</span>
                <span class="l-valores">{{ porcentajeEfectivo }}% ({{ conteoEfectivo }})</span>
              </div>
            </div>
            <div class="leyenda-item">
              <span class="punto-leyenda" style="background:var(--color-info);"></span>
              <div class="leyenda-info">
                <span class="l-nombre">Transf. QR</span>
                <span class="l-valores">{{ porcentajeQR }}% ({{ conteoQR }})</span>
              </div>
            </div>
            <div class="leyenda-item">
              <span class="punto-leyenda" style="background:var(--morado-brillante);"></span>
              <div class="leyenda-info">
                <span class="l-nombre">Billetera</span>
                <span class="l-valores">{{ porcentajeBilletera }}% ({{ conteoBilletera }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Desempeño del Personal (Ventas por Mesero - Gráfico 2D SVG) -->
      <div class="tarjeta-grafico">
        <div class="grafico-header">
          <div class="grafico-header-info">
            <h3 class="grafico-titulo">Desempeño del Personal</h3>
            <span class="subtexto-grafico">Ingresos totales cobrados por mesero (Datos Reales)</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <div class="grafico-contenido-columnas">
          <svg viewBox="0 0 360 200" class="svg-columnas-2d" v-if="datosMeseros.length > 0">
            <!-- Cuadrícula premium de fondo -->
            <line x1="30" y1="40" x2="330" y2="40" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="30" y1="80" x2="330" y2="80" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="30" y1="120" x2="330" y2="120" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="30" y1="160" x2="330" y2="160" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
            
            <!-- Barras / Rectángulos de Columnas -->
            <g v-for="(m, idx) in datosMeseros" :key="m.nombre">
              <!-- Gradiente lineal único para la columna -->
              <defs>
                <linearGradient :id="'grad-col-' + idx" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" :stop-color="m.color" />
                  <stop offset="100%" stop-color="var(--morado-brillante)" />
                </linearGradient>
              </defs>
              
              <!-- Columna Rect con animación de altura y brillo en hover -->
              <rect :x="45 + idx * (250 / Math.max(datosMeseros.length, 1))"
                    :y="160 - (m.total / Math.max(...datosMeseros.map(x => x.total), 1)) * 110"
                    :width="Math.max(120 / Math.max(datosMeseros.length, 1), 22)"
                    :height="(m.total / Math.max(...datosMeseros.map(x => x.total), 1)) * 110"
                    rx="4"
                    :fill="'url(#grad-col-' + idx + ')'"
                    style="transition: all 0.3s ease; cursor: pointer;"
                    class="columna-rect-2d" />
                    
              <!-- Monto del mesero en el tope -->
              <text :x="45 + idx * (250 / Math.max(datosMeseros.length, 1)) + Math.max(120 / Math.max(datosMeseros.length, 1), 22) / 2"
                    :y="148 - (m.total / Math.max(...datosMeseros.map(x => x.total), 1)) * 110"
                    fill="#fff" font-size="10.5" font-weight="800" text-anchor="middle" class="texto-nodo-grafico">
                Bs. {{ m.total.toFixed(0) }}
              </text>
              
              <!-- Nombre abreviado en el eje X -->
              <text :x="45 + idx * (250 / Math.max(datosMeseros.length, 1)) + Math.max(120 / Math.max(datosMeseros.length, 1), 22) / 2"
                    y="178"
                    fill="rgba(255,255,255,0.4)" font-size="10" font-weight="700" text-anchor="middle" class="texto-nodo-grafico">
                {{ m.nombre.split(' ')[0] }}
              </text>
            </g>
          </svg>
          <div v-else class="texto-sutil texto-centro" style="padding: 40px 0; width: 100%;">
            Aún no hay comandas registradas para evaluar el desempeño de meseros.
          </div>
        </div>
      </div>
    </div>

    <!-- 2. TARJETAS DE RESUMEN (AHORA SEGUNDO) -->
    <div class="grid-resumen fade-in escalonar">
      <div class="tarjeta-estadistica bg-clientes" @click="abrirModal('clientes')">
        <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
        <div class="info-est">
          <h3>Clientes</h3>
          <h2>{{ stats.clientes }}</h2>
          <p>Ver detalles</p>
        </div>
      </div>
      
      <div class="tarjeta-estadistica bg-personal" @click="abrirModal('personal')">
        <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
        <div class="info-est">
          <h3>Personal</h3>
          <h2>{{ stats.personal }}</h2>
          <p>Ver detalles</p>
        </div>
      </div>

      <div class="tarjeta-estadistica bg-ventas" @click="abrirModal('ventas')">
        <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
        <div class="info-est">
          <h3>Ventas Totales</h3>
          <h2>Bs. {{ stats.ingresosTotales.toFixed(2) }}</h2>
          <p>Ver transacciones detalladas</p>
        </div>
      </div>

      <div class="tarjeta-estadistica bg-productos" @click="abrirModal('productos')">
        <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
        <div class="info-est">
          <h3>Inventario</h3>
          <h2>{{ stats.productos }}</h2>
          <p>Ver ranking de ventas</p>
        </div>
      </div>

      <div class="tarjeta-estadistica bg-eventos" @click="abrirModal('eventos')">
        <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
        <div class="info-est">
          <h3>Eventos</h3>
          <h2>{{ stats.eventos }}</h2>
          <p>Ver desglose por evento</p>
        </div>
      </div>
      
      <div class="tarjeta-estadistica bg-asistencia">
        <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
        <div class="info-est">
          <h3>Asistencia Total</h3>
          <h2>{{ stats.asistencia }}</h2>
          <p>Personas que ingresaron</p>
        </div>
      </div>
    </div>

    <!-- 3. Alerta de Inventario Crítico / Stock Bajo (AHORA TERCERO Y SUPER LIMPIO) -->
    <div v-if="productosBajoStock.length > 0" class="alerta-stock-bajo fade-in">
      <div class="alerta-icono">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <div class="alerta-contenido">
        <h4>Inventario crítico</h4>
        <p class="alerta-subtexto">Productos por debajo del umbral de reposición ({{ UMBRAL_STOCK_BAJO }} uds.)</p>
        <div class="alerta-productos-lista">
          <span v-for="prod in productosBajoStock" :key="prod.id_producto" class="alerta-producto-badge">
            <span class="punto-alerta"></span>
            <strong>{{ prod.nombre_producto }}</strong>: {{ prod.stock_actual }} unidades
          </span>
        </div>
      </div>
    </div>

    <!-- MODALES DE DETALLE (PANTALLA COMPLETA) -->
    <Teleport to="body">
      <!-- Modal Usuarios (Clientes / Personal) -->
      <div v-if="modalActivo === 'clientes' || modalActivo === 'personal'" class="modal-fullscreen fade-in">
        <div class="modal-fs-header">
          <h2>{{ modalActivo === 'clientes' ? 'Registro Detallado de Clientes' : 'Registro del Personal' }}</h2>
          <button class="btn-cerrar-fs" @click="modalActivo = null"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cerrar</button>
        </div>
        <div class="modal-fs-body">
          <div class="tabla-contenedor">
            <table class="tabla-admin">
              <thead>
                <tr>
                  <th>CI / Carnet</th>
                  <th>Nombre Completo</th>
                  <th>Correo Electrónico</th>
                  <th>Teléfono</th>
                  <th>Estado Cuenta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in (modalActivo === 'clientes' ? listadoClientes : listadoPersonal)" :key="user.id_usuario">
                  <td>{{ user.ci_carnet || '-' }}</td>
                  <td style="font-weight:600;">{{ user.nombres }} {{ user.apellidos }}</td>
                  <td>{{ user.correo }}</td>
                  <td>{{ user.telefono || '-' }}</td>
                  <td>
                    <span :class="['badge-pago', user.estado_cuenta === 'activo' ? 'activo' : 'finalizado']">
                      {{ user.estado_cuenta }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Eventos -->
      <div v-if="modalActivo === 'eventos'" class="modal-fullscreen fade-in">
        <div class="modal-fs-header">
          <h2>Reporte Detallado de Eventos</h2>
          <button class="btn-cerrar-fs" @click="modalActivo = null"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cerrar</button>
        </div>
        <div class="modal-fs-body">
          <div class="tabla-contenedor">
            <table class="tabla-admin">
              <thead>
                <tr>
                  <th>Nombre del Evento</th>
                  <th>Fecha Inicio</th>
                  <th>Estado</th>
                  <th>Asistencia</th>
                  <th>Ventas Estimadas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ev in listadoEventos" :key="ev.id_evento">
                  <td style="font-weight:600; color:var(--morado-brillante);">{{ ev.nombre_evento }}</td>
                  <td>{{ formatearFecha(ev.fecha_hora_inicio) }}</td>
                  <td><span :class="['badge-pago', ev.estado]">{{ ev.estado }}</span></td>
                  <td style="font-weight: 600;">{{ ev.asistenciaReal || 0 }} pers.</td>
                  <td style="font-weight:bold; color:var(--color-exito);">Bs. {{ (ev.ventasReales || 0).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Productos / Ranking de Inventario más vendido -->
      <div v-if="modalActivo === 'productos'" class="modal-fullscreen fade-in">
        <div class="modal-fs-header">
          <h2>Ranking de Inventario (Más a Menos Vendidos)</h2>
          <button class="btn-cerrar-fs" @click="modalActivo = null"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cerrar</button>
        </div>
        <div class="modal-fs-body">
          <div class="tabla-contenedor">
            <table class="tabla-admin">
              <thead>
                <tr>
                  <th style="width: 80px; text-align: center;">Rank</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Veces Vendido</th>
                  <th>Ingresos Generados (Bs)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(prod, idx) in listadoProductosRanking" :key="prod.id_producto">
                  <td style="font-weight: 800; font-size: 1.1rem; text-align: center;">
                    <span v-if="idx === 0" style="color: var(--color-alerta); display: inline-flex; align-items: center; gap: 4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="8" r="6"></circle><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"></path></svg>1</span>
                    <span v-else-if="idx === 1" style="color: var(--texto-secundario); display: inline-flex; align-items: center; gap: 4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="8" r="6"></circle><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"></path></svg>2</span>
                    <span v-else-if="idx === 2" style="color: var(--color-alerta); display: inline-flex; align-items: center; gap: 4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="8" r="6"></circle><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"></path></svg>3</span>
                    <span v-else style="color: rgba(255,255,255,0.4);">#{{ idx + 1 }}</span>
                  </td>
                  <td style="font-weight: 700; color: var(--texto-principal);">{{ prod.nombre_producto }}</td>
                  <td><span class="badge-pago planificado">{{ prod.nombre_categoria }}</span></td>
                  <td>
                    <span :class="['stock-indicador', prod.stock_actual < UMBRAL_STOCK_BAJO ? 'bajo' : 'normal']">
                      {{ prod.stock_actual }} uds.
                    </span>
                  </td>
                  <td style="font-weight: 700; color: var(--morado-brillante);">{{ prod.vecesVendido }} uds.</td>
                  <td style="font-weight: bold; color: var(--color-exito);">Bs. {{ (prod.ingresosGenerados || 0).toFixed(2) }}</td>
                </tr>
                <tr v-if="listadoProductosRanking.length === 0">
                  <td colspan="6" class="texto-centro">No hay datos de productos registrados en el inventario.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Ventas Detalladas -->
      <div v-if="modalActivo === 'ventas'" class="modal-fullscreen fade-in">
        <div class="modal-fs-header">
          <h2>Detalle General de Ventas (Comandas)</h2>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
            <label class="etiqueta-filtro">Desde</label>
            <input type="date" class="input-filtro" v-model="filtroDesde" @change="cambioFechaManual" />
            <label class="etiqueta-filtro">Hasta</label>
            <input type="date" class="input-filtro" v-model="filtroHasta" @change="cambioFechaManual" />
            <button v-if="filtroDesde || filtroHasta" class="btn-limpiar-filtro" @click="limpiarFiltroFechas">Limpiar</button>
            <button class="btn-cerrar-fs" @click="modalActivo = null">Cerrar</button>
          </div>
        </div>
        <div class="modal-fs-body">
          <div class="tabla-contenedor">
            <table class="tabla-admin">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha y Hora</th>
                  <th>Cliente</th>
                  <th>Atendido Por</th>
                  <th>Método Pago</th>
                  <th>Total (Bs)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="venta in ventas" :key="venta.id_comanda">
                  <td>#{{ venta.id_comanda }}</td>
                  <td>{{ formatearFecha(venta.fecha_registro) }}</td>
                  <td>
                    <span v-if="venta.usuario_comanda_id_clienteTousuario">
                      {{ venta.usuario_comanda_id_clienteTousuario.nombres }}
                    </span>
                    <span v-else class="texto-sutil">Sin registro / Barra</span>
                  </td>
                  <td>{{ venta.usuario_comanda_id_meseroTousuario.nombres }}</td>
                  <td>
                    <span :class="['badge-pago', venta.metodo_pago.toLowerCase().replace(' ', '-')]">
                      {{ venta.metodo_pago }}
                    </span>
                  </td>
                  <td style="font-weight: bold; color:var(--color-exito);">Bs. {{ (venta.subtotal || 0).toFixed(2) }}</td>
                </tr>
                <tr v-if="ventas.length === 0">
                  <td colspan="6" class="texto-centro">No hay ventas registradas en esta fecha.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Paginacion
            :total="ventasTotal" :pagina="ventasPagina" :limite="ventasLimite"
            @update:pagina="irPaginaVentas"
            @update:limite="l => { ventasLimite = l; cambiarLimiteVentas() }"
          />
        </div>
      </div>
    </Teleport>

    <!-- ====================================================
         SECCIÓN: REPORTE DE BILLETERA DIGITAL
    ==================================================== -->
    <div class="seccion-billetera fade-in">
      <div class="sb-cabecera">
        <div class="sb-titulo-area">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--morado-brillante)" stroke-width="2" width="28" height="28"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <h3>Billetera Digital — Análisis de Uso</h3>
        </div>
        <button class="btn-ver-historial" @click="mostrarHistorialRecargas = !mostrarHistorialRecargas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          {{ mostrarHistorialRecargas ? 'Ocultar historial' : 'Ver historial de recargas' }}
        </button>
      </div>

      <!-- KPIs de Billetera (mismas tarjetas que el diseño de la imagen) -->
      <div class="grid-kpi-billetera escalonar">
        <div class="kbi-card kbi-morado">
          <div class="kbi-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          </div>
          <div class="kbi-info">
            <span class="kbi-label">Billeteras Registradas</span>
            <span class="kbi-valor">{{ reporteBilletera.billeteras?.total ?? 0 }}</span>
          </div>
        </div>

        <div class="kbi-card kbi-verde">
          <div class="kbi-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><polyline points="20 12 20 22 4 22"></polyline><rect x="4" y="2" width="12" height="20"></rect><line x1="4" y1="10" x2="16" y2="10"></line></svg>
          </div>
          <div class="kbi-info">
            <span class="kbi-label">Billeteras con Saldo</span>
            <span class="kbi-valor">{{ reporteBilletera.billeteras?.activas ?? 0 }}</span>
          </div>
        </div>

        <div class="kbi-card kbi-azul">
          <div class="kbi-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="kbi-info">
            <span class="kbi-label">Saldo Circulante</span>
            <span class="kbi-valor">Bs. {{ (reporteBilletera.billeteras?.saldo_circulante ?? 0).toFixed(2) }}</span>
          </div>
        </div>

        <div class="kbi-card kbi-rojo">
          <div class="kbi-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          </div>
          <div class="kbi-info">
            <span class="kbi-label">Total Recargas</span>
            <span class="kbi-valor">{{ reporteBilletera.recargas?.total_operaciones ?? 0 }} ops.</span>
          </div>
        </div>

        <div class="kbi-card kbi-amarillo">
          <div class="kbi-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
          <div class="kbi-info">
            <span class="kbi-label">Pedidos con Billetera</span>
            <span class="kbi-valor">{{ reporteBilletera.uso_billetera?.pedidos_pagados ?? 0 }}</span>
          </div>
        </div>

        <div class="kbi-card kbi-rosa">
          <div class="kbi-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <div class="kbi-info">
            <span class="kbi-label">Monto Consumido</span>
            <span class="kbi-valor">Bs. {{ (reporteBilletera.uso_billetera?.monto_consumido ?? 0).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Gráficos de Billetera -->
      <div class="grid-graficos-billetera">
        <!-- Gráfico: Cómo se recargan (Propia cuenta vs Cajero) -->
        <div class="tarjeta-grafico">
          <div class="grafico-header">
            <div class="grafico-header-info">
              <h3 class="grafico-titulo">¿Cómo se Recargan?</h3>
              <span class="subtexto-grafico">Cuenta propia (app) vs Asistido por Cajero</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>
          </div>
          <div class="grafico-contenido-anillos">
            <div class="anillos-visual">
              <svg viewBox="0 0 200 200" class="svg-torta">
                <circle cx="100" cy="100" r="50" fill="transparent"
                  stroke="var(--morado-brillante)" stroke-width="100"
                  :stroke-dasharray="(pctRecargaPropia * 3.14159) + ' 314.159'"
                  stroke-dashoffset="0" />
                <circle cx="100" cy="100" r="50" fill="transparent"
                  stroke="var(--color-exito)" stroke-width="100"
                  :stroke-dasharray="(pctRecargaCajero * 3.14159) + ' 314.159'"
                  :stroke-dashoffset="-(pctRecargaPropia * 3.14159)" />
                <g v-if="pctRecargaPropia > 10">
                  <text x="100" y="75" fill="#fff" font-size="14" font-weight="900" text-anchor="middle">{{ pctRecargaPropia }}%</text>
                </g>
                <g v-if="pctRecargaCajero > 10">
                  <text x="100" y="130" fill="#fff" font-size="14" font-weight="900" text-anchor="middle">{{ pctRecargaCajero }}%</text>
                </g>
              </svg>
            </div>
            <div class="anillos-leyenda">
              <div class="leyenda-item">
                <span class="punto-leyenda" style="background:var(--morado-brillante);"></span>
                <div class="leyenda-info">
                  <span class="l-nombre">Cuenta Propia</span>
                  <span class="l-valores">{{ pctRecargaPropia }}% ({{ reporteBilletera.recargas?.por_cuenta_propia ?? 0 }})</span>
                </div>
              </div>
              <div class="leyenda-item">
                <span class="punto-leyenda" style="background:var(--color-exito);"></span>
                <div class="leyenda-info">
                  <span class="l-nombre">En Caja (Cajero)</span>
                  <span class="l-valores">{{ pctRecargaCajero }}% ({{ reporteBilletera.recargas?.por_cajero ?? 0 }})</span>
                </div>
              </div>
              <div class="leyenda-item" style="margin-top:15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
                <div class="leyenda-info">
                  <span class="l-nombre">Total recargado</span>
                  <span class="l-valores" style="font-size:1.1rem; color: var(--morado-brillante); font-weight: 900;">Bs. {{ (reporteBilletera.recargas?.monto_total ?? 0).toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top 5 Clientes con más saldo -->
        <div class="tarjeta-grafico">
          <div class="grafico-header">
            <div class="grafico-header-info">
              <h3 class="grafico-titulo">Top Clientes por Saldo</h3>
              <span class="subtexto-grafico">Clientes con mayor saldo disponible en billetera</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div class="grafico-contenido">
            <div v-if="(reporteBilletera.top_clientes ?? []).length === 0" class="texto-sutil texto-centro" style="padding:20px 0">Sin datos aún</div>
            <div v-for="(cli, i) in (reporteBilletera.top_clientes ?? [])" :key="i" class="fila-barra">
              <div class="barra-etiqueta">
                <span class="categoria-nombre">{{ cli.nombre }}</span>
                <span class="categoria-monto">Bs. {{ cli.saldo.toFixed(2) }}</span>
              </div>
              <div class="barra-pista">
                <div class="barra-progreso" :style="{
                  width: maxSaldoCliente > 0 ? (cli.saldo / maxSaldoCliente * 100) + '%' : '0%',
                  background: ['var(--morado-brillante)','var(--color-exito)','var(--morado-medio)','var(--color-alerta)','var(--color-error)'][i]
                }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cajeros más activos en recargas -->
        <div class="tarjeta-grafico">
          <div class="grafico-header">
            <div class="grafico-header-info">
              <h3 class="grafico-titulo">Actividad de Cajeros</h3>
              <span class="subtexto-grafico">Quién procesa más recargas en caja</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          </div>
          <div class="grafico-contenido">
            <div v-if="(reporteBilletera.actividad_cajeros ?? []).length === 0" class="texto-sutil texto-centro" style="padding:20px 0">Sin datos de cajeros</div>
            <div v-for="(caj, i) in (reporteBilletera.actividad_cajeros ?? [])" :key="i" class="fila-barra">
              <div class="barra-etiqueta">
                <span class="categoria-nombre">{{ caj.nombre }}</span>
                <span class="categoria-monto">{{ caj.cantidad }} recargas · Bs. {{ caj.monto_total.toFixed(0) }}</span>
              </div>
              <div class="barra-pista">
                <div class="barra-progreso" :style="{
                  width: maxRecargasCajero > 0 ? (caj.cantidad / maxRecargasCajero * 100) + '%' : '0%',
                  background: ['var(--color-exito)','var(--morado-brillante)','var(--color-alerta)','var(--color-info)','var(--color-error)'][i]
                }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Historial de Recargas Recientes -->
      <div v-if="mostrarHistorialRecargas" class="historial-recargas-panel fade-in">
        <h4 class="hr-titulo">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--morado-brillante)" stroke-width="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Últimas 20 Recargas
        </h4>
        <div class="tabla-contenedor">
          <table class="tabla-admin">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Quién Recargó</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in (reporteBilletera.recientes ?? [])" :key="r.id">
                <td>{{ r.id }}</td>
                <td style="font-weight:600; color:white;">{{ r.nombre }}</td>
                <td>
                  <span class="badge-pago" :class="r.rol === 5 ? 'planificado' : 'activo'">{{ r.rol === 5 ? 'Cuenta Propia' : 'Cajero' }}</span>
                </td>
                <td style="font-weight:bold; color:var(--color-exito);">Bs. {{ (r.monto).toFixed(2) }}</td>
                <td><span class="badge-pago activo">{{ r.estado }}</span></td>
                <td>{{ formatearFecha(r.fecha) }}</td>
              </tr>
              <tr v-if="(reporteBilletera.recientes ?? []).length === 0">
                <td colspan="6" class="texto-centro">No hay recargas registradas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import Paginacion from '@/componentes/comunes/Paginacion.vue'

// Umbral único de stock bajo para reposición, usado tanto en la alerta de
// Inventario Crítico como en el indicador de la tabla de ranking (evita
// inconsistencias donde un producto aparecía crítico en la alerta pero normal en la tabla)
const UMBRAL_STOCK_BAJO = 20

const stats = ref({
  clientes: 0,
  personal: 0,
  ingresosTotales: 0,
  productos: 0,
  eventos: 0,
  asistencia: 0
})

// Billetera
const reporteBilletera = ref({})
const mostrarHistorialRecargas = ref(false)

const pctRecargaPropia = computed(() => {
  const total = (reporteBilletera.value.recargas?.total_operaciones ?? 0)
  if (!total) return 0
  return Math.round((reporteBilletera.value.recargas?.por_cuenta_propia ?? 0) / total * 100)
})
const pctRecargaCajero = computed(() => 100 - pctRecargaPropia.value)

const maxSaldoCliente = computed(() => {
  const arr = reporteBilletera.value.top_clientes ?? []
  return arr.length ? Math.max(...arr.map(c => c.saldo)) : 1
})
const maxRecargasCajero = computed(() => {
  const arr = reporteBilletera.value.actividad_cajeros ?? []
  return arr.length ? Math.max(...arr.map(c => c.cantidad)) : 1
})

const ventas = ref([])
// Filtro por rango de fechas para el reporte de ventas/recargas
const filtroDesde = ref('')
const filtroHasta = ref('')
const presetActivo = ref('todo')

// Paginación de la tabla de ventas
const ventasPagina = ref(1)
const ventasLimite = ref(20)
const ventasTotal = ref(0)
const ventasPaginas = ref(1)

function aplicarFiltros() {
  // Si el rango está invertido, se corrige automáticamente
  if (filtroDesde.value && filtroHasta.value && filtroDesde.value > filtroHasta.value) {
    [filtroDesde.value, filtroHasta.value] = [filtroHasta.value, filtroDesde.value]
  }
  cargarReportes()
  cargarReporteBilletera()
}

function presetFecha(tipo) {
  const hoy = new Date()
  const fmt = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  presetActivo.value = tipo
  if (tipo === 'todo') {
    filtroDesde.value = ''
    filtroHasta.value = ''
  } else if (tipo === 'hoy') {
    filtroDesde.value = fmt(hoy)
    filtroHasta.value = fmt(hoy)
  } else if (tipo === 'semana') {
    const d = new Date(hoy); d.setDate(d.getDate() - 6)
    filtroDesde.value = fmt(d)
    filtroHasta.value = fmt(hoy)
  } else if (tipo === 'mes') {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    filtroDesde.value = fmt(d)
    filtroHasta.value = fmt(hoy)
  }
  aplicarFiltros()
}

function cambioFechaManual() {
  presetActivo.value = ''
  aplicarFiltros()
}

function limpiarFiltroFechas() {
  presetFecha('todo')
}
const cargando = ref(false)
let intervaloSync = null

const modalActivo = ref(null)
const listadoClientes = ref([])
const listadoPersonal = ref([])
const listadoEventos = ref([])

// Datos dinámicos para los gráficos interactivos
const datosCategorias = ref([])
const datosMetodos = ref([])
const listadoProductosRanking = ref([])
const productosBajoStock = ref([])
const datosMeseros = ref([])

// Concentric payment rings / torta variables
const montoEfectivo = ref(0)
const porcentajeEfectivo = ref(0)
const conteoEfectivo = ref(0)

const montoQR = ref(0)
const porcentajeQR = ref(0)
const conteoQR = ref(0)

const montoBilletera = ref(0)
const porcentajeBilletera = ref(0)
const conteoBilletera = ref(0)

// 2D sales trend vector points
const salesTrendPoints = ref('')
const salesTrendFillPoints = ref('')
const trendComandas = ref([])

function abrirModal(tipo) {
  modalActivo.value = tipo
}

function exportarPDF() {
  // Validar que existan datos antes de exportar (evita PDFs con gráficos en blanco
  // cuando el usuario exporta antes de que cargarReportes termine o sin ventas)
  const hayDatos = trendComandas.value.length > 0
    || datosMeseros.value.length > 0
    || listadoProductosRanking.value.some(p => p.vecesVendido > 0)
    || (conteoEfectivo.value + conteoQR.value + conteoBilletera.value) > 0
  if (!hayDatos) {
    alert('Aún no hay datos suficientes para generar el reporte PDF. Espere a que se carguen los reportes o ajuste el periodo seleccionado.')
    return
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const fechaGen = new Date().toLocaleString();
  const logoUrl = `${window.location.origin}/src/activos/imagenes/logo-euphoria.png`;

  // Rango de fechas cubierto por el reporte (para rotular el encabezado)
  const rangoFechas = (filtroDesde.value || filtroHasta.value)
    ? `Periodo: ${filtroDesde.value ? formatearFecha(filtroDesde.value) : 'Inicio'} — ${filtroHasta.value ? formatearFecha(filtroHasta.value) : 'Hoy'}`
    : 'Periodo: Todo el histórico';

  // Construir el SVG de tendencia a partir de los datos reactivos (no del DOM),
  // así el PDF nunca sale en blanco por desincronización con el render
  const svgTendenciaMarkup = trendComandas.value.length > 0
    ? `<svg viewBox="0 0 360 160" class="svg-tendencia-2d" xmlns="http://www.w3.org/2000/svg">
        <line x1="20" y1="20" x2="340" y2="20" stroke="rgba(0,0,0,0.08)" stroke-width="1" />
        <line x1="20" y1="65" x2="340" y2="65" stroke="rgba(0,0,0,0.08)" stroke-width="1" />
        <line x1="20" y1="110" x2="340" y2="110" stroke="rgba(0,0,0,0.08)" stroke-width="1" />
        <line x1="20" y1="130" x2="340" y2="130" stroke="rgba(0,0,0,0.12)" stroke-width="1" />
        ${salesTrendFillPoints.value ? `<path d="${salesTrendFillPoints.value}" fill="rgba(170,59,255,0.15)" />` : ''}
        ${salesTrendPoints.value ? `<path d="${salesTrendPoints.value}" fill="none" stroke="#aa3bff" stroke-width="3" stroke-linecap="round" />` : ''}
        ${trendComandas.value.map(pt => `
          <circle cx="${pt.x}" cy="${pt.y}" r="5" fill="#ffffff" stroke="#aa3bff" stroke-width="2.5" />
          <text x="${pt.x}" y="${pt.y - 12}" fill="#1a202c" font-size="10.5" font-weight="800" text-anchor="middle">Bs. ${pt.subtotal.toFixed(0)}</text>
        `).join('')}
      </svg>`
    : '<div style="padding:30px 0; color:#718096; text-align:center;">Sin comandas para graficar la tendencia en este periodo.</div>';

  // Construir la torta de Métodos de Pago desde los porcentajes reactivos
  // (antes se raspaba el PRIMER .svg-torta del DOM, frágil ante cambios de orden)
  const dashE = (porcentajeEfectivo.value * 3.14159).toFixed(3);
  const dashQR = (porcentajeQR.value * 3.14159).toFixed(3);
  const dashB = (porcentajeBilletera.value * 3.14159).toFixed(3);
  const svgAnillosMarkup = `
    <svg viewBox="0 0 200 200" class="svg-torta" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="50" fill="transparent" stroke="#2ecc71" stroke-width="100" stroke-dasharray="${dashE} 314.159" stroke-dashoffset="0" />
      <circle cx="100" cy="100" r="50" fill="transparent" stroke="#3498db" stroke-width="100" stroke-dasharray="${dashQR} 314.159" stroke-dashoffset="-${dashE}" />
      <circle cx="100" cy="100" r="50" fill="transparent" stroke="#aa3bff" stroke-width="100" stroke-dasharray="${dashB} 314.159" stroke-dashoffset="-${(porcentajeEfectivo.value + porcentajeQR.value) * 3.14159}" />
    </svg>`;

  // Columna 1: Métodos de Pago más Usados
  const colMetodos = `
    <div class="resumen-columna">
      <h3><svg class="pdf-h3-icon" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="3" ry="3"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>Métodos de Pago</h3>
      <ul class="resumen-lista">
        <li>
          <span class="punto-resumen" style="background:#2ecc71;"></span>
          <strong>Efectivo:</strong> ${porcentajeEfectivo.value}% (${conteoEfectivo.value})
        </li>
        <li>
          <span class="punto-resumen" style="background:#3498db;"></span>
          <strong>Transf. QR:</strong> ${porcentajeQR.value}% (${conteoQR.value})
        </li>
        <li>
          <span class="punto-resumen" style="background:#aa3bff;"></span>
          <strong>Billetera:</strong> ${porcentajeBilletera.value}% (${conteoBilletera.value})
        </li>
      </ul>
    </div>
  `;

  // Columna 2: Desempeño del Personal
  const filasMeserosHTML = datosMeseros.value.slice(0, 5).map(m => `
    <li>
      <span class="punto-resumen" style="background:${m.color || '#3498db'};"></span>
      <strong>${m.nombre.split(' ')[0]}:</strong> Bs. ${m.total.toFixed(0)} (${m.porcentaje}%)
    </li>
  `).join('') || '<li>No hay ventas por mesero registradas</li>';

  const colPersonal = `
    <div class="resumen-columna">
      <h3><svg class="pdf-h3-icon" viewBox="0 0 24 24" fill="none" stroke="#aa3bff" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Desempeño del Personal</h3>
      <ul class="resumen-lista">
        ${filasMeserosHTML}
      </ul>
    </div>
  `;

  // Columna 3: Productos Estrella
  const filasProductosHTML = listadoProductosRanking.value.slice(0, 5).map(p => `
    <li>
      <span class="punto-resumen" style="background:#ec4899;"></span>
      <strong>${p.nombre_producto.substring(0, 20)}${p.nombre_producto.length > 20 ? '...' : ''}:</strong> ${p.vecesVendido} uds (Bs. ${(p.ingresosGenerados || 0).toFixed(0)})
    </li>
  `).join('') || '<li>No hay productos estrella registrados</li>';

  const colProductos = `
    <div class="resumen-columna">
      <h3><svg class="pdf-h3-icon" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Productos Estrella</h3>
      <ul class="resumen-lista">
        ${filasProductosHTML}
      </ul>
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reporte de Rendimiento - Euphoria</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1a202c;
          background: #ffffff;
          margin: 0;
          padding: 30px;
          line-height: 1.5;
        }
        .header-pdf {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #aa3bff;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }
        .logo-container img {
          height: 50px;
          object-fit: contain;
        }
        .titulo-reporte {
          text-align: right;
        }
        .titulo-reporte h1 {
          margin: 0;
          font-size: 1.5rem;
          color: #1a202c;
          letter-spacing: 0.5px;
          font-weight: 800;
        }
        .titulo-reporte p {
          margin: 3px 0 0 0;
          font-size: 0.8rem;
          color: #718096;
          font-weight: 600;
        }
        .kpis-horizontal {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 25px;
        }
        .kpi-item {
          background: #f7fafc;
          border: 1px solid #edf2f7;
          border-radius: 12px;
          padding: 10px;
          flex: 1;
          text-align: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.01);
        }
        .kpi-item h4 {
          margin: 0;
          font-size: 0.68rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-item p {
          margin: 4px 0 0 0;
          font-size: 1.15rem;
          color: #aa3bff;
          font-weight: 800;
        }
        .seccion-titulo {
          font-size: 1.05rem;
          color: #1a202c;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-top: 25px;
          margin-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 6px;
          text-align: left;
        }
        .graficos-pdf-flex {
          display: flex;
          gap: 20px;
          margin-bottom: 25px;
        }
        .grafico-pdf-card {
          background: #f7fafc !important;
          border: 1px solid #edf2f7 !important;
          border-radius: 16px;
          padding: 15px;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          color: #1a202c;
        }
        .grafico-pdf-card h3 {
          margin: 0 0 10px 0;
          font-size: 0.85rem;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 800;
        }
        .grafico-pdf-card svg {
          width: 100% !important;
          height: auto !important;
          max-height: 180px;
          overflow: visible !important;
        }
        .resumen-columnas-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 15px;
          margin-bottom: 20px;
        }
        .resumen-columna {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .resumen-columna h3 {
          margin: 0 0 15px 0;
          font-size: 0.95rem;
          color: #aa3bff;
          border-bottom: 2px solid #edf2f7;
          padding-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 800;
          text-align: left;
          display: flex;
          align-items: center;
        }
        .pdf-h3-icon {
          width: 18px;
          height: 18px;
          display: inline-block;
          margin-right: 8px;
          flex-shrink: 0;
        }
        .resumen-lista {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .resumen-lista li {
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #2d3748;
        }
        .punto-resumen {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 0.72rem;
          color: #a0aec0;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
        }
        /* Forzar visualización de textos en tonos oscuros en el PDF sobre fondo blanco */
        svg text, svg .texto-nodo-grafico {
          fill: #1a202c !important;
          font-weight: 800 !important;
          text-shadow: none !important;
        }
        svg line {
          stroke: rgba(0, 0, 0, 0.08) !important;
        }
        svg circle[fill="#fff"] {
          fill: #ffffff !important;
          stroke: #aa3bff !important;
        }
      </style>
    </head>
    <body>
      <div class="header-pdf">
        <div class="logo-container">
          <img src="${logoUrl}" onerror="this.style.display='none'; document.getElementById('logo-fallback').style.display='block';" />
          <div id="logo-fallback" style="display:none; font-size: 2rem; font-weight: 900; color: #aa3bff; letter-spacing: 1px;">EUPHORIA</div>
        </div>
        <div class="titulo-reporte">
          <h1>REPORTE DE RENDIMIENTO GENERAL</h1>
          <p>${rangoFechas}</p>
          <p>Generado el: ${fechaGen}</p>
        </div>
      </div>

      <div class="kpis-horizontal">
        <div class="kpi-item">
          <h4>Ventas Totales</h4>
          <p>Bs. ${stats.value.ingresosTotales.toFixed(0)}</p>
        </div>
        <div class="kpi-item">
          <h4>Clientes</h4>
          <p>${stats.value.clientes}</p>
        </div>
        <div class="kpi-item">
          <h4>Personal</h4>
          <p>${stats.value.personal}</p>
        </div>
        <div class="kpi-item">
          <h4>Productos</h4>
          <p>${stats.value.productos}</p>
        </div>
        <div class="kpi-item">
          <h4>Eventos</h4>
          <p>${stats.value.eventos}</p>
        </div>
        <div class="kpi-item">
          <h4>Asistencia (Últ. Evento)</h4>
          <p>${stats.value.asistencia} pers.</p>
        </div>
      </div>

      <div class="seccion-titulo">Análisis y Gráficos Operativos</div>
      
      <div class="graficos-pdf-flex">
        <div class="grafico-pdf-card">
          <h3>Curva de Tendencia de Ventas (2D)</h3>
          ${svgTendenciaMarkup}
        </div>
        <div class="grafico-pdf-card">
          <h3>Participación por Métodos de Pago</h3>
          ${svgAnillosMarkup}
        </div>
      </div>

      <div class="seccion-titulo">Resumen Gerencial del Negocio</div>

      <div class="resumen-columnas-grid">
        ${colMetodos}
        ${colPersonal}
        ${colProductos}
      </div>

      <div class="footer">
        Este documento es un informe confidencial de toma de decisiones de Euphoria. Sincronizado dinámicamente con la base de datos central.
      </div>
    </body>
    </html>
  `;
  
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Esperar a que cargue el contenido y gatillar el diálogo de impresión directamente sin abrir pestañas vacías
  iframe.contentWindow.onload = function() {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  };
}

onMounted(() => {
  cargarReportes()
  cargarReporteBilletera()
  // Sincronización automática en vivo (endpoints ligeros/agregados)
  intervaloSync = setInterval(() => {
    cargarReportes(true) // modo silencioso para no parpadear la pantalla
  }, 15000)
})

onUnmounted(() => {
  if (intervaloSync) clearInterval(intervaloSync)
})

async function cargarReportes(silencioso = false) {
  if (!silencioso) cargando.value = true
  try {
    // 1. Obtener catálogo de productos para mapear categorías de forma precisa y contar ventas
    const productosMap = {}
    const productosVentasCount = {}
    const productosIngresos = {}
    let resProductosRaw = []
    try {
      resProductosRaw = await clienteHttp.get('/productos')
      stats.value.productos = resProductosRaw.length || (resProductosRaw.productos ? resProductosRaw.productos.length : 0)
      
      // Filtrar y guardar los productos con stock crítico bajo el umbral único para las alertas del Dashboard
      productosBajoStock.value = resProductosRaw.filter(p => p.stock_actual < UMBRAL_STOCK_BAJO)

      resProductosRaw.forEach(p => {
        productosMap[p.id_producto] = p.nombre_categoria || 'Otros'
        productosVentasCount[p.id_producto] = 0
        productosIngresos[p.id_producto] = 0
      })
    } catch (e) { console.warn('Error al cargar catálogo de productos:', e) }

    // 2. Usuarios (Filtrar correctamente con el rol en formato de string)
    try {
      const resUsuarios = await clienteHttp.get('/usuarios')
      listadoClientes.value = resUsuarios.filter(u => u.rol === 'Cliente')
      listadoPersonal.value = resUsuarios.filter(u => u.rol !== 'Cliente' && u.rol !== 'Administrador')
      stats.value.clientes = listadoClientes.value.length
      stats.value.personal = listadoPersonal.value.length
    } catch (e) { console.warn(e) }

    // 3. Eventos y Asistencia real
    try {
      const resEventos = await clienteHttp.get('/eventos')
      listadoEventos.value = resEventos.eventos || []
      stats.value.eventos = listadoEventos.value.length
      
      // Asistencia del evento más reciente (primero de la lista) para enfocar el último día de evento
      if (listadoEventos.value.length > 0) {
        stats.value.asistencia = listadoEventos.value[0].asistenciaReal || 0
      } else {
        stats.value.asistencia = 0
      }
    } catch (e) { console.warn(e) }

    // 4. Ventas: agregados en SQL (rapido) + lista paginada
    try {
      const params = new URLSearchParams()
      if (filtroDesde.value) params.append('desde', filtroDesde.value)
      if (filtroHasta.value) params.append('hasta', filtroHasta.value)
      const qs = params.toString() ? `?${params.toString()}` : ''

      const resumen = await clienteHttp.get(`/comandas/resumen-ventas${qs}`)

      stats.value.ingresosTotales = resumen.totales.ingresos

      // Metodos de pago
      const met = { 'Efectivo': 0, 'Transferencia QR': 0, 'Billetera': 0 }
      conteoEfectivo.value = 0; conteoQR.value = 0; conteoBilletera.value = 0
      resumen.por_metodo.forEach(m => {
        met[m.metodo] = m.total
        if (m.metodo === 'Efectivo') conteoEfectivo.value = m.cantidad
        else if (m.metodo === 'Transferencia QR') conteoQR.value = m.cantidad
        else if (m.metodo === 'Billetera') conteoBilletera.value = m.cantidad
      })
      montoEfectivo.value = met['Efectivo'] || 0
      montoQR.value = met['Transferencia QR'] || 0
      montoBilletera.value = met['Billetera'] || 0
      const totalMet = (montoEfectivo.value + montoQR.value + montoBilletera.value) || 1
      porcentajeEfectivo.value = Math.round(montoEfectivo.value / totalMet * 100)
      porcentajeQR.value = Math.round(montoQR.value / totalMet * 100)
      porcentajeBilletera.value = Math.round(montoBilletera.value / totalMet * 100)
      const coloresMetodos = { 'Efectivo': 'var(--color-exito)', 'Transferencia QR': 'var(--color-info)', 'Billetera': 'var(--morado-brillante)' }
      datosMetodos.value = Object.keys(met).map(n => ({ nombre: n, total: met[n] }))
        .map(m => ({ ...m, porcentaje: Math.round(m.total / totalMet * 100), color: coloresMetodos[m.nombre] || 'var(--rosa-acento)' }))
        .sort((a, b) => b.total - a.total)

      // Categorias
      const coloresCategorias = ['var(--morado-brillante)', 'var(--rosa-acento)', 'var(--color-info)', 'var(--color-exito)', 'var(--color-alerta)', 'var(--color-error)']
      const maxCat = Math.max(...resumen.por_categoria.map(c => c.total), 1)
      datosCategorias.value = resumen.por_categoria.map((c, idx) => ({
        nombre: c.categoria || 'Otros', total: c.total,
        porcentaje: Math.round(c.total / maxCat * 100),
        color: coloresCategorias[idx % coloresCategorias.length]
      }))

      // Ranking de productos (catalogo + ventas)
      const vProd = {}, iProd = {}
      resumen.ranking_productos.forEach(r => { vProd[r.id_producto] = r.veces; iProd[r.id_producto] = r.ingresos })
      listadoProductosRanking.value = resProductosRaw.map(p => ({
        ...p,
        vecesVendido: vProd[p.id_producto] || 0,
        ingresosGenerados: iProd[p.id_producto] || 0
      })).sort((a, b) => b.vecesVendido - a.vecesVendido)

      // Meseros
      const coloresMeseros = ['var(--color-info)', 'var(--morado-brillante)', 'var(--rosa-acento)', 'var(--color-exito)', 'var(--color-alerta)', 'var(--color-error)']
      const maxMes = Math.max(...resumen.por_mesero.map(m => m.total), 1)
      datosMeseros.value = resumen.por_mesero.map((m, idx) => ({
        nombre: m.nombre, total: m.total,
        porcentaje: Math.round(m.total / maxMes * 100),
        color: coloresMeseros[idx % coloresMeseros.length]
      }))

      // Tendencia (grafico 2D)
      const ultimas = [...resumen.tendencia].reverse().map(t => ({ id_comanda: t.id_comanda, subtotal: t.total, fecha_registro: t.fecha }))
      if (ultimas.length > 0) {
        const maxSub = Math.max(...ultimas.map(c => c.subtotal), 1)
        const width = 360, height = 150, padding = 20
        let pathD = '', fillD = ''
        const coords = ultimas.map((c, idx) => {
          const x = padding + (idx * (width - 2 * padding)) / Math.max(ultimas.length - 1, 1)
          const y = height - padding - (c.subtotal / maxSub) * (height - 2 * padding)
          if (idx === 0) { pathD = `M ${x} ${y}`; fillD = `M ${x} ${height - padding} L ${x} ${y}` }
          else { pathD += ` L ${x} ${y}`; fillD += ` L ${x} ${y}` }
          if (idx === ultimas.length - 1) fillD += ` L ${x} ${height - padding} Z`
          return { ...c, x, y }
        })
        trendComandas.value = coords
        salesTrendPoints.value = pathD
        salesTrendFillPoints.value = fillD
      } else {
        trendComandas.value = []
        salesTrendPoints.value = ''
        salesTrendFillPoints.value = ''
      }

      // Lista de ventas (paginada)
      await cargarVentasPagina()
    } catch (e) {
      console.warn('Error al cargar resumen/graficos:', e)
    }

  } catch (error) {
    console.error('Error general al cargar reportes:', error)
  } finally {
    cargando.value = false
  }
}

// Carga UNA página de la tabla de ventas (no trae todo)
async function cargarVentasPagina() {
  try {
    const params = new URLSearchParams()
    if (filtroDesde.value) params.append('desde', filtroDesde.value)
    if (filtroHasta.value) params.append('hasta', filtroHasta.value)
    params.append('pagina', ventasPagina.value)
    params.append('limite', ventasLimite.value)
    const res = await clienteHttp.get(`/comandas?${params.toString()}`)
    const datos = res.datos || []
    ventas.value = datos.map(c => ({
      ...c,
      subtotal: (c.detalle_comanda || []).reduce((a, d) => a + parseFloat(d.subtotal), 0)
    }))
    ventasTotal.value = res.total || 0
    ventasPaginas.value = res.paginas || 1
  } catch (e) {
    console.warn('Error cargando página de ventas:', e)
  }
}

function irPaginaVentas(n) {
  if (n < 1 || n > ventasPaginas.value) return
  ventasPagina.value = n
  cargarVentasPagina()
}

function cambiarLimiteVentas() {
  ventasPagina.value = 1
  cargarVentasPagina()
}

async function cargarReporteBilletera() {
  try {
    const params = new URLSearchParams()
    if (filtroDesde.value) params.append('desde', filtroDesde.value)
    if (filtroHasta.value) params.append('hasta', filtroHasta.value)
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await clienteHttp.get(`/billetera/admin/reporte-completo${query}`)
    reporteBilletera.value = res
  } catch (e) {
    console.warn('Error cargando reporte billetera:', e)
  }
}

function formatearFecha(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return d.toLocaleString('es-BO', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  })
}
</script>

<style scoped>
/* CABECERA Y ACCIONES */
.vista-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}
.vista-cabecera-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vista-titulo {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.7rem, 2.4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0;
  background: var(--gradiente-texto);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--texto-principal);
}
.vista-subtitulo {
  font-size: 0.9rem;
  color: var(--texto-secundario);
  font-weight: 500;
  margin: 0;
  max-width: 60ch;
  text-wrap: pretty;
}
.cabecera-acciones {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.badge-tiempo-real {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(46, 204, 113, 0.08);
  border: 1px solid rgba(46, 204, 113, 0.2);
  color: var(--color-exito);
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.punto-verde {
  color: var(--color-exito);
  font-size: 0.9rem;
}
.btn-sincronizar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--gradiente-marca);
  border: none;
  color: #fff;
  padding: 10px 20px;
  border-radius: var(--radio-md);
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 0.25s var(--ease-suave), box-shadow 0.25s ease, filter 0.2s ease;
  box-shadow: 0 4px 16px rgba(168, 85, 247, 0.3);
}
.btn-sincronizar svg {
  transition: transform 0.25s var(--ease-suave);
}
.btn-sincronizar:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.45), var(--glow-rosa);
  filter: saturate(1.08);
}
.btn-sincronizar:hover svg {
  transform: translateY(2px);
}
.btn-sincronizar:active {
  transform: translateY(0) scale(0.97);
}
.btn-sincronizar:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco), 0 4px 16px rgba(168, 85, 247, 0.3);
}
.animar-giro svg {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* CARDS GRID */
.grid-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-top: 10px;
}
.tarjeta-estadistica {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 130px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}
.tarjeta-estadistica::before {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent);
  pointer-events: none;
}
.tarjeta-estadistica:hover {
  transform: translateY(-6px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 18px 40px rgba(10, 4, 20, 0.5), var(--sombra-glow);
}
.tarjeta-estadistica:focus-visible {
  outline: none;
  border-color: transparent;
  box-shadow: var(--anillo-foco);
}
.tarjeta-estadistica:active {
  transform: translateY(-2px) scale(0.99);
}
.bg-clientes { border-left: 4px solid var(--color-info); }
.bg-personal { border-left: 4px solid var(--morado-claro); }
.bg-ventas { border-left: 4px solid var(--color-exito); }
.bg-productos { border-left: 4px solid var(--color-alerta); }
.bg-eventos { border-left: 4px solid var(--color-alerta); }
.bg-asistencia { border-left: 4px solid var(--color-error); }

.icono-est {
  padding: 16px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s;
}
.tarjeta-estadistica:hover .icono-est {
  transform: scale(1.1);
}
.bg-clientes .icono-est { color: var(--color-info); background: rgba(52, 152, 219, 0.1); }
.bg-personal .icono-est { color: var(--morado-claro); background: rgba(155, 89, 182, 0.1); }
.bg-ventas .icono-est { color: var(--color-exito); background: rgba(46, 204, 113, 0.1); }
.bg-productos .icono-est { color: var(--color-alerta); background: rgba(241, 196, 15, 0.1); }
.bg-eventos .icono-est { color: var(--color-alerta); background: rgba(230, 126, 34, 0.1); }
.bg-asistencia .icono-est { color: var(--color-error); background: rgba(231, 76, 60, 0.1); }

.info-est {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.info-est h3 {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin: 0 0 4px;
  font-weight: 600;
}
.info-est h2 {
  font-size: 2rem;
  color: #fff;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0 0 4px;
}
.info-est p {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.4);
  margin: 0;
}

/* MODALES PANTALLA COMPLETA ULTRA-PREMIUM */
.modal-fullscreen {
  position: fixed;
  inset: 0;
  background: var(--fondo-app); /* Fondo totalmente sólido e impenetrable */
  z-index: 99999; /* Z-Index extremo para evitar solapamientos con sidebar o navbar */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 100px rgba(0,0,0,0.9);
  animation: modalEntrar 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes modalEntrar {
  0% { transform: translateY(30px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

.modal-fs-header {
  padding: 24px 40px;
  background: rgba(255,255,255,0.02);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.modal-fs-header h2 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  background: linear-gradient(135deg, #fff, var(--texto-secundario));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.btn-cerrar-fs {
  background: rgba(231, 76, 60, 0.12);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--color-error);
  padding: 10px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-cerrar-fs:hover {
  background: rgba(231, 76, 60, 0.25);
  transform: translateY(-1px);
}
.btn-cerrar-fs:active {
  transform: scale(0.97);
}
.btn-cerrar-fs:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.35);
}

.modal-fs-body {
  padding: 40px;
  flex: 1;
  overflow-y: auto;
  background: radial-gradient(circle at top left, var(--fondo-tarjeta) 0%, var(--fondo-app) 100%);
}

/* BARRA DE FILTRO DE PERIODO GLOBAL */
.barra-filtro-periodo {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: 16px;
  padding: 14px 20px;
  margin-bottom: 20px;
}
.filtro-periodo-titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--texto-principal);
  font-size: 0.95rem;
}
.filtro-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-preset {
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-secundario);
  padding: 7px 14px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-preset:hover {
  border-color: var(--borde-activo);
  color: var(--texto-principal);
  transform: translateY(-1px);
}
.btn-preset:active {
  transform: translateY(0) scale(0.97);
}
.btn-preset:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
  color: var(--texto-principal);
}
.btn-preset.activo {
  background: var(--gradiente-marca);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 3px 12px rgba(168, 85, 247, 0.3);
}
.filtro-rango-personalizado {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

/* Paginación */
.paginacion-barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 4px;
}
.paginacion-info {
  color: var(--texto-secundario);
  font-size: 0.85rem;
  font-weight: 600;
}
.paginacion-controles {
  display: flex;
  gap: 8px;
}
.btn-pagina {
  background: var(--fondo-tarjeta-alt);
  border: 1px solid var(--borde-sutil);
  color: var(--texto-principal);
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-pagina:hover:not(:disabled) {
  border-color: var(--borde-activo);
  background: var(--morado-medio);
}
.btn-pagina:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
@media (max-width: 768px) {
  .filtro-rango-personalizado { margin-left: 0; width: 100%; }
  .barra-filtro-periodo { gap: 12px; }
}

/* FILTRO DE FECHAS */
.etiqueta-filtro {
  color: var(--texto-secundario);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.btn-limpiar-filtro {
  background: transparent;
  border: 1px solid var(--borde-activo);
  color: var(--morado-hover);
  padding: 8px 14px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-limpiar-filtro:hover {
  background: var(--morado-medio);
  color: #fff;
}
.btn-limpiar-filtro:active {
  transform: scale(0.97);
}
.btn-limpiar-filtro:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
}
.input-filtro {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  padding: 10px 16px;
  border-radius: 12px;
  outline: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition: border-color 0.2s;
  cursor: pointer;
}
.input-filtro:hover {
  border-color: rgba(255, 255, 255, 0.22);
}
.input-filtro:focus {
  border-color: var(--morado-brillante);
  background: rgba(255,255,255,0.1);
  box-shadow: var(--anillo-foco);
}

/* TABLA PREMIUM */
.tabla-admin {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;
  color: var(--texto-principal);
}
.tabla-admin th {
  padding: 16px 24px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1.2px;
  color: var(--texto-secundario);
  text-align: left;
  border-bottom: 2px solid rgba(255, 255, 255, 0.08);
}
.tabla-admin td {
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.95rem;
}
.tabla-admin tr td:first-child {
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px 0 0 16px;
}
.tabla-admin tr td:last-child {
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0 16px 16px 0;
}
.tabla-admin tbody tr {
  transition: all 0.2s ease;
}
.tabla-admin tbody tr:hover td {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

/* BADGES */
.badge-pago {
  padding: 6px 14px;
  border-radius: 30px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.badge-pago.efectivo { background: rgba(46, 204, 113, 0.1); color: var(--color-exito); border: 1px solid rgba(46, 204, 113, 0.2); }
.badge-pago.transferencia-qr { background: rgba(52, 152, 219, 0.1); color: var(--color-info); border: 1px solid rgba(52, 152, 219, 0.2); }
.badge-pago.billetera { background: rgba(155, 89, 182, 0.1); color: var(--morado-claro); border: 1px solid rgba(155, 89, 182, 0.2); }
.badge-pago.activo { background: rgba(46, 204, 113, 0.1); color: var(--color-exito); }
.badge-pago.finalizado { background: rgba(231, 76, 60, 0.1); color: var(--color-error); }
.badge-pago.planificado { background: rgba(241, 196, 15, 0.1); color: var(--color-alerta); }

.texto-sutil {
  color: rgba(255,255,255,0.3);
  font-style: italic;
}
.texto-centro {
  text-align: center !important;
  color: rgba(255,255,255,0.4);
  padding: 40px !important;
  background: transparent !important;
  border: none !important;
}

.tarjeta-estadistica {
  cursor: pointer;
}

/* CONTENEDOR DE TABLAS RESPONSIVO */
.tabla-contenedor {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.1);
  margin-top: 10px;
}

/* SECCIÓN DE GRÁFICOS PREMIUM */
.grid-graficos {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
  margin-top: 30px;
  margin-bottom: 30px;
}
@media (max-width: 1024px) {
  .grid-graficos {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
.tarjeta-grafico {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 24px;
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
}
.tarjeta-grafico:hover {
  transform: translateY(-4px);
  border-color: rgba(168, 85, 247, 0.22);
  box-shadow: 0 18px 48px rgba(10, 4, 20, 0.55), 0 0 24px rgba(168, 85, 247, 0.12);
  background: rgba(255, 255, 255, 0.03);
}
.grafico-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 14px;
}
.grafico-header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grafico-titulo {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  letter-spacing: -0.01em;
}
.subtexto-grafico {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  font-weight: 500;
  text-wrap: pretty;
}
.grafico-contenido {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
}

/* Barras de Categorías */
.fila-barra {
  margin-bottom: 18px;
}
.barra-etiqueta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.88rem;
}
.categoria-nombre {
  color: var(--texto-principal);
  font-weight: 700;
}
.categoria-monto {
  color: #fff;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.barra-pista {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.barra-progreso {
  height: 100%;
  border-radius: 6px;
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.15);
}

/* Distribución de Métodos */
.fila-metodo {
  margin-bottom: 20px;
}
.metodo-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.88rem;
}
.metodo-nombre {
  color: var(--texto-principal);
  font-weight: 700;
}
.metodo-monto {
  color: #fff;
  font-weight: 800;
}
.metodo-barra-pista {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 5px;
  overflow: hidden;
}
.metodo-barra {
  height: 100%;
  border-radius: 5px;
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ALERTA DE STOCK BAJO NEON */
.alerta-stock-bajo {
  display: flex;
  gap: 20px;
  background: rgba(231, 76, 60, 0.04);
  border: 1px solid rgba(231, 76, 60, 0.35);
  box-shadow: 0 0 20px rgba(231, 76, 60, 0.1), inset 0 0 15px rgba(231, 76, 60, 0.05);
  border-radius: 20px;
  padding: 20px;
  margin-top: 15px;
  margin-bottom: 25px;
  backdrop-filter: blur(10px);
  animation: pulsaAlerta 3s infinite ease-in-out;
}
@keyframes pulsaAlerta {
  0%, 100% { border-color: rgba(231, 76, 60, 0.35); box-shadow: 0 0 20px rgba(231, 76, 60, 0.1); }
  50% { border-color: rgba(231, 76, 60, 0.7); box-shadow: 0 0 30px rgba(231, 76, 60, 0.25); }
}
.alerta-icono {
  background: rgba(231, 76, 60, 0.15);
  color: var(--color-error);
  padding: 14px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 52px;
  width: 52px;
  box-shadow: 0 0 10px rgba(231, 76, 60, 0.2);
}
.alerta-contenido {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.alerta-contenido h4 {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--color-error);
  margin: 0;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(231, 76, 60, 0.3);
}
.alerta-contenido p {
  font-size: 0.88rem;
  color: var(--texto-secundario);
  margin: 0;
}
.alerta-subtexto {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 500;
  margin: 0;
}
.alerta-productos-lista {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
.alerta-producto-badge {
  background: rgba(231, 76, 60, 0.08);
  border: 1px solid rgba(231, 76, 60, 0.2);
  color: #fff;
  padding: 6px 14px;
  border-radius: 30px;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.punto-alerta {
  width: 6px;
  height: 6px;
  background: var(--color-error);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-error);
  animation: pulsaPunto 1.5s infinite ease-in-out;
}
@keyframes pulsaPunto {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.4); opacity: 1; }
}

/* EXPLICACIÓN DEL GRÁFICO 2D */
.explicacion-grafico {
  margin-top: 15px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  padding: 12px 16px;
}
.explicacion-grafico p {
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--texto-secundario);
  margin: 0;
}
.texto-nodo-grafico {
  fill: #fff;
  font-weight: 800;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
  font-family: inherit;
}

/* GRÁFICO TENDENCIA 2D VECTORIAL */
.grafico-contenido-2d {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 15px 0;
}
.svg-tendencia-2d {
  width: 100%;
  height: auto;
  min-height: 230px;
  max-height: 280px;
  overflow: visible;
  filter: drop-shadow(0px 0px 8px rgba(170, 59, 255, 0.15));
}
.svg-columnas-2d {
  width: 100%;
  height: auto;
  min-height: 230px;
  max-height: 280px;
  overflow: visible;
  filter: drop-shadow(0px 0px 8px rgba(170, 59, 255, 0.15));
}
.linea-tendencia-neon {
  filter: drop-shadow(0 0 5px var(--morado-brillante));
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: dibujaCurva 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes dibujaCurva {
  to { stroke-dashoffset: 0; }
}

/* GRÁFICO ANILLOS CONCÉNTRICOS */
.grafico-contenido-anillos {
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex: 1;
  gap: 25px;
  padding: 15px 0;
}
.anillos-visual {
  position: relative;
  width: 250px;
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}
@media (max-width: 768px) {
  .anillos-visual {
    width: 180px;
    height: 180px;
  }
}
.svg-torta {
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0px 0px 8px rgba(170, 59, 255, 0.15));
}
.torta-sector {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dasharray 1.5s cubic-bezier(0.16, 1, 0.3, 1), stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.anillos-centro {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.monto-centro-etiqueta {
  font-size: 0.78rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.8px;
}
.monto-centro-valor {
  font-size: 1.3rem;
  color: #fff;
  font-weight: 800;
}
.anillos-leyenda {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.leyenda-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.punto-leyenda {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.leyenda-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.l-nombre {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--texto-principal);
}
.l-valores {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
}

/* STOCK INDICADORES */
.stock-indicador {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
}
.stock-indicador.bajo {
  background: rgba(231, 76, 60, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(231, 76, 60, 0.2);
}
.stock-indicador.normal {
  background: rgba(46, 204, 113, 0.1);
  color: var(--color-exito);
  border: 1px solid rgba(46, 204, 113, 0.2);
}

/* MEDIA QUERIES RESPONSIVAS PREMIUM */
@media (max-width: 768px) {
  .vista-cabecera {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .vista-titulo {
    font-size: 1.5rem;
  }
  .vista-subtitulo {
    font-size: 0.85rem;
  }
  
  /* Celular: Cuadrícula ultra compacta a 2 columnas para vistazo rápido sin ocupar toda la pantalla */
  .grid-resumen {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }
  .tarjeta-estadistica {
    padding: 12px;
    min-height: 80px;
    gap: 10px;
    border-radius: 16px;
  }
  .icono-est {
    padding: 8px;
    border-radius: 10px;
  }
  .icono-est svg {
    width: 20px;
    height: 20px;
  }
  .info-est h2 {
    font-size: 1.25rem;
    margin: 0;
  }
  .info-est h3 {
    font-size: 0.65rem;
    letter-spacing: 0.5px;
  }
  .info-est p {
    font-size: 0.68rem;
    display: none; /* Ocultar subtextos para optimizar la densidad en pantallas pequeñas */
  }

  /* Gráficos en Celular */
  .grid-graficos {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 20px;
  }
  .tarjeta-grafico {
    padding: 18px;
    border-radius: 20px;
  }
  .grafico-titulo {
    font-size: 1.05rem;
  }
  .subtexto-grafico {
    font-size: 0.75rem;
  }
  .grafico-contenido-anillos {
    flex-direction: column;
    gap: 16px;
    align-items: center;
    text-align: center;
  }
  .anillos-leyenda {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    width: 100%;
  }
  .leyenda-item {
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
  }
  .l-nombre {
    font-size: 0.75rem;
  }
  .l-valores {
    font-size: 0.7rem;
  }

  /* Modales Pantalla Completa en Celular */
  .modal-fs-header {
    padding: 16px 20px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .modal-fs-header h2 {
    font-size: 1.2rem;
  }
  .btn-cerrar-fs {
    padding: 8px 16px;
    font-size: 0.8rem;
    border-radius: 10px;
  }
  .modal-fs-body {
    padding: 20px 15px;
  }

  /* Tablas en Celular */
  .tabla-admin th {
    padding: 12px 14px;
    font-size: 0.7rem;
  }
  .tabla-admin td {
    padding: 14px 14px;
    font-size: 0.85rem;
  }
}

/* GRÁFICO DE COLUMNAS VERTICALES */
.grafico-contenido-columnas {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 260px;
  width: 100%;
  padding-top: 20px;
}
.contenedor-columnas {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  width: 100%;
  gap: 12px;
}
.columna-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 80px;
  position: relative;
}
.columna-barra-pista {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px 8px 0 0;
  width: 100%;
  height: 160px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  position: relative;
}
.columna-barra-progreso {
  width: 100%;
  border-radius: 6px 6px 0 0;
  transition: height 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  cursor: pointer;
}
.columna-barra-progreso:hover {
  filter: brightness(1.2) drop-shadow(0 0 8px rgba(170, 59, 255, 0.4));
}
.columna-brillo {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px 6px 0 0;
}
.columna-valor-tooltip {
  font-size: 0.78rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
  background: rgba(17, 17, 17, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  font-family: monospace;
}
.columna-nombre-eje {
  font-size: 0.75rem;
  color: var(--texto-secundario);
  font-weight: 700;
  margin-top: 8px;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* ============================================
   SECCIÓN BILLETERA DIGITAL
============================================ */
.seccion-billetera {
  margin-top: 40px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(157, 78, 221, 0.2);
  border-radius: 20px;
  box-shadow: 0 0 40px rgba(157, 78, 221, 0.05);
}

.sb-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}
.sb-titulo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sb-titulo-area h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: white;
}

.btn-ver-historial {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(157, 78, 221, 0.1);
  border: 1px solid rgba(157, 78, 221, 0.3);
  color: var(--morado-brillante);
  padding: 8px 18px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ver-historial:hover {
  background: var(--morado-brillante);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
}
.btn-ver-historial:active {
  transform: translateY(0) scale(0.98);
}
.btn-ver-historial:focus-visible {
  outline: none;
  box-shadow: var(--anillo-foco);
}

/* GRID DE KPIs */
.grid-kpi-billetera {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 30px;
}

@media (max-width: 768px) {
  .grid-kpi-billetera { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .grid-kpi-billetera { grid-template-columns: 1fr; }
}

.kbi-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-left-width: 4px;
  border-left-style: solid;
  transition: transform 0.2s, box-shadow 0.2s;
}
.kbi-card:hover {
  transform: translateY(-3px);
  border-color: rgba(168, 85, 247, 0.2);
  box-shadow: 0 12px 28px rgba(10, 4, 20, 0.4), 0 0 18px rgba(168, 85, 247, 0.1);
}
.kbi-morado { border-left-color: var(--morado-brillante); }
.kbi-verde  { border-left-color: var(--color-exito); }
.kbi-azul   { border-left-color: var(--morado-medio); }
.kbi-rojo   { border-left-color: var(--color-error); }
.kbi-amarillo { border-left-color: var(--color-alerta); }
.kbi-rosa   { border-left-color: var(--rosa-acento); }

.kbi-icono {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}
.kbi-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.kbi-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.kbi-valor {
  font-size: 1.4rem;
  font-weight: 900;
  color: white;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

/* GRID GRAFICOS BILLETERA */
.grid-graficos-billetera {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}
@media (max-width: 1024px) {
  .grid-graficos-billetera { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .grid-graficos-billetera { grid-template-columns: 1fr; }
}

/* HISTORIAL DE RECARGAS */
.historial-recargas-panel {
  margin-top: 20px;
  background: rgba(0,0,0,0.2);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.05);
}
.hr-titulo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 15px 0;
  color: white;
  font-size: 1.05rem;
  font-weight: 800;
}

/* ============================================
   AJUSTES RESPONSIVOS ADICIONALES
   (tablet 481-1024px y celular <=480px)
   Solo padding/anchos/overflow; sin tocar diseño de escritorio.
============================================ */

/* TABLET: reducir el padding fijo de la sección billetera para que
   no desborde en anchos medianos manteniendo el look de escritorio. */
@media (max-width: 1024px) {
  .seccion-billetera {
    padding: 24px;
  }
  .modal-fs-header {
    padding: 20px 28px;
  }
  .modal-fs-body {
    padding: 28px;
  }
}

/* CELULAR (<=480px): padding compacto en modales a pantalla completa,
   controles de filtro a ancho completo para toques cómodos y
   secciones con padding reducido para evitar desbordes horizontales. */
@media (max-width: 480px) {
  .modal-fs-header {
    padding: 14px 14px;
  }
  .modal-fs-header h2 {
    font-size: 1.05rem;
  }
  /* El contenedor de filtros de fecha ocupa toda la fila y se apila */
  .modal-fs-header > div {
    width: 100%;
  }
  .input-filtro {
    flex: 1 1 45%;
    min-width: 0;
    width: 100%;
    padding: 10px 12px;
  }
  .btn-cerrar-fs,
  .btn-limpiar-filtro {
    min-height: 40px;
  }
  .modal-fs-body {
    /* Padding lateral mínimo: la tabla ya scrollea con .tabla-contenedor */
    padding: 14px 10px;
  }

  /* Tablas: apretar aún más celdas para reducir scroll horizontal */
  .tabla-admin th {
    padding: 10px 12px;
    font-size: 0.68rem;
  }
  .tabla-admin td {
    padding: 12px 12px;
    font-size: 0.82rem;
  }

  /* Sección Billetera y panel de historial: padding reducido */
  .seccion-billetera {
    padding: 18px 14px;
    margin-top: 28px;
  }
  .sb-titulo-area h3 {
    font-size: 1.15rem;
  }
  .btn-ver-historial {
    width: 100%;
    justify-content: center;
    min-height: 40px;
  }
  .historial-recargas-panel {
    padding: 14px 12px;
  }

  /* Alerta de stock: apilar icono y contenido para no desbordar */
  .alerta-stock-bajo {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
}

/* ============================================
   ACCESIBILIDAD: respetar reduce-motion.
   Desactiva pulsos perpetuos y animaciones de entrada/dibujo
   sin afectar la funcionalidad ni el layout.
============================================ */
@media (prefers-reduced-motion: reduce) {
  .alerta-stock-bajo,
  .punto-alerta,
  .linea-tendencia-neon,
  .torta-sector,
  .barra-progreso,
  .columna-barra-progreso,
  .modal-fullscreen {
    animation: none !important;
    transition: none !important;
  }
  .linea-tendencia-neon {
    stroke-dashoffset: 0 !important;
  }
}
</style>

