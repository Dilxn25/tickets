// ============================================
// EUPHORIA — Recargas de billetera seguras (sin pasarela de pago)
// ============================================
// Reglas de dinero:
//  1. El servidor SOLO acredita lo que él mismo validó: la recarga se pide con
//     el id del análisis del comprobante (no con un monto suelto), el análisis
//     debe ser del mismo usuario y se consume una sola vez.
//  2. El OCR no distingue una captura editada. Lo que no se puede falsificar es
//     el correo del banco. Por eso: hasta el TOPE la recarga se acredita al
//     instante con el OCR; por encima queda PENDIENTE hasta que el vigía del
//     correo encuentre el depósito, o el cajero/administrador la confirme.
//  3. Un depósito que llegó al banco y no se asignó a nadie (el cliente declaró
//     otro monto) queda visible en caja para resolverlo.
const prisma = require('../config/base-de-datos')
const { hoyBolivia } = require('./tiempo')

// Análisis de comprobantes en curso/terminados (en memoria): el frontend hace
// polling por id. Se limpian a los 20 minutos.
const analisisEnCurso = new Map()
setInterval(() => {
  const limite = Date.now() - 20 * 60e3
  for (const [id, a] of analisisEnCurso) if (a.creado < limite) analisisEnCurso.delete(id)
}, 5 * 60e3).unref()

// Toma un análisis VÁLIDO del usuario y lo consume (borrado síncrono, antes de
// cualquier await: dos pedidos con el mismo id no pueden acreditar dos veces).
function consumirAnalisis(id, idUsuario) {
  const a = analisisEnCurso.get(id)
  if (!a) return { error: 'La validación del comprobante expiró. Vuelve a subirlo.' }
  if (a.id_usuario !== idUsuario) return { error: 'Este comprobante no fue validado para tu cuenta.' }
  if (a.estado !== 'terminado') return { error: 'El comprobante todavía se está revisando.' }
  if (!a.resultado?.valido) return { error: 'El comprobante no fue aprobado.' }
  analisisEnCurso.delete(id)
  return { analisis: a }
}

// Distancia de edición (Levenshtein) para tolerar 1-2 errores del OCR al comparar
// números de transacción (ej. 0/O, 8/B, 1/I) y no dejar reusar el MISMO comprobante.
function distanciaEdicion(a, b) {
  a = String(a || ''); b = String(b || '')
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c)
    }
  }
  return dp[m][n]
}

// Tope de acreditación instantánea (Bs), editable en la tabla configuracion
// con la clave 'recarga_tope_instantaneo'. Sin fila, vale 100.
const TOPE_POR_DEFECTO = 100
async function leerTopeInstantaneo() {
  try {
    const fila = await prisma.configuracion.findUnique({ where: { clave: 'recarga_tope_instantaneo' } })
    const v = parseFloat(fila?.valor)
    if (Number.isFinite(v) && v >= 0) return v
  } catch { /* respaldo abajo */ }
  return TOPE_POR_DEFECTO
}

// Datos que el análisis dejó en la URL del comprobante: |TX:...|M:...|B:...
function datosDeUrl(url) {
  const s = String(url || '')
  return {
    tx: s.match(/\|TX:([^|]+)/)?.[1] || '',
    monto: parseFloat(s.match(/\|M:([^|]+)/)?.[1]) || null,
  }
}

// Acredita una recarga PENDIENTE de forma atómica: solo si sigue pendiente.
// Si se pasa idDeposito, ese depósito del correo se marca usado en la misma
// transacción (si ya estaba usado, no se acredita nada).
async function acreditarPendiente(idRecarga, { idDeposito = null, idResponsable = null, sello = null } = {}) {
  const r = await prisma.$transaction(async (tx) => {
    if (idDeposito) {
      const dep = await tx.deposito_correo.updateMany({ where: { id_deposito: idDeposito, usado: false }, data: { usado: true } })
      if (dep.count === 0) return null
    }
    const recarga = await tx.recarga_billetera.findUnique({ where: { id_recarga: idRecarga } })
    if (!recarga) return null
    const marcada = await tx.recarga_billetera.updateMany({
      where: { id_recarga: idRecarga, estado: 'pendiente' },
      data: {
        estado: 'completada',
        fecha_confirmacion: new Date(),
        ...(sello && { comprobante_url: `${recarga.comprobante_url || ''}|BANCO:${sello}` }),
      },
    })
    if (marcada.count === 0) throw new Error('YA_PROCESADA') // revierte el depósito marcado
    await tx.billetera.update({
      where: { id_billetera: recarga.id_billetera },
      data: { saldo_actual: { increment: recarga.monto_recarga }, ultima_actualizacion: new Date() },
    })
    await tx.transaccion.create({
      data: {
        id_billetera: recarga.id_billetera,
        id_responsable: idResponsable || recarga.id_usuario,
        tipo_operacion: 'RECARGA',
        monto: recarga.monto_recarga,
        fecha_hora: new Date(),
      },
    })
    return recarga
  }).catch(e => { if (e.message === 'YA_PROCESADA') return null; throw e })
  if (r) {
    if (global.io) {
      global.io.emit('billetera_actualizada', { id_usuario: r.id_usuario })
      global.io.emit('recarga_registrada')
    }
    const { notificar } = require('./notificaciones')
    await notificar(r.id_usuario, {
      tipo: 'billetera', titulo: 'Recarga acreditada',
      mensaje: `Tu recarga de Bs ${Number(r.monto_recarga)} ya está en tu billetera.`, url: '/cliente/billetera',
    }).catch(() => {})
  }
  return r
}

// El vigía registró depósitos nuevos: se buscan recargas PENDIENTES que
// coincidan y se acreditan solas. Con N° de transacción: se cruza por la orden
// ACH (tolera 2 errores de lectura). Sin N° (clave NOTX-día-hora-usuario-monto):
// mismo monto, mismo día y hora a ±20 minutos.
async function conciliarRecargasPendientes() {
  const desde = new Date(Date.now() - 72 * 3600 * 1000)
  const pendientes = await prisma.recarga_billetera.findMany({
    where: { estado: 'pendiente', fecha_solicitud: { gte: desde }, comprobante_url: { contains: '|TX:' } },
    orderBy: { fecha_solicitud: 'asc' },
  })
  if (!pendientes.length) return 0
  // fecha_transaccion del correo es la hora boliviana "naive" (como la arma el
  // vigía); se compara contra hoyBolivia(), nunca contra la hora del servidor.
  const haceTresDias = new Date(hoyBolivia().getTime() - 72 * 3600 * 1000)
  let acreditadas = 0
  for (const rec of pendientes) {
    const { tx } = datosDeUrl(rec.comprobante_url)
    const monto = Number(rec.monto_recarga)
    const candidatos = await prisma.deposito_correo.findMany({
      where: { usado: false, monto, fecha_transaccion: { gte: haceTresDias }, glosa: { contains: 'euphoria' } },
    })
    let dep = null
    const notx = tx.match(/^NOTX-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-/)
    if (notx) {
      const objetivo = new Date(Number(notx[1]), Number(notx[2]) - 1, Number(notx[3]), Number(notx[4]), Number(notx[5])).getTime()
      dep = candidatos
        .map(c => ({ c, diff: Math.abs(new Date(c.fecha_transaccion).getTime() - objetivo) / 60e3 }))
        .filter(x => x.diff <= 20)
        .sort((a, b) => a.diff - b.diff)[0]?.c || null
    } else if (tx) {
      const t = tx.toUpperCase()
      dep = candidatos.find(c => {
        const o = String(c.orden_ach).toUpperCase()
        return o.includes(t) || t.includes(o) || distanciaEdicion(o, t) <= 2
      }) || null
    }
    if (!dep) continue
    const ok = await acreditarPendiente(rec.id_recarga, { idDeposito: dep.id_deposito, sello: dep.orden_ach })
    if (ok) {
      acreditadas++
      console.log(`[recargas] pendiente ${rec.id_recarga} acreditada por el banco (orden ${dep.orden_ach}, Bs ${monto})`)
    }
  }
  return acreditadas
}

module.exports = {
  analisisEnCurso,
  consumirAnalisis,
  distanciaEdicion,
  leerTopeInstantaneo,
  datosDeUrl,
  acreditarPendiente,
  conciliarRecargasPendientes,
  TOPE_POR_DEFECTO,
}
