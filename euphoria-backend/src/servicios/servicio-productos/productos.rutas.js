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

router.use(verificarToken)

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

// ---- GET /api/productos — Listar ----
router.get('/', async (req, res) => {
  try {
    const { busqueda, categoria, promo } = req.query

    const productos = await prisma.producto.findMany({
      where: {
        ...(busqueda  && { nombre_producto: { contains: busqueda } }),
        ...(categoria && { id_categoria: Number(categoria) }),
        ...(promo === 'true' && { estado_promocion: true }),
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

    if (!nombre_producto || !precio_base || !stock_actual || !id_categoria) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

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
    res.json({ mensaje: `Promoción ${actualizado.estado_promocion ? 'activada' : 'desactivada'}`, producto: actualizado })
  } catch { res.status(500).json({ error: 'Error al cambiar promoción' }) }
})

// ---- DELETE /api/productos/:id ----
router.delete('/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const producto = await prisma.producto.findUnique({ where: { id_producto: id } })
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })

    if (producto.url_imagen) await eliminarImagen(producto.url_imagen)

    await prisma.producto.delete({ where: { id_producto: id } })
    res.json({ mensaje: 'Producto eliminado correctamente' })
  } catch { res.status(500).json({ error: 'Error al eliminar producto' }) }
})

module.exports = router
