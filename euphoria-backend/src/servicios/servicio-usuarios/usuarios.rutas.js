// ============================================
// EUPHORIA — Servicio de Usuarios
// Rutas: GET    /api/usuarios
//        GET    /api/usuarios/:id
//        POST   /api/usuarios
//        PUT    /api/usuarios/:id
//        PATCH  /api/usuarios/:id/estado
//        PATCH  /api/usuarios/:id/reset-password
// ============================================
const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const { z }   = require('zod')
const prisma  = require('../../config/base-de-datos')
const { verificarToken, soloRoles } = require('../../middlewares/autenticacion')
const { subirFotoPerfil, eliminarImagen } = require('../../config/cloudinary')
const { normalizarRespuesta } = require('../../utilidades/texto')
const { enviarCorreo, plantilla } = require('../../utilidades/correo')
const { emitirRecurso } = require('../../utilidades/config-runtime')
const { notificar } = require('../../utilidades/notificaciones')
const crypto = require('crypto')

// Genera un código numérico de 6 dígitos para verificaciones por correo.
function generarCodigo() { return String(crypto.randomInt(100000, 1000000)) }
// Cuerpo de correo con el código destacado (se reutiliza en verificación y recuperación).
function cuerpoCodigo(intro, codigo, cierre) {
  return `
    <p style="margin:0 0 14px;line-height:1.65;color:#d9d2ef;">${intro}</p>
    <div style="margin:18px 0;text-align:center;">
      <span style="display:inline-block;background:#241844;border:1px dashed #a855f7;border-radius:14px;padding:16px 30px;font-size:30px;font-weight:800;letter-spacing:10px;color:#fff;">${codigo}</span>
    </div>
    <p style="margin:14px 0 0;line-height:1.65;color:#a99fce;font-size:13px;">${cierre}</p>`
}

// ---- Esquemas de Validación (Zod) ----
const esquemaNombreApellido = z.string()
  .min(2, { message: 'Debe tener al menos 2 caracteres' })
  .regex(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/, { message: 'Solo se permiten letras (sin números ni símbolos)' })

const esquemaCrearUsuario = z.object({
  nombres:   esquemaNombreApellido,
  apellidos: esquemaNombreApellido,
  correo:    z.string().email({ message: 'El correo no tiene un formato válido' }),
  password:  z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  id_rol:    z.coerce.number().int().positive({ message: 'El rol es requerido' }),
  telefono:  z.string().optional(),
  ci_carnet: z.string().optional(),
})

const esquemaEditarUsuario = z.object({
  nombres:   esquemaNombreApellido.optional(),
  apellidos: esquemaNombreApellido.optional(),
  correo:    z.string().email({ message: 'El correo no tiene un formato válido' }).optional(),
  id_rol:    z.coerce.number().int().positive().optional(),
  telefono:  z.string().optional(),
  ci_carnet: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo a actualizar' })

const esquemaEstado = z.object({
  estado_cuenta: z.enum(['activo', 'inactivo'], { message: "Estado inválido. Use: 'activo' | 'inactivo'" }),
})


// El usuario del perfil se responde SIEMPRE con la misma forma que el login
// (id, no id_usuario) para que el store del front nunca quede con un shape roto.
function usuarioParaFront(u) {
  return {
    id: u.id_usuario,
    nombres: u.nombres,
    apellidos: u.apellidos,
    correo: u.correo,
    telefono: u.telefono,
    ci_carnet: u.ci_carnet,
    pregunta_seguridad: u.pregunta_seguridad,
    url_foto_perfil: u.url_foto_perfil,
    rol: u.rol?.nombre_rol,
    premio_perfil: u.premio_perfil ?? null,
    correo_verificado: !!u.correo_verificado,
  }
}

// Premio por perfil completo (solo clientes): al llenar los 6 datos se otorga
// UNA VEZ un 10% de descuento (tope Bs 30) para su siguiente pedido con
// billetera. El descuento real lo aplica el backend de comandas al cobrar.
function perfilEstaCompleto(u) {
  return !!(u.nombres && u.apellidos && u.ci_carnet && u.telefono && u.url_foto_perfil && u.pregunta_seguridad && u.correo_verificado)
}

// Devuelve true si acaba de otorgarse (para que el front celebre una sola vez)
async function otorgarPremioSiCorresponde(u) {
  if (!u || u.premio_perfil || u.rol?.nombre_rol !== 'Cliente') return false
  if (!perfilEstaCompleto(u)) return false
  await prisma.usuario.update({
    where: { id_usuario: u.id_usuario },
    data: { premio_perfil: 'pendiente' },
  })
  u.premio_perfil = 'pendiente'
  return true
}

// ---- Solicitudes de recuperación de cuenta (solo ADMIN) ----
// El admin valida identidad comparando lo que el cliente DEJÓ en la solicitud
// contra lo REGISTRADO en la cuenta (CI/teléfono); las coincidencias se marcan.
router.get('/solicitudes-recuperacion', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const estado = req.query.estado || 'pendiente'
    const solicitudes = await prisma.solicitud_recuperacion.findMany({
      where: estado === 'todas' ? {} : { estado },
      orderBy: { fecha_solicitud: 'desc' },
      take: 50,
    })

    const conCuenta = await Promise.all(solicitudes.map(async s => {
      const cuenta = await prisma.usuario.findUnique({
        where: { correo: s.correo },
        select: { id_usuario: true, nombres: true, apellidos: true, ci_carnet: true, telefono: true },
      })
      const limpiar = v => String(v || '').replace(/\D/g, '')
      // Normaliza teléfonos: ignora el prefijo país 591 para comparar (así "+59170000000"
      // y "70000000" se consideran el mismo número).
      const telNorm = v => { const d = limpiar(v); return d.startsWith('591') ? d.slice(3) : d }
      return {
        ...s,
        cuenta: cuenta ? {
          id_usuario: cuenta.id_usuario,
          nombre: `${cuenta.nombres} ${cuenta.apellidos}`.trim(),
          ci_coincide: !!(cuenta.ci_carnet && s.ci_contacto && limpiar(cuenta.ci_carnet) === limpiar(s.ci_contacto)),
          telefono_coincide: !!(cuenta.telefono && s.telefono && telNorm(cuenta.telefono) === telNorm(s.telefono)),
          tiene_ci_registrado: !!cuenta.ci_carnet,
          tiene_telefono_registrado: !!cuenta.telefono,
        } : null,
      }
    }))

    res.json({ solicitudes: conCuenta })
  } catch (error) {
    console.error('Error listando solicitudes de recuperación:', error)
    res.status(500).json({ error: 'Error al listar solicitudes' })
  }
})

router.patch('/solicitudes-recuperacion/:id/atender', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const solicitud = await prisma.solicitud_recuperacion.findUnique({ where: { id_solicitud: id } })
    await prisma.solicitud_recuperacion.update({
      where: { id_solicitud: id },
      data: { estado: 'atendida', fecha_atencion: new Date() },
    })

    // Informar al cliente que su solicitud se revisó pero no se pudo verificar
    // en línea (así no queda esperando sin respuesta).
    let correoEnviado = false
    if (solicitud?.correo) {
      const r = await enviarCorreo({
        para: solicitud.correo,
        asunto: 'Sobre tu solicitud de recuperación — Euphoria',
        html: plantilla({
          saludo: 'Hola,',
          titulo: 'Revisamos tu solicitud',
          cuerpo: `
            <p style="margin:0 0 14px;line-height:1.65;color:#d9d2ef;">Recibimos tu pedido para recuperar el acceso a tu cuenta, pero por seguridad no pudimos verificar tu identidad con los datos enviados.</p>
            <p style="margin:0 0 14px;line-height:1.65;color:#d9d2ef;">Acércate al local con tu documento de identidad (CI) y con gusto te ayudamos a restablecer tu acceso en el momento.</p>
            <p style="margin:0;line-height:1.65;color:#a99fce;font-size:13px;">Gracias por tu comprensión.</p>`,
        }),
        texto: 'Revisamos tu solicitud de recuperación en Euphoria pero no pudimos verificar tu identidad en línea. Acércate al local con tu CI y te ayudamos a restablecer el acceso.',
      })
      correoEnviado = r.enviado
    }
    res.json({ mensaje: correoEnviado ? 'Solicitud cerrada y avisada al correo del cliente.' : 'Solicitud marcada como atendida', correo_enviado: correoEnviado })
  } catch (error) {
    res.status(500).json({ error: 'Error al atender la solicitud' })
  }
})

// PATCH /solicitudes-recuperacion/:id/resolver — el admin ya validó la identidad:
// resetea la contraseña de la cuenta a una temporal, marca la solicitud atendida
// y DEVUELVE la clave temporal + el contacto del cliente para que el admin se lo
// avise por WhatsApp/llamada/correo (el cliente no tiene acceso a la app aún).
router.patch('/solicitudes-recuperacion/:id/resolver', verificarToken, soloRoles('Administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const solicitud = await prisma.solicitud_recuperacion.findUnique({ where: { id_solicitud: id } })
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' })

    const cuenta = await prisma.usuario.findUnique({ where: { correo: solicitud.correo } })
    if (!cuenta) {
      return res.status(400).json({ error: 'No existe una cuenta con ese correo: no se puede restablecer.' })
    }

    const passwordTemporal = '123456'
    await prisma.usuario.update({
      where: { id_usuario: cuenta.id_usuario },
      data: { password_hash: await bcrypt.hash(passwordTemporal, 12) },
    })
    await prisma.solicitud_recuperacion.update({
      where: { id_solicitud: id },
      data: { estado: 'atendida', fecha_atencion: new Date() },
    })

    // Avisar al cliente por correo AUTOMÁTICAMENTE con su clave temporal.
    const nombreCliente = `${cuenta.nombres} ${cuenta.apellidos}`.trim()
    const correoRes = await enviarCorreo({
      para: cuenta.correo,
      asunto: 'Tu contraseña de Euphoria fue restablecida',
      html: plantilla({
        saludo: `Hola ${cuenta.nombres || ''},`,
        titulo: 'Ya puedes volver a entrar',
        cuerpo: `
          <p style="margin:0 0 14px;line-height:1.65;color:#d9d2ef;">Restablecimos la contraseña de tu cuenta. Ingresa con esta clave temporal y cámbiala desde tu perfil:</p>
          <div style="margin:18px 0;text-align:center;">
            <span style="display:inline-block;background:#241844;border:1px dashed #a855f7;border-radius:14px;padding:16px 34px;font-size:28px;font-weight:800;letter-spacing:6px;color:#fff;">${passwordTemporal}</span>
          </div>
          <p style="margin:14px 0 0;line-height:1.65;color:#a99fce;font-size:13px;">Por tu seguridad, cámbiala apenas ingreses. Si tú no pediste esto, contáctanos.</p>`,
      }),
      texto: `Hola ${cuenta.nombres || ''}. Tu contraseña de Euphoria fue restablecida. Clave temporal: ${passwordTemporal}. Cámbiala desde tu perfil al ingresar.`,
    })

    res.json({
      mensaje: correoRes.enviado
        ? 'Contraseña restablecida y avisada al correo del cliente.'
        : 'Contraseña restablecida. Avisa al cliente su nueva clave temporal.',
      password_temporal: passwordTemporal,
      correo_enviado: correoRes.enviado,
      contacto: {
        nombre: nombreCliente,
        correo: cuenta.correo,
        // el teléfono de la solicitud o el registrado en la cuenta
        telefono: solicitud.telefono || cuenta.telefono || null,
      },
    })
  } catch (error) {
    console.error('Error resolviendo solicitud de recuperación:', error)
    res.status(500).json({ error: 'Error al restablecer la contraseña' })
  }
})

// ---- GET /api/usuarios/perfil — datos frescos del propio usuario ----
// (el login no incluye teléfono/CI/pregunta; el formulario de perfil los necesita)
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const u = await prisma.usuario.findUnique({
      where: { id_usuario: req.usuario.id },
      include: { rol: true },
    })
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ usuario: usuarioParaFront(u) })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

// ---- Endpoint para el propio usuario (Cliente/Cajero/etc) ----
router.put('/perfil', verificarToken, subirFotoPerfil.single('imagen'), async (req, res) => {
  try {
    const { nombres, apellidos, telefono, ci_carnet } = req.body
    const id = req.usuario.id

    if (req.file) {
      const actual = await prisma.usuario.findUnique({ where: { id_usuario: id } })
      if (actual?.url_foto_perfil) await eliminarImagen(actual.url_foto_perfil)
    }

    const actualizado = await prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        ...(nombres   && { nombres }),
        ...(apellidos && { apellidos }),
        // Teléfono y CI SÍ se pueden vaciar (el front manda '' para limpiarlos)
        ...(telefono  !== undefined && { telefono: telefono || null }),
        ...(ci_carnet !== undefined && { ci_carnet: ci_carnet || null }),
        ...(req.file  && { url_foto_perfil: req.file.path })
      },
      include: { rol: true }
    })

    const premioOtorgado = await otorgarPremioSiCorresponde(actualizado)
    emitirRecurso('usuarios', { id: actualizado.id_usuario })
    res.json({ mensaje: 'Perfil actualizado', usuario: usuarioParaFront(actualizado), premio_otorgado: premioOtorgado })
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})

router.put('/perfil/password', verificarToken, async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body
    const id = req.usuario.id

    // Validación del body (sin esto, bcrypt truena con undefined → 500)
    if (!passwordActual) return res.status(400).json({ error: 'Ingresa tu contraseña actual' })
    if (!passwordNuevo || String(passwordNuevo).length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
    }

    const user = await prisma.usuario.findUnique({ where: { id_usuario: id } })
    const esValido = await bcrypt.compare(passwordActual, user.password_hash)
    if (!esValido) return res.status(400).json({ error: 'La contraseña actual es incorrecta' })

    const hashNuevo = await bcrypt.hash(passwordNuevo, 12)
    await prisma.usuario.update({
      where: { id_usuario: id },
      data: { password_hash: hashNuevo }
    })

    res.json({ mensaje: 'Contraseña actualizada correctamente' })
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' })
  }
})

router.put('/perfil/seguridad', verificarToken, async (req, res) => {
  try {
    const { pregunta, respuesta } = req.body
    const id = req.usuario.id

    if (!pregunta || !respuesta) {
      return res.status(400).json({ error: 'Pregunta y respuesta son obligatorias' })
    }

    const respuestaNormalizada = normalizarRespuesta(respuesta)
    const respuestaHash = await bcrypt.hash(respuestaNormalizada, 12)

    const actualizado = await prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        pregunta_seguridad: pregunta,
        respuesta_seguridad: respuestaHash
      },
      include: { rol: true }
    })

    const premioOtorgado = await otorgarPremioSiCorresponde(actualizado)
    emitirRecurso('usuarios', { id: actualizado.id_usuario })
    res.json({ mensaje: 'Pregunta de seguridad actualizada', usuario: usuarioParaFront(actualizado), premio_otorgado: premioOtorgado })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al guardar la pregunta de seguridad' })
  }
})

// ===== Verificación de correo (paso del perfil completo) =====

// POST /api/usuarios/verificar-correo/enviar — manda un código de 6 dígitos.
// Body opcional: { nuevo_correo } → si viene y es distinto, el código se manda a ESE
// correo (cambio de correo); se valida que no exista ya en otra cuenta. El correo
// solo se establece al confirmar el código.
router.post('/verificar-correo/enviar', verificarToken, async (req, res) => {
  try {
    const id_usuario = req.usuario.id
    const u = await prisma.usuario.findUnique({ where: { id_usuario } })
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })

    // ¿Cambio de correo? (viene un correo distinto al actual)
    const nuevoCorreo = String(req.body.nuevo_correo || '').trim().toLowerCase()
    let esCambio = false
    let destino = u.correo
    if (nuevoCorreo && nuevoCorreo !== u.correo.toLowerCase()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoCorreo)) {
        return res.status(400).json({ error: 'Escribe un correo válido.' })
      }
      // Unicidad: que no lo use otra cuenta.
      const ocupado = await prisma.usuario.findUnique({ where: { correo: nuevoCorreo } })
      if (ocupado && ocupado.id_usuario !== id_usuario) {
        return res.status(409).json({ error: 'Ese correo ya está registrado en otra cuenta.' })
      }
      esCambio = true
      destino = nuevoCorreo
    } else if (u.correo_verificado) {
      // Mismo correo y ya verificado: nada que hacer.
      return res.json({ ya_verificado: true, mensaje: 'Tu correo ya está verificado.' })
    }

    // Anti-spam: no reenviar si ya se mandó uno hace menos de 60 s.
    const reciente = await prisma.codigo_verificacion.findFirst({
      where: { id_usuario, proposito: 'correo', usado: false, fecha: { gt: new Date(Date.now() - 60 * 1000) } },
    })
    if (reciente) return res.status(429).json({ error: 'Espera un momento antes de pedir otro código.' })

    const codigo = generarCodigo()
    // Invalidar códigos previos de correo y crear el nuevo (vence en 15 min).
    await prisma.codigo_verificacion.updateMany({ where: { id_usuario, proposito: 'correo', usado: false }, data: { usado: true } })
    await prisma.codigo_verificacion.create({
      data: { id_usuario, codigo, proposito: 'correo', dato: esCambio ? destino : null, expira: new Date(Date.now() + 15 * 60 * 1000) },
    })

    const r = await enviarCorreo({
      para: destino, // el código va al correo que se quiere verificar/establecer
      asunto: 'Tu código de verificación — Euphoria',
      html: plantilla({
        saludo: `Hola ${u.nombres || ''},`,
        titulo: esCambio ? 'Confirma tu nuevo correo' : 'Verifica tu correo',
        cuerpo: cuerpoCodigo(
          esCambio ? 'Usa este código para establecer este correo en tu cuenta:' : 'Usa este código para confirmar que este correo es tuyo:',
          codigo,
          'El código vence en 15 minutos. Si tú no lo pediste, ignora este mensaje.'),
      }),
      texto: `Tu código de verificación de Euphoria es ${codigo}. Vence en 15 minutos.`,
    })
    if (!r.enviado) return res.status(500).json({ error: 'No se pudo enviar el correo. Revisa que la dirección sea válida.' })
    res.json({ mensaje: `Te enviamos un código a ${destino}.`, es_cambio: esCambio })
  } catch (error) {
    console.error('Error enviando código de verificación:', error)
    res.status(500).json({ error: 'Error al enviar el código' })
  }
})

// POST /api/usuarios/verificar-correo/confirmar — valida el código e marca verificado.
router.post('/verificar-correo/confirmar', verificarToken, async (req, res) => {
  try {
    const id_usuario = req.usuario.id
    const codigo = String(req.body.codigo || '').trim()
    if (!/^\d{6}$/.test(codigo)) return res.status(400).json({ error: 'Ingresa el código de 6 dígitos.' })

    const reg = await prisma.codigo_verificacion.findFirst({
      where: { id_usuario, proposito: 'correo', usado: false },
      orderBy: { fecha: 'desc' },
    })
    if (!reg) return res.status(400).json({ error: 'No hay un código pendiente. Pide uno nuevo.' })
    if (reg.expira < new Date()) return res.status(400).json({ error: 'El código venció. Pide uno nuevo.' })
    if (reg.intentos >= 5) return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' })
    if (reg.codigo !== codigo) {
      await prisma.codigo_verificacion.update({ where: { id_codigo: reg.id_codigo }, data: { intentos: { increment: 1 } } })
      return res.status(400).json({ error: 'Código incorrecto.' })
    }

    // Datos a actualizar: siempre queda verificado; si es cambio de correo, se ESTABLECE ahora.
    const datosUpdate = { correo_verificado: true }
    if (reg.dato) {
      // Re-chequear unicidad por si alguien tomó el correo entre pedir y confirmar.
      const ocupado = await prisma.usuario.findUnique({ where: { correo: reg.dato } })
      if (ocupado && ocupado.id_usuario !== id_usuario) {
        return res.status(409).json({ error: 'Ese correo se registró en otra cuenta mientras tanto. Usa otro.' })
      }
      datosUpdate.correo = reg.dato
    }

    await prisma.codigo_verificacion.update({ where: { id_codigo: reg.id_codigo }, data: { usado: true } })
    let actualizado
    try {
      actualizado = await prisma.usuario.update({ where: { id_usuario }, data: datosUpdate, include: { rol: true } })
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'Ese correo ya está registrado en otra cuenta.' })
      throw e
    }
    // Verificar el correo puede COMPLETAR el perfil → otorgar el premio si corresponde.
    const premioOtorgado = await otorgarPremioSiCorresponde(actualizado)
    emitirRecurso('usuarios', { id: id_usuario })
    res.json({ mensaje: reg.dato ? '¡Correo actualizado y verificado!' : '¡Correo verificado!', correo_verificado: true, usuario: usuarioParaFront(actualizado), premio_otorgado: premioOtorgado })
  } catch (error) {
    console.error('Error verificando correo:', error)
    res.status(500).json({ error: 'Error al verificar el código' })
  }
})

// Todos los demás endpoints requieren ser Administrador
router.use(verificarToken)

// ---- GET /api/usuarios — Listar todos (Admin, Mesero, Bartender) ----
router.get('/', async (req, res) => {
  try {
    // Verificar que sea admin, mesero o bartender
    const rolUsuario = req.usuario.rol
    if (!['Administrador', 'Mesero', 'Bartender'].includes(rolUsuario)) {
      return res.status(403).json({ error: 'No tienes permisos para buscar usuarios' })
    }

    const { busqueda, rol, estado } = req.query

    const usuarios = await prisma.usuario.findMany({
      where: {
        ...(busqueda && {
          OR: [
            { nombres:   { contains: busqueda } },
            { apellidos: { contains: busqueda } },
            { correo:    { contains: busqueda } },
            { telefono:  { contains: busqueda } },
            { ci_carnet: { contains: busqueda } },
          ],
        }),
        ...(rol    && { rol: { nombre_rol: rol } }),
        ...(estado && { estado_cuenta: estado }),
      },
      include: { rol: { select: { nombre_rol: true } } },
      orderBy: { id_usuario: 'desc' },
      // El Administrador ve el catálogo COMPLETO (paginación y métricas correctas en el front);
      // Mesero/Bartender solo un tope para el buscador del POS.
      ...(rolUsuario === 'Administrador' ? {} : { take: 20 })
    })

    // El Administrador ve datos completos (sin hashes); Mesero/Bartender solo lo mínimo
    // para identificar a un cliente en el POS (evita filtrar PII de todos los usuarios).
    const esAdmin = rolUsuario === 'Administrador'
    const resultado = usuarios.map((u) => {
      const base = {
        id_usuario: u.id_usuario,
        nombres:    u.nombres,
        apellidos:  u.apellidos,
        telefono:   u.telefono,
        ci_carnet:  u.ci_carnet,
        rol:        u.rol.nombre_rol,
      }
      if (!esAdmin) return base
      return {
        ...base,
        id_rol:          u.id_rol,
        correo:          u.correo,
        estado_cuenta:   u.estado_cuenta,
        url_foto_perfil: u.url_foto_perfil,
      }
    })

    res.json(resultado)
  } catch (error) {
    console.error('Error al listar usuarios:', error)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// ---- POST /api/usuarios/cliente-rapido (Mesero) ----
router.post('/cliente-rapido', async (req, res) => {
  try {
    const rolUsuario = req.usuario.rol
    if (!['Administrador', 'Mesero', 'Bartender'].includes(rolUsuario)) {
      return res.status(403).json({ error: 'Sin permisos' })
    }

    const { nombres, apellidos, ci_carnet, telefono, es_vip } = req.body
    if (!nombres) return res.status(400).json({ error: 'El nombre o razón social es obligatorio' })

    // Si tienen CI/NIT, verificar si ya existe ese cliente
    if (ci_carnet && ci_carnet.trim() !== '') {
      const existente = await prisma.usuario.findFirst({
        where: { ci_carnet: ci_carnet.trim() },
        include: { rol: { select: { nombre_rol: true } } }
      })
      if (existente) {
        const { password_hash: _, ...datos } = existente
        return res.json({
          mensaje: 'Cliente ya registrado — seleccionado automaticamente',
          usuario: { ...datos, rol: existente.rol.nombre_rol },
          yaExistia: true
        })
      }
    }

    // Buscar el rol Cliente
    const rolCliente = await prisma.rol.findFirst({ where: { nombre_rol: 'Cliente' } })
    if (!rolCliente) return res.status(500).json({ error: 'Rol Cliente no existe en BD' })

    const random = Math.floor(Math.random() * 10000)
    const correoFalso = `cliente_${Date.now()}_${random}@euphoria.local`
    const passwordHash = await bcrypt.hash('123456', 10)

    const nuevo = await prisma.usuario.create({
      data: {
        nombres: String(nombres).trim(),
        apellidos: (apellidos || '').trim(),
        ci_carnet: ci_carnet?.trim() || null,
        telefono: telefono?.trim() || null,
        correo: correoFalso,
        password_hash: passwordHash,
        estado_cuenta: 'activo',
        es_vip: !!es_vip,
        id_rol: rolCliente.id_rol
      }
    })

    const { password_hash: _, ...datos } = nuevo
    res.status(201).json({ mensaje: 'Cliente creado rapidamente', usuario: { ...datos, rol: 'Cliente' }, yaExistia: false })
  } catch (error) {
    console.error('Error crear rapido:', error)
    res.status(500).json({ error: 'Error al crear cliente rapido' })
  }
})

// El resto sí es solo para Administrador
router.use(soloRoles('Administrador'))

// ---- GET /api/usuarios/recurrentes — ranking de clientes por consumo (fidelización) ----
router.get('/recurrentes', async (req, res) => {
  try {
    const filas = await prisma.$queryRawUnsafe(`
      SELECT u.id_usuario, u.nombres, u.apellidos, u.es_vip, u.premio_perfil,
             COUNT(DISTINCT c.id_comanda) AS visitas,
             COALESCE(SUM(d.subtotal), 0) AS consumo
      FROM usuario u
      JOIN comanda c ON c.id_cliente = u.id_usuario AND c.estado_despacho <> 'Cancelada'
      JOIN detalle_comanda d ON d.id_comanda = c.id_comanda
      JOIN rol r ON r.id_rol = u.id_rol AND r.nombre_rol = 'Cliente'
      GROUP BY u.id_usuario, u.nombres, u.apellidos, u.es_vip, u.premio_perfil
      ORDER BY consumo DESC
      LIMIT 20
    `)
    // Producto más consumido por cada cliente del ranking
    const salida = []
    for (const f of filas) {
      const top = await prisma.$queryRawUnsafe(`
        SELECT p.nombre_producto AS nombre, SUM(d.cantidad) AS veces
        FROM detalle_comanda d
        JOIN comanda c ON c.id_comanda = d.id_comanda AND c.id_cliente = ${Number(f.id_usuario)} AND c.estado_despacho <> 'Cancelada'
        JOIN producto p ON p.id_producto = d.id_producto
        GROUP BY p.id_producto, p.nombre_producto ORDER BY veces DESC LIMIT 1
      `)
      // Describe el premio activo (pendiente perfil / desc:N / prod:ID)
      const pp = f.premio_perfil
      let premio_desc = null
      if (pp === 'pendiente') premio_desc = 'Premio de perfil'
      else if (pp && pp.startsWith('desc:')) premio_desc = `${pp.slice(5)}% de descuento`
      else if (pp && pp.startsWith('prod:')) {
        const prod = await prisma.producto.findUnique({ where: { id_producto: Number(pp.slice(5)) }, select: { nombre_producto: true } })
        premio_desc = `Cortesía: ${prod?.nombre_producto || 'producto'}`
      }
      salida.push({
        id_usuario: Number(f.id_usuario),
        nombre: `${f.nombres} ${f.apellidos || ''}`.trim(),
        es_vip: !!f.es_vip,
        premio_activo: !!(pp && pp !== 'usado'),
        premio_desc,
        visitas: Number(f.visitas),
        consumo: Number(f.consumo),
        top_producto: top[0]?.nombre || null,
      })
    }
    res.json(salida)
  } catch (error) {
    console.error('Error en recurrentes:', error)
    res.status(500).json({ error: 'Error al obtener clientes recurrentes' })
  }
})

// ---- PATCH /api/usuarios/:id/vip — marca/desmarca cliente VIP ----
router.patch('/:id/vip', async (req, res) => {
  try {
    const u = await prisma.usuario.update({
      where: { id_usuario: Number(req.params.id) },
      data: { es_vip: !!req.body.es_vip },
      select: { id_usuario: true, es_vip: true },
    })
    res.json({ ok: true, es_vip: u.es_vip })
  } catch (e) { res.status(500).json({ error: 'No se pudo actualizar el VIP' }) }
})

// ---- POST /api/usuarios/:id/premio — otorga un premio de fidelización flexible ----
// Body: { tipo: 'descuento'|'producto', valor_pct?, id_producto? }
//  - descuento: guarda 'desc:N' (N% hasta 50), se aplica en el próximo pago con billetera
//  - producto:  guarda 'prod:ID', cortesía de ese producto (vale visible)
router.post('/:id/premio', async (req, res) => {
  try {
    const { tipo, valor_pct, id_producto } = req.body
    let premio
    let notif
    if (tipo === 'producto') {
      const pid = Number(id_producto)
      if (!pid) return res.status(400).json({ error: 'Elige un producto de cortesía.' })
      const prod = await prisma.producto.findUnique({ where: { id_producto: pid } })
      if (!prod) return res.status(404).json({ error: 'Producto no encontrado.' })
      premio = `prod:${pid}`
      notif = {
        tipo: 'premio',
        titulo: 'Tienes una cortesía',
        mensaje: `El local te regaló: ${prod.nombre_producto}. Se te entregará al atenderte en tu próximo evento.`,
        url: '/cliente/perfil',
      }
    } else {
      const pct = Math.min(Math.max(parseInt(valor_pct) || 0, 1), 50)
      premio = `desc:${pct}`
      notif = {
        tipo: 'premio',
        titulo: 'Tienes un premio',
        mensaje: `El local te regaló un ${pct}% de descuento para tu próximo pedido.`,
        url: '/cliente/perfil',
      }
    }
    const u = await prisma.usuario.update({
      where: { id_usuario: Number(req.params.id) },
      data: { premio_perfil: premio },
      select: { id_usuario: true, premio_perfil: true },
    })
    await notificar(u.id_usuario, notif)
    res.json({ ok: true, premio: u.premio_perfil })
  } catch (e) { res.status(500).json({ error: 'No se pudo otorgar el premio' }) }
})

// ---- GET /api/usuarios/:id — Obtener uno ----
router.get('/:id', async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: Number(req.params.id) },
      include: { rol: true },
    })
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    const { password_hash, ...datos } = usuario
    res.json({ ...datos, rol: datos.rol.nombre_rol })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
})

// ---- POST /api/usuarios — Crear ----
router.post('/', async (req, res) => {
  try {
    const validacion = esquemaCrearUsuario.safeParse(req.body)
    if (!validacion.success) {
      return res.status(400).json({ error: validacion.error.errors[0].message })
    }
    const { nombres, apellidos, telefono, ci_carnet, correo, password, id_rol } = validacion.data

    // Verificar correo único
    const existe = await prisma.usuario.findUnique({ where: { correo } })
    if (existe) return res.status(409).json({ error: 'El correo ya está registrado' })

    const password_hash = await bcrypt.hash(password, 12)

    const nuevo = await prisma.usuario.create({
      data: {
        nombres, apellidos, telefono, ci_carnet, correo,
        password_hash,
        estado_cuenta: 'activo',
        id_rol: Number(id_rol),
      },
      include: { rol: true },
    })

    const { password_hash: _, ...datos } = nuevo
    emitirRecurso('usuarios', { id: datos.id_usuario })
    res.status(201).json({ mensaje: 'Usuario creado correctamente', usuario: { ...datos, rol: datos.rol.nombre_rol } })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    res.status(500).json({ error: 'Error al crear usuario' })
  }
})

// ---- PUT /api/usuarios/:id — Editar ----
router.put('/:id', async (req, res) => {
  try {
    const validacion = esquemaEditarUsuario.safeParse(req.body)
    if (!validacion.success) {
      return res.status(400).json({ error: validacion.error.errors[0].message })
    }
    const { nombres, apellidos, telefono, ci_carnet, correo, id_rol } = validacion.data
    const id = Number(req.params.id)

    const actualizado = await prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        ...(nombres   && { nombres }),
        ...(apellidos && { apellidos }),
        // Permite vaciar teléfono/CI (enviar '' los borra); solo se ignora si no se envía el campo
        ...(telefono  !== undefined && { telefono }),
        ...(ci_carnet !== undefined && { ci_carnet }),
        ...(correo    && { correo }),
        ...(id_rol    && { id_rol: Number(id_rol) }),
      },
      include: { rol: true },
    })

    const { password_hash, ...datos } = actualizado
    emitirRecurso('usuarios', { id: datos.id_usuario })
    res.json({ mensaje: 'Usuario actualizado', usuario: { ...datos, rol: datos.rol.nombre_rol } })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' })
    if (error.code === 'P2002') return res.status(409).json({ error: 'El correo ya está registrado por otro usuario' })
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

// ---- PATCH /api/usuarios/:id/estado — Activar/Desactivar ----
router.patch('/:id/estado', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const validacion = esquemaEstado.safeParse(req.body)
    if (!validacion.success) {
      return res.status(400).json({ error: validacion.error.errors[0].message })
    }
    const { estado_cuenta } = validacion.data

    // Un administrador no puede desactivar su propia cuenta (evita auto-bloqueo)
    if (id === req.usuario.id && estado_cuenta === 'inactivo') {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' })
    }

    await prisma.usuario.update({
      where: { id_usuario: id },
      data:  { estado_cuenta },
    })

    emitirRecurso('usuarios', { id: Number(req.params.id) })
    res.json({ mensaje: `Usuario ${estado_cuenta} correctamente` })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' })
    res.status(500).json({ error: 'Error al cambiar estado' })
  }
})

// ---- PATCH /api/usuarios/:id/reset-password — Resetear Contraseña (Admin) ----
router.patch('/:id/reset-password', async (req, res) => {
  try {
    const id = Number(req.params.id)
    
    // Contraseña por defecto
    const passwordPorDefecto = '123456'
    const password_hash = await bcrypt.hash(passwordPorDefecto, 12)

    await prisma.usuario.update({
      where: { id_usuario: id },
      data: { password_hash }
    })

    res.json({ mensaje: 'Contraseña reseteada exitosamente a: 123456' })
  } catch (error) {
    console.error('Error al resetear contraseña:', error)
    if (error.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' })
    res.status(500).json({ error: 'Error interno al resetear la contraseña' })
  }
})

module.exports = router
