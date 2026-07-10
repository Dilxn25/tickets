// EUPHORIA — Purga de zonas/eventos con REEMBOLSO.
// Al borrar un plano (zona) o un evento, se devuelve a cada cliente lo que pagó
// (reembolso COMPLETO: lo decide el local), se desvinculan sus pedidos y se
// limpian todos los datos que cuelgan, para que el borrado no quede bloqueado.
// Debe ejecutarse DENTRO de una transacción (tx). Devuelve los reembolsos hechos.

async function purgarZona(tx, id_zona, id_responsable) {
  const entradas = await tx.entrada.findMany({ where: { id_zona } })
  const mesas = await tx.mesa_espacio.findMany({ where: { id_zona }, select: { id_mesa: true } })
  const idsMesa = mesas.map(m => m.id_mesa)
  const idsEntrada = entradas.map(e => e.id_entrada)
  const reembolsos = []

  // 1) Reembolsar cada entrada pagada a la billetera del cliente.
  for (const ent of entradas) {
    const monto = Number(ent.monto_pagado || 0)
    if (monto <= 0) continue
    const bill = await tx.billetera.findUnique({ where: { id_usuario: ent.id_usuario } })
    if (!bill) continue
    await tx.billetera.update({
      where: { id_billetera: bill.id_billetera },
      data: { saldo_actual: { increment: monto }, ultima_actualizacion: new Date() },
    })
    await tx.transaccion.create({
      data: { id_billetera: bill.id_billetera, id_responsable, tipo_operacion: 'reembolso', monto, fecha_hora: new Date() },
    })
    reembolsos.push({ id_usuario: ent.id_usuario, monto })
  }

  // 2) Desvincular pedidos (no se borran; quedan sin mesa/entrada).
  if (idsEntrada.length) await tx.comanda.updateMany({ where: { id_entrada: { in: idsEntrada } }, data: { id_entrada: null } })
  if (idsMesa.length) await tx.comanda.updateMany({ where: { id_mesa: { in: idsMesa } }, data: { id_mesa: null } })

  // 3) Borrar lo que cuelga y por último la zona.
  await tx.asignacion_mesa.deleteMany({
    where: { OR: [
      { id_mesa: { in: idsMesa.length ? idsMesa : [0] } },
      { id_entrada: { in: idsEntrada.length ? idsEntrada : [0] } },
    ] },
  })
  await tx.registro_aforo.deleteMany({ where: { id_zona } })
  await tx.entrada.deleteMany({ where: { id_zona } })
  await tx.mesa_espacio.deleteMany({ where: { id_zona } })
  await tx.zona.delete({ where: { id_zona } })
  return reembolsos
}

// Purga TODAS las zonas de un evento y borra el evento.
async function purgarEvento(tx, id_evento, id_responsable) {
  const zonas = await tx.zona.findMany({ where: { id_evento }, select: { id_zona: true } })
  let reembolsos = []
  for (const z of zonas) {
    reembolsos = reembolsos.concat(await purgarZona(tx, z.id_zona, id_responsable))
  }
  // Solicitudes de grupo del evento (también apuntan al evento).
  await tx.solicitud_grupo.deleteMany({ where: { id_evento } })
  await tx.evento.delete({ where: { id_evento } })
  return reembolsos
}

module.exports = { purgarZona, purgarEvento }
