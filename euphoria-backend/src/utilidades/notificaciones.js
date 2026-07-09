// Helper para crear notificaciones persistentes y avisar en tiempo real.
const prisma = require('../config/base-de-datos')

async function notificar(id_usuario, { tipo = 'info', titulo, mensaje, url = null }) {
  if (!id_usuario || !titulo) return null
  try {
    const n = await prisma.notificacion.create({
      data: {
        id_usuario: Number(id_usuario),
        tipo,
        titulo: String(titulo).slice(0, 120),
        mensaje: String(mensaje || '').slice(0, 255),
        url,
      },
    })
    if (global.io) global.io.emit('notificacion', { id_usuario: Number(id_usuario), id_notificacion: n.id_notificacion })
    return n
  } catch (e) {
    console.error('Error creando notificación:', e.message)
    return null
  }
}

module.exports = { notificar }
