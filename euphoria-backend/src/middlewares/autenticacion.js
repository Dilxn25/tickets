// ============================================
// EUPHORIA — Middleware de Autenticación JWT
// Protege rutas que requieren sesión activa
// ============================================
const jwt = require('jsonwebtoken')
const prisma = require('../config/base-de-datos')

// Verifica que el token JWT sea válido (y que el usuario siga activo)
async function verificarToken(req, res, next) {
  const cabecera = req.headers['authorization']
  const token    = cabecera && cabecera.split(' ')[1] // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: se requiere token de autenticación' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRETO)
    
    // Validación en tiempo real contra la Base de Datos
    const usuarioBD = await prisma.usuario.findUnique({
      where: { id_usuario: payload.id },
      include: { rol: true }
    })

    if (!usuarioBD) {
      return res.status(401).json({ error: 'El usuario ya no existe en el sistema.' })
    }

    if (usuarioBD.estado_cuenta !== 'activo') {
      return res.status(401).json({ error: 'Tu cuenta ha sido bloqueada o desactivada. Contacta al administrador.' })
    }

    // Se asigna la información fresca de la BD a req.usuario
    req.usuario = {
      id: usuarioBD.id_usuario,
      correo: usuarioBD.correo,
      rol: usuarioBD.rol.nombre_rol
    }
    
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' })
    }
    console.error('Error verificando token:', err)
    return res.status(403).json({ error: 'Token inválido o error de servidor' })
  }
}

// Restringe el acceso a roles específicos
// Uso: router.get('/ruta', verificarToken, soloRoles('Administrador'))
function soloRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({
        error: `Acceso denegado: se requiere rol ${roles.join(' o ')}`
      })
    }
    next()
  }
}

module.exports = { verificarToken, soloRoles }
