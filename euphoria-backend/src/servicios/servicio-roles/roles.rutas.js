// ============================================
// EUPHORIA — Servicio de Roles
// Rutas para gestionar roles (CRUD)
// ============================================
const express = require('express')
const router  = express.Router()
const prisma  = require('../../config/base-de-datos')

// Listar todos los roles
router.get('/', async (req, res) => {
  try {
    const roles = await prisma.rol.findMany()
    res.json(roles)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al listar roles' })
  }
})

// Roles base del sistema: no se pueden eliminar (romperían la seguridad/accesos)
const ROLES_PROTEGIDOS = ['Administrador', 'Cajero', 'Mesero', 'Recepcionista', 'Bartender', 'Cliente']

// Crear un rol
router.post('/', async (req, res) => {
  try {
    const nombre = (req.body.nombre_rol || '').trim()
    if (!nombre) return res.status(400).json({ error: 'El nombre del rol es requerido' })
    // Sin duplicados (ignorando mayúsculas/espacios)
    const existe = await prisma.rol.findFirst({ where: { nombre_rol: nombre } })
    if (existe) return res.status(409).json({ error: 'Ya existe un rol con ese nombre' })
    const nuevoRol = await prisma.rol.create({ data: { nombre_rol: nombre } })
    res.status(201).json(nuevoRol)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear rol' })
  }
})

// Editar un rol
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { nombre_rol } = req.body
    const rolActualizado = await prisma.rol.update({
      where: { id_rol: id },
      data: { nombre_rol }
    })
    res.json(rolActualizado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar rol' })
  }
})

// Eliminar un rol
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    // No permitir eliminar los roles base del sistema (dejaría accesos rotos)
    const rol = await prisma.rol.findUnique({ where: { id_rol: id } })
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' })
    if (ROLES_PROTEGIDOS.includes(rol.nombre_rol)) {
      return res.status(409).json({ error: `El rol "${rol.nombre_rol}" es del sistema y no se puede eliminar.` })
    }

    // Verificar si hay usuarios con este rol
    const usuariosConRol = await prisma.usuario.count({ where: { id_rol: id } })
    
    if (usuariosConRol > 0) {
      // Reasignar usuarios a un rol "Otro" o un rol predeterminado antes de eliminar
      let rolOtro = await prisma.rol.findFirst({ where: { nombre_rol: 'Otro' } })
      if (!rolOtro) {
        rolOtro = await prisma.rol.create({ data: { nombre_rol: 'Otro' } })
      }
      await prisma.usuario.updateMany({
        where: { id_rol: id },
        data: { id_rol: rolOtro.id_rol }
      })
    }

    await prisma.rol.delete({ where: { id_rol: id } })
    res.json({ mensaje: 'Rol eliminado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar rol' })
  }
})

module.exports = router
