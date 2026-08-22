// EUPHORIA — CIERRE de un evento: qué pasa con el dinero y los pedidos cuando
// la noche termina.
//
//  1) Entradas que NADIE usó (cantidad_ingresada = 0) → se devuelve lo pagado a
//     la billetera MENOS la comisión del local (regla post-evento), una sola vez
//     (se sella fecha_devolucion en la entrada para no repetirla).
//  2) Pedidos del evento pagados y NUNCA entregados → pasan al estado
//     "No entregada" (se pidieron, se pagaron, no se entregaron: control estricto
//     por evento) y, si se pagaron con billetera, se devuelven:
//        · Programado (pagado por adelantado, la barra nunca lo vio): completo.
//        · Pendiente / Listo (la barra lo tenía y no llegó a la mesa): menos comisión.
//  3) Cortesías que el cliente nunca eligió → "vencida" (deja de avisarle).
//
// Todo es IDEMPOTENTE: se puede correr las veces que haga falta sobre el mismo
// evento (también sobre eventos que ya estaban "terminado" desde antes), y solo
// toca lo que falta cerrar. Lo ejecuta el planificador cada pocos minutos.
const prisma = require('../config/base-de-datos')
const { notificar } = require('./notificaciones')
const { hoyBolivia } = require('./tiempo')

const COMISION_DEFECTO = 10
const HORAS_DURACION_DEFECTO = 12
const DIAS_REVISION = 90 // eventos terminados dentro de este rango se repasan por si quedó algo sin cerrar

async function comisionPct() {
  try {
    const f = await prisma.configuracion.findUnique({ where: { clave: 'comision_cancelacion_pct' } })
    const v = parseFloat(f?.valor)
    if (Number.isFinite(v) && v >= 0 && v <= 90) return v
  } catch { /* respaldo */ }
  return COMISION_DEFECTO
}
const neto = (monto, pct) => Math.round(Number(monto) * (1 - pct / 100) * 100) / 100
const bs = (n) => Number(n).toFixed(2)

function ventanaDelEvento(ev) {
  const inicio = new Date(ev.fecha_hora_inicio)
  const fin = ev.fecha_hora_fin ? new Date(ev.fecha_hora_fin) : new Date(inicio.getTime() + HORAS_DURACION_DEFECTO * 3600 * 1000)
  return { inicio, fin }
}

async function devolverEntradasNoUsadas(ev, pct, resumen) {
  const entradas = await prisma.entrada.findMany({
    where: { zona: { id_evento: ev.id_evento }, cantidad_ingresada: 0, monto_pagado: { gt: 0 }, fecha_devolucion: null },
    select: { id_entrada: true, id_usuario: true, monto_pagado: true },
  })
  for (const e of entradas) {
    const monto = neto(e.monto_pagado, pct)
    let devuelto = false
    await prisma.$transaction(async (tx) => {
      // La marca es la guarda: si otro proceso ya la devolvió, count = 0 y no se repite.
      const marca = await tx.entrada.updateMany({
        where: { id_entrada: e.id_entrada, fecha_devolucion: null },
        data: { fecha_devolucion: new Date() },
      })
      if (marca.count === 0 || monto <= 0) return
      const bill = await tx.billetera.findUnique({ where: { id_usuario: e.id_usuario } })
      if (!bill) return
      await tx.billetera.update({ where: { id_billetera: bill.id_billetera }, data: { saldo_actual: { increment: monto }, ultima_actualizacion: new Date() } })
      await tx.transaccion.create({
        data: { id_billetera: bill.id_billetera, id_responsable: e.id_usuario, tipo_operacion: 'reembolso', monto, fecha_hora: new Date() },
      })
      devuelto = true
    })
    if (!devuelto) continue
    resumen.entradas_devueltas++
    resumen.monto_devuelto += monto
    if (global.io) global.io.emit('billetera_actualizada', { id_usuario: e.id_usuario })
    await notificar(e.id_usuario, {
      tipo: 'billetera', titulo: 'Te devolvimos tu reserva',
      mensaje: `El evento "${ev.nombre_evento}" terminó y tu entrada no se usó. Te devolvimos Bs ${bs(monto)} a tu billetera (se retuvo ${pct}% según las normas del local).`,
      url: '/cliente/billetera',
    }).catch(() => {})
  }
}

async function cerrarPedidosNoEntregados(ev, pct, resumen) {
  const { inicio, fin } = ventanaDelEvento(ev)
  const idsClientes = (await prisma.entrada.findMany({
    where: { zona: { id_evento: ev.id_evento } }, select: { id_usuario: true }, distinct: ['id_usuario'],
  })).map(e => e.id_usuario).filter(Boolean)

  const pedidos = await prisma.comanda.findMany({
    where: {
      estado_despacho: { notIn: ['Completada', 'Cancelada', 'Reembolsada', 'No entregada'] },
      estado_entrega: { notIn: ['entregado', 'recogido', 'reembolsado', 'no_entregado'] },
      OR: [
        { entrada: { zona: { id_evento: ev.id_evento } } },
        { mesa_espacio: { zona: { id_evento: ev.id_evento } } },
        // Sin vínculo (autoservicio viejo o barra sin reserva): por cliente del evento y la ventana horaria.
        { id_entrada: null, id_mesa: null, id_cliente: { in: idsClientes.length ? idsClientes : [-1] }, fecha_registro: { gte: inicio, lte: fin } },
      ],
    },
    include: {
      detalle_comanda: { select: { id_producto: true, cantidad: true } },
      transaccion: { where: { tipo_operacion: 'Consumo' }, select: { monto: true, id_billetera: true }, take: 1 },
    },
  })

  for (const c of pedidos) {
    const eraProgramado = c.estado_despacho === 'Programado'
    const noSePreparo = eraProgramado || c.estado_despacho === 'Pendiente'
    const trx = c.metodo_pago === 'Billetera' ? c.transaccion?.[0] : null
    // Programado: la barra nunca lo vio → completo. El resto → menos comisión.
    const monto = trx ? (eraProgramado ? Number(trx.monto) : neto(trx.monto, pct)) : 0
    let cerrado = false
    await prisma.$transaction(async (tx) => {
      const marca = await tx.comanda.updateMany({
        where: { id_comanda: c.id_comanda, estado_despacho: { notIn: ['Completada', 'Cancelada', 'Reembolsada', 'No entregada'] } },
        data: { estado_despacho: 'No entregada', estado_entrega: 'no_entregado' },
      })
      if (marca.count === 0) return
      cerrado = true
      // Lo que no se llegó a preparar vuelve al stock.
      if (noSePreparo) {
        for (const d of c.detalle_comanda) {
          await tx.producto.update({ where: { id_producto: d.id_producto }, data: { stock_actual: { increment: d.cantidad } } })
        }
      }
      if (trx && monto > 0) {
        await tx.billetera.update({ where: { id_billetera: trx.id_billetera }, data: { saldo_actual: { increment: monto }, ultima_actualizacion: new Date() } })
        await tx.transaccion.create({
          data: { id_billetera: trx.id_billetera, id_comanda: c.id_comanda, id_responsable: c.id_cliente || c.id_mesero, tipo_operacion: 'reembolso', monto, fecha_hora: new Date() },
        })
      }
    })
    if (!cerrado) continue
    resumen.pedidos_no_entregados++
    if (trx && monto > 0) {
      resumen.pedidos_devueltos++
      resumen.monto_devuelto += monto
      if (c.id_cliente) {
        if (global.io) global.io.emit('billetera_actualizada', { id_usuario: c.id_cliente })
        await notificar(c.id_cliente, {
          tipo: 'billetera', titulo: 'Te devolvimos un pedido',
          mensaje: eraProgramado
            ? `El evento "${ev.nombre_evento}" terminó y tu pedido anticipado no se entregó: te devolvimos Bs ${bs(monto)} completos.`
            : `El evento "${ev.nombre_evento}" terminó y un pedido tuyo quedó sin entregar: te devolvimos Bs ${bs(monto)} (se retuvo ${pct}% según las normas del local).`,
          url: '/cliente/billetera',
        }).catch(() => {})
      }
    }
  }
}

async function vencerCortesias(ev, resumen) {
  const r = await prisma.entrada.updateMany({
    where: { cortesia_estado: 'pendiente', zona: { id_evento: ev.id_evento } },
    data: { cortesia_estado: 'vencida' },
  })
  resumen.cortesias_vencidas += r.count
}

// Cierra UN evento (idempotente). Devuelve el resumen de lo que hizo.
async function cerrarEvento(idEvento) {
  const ev = await prisma.evento.findUnique({ where: { id_evento: idEvento } })
  if (!ev) return null
  const pct = await comisionPct()
  const resumen = { id_evento: idEvento, evento: ev.nombre_evento, entradas_devueltas: 0, pedidos_no_entregados: 0, pedidos_devueltos: 0, cortesias_vencidas: 0, monto_devuelto: 0 }
  await devolverEntradasNoUsadas(ev, pct, resumen)
  await cerrarPedidosNoEntregados(ev, pct, resumen)
  await vencerCortesias(ev, resumen)
  resumen.monto_devuelto = Math.round(resumen.monto_devuelto * 100) / 100
  if (resumen.entradas_devueltas || resumen.pedidos_no_entregados || resumen.cortesias_vencidas) {
    console.log(`[cierre] ${ev.nombre_evento}: ${resumen.entradas_devueltas} entradas devueltas, ${resumen.pedidos_no_entregados} pedidos no entregados (${resumen.pedidos_devueltos} devueltos), ${resumen.cortesias_vencidas} cortesías vencidas, Bs ${bs(resumen.monto_devuelto)} devueltos`)
    if (global.io) global.io.emit('evento_cerrado', resumen)
  }
  return resumen
}

// Marca como "terminado" lo vencido y cierra todo lo que lo necesite. Repasa
// también los eventos terminados recientes, por si algo quedó sin cerrar
// (p. ej. compras viejas que seguían activas en producción).
async function cerrarEventosVencidos() {
  const ahora = hoyBolivia()
  const desde = new Date(ahora.getTime() - DIAS_REVISION * 24 * 3600 * 1000)
  await prisma.evento.updateMany({
    where: { fecha_hora_fin: { lt: ahora }, estado: { not: 'terminado' } },
    data: { estado: 'terminado' },
  })
  const terminados = await prisma.evento.findMany({
    where: { estado: 'terminado', OR: [{ fecha_hora_fin: { gte: desde } }, { fecha_hora_fin: null, fecha_hora_inicio: { gte: desde } }] },
    select: { id_evento: true },
  })
  const resumenes = []
  for (const ev of terminados) {
    try { resumenes.push(await cerrarEvento(ev.id_evento)) }
    catch (e) { console.error(`[cierre] evento ${ev.id_evento}:`, e.message) }
  }
  return resumenes.filter(Boolean)
}

let temporizador = null
function iniciarCierreDeEventos({ cadaMinutos = 5 } = {}) {
  if (temporizador) return
  setTimeout(() => cerrarEventosVencidos().catch(e => console.error('[cierre] arranque:', e.message)), 15000)
  temporizador = setInterval(() => cerrarEventosVencidos().catch(e => console.error('[cierre]:', e.message)), cadaMinutos * 60 * 1000)
  temporizador.unref()
}

module.exports = { cerrarEvento, cerrarEventosVencidos, iniciarCierreDeEventos }
