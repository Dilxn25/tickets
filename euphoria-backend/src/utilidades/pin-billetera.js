// ============================================================
// EUPHORIA — PIN transaccional de billetera
// ============================================================
// El PIN se guarda CIFRADO (AES-256-GCM, reversible con la clave del
// servidor) y no hasheado, para que el dueño pueda VERLO desde su app
// ("ojito" en la tarjeta de la billetera) confirmando su contraseña,
// sin tener que cambiarlo si lo olvidó.
//
// Compatibilidad: los PINs guardados antes con bcrypt ($2...) se siguen
// verificando, pero no pueden revelarse (bcrypt no es reversible); en ese
// caso el endpoint de revelado pide configurar el PIN de nuevo (al
// guardarlo otra vez ya queda en formato cifrado).

const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const PREFIJO = 'enc:'

// Clave de 32 bytes derivada del secreto del servidor (no vive en la BD)
function claveServidor() {
  const secreto = process.env.JWT_SECRETO || process.env.JWT_SECRET || 'euphoria-secreto-dev'
  return crypto.createHash('sha256').update(`${secreto}:pin-billetera`).digest()
}

function cifrarPin(pin) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', claveServidor(), iv)
  const cifrado = Buffer.concat([cipher.update(String(pin), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIJO + Buffer.concat([iv, tag, cifrado]).toString('base64')
}

// Devuelve el PIN en claro, o null si no es descifrable (formato bcrypt viejo o corrupto)
function descifrarPin(almacenado) {
  if (!almacenado || !String(almacenado).startsWith(PREFIJO)) return null
  try {
    const datos = Buffer.from(String(almacenado).slice(PREFIJO.length), 'base64')
    const iv = datos.subarray(0, 12)
    const tag = datos.subarray(12, 28)
    const cifrado = datos.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', claveServidor(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8')
  } catch (e) {
    return null
  }
}

// Verifica un PIN contra lo almacenado, sea formato nuevo (enc:) o legado (bcrypt)
async function verificarPin(pin, almacenado) {
  if (!almacenado) return false
  const s = String(almacenado)
  if (s.startsWith(PREFIJO)) return descifrarPin(s) === String(pin)
  if (s.startsWith('$2')) return bcrypt.compare(String(pin), s)
  return false
}

// true si el PIN almacenado puede mostrarse (formato cifrado reversible)
function esRevelable(almacenado) {
  return !!almacenado && String(almacenado).startsWith(PREFIJO)
}

module.exports = { cifrarPin, descifrarPin, verificarPin, esRevelable }
