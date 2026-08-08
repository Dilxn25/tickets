// ============================================
// EUPHORIA — Servicio de Recomendaciones (IA)
// Reenvía la petición al microservicio Python (FastAPI) y devuelve las sugerencias.
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { registrarPrecio } = require('../../utilidades/historial-precios')
const { emitirConfigActualizada } = require('../../utilidades/config-runtime')

// Caché en memoria (60s) para combos/packs: las consultas de co-ocurrencia
// escanean todo el historial y no cambian minuto a minuto
const cacheIA = {}
const CACHE_TTL = 60000

// ---- Configuración de la IA (tabla configuracion, con valores por defecto) ----
const CONFIG_DEFECTO = {
  ia_descuento_combos: '10',
  ia_sugerencias_activas: '1',
  premio_perfil_pct: '10',
  premio_perfil_max: '50',
  comision_cancelacion_pct: '10',
}

async function leerConfigIA() {
  const filas = await prisma.configuracion.findMany({
    where: { clave: { in: Object.keys(CONFIG_DEFECTO) } }
  })
  const cfg = { ...CONFIG_DEFECTO }
  filas.forEach(f => { cfg[f.clave] = f.valor })
  return {
    descuento_combos: Math.min(Math.max(parseFloat(cfg.ia_descuento_combos) || 10, 0), 90),
    sugerencias_activas: cfg.ia_sugerencias_activas === '1',
    // Premio por perfil completo (módulo cliente), editable por el admin
    premio_pct: Math.min(Math.max(parseFloat(cfg.premio_perfil_pct) || 10, 0), 90),
    premio_max: Math.max(parseFloat(cfg.premio_perfil_max) || 50, 0),
    // Comisión que retiene el local al devolver dentro de las 24 h
    comision_cancelacion: Math.min(Math.max(parseFloat(cfg.comision_cancelacion_pct) || 10, 0), 90),
  }
}

// GET /api/recomendaciones/config — leer configuración del panel de IA (solo admin)
router.get('/config', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    res.json(await leerConfigIA())
  } catch (error) {
    console.error('Error leyendo config IA:', error)
    res.status(500).json({ error: 'Error al leer la configuración' })
  }
})

// PUT /api/recomendaciones/config — actualizar configuración (solo admin)
router.put('/config', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const { descuento_combos, sugerencias_activas } = req.body

    if (descuento_combos !== undefined) {
      const pct = parseFloat(descuento_combos)
      if (isNaN(pct) || pct < 0 || pct > 90) {
        return res.status(400).json({ error: 'El descuento debe ser un número entre 0 y 90' })
      }
      await prisma.configuracion.upsert({
        where: { clave: 'ia_descuento_combos' },
        update: { valor: String(pct) },
        create: { clave: 'ia_descuento_combos', valor: String(pct), descripcion: 'Porcentaje de descuento aplicado a los combos sugeridos por la IA' }
      })
    }
    if (sugerencias_activas !== undefined) {
      await prisma.configuracion.upsert({
        where: { clave: 'ia_sugerencias_activas' },
        update: { valor: sugerencias_activas ? '1' : '0' },
        create: { clave: 'ia_sugerencias_activas', valor: sugerencias_activas ? '1' : '0', descripcion: 'Si las sugerencias de la IA se muestran en la toma de pedidos (1=si, 0=no)' }
      })
    }
    // Premio por perfil completo (módulo cliente)
    const { premio_pct, premio_max } = req.body
    if (premio_pct !== undefined) {
      const p = parseFloat(premio_pct)
      if (isNaN(p) || p < 0 || p > 90) {
        return res.status(400).json({ error: 'El porcentaje del premio debe estar entre 0 y 90' })
      }
      await prisma.configuracion.upsert({
        where: { clave: 'premio_perfil_pct' },
        update: { valor: String(p) },
        create: { clave: 'premio_perfil_pct', valor: String(p), descripcion: 'Porcentaje de descuento del premio por perfil completo' }
      })
    }
    if (premio_max !== undefined) {
      const m = parseFloat(premio_max)
      if (isNaN(m) || m < 0) {
        return res.status(400).json({ error: 'El tope del premio debe ser un número mayor o igual a 0' })
      }
      await prisma.configuracion.upsert({
        where: { clave: 'premio_perfil_max' },
        update: { valor: String(m) },
        create: { clave: 'premio_perfil_max', valor: String(m), descripcion: 'Tope en Bs del descuento del premio por perfil completo' }
      })
    }
    // La comisión de devolución se administra desde Ventas (no es IA):
    // ver PUT /api/comandas/config-comision.
    const cfg = await leerConfigIA()
    // Difundir TODA la config a las interfaces abiertas para que reaccionen en vivo
    // (sugerencias en el mesero, descuento de combos en catálogos, premio en el cliente).
    emitirConfigActualizada({
      sugerencias_activas: cfg.sugerencias_activas,
      descuento_combos: cfg.descuento_combos,
      premio_pct: cfg.premio_pct,
      premio_max: cfg.premio_max,
    })
    res.json(cfg)
  } catch (error) {
    console.error('Error guardando config IA:', error)
    res.status(500).json({ error: 'Error al guardar la configuración' })
  }
})

// GET /api/recomendaciones/estado — ¿el microservicio Python está en línea?
// Lo consultan el admin (panel IA) y también caja/mesero para avisar si se cae.
router.get('/estado', verificarToken, soloRoles('Administrador', 'Cajero', 'Mesero', 'Bartender'), async (req, res) => {
  const urlIA = process.env.URL_SERVICIO_IA || 'http://localhost:8000'
  try {
    // Cualquier respuesta HTTP (aunque sea 404) significa que el servicio está vivo
    await fetch(urlIA, { signal: AbortSignal.timeout(2500) })
    res.json({ en_linea: true, url: urlIA })
  } catch {
    res.json({ en_linea: false, url: urlIA })
  }
})

// GET /api/recomendaciones/modelo — estado del modelo activo (real/demo) [admin]
// Sirve para el interruptor "Usar datos para la demostración" del Panel de IA.
router.get('/modelo', verificarToken, soloRoles('Administrador'), async (req, res) => {
  const urlIA = process.env.URL_SERVICIO_IA || 'http://localhost:8000'
  try {
    const r = await fetch(`${urlIA}/modelo/estado`, { signal: AbortSignal.timeout(2500) })
    res.json(await r.json())
  } catch {
    res.json({ modo: 'real', personalizado: false, disponibles: ['real'], sin_conexion: true })
  }
})

// PUT /api/recomendaciones/modelo {modo:'real'|'demo'} — conmutar el modelo [admin]
// 'demo' = modelo PERSONALIZADO (aprende el gusto de cada cliente); solo existe en
// local. En producción no se despliega el pkl demo, así que responde "no disponible".
router.put('/modelo', verificarToken, soloRoles('Administrador'), async (req, res) => {
  const urlIA = process.env.URL_SERVICIO_IA || 'http://localhost:8000'
  const modo = req.body?.modo === 'demo' ? 'demo' : 'real'
  try {
    const r = await fetch(`${urlIA}/modelo/activar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo }), signal: AbortSignal.timeout(4000),
    })
    res.json(await r.json())
  } catch {
    res.status(502).json({ ok: false, error: 'Servicio de IA no disponible' })
  }
})

// GET /api/recomendaciones/clientes-demo — clientes CON historial (para el probador) [admin]
router.get('/clientes-demo', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const filas = await prisma.$queryRawUnsafe(`
      SELECT u.id_usuario id, CONCAT(u.nombres, ' ', u.apellidos) nombre, u.correo,
             COUNT(c.id_comanda) comandas
      FROM usuario u
      JOIN comanda c ON c.id_cliente = u.id_usuario AND c.estado_despacho <> 'Cancelada'
      GROUP BY u.id_usuario, nombre, u.correo
      HAVING comandas > 0
      ORDER BY comandas DESC LIMIT 20`)
    res.json(filas.map(f => ({ id: Number(f.id), nombre: f.nombre, correo: f.correo, comandas: Number(f.comandas) })))
  } catch (e) {
    console.warn('clientes-demo:', e.message)
    res.json([])
  }
})

// POST /api/recomendaciones/reportar-caida — el mesero avisa a caja/admin que la IA está caída.
// Reenvía el aviso en tiempo real a todas las pantallas conectadas (caja, panel del admin).
router.post('/reportar-caida', verificarToken, soloRoles('Administrador', 'Cajero', 'Mesero', 'Bartender'), (req, res) => {
  const reportadoPor = (req.body?.nombre || 'Un compañero').toString().trim().slice(0, 60)
  if (global.io) {
    global.io.emit('ia_reportada', {
      reportadoPor,
      id_usuario: req.usuario.id,
      hora: new Date().toISOString(),
    })
  }
  res.json({ ok: true })
})

// GET /api/recomendaciones/combos — Combos populares (pares más co-comprados) para promociones.
// Se calcula en SQL a partir del historial real. Cada combo trae precio normal y con descuento.
// Redondea a un precio "atractivo" que termina en .90/.40/.50/.60/.00 (un decimal)
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

router.get('/combos', verificarToken, async (req, res) => {
  try {
    // Descuento configurable desde el Panel de IA (antes fijo en 10%)
    const { descuento_combos } = await leerConfigIA()
    const DESCUENTO = descuento_combos / 100
    // tam=2 (pares) por defecto; 3=tríos, 4=cuartetos (los calcula el módulo de IA)
    const tam = [2, 3, 4].includes(Number(req.query.tam)) ? Number(req.query.tam) : 2

    const claveCache = `combos:${tam}:${descuento_combos}`
    const hit = cacheIA[claveCache]
    if (hit && Date.now() - hit.ts < CACHE_TTL) return res.json({ combos: hit.data })

    // 1) El MÓDULO DE IA (euphoria-ia) es quien calcula; Node solo reenvía
    try {
      const urlIA = process.env.URL_SERVICIO_IA || 'http://localhost:8000'
      const r = await fetch(`${urlIA}/combos?tam=${tam}&descuento=${DESCUENTO}`, { signal: AbortSignal.timeout(3500) })
      if (r.ok) {
        const d = await r.json()
        if (Array.isArray(d.combos)) {
          cacheIA[claveCache] = { ts: Date.now(), data: d.combos }
          return res.json({ combos: d.combos, origen: 'modelo-ia' })
        }
      }
    } catch { /* motor apagado: respaldo local abajo */ }

    // 2) Respaldo local (solo pares/tríos; cuartetos requieren el módulo)
    if (tam === 4) return res.json({ combos: [], requiere_ia: true })

    let filas
    if (tam === 3) {
      filas = await prisma.$queryRawUnsafe(`
        SELECT p1.id_producto id1, p1.nombre_producto n1, p1.precio_base pr1, p1.url_imagen img1,
               p2.id_producto id2, p2.nombre_producto n2, p2.precio_base pr2, p2.url_imagen img2,
               p3.id_producto id3, p3.nombre_producto n3, p3.precio_base pr3, p3.url_imagen img3,
               COUNT(*) veces
        FROM detalle_comanda d1
        JOIN detalle_comanda d2 ON d1.id_comanda = d2.id_comanda AND d1.id_producto < d2.id_producto
        JOIN detalle_comanda d3 ON d1.id_comanda = d3.id_comanda AND d2.id_producto < d3.id_producto
        JOIN comanda c ON c.id_comanda = d1.id_comanda AND c.estado_despacho <> 'Cancelada'
        JOIN producto p1 ON p1.id_producto = d1.id_producto
        JOIN producto p2 ON p2.id_producto = d2.id_producto
        JOIN producto p3 ON p3.id_producto = d3.id_producto
        GROUP BY id1, n1, pr1, img1, id2, n2, pr2, img2, id3, n3, pr3, img3
        ORDER BY veces DESC LIMIT 6
      `)
    } else {
      filas = await prisma.$queryRawUnsafe(`
        SELECT p1.id_producto id1, p1.nombre_producto n1, p1.precio_base pr1, p1.url_imagen img1,
               p2.id_producto id2, p2.nombre_producto n2, p2.precio_base pr2, p2.url_imagen img2,
               COUNT(*) veces
        FROM detalle_comanda d1
        JOIN detalle_comanda d2 ON d1.id_comanda = d2.id_comanda AND d1.id_producto < d2.id_producto
        JOIN comanda c ON c.id_comanda = d1.id_comanda AND c.estado_despacho <> 'Cancelada'
        JOIN producto p1 ON p1.id_producto = d1.id_producto
        JOIN producto p2 ON p2.id_producto = d2.id_producto
        GROUP BY p1.id_producto, p1.nombre_producto, p1.precio_base, p1.url_imagen,
                 p2.id_producto, p2.nombre_producto, p2.precio_base, p2.url_imagen
        ORDER BY veces DESC LIMIT 6
      `)
    }

    const combos = filas.map(r => {
      const prods = [
        { id_producto: Number(r.id1), nombre: r.n1, precio: Number(r.pr1), url_imagen: r.img1 },
        { id_producto: Number(r.id2), nombre: r.n2, precio: Number(r.pr2), url_imagen: r.img2 },
      ]
      if (tam === 3) prods.push({ id_producto: Number(r.id3), nombre: r.n3, precio: Number(r.pr3), url_imagen: r.img3 })
      const normal = prods.reduce((a, p) => a + p.precio, 0)
      return {
        productos: prods.map(({ precio, ...p }) => p),
        nombre: prods.map(p => p.nombre).join(' + '),
        precio_normal: Math.round(normal * 100) / 100,
        precio_combo: precioAtractivo(normal * (1 - DESCUENTO)),
        descuento_pct: Math.round(DESCUENTO * 100),
        veces: Number(r.veces),
      }
    })

    // El PORQUÉ de cada combo: qué % de las mesas del producto ancla lleva el resto
    if (filas.length) {
      const idsAncla = [...new Set(filas.map(r => Number(r.id1)))]
      const tot = await prisma.$queryRawUnsafe(`
        SELECT id_producto, COUNT(DISTINCT id_comanda) total
        FROM detalle_comanda WHERE id_producto IN (${idsAncla.join(',')}) GROUP BY id_producto`)
      const totalPor = Object.fromEntries(tot.map(t => [Number(t.id_producto), Number(t.total)]))
      combos.forEach((c, i) => {
        const total = totalPor[Number(filas[i].id1)] || 0
        if (total) {
          c.razon = `${Math.round(c.veces / total * 100)}% de las ${total} mesas que piden ${filas[i].n1} llevan también el resto`
        }
      })
    }

    cacheIA[claveCache] = { ts: Date.now(), data: combos }
    res.json({ combos })
  } catch (error) {
    console.error('Error obteniendo combos:', error)
    res.json({ combos: [] }) // degradación elegante
  }
})

// POST /api/recomendaciones
// Body: { productos_en_mesa: number[], k?: number }
router.post('/', verificarToken, async (req, res) => {
  try {
    // Interruptor del Panel de IA: si el admin desactivó las sugerencias,
    // la toma de pedidos sigue normal pero sin recomendaciones
    const { sugerencias_activas } = await leerConfigIA()
    if (!sugerencias_activas) {
      return res.json({ recomendaciones: [], promociones: [], desactivado: true })
    }

    // probador=true → consulta desde el Panel de IA: NO se registra en efectividad
    // (solo cuentan las sugerencias mostradas a meseros en pedidos reales)
    // id_cliente → PERSONALIZACION: se le pasa al modelo el historial de ESE cliente
    // (el modelo demo lo usa para recomendar a su gusto; el real lo ignora sin efecto).
    const { productos_en_mesa = [], k = 3, probador = false, id_cliente = null } = req.body
    const urlIA = process.env.URL_SERVICIO_IA || 'http://localhost:8000'

    // Historial del cliente (lista con repetición por frecuencia; el modelo pesa el gusto).
    // Cap de 30 por producto para no mandar payloads enormes de clientes muy activos.
    let historial_cliente = null
    if (id_cliente) {
      try {
        const filas = await prisma.$queryRawUnsafe(
          `SELECT d.id_producto pid, COUNT(*) n
           FROM detalle_comanda d
           JOIN comanda c ON c.id_comanda = d.id_comanda
           WHERE c.id_cliente = ${Number(id_cliente)} AND c.estado_despacho <> 'Cancelada'
           GROUP BY d.id_producto`)
        historial_cliente = []
        for (const f of filas) {
          const veces = Math.min(Number(f.n), 30)
          for (let i = 0; i < veces; i++) historial_cliente.push(Number(f.pid))
        }
        if (!historial_cliente.length) historial_cliente = null // cliente nuevo: arranque en frío
      } catch (e) { console.warn('No se pudo leer historial del cliente:', e.message) }
    }

    // Fecha/hora actual en formato "YYYY-MM-DD HH:mm:ss" (contexto del modelo)
    const ahora = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const fecha_hora = `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())} ` +
                       `${p(ahora.getHours())}:${p(ahora.getMinutes())}:${p(ahora.getSeconds())}`

    const respuesta = await fetch(`${urlIA}/recomendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos_en_mesa, fecha_hora, k, historial_cliente }),
      signal: AbortSignal.timeout(4000), // no bloquear la toma de pedidos si la IA tarda
    })

    if (!respuesta.ok) throw new Error(`IA respondió ${respuesta.status}`)
    const datos = await respuesta.json()

    // ---- Enriquecer con el "PORQUÉ" (datos reales de co-compra) y registrar
    //      cada sugerencia para medir su efectividad real (aceptada o no) ----
    const recs = datos.recomendaciones || []
    const idsMesa = productos_en_mesa.map(Number).filter(n => Number.isInteger(n) && n > 0)
    const idsRec = recs.map(r => Number(r.id_producto)).filter(n => Number.isInteger(n) && n > 0)

    let pares = [], totalesMesa = [], nombresMesa = []
    if (idsMesa.length && idsRec.length) {
      try {
        [pares, totalesMesa, nombresMesa] = await Promise.all([
          prisma.$queryRawUnsafe(`
            SELECT d1.id_producto pm, d2.id_producto pr, COUNT(DISTINCT d1.id_comanda) juntos
            FROM detalle_comanda d1
            JOIN detalle_comanda d2 ON d1.id_comanda = d2.id_comanda AND d2.id_producto IN (${idsRec.join(',')})
            WHERE d1.id_producto IN (${idsMesa.join(',')})
            GROUP BY pm, pr`),
          prisma.$queryRawUnsafe(`
            SELECT id_producto pm, COUNT(DISTINCT id_comanda) total
            FROM detalle_comanda WHERE id_producto IN (${idsMesa.join(',')}) GROUP BY pm`),
          prisma.producto.findMany({ where: { id_producto: { in: idsMesa } }, select: { id_producto: true, nombre_producto: true } })
        ])
      } catch (e) { console.warn('No se pudo calcular co-compra:', e.message) }
    }
    const totalPorMesa = Object.fromEntries(totalesMesa.map(t => [Number(t.pm), Number(t.total)]))
    const nombrePorMesa = Object.fromEntries(nombresMesa.map(p => [p.id_producto, p.nombre_producto]))

    for (const r of recs) {
      const razones = []
      // 1) Evidencia histórica: con qué producto de la mesa se lleva mejor
      const susParejas = pares.filter(p => Number(p.pr) === Number(r.id_producto))
      if (susParejas.length) {
        const mejor = susParejas.reduce((a, b) => Number(b.juntos) > Number(a.juntos) ? b : a)
        const juntos = Number(mejor.juntos)
        const total = totalPorMesa[Number(mejor.pm)] || 0
        const nombreMesa = nombrePorMesa[Number(mejor.pm)] || 'lo pedido'
        if (juntos > 0 && total > 0) {
          razones.push(`Acompañó a ${nombreMesa} en ${juntos} pedidos reales (${Math.round(juntos / total * 100)}% de sus mesas)`)
        }
      }
      // 2) Factores del modelo (hora, margen, promoción)
      const f = r.factores || {}
      if (f.temporal >= 1.05) razones.push('Se vende fuerte a esta hora del día')
      else if (f.temporal && f.temporal <= 0.95) razones.push('Fuera de su horario más fuerte')
      if (f.margen >= 1.03) razones.push('Deja buen margen al local')
      if (r.en_promocion) razones.push('Está en promoción (más fácil de aceptar)')
      razones.push(`El modelo estima ${(r.probabilidad * 100).toFixed(0)}% de probabilidad de que lo acepten`)
      r.razones = razones

      // 3) Registrar la sugerencia mostrada (para el reporte de efectividad)
      if (probador) continue
      try {
        const reg = await prisma.sugerencia_ia.create({
          data: {
            id_producto: Number(r.id_producto),
            nombre_producto: String(r.nombre || '').slice(0, 120),
            probabilidad: r.probabilidad ?? null,
            id_mesero: req.usuario?.id ?? null
          }
        })
        r.id_sugerencia = reg.id_sugerencia
      } catch (e) { console.warn('No se pudo registrar sugerencia:', e.message) }
    }

    res.json(datos)
  } catch (error) {
    // Degradación elegante: si la IA no está disponible, se devuelve vacío
    // (la toma de pedidos sigue funcionando, solo sin sugerencias).
    console.error('Recomendaciones IA no disponibles:', error.message)
    res.json({ recomendaciones: [], promociones: [], error: 'Servicio de recomendación no disponible' })
  }
})

// GET /api/recomendaciones/packs — 3 packs "para mesa" (pensados para ofrecer al reservar).
// No es fuerza bruta de combinaciones: se arman con REGLAS de composición
// (licor ancla + mezclador + acompañamiento) usando los más vendidos de cada categoría.
router.get('/packs', verificarToken, async (req, res) => {
  try {
    const { descuento_combos } = await leerConfigIA()
    const DESCUENTO = descuento_combos / 100

    const clavePacks = `packs:${descuento_combos}`
    const hitP = cacheIA[clavePacks]
    if (hitP && Date.now() - hitP.ts < CACHE_TTL) return res.json({ packs: hitP.data })

    // 1) El MÓDULO DE IA calcula los packs; Node solo reenvía
    try {
      const urlIA = process.env.URL_SERVICIO_IA || 'http://localhost:8000'
      const r = await fetch(`${urlIA}/packs?descuento=${DESCUENTO}`, { signal: AbortSignal.timeout(3500) })
      if (r.ok) {
        const d = await r.json()
        if (Array.isArray(d.packs)) {
          cacheIA[clavePacks] = { ts: Date.now(), data: d.packs }
          return res.json({ packs: d.packs, origen: 'modelo-ia' })
        }
      }
    } catch { /* respaldo local abajo */ }

    // 2) RESPALDO LOCAL (misma lógica DINÁMICA que el módulo, sin recetas fijas):
    // los packs se aprenden de las composiciones que MÁS repiten las mesas grandes reales.
    const composicion = await prisma.$queryRawUnsafe(`
      SELECT d.id_comanda, cat.nombre_categoria categoria, SUM(d.cantidad) cant
      FROM detalle_comanda d
      JOIN comanda c ON c.id_comanda = d.id_comanda AND c.estado_despacho <> 'Cancelada'
      JOIN producto p ON p.id_producto = d.id_producto
      JOIN categoria cat ON cat.id_categoria = p.id_categoria
      GROUP BY d.id_comanda, categoria
    `)
    const topFilas = await prisma.$queryRawUnsafe(`
      SELECT p.id_producto, p.nombre_producto nombre, p.precio_base precio, p.url_imagen,
             cat.nombre_categoria categoria, COALESCE(SUM(d.cantidad), 0) vendidos
      FROM producto p
      JOIN categoria cat ON cat.id_categoria = p.id_categoria
      LEFT JOIN detalle_comanda d ON d.id_producto = p.id_producto
      LEFT JOIN comanda c ON c.id_comanda = d.id_comanda AND c.estado_despacho <> 'Cancelada'
      WHERE p.stock_actual > 0 AND p.es_combo = 0
      GROUP BY p.id_producto, nombre, precio, p.url_imagen, categoria
      ORDER BY vendidos DESC
    `)

    // N.1 actual por categoría (con stock)
    const topPorCat = {}
    for (const f of topFilas) if (!topPorCat[f.categoria]) topPorCat[f.categoria] = f

    // Composición por comanda -> firma "categoria:cant|..." y conteo de patrones grandes
    const porComanda = {}
    for (const f of composicion) {
      (porComanda[f.id_comanda] = porComanda[f.id_comanda] || {})[f.categoria] = Number(f.cant)
    }
    const totales = Object.values(porComanda).map(c => Object.values(c).reduce((a, b) => a + b, 0)).sort((a, b) => a - b)
    if (!totales.length) return res.json({ packs: [] })
    const umbral = Math.max(5, totales[Math.floor(totales.length * 0.80)])

    const patrones = {}
    for (const comp of Object.values(porComanda)) {
      if (Object.values(comp).reduce((a, b) => a + b, 0) < umbral) continue
      const firma = Object.entries(comp).sort((a, b) => a[0].localeCompare(b[0]))
      const clave = firma.map(([c, n]) => `${c}:${n}`).join('|')
      ;(patrones[clave] = patrones[clave] || { firma, veces: 0 }).veces++
    }

    const packs = []
    for (const { firma, veces } of Object.values(patrones).sort((a, b) => b.veces - a.veces)) {
      if (packs.length >= 3) break
      if (veces < 3) continue
      const items = firma.map(([categoria, cant]) => topPorCat[categoria] && { f: topPorCat[categoria], cant }).filter(Boolean)
      if (items.length < 2 || items.length < firma.length) continue // sin stock completo no se ofrece
      const normal = items.reduce((a, it) => a + Number(it.f.precio) * it.cant, 0)
      const etiqueta = firma.map(([c, n]) => `${n}× ${c}`).join(' + ')
      // El pack se nombra por su producto ANCLA: la categoría del item más caro (el licor/botella)
      const ancla = items.reduce((m, it) => (Number(it.f.precio) > Number(m.f.precio) ? it : m))
      const dominante = firma[items.indexOf(ancla)][0]
      const nombreBase = `Pack ${dominante} para mesa`
      packs.push({
        nombre: packs.some(p => p.nombre === nombreBase) ? `Pack ${dominante} (${etiqueta})` : nombreBase,
        descripcion: `Como lo piden las mesas grandes: ${etiqueta}`,
        razon: `Patrón real del historial: ${veces} mesas grandes pidieron exactamente esta combinación (se arma con el más vendido de cada categoría, solo con stock)`,
        veces,
        items: items.map(it => ({ id_producto: it.f.id_producto, nombre: it.f.nombre, cantidad: it.cant, url_imagen: it.f.url_imagen })),
        precio_normal: Math.round(normal * 100) / 100,
        precio_pack: precioAtractivo(normal * (1 - DESCUENTO)),
        descuento_pct: Math.round(DESCUENTO * 100)
      })
    }

    cacheIA[clavePacks] = { ts: Date.now(), data: packs }
    res.json({ packs })
  } catch (error) {
    console.error('Error armando packs:', error)
    res.json({ packs: [] })
  }
})

// POST /api/recomendaciones/crear-combo — convierte una sugerencia en producto combo REAL.
// Valida duplicados SIN importar el orden: {cerveza, redbull} == {redbull, cerveza}.
// Si ya existe con la misma composición, solo actualiza el precio y avisa.
router.post('/crear-combo', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const { nombre, precio, items = [] } = req.body
    const precioNum = parseFloat(precio)
    if (!items.length || isNaN(precioNum) || precioNum <= 0) {
      return res.status(400).json({ error: 'Combo inválido: faltan productos o precio.' })
    }
    // Firma canónica de la composición: id:cantidad ordenado por id (ignora el orden)
    const firma = (lista) => lista
      .map(i => `${Number(i.id_producto ?? i.id_producto_hijo)}:${Number(i.cantidad) || 1}`)
      .sort()
      .join('|')
    const firmaNueva = firma(items)

    const combosExistentes = await prisma.producto.findMany({
      where: { es_combo: true },
      include: { combo_detalle_combo_detalle_id_producto_padreToproducto: true }
    })
    const duplicado = combosExistentes.find(c =>
      firma(c.combo_detalle_combo_detalle_id_producto_padreToproducto) === firmaNueva
    )

    if (duplicado) {
      const precioAnterior = Number(duplicado.precio_base)
      await prisma.producto.update({
        where: { id_producto: duplicado.id_producto },
        data: { precio_base: precioNum }
      })
      if (precioAnterior !== precioNum) {
        await registrarPrecio({
          idProducto: duplicado.id_producto, idUsuario: req.usuario.id, tipo: 'base',
          precioAnterior, precioNuevo: precioNum, origen: 'combo_ia',
        })
      }
      return res.json({
        ya_existia: true,
        nombre: duplicado.nombre_producto,
        precio_anterior: precioAnterior,
        precio_nuevo: precioNum
      })
    }

    // Crear el combo nuevo: hereda categoría del primer componente
    const base = await prisma.producto.findUnique({ where: { id_producto: Number(items[0].id_producto) } })
    if (!base) return res.status(400).json({ error: 'Producto base no encontrado.' })
    const nuevo = await prisma.producto.create({
      data: {
        nombre_producto: String(nombre || 'Combo IA').slice(0, 100),
        precio_base: precioNum,
        stock_actual: 999, // el stock real lo limitan los componentes al vender
        es_combo: true,
        estado_promocion: false,
        id_categoria: base.id_categoria
      }
    })
    await prisma.combo_detalle.createMany({
      data: items.map(i => ({
        id_producto_padre: nuevo.id_producto,
        id_producto_hijo: Number(i.id_producto),
        cantidad: Number(i.cantidad) || 1
      }))
    })
    await registrarPrecio({
      idProducto: nuevo.id_producto, idUsuario: req.usuario.id, tipo: 'base',
      precioAnterior: null, precioNuevo: precioNum, origen: 'combo_ia',
    })
    res.json({ ya_existia: false, nombre: nuevo.nombre_producto, id_producto: nuevo.id_producto })
  } catch (error) {
    console.error('Error creando combo real:', error)
    res.status(500).json({ error: 'No se pudo crear el combo.' })
  }
})

// PATCH /api/recomendaciones/sugerencias/:id/aceptar — el mesero agregó la sugerencia al pedido
router.patch('/sugerencias/:id/aceptar', verificarToken, async (req, res) => {
  try {
    await prisma.sugerencia_ia.update({
      where: { id_sugerencia: Number(req.params.id) },
      data: { aceptada: true }
    })
    res.json({ ok: true })
  } catch {
    res.json({ ok: false }) // no bloquear la toma de pedidos por esto
  }
})

// GET /api/recomendaciones/efectividad — qué tanto ACEPTA la gente lo que la IA sugiere (solo admin)
router.get('/efectividad', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    // Filtros: por rango de fechas o por EVENTO (su ventana horaria manda)
    let gte, lte
    if (req.query.evento) {
      const ev = await prisma.evento.findUnique({ where: { id_evento: Number(req.query.evento) } })
      if (ev) { gte = ev.fecha_hora_inicio; lte = ev.fecha_hora_fin || new Date() }
    } else {
      if (req.query.desde) { const [y, m, d] = req.query.desde.split('-').map(Number); gte = new Date(y, m - 1, d) }
      if (req.query.hasta) { const [y, m, d] = req.query.hasta.split('-').map(Number); lte = new Date(y, m - 1, d, 23, 59, 59, 999) }
    }
    const where = (gte || lte) ? { fecha_hora: { ...(gte && { gte }), ...(lte && { lte }) } } : {}
    const condSQL = (gte || lte)
      ? `WHERE ${[gte && `fecha_hora >= '${gte.toISOString().slice(0, 19).replace('T', ' ')}'`,
                  lte && `fecha_hora <= '${lte.toISOString().slice(0, 19).replace('T', ' ')}'`].filter(Boolean).join(' AND ')}`
      : ''

    const [mostradas, aceptadas, top] = await Promise.all([
      prisma.sugerencia_ia.count({ where }),
      prisma.sugerencia_ia.count({ where: { ...where, aceptada: true } }),
      prisma.$queryRawUnsafe(`
        SELECT nombre_producto nombre, COUNT(*) mostradas, SUM(aceptada) aceptadas
        FROM sugerencia_ia ${condSQL}
        GROUP BY nombre_producto
        ORDER BY aceptadas DESC, mostradas DESC LIMIT 5
      `)
    ])
    const topNorm = top.map(t => ({
      nombre: t.nombre,
      mostradas: Number(t.mostradas),
      aceptadas: Number(t.aceptadas),
      tasa: Number(t.mostradas) ? Math.round(Number(t.aceptadas) / Number(t.mostradas) * 100) : 0
    }))
    res.json({
      mostradas,
      aceptadas,
      tasa: mostradas ? Math.round(aceptadas / mostradas * 100) : 0,
      // El producto que MÁS acepta la gente (para decisión rápida)
      mas_aceptado: topNorm.find(t => t.aceptadas > 0) || null,
      top: top.map(t => ({
        nombre: t.nombre,
        mostradas: Number(t.mostradas),
        aceptadas: Number(t.aceptadas),
        tasa: Number(t.mostradas) ? Math.round(Number(t.aceptadas) / Number(t.mostradas) * 100) : 0
      }))
    })
  } catch (error) {
    console.error('Error en efectividad IA:', error)
    res.status(500).json({ error: 'Error al calcular la efectividad' })
  }
})

module.exports = router
