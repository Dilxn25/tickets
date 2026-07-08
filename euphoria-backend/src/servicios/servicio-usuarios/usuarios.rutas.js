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
  }
}

// Premio por perfil completo (solo clientes): al llenar los 6 datos se otorga
// UNA VEZ un 10% de descuento (tope Bs 30) para su siguiente pedido con
// billetera. El descuento real lo aplica el backend de comandas al cobrar.
function perfilEstaCompleto(u) {
  return !!(u.nombres && u.apellidos && u.ci_carnet && u.telefono && u.url_foto_perfil && u.pregunta_seguridad)
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
      return {
        ...s,
        cuenta: cuenta ? {
          id_usuario: cuenta.id_usuario,
          nombre: `${cuenta.nombres} ${cuenta.apellidos}`.trim(),
          ci_coincide: !!(cuenta.ci_carnet && s.ci_contacto && limpiar(cuenta.ci_carnet) === limpiar(s.ci_contacto)),
          telefono_coincide: !!(cuenta.telefono && s.telefono && limpiar(cuenta.telefono) === limpiar(s.telefono)),
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
    await prisma.solicitud_recuperacion.update({
      where: { id_solicitud: id },
      data: { estado: 'atendida', fecha_atencion: new Date() },
    })
    res.json({ mensaje: 'Solicitud marcada como atendida' })
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

    res.json({
      mensaje: 'Contraseña restablecida. Avisa al cliente su nueva clave temporal.',
      password_temporal: passwordTemporal,
      contacto: {
        nombre: `${cuenta.nombres} ${cuenta.apellidos}`.trim(),
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
    res.json({ mensaje: 'Pregunta de seguridad actualizada', usuario: usuarioParaFront(actualizado), premio_otorgado: premioOtorgado })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al guardar la pregunta de seguridad' })
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

    const { nombres, apellidos, ci_carnet, telefono } = req.body
    if (!nombres) return res.status(400).json({ error: 'Razon Social es obligatoria' })

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
        nombres,
        apellidos: apellidos || '',
        ci_carnet: ci_carnet?.trim() || '',
        telefono: telefono || '',
        correo: correoFalso,
        password_hash: passwordHash,
        estado_cuenta: 'activo',
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
