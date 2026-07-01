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
      include: { categoria: { select: { id_categoria: true, nombre_categoria: true } } },
      orderBy: { id_producto: 'desc' },
    })

    res.json(productos.map(p => ({
      ...p,
      id_categoria: p.id_categoria,
      nombre_categoria: p.categoria?.nombre_categoria || '',
    })))
  } catch { res.status(500).json({ error: 'Error al obtener productos' }) }
})

// ---- GET /api/productos/:id ----
router.get('/:id', async (req, res) => {
  try {
    const producto = await prisma.producto.findUnique({
      where: { id_producto: Number(req.params.id) },
      include: {
        categoria: true,
        combos_como_padre: { include: { producto_hijo: true } },
      },
    })
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(producto)
  } catch { res.status(500).json({ error: 'Error al obtener producto' }) }
})

// ---- POST /api/productos — Crear con imagen ----
router.post('/', soloRoles('Administrador'), subirImagenProducto.single('imagen'), async (req, res) => {
  try {
    const { nombre_producto, descripcion, precio_base, precio_promocion,
            estado_promocion, stock_actual, es_combo, id_categoria } = req.body

    if (!nombre_producto || !precio_base || !stock_actual || !id_categoria) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

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

    // Si se sube nueva imagen, eliminar la anterior de Cloudinary
    if (req.file) {
      const actual = await prisma.producto.findUnique({ where: { id_producto: id } })
      if (actual?.url_imagen) await eliminarImagen(actual.url_imagen)
    }

    const actualizado = await prisma.producto.update({
      where: { id_producto: id },
      data: {
        ...(nombre_producto && { nombre_producto }),
        ...(descripcion     !== undefined && { descripcion }),
        ...(precio_base     && { precio_base:     parseFloat(precio_base) }),
        ...(precio_promocion && { precio_promocion: parseFloat(precio_promocion) }),
        ...(estado_promocion !== undefined && { estado_promocion: estado_promocion === 'true' }),
        ...(stock_actual    && { stock_actual: parseInt(stock_actual) }),
        ...(es_combo        !== undefined && { es_combo: es_combo === 'true' }),
        ...(id_categoria    && { id_categoria: parseInt(id_categoria) }),
        ...(req.file        && { url_imagen: req.file.path }),
      },
    })

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

    const actualizado = await prisma.producto.update({
      where: { id_producto: id },
      data:  { estado_promocion: !actual.estado_promocion },
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
