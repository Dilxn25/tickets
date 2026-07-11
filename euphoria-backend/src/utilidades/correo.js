// ============================================
// EUPHORIA — Envío de correos (gratis, vía Gmail SMTP con nodemailer)
// Requiere en .env:
//   CORREO_REMITENTE = tucorreo@gmail.com
//   CORREO_CLAVE_APP = clave-de-aplicacion-de-gmail (16 letras, sin la normal)
// Cómo obtener la clave de aplicación: cuenta de Google → Seguridad →
// Verificación en 2 pasos (activarla) → Contraseñas de aplicaciones.
// Si no está configurado, enviarCorreo no rompe nada: responde { enviado:false }.
// ============================================
const nodemailer = require('nodemailer')

let transporte = null
let configIntentada = false

// Logo de Euphoria alojado en Cloudinary: se referencia con <img src="URL"> (imagen
// ENLAZADA, no adjunta) para que NO aparezca como archivo adjunto en el correo.
const LOGO_URL = 'https://res.cloudinary.com/dgko2yffh/image/upload/euphoria/logo-correo.png'

function obtenerTransporte() {
  if (configIntentada) return transporte
  configIntentada = true
  const usuario = (process.env.CORREO_REMITENTE || '').trim()
  // Gmail muestra la clave de aplicación en grupos con espacios; el SMTP la quiere sin ellos.
  const clave = (process.env.CORREO_CLAVE_APP || '').replace(/\s+/g, '')
  if (!usuario || !clave) {
    console.warn('[correo] CORREO_REMITENTE/CORREO_CLAVE_APP sin configurar: no se enviarán correos.')
    return null
  }
  transporte = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: usuario, pass: clave },
  })
  return transporte
}

// ---- Envío por API HTTP de Brevo (funciona en Render, que bloquea SMTP saliente) ----
// Se usa cuando existe BREVO_API_KEY. No necesita dominio propio: basta verificar
// el remitente (CORREO_REMITENTE) en Brevo. Envía a cualquier destinatario.
async function enviarPorBrevo({ para, asunto, html, texto }) {
  const apiKey = (process.env.BREVO_API_KEY || '').trim()
  const remitente = (process.env.CORREO_REMITENTE || '').trim()
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Euphoria', email: remitente },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: html || undefined,
      textContent: texto || undefined,
    }),
  })
  if (resp.ok) return { enviado: true }
  const detalle = await resp.text().catch(() => '')
  throw new Error(`Brevo ${resp.status}: ${detalle.slice(0, 200)}`)
}

// Envía un correo. Nunca lanza: devuelve { enviado, error?, motivo? }.
// Prioridad: Brevo (HTTP, sirve en Render) si hay API key; si no, Gmail SMTP (local).
async function enviarCorreo({ para, asunto, html, texto }) {
  if ((process.env.BREVO_API_KEY || '').trim()) {
    try {
      return await enviarPorBrevo({ para, asunto, html, texto })
    } catch (error) {
      console.error('[correo] Error enviando por Brevo a', para, '-', error.message)
      return { enviado: false, error: error.message }
    }
  }
  const t = obtenerTransporte()
  if (!t) return { enviado: false, motivo: 'sin_config' }
  try {
    await t.sendMail({
      from: `"Euphoria" <${process.env.CORREO_REMITENTE}>`,
      to: para,
      subject: asunto,
      text: texto || undefined,
      html: html || undefined,
    })
    return { enviado: true }
  } catch (error) {
    console.error('[correo] Error enviando a', para, '-', error.message)
    return { enviado: false, error: error.message }
  }
}

// Plantilla de marca: cabecera clara con el LOGO real de Euphoria (el wordmark
// morado resalta sobre blanco), cuerpo oscuro elegante. `cuerpo` = HTML interno.
function plantilla({ titulo, cuerpo, saludo }) {
  return `
  <div style="margin:0;padding:0;background:#0b0618;">
    <div style="padding:28px 16px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;margin:0 auto;border-collapse:separate;">
        <tr><td style="background:#ffffff;border-radius:20px 20px 0 0;padding:30px 28px 26px;text-align:center;">
          <img src="${LOGO_URL}" alt="Euphoria" width="210" style="display:inline-block;max-width:210px;width:60%;height:auto;" />
          <div style="margin-top:8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9b8fc7;font-weight:700;">Vive la noche</div>
        </td></tr>
        <tr><td style="height:4px;background:linear-gradient(90deg,#6d28c9,#a855f7,#ec4899);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:#160f30;padding:30px 30px 26px;color:#e9e4f5;">
          ${saludo ? `<p style="margin:0 0 4px;font-size:14px;color:#b9b0d6;">${saludo}</p>` : ''}
          <h1 style="margin:0 0 16px;color:#ffffff;font-size:21px;font-weight:800;line-height:1.3;">${titulo}</h1>
          ${cuerpo}
        </td></tr>
        <tr><td style="background:#120b26;border-radius:0 0 20px 20px;padding:20px 30px;border-top:1px solid #271a4d;">
          <p style="margin:0 0 6px;color:#a99fce;font-size:13px;font-weight:700;">Euphoria</p>
          <p style="margin:0;color:#6f6690;font-size:11px;line-height:1.6;">Este mensaje se envió automáticamente. Si no lo solicitaste, puedes ignorarlo con tranquilidad.</p>
        </td></tr>
      </table>
    </div>
  </div>`
}

module.exports = { enviarCorreo, plantilla }
