// ============================================
// EUPHORIA — Servicio de Autenticación
// Rutas: POST /api/auth/login
//        POST /api/auth/registro
//        POST /api/auth/renovar
//        POST /api/auth/recuperar/pregunta
//        POST /api/auth/recuperar/reset
// ============================================
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const prisma = require('../../config/base-de-datos')
const { normalizarRespuesta } = require('../../utilidades/texto')
const rateLimit = require('express-rate-limit')

// ---- Límites de solicitudes (anti fuerza bruta) ----
// Login: máx. 10 intentos por IP cada 15 minutos.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Espera unos minutos e intenta de nuevo.' },
})

// Recuperación de contraseña: máx. 8 intentos por IP cada 15 minutos.
const limiteRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos antes de volver a intentar la recuperación.' },
})

// ---- Esquemas de Validación (Zod) ----
const esquemaLogin = z.object({
  correo: z.string().email({ message: 'El correo no tiene un formato válido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' }),
})

const esquemaRegistro = z.object({
  nombres: z.string()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .regex(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/, { message: 'El nombre solo puede contener letras' }),
  apellidos: z.string()
    .min(2, { message: 'Los apellidos deben tener al menos 2 caracteres' })
    .regex(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/, { message: 'Los apellidos solo pueden contener letras' }),
  correo: z.string().email({ message: 'El correo no tiene un formato válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  pregunta_seguridad: z.string().min(1, { message: 'Selecciona una pregunta de seguridad' }),
  respuesta_seguridad: z.string().min(1, { message: 'La respuesta de seguridad es requerida' }),
})

const esquemaReset = z.object({
  correo: z.string().email({ message: 'Correo inválido' }),
  respuesta: z.string().min(1, { message: 'La respuesta es requerida' }),
  nuevaPassword: z.string().min(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' }),
})

// Helper: generar tokens
function generarTokens(usuario) {
  const payload = {
    id: usuario.id_usuario,
    rol: usuario.rol.nombre_rol,
    correo: usuario.correo,
  }
  const acceso = jwt.sign(payload, process.env.JWT_SECRETO, {
    expiresIn: process.env.JWT_EXPIRACION || '8h',
  })
  const refresh = jwt.sign(
    { id: usuario.id_usuario },
    process.env.JWT_SECRETO_REFRESH,
    { expiresIn: process.env.JWT_EXPIRACION_REFRESH || '7d' }
  )
  return { acceso, refresh }
}

// POST /api/auth/login
router.post('/login', limiteLogin, async (req, res) => {
  try {
    const validacion = esquemaLogin.safeParse(req.body)
    if (!validacion.success) {
      return res.status(400).json({ error: validacion.error.errors[0].message })
    }
    const { correo, password } = validacion.data

    // Buscar usuario con su rol
    const usuario = await prisma.usuario.findUnique({
      where: { correo },
      include: { rol: true },
    })

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    if (usuario.estado_cuenta !== 'activo') {
      return res.status(403).json({ error: 'Tu cuenta está inactiva. Contacta al administrador.' })
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const tokens = generarTokens(usuario)
    console.log(`Login exitoso (usuario #${usuario.id_usuario}, rol ${usuario.rol.nombre_rol})`)

    res.json({
      mensaje: 'Sesión iniciada correctamente',
      token: tokens.acceso,
      refresh: tokens.refresh,
      usuario: {
        id: usuario.id_usuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol.nombre_rol,
        url_foto_perfil: usuario.url_foto_perfil,
      },
    })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  try {
    const validacion = esquemaRegistro.safeParse(req.body)
    if (!validacion.success) {
      return res.status(400).json({ error: validacion.error.errors[0].message })
    }
    const { nombres, apellidos, correo, password, pregunta_seguridad, respuesta_seguridad } = validacion.data

    const existe = await prisma.usuario.findUnique({ where: { correo } })
    if (existe) {
      return res.status(409).json({ error: 'El correo electrónico ya está en uso' })
    }

    let rolCliente = await prisma.rol.findFirst({ where: { nombre_rol: 'Cliente' } })
    if (!rolCliente) {
      rolCliente = await prisma.rol.create({ data: { nombre_rol: 'Cliente' } })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const respuestaNormalizada = normalizarRespuesta(respuesta_seguridad)
    const respuestaHash = await bcrypt.hash(respuestaNormalizada, 12)

    await prisma.usuario.create({
      data: {
        nombres,
        apellidos,
        correo,
        password_hash,
        pregunta_seguridad,
        respuesta_seguridad: respuestaHash,
        estado_cuenta: 'activo',
        id_rol: rolCliente.id_rol
      }
    })

    res.status(201).json({ mensaje: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.' })
  } catch (error) {
    console.error('Error en registro:', error)
    res.status(500).json({ error: 'Error interno al registrar usuario' })
  }
})

// POST /api/auth/renovar  (refresh token)
router.post('/renovar', async (req, res) => {
  try {
    const { refresh } = req.body
    if (!refresh) return res.status(400).json({ error: 'Token de renovación requerido' })

    const payload = jwt.verify(refresh, process.env.JWT_SECRETO_REFRESH)
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: payload.id },
      include: { rol: true },
    })

    if (!usuario || usuario.estado_cuenta !== 'activo') {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const tokens = generarTokens(usuario)
    res.json({ token: tokens.acceso, refresh: tokens.refresh })
  } catch {
    res.status(401).json({ error: 'Token de renovación inválido o expirado' })
  }
})

// POST /api/auth/recuperar/pregunta
router.post('/recuperar/pregunta', limiteRecuperacion, async (req, res) => {
  try {
    const { correo } = req.body
    if (!correo) return res.status(400).json({ error: 'El correo es requerido' })

    const usuario = await prisma.usuario.findUnique({ where: { correo } })
    if (!usuario) {
      return res.status(404).json({ error: 'No existe una cuenta con este correo' })
    }

    if (!usuario.pregunta_seguridad) {
      return res.status(400).json({ error: 'Esta cuenta no tiene configurada una pregunta de seguridad. Contacta a soporte.' })
    }

    res.json({ pregunta: usuario.pregunta_seguridad })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la pregunta de seguridad' })
  }
})

// POST /api/auth/recuperar/reset
router.post('/recuperar/reset', limiteRecuperacion, async (req, res) => {
  try {
    const validacion = esquemaReset.safeParse(req.body)
    if (!validacion.success) {
      return res.status(400).json({ error: validacion.error.errors[0].message })
    }
    const { correo, respuesta, nuevaPassword } = validacion.data

    const usuario = await prisma.usuario.findUnique({ where: { correo } })
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    if (!usuario.respuesta_seguridad) {
      return res.status(400).json({ error: 'Esta cuenta no tiene configurada una respuesta de seguridad.' })
    }

    const respuestaNormalizada = normalizarRespuesta(respuesta)
    const esRespuestaValida = await bcrypt.compare(respuestaNormalizada, usuario.respuesta_seguridad)
    if (!esRespuestaValida) {
      return res.status(401).json({ error: 'La respuesta a la pregunta secreta es incorrecta.' })
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const password_hash = await bcrypt.hash(nuevaPassword, 12)
    await prisma.usuario.update({
      where: { correo },
      data: { password_hash }
    })

    res.json({ mensaje: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.' })
  } catch (error) {
    console.error('Error en reset:', error)
    res.status(500).json({ error: 'Error al restablecer la contraseña' })
  }
})

module.exports = router
