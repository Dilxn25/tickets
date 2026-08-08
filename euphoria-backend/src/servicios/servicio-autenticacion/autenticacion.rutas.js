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
const { enviarCorreo, plantilla } = require('../../utilidades/correo')
const crypto = require('crypto')
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

    // SEGURIDAD (anti-enumeración de usuarios): NO revelamos si el correo existe.
    // "Correo inexistente" y "contraseña incorrecta" dan el MISMO mensaje. Aunque el
    // usuario no exista, igual corremos un bcrypt.compare contra un hash señuelo para
    // gastar el mismo tiempo y no filtrar la existencia por la velocidad de respuesta.
    const MENSAJE_GENERICO = 'El correo o la contraseña son incorrectos.'
    const HASH_SENUELO = '$2a$12$sJvpVN7v/4KWqssxnB1qNe0XP6SAJpSYLvOkdO3P4bjw0Ao5vDAm6'
    const passwordValida = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_SENUELO)
    if (!usuario || !passwordValida) {
      return res.status(401).json({ error: MENSAJE_GENERICO })
    }

    // Recién con la contraseña CORRECTA avisamos si la cuenta está inactiva, así solo
    // el verdadero dueño ve ese mensaje (un atacante no puede distinguir inactiva de
    // "contraseña incorrecta"). Este es el único caso diferenciado.
    if (usuario.estado_cuenta !== 'activo') {
      return res.status(403).json({ error: 'Tu cuenta está inactiva. El administrador la desactivó; contáctalo para reactivarla.' })
    }

    const tokens = generarTokens(usuario)

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
        premio_perfil: usuario.premio_perfil ?? null,
        correo_verificado: !!usuario.correo_verificado,
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

// POST /api/auth/recuperar/solicitud
// Último recurso: no recuerda NI la contraseña NI su pregunta de seguridad.
// Deja sus datos de identidad y la solicitud aparece en la campana del ADMIN,
// que valida contra lo registrado (CI/teléfono) y resetea la contraseña.
router.post('/recuperar/solicitud', limiteRecuperacion, async (req, res) => {
  try {
    const { correo, nombre_contacto, ci_contacto, telefono, mensaje } = req.body
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo))) {
      return res.status(400).json({ error: 'Escribe el correo de tu cuenta.' })
    }
    if (!ci_contacto && !telefono) {
      return res.status(400).json({ error: 'Deja tu CI o tu teléfono para que el local pueda verificar que eres tú.' })
    }

    // Una pendiente por correo basta (evita spam a la campana del admin)
    const existente = await prisma.solicitud_recuperacion.findFirst({
      where: { correo: String(correo), estado: 'pendiente' },
    })
    if (existente) {
      return res.json({ mensaje: 'Ya tenemos tu solicitud: el local te contactará pronto.' })
    }

    await prisma.solicitud_recuperacion.create({
      data: {
        correo: String(correo).slice(0, 100),
        nombre_contacto: nombre_contacto ? String(nombre_contacto).slice(0, 120) : null,
        ci_contacto: ci_contacto ? String(ci_contacto).slice(0, 20) : null,
        telefono: telefono ? String(telefono).slice(0, 20) : null,
        mensaje: mensaje ? String(mensaje).slice(0, 400) : null,
      },
    })

    res.status(201).json({ mensaje: 'Solicitud enviada. El local verificará tus datos y te contactará para recuperar tu cuenta.' })
  } catch (error) {
    console.error('Error registrando solicitud de recuperación:', error)
    res.status(500).json({ error: 'No se pudo registrar la solicitud. Intenta de nuevo.' })
  }
})

// ===== Recuperación por CÓDIGO al correo (solo si el correo está verificado) =====

// POST /api/auth/recuperar/codigo/enviar — Body: { correo }
router.post('/recuperar/codigo/enviar', limiteRecuperacion, async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: 'Escribe el correo de tu cuenta.' })
    }
    const u = await prisma.usuario.findUnique({ where: { correo } })
    if (!u) {
      return res.status(400).json({ error: 'No encontramos una cuenta con ese correo.' })
    }
    // El código se envía SIEMPRE al dueño del correo. Si la cuenta aún no tenía el
    // correo verificado, al confirmar el código también lo verificamos (recibirlo
    // demuestra que el correo es suyo). Avisamos con `verificado` para la UI.
    // Anti-spam: uno cada 60 s.
    const reciente = await prisma.codigo_verificacion.findFirst({
      where: { id_usuario: u.id_usuario, proposito: 'recuperacion', usado: false, fecha: { gt: new Date(Date.now() - 60 * 1000) } },
    })
    if (reciente) return res.status(429).json({ error: 'Ya te enviamos un código. Espera un momento.' })

    const codigo = String(crypto.randomInt(100000, 1000000))
    await prisma.codigo_verificacion.updateMany({ where: { id_usuario: u.id_usuario, proposito: 'recuperacion', usado: false }, data: { usado: true } })
    await prisma.codigo_verificacion.create({
      data: { id_usuario: u.id_usuario, codigo, proposito: 'recuperacion', expira: new Date(Date.now() + 15 * 60 * 1000) },
    })
    await enviarCorreo({
      para: u.correo,
      asunto: 'Código para recuperar tu contraseña — Euphoria',
      html: plantilla({
        saludo: `Hola ${u.nombres || ''},`,
        titulo: 'Recupera tu contraseña',
        cuerpo: `
          <p style="margin:0 0 14px;line-height:1.65;color:#d9d2ef;">Usa este código para crear una nueva contraseña:</p>
          <div style="margin:18px 0;text-align:center;">
            <span style="display:inline-block;background:#241844;border:1px dashed #a855f7;border-radius:14px;padding:16px 30px;font-size:30px;font-weight:800;letter-spacing:10px;color:#fff;">${codigo}</span>
          </div>
          <p style="margin:14px 0 0;line-height:1.65;color:#a99fce;font-size:13px;">El código vence en 15 minutos. Si tú no lo pediste, ignora este mensaje y tu contraseña seguirá igual.</p>`,
      }),
      texto: `Tu código para recuperar la contraseña de Euphoria es ${codigo}. Vence en 15 minutos.`,
    })
    res.json({ mensaje: 'Te enviamos un código a tu correo.', verificado: !!u.correo_verificado })
  } catch (error) {
    console.error('Error enviando código de recuperación:', error)
    res.status(500).json({ error: 'No se pudo enviar el código. Intenta más tarde.' })
  }
})

// POST /api/auth/recuperar/codigo/confirmar — Body: { correo, codigo, nueva_password }
router.post('/recuperar/codigo/confirmar', limiteRecuperacion, async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase()
    const codigo = String(req.body.codigo || '').trim()
    const nueva = String(req.body.nueva_password || '')
    if (!/^\d{6}$/.test(codigo)) return res.status(400).json({ error: 'Ingresa el código de 6 dígitos.' })
    if (nueva.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' })

    const u = await prisma.usuario.findUnique({ where: { correo } })
    if (!u) return res.status(400).json({ error: 'Datos incorrectos.' })

    const reg = await prisma.codigo_verificacion.findFirst({
      where: { id_usuario: u.id_usuario, proposito: 'recuperacion', usado: false },
      orderBy: { fecha: 'desc' },
    })
    if (!reg) return res.status(400).json({ error: 'No hay un código pendiente. Pide uno nuevo.' })
    if (reg.expira < new Date()) return res.status(400).json({ error: 'El código venció. Pide uno nuevo.' })
    if (reg.intentos >= 5) return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' })
    if (reg.codigo !== codigo) {
      await prisma.codigo_verificacion.update({ where: { id_codigo: reg.id_codigo }, data: { intentos: { increment: 1 } } })
      return res.status(400).json({ error: 'Código incorrecto.' })
    }

    // Cambiar la contraseña y, de paso, dejar el correo VERIFICADO (recibir el
    // código prueba que el correo es suyo).
    await prisma.$transaction([
      prisma.codigo_verificacion.update({ where: { id_codigo: reg.id_codigo }, data: { usado: true } }),
      prisma.usuario.update({ where: { id_usuario: u.id_usuario }, data: { password_hash: bcrypt.hashSync(nueva, 12), correo_verificado: true } }),
    ])
    res.json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
  } catch (error) {
    console.error('Error confirmando código de recuperación:', error)
    res.status(500).json({ error: 'No se pudo actualizar la contraseña.' })
  }
})

module.exports = router
