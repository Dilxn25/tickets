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
        <div class="rango-fecha"><BaseFecha v-model="filtroDesde" placeholder="Inicio" :max="filtroHasta || ''" @update:model-value="cambioFechaManual" /></div>
        <label class="etiqueta-filtro">Hasta</label>
        <div class="rango-fecha"><BaseFecha v-model="filtroHasta" placeholder="Hoy" :min="filtroDesde || ''" @update:model-value="cambioFechaManual" /></div>
        <label class="etiqueta-filtro">Evento</label>
        <div class="filtro-evento">
          <BaseSelect :model-value="eventoFiltro" :options="opcionesEventos" placeholder="Todos los eventos" @update:model-value="cambioEvento" />
        </div>
      </div>
    </div>

    <!-- Aviso de filtro por evento activo -->
    <div v-if="eventoFiltro" class="chip-evento-activo fade-in">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      Reporte del evento: <strong>{{ nombreEventoFiltro }}</strong>
      <button class="btn-limpiar-filtro" @click="cambioEvento('')">Quitar filtro</button>
    </div>

    <!-- BARRA DE PESTAÑAS (híbrido: pestañas + denso + dos columnas) -->
    <nav class="rep-tabs" role="tablist">
      <button v-for="t in pestanas" :key="t.id" class="rep-tab" :class="{ activo: pestana === t.id }"
              role="tab" :aria-selected="pestana === t.id" @click="pestana = t.id">{{ t.nombre }}</button>
    </nav>

    <!-- ============ PESTAÑA: GENERAL ============ -->
    <div v-if="pestana === 'general'" class="rep-panel fade-in">
      <!-- Franja compacta de KPIs -->
      <div class="grid-resumen rep-kpis-strip escalonar">
        <div class="tarjeta-estadistica bg-clientes" @click="abrirModal('clientes')">
          <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
          <div class="info-est"><h3>Clientes</h3><h2>{{ stats.clientes }}</h2><p>Ver detalles</p></div>
        </div>
        <div class="tarjeta-estadistica bg-personal" @click="pestana = 'personal'">
          <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
          <div class="info-est"><h3>Personal</h3><h2>{{ stats.personal }}</h2><p>Ver desempeño</p></div>
        </div>
        <div class="tarjeta-estadistica bg-ventas" @click="pestana = 'ventas'">
          <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
          <div class="info-est"><h3>Ventas Totales</h3><h2>Bs. {{ stats.ingresosTotales.toFixed(2) }}</h2><p>Ver transacciones</p></div>
        </div>
        <div class="tarjeta-estadistica bg-productos" @click="pestana = 'productos'">
          <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
          <div class="info-est"><h3>Inventario</h3><h2>{{ stats.productos }}</h2><p>Ver ranking</p></div>
        </div>
        <div class="tarjeta-estadistica bg-eventos" @click="pestana = 'eventos'">
          <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
          <div class="info-est"><h3>Eventos</h3><h2>{{ stats.eventos }}</h2><p>Ver por evento</p></div>
        </div>
        <div class="tarjeta-estadistica bg-asistencia" @click="pestana = 'eventos'">
          <div class="icono-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
          <div class="info-est"><h3>Asistencia</h3><h2>{{ stats.asistencia }}</h2><p>Personas ingresadas</p></div>
        </div>
      </div>

      <!-- Dos columnas densas -->
      <div class="rep-dos-col">
        <div class="rep-col-main">
          <div class="rep-seccion-head">
            <h3 class="rep-seccion-titulo">Analítica en vivo</h3>
            <span class="rep-seccion-sub">Ventas y categorías</span>
            <span class="rep-seccion-linea"></span>
          </div>
      <!-- 1. Tendencia de Ventas (Gráfico 2D vectorizado en neon) -->
      <div class="tarjeta-grafico">
        <div class="grafico-header">
          <div class="grafico-header-info">
            <h3 class="grafico-titulo">Tendencia de Ventas</h3>
            <span class="subtexto-grafico">Curva de ingresos de las últimas comandas cobradas</span>
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
        </div><!-- /rep-col-main -->

        <div class="rep-col-side">
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

              <!-- Sin etiquetas sobre la torta: se solapaban entre sectores;
                   los porcentajes van en la leyenda de la derecha -->
              <circle cx="100" cy="100" r="30" fill="var(--fondo-tarjeta)" />
              <text x="100" y="96" fill="#fff" font-size="13" font-weight="900" text-anchor="middle" class="texto-nodo-grafico">{{ conteoEfectivo + conteoQR + conteoBilletera }}</text>
              <text x="100" y="112" fill="rgba(255,255,255,0.55)" font-size="8" font-weight="700" text-anchor="middle" class="texto-nodo-grafico">COBROS</text>
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

      <!-- Mini-resumen de billetera (atajo a la pestaña) -->
      <div class="tarjeta-grafico rep-mini-billetera" role="button" tabindex="0"
           @click="pestana = 'billetera'" @keyup.enter="pestana = 'billetera'">
        <div class="grafico-header">
          <div class="grafico-header-info">
            <h3 class="grafico-titulo">Billetera Digital</h3>
            <span class="subtexto-grafico">Resumen — toca para ver todo</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        </div>
        <div class="rep-mini-kpis">
          <div class="rep-mini-kpi"><span class="rmk-label">Saldo circulante</span><span class="rmk-valor">Bs. {{ (reporteBilletera.billeteras?.saldo_circulante ?? 0).toFixed(2) }}</span></div>
          <div class="rep-mini-kpi"><span class="rmk-label">Recargas</span><span class="rmk-valor">{{ reporteBilletera.recargas?.total_operaciones ?? 0 }}</span></div>
          <div class="rep-mini-kpi"><span class="rmk-label">Consumido</span><span class="rmk-valor">Bs. {{ (reporteBilletera.uso_billetera?.monto_consumido ?? 0).toFixed(0) }}</span></div>
          <div class="rep-mini-kpi"><span class="rmk-label">Pedidos con billetera</span><span class="rmk-valor">{{ reporteBilletera.uso_billetera?.pedidos_pagados ?? 0 }}</span></div>
        </div>
      </div>

      <!-- Alerta de inventario crítico -->
      <div v-if="productosBajoStock.length > 0" class="alerta-stock-bajo">
        <div class="alerta-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="alerta-contenido">
          <h4>Inventario crítico</h4>
          <p class="alerta-subtexto">Bajo el umbral de reposición ({{ UMBRAL_STOCK_BAJO }} uds.)</p>
          <div class="alerta-productos-lista">
            <span v-for="prod in productosBajoStock" :key="prod.id_producto" class="alerta-producto-badge">
              <span class="punto-alerta"></span>
              <strong>{{ prod.nombre_producto }}</strong>: {{ prod.stock_actual }}
            </span>
          </div>
        </div>
      </div>

        </div><!-- /rep-col-side -->
      </div><!-- /rep-dos-col -->
    </div><!-- /panel general -->

    <!-- ============ PESTAÑA: VENTAS ============ -->
    <div v-if="pestana === 'ventas'" class="rep-panel fade-in">
      <div class="rep-kpis-inline escalonar">
        <div class="kbi-card kbi-verde">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
          <div class="kbi-info"><span class="kbi-label">Ingresos del periodo</span><span class="kbi-valor">Bs. {{ stats.ingresosTotales.toFixed(2) }}</span></div>
        </div>
        <div class="kbi-card kbi-morado">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
          <div class="kbi-info"><span class="kbi-label">Cobros realizados</span><span class="kbi-valor">{{ totalCobros }}</span></div>
        </div>
        <div class="kbi-card kbi-azul">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
          <div class="kbi-info"><span class="kbi-label">Ticket promedio</span><span class="kbi-valor">Bs. {{ ticketPromedio.toFixed(2) }}</span></div>
        </div>
        <div class="kbi-card kbi-amarillo">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></div>
          <div class="kbi-info"><span class="kbi-label">Método principal</span><span class="kbi-valor">{{ metodoTop }}</span></div>
        </div>
      </div>
      <div class="rep-dos-col">
        <div class="rep-col-main rep-col-lista">
      <div class="tarjeta-grafico">
        <div class="grafico-header">
          <div class="grafico-header-info">
            <h3 class="grafico-titulo">Últimas Ventas</h3>
            <span class="subtexto-grafico">Las 8 más recientes del periodo — el detalle completo se abre aparte</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla-admin">
            <thead>
              <tr><th>ID</th><th>Fecha y Hora</th><th>Cliente</th><th>Atendido Por</th><th>Método Pago</th><th>Total (Bs)</th></tr>
            </thead>
            <tbody>
              <tr v-for="venta in ventas.slice(0, 8)" :key="venta.id_comanda">
                <td>#{{ venta.id_comanda }}</td>
                <td>{{ formatearFecha(venta.fecha_registro) }}</td>
                <td>
                  <span v-if="venta.usuario_comanda_id_clienteTousuario">{{ venta.usuario_comanda_id_clienteTousuario.nombres }}</span>
                  <span v-else class="texto-sutil">Sin registro / Barra</span>
                </td>
                <td>{{ venta.usuario_comanda_id_meseroTousuario?.nombres || '—' }}</td>
                <td><span :class="['badge-pago', venta.metodo_pago.toLowerCase().replace(' ', '-')]">{{ venta.metodo_pago }}</span></td>
                <td style="font-weight:bold; color:var(--color-exito);">Bs. {{ (venta.subtotal || 0).toFixed(2) }}</td>
              </tr>
              <tr v-if="ventas.length === 0"><td colspan="6" class="texto-centro">No hay ventas registradas en este periodo.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="rep-ver-mas">
          <span>Mostrando 8 de {{ ventasTotal }} comandas</span>
          <button class="btn-ver-historial" @click="abrirModal('ventas')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
            Ver detalle completo
          </button>
        </div>
      </div>
        </div><!-- /col-main ventas -->

        <div class="rep-col-side">
          <!-- Ventas por día -->
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Ventas por Día</h3>
                <span class="subtexto-grafico">Últimos {{ dias7.length }} días con actividad</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <div class="grafico-contenido-columnas">
              <div v-if="dias7.length" class="contenedor-columnas">
                <div v-for="d in dias7" :key="d.dia" class="columna-item">
                  <span class="columna-valor-tooltip">{{ montoCorto(d.total) }}</span>
                  <div class="columna-barra-pista">
                    <div class="columna-barra-progreso" :style="{ height: (d.total / maxDiaTotal * 100) + '%', background: 'linear-gradient(180deg, var(--rosa-acento), var(--morado-brillante))' }">
                      <div class="columna-brillo"></div>
                    </div>
                  </div>
                  <span class="columna-nombre-eje">{{ etiquetaDia(d.dia) }}</span>
                </div>
              </div>
              <div v-else class="texto-sutil texto-centro" style="padding:24px 0">Sin ventas en este periodo.</div>
            </div>
          </div>

          <!-- Horas pico -->
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Horas Pico</h3>
                <span class="subtexto-grafico">Franjas horarias que más facturan</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="grafico-contenido">
              <div v-for="h in topHoras" :key="h.hora" class="fila-barra">
                <div class="barra-etiqueta">
                  <span class="categoria-nombre">{{ String(h.hora).padStart(2, '0') }}:00 – {{ String((h.hora + 1) % 24).padStart(2, '0') }}:00</span>
                  <span class="categoria-monto">Bs. {{ montoCorto(h.total) }} · {{ h.cantidad }} com.</span>
                </div>
                <div class="barra-pista">
                  <div class="barra-progreso" :style="{ width: (h.total / maxHoraTotal * 100) + '%', background: 'var(--gradiente-marca)' }"></div>
                </div>
              </div>
              <div v-if="topHoras.length === 0" class="texto-sutil texto-centro" style="padding:24px 0">Sin datos horarios.</div>
            </div>
          </div>
        </div><!-- /col-side ventas -->
      </div><!-- /dos-col ventas -->
    </div>

    <!-- ============ PESTAÑA: PERSONAL ============ -->
    <div v-if="pestana === 'personal'" class="rep-panel fade-in">
      <div class="rep-kpis-inline escalonar">
        <div class="kbi-card kbi-morado">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="8" r="6"></circle><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"></path></svg></div>
          <div class="kbi-info"><span class="kbi-label">Mejor desempeño</span><span class="kbi-valor">{{ topMesero ? topMesero.nombre.split(' ')[0] : '—' }}</span></div>
        </div>
        <div class="kbi-card kbi-verde">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
          <div class="kbi-info"><span class="kbi-label">Cobrado por el líder</span><span class="kbi-valor">Bs. {{ topMesero ? topMesero.total.toFixed(2) : '0.00' }}</span></div>
        </div>
        <div class="kbi-card kbi-azul">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
          <div class="kbi-info"><span class="kbi-label">Promedio por mesero</span><span class="kbi-valor">Bs. {{ promedioMesero.toFixed(2) }}</span></div>
        </div>
        <div class="kbi-card kbi-rosa">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
          <div class="kbi-info"><span class="kbi-label">Equipo registrado</span><span class="kbi-valor">{{ stats.personal }}</span></div>
        </div>
      </div>
      <div class="rep-dos-col">
        <div class="rep-col-main">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Desempeño del Personal</h3>
                <span class="subtexto-grafico">Ingresos cobrados por mesero</span>
              </div>
              <div class="rep-filtro-inline" style="min-width:200px">
                <BaseSelect v-model="meseroSel" :options="opcionesMeseros" placeholder="Todos los meseros" />
              </div>
            </div>
            <div class="grafico-contenido">
              <!-- Participación total en una sola barra apilada -->
              <div v-if="!meseroSel && datosMeseros.length > 1" class="rep-stack">
                <div v-for="m in datosMeseros" :key="'s' + m.nombre" class="rep-stack-seg"
                     :style="{ width: Math.max(m.participacion, 2) + '%', background: m.color }"
                     :title="`${m.nombre}: ${m.participacion}%`"></div>
              </div>
              <div v-for="m in meserosFiltrados" :key="m.nombre" class="fila-barra">
                <div class="barra-etiqueta">
                  <span class="categoria-nombre">{{ m.nombre }}</span>
                  <span class="categoria-monto">Bs. {{ m.total.toFixed(2) }}</span>
                </div>
                <div class="barra-pista">
                  <div class="barra-progreso" :style="{ width: (m.total / maxMeseroTotal * 100) + '%', background: m.color }"></div>
                </div>
                <div class="rep-sub-barra">
                  <span>{{ m.cantidad }} comandas</span>
                  <span>Ticket prom. Bs. {{ m.cantidad ? (m.total / m.cantidad).toFixed(2) : '0.00' }}</span>
                  <span>{{ m.participacion }}% del total</span>
                </div>
              </div>
              <div v-if="meserosFiltrados.length === 0" class="texto-sutil texto-centro" style="padding:24px 0">Sin ventas por mesero en este periodo.</div>
            </div>
          </div>
        </div>
        <div class="rep-col-side">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Equipo</h3>
                <span class="subtexto-grafico">{{ listadoPersonal.length }} personas registradas</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div class="tabla-contenedor">
              <table class="tabla-admin">
                <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th></tr></thead>
                <tbody>
                  <tr v-for="u in listadoPersonal.slice(0, 5)" :key="u.id_usuario">
                    <td style="font-weight:600;">{{ u.nombres }} {{ u.apellidos }}</td>
                    <td>{{ u.rol }}</td>
                    <td><span :class="['badge-pago', u.estado_cuenta === 'activo' ? 'activo' : 'finalizado']">{{ u.estado_cuenta }}</span></td>
                  </tr>
                  <tr v-if="listadoPersonal.length === 0"><td colspan="3" class="texto-centro">Sin personal registrado.</td></tr>
                </tbody>
              </table>
            </div>
            <div v-if="listadoPersonal.length > 5" class="rep-ver-mas">
              <span>5 de {{ listadoPersonal.length }}</span>
              <button class="btn-ver-historial" @click="abrirModal('personal')">Ver todo el personal</button>
            </div>
          </div>

          <!-- Incidentes de reposición: quiénes rompen/derraman más y cuánto cuesta -->
          <div class="tarjeta-grafico" style="margin-top: 16px;">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Incidentes de reposición</h3>
                <span class="subtexto-grafico">Productos repuestos por descuido (no son ventas)</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><path d="M12 2.7 6.2 8.5a8 8 0 1 0 11.6 0z"></path><path d="M12 12v4"></path><path d="M12 19h.01"></path></svg>
            </div>
            <div class="tabla-contenedor">
              <table class="tabla-admin">
                <thead><tr><th>Responsable</th><th>Incidentes</th><th>Unidades</th><th>Costo est.</th></tr></thead>
                <tbody>
                  <tr v-for="r in resumenReposiciones" :key="r.id_usuario">
                    <td style="font-weight:600;">{{ r.nombre }} <span class="texto-sutil" style="font-size:0.72rem">{{ r.rol }}</span></td>
                    <td>{{ r.incidentes }}</td>
                    <td>{{ r.unidades }}</td>
                    <td>Bs. {{ r.costo_estimado.toFixed(2) }}</td>
                  </tr>
                  <tr v-if="resumenReposiciones.length === 0"><td colspan="4" class="texto-centro">Sin reposiciones registradas. Buena señal: nadie rompió nada.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ PESTAÑA: PRODUCTOS ============ -->
    <div v-if="pestana === 'productos'" class="rep-panel fade-in">
      <div class="rep-kpis-inline escalonar">
        <div class="kbi-card kbi-morado">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
          <div class="kbi-info"><span class="kbi-label">Productos en inventario</span><span class="kbi-valor">{{ stats.productos }}</span></div>
        </div>
        <div class="kbi-card kbi-verde">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
          <div class="kbi-info"><span class="kbi-label">Unidades vendidas</span><span class="kbi-valor">{{ unidadesVendidas }}</span></div>
        </div>
        <div class="kbi-card kbi-amarillo">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
          <div class="kbi-info"><span class="kbi-label">Más vendido</span><span class="kbi-valor kbi-valor-texto">{{ productoTop ? productoTop.nombre_producto : '—' }}</span></div>
        </div>
        <div class="kbi-card kbi-rojo">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
          <div class="kbi-info"><span class="kbi-label">Stock crítico</span><span class="kbi-valor">{{ productosBajoStock.length }}</span></div>
        </div>
      </div>
      <div class="rep-dos-col">
        <div class="rep-col-main rep-col-lista">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Ranking de Productos</h3>
                <span class="subtexto-grafico">De más a menos vendidos en el periodo</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <div class="tabla-contenedor">
              <table class="tabla-admin">
                <thead>
                  <tr><th style="width:60px; text-align:center;">#</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Vendido</th><th>Ingresos (Bs)</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(prod, idx) in listadoProductosRanking.slice(0, 5)" :key="prod.id_producto">
                    <td style="font-weight:800; text-align:center;" :style="idx < 3 ? 'color:var(--color-alerta)' : 'color:rgba(255,255,255,0.4)'">{{ idx + 1 }}</td>
                    <td style="font-weight:700; color:var(--texto-principal);">{{ prod.nombre_producto }}</td>
                    <td><span class="badge-pago planificado">{{ prod.nombre_categoria }}</span></td>
                    <td><span :class="['stock-indicador', prod.stock_actual <= UMBRAL_STOCK_BAJO ? 'bajo' : 'normal']">{{ prod.stock_actual }}</span></td>
                    <td style="font-weight:700; color:var(--morado-brillante);">{{ prod.vecesVendido }} uds.</td>
                    <td style="font-weight:bold; color:var(--color-exito);">Bs. {{ (prod.ingresosGenerados || 0).toFixed(2) }}</td>
                  </tr>
                  <tr v-if="listadoProductosRanking.length === 0"><td colspan="6" class="texto-centro">No hay productos registrados.</td></tr>
                </tbody>
              </table>
            </div>
            <div v-if="listadoProductosRanking.length > 5" class="rep-ver-mas">
              <span>Top 5 de {{ listadoProductosRanking.length }} productos</span>
              <button class="btn-ver-historial" @click="abrirModal('productos')">Ver ranking completo</button>
            </div>
          </div>
        </div>
        <div class="rep-col-side">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Top 5 por Ingresos</h3>
                <span class="subtexto-grafico">Los que más dinero generan</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div class="grafico-contenido">
              <div v-for="(p, i) in top5Ingresos" :key="p.id_producto" class="fila-barra">
                <div class="barra-etiqueta">
                  <span class="categoria-nombre">{{ p.nombre_producto }}</span>
                  <span class="categoria-monto">Bs. {{ (p.ingresosGenerados || 0).toFixed(0) }}</span>
                </div>
                <div class="barra-pista">
                  <div class="barra-progreso" :style="{
                    width: ((p.ingresosGenerados || 0) / maxIngresoProd * 100) + '%',
                    background: ['var(--morado-brillante)','var(--rosa-acento)','var(--color-info)','var(--color-exito)','var(--color-alerta)'][i]
                  }"></div>
                </div>
              </div>
              <div v-if="top5Ingresos.length === 0" class="texto-sutil texto-centro" style="padding:24px 0">Sin ventas en este periodo.</div>
            </div>
          </div>
          <div v-if="productosBajoStock.length > 0" class="alerta-stock-bajo">
            <div class="alerta-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div class="alerta-contenido">
              <h4>Reponer pronto</h4>
              <p class="alerta-subtexto">Bajo el umbral de {{ UMBRAL_STOCK_BAJO }} uds.</p>
              <div class="alerta-productos-lista">
                <span v-for="prod in productosBajoStock" :key="prod.id_producto" class="alerta-producto-badge">
                  <span class="punto-alerta"></span>
                  <strong>{{ prod.nombre_producto }}</strong>: {{ prod.stock_actual }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ PESTAÑA: PRECIOS (Fase 8) ============ -->
    <div v-if="pestana === 'precios'" class="rep-panel fade-in">
      <div class="rep-kpis-inline escalonar">
        <div class="kbi-card kbi-morado">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
          <div class="kbi-info"><span class="kbi-label">Cambios de precio</span><span class="kbi-valor">{{ preciosKpis.total }}</span></div>
        </div>
        <div class="kbi-card kbi-verde">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
          <div class="kbi-info"><span class="kbi-label">Subidas</span><span class="kbi-valor">{{ preciosKpis.subidas }}</span></div>
        </div>
        <div class="kbi-card kbi-rojo">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg></div>
          <div class="kbi-info"><span class="kbi-label">Bajadas</span><span class="kbi-valor">{{ preciosKpis.bajadas }}</span></div>
        </div>
        <div class="kbi-card kbi-amarillo">
          <div class="kbi-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"></path><path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z"></path></svg></div>
          <div class="kbi-info"><span class="kbi-label">Hechos por la IA</span><span class="kbi-valor">{{ preciosKpis.ia }}</span></div>
        </div>
      </div>
      <div class="rep-dos-col">
        <div class="rep-col-main rep-col-lista">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Cambios de precio recientes</h3>
                <span class="subtexto-grafico">Quién cambió qué, cuándo y de cuánto a cuánto</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="tabla-contenedor">
              <table class="tabla-admin">
                <thead>
                  <tr><th>Fecha</th><th>Producto</th><th>Cambio</th><th>Origen</th><th>Usuario</th></tr>
                </thead>
                <tbody>
                  <tr v-for="c in preciosDatos.cambios.slice(0, 5)" :key="c.id_historial">
                    <td style="white-space:nowrap">{{ formatearFechaPrecio(c.fecha_hora) }}</td>
                    <td style="font-weight:700; color:var(--texto-principal);">{{ c.producto }}</td>
                    <td style="white-space:nowrap; font-weight:700;" :style="{ color: colorCambioPrecio(c) }">
                      <template v-if="c.precio_anterior !== null">Bs. {{ c.precio_anterior.toFixed(2) }} → </template>Bs. {{ c.precio_nuevo.toFixed(2) }}
                    </td>
                    <td><span class="badge-pago planificado">{{ etiquetaOrigenPrecio(c.origen) }}</span></td>
                    <td>{{ c.usuario }}</td>
                  </tr>
                  <tr v-if="preciosDatos.cambios.length === 0"><td colspan="5" class="texto-centro">Sin cambios de precio en este periodo.</td></tr>
                </tbody>
              </table>
            </div>
            <div v-if="preciosDatos.cambios.length > 5" class="rep-ver-mas">
              <span>Últimos 5 de {{ preciosDatos.total }} registros</span>
              <button class="btn-ver-historial" @click="abrirModal('precios')">Ver historial completo</button>
            </div>
          </div>
        </div>
        <div class="rep-col-side">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Productos con más cambios</h3>
                <span class="subtexto-grafico">Los precios que más se han movido</span>
              </div>
            </div>
            <div class="grafico-contenido">
              <div v-for="(p, i) in preciosMasMovidos" :key="p.nombre" class="fila-barra">
                <div class="barra-etiqueta">
                  <span class="categoria-nombre">{{ p.nombre }}</span>
                  <span class="categoria-monto">{{ p.n }} cambio(s)</span>
                </div>
                <div class="barra-pista">
                  <div class="barra-progreso" :style="{
                    width: (p.n / maxCambiosProd * 100) + '%',
                    background: ['var(--morado-brillante)','var(--rosa-acento)','var(--color-info)','var(--color-exito)','var(--color-alerta)'][i]
                  }"></div>
                </div>
              </div>
              <div v-if="preciosMasMovidos.length === 0" class="texto-sutil texto-centro" style="padding:24px 0">
                Todavía no hay cambios de precio (solo los registros iniciales). Cambia un precio o haz una promo y aparecerá aquí.
              </div>
            </div>
          </div>
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">¿Cómo se vendió a cada precio?</h3>
                <span class="subtexto-grafico">Detalle por producto</span>
              </div>
            </div>
            <p class="texto-sutil" style="font-size:.85rem; line-height:1.5">
              En <strong>Productos</strong>, cada tarjeta tiene el botón de historial (reloj):
              ahí ves la línea de tiempo del producto y cuántas unidades se vendieron a cada precio.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ PESTAÑA: EVENTOS ============ -->
    <div v-if="pestana === 'eventos'" class="rep-panel fade-in">
      <div class="rep-dos-col">
        <div class="rep-col-main rep-col-lista">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Reporte por Evento</h3>
                <span class="subtexto-grafico">Asistencia y ventas estimadas de cada evento</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div class="tabla-contenedor">
              <table class="tabla-admin">
                <thead>
                  <tr><th>Evento</th><th>Fecha Inicio</th><th>Estado</th><th>Asistencia</th><th>Ventas Estimadas</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="ev in listadoEventos.slice(0, 5)" :key="ev.id_evento">
                    <td style="font-weight:600; color:var(--morado-brillante);">{{ ev.nombre_evento }}</td>
                    <td>{{ formatearFecha(ev.fecha_hora_inicio) }}</td>
                    <td><span :class="['badge-pago', ev.estado]">{{ ev.estado }}</span></td>
                    <td style="font-weight:600;">{{ ev.asistenciaReal || 0 }} pers.</td>
                    <td style="font-weight:bold; color:var(--color-exito);">Bs. {{ (ev.ventasReales || 0).toFixed(2) }}</td>
                    <td><button class="btn-ver-historial btn-mini" @click="verVentasDeEvento(ev)">Qué se vendió</button></td>
                  </tr>
                  <tr v-if="listadoEventos.length === 0"><td colspan="6" class="texto-centro">No hay eventos registrados.</td></tr>
                </tbody>
              </table>
            </div>
            <div v-if="listadoEventos.length > 5" class="rep-ver-mas">
              <span>5 de {{ listadoEventos.length }} eventos</span>
              <button class="btn-ver-historial" @click="abrirModal('eventos')">Ver todos los eventos</button>
            </div>
          </div>
        </div>
        <div class="rep-col-side">
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Ventas por Evento</h3>
                <span class="subtexto-grafico">Comparativa de facturación</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div class="grafico-contenido">
              <div v-for="(ev, i) in listadoEventos" :key="'v' + ev.id_evento" class="fila-barra">
                <div class="barra-etiqueta">
                  <span class="categoria-nombre">{{ ev.nombre_evento }}</span>
                  <span class="categoria-monto">Bs. {{ (ev.ventasReales || 0).toFixed(0) }}</span>
                </div>
                <div class="barra-pista">
                  <div class="barra-progreso" :style="{
                    width: ((ev.ventasReales || 0) / maxVentasEvento * 100) + '%',
                    background: ['var(--morado-brillante)','var(--rosa-acento)','var(--color-info)','var(--color-exito)','var(--color-alerta)'][i % 5]
                  }"></div>
                </div>
              </div>
              <div v-if="listadoEventos.length === 0" class="texto-sutil texto-centro" style="padding:24px 0">Sin eventos.</div>
            </div>
          </div>
          <div class="tarjeta-grafico">
            <div class="grafico-header">
              <div class="grafico-header-info">
                <h3 class="grafico-titulo">Asistencia por Evento</h3>
                <span class="subtexto-grafico">Personas que ingresaron</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="texto-sutil"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div class="grafico-contenido">
              <div v-for="ev in listadoEventos" :key="'a' + ev.id_evento" class="fila-barra">
                <div class="barra-etiqueta">
                  <span class="categoria-nombre">{{ ev.nombre_evento }}</span>
                  <span class="categoria-monto">{{ ev.asistenciaReal || 0 }} pers.</span>
                </div>
                <div class="barra-pista">
                  <div class="barra-progreso" :style="{ width: ((ev.asistenciaReal || 0) / maxAsistEvento * 100) + '%', background: 'var(--color-info)' }"></div>
                </div>
              </div>
              <div v-if="listadoEventos.length === 0" class="texto-sutil texto-centro" style="padding:24px 0">Sin eventos.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bloque de KPIs antiguo desactivado (ahora vive en la pestaña General) -->
    <div v-if="false" class="grid-resumen fade-in escalonar">
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

    <!-- Alerta antigua desactivada (ahora vive en la pestaña General) -->
    <div v-if="false" class="alerta-stock-bajo fade-in">
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
                    <span :class="['stock-indicador', prod.stock_actual <= UMBRAL_STOCK_BAJO ? 'bajo' : 'normal']">
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

      <!-- Modal Historial de Precios completo (Fase 8) -->
      <div v-if="modalActivo === 'precios'" class="modal-fullscreen fade-in">
        <div class="modal-fs-header">
          <h2>Historial completo de cambios de precio</h2>
          <button class="btn-cerrar-fs" @click="modalActivo = null"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cerrar</button>
        </div>
        <div class="modal-fs-body">
          <div class="tabla-contenedor">
            <table class="tabla-admin">
              <thead>
                <tr><th>Fecha y hora</th><th>Producto</th><th>Tipo</th><th>Cambio</th><th>Origen</th><th>Usuario</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in preciosDatos.cambios" :key="c.id_historial">
                  <td style="white-space:nowrap">{{ formatearFechaPrecio(c.fecha_hora) }}</td>
                  <td style="font-weight:700; color:var(--texto-principal);">
                    {{ c.producto }} <span v-if="c.es_combo" class="badge-pago planificado" style="margin-left:4px">Combo</span>
                  </td>
                  <td>{{ c.tipo === 'promocion' ? 'Promoción' : 'Base' }}</td>
                  <td style="white-space:nowrap; font-weight:700;" :style="{ color: colorCambioPrecio(c) }">
                    <template v-if="c.precio_anterior !== null">Bs. {{ c.precio_anterior.toFixed(2) }} → </template>Bs. {{ c.precio_nuevo.toFixed(2) }}
                  </td>
                  <td><span class="badge-pago planificado">{{ etiquetaOrigenPrecio(c.origen) }}</span></td>
                  <td>{{ c.usuario }}</td>
                </tr>
                <tr v-if="preciosDatos.cambios.length === 0">
                  <td colspan="6" class="texto-centro">Sin cambios de precio en este periodo.</td>
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
            <div class="rango-fecha"><BaseFecha v-model="filtroDesde" placeholder="Inicio" :max="filtroHasta || ''" @update:model-value="cambioFechaManual" /></div>
            <label class="etiqueta-filtro">Hasta</label>
            <div class="rango-fecha"><BaseFecha v-model="filtroHasta" placeholder="Hoy" :min="filtroDesde || ''" @update:model-value="cambioFechaManual" /></div>
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
                  <td>{{ venta.usuario_comanda_id_meseroTousuario?.nombres || '—' }}</td>
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
            :opciones="[20, 40, 50, 100]"
            @update:pagina="irPaginaVentas"
            @update:limite="cambiarPorPagina"
          />
        </div>
      </div>
    </Teleport>

    <!-- ====================================================
         SECCIÓN: REPORTE DE BILLETERA DIGITAL
    ==================================================== -->
    <div v-if="pestana === 'billetera'" class="seccion-billetera fade-in">
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

      <!-- Flujo de dinero del negocio -->
      <h4 class="flujo-titulo">Flujo de dinero</h4>
      <div class="flujo-grid escalonar">
        <div class="flujo-card f-entro">
          <span class="flujo-label">Entró (recargas)</span>
          <span class="flujo-valor">Bs {{ (flujo.entro || 0).toFixed(2) }}</span>
          <span class="flujo-sub">{{ flujo.conteos?.recargas || 0 }} recargas</span>
        </div>
        <div class="flujo-card f-consumo">
          <span class="flujo-label">Consumido (ventas + reservas)</span>
          <span class="flujo-valor">Bs {{ (flujo.consumido || 0).toFixed(2) }}</span>
          <span class="flujo-sub">{{ flujo.conteos?.consumos || 0 }} operaciones</span>
        </div>
        <div class="flujo-card f-devuelto">
          <span class="flujo-label">Devuelto (a billeteras)</span>
          <span class="flujo-valor">Bs {{ (flujo.devuelto || 0).toFixed(2) }}</span>
          <span class="flujo-sub">{{ flujo.conteos?.devoluciones || 0 }} devoluciones</span>
        </div>
        <div class="flujo-card f-retiro">
          <span class="flujo-label">Retirado de billeteras</span>
          <span class="flujo-valor">Bs {{ (flujo.retirado || 0).toFixed(2) }}</span>
          <span class="flujo-sub">entregado en efectivo: Bs {{ (flujo.entregado_efectivo || 0).toFixed(2) }}</span>
        </div>
        <div class="flujo-card f-retenido">
          <span class="flujo-label">Redondeo entregado (efectivo)</span>
          <span class="flujo-valor">Bs {{ (flujo.redondeo ?? flujo.retenido ?? 0).toFixed(2) }}</span>
          <span class="flujo-sub">diferencia en retiros</span>
        </div>
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
import { ref, computed, watch, onActivated, onDeactivated } from 'vue'
import clienteHttp from '@/servicios-api/cliente-http.js'
import Paginacion from '@/componentes/comunes/Paginacion.vue'
import BaseFecha from '@/componentes/comunes/BaseFecha.vue'
import BaseSelect from '@/componentes/comunes/BaseSelect.vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'
// Logo importado como módulo: Vite lo empaqueta con hash y ruta válida en
// producción. La ruta /src/ solo existe en el dev-server y daba 404 al desplegar.
import logoUrl from '@/activos/imagenes/logo-euphoria.png'
const notif = useNotificaciones()

// Umbral único de stock bajo para reposición, usado tanto en la alerta de
// Inventario Crítico como en el indicador de la tabla de ranking (evita
// inconsistencias donde un producto aparecía crítico en la alerta pero normal en la tabla)
const UMBRAL_STOCK_BAJO = 30

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
const flujo = ref({})
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
  if (pestana.value === 'precios') cargarPrecios()
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
  eventoFiltro.value = '' // los presets de fecha anulan el filtro por evento
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
  eventoFiltro.value = ''
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
// Incidentes de reposición (mermas) agrupados por responsable
const resumenReposiciones = ref([])

// Pestaña activa del dashboard (híbrido: pestañas + denso + dos columnas)
const pestana = ref('general')
const pestanas = [
  { id: 'general', nombre: 'General' },
  { id: 'ventas', nombre: 'Ventas' },
  { id: 'productos', nombre: 'Productos' },
  { id: 'precios', nombre: 'Precios' },
  { id: 'personal', nombre: 'Personal' },
  { id: 'billetera', nombre: 'Billetera' },
  { id: 'eventos', nombre: 'Eventos' }
]

// ── Historial de precios (Fase 8) ────────────────────────────────────────
const preciosDatos = ref({ total: 0, cambios: [] })
async function cargarPrecios() {
  try {
    const params = new URLSearchParams()
    if (filtroDesde.value) params.append('desde', filtroDesde.value)
    if (filtroHasta.value) params.append('hasta', filtroHasta.value)
    params.append('limite', '100')
    preciosDatos.value = await clienteHttp.get(`/productos/historial-precios/recientes?${params.toString()}`)
  } catch { /* silencioso: la pestaña muestra vacío */ }
}
const preciosKpis = computed(() => {
  const c = preciosDatos.value.cambios || []
  const reales = c.filter(x => x.origen !== 'registro_inicial')
  const conMovimiento = reales.filter(x => x.precio_anterior !== null && x.precio_anterior !== x.precio_nuevo)
  return {
    total: reales.length,
    subidas: conMovimiento.filter(x => x.precio_nuevo > x.precio_anterior).length,
    bajadas: conMovimiento.filter(x => x.precio_nuevo < x.precio_anterior).length,
    ia: reales.filter(x => x.origen === 'combo_ia').length,
  }
})
const preciosMasMovidos = computed(() => {
  const mapa = {}
  for (const x of (preciosDatos.value.cambios || [])) {
    if (x.origen === 'registro_inicial') continue
    mapa[x.producto] = (mapa[x.producto] || 0) + 1
  }
  return Object.entries(mapa).map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n).slice(0, 5)
})
const maxCambiosProd = computed(() => Math.max(...preciosMasMovidos.value.map(p => p.n), 1))
const ETIQUETAS_ORIGEN_PRECIO = {
  creacion: 'Creación', edicion: 'Edición', promo_activada: 'Promo activada',
  promo_desactivada: 'Promo desactivada', combo_ia: 'IA (combo)', registro_inicial: 'Inicial',
}
function etiquetaOrigenPrecio(o) { return ETIQUETAS_ORIGEN_PRECIO[o] || o }
function colorCambioPrecio(x) {
  if (x.precio_anterior === null || x.precio_anterior === x.precio_nuevo) return 'var(--texto-principal)'
  return x.precio_nuevo > x.precio_anterior ? 'var(--color-exito)' : 'var(--color-error)'
}
function formatearFechaPrecio(f) {
  return new Date(f).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Filtro por mesero (pestaña Personal): '' = todos
const meseroSel = ref('')
const opcionesMeseros = computed(() => [
  { value: '', label: 'Todos los meseros' },
  ...datosMeseros.value.map(m => ({ value: m.nombre, label: m.nombre }))
])
const meserosFiltrados = computed(() =>
  meseroSel.value ? datosMeseros.value.filter(m => m.nombre === meseroSel.value) : datosMeseros.value
)
const maxMeseroTotal = computed(() =>
  datosMeseros.value.length ? Math.max(...datosMeseros.value.map(m => m.total), 1) : 1
)
// Filtro GLOBAL por evento: al elegir uno, todo el resumen (KPIs, gráficos,
// ranking, meseros, ventas) se recalcula con la ventana horaria del evento
const eventoFiltro = ref('')
const opcionesEventos = computed(() => [
  { value: '', label: 'Todos los eventos' },
  ...listadoEventos.value.map(e => ({ value: e.id_evento, label: e.nombre_evento }))
])
const nombreEventoFiltro = computed(() =>
  listadoEventos.value.find(e => e.id_evento === eventoFiltro.value)?.nombre_evento || ''
)
function cambioEvento(v) {
  eventoFiltro.value = v
  presetActivo.value = v ? '' : presetActivo.value
  cargarReportes(true)
  cargarReporteBilletera() // la billetera también sigue el filtro por evento
  if (pestana.value === 'precios') cargarPrecios()
}
// Desde una fila de la pestaña Eventos: filtra por ese evento y salta al ranking
function verVentasDeEvento(ev) {
  eventoFiltro.value = ev.id_evento
  presetActivo.value = ''
  pestana.value = 'productos' // el watch de pestaña recarga ya con el evento puesto
}

// Datos dinámicos para los gráficos interactivos
const datosCategorias = ref([])
const datosMetodos = ref([])
const listadoProductosRanking = ref([])
const productosBajoStock = ref([])
const datosMeseros = ref([])
// Agregados nuevos del backend: ventas por día y por hora (horas pico)
const porDia = ref([])
const porHora = ref([])

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

// KPIs derivados para las cabeceras de cada pestaña
const totalCobros = computed(() => conteoEfectivo.value + conteoQR.value + conteoBilletera.value)
const ticketPromedio = computed(() => totalCobros.value ? stats.value.ingresosTotales / totalCobros.value : 0)
const metodoTop = computed(() => (datosMetodos.value[0]?.total ? datosMetodos.value[0].nombre : '—'))
const topMesero = computed(() =>
  datosMeseros.value.length ? datosMeseros.value.reduce((a, b) => (b.total > a.total ? b : a)) : null
)
const promedioMesero = computed(() => {
  const arr = datosMeseros.value
  if (!arr.length) return 0
  return arr.reduce((a, m) => a + m.total, 0) / arr.length
})
const unidadesVendidas = computed(() =>
  listadoProductosRanking.value.reduce((a, p) => a + (p.vecesVendido || 0), 0)
)
const productoTop = computed(() => listadoProductosRanking.value[0] || null)
const top5Ingresos = computed(() =>
  [...listadoProductosRanking.value]
    .sort((a, b) => (b.ingresosGenerados || 0) - (a.ingresosGenerados || 0))
    .slice(0, 5)
)
const maxIngresoProd = computed(() =>
  top5Ingresos.value.length ? Math.max(...top5Ingresos.value.map(p => p.ingresosGenerados || 0), 1) : 1
)

// Ventas por día (columna) — últimos 7 días con actividad, y su tope para escalar
const dias7 = computed(() => porDia.value.slice(-7))
const maxDiaTotal = computed(() =>
  dias7.value.length ? Math.max(...dias7.value.map(d => d.total), 1) : 1
)
// Horas pico — top 5 franjas horarias que más facturan (compacto)
const topHoras = computed(() => porHora.value.slice(0, 5))
const maxHoraTotal = computed(() =>
  topHoras.value.length ? Math.max(...topHoras.value.map(h => h.total), 1) : 1
)
function etiquetaDia(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
}
function montoCorto(v) {
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)
}

// Ventas por evento (comparativa gráfica en la pestaña Eventos)
const maxVentasEvento = computed(() =>
  listadoEventos.value.length ? Math.max(...listadoEventos.value.map(e => e.ventasReales || 0), 1) : 1
)
const maxAsistEvento = computed(() =>
  listadoEventos.value.length ? Math.max(...listadoEventos.value.map(e => e.asistenciaReal || 0), 1) : 1
)

// Tamaño de página de la tabla de ventas (accesible desde la cabecera de la tarjeta)
const opcionesPorPagina = [
  { value: 20, label: '20 por página' },
  { value: 40, label: '40 por página' },
  { value: 50, label: '50 por página' },
  { value: 100, label: '100 por página' }
]
function cambiarPorPagina(v) {
  ventasLimite.value = v
  cambiarLimiteVentas()
}

// Al cambiar de pestaña se recaptura la información en silencio,
// así cada panel muestra datos frescos sin esperar al intervalo
watch(pestana, () => {
  cargarReportes(true)
  cargarReporteBilletera()
  if (pestana.value === 'precios') cargarPrecios()
})

function abrirModal(tipo) {
  modalActivo.value = tipo
}

async function exportarPDF() {
  // El PDF exporta LO QUE EL ADMIN ESTÁ VIENDO: el informe corresponde a la pestaña activa.
  // Validación de datos según la pestaña (evita PDFs vacíos)
  const VALIDA = {
    ventas:    () => ventas.value.length > 0 || stats.value.ingresosTotales > 0,
    productos: () => listadoProductosRanking.value.length > 0,
    precios:   () => (preciosDatos.value.cambios || []).length > 0,
    personal:  () => datosMeseros.value.length > 0 || listadoPersonal.value.length > 0,
    billetera: () => (reporteBilletera.value.billeteras?.total ?? 0) > 0 || (reporteBilletera.value.recientes ?? []).length > 0,
    eventos:   () => listadoEventos.value.length > 0,
  }
  const hayDatos = VALIDA[pestana.value]
    ? VALIDA[pestana.value]()
    : (trendComandas.value.length > 0
        || datosMeseros.value.length > 0
        || listadoProductosRanking.value.some(p => p.vecesVendido > 0)
        || (conteoEfectivo.value + conteoQR.value + conteoBilletera.value) > 0)
  if (!hayDatos) {
    notif.advertencia('Aún no hay datos suficientes para generar el reporte PDF. Espera a que carguen los reportes o ajusta el periodo seleccionado.')
    return
  }

  // El iframe se renderiza FUERA DE PANTALLA a ancho carta (816px = 8.5in),
  const fechaGen = new Date().toLocaleString();

  // Rango de fechas cubierto por el reporte (para rotular el encabezado)
  const rangoFechas = (filtroDesde.value || filtroHasta.value)
    ? `Periodo: ${filtroDesde.value ? formatearFecha(filtroDesde.value) : 'Inicio'} — ${filtroHasta.value ? formatearFecha(filtroHasta.value) : 'Hoy'}`
    : 'Periodo: Todo el histórico';

  // Construir el SVG de tendencia a partir de los datos reactivos (no del DOM),
  // así el PDF nunca sale en blanco por desincronización con el render
  // Los SVG van como <img> con data-URI: el generador de PDF los rasteriza fiel
  const svgAImg = (svg) => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" style="width:100%;height:auto" />`
  const svgTendenciaMarkup = trendComandas.value.length > 0
    ? `<svg viewBox="0 0 360 160" width="360" height="160" xmlns="http://www.w3.org/2000/svg">
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
    <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="50" fill="transparent" stroke="#2ecc71" stroke-width="100" stroke-dasharray="${dashE} 314.159" stroke-dashoffset="0" />
      <circle cx="100" cy="100" r="50" fill="transparent" stroke="#3498db" stroke-width="100" stroke-dasharray="${dashQR} 314.159" stroke-dashoffset="-${dashE}" />
      <circle cx="100" cy="100" r="50" fill="transparent" stroke="#aa3bff" stroke-width="100" stroke-dasharray="${dashB} 314.159" stroke-dashoffset="-${(porcentajeEfectivo.value + porcentajeQR.value) * 3.14159}" />
    </svg>`;

  // Columna 1: Métodos de Pago más Usados
  const colMetodos = `
    <div class="resumen-columna">
      <h3><svg class="pdf-h3-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="3" ry="3"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>Métodos de Pago</h3>
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
      <h3><svg class="pdf-h3-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aa3bff" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Desempeño del Personal</h3>
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
      <h3><svg class="pdf-h3-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Productos Estrella</h3>
      <ul class="resumen-lista">
        ${filasProductosHTML}
      </ul>
    </div>
  `;

  // ── Cuerpo del informe SEGÚN LA PESTAÑA ACTIVA ──────────────────────────
  const esc = (s) => String(s ?? '').replace(/</g, '&lt;')
  const tablaPdf = (cabeceras, filas, vacio = 'Sin datos en este periodo.') => filas.length
    ? `<table class="tabla-pdf"><thead><tr>${cabeceras.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : `<p class="pdf-vacio">${vacio}</p>`
  const kpisPdf = (pares) => `<div class="kpis-horizontal">${pares.map(([tt, v]) => `<div class="kpi-item"><h4>${tt}</h4><p>${v}</p></div>`).join('')}</div>`

  const NOMBRES_INFORME = {
    general: 'INFORME GENERAL DEL NEGOCIO', ventas: 'INFORME DE VENTAS',
    productos: 'INFORME DE PRODUCTOS E INVENTARIO', precios: 'INFORME DE CAMBIOS DE PRECIOS',
    personal: 'INFORME DEL PERSONAL', billetera: 'INFORME DE BILLETERA DIGITAL', eventos: 'INFORME DE EVENTOS',
  }
  const tituloInforme = NOMBRES_INFORME[pestana.value] || NOMBRES_INFORME.general
  let cuerpoInforme

  if (pestana.value === 'ventas') {
    const ticket = ventasTotal.value ? stats.value.ingresosTotales / ventasTotal.value : 0
    cuerpoInforme = `
      ${kpisPdf([
        ['Ingresos del periodo', `Bs. ${stats.value.ingresosTotales.toFixed(2)}`],
        ['Comandas', ventasTotal.value],
        ['Ticket promedio', `Bs. ${ticket.toFixed(2)}`],
      ])}
      <div class="seccion-titulo">Detalle de ventas (${ventas.value.length} de ${ventasTotal.value} comandas del periodo)</div>
      ${tablaPdf(['ID', 'Fecha y hora', 'Cliente', 'Atendido por', 'Método', 'Total (Bs)'],
        ventas.value.map(v => [`#${v.id_comanda}`, formatearFecha(v.fecha_registro),
          esc(v.usuario_comanda_id_clienteTousuario?.nombres || 'Sin registro / Barra'),
          esc(v.usuario_comanda_id_meseroTousuario?.nombres || '—'), v.metodo_pago,
          `<strong>Bs. ${(v.subtotal || 0).toFixed(2)}</strong>`]))}
      <div class="seccion-titulo">Resumen del periodo</div>
      <div class="resumen-columnas-grid">${colMetodos}${colPersonal}${colProductos}</div>`
  } else if (pestana.value === 'productos') {
    cuerpoInforme = `
      ${kpisPdf([
        ['Productos en inventario', stats.value.productos],
        ['Unidades vendidas', unidadesVendidas.value],
        [`Stock crítico (≤ ${UMBRAL_STOCK_BAJO})`, productosBajoStock.value.length],
      ])}
      <div class="seccion-titulo">Ranking de productos (de más a menos vendidos)</div>
      ${tablaPdf(['#', 'Producto', 'Categoría', 'Stock', 'Vendido (uds)', 'Ingresos (Bs)'],
        listadoProductosRanking.value.map((p, i) => [i + 1, esc(p.nombre_producto), esc(p.nombre_categoria),
          p.stock_actual, p.vecesVendido, `<strong>Bs. ${(p.ingresosGenerados || 0).toFixed(2)}</strong>`]))}
      ${productosBajoStock.value.length ? `
        <div class="seccion-titulo">Reponer pronto (stock ≤ ${UMBRAL_STOCK_BAJO})</div>
        ${tablaPdf(['Producto', 'Stock actual'], productosBajoStock.value.map(p => [esc(p.nombre_producto), `<strong>${p.stock_actual} uds.</strong>`]))}` : ''}`
  } else if (pestana.value === 'precios') {
    cuerpoInforme = `
      ${kpisPdf([
        ['Cambios de precio', preciosKpis.value.total], ['Subidas', preciosKpis.value.subidas],
        ['Bajadas', preciosKpis.value.bajadas], ['Hechos por la IA', preciosKpis.value.ia],
      ])}
      <div class="seccion-titulo">Historial de cambios del periodo</div>
      ${tablaPdf(['Fecha', 'Producto', 'Tipo', 'Cambio', 'Origen', 'Usuario'],
        (preciosDatos.value.cambios || []).map(c => [formatearFechaPrecio(c.fecha_hora), esc(c.producto),
          c.tipo === 'promocion' ? 'Promoción' : 'Base',
          `${c.precio_anterior !== null ? `Bs. ${c.precio_anterior.toFixed(2)} → ` : ''}<strong>Bs. ${c.precio_nuevo.toFixed(2)}</strong>`,
          etiquetaOrigenPrecio(c.origen), esc(c.usuario)]))}`
  } else if (pestana.value === 'personal') {
    cuerpoInforme = `
      ${kpisPdf([['Personal registrado', stats.value.personal], ['Clientes registrados', stats.value.clientes]])}
      <div class="seccion-titulo">Ventas por mesero</div>
      ${tablaPdf(['Mesero', 'Total vendido (Bs)', 'Participación'],
        datosMeseros.value.map(m => [esc(m.nombre), `<strong>Bs. ${m.total.toFixed(2)}</strong>`, `${m.porcentaje}%`]))}
      <div class="seccion-titulo">Personal registrado</div>
      ${tablaPdf(['Nombre', 'Correo', 'Rol'],
        listadoPersonal.value.map(u => [esc(`${u.nombres || ''} ${u.apellidos || ''}`.trim()), esc(u.correo || '—'), esc(u.rol || u.nombre_rol || '—')]))}`
  } else if (pestana.value === 'billetera') {
    const b = reporteBilletera.value
    cuerpoInforme = `
      ${kpisPdf([
        ['Billeteras', b.billeteras?.total ?? 0], ['Activas', b.billeteras?.activas ?? 0],
        ['Saldo circulante', `Bs. ${(b.billeteras?.saldo_circulante ?? 0).toFixed(2)}`],
        ['Recargas', `${b.recargas?.total_operaciones ?? 0} ops.`],
        ['Monto recargado', `Bs. ${(b.recargas?.monto_total ?? 0).toFixed(2)}`],
        ['Consumido', `Bs. ${(b.uso_billetera?.monto_consumido ?? 0).toFixed(2)}`],
      ])}
      <div class="seccion-titulo">Últimas recargas</div>
      ${tablaPdf(['ID', 'Cliente', 'Quién recargó', 'Monto', 'Estado', 'Fecha'],
        (b.recientes ?? []).map(r => [r.id, esc(r.nombre), r.rol === 5 ? 'Cuenta propia' : 'Cajero',
          `<strong>Bs. ${(r.monto ?? 0).toFixed(2)}</strong>`, r.estado, formatearFecha(r.fecha)]))}
      <div class="seccion-titulo">Top clientes por consumo</div>
      ${tablaPdf(['Cliente', 'Consumo (Bs)'],
        (b.top_clientes ?? []).map(c => [esc(c.nombre), `<strong>Bs. ${Number(c.total ?? c.monto ?? 0).toFixed(2)}</strong>`]))}`
  } else if (pestana.value === 'eventos') {
    cuerpoInforme = `
      ${kpisPdf([['Eventos', stats.value.eventos], ['Asistencia (últ. evento)', `${stats.value.asistencia} pers.`]])}
      <div class="seccion-titulo">Eventos y asistencia</div>
      ${tablaPdf(['Evento', 'Fecha', 'Estado', 'Asistencia'],
        listadoEventos.value.map(ev => [esc(ev.nombre_evento), formatearFecha(ev.fecha_hora_inicio), esc(ev.estado || '—'), `${ev.asistenciaReal || 0} pers.`]))}`
  } else {
    // GENERAL: el informe completo con KPIs, gráficos y resumen gerencial
    cuerpoInforme = `
      <div class="kpis-horizontal">
        <div class="kpi-item"><h4>Ventas Totales</h4><p>Bs. ${stats.value.ingresosTotales.toFixed(0)}</p></div>
        <div class="kpi-item"><h4>Clientes</h4><p>${stats.value.clientes}</p></div>
        <div class="kpi-item"><h4>Personal</h4><p>${stats.value.personal}</p></div>
        <div class="kpi-item"><h4>Productos</h4><p>${stats.value.productos}</p></div>
        <div class="kpi-item"><h4>Eventos</h4><p>${stats.value.eventos}</p></div>
        <div class="kpi-item"><h4>Asistencia (Últ. Evento)</h4><p>${stats.value.asistencia} pers.</p></div>
      </div>
      <div class="seccion-titulo">Análisis y Gráficos Operativos</div>
      <div class="graficos-pdf-flex">
        <div class="grafico-pdf-card"><h3>Curva de Tendencia de Ventas (2D)</h3>${trendComandas.value.length ? svgAImg(svgTendenciaMarkup) : svgTendenciaMarkup}</div>
        <div class="grafico-pdf-card"><h3>Participación por Métodos de Pago</h3>${svgAImg(svgAnillosMarkup)}</div>
      </div>
      <div class="seccion-titulo">Resumen Gerencial del Negocio</div>
      <div class="resumen-columnas-grid">${colMetodos}${colPersonal}${colProductos}</div>`
  }

  // ── CSS del informe, NAMESPACEADO bajo #informe-pdf (no interfiere con la app) ──
  const cssInforme = `
    #informe-pdf { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a202c; background: #ffffff; width: 816px; padding: 0 13mm; line-height: 1.45; font-size: 12px; }
    #informe-pdf, #informe-pdf * { box-sizing: border-box; }
    #informe-pdf .header-pdf { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #aa3bff; padding-bottom: 12px; }
    #informe-pdf .logo-container img { height: 42px; object-fit: contain; }
    #informe-pdf .titulo-reporte h1 { margin: 0; font-size: 1.3rem; color: #1a202c; letter-spacing: .4px; font-weight: 800; }
    #informe-pdf .meta-informe { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: .72rem; color: #64748b; font-weight: 600; padding: 8px 2px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; }
    #informe-pdf .meta-informe strong { color: #334155; font-weight: 800; }
    #informe-pdf .kpis-horizontal { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 22px; page-break-inside: avoid; }
    #informe-pdf .kpi-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 8px; flex: 1; text-align: center; }
    #informe-pdf .kpi-item h4 { margin: 0; font-size: .68rem; color: #718096; text-transform: uppercase; letter-spacing: .5px; }
    #informe-pdf .kpi-item p { margin: 4px 0 0; font-size: 1.15rem; color: #aa3bff; font-weight: 800; }
    #informe-pdf .seccion-titulo { font-size: 1rem; color: #1a202c; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; margin: 22px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; page-break-after: avoid; }
    #informe-pdf .graficos-pdf-flex { display: flex; gap: 18px; margin-bottom: 22px; page-break-inside: avoid; }
    #informe-pdf .grafico-pdf-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; flex: 1; text-align: center; color: #1a202c; }
    #informe-pdf .grafico-pdf-card h3 { margin: 0 0 10px; font-size: .82rem; color: #4a5568; text-transform: uppercase; letter-spacing: .5px; font-weight: 800; }
    #informe-pdf .grafico-pdf-card img { width: 100%; height: auto; max-height: 190px; object-fit: contain; }
    #informe-pdf .resumen-columnas-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 12px 0 18px; page-break-inside: avoid; }
    #informe-pdf .resumen-columna { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    #informe-pdf .resumen-columna h3 { margin: 0 0 12px; font-size: .85rem; color: #aa3bff; border-bottom: 2px solid #edf2f7; padding-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; font-weight: 800; display: flex; align-items: center; }
    #informe-pdf .pdf-h3-icon { width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0; }
    #informe-pdf .resumen-lista { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    #informe-pdf .resumen-lista li { font-size: .8rem; display: flex; align-items: center; gap: 8px; color: #2d3748; }
    #informe-pdf .punto-resumen { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    #informe-pdf .tabla-pdf { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: .74rem; }
    #informe-pdf .tabla-pdf th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: .62rem; letter-spacing: .5px; text-align: left; padding: 7px 9px; border: 1px solid #dbe2ea; }
    #informe-pdf .tabla-pdf td { padding: 6px 9px; border: 1px solid #e6ebf1; color: #1a202c; }
    #informe-pdf .tabla-pdf tr:nth-child(even) td { background: #f9fafb; }
    #informe-pdf .tabla-pdf tr { page-break-inside: avoid; }
    #informe-pdf .pdf-vacio { color: #718096; font-size: .8rem; }
    #informe-pdf .footer { text-align: center; margin-top: 30px; font-size: .7rem; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  `

  const contenidoInforme = `
    <div id="informe-pdf">
      <div class="header-pdf">
        <div class="logo-container"><img src="${logoUrl}" /></div>
        <div class="titulo-reporte"><h1>${tituloInforme}</h1></div>
      </div>
      <div class="meta-informe">
        <span><strong>${rangoFechas}</strong></span>
        ${eventoFiltro.value ? `<span>Evento: <strong>${nombreEventoFiltro.value}</strong></span>` : ''}
        <span>Generado: <strong>${fechaGen}</strong></span>
        <span>Documento interno — Euphoria</span>
      </div>
      ${cuerpoInforme}
      <div class="footer">Este documento es un informe confidencial de toma de decisiones de Euphoria. Sincronizado dinámicamente con la base de datos central.</div>
    </div>`

  // Contenedor oculto EN el documento principal: el generador ve los estilos reales
  const estilo = document.createElement('style')
  estilo.textContent = cssInforme
  document.head.appendChild(estilo)
  const lienzo = document.createElement('div')
  lienzo.style.cssText = 'position:absolute;left:-10000px;top:0;background:#fff'
  lienzo.innerHTML = contenidoInforme
  document.body.appendChild(lienzo)

  notif.info('Generando el PDF del informe…')
  const nombreArchivo = `Euphoria - ${tituloInforme.toLowerCase().replace(/informe de |informe /g, 'informe ')} - ${new Date().toISOString().slice(0, 10)}.pdf`
  try {
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf().set({
      margin: [12, 0, 14, 0], // márgenes verticales por página; los laterales van en el documento
      filename: nombreArchivo,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(lienzo.firstElementChild).save()
    notif.exito('Informe descargado en PDF.')
  } catch (e) {
    console.error('Error generando el PDF:', e)
    notif.error('No se pudo generar el PDF. Intenta de nuevo.')
  } finally {
    document.body.removeChild(lienzo)
    document.head.removeChild(estilo)
  }
}

// KeepAlive: primera activación con spinner, las siguientes en silencio
// (el dashboard previo se ve al instante mientras se actualiza detrás).
// El intervalo de sincronización solo corre con la vista visible.
let yaCargado = false
onActivated(() => {
  cargarReportes(yaCargado)
  cargarReporteBilletera()
  yaCargado = true
  // Sincronización automática en vivo (endpoints ligeros/agregados)
  intervaloSync = setInterval(() => {
    cargarReportes(true) // modo silencioso para no parpadear la pantalla
    cargarReporteBilletera() // antes no se refrescaba nunca en vivo
  }, 15000)
})

onDeactivated(() => {
  if (intervaloSync) clearInterval(intervaloSync)
  intervaloSync = null
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
      productosBajoStock.value = resProductosRaw.filter(p => p.stock_actual <= UMBRAL_STOCK_BAJO)

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

    // 2.b Incidentes de reposición (mermas por descuido, agrupadas por responsable)
    try {
      resumenReposiciones.value = await clienteHttp.get('/productos/reposiciones/resumen')
    } catch { resumenReposiciones.value = [] }

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
      if (eventoFiltro.value) {
        params.append('evento', eventoFiltro.value) // el evento manda sobre las fechas
      } else {
        if (filtroDesde.value) params.append('desde', filtroDesde.value)
        if (filtroHasta.value) params.append('hasta', filtroHasta.value)
      }
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

      // Meseros (con conteo de comandas y participación sobre el total)
      const coloresMeseros = ['var(--color-info)', 'var(--morado-brillante)', 'var(--rosa-acento)', 'var(--color-exito)', 'var(--color-alerta)', 'var(--color-error)']
      const maxMes = Math.max(...resumen.por_mesero.map(m => m.total), 1)
      const sumMes = resumen.por_mesero.reduce((a, m) => a + m.total, 0) || 1
      datosMeseros.value = resumen.por_mesero.map((m, idx) => ({
        nombre: m.nombre, total: m.total,
        cantidad: m.cantidad || 0,
        porcentaje: Math.round(m.total / maxMes * 100),
        participacion: Math.round(m.total / sumMes * 100),
        color: coloresMeseros[idx % coloresMeseros.length]
      }))

      // Ventas por día y horas pico (gráficos de la pestaña Ventas)
      porDia.value = resumen.por_dia || []
      porHora.value = resumen.por_hora || []

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
    if (eventoFiltro.value) {
      params.append('evento', eventoFiltro.value)
    } else {
      if (filtroDesde.value) params.append('desde', filtroDesde.value)
      if (filtroHasta.value) params.append('hasta', filtroHasta.value)
    }
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
    if (eventoFiltro.value) {
      // Si hay filtro por evento, la billetera usa la misma ventana del evento
      params.append('evento', eventoFiltro.value)
    } else {
      if (filtroDesde.value) params.append('desde', filtroDesde.value)
      if (filtroHasta.value) params.append('hasta', filtroHasta.value)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await clienteHttp.get(`/billetera/admin/reporte-completo${query}`)
    reporteBilletera.value = res
    // Flujo de dinero (respeta el mismo filtro de fechas)
    const paramsFlujo = new URLSearchParams()
    if (filtroDesde.value) paramsFlujo.append('desde', filtroDesde.value)
    if (filtroHasta.value) paramsFlujo.append('hasta', filtroHasta.value)
    const qf = paramsFlujo.toString() ? `?${paramsFlujo.toString()}` : ''
    flujo.value = await clienteHttp.get(`/billetera/admin/flujo-dinero${qf}`)
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
/* ============================================
   FASE 6: PESTAÑAS + DASHBOARD DENSO A DOS COLUMNAS
============================================ */
.rep-tabs {
  display: flex;
  gap: 6px;
  /* Nunca se apilan en dos filas: si no caben, scroll horizontal */
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-bottom: 22px;
  padding: 6px;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: 16px;
}
.rep-tabs::-webkit-scrollbar { display: none; }
.rep-tab {
  flex: 1 0 auto;
  min-width: max-content;
  background: transparent;
  border: none;
  color: var(--texto-secundario);
  padding: 10px 16px;
  border-radius: 11px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.rep-tab:hover { color: var(--texto-principal); background: var(--fondo-tarjeta-alt); }
.rep-tab:focus-visible { outline: none; box-shadow: var(--anillo-foco); }
.rep-tab.activo {
  background: var(--gradiente-marca);
  color: #fff;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
}
.rep-panel { margin-top: 4px; }

/* Dos columnas maestras (principal ancha + lateral angosta) */
.rep-dos-col {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 20px;
  align-items: start;
  margin-top: 18px;
}
.rep-col-main, .rep-col-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
@media (max-width: 1200px) {
  .rep-dos-col { grid-template-columns: 1fr; }
  /* Apilado: los gráficos van primero, las listas/tablas al final */
  .rep-col-lista { order: 2; }
}

/* Franja compacta de KPIs (6 en una fila, densos) */
.rep-kpis-strip {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
  gap: 12px !important;
}
.rep-kpis-strip .tarjeta-estadistica {
  min-height: 0;
  padding: 14px 16px;
  gap: 12px;
}
.rep-kpis-strip .icono-est { width: 44px; height: 44px; }
.rep-kpis-strip .icono-est svg { width: 22px; height: 22px; }
.rep-kpis-strip .info-est h3 { font-size: 0.62rem; letter-spacing: 0.9px; margin-bottom: 3px; }
.rep-kpis-strip .info-est h2 { font-size: 1.5rem; margin: 0 0 2px; }
.rep-kpis-strip .bg-ventas .info-est h2 { font-size: 1.6rem; }
.rep-kpis-strip .info-est p { font-size: 0.68rem; margin: 0; }
/* Solo forzar 6 columnas cuando REALMENTE hay ancho (el sidebar come ~255px);
   antes se activaba a 900px de ventana y los KPIs quedaban aplastados */
@media (min-width: 1350px) {
  .rep-kpis-strip { grid-template-columns: repeat(6, 1fr) !important; }
}

/* Filtros embebidos en el header de una tarjeta */
.rep-filtro-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Mini-resumen de billetera (atajo) */
.rep-mini-billetera { cursor: pointer; }
.rep-mini-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.rep-mini-kpi {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border-radius: var(--radio-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rmk-label { font-size: 0.7rem; color: var(--texto-secundario); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
.rmk-valor { font-size: 1.15rem; color: #fff; font-weight: 800; font-variant-numeric: tabular-nums; }

/* Como pestaña, la sección billetera no necesita el gran margen superior */
.rep-tabs ~ .seccion-billetera { margin-top: 18px; }

/* Fila de KPIs compactos dentro de una pestaña (reusa el estilo kbi-card) */
.rep-kpis-inline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.rep-kpis-inline .kbi-card { padding: 14px 16px; }
.rep-kpis-inline .kbi-icono { width: 42px; height: 42px; }
.rep-kpis-inline .kbi-valor { font-size: 1.25rem; }
.kbi-valor-texto {
  font-size: 1rem !important;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Pie "ver más" de las listas compactas (top 5 + detalle en modal) */
.rep-ver-mas {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--borde-sutil);
}
.rep-ver-mas span {
  color: var(--texto-secundario);
  font-size: 0.82rem;
  font-weight: 600;
}

/* Barra apilada de participación (100% = todos los meseros) */
.rep-stack {
  display: flex;
  height: 16px;
  border-radius: 9px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.03);
}
.rep-stack-seg {
  height: 100%;
  transition: width 0.9s var(--ease-suave);
}

@media (max-width: 768px) {
  .rep-tab { padding: 9px 15px; }
}

/* Botón compacto para acciones dentro de tablas */
.btn-mini { padding: 5px 12px !important; font-size: 0.76rem !important; white-space: nowrap; }

/* Selector de evento en la barra de periodo */
.filtro-evento { min-width: 210px; }

/* Chip que avisa que el reporte está filtrado por un evento */
.chip-evento-activo {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: -6px 0 18px;
  padding: 10px 16px;
  border-radius: 14px;
  background: rgba(168, 85, 247, 0.10);
  border: 1px solid rgba(168, 85, 247, 0.38);
  color: var(--texto-principal);
  font-size: 0.87rem;
  font-weight: 600;
}
.chip-evento-activo svg { color: var(--morado-hover); flex-shrink: 0; }
.chip-evento-activo strong { color: var(--morado-hover); }
.chip-evento-activo .btn-limpiar-filtro { margin-left: auto; }

/* Sub-línea informativa bajo la barra de cada mesero */
.rep-sub-barra {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--texto-secundario);
  font-variant-numeric: tabular-nums;
}

/* CABECERA Y ACCIONES — banner de vidrio premium */
.vista-cabecera {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 18px;
  padding: 24px 28px;
  border-radius: var(--radio-xl);
  background: var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06),
              0 18px 48px rgba(10, 6, 26, 0.5);
  overflow: hidden;
}
.vista-cabecera::before {
  content: '';
  position: absolute;
  top: -60%;
  right: -6%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.22), transparent 65%);
  pointer-events: none;
}
.vista-cabecera-info {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-left: 16px;
}
.vista-cabecera-info::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: var(--radio-full);
  background: var(--gradiente-marca);
  box-shadow: var(--glow-morado);
}
.vista-titulo {
  font-family: var(--fuente-titulo);
  font-size: clamp(1.65rem, 2.4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.05;
  margin: 0;
  color: var(--texto-principal);
}

/* ENCABEZADOS DE SECCIÓN */
.rep-seccion-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 34px 0 18px;
}
.rep-seccion-titulo {
  font-family: var(--fuente-titulo);
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--texto-principal);
  margin: 0;
  flex-shrink: 0;
}
.rep-seccion-sub {
  font-size: 0.82rem;
  color: var(--texto-secundario);
  font-weight: 500;
  flex-shrink: 0;
}
.rep-seccion-linea {
  flex: 1;
  height: 1px;
  min-width: 20px;
  background: linear-gradient(90deg, var(--borde-sutil), transparent);
}
@media (max-width: 560px) {
  .rep-seccion-head { flex-wrap: wrap; gap: 4px 12px; }
  .rep-seccion-linea { flex-basis: 100%; }
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

/* CARDS GRID — KPIs de vidrio con acento por categoría (sin franja lateral) */
.grid-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 18px;
  margin-top: 4px;
}
.tarjeta-estadistica {
  --acento: var(--morado-brillante);
  --acento-tinte: rgba(168, 85, 247, 0.12);
  background: var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  padding: 22px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 132px;
  transition: transform 0.3s var(--ease-suave), box-shadow 0.3s ease, border-color 0.3s ease;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
/* acento superior + halo tintado por categoría */
.tarjeta-estadistica::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--acento), transparent 85%);
  opacity: 0.9;
  pointer-events: none;
}
.tarjeta-estadistica::after {
  content: '';
  position: absolute;
  top: -50%; right: -20%;
  width: 200px; height: 200px;
  background: radial-gradient(circle, var(--acento-tinte), transparent 68%);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}
.tarjeta-estadistica:hover {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--acento) 45%, transparent);
  box-shadow: 0 22px 48px rgba(10, 4, 20, 0.55), 0 0 26px var(--acento-tinte);
}
.tarjeta-estadistica:hover::after { opacity: 1; }
.tarjeta-estadistica:focus-visible {
  outline: none;
  border-color: transparent;
  box-shadow: var(--anillo-foco);
}
.tarjeta-estadistica:active {
  transform: translateY(-2px) scale(0.99);
}
.bg-clientes  { --acento: var(--color-info);       --acento-tinte: rgba(56, 189, 248, 0.14); }
.bg-personal  { --acento: var(--morado-claro);     --acento-tinte: rgba(139, 92, 246, 0.16); }
.bg-ventas    { --acento: var(--color-exito);      --acento-tinte: rgba(34, 197, 94, 0.14); }
.bg-productos { --acento: var(--color-alerta);     --acento-tinte: rgba(245, 158, 11, 0.14); }
.bg-eventos   { --acento: var(--morado-brillante); --acento-tinte: rgba(168, 85, 247, 0.15); }
.bg-asistencia{ --acento: var(--color-error);      --acento-tinte: rgba(239, 68, 68, 0.14); }

/* Rejilla uniforme y limpia: 3 columnas en escritorio (2 filas de 3, sin huecos) */
@media (min-width: 900px) {
  .grid-resumen { grid-template-columns: repeat(3, 1fr); }
}
/* KPI destacado: Ventas Totales gana peso visual (número grande + halo de marca) */
.bg-ventas {
  background:
    radial-gradient(130% 150% at 100% 0%, rgba(34, 197, 94, 0.14), transparent 60%),
    var(--glass-fondo);
  border-color: color-mix(in srgb, var(--color-exito) 30%, var(--glass-borde));
}
.bg-ventas .info-est h2 { font-size: clamp(2.2rem, 3vw, 2.7rem); }

.icono-est {
  width: 58px;
  height: 58px;
  padding: 0;
  border-radius: var(--radio-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--acento);
  background: var(--acento-tinte);
  border: 1px solid color-mix(in srgb, var(--acento) 30%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: transform 0.3s var(--ease-rebote), box-shadow 0.3s ease;
}
.tarjeta-estadistica:hover .icono-est {
  transform: scale(1.08) rotate(-3deg);
  box-shadow: 0 0 20px var(--acento-tinte), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.info-est {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.info-est h3 {
  font-size: 0.72rem;
  color: var(--texto-secundario);
  text-transform: uppercase;
  letter-spacing: 1.4px;
  margin: 0 0 6px;
  font-weight: 700;
}
.info-est h2 {
  font-size: 2.15rem;
  color: #fff;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  margin: 0 0 6px;
}
.info-est p {
  font-size: 0.78rem;
  color: var(--texto-secundario);
  font-weight: 500;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.info-est p::before {
  content: '';
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--acento);
  box-shadow: 0 0 6px var(--acento);
  flex-shrink: 0;
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
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--texto-principal);
  margin: 0;
  letter-spacing: -0.01em;
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
.rango-fecha { width: 165px; }

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
/* Celular: cada filtro (etiqueta + campo) en su propia fila, sin envolturas raras */
@media (max-width: 560px) {
  .filtro-rango-personalizado {
    display: grid;
    grid-template-columns: 62px minmax(0, 1fr);
    align-items: center;
    row-gap: 10px;
    column-gap: 10px;
  }
  .rango-fecha, .filtro-evento { width: 100%; min-width: 0; }
  .filtro-rango-personalizado .btn-limpiar-filtro { grid-column: 1 / -1; justify-self: start; }
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
/* Estados de evento (español) */
.badge-pago.planificacion { background: rgba(241, 196, 15, 0.1); color: var(--color-alerta); }
.badge-pago.promocion { background: rgba(52, 152, 219, 0.1); color: var(--color-info); }
.badge-pago.en_transcurso { background: rgba(168, 85, 247, 0.12); color: var(--morado-claro); }
.badge-pago.lleno { background: rgba(236, 72, 153, 0.12); color: var(--rosa-acento); }
.badge-pago.terminado { background: rgba(46, 204, 113, 0.1); color: var(--color-exito); }

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
  position: relative;
  background: var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  padding: 24px;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05),
              0 18px 48px rgba(10, 6, 26, 0.5);
  transition: transform 0.3s var(--ease-suave), box-shadow 0.3s ease, border-color 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tarjeta-grafico::before {
  content: '';
  position: absolute;
  top: -40%; left: -10%;
  width: 260px; height: 260px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.1), transparent 66%);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}
.tarjeta-grafico:hover {
  transform: translateY(-5px);
  border-color: rgba(168, 85, 247, 0.4);
  box-shadow: 0 24px 56px rgba(10, 4, 20, 0.6), 0 0 30px rgba(168, 85, 247, 0.14);
}
.tarjeta-grafico:hover::before { opacity: 1; }
.grafico-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--borde-sutil);
  padding-bottom: 16px;
}
.grafico-header-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
/* icono del header como azulejo de marca */
.grafico-header > svg {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 38px;
  height: 38px;
  padding: 8px;
  border-radius: var(--radio-md);
  color: var(--morado-hover);
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.grafico-titulo {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  letter-spacing: -0.015em;
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
  margin-bottom: 6px;
  padding: 10px 12px;
  border-radius: var(--radio-md);
  transition: background 0.2s ease;
}
.fila-barra:hover {
  background: rgba(168, 85, 247, 0.06);
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
  padding: 18px 14px;
  border-radius: var(--radio-lg);
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.05), rgba(0, 0, 0, 0.18));
  border: 1px solid rgba(168, 85, 247, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
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
  gap: 24px;
  padding: 20px 18px;
  border-radius: var(--radio-lg);
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.05), rgba(0, 0, 0, 0.18));
  border: 1px solid rgba(168, 85, 247, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
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
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.leyenda-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 12px;
  border-radius: var(--radio-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease, border-color 0.2s ease;
}
.leyenda-item:hover {
  background: rgba(168, 85, 247, 0.08);
  border-color: var(--glass-borde);
}
.punto-leyenda {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.leyenda-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0; /* permite encoger dentro de columnas angostas (evita desborde) */
}
.l-nombre {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--texto-principal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
    width: 42px;
    height: 42px;
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
  justify-content: center;
  min-height: 260px;
  width: 100%;
  padding: 18px 14px;
  border-radius: var(--radio-lg);
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.05), rgba(0, 0, 0, 0.18));
  border: 1px solid rgba(168, 85, 247, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
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
  position: relative;
  margin-top: 44px;
  padding: 30px;
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(168, 85, 247, 0.08), transparent 55%),
    var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-xl);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05),
              0 24px 60px rgba(10, 6, 26, 0.5);
  overflow: hidden;
}

.sb-cabecera {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 26px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--borde-sutil);
  flex-wrap: wrap;
  gap: 15px;
}
.sb-titulo-area {
  display: flex;
  align-items: center;
  gap: 14px;
}
.sb-titulo-area svg {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  padding: 9px;
  border-radius: var(--radio-md);
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid var(--glass-borde);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), var(--glow-morado);
}
.sb-titulo-area h3 {
  margin: 0;
  font-family: var(--fuente-titulo);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.015em;
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
.flujo-titulo { font-size: 1rem; font-weight: 800; margin: 4px 0 12px; color: var(--texto-principal); }
.flujo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 22px; }
.flujo-card { border: 1px solid var(--borde-sutil); border-radius: 14px; padding: 14px 16px; background: var(--fondo-tarjeta); border-left: 4px solid var(--borde-sutil); }
.flujo-card.f-entro { border-left-color: #22c55e; }
.flujo-card.f-consumo { border-left-color: #a855f7; }
.flujo-card.f-devuelto { border-left-color: #3b82f6; }
.flujo-card.f-retiro { border-left-color: #f59e0b; }
.flujo-card.f-retenido { border-left-color: #ec4899; }
.flujo-label { display: block; font-size: 0.78rem; color: var(--texto-secundario); font-weight: 700; }
.flujo-valor { display: block; font-size: 1.4rem; font-weight: 800; color: var(--texto-principal); margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.flujo-sub { display: block; font-size: 0.72rem; color: var(--texto-desactivado); }

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
  --acento: var(--morado-brillante);
  --acento-tinte: rgba(168, 85, 247, 0.14);
  position: relative;
  background: var(--glass-fondo);
  border: 1px solid var(--glass-borde);
  border-radius: var(--radio-lg);
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: transform 0.25s var(--ease-suave), box-shadow 0.25s ease, border-color 0.25s ease;
}
.kbi-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--acento), transparent 80%);
  pointer-events: none;
}
.kbi-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--acento) 45%, transparent);
  box-shadow: 0 14px 30px rgba(10, 4, 20, 0.45), 0 0 20px var(--acento-tinte);
}
.kbi-morado   { --acento: var(--morado-brillante); --acento-tinte: rgba(168, 85, 247, 0.15); }
.kbi-verde    { --acento: var(--color-exito);      --acento-tinte: rgba(34, 197, 94, 0.14); }
.kbi-azul     { --acento: var(--color-info);       --acento-tinte: rgba(56, 189, 248, 0.14); }
.kbi-rojo     { --acento: var(--color-error);      --acento-tinte: rgba(239, 68, 68, 0.14); }
.kbi-amarillo { --acento: var(--color-alerta);     --acento-tinte: rgba(245, 158, 11, 0.14); }
.kbi-rosa     { --acento: var(--rosa-acento);      --acento-tinte: rgba(236, 72, 153, 0.15); }

.kbi-icono {
  width: 50px;
  height: 50px;
  border-radius: var(--radio-md);
  background: var(--acento-tinte);
  border: 1px solid color-mix(in srgb, var(--acento) 28%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--acento);
  transition: transform 0.25s var(--ease-rebote);
}
.kbi-card:hover .kbi-icono { transform: scale(1.08) rotate(-3deg); }
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

