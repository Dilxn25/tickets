// ============================================
// EUPHORIA — Servicio de Espacios (Zonas + Mapa + Plantillas)
// Fase A: el administrador arma el mapa (mesas, sillas, barra, escenario) y lo guarda.
// ============================================
const express = require('express')
const router = express.Router()
const prisma = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { emitirRecurso } = require('../../utilidades/config-runtime')
const { notificar } = require('../../utilidades/notificaciones')
const { purgarZona } = require('../../utilidades/purgar-espacios')

router.use(verificarToken)

// Un plano guarda su layout en layout_json. Soporta dos formatos:
//  - Antiguo: un array de elementos (sin proporción).
//  - Nuevo:   { proporcion, elementos }.
// Devuelve siempre { proporcion, elementos } normalizado.
function parseLayout(layout_json) {
  let data
  try { data = JSON.parse(layout_json) } catch { return { proporcion: 1.6, elementos: [] } }
  if (Array.isArray(data)) return { proporcion: 1.6, elementos: data }
  return {
    proporcion: Number(data.proporcion) || 1.6,
    elementos: Array.isArray(data.elementos) ? data.elementos : [],
  }
}
// Serializa un layout de plano al formato nuevo.
function serializarLayout(proporcion, elementos) {
  return JSON.stringify({
    proporcion: Number(proporcion) || 1.6,
    elementos: Array.isArray(elementos) ? elementos : [],
  })
}

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
    const { id_evento, nombre_zona, capacidad_maxima, precio_entrada_base, proporcion, es_general, prioridad } = req.body
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
        es_general: !!es_general,
        prioridad: Number(prioridad) || 0,
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
    const { nombre_zona, capacidad_maxima, precio_entrada_base, proporcion, es_general, prioridad } = req.body
    const zona = await prisma.zona.update({
      where: { id_zona },
      data: {
        ...(nombre_zona !== undefined && { nombre_zona }),
        ...(capacidad_maxima !== undefined && { capacidad_maxima: Number(capacidad_maxima) }),
        ...(precio_entrada_base !== undefined && { precio_entrada_base: Number(precio_entrada_base) }),
        ...(proporcion !== undefined && { proporcion: proporcion == null ? null : Number(proporcion) }),
        ...(es_general !== undefined && { es_general: !!es_general }),
        ...(prioridad !== undefined && { prioridad: Number(prioridad) }),
      },
    })
    res.json(zona)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Zona no encontrada' })
    res.status(500).json({ error: 'Error al actualizar la zona' })
  }
})

// DELETE /api/espacios/zonas/:id — eliminar un plano del evento (Admin).
// Devuelve a cada cliente lo que pagó y limpia reservas/pedidos para no quedar bloqueado.
router.delete('/zonas/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    const zonaBorrar = await prisma.zona.findUnique({ where: { id_zona }, select: { id_evento: true } })
    if (!zonaBorrar) return res.status(404).json({ error: 'Zona no encontrada' })
    const reembolsos = await prisma.$transaction((tx) => purgarZona(tx, id_zona, req.usuario.id))
    // Avisar a cada cliente reembolsado (fuera de la transacción).
    for (const r of reembolsos) {
      if (global.io) global.io.emit('billetera_actualizada', { id_usuario: r.id_usuario })
      await notificar(r.id_usuario, { tipo: 'reserva', titulo: 'Reserva cancelada por el local', mensaje: `Se te devolvieron Bs ${r.monto} a tu billetera.`, url: '/cliente/billetera' })
    }
    emitirRecurso('eventos', { id: zonaBorrar.id_evento })
    emitirRecurso('reservas', { id_evento: zonaBorrar.id_evento })
    const totalDev = reembolsos.reduce((s, r) => s + r.monto, 0)
    res.json({ mensaje: 'Plano eliminado del evento', reembolsos: reembolsos.length, total_devuelto: totalDev })
  } catch (error) {
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

    // Aforo = asientos (mesa/silla) + parados de las áreas (pista): siempre
    // consistente con lo dibujado, sin capacidades escritas a mano.
    const capacidad = elementos
      .filter(e => ['mesa', 'silla', 'area'].includes(e.tipo_elemento))
      .reduce((a, e) => a + (Number(e.capacidad_sillas) || 0), 0)
    // Precio heredado del área para las mesas/sillas asignadas a ella.
    const precioArea = {}
    for (const el of elementos) {
      if (el.tipo_elemento === 'area' && el.clave && el.precio != null && el.precio !== '') {
        precioArea[el.clave] = Number(el.precio)
      }
    }
    const precioElemento = (el) => {
      if (el.precio != null && el.precio !== '') return Number(el.precio)
      if (el.area_ref && precioArea[el.area_ref] != null) return precioArea[el.area_ref]
      return null
    }

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
          precio: precioElemento(el),
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
      // Mantener el aforo de la zona sincronizado con el mapa.
      await tx.zona.update({ where: { id_zona }, data: { capacidad_maxima: capacidad } })
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
    // Incluimos el layout (proporción + elementos) para pintar la miniatura en la galería.
    res.json(plantillas.map(p => {
      const { proporcion, elementos } = parseLayout(p.layout_json)
      return {
        id_plantilla: p.id_plantilla, nombre: p.nombre, descripcion: p.descripcion, fecha: p.fecha,
        proporcion, elementos,
      }
    }))
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener plantillas' })
  }
})

// GET /api/espacios/plantillas/:id — un plano con su layout completo (para editarlo)
router.get('/plantillas/:id', async (req, res) => {
  try {
    const p = await prisma.plantilla_mapa.findUnique({ where: { id_plantilla: Number(req.params.id) } })
    if (!p) return res.status(404).json({ error: 'Plano no encontrado' })
    const { proporcion, elementos } = parseLayout(p.layout_json)
    res.json({ id_plantilla: p.id_plantilla, nombre: p.nombre, descripcion: p.descripcion, proporcion, elementos })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el plano' })
  }
})

// POST /api/espacios/plantillas — crear un plano reutilizable (Admin)
router.post('/plantillas', soloRoles('Administrador'), async (req, res) => {
  try {
    const { nombre, descripcion, elementos, proporcion } = req.body
    if (!nombre || !Array.isArray(elementos)) {
      return res.status(400).json({ error: 'Nombre y elementos son requeridos' })
    }
    const plantilla = await prisma.plantilla_mapa.create({
      data: {
        nombre: String(nombre).substring(0, 100),
        descripcion: descripcion || null,
        layout_json: serializarLayout(proporcion, elementos),
      },
    })
    res.status(201).json({ id_plantilla: plantilla.id_plantilla, mensaje: 'Plano guardado' })
  } catch (error) {
    console.error('Error guardando plano:', error)
    res.status(500).json({ error: 'Error al guardar el plano' })
  }
})

// PUT /api/espacios/plantillas/:id — actualizar un plano (Admin)
router.put('/plantillas/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { nombre, descripcion, elementos, proporcion } = req.body
    const actual = await prisma.plantilla_mapa.findUnique({ where: { id_plantilla: id } })
    if (!actual) return res.status(404).json({ error: 'Plano no encontrado' })

    const layoutActual = parseLayout(actual.layout_json)
    const data = {
      ...(nombre !== undefined && { nombre: String(nombre).substring(0, 100) }),
      ...(descripcion !== undefined && { descripcion: descripcion || null }),
    }
    // Si mandan elementos o proporción, reescribimos el layout.
    if (Array.isArray(elementos) || proporcion !== undefined) {
      data.layout_json = serializarLayout(
        proporcion !== undefined ? proporcion : layoutActual.proporcion,
        Array.isArray(elementos) ? elementos : layoutActual.elementos,
      )
    }
    const actualizado = await prisma.plantilla_mapa.update({ where: { id_plantilla: id }, data })
    res.json({ id_plantilla: actualizado.id_plantilla, mensaje: 'Plano guardado' })
  } catch (error) {
    console.error('Error actualizando plano:', error)
    res.status(500).json({ error: 'Error al guardar el plano' })
  }
})

// POST /api/espacios/plantillas/:id/duplicar — copia un plano con un nombre nuevo (Admin)
router.post('/plantillas/:id/duplicar', soloRoles('Administrador'), async (req, res) => {
  try {
    const original = await prisma.plantilla_mapa.findUnique({ where: { id_plantilla: Number(req.params.id) } })
    if (!original) return res.status(404).json({ error: 'Plano no encontrado' })

    const nombre = (req.body?.nombre && String(req.body.nombre).trim())
      ? String(req.body.nombre).trim().substring(0, 100)
      : `${original.nombre} (copia)`.substring(0, 100)

    const copia = await prisma.plantilla_mapa.create({
      data: {
        nombre,
        descripcion: original.descripcion,
        layout_json: original.layout_json, // mismo diseño, nuevo id
      },
    })
    res.status(201).json({ id_plantilla: copia.id_plantilla, nombre: copia.nombre, mensaje: 'Plano duplicado' })
  } catch (error) {
    console.error('Error duplicando plano:', error)
    res.status(500).json({ error: 'Error al duplicar el plano' })
  }
})

// POST /api/espacios/zonas/:id/aplicar-plantilla — cargar una plantilla en una zona (Admin)
// Body: { id_plantilla }
router.post('/zonas/:id/aplicar-plantilla', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    const plantilla = await prisma.plantilla_mapa.findUnique({ where: { id_plantilla: Number(req.body.id_plantilla) } })
    if (!plantilla) return res.status(404).json({ error: 'Plantilla no encontrada' })

    const { elementos } = parseLayout(plantilla.layout_json)

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
// Si el plano está vinculado a eventos (zonas creadas desde él, por id o por
// nombre para datos antiguos), responde 409 con la lista para que el admin
// confirme; con ?cascada=1 borra también esas zonas y sus mesas.
router.delete('/plantillas/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_plantilla = Number(req.params.id)
    const plantilla = await prisma.plantilla_mapa.findUnique({ where: { id_plantilla } })
    if (!plantilla) return res.status(404).json({ error: 'Plano no encontrado' })

    const vinculos = await prisma.zona.findMany({
      where: {
        OR: [
          { id_plantilla },
          { nombre_zona: String(plantilla.nombre) } // zonas antiguas sin vínculo guardado
        ]
      },
      include: { evento: { select: { nombre_evento: true } } }
    })

    if (vinculos.length && String(req.query.cascada) !== '1') {
      return res.status(409).json({
        vinculado: true,
        vinculos: vinculos.map(z => ({
          id_zona: z.id_zona,
          nombre_zona: z.nombre_zona,
          evento: z.evento?.nombre_evento || 'Evento desconocido'
        }))
      })
    }

    await prisma.$transaction(async (tx) => {
      for (const z of vinculos) {
        await tx.mesa_espacio.deleteMany({ where: { id_zona: z.id_zona } })
        await tx.zona.delete({ where: { id_zona: z.id_zona } })
      }
      await tx.plantilla_mapa.delete({ where: { id_plantilla } })
    })
    return res.json({ mensaje: 'Plano eliminado', zonas_eliminadas: vinculos.length })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'No se puede borrar en cascada: alguna zona vinculada tiene reservas o ingresos registrados. Quita primero esas reservas.' })
    }
    console.error('Error eliminando plano:', error)
    return res.status(500).json({ error: 'Error al eliminar el plano' })
  }
})

// (handler anterior conservado abajo por compatibilidad — ya no se alcanza)
router.delete('/plantillas-legacy/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    await prisma.plantilla_mapa.delete({ where: { id_plantilla: Number(req.params.id) } })
    res.json({ mensaje: 'Plantilla eliminada' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada' })
    res.status(500).json({ error: 'Error al eliminar la plantilla' })
  }
})

// GET /api/espacios/eventos/:idEvento/planos — planos asignados al evento
// (internamente son "zonas", pero al usuario se le muestran como planos).
router.get('/eventos/:idEvento/planos', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const zonas = await prisma.zona.findMany({
      where: { id_evento },
      orderBy: { id_zona: 'asc' },
      // numero_nombre / precio / area_ref hacen falta para listar las áreas con su precio
      include: { mesa_espacio: { select: { tipo_elemento: true, capacidad_sillas: true, numero_nombre: true, precio: true, area_ref: true } } },
    })
    res.json(zonas.map(z => ({
      id_zona: z.id_zona,
      nombre: z.nombre_zona,
      precio_entrada_base: z.precio_entrada_base,
      prioridad: z.prioridad,
      proporcion: z.proporcion,
      aforo: z.mesa_espacio
        .filter(m => m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla')
        .reduce((a, m) => a + (m.capacidad_sillas || 0), 0),
      elementos_total: z.mesa_espacio.length,
      // Precio por ÁREA del plano en este evento (la única fuente de precio).
      areas: z.mesa_espacio
        .filter(m => m.tipo_elemento === 'area')
        .map(a => ({ clave: a.area_ref, nombre: a.numero_nombre || 'Área', precio: a.precio != null ? Number(a.precio) : null, parados: a.capacidad_sillas || 0 })),
      // ¿Hay mesas/sillas sin área? Su precio es el "general" (precio_entrada_base)
      tiene_general: z.mesa_espacio.some(m => (m.tipo_elemento === 'mesa' || m.tipo_elemento === 'silla') && !m.area_ref),
    })))
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los planos del evento' })
  }
})

// POST /api/espacios/eventos/:idEvento/asignar-plano — AGREGA un plano al evento
// (crea una "zona" con sus mesas). Un evento puede tener varios planos (pisos/áreas).
// El precio de entrada se define aquí (el plano es solo layout). (Admin)
router.post('/eventos/:idEvento/asignar-plano', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const id_plantilla = Number(req.body.id_plantilla)
    const precio_base = Number(req.body.precio_base) || 0
    const prioridad = Number(req.body.prioridad) || 0
    const nombre = (req.body.nombre && String(req.body.nombre).trim())
      ? String(req.body.nombre).trim().substring(0, 50)
      : null

    const evento = await prisma.evento.findUnique({ where: { id_evento } })
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' })
    const plantilla = await prisma.plantilla_mapa.findUnique({ where: { id_plantilla } })
    if (!plantilla) return res.status(404).json({ error: 'Plano no encontrado' })

    const { proporcion, elementos } = parseLayout(plantilla.layout_json)

    // Aforo = asientos de mesas/sillas + "parados" de las áreas (pista). Así el
    // aforo refleja EXACTAMENTE lo dibujado y no queda inconsistente con el mapa.
    const capacidad = elementos
      .filter(e => e.tipo_elemento === 'mesa' || e.tipo_elemento === 'silla' || e.tipo_elemento === 'area')
      .reduce((a, e) => a + (Number(e.capacidad_sillas) || 0), 0)

    // REGLA ÚNICA DE PRECIO: el precio es por ÁREA. El plano trae el precio de
    // cada área como punto de partida y el evento puede ajustarlo para esa noche
    // (body.precios_areas = { clave: precio }). Mesas y sillas NO tienen precio
    // propio: heredan el de su área; las que no pertenecen a ninguna usan el
    // precio general de la zona (body.precio_general → precio_entrada_base).
    const precioArea = {}
    for (const el of elementos) {
      if (el.tipo_elemento === 'area' && el.clave && el.precio != null && el.precio !== '') {
        precioArea[el.clave] = Number(el.precio)
      }
    }
    const ajustes = (req.body.precios_areas && typeof req.body.precios_areas === 'object') ? req.body.precios_areas : {}
    for (const [clave, p] of Object.entries(ajustes)) {
      const n = Number(p)
      if (Number.isFinite(n) && n >= 0) precioArea[clave] = n
    }
    const precioElemento = (el) => {
      if (el.tipo_elemento === 'area') return precioArea[el.clave] ?? null
      if (el.area_ref && precioArea[el.area_ref] != null) return precioArea[el.area_ref]
      return null // sin área → usa el precio general de la zona
    }
    const areaDe = (el) => el.tipo_elemento === 'area' ? (el.clave || null) : (el.area_ref || null)
    // Precio general: el que mande el admin; si no, el menor de las áreas; si no, el legado precio_base.
    const preciosAreas = Object.values(precioArea)
    const precioGeneralBody = Number(req.body.precio_general)
    const precioGeneral = Number.isFinite(precioGeneralBody) && req.body.precio_general !== '' && req.body.precio_general != null
      ? precioGeneralBody
      : (preciosAreas.length ? Math.min(...preciosAreas) : precio_base)

    // NADIE ENTRA GRATIS: toda área reservable y el precio general deben ser > 0.
    // Un área sin precio (o a 0) dejaría reservar sin pagar, así que se rechaza.
    const areasSinPrecio = elementos
      .filter(el => el.tipo_elemento === 'area' && el.clave && !(precioArea[el.clave] > 0))
      .map(el => el.numero_nombre || 'Área')
    if (areasSinPrecio.length) {
      return res.status(400).json({ error: `Falta el precio (mayor a 0) de: ${areasSinPrecio.join(', ')}. Nadie puede reservar gratis.` })
    }
    const hayGeneral = elementos.some(el => (el.tipo_elemento === 'mesa' || el.tipo_elemento === 'silla') && !el.area_ref)
    if (hayGeneral && !(precioGeneral > 0)) {
      return res.status(400).json({ error: 'Hay mesas sin área: el precio general debe ser mayor a 0.' })
    }

    await prisma.$transaction(async (tx) => {
      const zona = await tx.zona.create({
        data: {
          id_evento,
          nombre_zona: (nombre || String(plantilla.nombre)).substring(0, 50),
          capacidad_maxima: capacidad,
          precio_entrada_base: precioGeneral,
          proporcion: proporcion,
          es_general: false,
          prioridad, // 0=normal, 1=alta, 2=vip (orden del bartender)
          id_plantilla, // vínculo con el plano: permite avisar/cascada al borrarlo
        },
      })
      for (const el of elementos) {
        await tx.mesa_espacio.create({
          data: {
            id_zona: zona.id_zona,
            estado_ocupacion: 'libre',
            numero_nombre: String(el.numero_nombre || ''),
            posicion_x: Number(el.posicion_x) || 0,
            posicion_y: Number(el.posicion_y) || 0,
            ancho: el.ancho != null ? Number(el.ancho) : null,
            alto: el.alto != null ? Number(el.alto) : null,
            rotacion: el.rotacion != null ? Number(el.rotacion) : null,
            capacidad_sillas: Number(el.capacidad_sillas) || 0,
            // Precio efectivo: el del área a la que pertenece (las mesas no tienen precio propio).
            precio: precioElemento(el),
            // Se guarda el área para poder reajustar precios sin quitar el plano
            area_ref: areaDe(el) ? String(areaDe(el)).substring(0, 40) : null,
            tipo_elemento: String(el.tipo_elemento || 'mesa').substring(0, 20),
            es_seleccionable: el.es_seleccionable !== false,
            forma: el.forma ? String(el.forma).substring(0, 20) : null,
          },
        })
      }
    })
    emitirRecurso('eventos', { id: id_evento })
    res.json({ mensaje: 'Plano agregado al evento' })
  } catch (error) {
    console.error('Error asignando plano:', error)
    return res.status(500).json({ error: 'Error al agregar el plano al evento' })
  }
})

// PUT /api/espacios/zonas/:id/precios — reajusta los precios por ÁREA de un plano
// YA asignado, sin quitarlo (quitarlo devuelve el dinero a los clientes).
// Body: { precios_areas: { clave: precio }, precio_general?: number, prioridad?: number }
router.put('/zonas/:id/precios', soloRoles('Administrador'), async (req, res) => {
  try {
    const id_zona = Number(req.params.id)
    const zona = await prisma.zona.findUnique({ where: { id_zona } })
    if (!zona) return res.status(404).json({ error: 'Plano del evento no encontrado' })
    const ajustes = (req.body.precios_areas && typeof req.body.precios_areas === 'object') ? req.body.precios_areas : {}

    // NADIE ENTRA GRATIS: no se acepta ningún precio en 0 o vacío.
    const invalidos = Object.entries(ajustes).filter(([, p]) => !(Number(p) > 0)).map(([k]) => k)
    if (invalidos.length) return res.status(400).json({ error: 'Todas las áreas deben tener un precio mayor a 0. Nadie puede reservar gratis.' })
    if (req.body.precio_general !== undefined && req.body.precio_general !== null && req.body.precio_general !== '' && !(Number(req.body.precio_general) > 0)) {
      return res.status(400).json({ error: 'El precio general debe ser mayor a 0.' })
    }

    await prisma.$transaction(async (tx) => {
      for (const [clave, p] of Object.entries(ajustes)) {
        const n = Number(p)
        if (!Number.isFinite(n) || n <= 0) continue
        // El área y todo lo que pertenece a ella toman el nuevo precio
        await tx.mesa_espacio.updateMany({ where: { id_zona, area_ref: String(clave) }, data: { precio: n } })
      }
      const data = {}
      const pg = Number(req.body.precio_general)
      if (req.body.precio_general !== undefined && req.body.precio_general !== '' && Number.isFinite(pg) && pg >= 0) data.precio_entrada_base = pg
      if (req.body.prioridad !== undefined) data.prioridad = Number(req.body.prioridad) || 0
      if (Object.keys(data).length) await tx.zona.update({ where: { id_zona }, data })
    })
    emitirRecurso('eventos', { id: zona.id_evento })
    res.json({ mensaje: 'Precios actualizados' })
  } catch (error) {
    console.error('Error actualizando precios del plano:', error)
    res.status(500).json({ error: 'No se pudieron actualizar los precios' })
  }
})

module.exports = router
