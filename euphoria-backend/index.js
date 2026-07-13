// ============================================
// EUPHORIA — Punto de entrada del Backend
// Puerto: 3000
// ============================================
require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const http    = require('http')
const { Server } = require('socket.io')

const path   = require('path')
const fs     = require('fs')
const app    = express()
// Render (y otros hosts) inyectan el puerto en process.env.PORT.
const PUERTO = process.env.PORT || process.env.PUERTO || 3000

// Render pone la app detrás de su proxy (X-Forwarded-For). Sin esto,
// express-rate-limit LANZA ValidationError en cada login (error 500 para
// todos) y además vería a todos los usuarios con la IP del proxy, o sea que
// 10 intentos ENTRE TODOS bloqueaban el login del local entero.
app.set('trust proxy', 1)

// ---- Seguridad y CORS ----
// En produccion se restringe a los origenes de ORIGEN_FRONTEND (lista separada por comas).
// En desarrollo se permite cualquier origen para poder probar desde el celular en la red local.
const esProduccion = process.env.ENTORNO === 'produccion'
const origenesPermitidos = (process.env.ORIGEN_FRONTEND || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)
const opcionesCors = {
  origin: esProduccion ? origenesPermitidos : true,
  credentials: true,
}

// CSP desactivado: servimos el frontend (SPA) desde este mismo servicio y una
// CSP estricta bloquearía sus assets/estilos inline.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }))
app.use(cors(opcionesCors))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ---- Health check ----
app.get('/api/estado', (req, res) => {
  res.json({ estado: 'activo', servicio: 'EUPHORIA Backend', version: '1.0.0', hora: new Date().toISOString() })
})

// ---- Middlewares de seguridad ----
const { verificarToken, soloRoles } = require('./src/middlewares/autenticacion')

// ---- Rutas de Servicios ----
const rutasAuth      = require('./src/servicios/servicio-autenticacion/autenticacion.rutas')
const rutasUsuarios  = require('./src/servicios/servicio-usuarios/usuarios.rutas')
const rutasProductos = require('./src/servicios/servicio-productos/productos.rutas')
const rutasRoles     = require('./src/servicios/servicio-roles/roles.rutas')

const rutasEventos   = require('./src/servicios/servicio-eventos/eventos.rutas')
const rutasMesas     = require('./src/servicios/servicio-eventos/mesas.rutas')
const rutasComandas  = require('./src/servicios/servicio-comandas/comandas.rutas')
const rutasBilletera = require('./src/servicios/servicio-billetera/billetera.rutas')
const rutasCajero    = require('./src/servicios/servicio-cajero/cajero.rutas')
const rutasRecomendaciones = require('./src/servicios/servicio-recomendaciones/recomendaciones.rutas')
const rutasEspacios  = require('./src/servicios/servicio-espacios/espacios.rutas')
const rutasReservas  = require('./src/servicios/servicio-espacios/reservas.rutas')
const rutasAforo     = require('./src/servicios/servicio-espacios/aforo.rutas')
const rutasNotificaciones = require('./src/servicios/servicio-notificaciones/notificaciones.rutas')

// 4. Registro de rutas activas
app.use('/api/auth',       rutasAuth)
app.use('/api/usuarios',   rutasUsuarios)
app.use('/api/productos',  rutasProductos)
app.use('/api/roles',      verificarToken, soloRoles('Administrador'), rutasRoles)
app.use('/api/eventos',    rutasEventos)
app.use('/api/mesas',      rutasMesas)
app.use('/api/comandas',   rutasComandas)
app.use('/api/billetera',  rutasBilletera)
app.use('/api/cajero',     rutasCajero)
app.use('/api/recomendaciones', rutasRecomendaciones)
app.use('/api/espacios',   rutasEspacios)
app.use('/api/reservas',   rutasReservas)
app.use('/api/aforo',      rutasAforo)
app.use('/api/notificaciones', rutasNotificaciones)

// ---- Servir el FRONTEND compilado (un solo servicio en producción) ----
// Si existe euphoria-frontend/dist, se sirve como estático y cualquier ruta
// que NO sea /api devuelve index.html (para que funcione el router de Vue).
// El build copia el frontend a ./dist-frontend; en local se usa la carpeta hermana.
const distLocal = path.join(__dirname, 'dist-frontend')
const distHermana = path.join(__dirname, '..', 'euphoria-frontend', 'dist')
const distFrontend = fs.existsSync(distLocal) ? distLocal : distHermana
if (fs.existsSync(distFrontend)) {
  app.use(express.static(distFrontend))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      // index.html NO se cachea: así cada recarga toma SIEMPRE la última versión
      // desplegada (los assets con hash sí se cachean, son inmutables). Sin esto
      // el navegador podía seguir sirviendo la app vieja tras un nuevo deploy.
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      return res.sendFile(path.join(distFrontend, 'index.html'))
    }
    next()
  })
  console.log('Frontend compilado servido desde /euphoria-frontend/dist')
}

// ---- 404 y Error global (solo aplica a /api que no exista) ----
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))
app.use((err, req, res, next) => {
  // Se registra el detalle completo en el servidor, pero NO se filtra al cliente.
  console.error('Error:', err.message)
  res.status(500).json({ error: 'Error interno del servidor' })
})

// ---- HTTP + Socket.io ----
const servidorHttp = http.createServer(app)
const io = new Server(servidorHttp, {
  cors: { origin: esProduccion ? origenesPermitidos : true, credentials: true }
})
global.io = io

// Interesados EN VIVO por evento: cuántos clientes tienen abierto el mapa de
// reserva ahora mismo (señal de demanda para recepción). Solo memoria.
const interesadosMapa = new Map() // id_evento -> Set<socketId>
function emitirInteresados(idEvento) {
  const set = interesadosMapa.get(idEvento)
  io.to(`mapa_${idEvento}`).emit('interesados_evento', { id_evento: idEvento, total: set ? set.size : 0 })
}
function quitarInteresado(socket) {
  const idEv = socket.data.id_evento
  if (idEv == null) return
  const set = interesadosMapa.get(idEv)
  if (set && set.delete(socket.id)) emitirInteresados(idEv)
}

io.on('connection', socket => {
  console.log(`WebSocket conectado: ${socket.id}`)

  // ---- Presencia en el mapa de reservas (quién está viendo qué lugar) ----
  // El cliente entra a la "sala" del evento para recibir/emitir presencia en vivo.
  // observador:true = personal del local (recepción): escucha pero NO cuenta
  // como interesado.
  socket.on('entrar_mapa', ({ id_evento, observador } = {}) => {
    if (id_evento == null) return
    quitarInteresado(socket) // por si cambió de evento
    socket.data.sala = `mapa_${id_evento}`
    socket.data.id_evento = observador ? null : id_evento
    socket.join(socket.data.sala)
    if (!observador) {
      if (!interesadosMapa.has(id_evento)) interesadosMapa.set(id_evento, new Set())
      interesadosMapa.get(id_evento).add(socket.id)
    }
    emitirInteresados(id_evento)
  })
  // Está MIRANDO una mesa (aún no reserva): se avisa a los demás de la sala.
  socket.on('viendo_mesa', ({ id_zona, id_mesa, nombre } = {}) => {
    if (!socket.data.sala || id_mesa == null) return
    // Si estaba viendo otra, liberarla primero.
    if (socket.data.viendo && socket.data.viendo.id_mesa !== id_mesa) {
      socket.to(socket.data.sala).emit('dejar_mesa', { ...socket.data.viendo, socketId: socket.id })
    }
    socket.data.viendo = { id_zona, id_mesa }
    socket.to(socket.data.sala).emit('viendo_mesa', { id_zona, id_mesa, nombre: nombre || 'Alguien', socketId: socket.id })
  })
  // Dejó de mirar (cerró el panel o cambió de lugar).
  socket.on('dejar_mesa', ({ id_zona, id_mesa } = {}) => {
    if (!socket.data.sala) return
    socket.data.viendo = null
    socket.to(socket.data.sala).emit('dejar_mesa', { id_zona, id_mesa, socketId: socket.id })
  })

  socket.on('disconnect', () => {
    // Al desconectarse, liberar el lugar que estaba viendo.
    if (socket.data.sala && socket.data.viendo) {
      socket.to(socket.data.sala).emit('dejar_mesa', { ...socket.data.viendo, socketId: socket.id })
    }
    quitarInteresado(socket)
    console.log(`WebSocket desconectado: ${socket.id}`)
  })
})

servidorHttp.listen(PUERTO, () => {
  console.log('\n EUPHORIA Backend corriendo')
  console.log(`   API:     http://localhost:${PUERTO}/api/estado`)
  console.log(`   Ambiente: ${process.env.ENTORNO || 'desarrollo'}\n`)
  console.log(' Servicios activos:')
  console.log('   POST /api/auth/login')
  console.log('   GET  /api/usuarios')
  console.log('   GET  /api/productos\n')
})

// ---- Cierre Elegante (Graceful Shutdown) para evitar EADDRINUSE ----
function cerrarServidor(senial) {
  servidorHttp.close(() => {
    console.log(`Servidor HTTP cerrado por señal ${senial}`)
    process.exit(0)
  })
}

process.once('SIGUSR2', () => {
  servidorHttp.close(() => {
    process.kill(process.pid, 'SIGUSR2')
  })
})
process.on('SIGINT', () => cerrarServidor('SIGINT'))
process.on('SIGTERM', () => cerrarServidor('SIGTERM'))
