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

const app    = express()
const PUERTO = process.env.PUERTO || 3000

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

app.use(helmet())
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

// ---- 404 y Error global ----
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

io.on('connection', socket => {
  console.log(`WebSocket conectado: ${socket.id}`)
  socket.on('disconnect', () => console.log(`WebSocket desconectado: ${socket.id}`))
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
