// ============================================
// EUPHORIA — Vigía del correo del banco (segunda validación de depósitos)
// ============================================
// Banco Unión manda una "NOTIFICACIÓN ACH" al correo del establecimiento por
// cada movimiento. Este vigía lee la bandeja por IMAP, distingue DEPÓSITOS
// (dinero que ENTRA a la cuenta del local) de egresos/retiros, extrae los
// datos y los guarda en `deposito_correo`. La validación de recargas los usa
// como comprobación de que el dinero llegó DE VERDAD (un correo del banco no
// se puede falsificar, a diferencia de una captura editada).
//
// Variables de entorno:
//   CORREO_IMAP_USUARIO  (ej. araucodilan@gmail.com)
//   CORREO_IMAP_CLAVE    (contraseña de aplicación de Gmail)
//   CORREO_IMAP_HOST     (opcional, por defecto imap.gmail.com)
// Sin credenciales el vigía simplemente no arranca (el OCR sigue solo).

const { ImapFlow } = require('imapflow')
const { simpleParser } = require('mailparser')
const prisma = require('../config/base-de-datos')

const INTERVALO_MS = 60 * 1000 // revisar cada minuto
let corriendo = false

// ---- Parseo de la NOTIFICACIÓN ACH (texto plano del correo) ----
// Deposito = la plata ENTRA: el correo dice "recibida del Banco Origen …".
// Egreso  = la plata SALE: "La orden enviada vía QR-Unimóvil Plus…" (se ignora).
function parsearNotificacionACH(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ')
  if (!/NOTIFICACI[OÓ]N ACH/i.test(t)) return null
  const esDeposito = /recibida del Banco Origen/i.test(t)
  if (!esDeposito) return null // egreso u otro tipo: no es un depósito al local

  const campo = (etiqueta) => {
    const m = t.match(new RegExp(`${etiqueta}\\s*:?\\s*([^:¿]+?)(?=\\s+[A-ZÑ¿][^:]{2,40}:|\\s*¿|\\s*$)`, 'i'))
    return m ? m[1].trim() : null
  }
  // Nº de orden: primero el explícito, si no el del encabezado "ACH NRO: xxxx"
  const orden = campo('N[úu]mero de Orden ACH') || (t.match(/ACH NRO:\s*(\d{6,})/i)?.[1] ?? null)
  const montoTxt = campo('Monto')
  const monto = montoTxt ? parseFloat(montoTxt.replace(/[^\d.,]/g, '').replace(',', '.')) : NaN
  const fechaTxt = campo('Fecha de transacci[óo]n') // dd/mm/yyyy
  const horaTxt = campo('Hora de transacci[óo]n') || '00:00:00'
  let fecha = null
  const fm = String(fechaTxt || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (fm) {
    const hm = String(horaTxt).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/) || [null, 0, 0, 0]
    fecha = new Date(Number(fm[3]), Number(fm[2]) - 1, Number(fm[1]), Number(hm[1]) || 0, Number(hm[2]) || 0, Number(hm[3]) || 0)
  }
  if (!orden || !Number.isFinite(monto) || monto <= 0 || !fecha) return null

  return {
    orden_ach: orden,
    monto,
    glosa: (campo('Glosa') || '').slice(0, 200),
    originante: (campo('Nombre del Originante') || '').slice(0, 150),
    banco_origen: (campo('Banco Origen') || '').slice(0, 100),
    fecha_transaccion: fecha,
  }
}

async function revisarBandeja(cliente) {
  const lock = await cliente.getMailboxLock('INBOX')
  try {
    // Solo correos del banco, sin leer y de las ÚLTIMAS 48 HORAS: el vigía no
    // debe barrer el histórico personal de la bandeja (R2.2).
    const desde = new Date(Date.now() - 48 * 3600 * 1000)
    const ids = await cliente.search({ seen: false, from: 'bancounion.com.bo', since: desde })
    if (!ids || !ids.length) return 0
    let nuevos = 0
    for (const id of ids) {
      try {
        const msg = await cliente.fetchOne(id, { source: true })
        const mail = await simpleParser(msg.source)
        const texto = `${mail.subject || ''} ${mail.text || ''} ${(mail.html || '').replace(/<[^>]+>/g, ' ')}`
        const dep = parsearNotificacionACH(texto)
        await cliente.messageFlagsAdd(id, ['\\Seen'])
        if (!dep) continue
        // Solo depósitos DEL NEGOCIO: la glosa debe mencionar a Euphoria.
        // Los depósitos personales del dueño no se registran (R2.2).
        if (!/euphoria/i.test(dep.glosa || '')) continue
        await prisma.deposito_correo.upsert({
          where: { orden_ach: dep.orden_ach },
          update: {}, // ya registrado: no tocar (protege el flag `usado`)
          create: dep,
        })
        nuevos++
        console.log(`[correo] depósito registrado: Bs ${dep.monto} · orden ${dep.orden_ach} · "${dep.glosa}"`)
      } catch (e) {
        console.warn('[correo] no se pudo procesar un mensaje:', e.message)
      }
    }
    return nuevos
  } finally {
    lock.release()
  }
}

async function cicloVigia() {
  const usuario = process.env.CORREO_IMAP_USUARIO
  const clave = process.env.CORREO_IMAP_CLAVE
  const cliente = new ImapFlow({
    host: process.env.CORREO_IMAP_HOST || 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: usuario, pass: clave },
    logger: false,
    // Render (red lenta / arranque en frío) a veces tarda en establecer el
    // socket TLS y el saludo del servidor. Timeouts holgados evitan que un
    // ciclo lento se corte por tiempo. (Si el login FALLA por credenciales
    // revocadas, ningún timeout ayuda: hay que renovar la clave de aplicación.)
    connectionTimeout: 45000,
    greetingTimeout: 30000,
  })
  // Un timeout o corte del socket IMAP (frecuente en el hosting) hace que imapflow
  // EMITA un evento 'error'. Ese evento NO viaja por la promesa, así que el try/catch
  // del ciclo no lo atrapa: sin este manejador Node lanza "Unhandled 'error' event" y
  // TUMBA todo el backend. Con el listener, el fallo solo se registra y el ciclo termina.
  cliente.on('error', (e) => console.warn('[correo] conexión IMAP con problema:', e && e.message))
  await cliente.connect()
  let nuevos = 0
  try { nuevos = await revisarBandeja(cliente) } finally { await cliente.logout().catch(() => {}) }
  // Depósitos nuevos: acreditar las recargas que esperaban la confirmación del banco.
  if (nuevos > 0) {
    const { conciliarRecargasPendientes } = require('./recargas-seguras')
    await conciliarRecargasPendientes().catch(e => console.warn('[recargas] conciliación falló:', e.message))
  }
}

function iniciarVigiaCorreo() {
  if (!process.env.CORREO_IMAP_USUARIO || !process.env.CORREO_IMAP_CLAVE) {
    console.log('[correo] vigía desactivado (faltan CORREO_IMAP_USUARIO / CORREO_IMAP_CLAVE)')
    return
  }
  // Higiene al arrancar: si quedaron registrados depósitos personales (de
  // antes del filtro por glosa), se eliminan — jamás deben estar en la tabla.
  prisma.deposito_correo.deleteMany({ where: { NOT: { glosa: { contains: 'euphoria' } } } })
    .then(r => { if (r.count) console.log(`[correo] limpieza: ${r.count} depósitos ajenos al negocio eliminados`) })
    .catch(() => {})

  const tick = async () => {
    if (corriendo) return
    corriendo = true
    try { await cicloVigia() } catch (e) { console.warn('[correo] vigía falló este ciclo:', e.message) }
    corriendo = false
  }
  tick()
  setInterval(tick, INTERVALO_MS).unref()
  console.log(`[correo] vigía activo: revisa ${process.env.CORREO_IMAP_USUARIO} cada ${INTERVALO_MS / 1000}s`)
}

// Prueba puntual de conexión IMAP (para el botón "Probar vigía" del admin): intenta
// conectar y abrir INBOX con las credenciales actuales. Así se confirma que la clave
// de aplicación es válida SIN esperar a que llegue un depósito real.
async function probarConexionCorreo() {
  const usuario = process.env.CORREO_IMAP_USUARIO
  const clave = process.env.CORREO_IMAP_CLAVE
  if (!usuario || !clave) {
    return { ok: false, configurado: false, mensaje: 'El vigía no está configurado (faltan CORREO_IMAP_USUARIO / CORREO_IMAP_CLAVE).' }
  }
  const cliente = new ImapFlow({
    host: process.env.CORREO_IMAP_HOST || 'imap.gmail.com',
    port: 993, secure: true, auth: { user: usuario, pass: clave }, logger: false,
    connectionTimeout: 15000, greetingTimeout: 10000,
  })
  cliente.on('error', () => {})
  try {
    await cliente.connect()
    const lock = await cliente.getMailboxLock('INBOX')
    lock.release()
    await cliente.logout().catch(() => {})
    return { ok: true, configurado: true, usuario, mensaje: `Conexión correcta con ${usuario}: el vigía puede leer el correo del banco.` }
  } catch (e) {
    try { await cliente.logout() } catch { /* nada */ }
    return { ok: false, configurado: true, usuario, mensaje: `No se pudo conectar con ${usuario}: ${e && e.message}. Revisá la contraseña de aplicación.` }
  }
}

module.exports = { iniciarVigiaCorreo, parsearNotificacionACH, probarConexionCorreo }
