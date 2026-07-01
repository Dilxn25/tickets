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
        ...(telefono  && { telefono }),
        ...(ci_carnet && { ci_carnet }),
        ...(req.file  && { url_foto_perfil: req.file.path })
      },
      include: { rol: true }
    })
    
    const { password_hash, ...datos } = actualizado
    res.json({ mensaje: 'Perfil actualizado', usuario: { ...datos, rol: datos.rol.nombre_rol } })
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})

router.put('/perfil/password', verificarToken, async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body
    const id = req.usuario.id

    const user = await prisma.usuario.findUnique({ where: { id_usuario: id } })
    const esValido = await bcrypt.compare(passwordActual, user.password_hash)
    if (!esValido) return res.status(401).json({ error: 'La contraseña actual es incorrecta' })

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

    const { password_hash, respuesta_seguridad, ...datos } = actualizado
    res.json({ mensaje: 'Pregunta de seguridad actualizada', usuario: { ...datos, rol: datos.rol.nombre_rol } })
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
      // El Administrador ve el catálogo completo; Mesero/Bartender solo un tope para el POS
      take: rolUsuario === 'Administrador' ? 200 : 20
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
