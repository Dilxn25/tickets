// ============================================
// EUPHORIA — Servicio de Productos
// Rutas: GET    /api/productos
//        GET    /api/productos/:id
//        POST   /api/productos
//        PUT    /api/productos/:id
//        PATCH  /api/productos/:id/promo
//        DELETE /api/productos/:id
//        GET    /api/productos/categorias
//        POST   /api/productos/categorias
// ============================================
const express  = require('express')
const router   = express.Router()
const prisma   = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { subirImagenProducto, eliminarImagen } = require('../../config/cloudinary')
const { registrarPrecio, registrarCambios } = require('../../utilidades/historial-precios')
const { emitirCatalogoActualizado } = require('../../utilidades/config-runtime')

router.use(verificarToken)

// Valida que un número monetario/cantidad sea válido (> 0, o >= 0 si se permite cero).
// Devuelve mensaje de error o null.
function validarNumero(valor, etiqueta, { permitirCero = false } = {}) {
  const n = parseFloat(valor)
  if (!Number.isFinite(n)) return `${etiqueta} debe ser un número válido.`
  if (permitirCero ? n < 0 : n <= 0) return `${etiqueta} debe ser mayor ${permitirCero ? 'o igual a' : 'a'} 0.`
  return null
}

// Valida la coherencia de una promoción. Devuelve un mensaje de error (string)
// si es inválida, o null si está bien. Solo aplica cuando la promo está activa.
function validarPromo(promoActiva, precioPromo, precioBase) {
  if (!promoActiva) return null
  const promo = parseFloat(precioPromo)
  const base  = parseFloat(precioBase)
  if (!(promo > 0)) return 'Para activar la promoción debes definir un precio de promoción mayor a 0.'
  if (Number.isFinite(base) && promo >= base) return 'El precio de promoción debe ser menor al precio base.'
  return null
}

// Sincroniza los componentes de un combo (tabla combo_detalle). Reemplaza por
// completo las filas del combo `idPadre`. `componentesRaw` puede venir como
// string JSON (FormData) o array. Ignora entradas inválidas y la auto-referencia.
async function sincronizarCombo(idPadre, componentesRaw) {
  let comps = []
  try {
    comps = typeof componentesRaw === 'string' ? JSON.parse(componentesRaw) : (componentesRaw || [])
  } catch { comps = [] }
  if (!Array.isArray(comps)) comps = []

  const filas = comps
    .map(c => ({ id_producto_hijo: parseInt(c.id_producto_hijo), cantidad: parseInt(c.cantidad) || 1 }))
    .filter(c => c.id_producto_hijo && c.id_producto_hijo !== idPadre && c.cantidad > 0)

  await prisma.combo_detalle.deleteMany({ where: { id_producto_padre: idPadre } })
  if (filas.length) {
    await prisma.combo_detalle.createMany({
      data: filas.map(f => ({ id_producto_padre: idPadre, id_producto_hijo: f.id_producto_hijo, cantidad: f.cantidad })),
    })
  }
}

// ---- GET /api/productos/categorias ----
router.get('/categorias', async (req, res) => {
  try {
    const cats = await prisma.categoria.findMany({ orderBy: { nombre_categoria: 'asc' } })
    res.json(cats)
  } catch { res.status(500).json({ error: 'Error al obtener categorías' }) }
})

// ---- POST /api/productos/categorias ----
router.post('/categorias', soloRoles('Administrador'), async (req, res) => {
  try {
    const { nombre_categoria } = req.body
    if (!nombre_categoria) return res.status(400).json({ error: 'Nombre de categoría requerido' })
    const nueva = await prisma.categoria.create({ data: { nombre_categoria } })
    res.status(201).json(nueva)
  } catch { res.status(500).json({ error: 'Error al crear categoría' }) }
})
// ---- PUT /api/productos/categorias/:id ----
router.put('/categorias/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nombre_categoria } = req.body
    if (!nombre_categoria) return res.status(400).json({ error: 'Nombre requerido' })
    const actualizada = await prisma.categoria.update({
      where: { id_categoria: id },
      data: { nombre_categoria }
    })
    res.json(actualizada)
  } catch { res.status(500).json({ error: 'Error al actualizar categoría' }) }
})

// ---- DELETE /api/productos/categorias/:id ----
router.delete('/categorias/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const productosEnCategoria = await prisma.producto.count({ where: { id_categoria: id } })
    
    if (productosEnCategoria > 0) {
      let categoriaOtro = await prisma.categoria.findFirst({ where: { nombre_categoria: 'Otro' } })
      if (!categoriaOtro) {
        categoriaOtro = await prisma.categoria.create({ data: { nombre_categoria: 'Otro' } })
      }
      await prisma.producto.updateMany({
        where: { id_categoria: id },
        data: { id_categoria: categoriaOtro.id_categoria }
      })
    }

    await prisma.categoria.delete({ where: { id_categoria: id } })
    res.json({ mensaje: 'Categoría eliminada' })
  } catch { res.status(500).json({ error: 'Error al eliminar categoría' }) }
})

// ============================================
// REPOSICIONES (mermas por accidente): NO son ventas.
// El bartender repone un producto que se cayó/derramó, descuenta stock y deja
// registrado QUIÉN cometió el error, para el reporte de personal del admin.
// (Estas rutas van ANTES de /:id para que "reposiciones" no se lea como un id.)
// ============================================

// ---- POST /api/productos/reposiciones — registrar una reposición ----
// Body: { id_producto, cantidad, id_responsable, motivo?, id_evento? }
router.post('/reposiciones', soloRoles('Bartender', 'Administrador'), async (req, res) => {
  try {
    const id_producto = Number(req.body.id_producto)
    const cantidad = Number(req.body.cantidad) || 1
    const id_responsable = Number(req.body.id_responsable)
    const motivo = (req.body.motivo || '').toString().slice(0, 200) || null
    const id_evento = Number(req.body.id_evento) || null
    if (!id_producto || !id_responsable) return res.status(400).json({ error: 'Faltan datos: producto y responsable.' })
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return res.status(400).json({ error: 'La cantidad debe ser un entero entre 1 y 99.' })

    // El responsable debe ser personal operativo real (mesero o bartender activo)
    const responsable = await prisma.usuario.findFirst({
      where: { id_usuario: id_responsable, estado_cuenta: 'activo', rol: { nombre_rol: { in: ['Mesero', 'Bartender'] } } },
      select: { id_usuario: true },
    })
    if (!responsable) return res.status(400).json({ error: 'El responsable debe ser un mesero o bartender activo.' })

    const resultado = await prisma.$transaction(async (tx) => {
      // Descuento de stock atómico: solo si alcanza (no dejamos stock negativo)
      const desc = await tx.producto.updateMany({
        where: { id_producto, stock_actual: { gte: cantidad } },
        data: { stock_actual: { decrement: cantidad } },
      })
      if (desc.count === 0) throw { status: 409, error: 'No hay stock suficiente para reponer esa cantidad.' }
      return tx.reposicion.create({
        data: { id_producto, cantidad, id_responsable, id_registrador: req.usuario.id, motivo, id_evento },
      })
    })

    emitirCatalogoActualizado('stock-reposicion')
    res.status(201).json({ ok: true, id_reposicion: resultado.id_reposicion })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.error })
    console.error('Error registrando reposición:', e)
    res.status(500).json({ error: 'No se pudo registrar la reposición.' })
  }
})

// ---- GET /api/productos/reposiciones?evento=&responsable= — listar ----
router.get('/reposiciones', soloRoles('Bartender', 'Administrador'), async (req, res) => {
  try {
    const idEvento = Number(req.query.evento) || null
    const idResp = Number(req.query.responsable) || null
    const filas = await prisma.reposicion.findMany({
      where: {
        ...(idEvento ? { id_evento: idEvento } : {}),
        ...(idResp ? { id_responsable: idResp } : {}),
      },
      orderBy: { fecha_hora: 'desc' },
      take: 100,
      include: {
        producto: { select: { nombre_producto: true, precio_base: true, url_imagen: true } },
        responsable: { select: { nombres: true, apellidos: true } },
        registrador: { select: { nombres: true, apellidos: true } },
      },
    })
    res.json(filas.map(r => ({
      id_reposicion: r.id_reposicion,
      producto: r.producto?.nombre_producto || 'Producto',
      imagen: r.producto?.url_imagen || null,
      cantidad: r.cantidad,
      costo_estimado: Math.round(Number(r.producto?.precio_base || 0) * r.cantidad * 100) / 100,
      responsable: `${r.responsable.nombres} ${r.responsable.apellidos || ''}`.trim(),
      registrado_por: `${r.registrador.nombres} ${r.registrador.apellidos || ''}`.trim(),
      motivo: r.motivo,
      fecha: r.fecha_hora,
    })))
  } catch (e) {
    console.error('Error listando reposiciones:', e)
    res.status(500).json({ error: 'Error al listar las reposiciones' })
  }
})

// ---- GET /api/productos/reposiciones/resumen — incidentes por responsable ----
// Para el reporte de personal del admin: quiénes acumulan más descuidos y
// cuánto le costaron al local (a precio base del producto repuesto).
router.get('/reposiciones/resumen', soloRoles('Administrador'), async (req, res) => {
  try {
    const filas = await prisma.reposicion.findMany({
      include: {
        producto: { select: { precio_base: true } },
        responsable: { select: { id_usuario: true, nombres: true, apellidos: true, rol: { select: { nombre_rol: true } } } },
      },
    })
    const porResponsable = new Map()
    for (const r of filas) {
      const clave = r.responsable.id_usuario
      const previo = porResponsable.get(clave) || {
        id_usuario: clave,
        nombre: `${r.responsable.nombres} ${r.responsable.apellidos || ''}`.trim(),
        rol: r.responsable.rol?.nombre_rol || '',
        incidentes: 0, unidades: 0, costo_estimado: 0,
      }
      previo.incidentes += 1
      previo.unidades += r.cantidad
      previo.costo_estimado += Number(r.producto?.precio_base || 0) * r.cantidad
      porResponsable.set(clave, previo)
    }
    const lista = [...porResponsable.values()]
      .map(x => ({ ...x, costo_estimado: Math.round(x.costo_estimado * 100) / 100 }))
      .sort((a, b) => b.incidentes - a.incidentes || b.costo_estimado - a.costo_estimado)
    res.json(lista)
  } catch (e) {
    console.error('Error en resumen de reposiciones:', e)
    res.status(500).json({ error: 'Error al generar el resumen de reposiciones' })
  }
})

// ---- GET /api/productos/personal-operativo — meseros y bartenders activos ----
// (para el selector de "quién cometió el error" en la reposición)
router.get('/personal-operativo', soloRoles('Bartender', 'Administrador'), async (req, res) => {
  try {
    const personal = await prisma.usuario.findMany({
      where: { estado_cuenta: 'activo', rol: { nombre_rol: { in: ['Mesero', 'Bartender'] } } },
      select: { id_usuario: true, nombres: true, apellidos: true, rol: { select: { nombre_rol: true } } },
      orderBy: { nombres: 'asc' },
    })
    res.json(personal.map(p => ({
      id_usuario: p.id_usuario,
      nombre: `${p.nombres} ${p.apellidos || ''}`.trim(),
      rol: p.rol?.nombre_rol || '',
    })))
  } catch (e) {
    console.error('Error listando personal operativo:', e)
    res.status(500).json({ error: 'Error al listar el personal' })
  }
})

// ---- GET /api/productos — Listar ----
router.get('/', async (req, res) => {
  try {
    const { busqueda, categoria, promo, incluir_cortesias } = req.query

    const productos = await prisma.producto.findMany({
      where: {
        ...(busqueda  && { nombre_producto: { contains: busqueda } }),
        ...(categoria && { id_categoria: Number(categoria) }),
        ...(promo === 'true' && { estado_promocion: true }),
        // Los combos de CORTESÍA (Bs 0) no son productos a la venta: solo se
        // ofrecen al cliente que reservó. Fuera del catálogo del cliente, del
        // mesero y del cajero; el administrador los pide aparte para gestionarlos.
        ...(incluir_cortesias !== '1' && { es_cortesia: false }),
      },
      include: {
        categoria: { select: { id_categoria: true, nombre_categoria: true } },
        // Componentes del combo con la foto de cada hijo (para armar la
        // imagen compuesta del combo en el frontend sin generar archivos).
        combo_detalle_combo_detalle_id_producto_padreToproducto: {
          include: {
            producto_combo_detalle_id_producto_hijoToproducto: {
              select: { id_producto: true, nombre_producto: true, url_imagen: true },
            },
          },
        },
      },
      orderBy: { id_producto: 'desc' },
    })

    res.json(productos.map(p => {
      const { combo_detalle_combo_detalle_id_producto_padreToproducto: hijos, categoria, ...resto } = p
      return {
        ...resto,
        id_categoria: p.id_categoria,
        nombre_categoria: categoria?.nombre_categoria || '',
        combos_como_padre: p.es_combo ? (hijos || []).map(cd => ({
          id_producto_hijo: cd.id_producto_hijo,
          cantidad: cd.cantidad,
          nombre_producto: cd.producto_combo_detalle_id_producto_hijoToproducto?.nombre_producto || '',
          url_imagen: cd.producto_combo_detalle_id_producto_hijoToproducto?.url_imagen || null,
        })) : [],
      }
    }))
  } catch { res.status(500).json({ error: 'Error al obtener productos' }) }
})

// ---- GET /api/productos/:id ----
router.get('/:id', async (req, res) => {
  try {
    const producto = await prisma.producto.findUnique({
      where: { id_producto: Number(req.params.id) },
      include: {
        categoria: true,
        // Detalle del combo: filas donde este producto es el "padre",
        // incluyendo el producto "hijo" que lo compone.
        combo_detalle_combo_detalle_id_producto_padreToproducto: {
          include: { producto_combo_detalle_id_producto_hijoToproducto: true },
        },
      },
    })
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })

    // Normalizamos a la forma que consume el frontend (combos_como_padre).
    const { combo_detalle_combo_detalle_id_producto_padreToproducto: hijos, ...resto } = producto
    const combos_como_padre = (hijos || []).map(cd => ({
      id_producto_hijo: cd.id_producto_hijo,
      cantidad: cd.cantidad,
      nombre_producto: cd.producto_combo_detalle_id_producto_hijoToproducto?.nombre_producto || '',
      url_imagen: cd.producto_combo_detalle_id_producto_hijoToproducto?.url_imagen || null,
    }))

    res.json({
      ...resto,
      nombre_categoria: producto.categoria?.nombre_categoria || '',
      combos_como_padre,
    })
  } catch (error) {
    console.error('Error al obtener producto:', error)
    res.status(500).json({ error: 'Error al obtener producto' })
  }
})

// ---- POST /api/productos — Crear con imagen ----
router.post('/', soloRoles('Administrador'), subirImagenProducto.single('imagen'), async (req, res) => {
  try {
    const { nombre_producto, descripcion, precio_base, precio_promocion,
            estado_promocion, stock_actual, es_combo, id_categoria } = req.body

    if (!nombre_producto || precio_base === undefined || stock_actual === undefined || !id_categoria) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    // Precio base > 0 y stock >= 0 (no se permiten precios negativos ni cero)
    const errBase = validarNumero(precio_base, 'El precio base')
    if (errBase) return res.status(400).json({ error: errBase })
    const errStock = validarNumero(stock_actual, 'El stock', { permitirCero: true })
    if (errStock) return res.status(400).json({ error: errStock })

    // Validación de promoción: si está activa, exige un precio de promo válido.
    const errPromo = validarPromo(estado_promocion === 'true', precio_promocion, precio_base)
    if (errPromo) return res.status(400).json({ error: errPromo })

    const nuevo = await prisma.producto.create({
      data: {
        nombre_producto,
        descripcion:      descripcion || null,
        precio_base:      parseFloat(precio_base),
        precio_promocion: precio_promocion ? parseFloat(precio_promocion) : null,
        estado_promocion: estado_promocion === 'true',
        stock_actual:     parseInt(stock_actual),
        es_combo:         es_combo === 'true',
        id_categoria:     parseInt(id_categoria),
        url_imagen:       req.file?.path || null,
      },
    })

    // Si es combo, guardamos sus componentes (si vinieron).
    if (nuevo.es_combo && req.body.componentes !== undefined) {
      await sincronizarCombo(nuevo.id_producto, req.body.componentes)
    }

    // Historial de precios: precio inicial del producto (y su promo si nació con una)
    await registrarCambios({ anterior: null, nuevo, idUsuario: req.usuario.id })

    emitirCatalogoActualizado('producto-creado')
    res.status(201).json({ mensaje: 'Producto creado correctamente', producto: nuevo })
  } catch (error) {
    console.error('Error al crear producto:', error)
    res.status(500).json({ error: 'Error al crear producto' })
  }
})

// ---- PUT /api/productos/:id — Editar ----
router.put('/:id', soloRoles('Administrador'), subirImagenProducto.single('imagen'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nombre_producto, descripcion, precio_base, precio_promocion,
            estado_promocion, stock_actual, es_combo, id_categoria } = req.body

    const actual = await prisma.producto.findUnique({ where: { id_producto: id } })
    if (!actual) return res.status(404).json({ error: 'Producto no encontrado' })

    // No permitir cambiar a precio base negativo/cero ni stock negativo
    if (precio_base !== undefined && precio_base !== '') {
      const errBase = validarNumero(precio_base, 'El precio base')
      if (errBase) return res.status(400).json({ error: errBase })
    }
    if (stock_actual !== undefined && stock_actual !== '') {
      const errStock = validarNumero(stock_actual, 'El stock', { permitirCero: true })
      if (errStock) return res.status(400).json({ error: errStock })
    }

    // Si se sube nueva imagen, eliminar la anterior de Cloudinary
    if (req.file && actual.url_imagen) await eliminarImagen(actual.url_imagen)

    // Estado final tras el merge, para validar la promoción de forma coherente.
    const promoFinalActiva = estado_promocion !== undefined
      ? estado_promocion === 'true'
      : actual.estado_promocion
    const precioPromoFinal = precio_promocion !== undefined
      ? precio_promocion
      : actual.precio_promocion
    const precioBaseFinal = precio_base !== undefined && precio_base !== ''
      ? precio_base
      : actual.precio_base
    const errPromo = validarPromo(promoFinalActiva, precioPromoFinal, precioBaseFinal)
    if (errPromo) return res.status(400).json({ error: errPromo })

    const actualizado = await prisma.producto.update({
      where: { id_producto: id },
      data: {
        ...(nombre_producto && { nombre_producto }),
        ...(descripcion     !== undefined && { descripcion }),
        ...(precio_base     && { precio_base:     parseFloat(precio_base) }),
        // Permite fijar la promoción o QUITARLA (enviando vacío/null -> se guarda null)
        ...(precio_promocion !== undefined && {
          precio_promocion: (precio_promocion === '' || precio_promocion === null)
            ? null
            : parseFloat(precio_promocion)
        }),
        ...(estado_promocion !== undefined && { estado_promocion: estado_promocion === 'true' }),
        ...(stock_actual    && { stock_actual: parseInt(stock_actual) }),
        ...(es_combo        !== undefined && { es_combo: es_combo === 'true' }),
        ...(id_categoria    && { id_categoria: parseInt(id_categoria) }),
        ...(req.file        && { url_imagen: req.file.path }),
      },
    })

    // Sincronizar componentes del combo: si llega el campo, reemplazamos.
    // Si el producto dejó de ser combo, limpiamos sus componentes.
    if (actualizado.es_combo && req.body.componentes !== undefined) {
      await sincronizarCombo(id, req.body.componentes)
    } else if (es_combo === 'false') {
      await sincronizarCombo(id, [])
    }

    // Historial de precios: registra base y/o promo solo si cambiaron
    await registrarCambios({ anterior: actual, nuevo: actualizado, idUsuario: req.usuario.id })

    emitirCatalogoActualizado('producto-editado')
    res.json({ mensaje: 'Producto actualizado', producto: actualizado })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Producto no encontrado' })
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

// ---- PATCH /api/productos/:id/promo — Toggle promoción ----
router.patch('/:id/promo', soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const actual = await prisma.producto.findUnique({ where: { id_producto: id } })
    if (!actual) return res.status(404).json({ error: 'Producto no encontrado' })

    const activando = !actual.estado_promocion
    // No se puede activar una promoción sin un precio de promo válido.
    if (activando) {
      const errPromo = validarPromo(true, actual.precio_promocion, actual.precio_base)
      if (errPromo) return res.status(400).json({ error: errPromo })
    }

    const actualizado = await prisma.producto.update({
      where: { id_producto: id },
      data:  { estado_promocion: activando },
    })

    // Historial: al activar, el precio vigente pasa de base→promo; al desactivar, vuelve al base
    await registrarPrecio({
      idProducto: id,
      idUsuario:  req.usuario.id,
      tipo:       'promocion',
      precioAnterior: activando ? actual.precio_base : actual.precio_promocion,
      precioNuevo:    activando ? actual.precio_promocion : actual.precio_base,
      origen:     activando ? 'promo_activada' : 'promo_desactivada',
    })

    emitirCatalogoActualizado('promo')
    res.json({ mensaje: `Promoción ${actualizado.estado_promocion ? 'activada' : 'desactivada'}`, producto: actualizado })
  } catch { res.status(500).json({ error: 'Error al cambiar promoción' }) }
})

// ---- GET /api/productos/historial-precios/recientes — cambios de todos los productos ----
// Para la pestaña "Precios" de Reportes. Filtros: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&pagina=&limite=
router.get('/historial-precios/recientes', soloRoles('Administrador'), async (req, res) => {
  try {
    const pagina = Math.max(parseInt(req.query.pagina) || 1, 1)
    const limite = Math.min(Math.max(parseInt(req.query.limite) || 20, 1), 100)
    const desde  = req.query.desde ? new Date(req.query.desde + 'T00:00:00') : null
    const hasta  = req.query.hasta ? new Date(req.query.hasta + 'T23:59:59.999') : null

    const where = {}
    if (desde || hasta) where.fecha_hora = { ...(desde && { gte: desde }), ...(hasta && { lte: hasta }) }

    const [total, filas] = await Promise.all([
      prisma.historial_precio.count({ where }),
      prisma.historial_precio.findMany({
        where,
        orderBy: { fecha_hora: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        include: {
          producto: { select: { nombre_producto: true, url_imagen: true, es_combo: true } },
          usuario:  { select: { nombres: true, apellidos: true } },
        },
      }),
    ])

    res.json({
      total, pagina, limite,
      cambios: filas.map(f => ({
        id_historial:    f.id_historial,
        id_producto:     f.id_producto,
        producto:        f.producto.nombre_producto,
        url_imagen:      f.producto.url_imagen,
        es_combo:        f.producto.es_combo,
        usuario:         f.usuario ? `${f.usuario.nombres} ${f.usuario.apellidos}`.trim() : 'Sistema',
        fecha_hora:      f.fecha_hora,
        tipo:            f.tipo,
        precio_anterior: f.precio_anterior !== null ? Number(f.precio_anterior) : null,
        precio_nuevo:    Number(f.precio_nuevo),
        origen:          f.origen,
      })),
    })
  } catch (error) {
    console.error('Error al obtener historial reciente:', error)
    res.status(500).json({ error: 'Error al obtener el historial de precios' })
  }
})

// ---- GET /api/productos/:id/historial-precios — historial + ventas a cada precio ----
router.get('/:id/historial-precios', soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const producto = await prisma.producto.findUnique({ where: { id_producto: id } })
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })

    const filas = await prisma.historial_precio.findMany({
      where: { id_producto: id },
      orderBy: { fecha_hora: 'desc' },
      include: { usuario: { select: { nombres: true, apellidos: true } } },
    })

    // Cómo se vendió a cada precio: agrupa las ventas reales por precio_cobrado
    // (se guarda en cada línea de venta, así que incluye promos y precios viejos).
    const ventas = await prisma.$queryRaw`
      SELECT dc.precio_cobrado AS precio,
             SUM(dc.cantidad)  AS unidades,
             SUM(dc.subtotal)  AS ingresos,
             COUNT(DISTINCT dc.id_comanda) AS pedidos,
             MIN(c.fecha_registro) AS primera_venta,
             MAX(c.fecha_registro) AS ultima_venta
      FROM detalle_comanda dc
      JOIN comanda c ON c.id_comanda = dc.id_comanda
      WHERE dc.id_producto = ${id} AND c.estado_despacho <> 'Cancelada'
      GROUP BY dc.precio_cobrado
      ORDER BY unidades DESC`

    res.json({
      producto: {
        id_producto:      producto.id_producto,
        nombre_producto:  producto.nombre_producto,
        url_imagen:       producto.url_imagen,
        precio_base:      Number(producto.precio_base),
        precio_promocion: producto.precio_promocion !== null ? Number(producto.precio_promocion) : null,
        estado_promocion: producto.estado_promocion,
      },
      cambios: filas.map(f => ({
        id_historial:    f.id_historial,
        usuario:         f.usuario ? `${f.usuario.nombres} ${f.usuario.apellidos}`.trim() : 'Sistema',
        fecha_hora:      f.fecha_hora,
        tipo:            f.tipo,
        precio_anterior: f.precio_anterior !== null ? Number(f.precio_anterior) : null,
        precio_nuevo:    Number(f.precio_nuevo),
        origen:          f.origen,
      })),
      ventas_por_precio: ventas.map(v => ({
        precio:        Number(v.precio),
        unidades:      Number(v.unidades),
        ingresos:      Number(v.ingresos),
        pedidos:       Number(v.pedidos),
        primera_venta: v.primera_venta,
        ultima_venta:  v.ultima_venta,
      })),
    })
  } catch (error) {
    console.error('Error al obtener historial del producto:', error)
    res.status(500).json({ error: 'Error al obtener el historial de precios' })
  }
})

// ---- DELETE /api/productos/:id ----
router.delete('/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const producto = await prisma.producto.findUnique({ where: { id_producto: id } })
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })

    // 1) Con ventas registradas: eliminarlo orfanaría comandas/reportes. Se bloquea con aviso.
    const ventas = await prisma.detalle_comanda.count({ where: { id_producto: id } })
    if (ventas > 0) {
      return res.status(409).json({ error: 'Este producto tiene ventas registradas, no se puede eliminar (se perdería el historial). Puedes dejarlo sin stock o desactivarlo.' })
    }

    // 2) Es componente de otros combos: hay que quitarlo de ellos primero.
    const enCombos = await prisma.combo_detalle.count({ where: { id_producto_hijo: id } })
    if (enCombos > 0) {
      return res.status(409).json({ error: 'Este producto forma parte de uno o más combos. Quítalo de esos combos antes de eliminarlo.' })
    }

    if (producto.url_imagen) await eliminarImagen(producto.url_imagen)

    // Limpia sus propias dependencias (composición del combo y predicciones) y borra en una transacción
    await prisma.$transaction([
      prisma.combo_detalle.deleteMany({ where: { id_producto_padre: id } }),
      prisma.prediccion_ia.deleteMany({ where: { id_producto: id } }),
      prisma.producto.delete({ where: { id_producto: id } }),
    ])
    emitirCatalogoActualizado('producto-eliminado')
    res.json({ mensaje: 'Producto eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar producto:', error)
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

module.exports = router
