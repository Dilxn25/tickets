// ============================================
// EUPHORIA — Servicio de Espacios (Zonas + Mapa + Plantillas)
// Fase A: el administrador arma el mapa (mesas, sillas, barra, escenario) y lo guarda.
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')

router.use(verificarToken)

// ---------- ZONAS ----------

// GET /api/espacios/eventos/:idEvento/zonas — zonas de un evento (con sus elementos)
router.get('/eventos/:idEvento/zonas', async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const zonas = await prisma.zona.findMany({
      where: { id_evento },
      include: { mesa_espacio: true },
      orderBy: { id_zona: 'asc' },
    })
    res.json(zonas)
  } catch (error) {
    console.error('Error listando zonas:', error)
    res.status(500).json({ error: 'Error al obtener las zonas' })
  }
})

// POST /api/espacios/zonas — crear zona (Admin)
router.post('/zonas', soloRoles('Administrador'), async (req, res) => {
  try {
    const { id_evento, nombre_zona, capacidad_maxima, precio_entrada_base, proporcion } = req.body
    if (!id_evento || !nombre_zona) {
      return res.status(400).json({ error: 'Evento y nombre de zona son requeridos' })
    }
    const zona = await prisma.zona.create({
      data: {
        id_evento: Number(id_evento),
        nombre_zona,
        capacidad_maxima: Number(capacidad_maxima) || 0,
        precio_entrada_base: Number(precio_entrada_base) || 0,
        proporcion: proporcion != null ? Number(proporcion) : null,
      },
    })
    res.status(201).json(zona)
  } catch (error) {
    console.error('Error creando zona:', error)
    res.status(500).json({ error: 'Error al crear la zona' })
  }
})

// PUT /api/espacios/zonas/:id — editar zona (Admin)
router.put('/zonas/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    const { nombre_zona, capacidad_maxima, precio_entrada_base, proporcion } = req.body
    const zona = await prisma.zona.update({
      where: { id_zona },
      data: {
        ...(nombre_zona !== undefined && { nombre_zona }),
        ...(capacidad_maxima !== undefined && { capacidad_maxima: Number(capacidad_maxima) }),
        ...(precio_entrada_base !== undefined && { precio_entrada_base: Number(precio_entrada_base) }),
        ...(proporcion !== undefined && { proporcion: proporcion == null ? null : Number(proporcion) }),
      },
    })
    res.json(zona)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Zona no encontrada' })
    res.status(500).json({ error: 'Error al actualizar la zona' })
  }
})

// DELETE /api/espacios/zonas/:id — eliminar zona y sus elementos (Admin)
router.delete('/zonas/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    await prisma.$transaction(async (tx) => {
      await tx.mesa_espacio.deleteMany({ where: { id_zona } })
      await tx.zona.delete({ where: { id_zona } })
    })
    res.json({ mensaje: 'Zona eliminada' })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'No se puede eliminar: la zona tiene reservas o consumos asociados' })
    }
    if (error.code === 'P2025') return res.status(404).json({ error: 'Zona no encontrada' })
    console.error('Error eliminando zona:', error)
    res.status(500).json({ error: 'Error al eliminar la zona' })
  }
})

// ---------- MAPA (elementos de una zona) ----------

// GET /api/espacios/zonas/:id/mapa — obtener los elementos del mapa de la zona
router.get('/zonas/:id/mapa', async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    const zona = await prisma.zona.findUnique({
      where: { id_zona },
      include: { mesa_espacio: { orderBy: { id_mesa: 'asc' } } },
    })
    if (!zona) return res.status(404).json({ error: 'Zona no encontrada' })
    res.json({ zona, elementos: zona.mesa_espacio })
  } catch (error) {
    console.error('Error obteniendo mapa:', error)
    res.status(500).json({ error: 'Error al obtener el mapa' })
  }
})

// PUT /api/espacios/zonas/:id/mapa — guardar TODOS los elementos del mapa (Admin)
// Body: { elementos: [{ id_mesa?, tipo_elemento, numero_nombre, posicion_x, posicion_y,
//                        ancho, alto, rotacion, capacidad_sillas, precio, es_seleccionable }] }
router.put('/zonas/:id/mapa', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    const elementos = Array.isArray(req.body.elementos) ? req.body.elementos : []

    const idsEnviados = elementos.filter(e => e.id_mesa).map(e => Number(e.id_mesa))

    await prisma.$transaction(async (tx) => {
      // Borrar los elementos que el usuario quitó del mapa (los que ya no vienen)
      await tx.mesa_espacio.deleteMany({
        where: { id_zona, id_mesa: { notIn: idsEnviados.length ? idsEnviados : [0] } },
      })

      for (const el of elementos) {
        const datos = {
          numero_nombre: String(el.numero_nombre || ''),
          posicion_x: Number(el.posicion_x) || 0,
          posicion_y: Number(el.posicion_y) || 0,
          ancho: el.ancho != null ? Number(el.ancho) : null,
          alto: el.alto != null ? Number(el.alto) : null,
          rotacion: el.rotacion != null ? Number(el.rotacion) : null,
          capacidad_sillas: Number(el.capacidad_sillas) || 0,
          precio: el.precio != null && el.precio !== '' ? Number(el.precio) : null,
          tipo_elemento: String(el.tipo_elemento || 'mesa').substring(0, 20),
          es_seleccionable: el.es_seleccionable !== false,
          forma: el.forma ? String(el.forma).substring(0, 20) : null,
        }
        if (el.id_mesa) {
          await tx.mesa_espacio.update({ where: { id_mesa: Number(el.id_mesa) }, data: datos })
        } else {
          await tx.mesa_espacio.create({
            data: { id_zona, estado_ocupacion: 'libre', ...datos },
          })
        }
      }
    })

    const zona = await prisma.zona.findUnique({
      where: { id_zona },
      include: { mesa_espacio: { orderBy: { id_mesa: 'asc' } } },
    })
    res.json({ mensaje: 'Mapa guardado', elementos: zona.mesa_espacio })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'No se puede quitar una mesa que ya tiene reservas/consumos.' })
    }
    console.error('Error guardando mapa:', error)
    res.status(500).json({ error: 'Error al guardar el mapa' })
  }
})

// ---------- PLANTILLAS (mapas reutilizables) ----------

// GET /api/espacios/plantillas
router.get('/plantillas', async (req, res) => {
  try {
    const plantillas = await prisma.plantilla_mapa.findMany({ orderBy: { fecha: 'desc' } })
    // No mandamos el layout completo en el listado (puede ser grande)
    res.json(plantillas.map(p => ({
      id_plantilla: p.id_plantilla, nombre: p.nombre, descripcion: p.descripcion, fecha: p.fecha,
    })))
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener plantillas' })
  }
})

// POST /api/espacios/plantillas — guardar un mapa como plantilla reutilizable (Admin)
router.post('/plantillas', soloRoles('Administrador'), async (req, res) => {
  try {
    const { nombre, descripcion, elementos } = req.body
    if (!nombre || !Array.isArray(elementos)) {
      return res.status(400).json({ error: 'Nombre y elementos son requeridos' })
    }
    const plantilla = await prisma.plantilla_mapa.create({
      data: {
        nombre: String(nombre).substring(0, 100),
        descripcion: descripcion || null,
        layout_json: JSON.stringify(elementos),
      },
    })
    res.status(201).json({ id_plantilla: plantilla.id_plantilla, mensaje: 'Plantilla guardada' })
  } catch (error) {
    console.error('Error guardando plantilla:', error)
    res.status(500).json({ error: 'Error al guardar la plantilla' })
  }
})

// POST /api/espacios/zonas/:id/aplicar-plantilla — cargar una plantilla en una zona (Admin)
// Body: { id_plantilla }
router.post('/zonas/:id/aplicar-plantilla', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    const plantilla = await prisma.plantilla_mapa.findUnique({ where: { id_plantilla: Number(req.body.id_plantilla) } })
    if (!plantilla) return res.status(404).json({ error: 'Plantilla no encontrada' })

    let elementos = []
    try { elementos = JSON.parse(plantilla.layout_json) } catch { elementos = [] }

    await prisma.$transaction(async (tx) => {
      // Reemplaza el mapa actual de la zona por el de la plantilla (elementos nuevos)
      await tx.mesa_espacio.deleteMany({ where: { id_zona } })
      for (const el of elementos) {
        await tx.mesa_espacio.create({
          data: {
            id_zona,
            estado_ocupacion: 'libre',
            numero_nombre: String(el.numero_nombre || ''),
            posicion_x: Number(el.posicion_x) || 0,
            posicion_y: Number(el.posicion_y) || 0,
            ancho: el.ancho != null ? Number(el.ancho) : null,
            alto: el.alto != null ? Number(el.alto) : null,
            rotacion: el.rotacion != null ? Number(el.rotacion) : null,
            capacidad_sillas: Number(el.capacidad_sillas) || 0,
            precio: el.precio != null && el.precio !== '' ? Number(el.precio) : null,
            tipo_elemento: String(el.tipo_elemento || 'mesa').substring(0, 20),
            es_seleccionable: el.es_seleccionable !== false,
            forma: el.forma ? String(el.forma).substring(0, 20) : null,
          },
        })
      }
    })
    res.json({ mensaje: 'Plantilla aplicada a la zona' })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'La zona tiene reservas/consumos; no se puede reemplazar el mapa.' })
    }
    console.error('Error aplicando plantilla:', error)
    res.status(500).json({ error: 'Error al aplicar la plantilla' })
  }
})

// DELETE /api/espacios/plantillas/:id (Admin)
router.delete('/plantillas/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    await prisma.plantilla_mapa.delete({ where: { id_plantilla: Number(req.params.id) } })
    res.json({ mensaje: 'Plantilla eliminada' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada' })
    res.status(500).json({ error: 'Error al eliminar la plantilla' })
  }
})

module.exports = router
