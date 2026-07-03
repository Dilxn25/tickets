// ============================================
// EUPHORIA — Servicio de Reservas (Fase B)
// El cliente ve el mapa de un evento, elige una mesa libre, paga con su
// billetera de forma atomica y recibe una entrada con QR de acceso.
// ============================================
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const QRCode = require('qrcode')
const prisma = require('../../config/base-de-datos')
const { verificarToken } = require('../../middlewares/autenticacion')

router.use(verificarToken)

// "Lleno" automático: cuando las reservas (cupos vendidos) alcanzan el aforo total
// del evento, lo marca 'lleno'; si baja (cancelación), vuelve a 'promocion'.
async function actualizarLlenoEvento(id_evento) {
  try {
    if (!id_evento) return
    const zonas = await prisma.zona.findMany({ where: { id_evento }, select: { capacidad_maxima: true } })
    const capacidad = zonas.reduce((a, z) => a + (z.capacidad_maxima || 0), 0)
    if (capacidad <= 0) return
    const agg = await prisma.entrada.aggregate({
      where: { zona: { id_evento } },
      _sum: { cantidad_personas: true },
    })
    const reservado = agg._sum.cantidad_personas || 0
    const evento = await prisma.evento.findUnique({ where: { id_evento }, select: { estado: true } })
    if (!evento) return
    if (reservado >= capacidad && (evento.estado === 'promocion' || evento.estado === 'en_transcurso')) {
      await prisma.evento.update({ where: { id_evento }, data: { estado: 'lleno' } })
    } else if (reservado < capacidad && evento.estado === 'lleno') {
      await prisma.evento.update({ where: { id_evento }, data: { estado: 'promocion' } })
    }
  } catch (e) { console.error('Error actualizando estado Lleno:', e.message) }
}

// ---- Utilidades QR de entrada ----

// Genera un codigo unico para qr_acceso (cabe en VarChar(255) y es irrepetible).
function generarCodigoEntrada(idUsuario) {
  return `ENT-${idUsuario}-${crypto.randomBytes(9).toString('hex')}`
}

// Firma un token JWT con los datos de la entrada y devuelve la imagen QR (dataURL).
// El token va firmado para que no se pueda falsificar una entrada.
async function generarImagenQREntrada(entrada) {
  const secreto = process.env.JWT_SECRETO_QR
  const token = jwt.sign(
    { t: 'entrada', ie: entrada.id_entrada, qr: entrada.qr_acceso },
    secreto
  )
  return QRCode.toDataURL(token, { errorCorrectionLevel: 'H', type: 'image/png', width: 320 })
}

// Precio "atractivo" (un decimal terminando en .0/.4/.5/.6/.9) — mismo criterio que recomendaciones.
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

// Combos populares (pares mas co-comprados) para sugerir al reservar. Degrada a [] si falla.
async function obtenerCombosSugeridos(limite = 3) {
  try {
    const DESCUENTO = 0.10
    const pares = await prisma.$queryRawUnsafe(`
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
      ORDER BY veces DESC LIMIT ${Number(limite) || 3}
    `)
    return pares.map(r => {
      const normal = Number(r.pr1) + Number(r.pr2)
      return {
        nombre: `${r.n1} + ${r.n2}`,
        productos: [
          { id_producto: Number(r.id1), nombre: r.n1, url_imagen: r.img1 },
          { id_producto: Number(r.id2), nombre: r.n2, url_imagen: r.img2 },
        ],
        precio_normal: Math.round(normal * 100) / 100,
        precio_combo: precioAtractivo(normal * (1 - DESCUENTO)),
        descuento_pct: DESCUENTO * 100,
      }
    })
  } catch (error) {
    console.error('Error obteniendo combos sugeridos:', error.message)
    return []
  }
}

// ---------- CATALOGO PARA EL CLIENTE ----------

// GET /api/reservas/eventos — eventos con zonas reservables (mesas libres disponibles)
router.get('/eventos', async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: {
        estado: { not: 'terminado' },
        zona: { some: { mesa_espacio: { some: { es_seleccionable: true, tipo_elemento: 'mesa' } } } },
      },
      orderBy: { fecha_hora_inicio: 'asc' },
      include: {
        zona: {
          include: {
            mesa_espacio: {
              where: { es_seleccionable: true, tipo_elemento: 'mesa' },
              select: { estado_ocupacion: true },
            },
          },
        },
      },
    })

    const salida = eventos.map(ev => {
      let libres = 0, totales = 0
      for (const z of ev.zona) {
        for (const m of z.mesa_espacio) {
          totales++
          if (m.estado_ocupacion === 'libre') libres++
        }
      }
      return {
        id_evento: ev.id_evento,
        nombre_evento: ev.nombre_evento,
        descripcion: ev.descripcion,
        url_portada: ev.url_portada,
        fecha_hora_inicio: ev.fecha_hora_inicio,
        fecha_hora_fin: ev.fecha_hora_fin,
        estado: ev.estado,
        mesas_libres: libres,
        mesas_totales: totales,
      }
    })
    res.json(salida)
  } catch (error) {
    console.error('Error listando eventos reservables:', error)
    res.status(500).json({ error: 'Error al obtener los eventos' })
  }
})

// GET /api/reservas/eventos/:idEvento/zonas — zonas del evento con su mapa (para elegir mesa)
router.get('/eventos/:idEvento/zonas', async (req, res) => {
  try {
    const id_evento = Number(req.params.idEvento)
    const zonas = await prisma.zona.findMany({
      where: { id_evento },
      orderBy: { id_zona: 'asc' },
      include: {
        mesa_espacio: { orderBy: { id_mesa: 'asc' } },
        _count: { select: { entrada: true } }, // entradas vendidas (para zonas generales/de pie)
      },
    })
    // Solo exponemos lo necesario para dibujar y decidir; no filtramos elementos
    // decorativos (pared/barra/escenario) porque el cliente los necesita para ubicarse.
    // Para zonas generales (campo/de pie) agregamos cuántas entradas quedan.
    const salida = zonas.map(z => ({
      ...z,
      vendidas: z._count?.entrada || 0,
      disponibles_general: z.es_general ? Math.max(0, z.capacidad_maxima - (z._count?.entrada || 0)) : null,
    }))
    res.json(salida)
  } catch (error) {
    console.error('Error obteniendo zonas del evento:', error)
    res.status(500).json({ error: 'Error al obtener el mapa del evento' })
  }
})

// ---------- RESERVA ----------

// POST /api/reservas/mesa — reservar una mesa y pagar con billetera (atomico)
// Body: { id_mesa, cantidad_personas?, pin? }
router.post('/mesa', async (req, res) => {
  try {
    const id_usuario = req.usuario.id
    const id_mesa = Number(req.body.id_mesa)
    const { pin } = req.body

    if (!id_mesa) return res.status(400).json({ error: 'Falta la mesa a reservar' })

    // 1. Traer el elemento con su zona (para precio y validaciones)
    const mesa = await prisma.mesa_espacio.findUnique({
      where: { id_mesa },
      include: { zona: true },
    })
    if (!mesa) return res.status(404).json({ error: 'La mesa no existe' })
    // Reservables: MESA (se compra completa, QR para toda su capacidad) o SILLA (1 persona)
    const esMesa = mesa.tipo_elemento === 'mesa'
    const esSilla = mesa.tipo_elemento === 'silla'
    if ((!esMesa && !esSilla) || !mesa.es_seleccionable) {
      return res.status(400).json({ error: 'Ese elemento no es reservable' })
    }
    if (mesa.estado_ocupacion !== 'libre') {
      return res.status(409).json({ error: 'Ese lugar ya fue reservado. Elige otro.' })
    }
    // La mesa se compra COMPLETA: el QR vale para toda su capacidad (ej. 8).
    // La silla es individual (1 persona).
    const cantidad_personas = esMesa ? Math.max(1, mesa.capacidad_sillas || 1) : 1

    // 2. Precio: el de la mesa si tiene, si no el base de la zona
    const precio = Number(mesa.precio != null ? mesa.precio : mesa.zona.precio_entrada_base)
    if (!(precio >= 0)) return res.status(400).json({ error: 'La mesa no tiene un precio valido' })

    // 3. Billetera del cliente (+ PIN si esta configurado)
    const billetera = await prisma.billetera.findUnique({ where: { id_usuario } })
    if (!billetera) return res.status(400).json({ error: 'No tienes billetera. Recarga primero.' })

    if (billetera.pin_transaccional) {
      if (!pin) return res.status(403).json({ error: 'PIN requerido', requiere_pin: true })
      const bcrypt = require('bcryptjs')
      const pinValido = await bcrypt.compare(String(pin), billetera.pin_transaccional)
      if (!pinValido) return res.status(401).json({ error: 'PIN incorrecto' })
    }

    if (Number(billetera.saldo_actual) < precio) {
      return res.status(400).json({ error: 'Saldo insuficiente para reservar esta mesa' })
    }

    const codigo = generarCodigoEntrada(id_usuario)

    // 4. Transaccion atomica: cobra SOLO si hay saldo, reserva la mesa SOLO si sigue libre.
    let entradaCreada
    try {
      entradaCreada = await prisma.$transaction(async (tx) => {
        // 4a. Descuento condicional de saldo (evita doble gasto / saldo negativo)
        if (precio > 0) {
          const descuento = await tx.billetera.updateMany({
            where: { id_billetera: billetera.id_billetera, saldo_actual: { gte: precio } },
            data: { saldo_actual: { decrement: precio }, ultima_actualizacion: new Date() },
          })
          if (descuento.count === 0) throw new Error('SALDO_INSUFICIENTE')
        }

        // 4b. Reserva condicional de la mesa (evita doble reserva simultanea)
        const tomada = await tx.mesa_espacio.updateMany({
          where: { id_mesa, estado_ocupacion: 'libre' },
          data: { estado_ocupacion: 'reservada' },
        })
        if (tomada.count === 0) throw new Error('MESA_OCUPADA')

        // 4c. Crear la entrada (reserva)
        const entrada = await tx.entrada.create({
          data: {
            id_usuario,
            id_zona: mesa.id_zona,
            id_mesa,
            qr_acceso: codigo,
            codigo_ingreso: codigo.slice(-12).toUpperCase(),
            cantidad_personas,
            monto_pagado: precio,
            estado_validacion: false,
            fecha_reserva: new Date(),
          },
        })

        // 4d. Registrar la transaccion (solo si hubo cobro real)
        if (precio > 0) {
          await tx.transaccion.create({
            data: {
              id_billetera: billetera.id_billetera,
              id_responsable: id_usuario,
              tipo_operacion: 'Reserva',
              monto: precio,
              fecha_hora: new Date(),
            },
          })
        }
        return entrada
      })
    } catch (e) {
      if (e.message === 'SALDO_INSUFICIENTE') {
        return res.status(400).json({ error: 'Saldo insuficiente para reservar esta mesa' })
      }
      if (e.message === 'MESA_OCUPADA') {
        return res.status(409).json({ error: 'Alguien reservo esa mesa antes que tu. Elige otra.' })
      }
      throw e
    }

    // 5. QR de la entrada + combos sugeridos (upsell)
    const imagenQR = await generarImagenQREntrada(entradaCreada)
    const combos = await obtenerCombosSugeridos(3)

    // 6. Tiempo real: avisar que la mesa cambio y refrescar saldo del cliente
    if (global.io) {
      global.io.emit('mesa_actualizada', { id_zona: mesa.id_zona, id_mesa, estado: 'reservada' })
      global.io.emit('billetera_actualizada', {
        id_usuario,
        saldo_nuevo: Number(billetera.saldo_actual) - precio,
      })
    }

    // "Lleno" automático si el evento se agotó con esta reserva.
    await actualizarLlenoEvento(mesa.zona.id_evento)

    res.status(201).json({
      mensaje: 'Reserva confirmada',
      entrada: {
        id_entrada: entradaCreada.id_entrada,
        codigo_ingreso: entradaCreada.codigo_ingreso,
        cantidad_personas: entradaCreada.cantidad_personas,
        monto_pagado: precio,
        mesa: mesa.numero_nombre,
        zona: mesa.zona.nombre_zona,
      },
      qr: imagenQR,
      saldo_restante: Number(billetera.saldo_actual) - precio,
      combos_sugeridos: combos,
    })
  } catch (error) {
    console.error('Error reservando mesa:', error)
    res.status(500).json({ error: 'Error al procesar la reserva' })
  }
})

// POST /api/reservas/campo — comprar una ENTRADA GENERAL / DE PIE (campo).
// Body: { id_zona, pin? }. La zona debe ser general (es_general=true); vende
// entradas de 1 persona hasta su capacidad. Paga con billetera de forma atomica.
router.post('/campo', async (req, res) => {
  try {
    const id_usuario = req.usuario.id
    const id_zona = Number(req.body.id_zona)
    const { pin } = req.body
    if (!id_zona) return res.status(400).json({ error: 'Falta la zona general' })

    const zona = await prisma.zona.findUnique({ where: { id_zona }, include: { evento: true } })
    if (!zona) return res.status(404).json({ error: 'La zona no existe' })
    if (!zona.es_general) return res.status(400).json({ error: 'Esta zona no vende entradas generales' })
    if (zona.evento?.estado === 'terminado') return res.status(400).json({ error: 'El evento ya finalizó' })

    // Cupos: cada entrada general es de 1 persona
    const vendidas = await prisma.entrada.count({ where: { id_zona } })
    if (vendidas >= zona.capacidad_maxima) {
      return res.status(409).json({ error: 'Entradas de pie agotadas para esta zona.' })
    }

    const precio = Number(zona.precio_entrada_base)
    if (!(precio >= 0)) return res.status(400).json({ error: 'La zona no tiene un precio válido' })

    const billetera = await prisma.billetera.findUnique({ where: { id_usuario } })
    if (!billetera) return res.status(400).json({ error: 'No tienes billetera. Recarga primero.' })

    if (billetera.pin_transaccional) {
      if (!pin) return res.status(403).json({ error: 'PIN requerido', requiere_pin: true })
      const bcrypt = require('bcryptjs')
      const pinValido = await bcrypt.compare(String(pin), billetera.pin_transaccional)
      if (!pinValido) return res.status(401).json({ error: 'PIN incorrecto' })
    }

    if (Number(billetera.saldo_actual) < precio) {
      return res.status(400).json({ error: 'Saldo insuficiente para esta entrada' })
    }

    const codigo = generarCodigoEntrada(id_usuario)

    let entradaCreada
    try {
      entradaCreada = await prisma.$transaction(async (tx) => {
        // Cobro condicional (evita saldo negativo)
        if (precio > 0) {
          const descuento = await tx.billetera.updateMany({
            where: { id_billetera: billetera.id_billetera, saldo_actual: { gte: precio } },
            data: { saldo_actual: { decrement: precio }, ultima_actualizacion: new Date() },
          })
          if (descuento.count === 0) throw new Error('SALDO_INSUFICIENTE')
        }

        // Cupo condicional: solo si aún quedan entradas de pie
        const cupo = await tx.$executeRaw`
          INSERT INTO entrada (id_usuario, id_zona, qr_acceso, codigo_ingreso, cantidad_personas, cantidad_ingresada, monto_pagado, estado_validacion, fecha_reserva)
          SELECT ${id_usuario}, ${id_zona}, ${codigo}, ${codigo.slice(-12).toUpperCase()}, 1, 0, ${precio}, false, NOW()
          FROM DUAL WHERE (SELECT COUNT(*) FROM entrada WHERE id_zona = ${id_zona}) < ${zona.capacidad_maxima}`
        if (cupo === 0) throw new Error('CAMPO_AGOTADO')

        const creada = await tx.entrada.findFirst({ where: { qr_acceso: codigo } })

        if (precio > 0) {
          await tx.transaccion.create({
            data: {
              id_billetera: billetera.id_billetera,
              id_responsable: id_usuario,
              tipo_operacion: 'Reserva',
              monto: precio,
              fecha_hora: new Date(),
            },
          })
        }
        return creada
      })
    } catch (e) {
      if (e.message === 'SALDO_INSUFICIENTE') return res.status(400).json({ error: 'Saldo insuficiente para esta entrada' })
      if (e.message === 'CAMPO_AGOTADO') return res.status(409).json({ error: 'Entradas de pie agotadas para esta zona.' })
      throw e
    }

    const imagenQR = await generarImagenQREntrada(entradaCreada)
    const combos = await obtenerCombosSugeridos(3)

    // "Lleno" automático si el evento se agotó con esta entrada.
    await actualizarLlenoEvento(zona.id_evento)

    res.status(201).json({
      mensaje: 'Entrada de pie confirmada',
      entrada: {
        id_entrada: entradaCreada.id_entrada,
        codigo_ingreso: entradaCreada.codigo_ingreso,
        cantidad_personas: 1,
        monto_pagado: precio,
        mesa: null,
        zona: zona.nombre_zona,
      },
      qr: imagenQR,
      saldo_restante: Number(billetera.saldo_actual) - precio,
      combos_sugeridos: combos,
    })
  } catch (error) {
    console.error('Error comprando entrada de pie:', error)
    res.status(500).json({ error: 'Error al procesar la entrada de pie' })
  }
})

// ---------- MIS RESERVAS ----------

// GET /api/reservas/mias — entradas/reservas del cliente con su QR
router.get('/mias', async (req, res) => {
  try {
    const entradas = await prisma.entrada.findMany({
      where: { id_usuario: req.usuario.id },
      orderBy: { fecha_reserva: 'desc' },
      include: {
        zona: { include: { evento: true } },
        mesa_espacio: true,
      },
    })

    const salida = await Promise.all(entradas.map(async (e) => ({
      id_entrada: e.id_entrada,
      codigo_ingreso: e.codigo_ingreso,
      cantidad_personas: e.cantidad_personas,
      monto_pagado: e.monto_pagado != null ? Number(e.monto_pagado) : null,
      estado_validacion: e.estado_validacion,
      fecha_reserva: e.fecha_reserva,
      mesa: e.mesa_espacio ? e.mesa_espacio.numero_nombre : null,
      zona: e.zona ? e.zona.nombre_zona : null,
      evento: e.zona && e.zona.evento ? e.zona.evento.nombre_evento : null,
      fecha_evento: e.zona && e.zona.evento ? e.zona.evento.fecha_hora_inicio : null,
      qr: await generarImagenQREntrada(e),
    })))
    res.json(salida)
  } catch (error) {
    console.error('Error obteniendo mis reservas:', error)
    res.status(500).json({ error: 'Error al obtener tus reservas' })
  }
})

module.exports = router
