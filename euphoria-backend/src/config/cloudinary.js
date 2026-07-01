// ============================================
// EUPHORIA — Configuración de Cloudinary
// ============================================
const cloudinary  = require('cloudinary').v2
const multer      = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NOMBRE_NUBE,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ---- Storage para productos ----
const storageProductos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'euphoria/productos',
    allowed_formats:['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
})

// ---- Storage para eventos ----
const storageEventos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'euphoria/eventos',
    allowed_formats:['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'limit', quality: 'auto' }],
  },
})

// ---- Storage para fotos de perfil ----
const storagePerfil = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'euphoria/perfiles',
    allowed_formats:['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
})

// Límite 5MB
const limites = { fileSize: 5 * 1024 * 1024 }

const subirImagenProducto = multer({ storage: storageProductos, limits: limites })
const subirImagenEvento   = multer({ storage: storageEventos,   limits: limites })
const subirFotoPerfil     = multer({ storage: storagePerfil,    limits: limites })

// Eliminar imagen de Cloudinary por URL
async function eliminarImagen(url) {
  try {
    // Extraer public_id de la URL de Cloudinary
    const partes = url.split('/')
    const archivo = partes.pop().split('.')[0]
    const carpeta = partes.slice(partes.indexOf('euphoria')).join('/')
    const publicId = `${carpeta}/${archivo}`
    await cloudinary.uploader.destroy(publicId)
  } catch (err) {
    console.error('Error al eliminar imagen de Cloudinary:', err)
  }
}

module.exports = { cloudinary, subirImagenProducto, subirImagenEvento, subirFotoPerfil, eliminarImagen }
