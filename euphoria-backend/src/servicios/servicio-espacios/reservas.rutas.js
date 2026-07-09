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
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { verificarPin } = require('../../utilidades/pin-billetera')

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

// Límite anti-acaparamiento: máximo de espacios (mesas/sillas/entradas) que una
// misma cuenta puede reservar por evento. Configurable en la tabla configuracion
// (clave 'reserva_max_espacios'); los grupos grandes se atienden por el local
// (reserva corporativa), no por autoservicio.
const RESERVA_MAX_POR_DEFECTO = 2

async function obtenerMaxEspacios() {
  try {
    const fila = await prisma.configuracion.findUnique({ where: { clave: 'reserva_max_espacios' } })
    const v = parseInt(fila?.valor, 10)
    if (Number.isFinite(v) && v > 0) return v
    if (!fila) {
      await prisma.configuracion.create({
        data: {
          clave: 'reserva_max_espacios',
          valor: String(RESERVA_MAX_POR_DEFECTO),
          descripcion: 'Máximo de espacios (mesas/sillas/entradas) por cliente en cada evento',
        },
      }).catch(() => {})
    }
  } catch (e) { /* respaldo abajo */ }
  return RESERVA_MAX_POR_DEFECTO
}

// Devuelve un error listo para responder si el usuario ya alcanzó el límite
// de espacios en el evento; null si aún puede reservar.
async function validarLimiteEspacios(id_usuario, id_evento) {
  const maximo = await obtenerMaxEspacios()
  const actuales = await prisma.entrada.count({
    where: { id_usuario, zona: { id_evento } },
  })
  if (actuales >= maximo) {
    return {
      status: 400,
      body: {
        error: `Ya tienes ${actuales} espacio(s) reservado(s) en este evento: el máximo por cuenta es ${maximo}. Si vienen en grupo grande (empresa, cumpleaños), contáctanos y el local te arma una reserva especial.`,
        limite_reservas: true,
        maximo,
        actuales,
      },
    }
  }
  return null
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
    // No se puede reservar en un evento que ya terminó (misma regla que /campo)
    const eventoMesa = await prisma.evento.findUnique({ where: { id_evento: mesa.zona.id_evento } })
    if (!eventoMesa || eventoMesa.estado === 'terminado') {
      return res.status(400).json({ error: 'Este evento ya terminó: no se puede reservar.' })
    }

    // Anti-acaparamiento: máximo de espacios por cuenta en el evento
    const limite = await validarLimiteEspacios(id_usuario, mesa.zona.id_evento)
    if (limite) return res.status(limite.status).json(limite.body)
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
      const pinValido = await verificarPin(pin, billetera.pin_transaccional)
      if (!pinValido) return res.status(400).json({ error: 'PIN incorrecto', requiere_pin: true })
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
      global.io.emit('billetera_actualizada', { id_usuario })
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

    // Anti-acaparamiento: máximo de espacios por cuenta en el evento
    const limite = await validarLimiteEspacios(id_usuario, zona.id_evento)
    if (limite) return res.status(limite.status).json(limite.body)

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
      const pinValido = await verificarPin(pin, billetera.pin_transaccional)
      if (!pinValido) return res.status(400).json({ error: 'PIN incorrecto', requiere_pin: true })
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
// Estado de la ventana de validez de una entrada según la fecha del evento
// (misma regla que la puerta): solo el día del evento, con margen de apertura.
const HORAS_ANTES_ENTRADA = 4
const HORAS_DESPUES_ENTRADA = 12
function estadoFechaEntrada(evento, ahora = new Date()) {
  if (!evento || !evento.fecha_hora_inicio) return 'vigente'
  const inicio = new Date(evento.fecha_hora_inicio)
  const fin = evento.fecha_hora_fin
    ? new Date(evento.fecha_hora_fin)
    : new Date(inicio.getTime() + HORAS_DESPUES_ENTRADA * 3600 * 1000)
  const ventanaInicio = new Date(inicio.getTime() - HORAS_ANTES_ENTRADA * 3600 * 1000)
  if (ahora < ventanaInicio) return 'proxima'
  if (ahora > fin) return 'finalizada'
  return 'vigente'
}

router.get('/mias', async (req, res) => {
  try {
    const entradas = await prisma.entrada.findMany({
      where: { id_usuario: req.usuario.id },
      orderBy: { fecha_reserva: 'desc' },
      include: {
        zona: { include: { evento: true } },
        mesa_espacio: true,
        // Historial real de ingresos/salidas de esta entrada (por tandas)
        registro_aforo: { orderBy: { fecha_hora: 'asc' } },
      },
    })

    const salida = await Promise.all(entradas.map(async (e) => {
      const evento = e.zona && e.zona.evento ? e.zona.evento : null
      const cantidadIngresada = e.cantidad_ingresada || 0
      const completo = cantidadIngresada >= e.cantidad_personas
      const estadoFecha = estadoFechaEntrada(evento)
      return {
        id_entrada: e.id_entrada,
        codigo_ingreso: e.codigo_ingreso,
        cantidad_personas: e.cantidad_personas,
        cantidad_ingresada: cantidadIngresada,
        monto_pagado: e.monto_pagado != null ? Number(e.monto_pagado) : null,
        estado_validacion: e.estado_validacion,
        completo,                    // ya ingresaron todos los cupos
        estado_fecha: estadoFecha,   // proxima | vigente | finalizada
        fecha_reserva: e.fecha_reserva,
        mesa: e.mesa_espacio ? e.mesa_espacio.numero_nombre : null,
        tipo_elemento: e.mesa_espacio ? e.mesa_espacio.tipo_elemento : null,
        zona: e.zona ? e.zona.nombre_zona : null,
        evento: evento ? evento.nombre_evento : null,
        fecha_evento: evento ? evento.fecha_hora_inicio : null,
        fecha_evento_fin: evento ? evento.fecha_hora_fin : null,
        // Historial de movimientos: cuándo y cuántas personas entraron/salieron
        ingresos: (e.registro_aforo || []).map(r => ({
          tipo: r.tipo_movimiento,   // ingreso | salida
          cantidad: r.cantidad,
          fecha_hora: r.fecha_hora,
        })),
        // El QR solo se genera si la entrada aún se puede usar (ni usada ni vencida)
        qr: (!completo && estadoFecha !== 'finalizada') ? await generarImagenQREntrada(e) : null,
      }
    }))
    res.json(salida)
  } catch (error) {
    console.error('Error obteniendo mis reservas:', error)
    res.status(500).json({ error: 'Error al obtener tus reservas' })
  }
})

// ============================================================
// RESERVAS GESTIONADAS POR RECEPCIÓN (grupos grandes)
// Cuando un cliente quiere más espacios que el tope de autoservicio, recepción
// lo atiende: busca al cliente, elige la(s) mesa(s) y se las asigna. Sin cobro
// a la billetera (el pago se maneja en el mostrador) y sin el tope por cuenta.
// ============================================================

// GET /api/reservas/buscar-cliente?q=texto — recepción busca al cliente por
// nombre, correo o CI para asignarle la reserva.
router.get('/buscar-cliente', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (q.length < 2) return res.json({ clientes: [] })
    const clientes = await prisma.usuario.findMany({
      where: {
        rol: { nombre_rol: 'Cliente' },
        estado_cuenta: 'activo',
        OR: [
          { correo: { contains: q } },
          { ci_carnet: { contains: q } },
          { nombres: { contains: q } },
          { apellidos: { contains: q } },
        ],
      },
      select: { id_usuario: true, nombres: true, apellidos: true, correo: true, ci_carnet: true, telefono: true },
      take: 8,
    })
    res.json({
      clientes: clientes.map(c => ({
        id_usuario: c.id_usuario,
        nombre: `${c.nombres} ${c.apellidos}`.trim(),
        correo: c.correo,
        ci_carnet: c.ci_carnet,
        telefono: c.telefono,
      })),
    })
  } catch (error) {
    console.error('Error buscando cliente:', error)
    res.status(500).json({ error: 'Error al buscar el cliente' })
  }
})

// POST /api/reservas/gestionada — recepción asigna una mesa a un cliente.
// Body: { id_cliente, id_mesa, metodo_pago? ('efectivo'|'cortesia') }
router.post('/gestionada', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const id_cliente = Number(req.body.id_cliente)
    const id_mesa = Number(req.body.id_mesa)
    const metodo = req.body.metodo_pago === 'cortesia' ? 'cortesia' : 'efectivo'
    if (!id_cliente || !id_mesa) return res.status(400).json({ error: 'Falta el cliente o la mesa.' })

    const cliente = await prisma.usuario.findUnique({ where: { id_usuario: id_cliente }, include: { rol: true } })
    if (!cliente || cliente.rol?.nombre_rol !== 'Cliente') {
      return res.status(400).json({ error: 'El cliente seleccionado no es válido.' })
    }

    const mesa = await prisma.mesa_espacio.findUnique({ where: { id_mesa }, include: { zona: true } })
    if (!mesa) return res.status(404).json({ error: 'La mesa no existe' })
    const esMesa = mesa.tipo_elemento === 'mesa'
    const esSilla = mesa.tipo_elemento === 'silla'
    if ((!esMesa && !esSilla) || !mesa.es_seleccionable) {
      return res.status(400).json({ error: 'Ese elemento no es reservable' })
    }
    if (mesa.estado_ocupacion !== 'libre') {
      return res.status(409).json({ error: 'Ese lugar ya está reservado. Elige otro.' })
    }
    const evento = await prisma.evento.findUnique({ where: { id_evento: mesa.zona.id_evento } })
    if (!evento || evento.estado === 'terminado') {
      return res.status(400).json({ error: 'Este evento ya terminó: no se puede reservar.' })
    }

    const cantidad_personas = esMesa ? Math.max(1, mesa.capacidad_sillas || 1) : 1
    const precioBase = Number(mesa.precio != null ? mesa.precio : mesa.zona.precio_entrada_base)
    // Cortesía = sin costo; efectivo = se cobra en el mostrador, se registra el valor.
    const monto = metodo === 'cortesia' ? 0 : (precioBase >= 0 ? precioBase : 0)
    const codigo = generarCodigoEntrada(id_cliente)

    let entradaCreada
    try {
      entradaCreada = await prisma.$transaction(async (tx) => {
        const tomada = await tx.mesa_espacio.updateMany({
          where: { id_mesa, estado_ocupacion: 'libre' },
          data: { estado_ocupacion: 'reservada' },
        })
        if (tomada.count === 0) throw new Error('MESA_OCUPADA')

        return await tx.entrada.create({
          data: {
            id_usuario: id_cliente,
            id_zona: mesa.id_zona,
            id_mesa,
            qr_acceso: codigo,
            codigo_ingreso: codigo.slice(-12).toUpperCase(),
            cantidad_personas,
            monto_pagado: monto,
            estado_validacion: false,
            fecha_reserva: new Date(),
          },
        })
      })
    } catch (e) {
      if (e.message === 'MESA_OCUPADA') {
        return res.status(409).json({ error: 'Alguien tomó esa mesa antes. Elige otra.' })
      }
      throw e
    }

    const imagenQR = await generarImagenQREntrada(entradaCreada)
    if (global.io) {
      global.io.emit('mesa_actualizada', { id_zona: mesa.id_zona, id_mesa, estado: 'reservada' })
    }
    await actualizarLlenoEvento(mesa.zona.id_evento)

    res.status(201).json({
      mensaje: 'Reserva asignada al cliente',
      entrada: {
        id_entrada: entradaCreada.id_entrada,
        codigo_ingreso: entradaCreada.codigo_ingreso,
        cantidad_personas,
        monto_pagado: monto,
        metodo_pago: metodo,
        mesa: mesa.numero_nombre,
        zona: mesa.zona.nombre_zona,
        cliente: `${cliente.nombres} ${cliente.apellidos}`.trim(),
      },
      qr: imagenQR,
    })
  } catch (error) {
    console.error('Error en reserva gestionada:', error)
    res.status(500).json({ error: 'Error al asignar la reserva' })
  }
})

// ============================================
// Solicitudes de grupo grande (Fase I)
// El cliente manda desde su app una solicitud con lugares TENTATIVOS + personas +
// motivo; recepción la revisa y arma la reserva real (o la marca atendida).
// ============================================

// POST /api/reservas/solicitudes-grupo — el cliente crea una solicitud.
// Body: { id_evento, cantidad_personas, motivo?, mesas_tentativas?: [{id_mesa, nombre}] }
router.post('/solicitudes-grupo', soloRoles('Cliente'), async (req, res) => {
  try {
    const id_evento = Number(req.body.id_evento)
    const cantidad = Math.max(1, parseInt(req.body.cantidad_personas) || 1)
    if (!id_evento) return res.status(400).json({ error: 'Falta el evento.' })
    const evento = await prisma.evento.findUnique({ where: { id_evento } })
    if (!evento || evento.estado === 'terminado') return res.status(400).json({ error: 'Ese evento no está disponible.' })

    // Sanea las mesas tentativas (solo id y nombre).
    let tentativas = []
    if (Array.isArray(req.body.mesas_tentativas)) {
      tentativas = req.body.mesas_tentativas
        .filter(m => m && m.id_mesa)
        .slice(0, 20)
        .map(m => ({ id_mesa: Number(m.id_mesa), nombre: String(m.nombre || '').slice(0, 50) }))
    }

    // Evita duplicar solicitudes pendientes del mismo cliente para el mismo evento.
    const yaPendiente = await prisma.solicitud_grupo.findFirst({
      where: { id_cliente: req.usuario.id, id_evento, estado: 'pendiente' },
    })
    if (yaPendiente) {
      return res.status(409).json({ error: 'Ya tienes una solicitud pendiente para este evento. Espera a que el local la revise.' })
    }

    const sol = await prisma.solicitud_grupo.create({
      data: {
        id_cliente: req.usuario.id,
        id_evento,
        cantidad_personas: cantidad,
        motivo: (req.body.motivo || '').toString().slice(0, 255) || null,
        mesas_tentativas: tentativas.length ? JSON.stringify(tentativas) : null,
        estado: 'pendiente',
      },
    })
    if (global.io) global.io.emit('solicitud_grupo', { id_solicitud: sol.id_solicitud, id_evento })
    res.status(201).json({ ok: true, id_solicitud: sol.id_solicitud, mensaje: 'Solicitud enviada. El local la revisará y te contactará.' })
  } catch (e) {
    console.error('Error creando solicitud de grupo:', e)
    res.status(500).json({ error: 'No se pudo enviar la solicitud' })
  }
})

// GET /api/reservas/mis-solicitudes-grupo — el cliente ve el estado de sus solicitudes.
router.get('/mis-solicitudes-grupo', soloRoles('Cliente'), async (req, res) => {
  try {
    const lista = await prisma.solicitud_grupo.findMany({
      where: { id_cliente: req.usuario.id },
      orderBy: { fecha_solicitud: 'desc' },
      include: { evento: { select: { nombre_evento: true, fecha_hora_inicio: true } } },
    })
    res.json(lista.map(s => ({
      id_solicitud: s.id_solicitud,
      evento: s.evento?.nombre_evento || '',
      fecha_evento: s.evento?.fecha_hora_inicio || null,
      cantidad_personas: s.cantidad_personas,
      motivo: s.motivo,
      mesas_tentativas: s.mesas_tentativas ? JSON.parse(s.mesas_tentativas) : [],
      estado: s.estado,
      fecha_solicitud: s.fecha_solicitud,
    })))
  } catch (e) {
    console.error('Error listando mis solicitudes:', e)
    res.status(500).json({ error: 'Error al obtener tus solicitudes' })
  }
})

// GET /api/reservas/solicitudes-grupo — recepción ve las solicitudes pendientes.
router.get('/solicitudes-grupo', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const lista = await prisma.solicitud_grupo.findMany({
      where: { estado: 'pendiente' },
      orderBy: { fecha_solicitud: 'asc' },
      include: { usuario: { select: { nombres: true, apellidos: true, correo: true, telefono: true, ci_carnet: true } } },
    })
    res.json(lista.map(s => ({
      id_solicitud: s.id_solicitud,
      id_cliente: s.id_cliente,
      id_evento: s.id_evento,
      cliente: `${s.usuario.nombres} ${s.usuario.apellidos || ''}`.trim(),
      correo: s.usuario.correo,
      telefono: s.usuario.telefono,
      ci_carnet: s.usuario.ci_carnet,
      cantidad_personas: s.cantidad_personas,
      motivo: s.motivo,
      mesas_tentativas: s.mesas_tentativas ? JSON.parse(s.mesas_tentativas) : [],
      fecha_solicitud: s.fecha_solicitud,
    })))
  } catch (e) {
    console.error('Error listando solicitudes de grupo:', e)
    res.status(500).json({ error: 'Error al obtener las solicitudes' })
  }
})

// PATCH /api/reservas/solicitudes-grupo/:id/atender — recepción marca la solicitud atendida.
router.patch('/solicitudes-grupo/:id/atender', soloRoles('Recepcionista', 'Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const upd = await prisma.solicitud_grupo.updateMany({
      where: { id_solicitud: id, estado: 'pendiente' },
      data: { estado: 'atendida' },
    })
    if (upd.count === 0) return res.status(404).json({ error: 'La solicitud ya no está pendiente.' })
    if (global.io) global.io.emit('solicitud_grupo', { id_solicitud: id })
    res.json({ ok: true })
  } catch (e) {
    console.error('Error atendiendo solicitud:', e)
    res.status(500).json({ error: 'No se pudo actualizar la solicitud' })
  }
})

module.exports = router
