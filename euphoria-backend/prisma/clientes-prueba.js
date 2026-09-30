// ============================================
// EUPHORIA — 10 clientes de prueba con 200 pedidos cada uno
// ============================================
// Cada cliente tiene un gusto distinto (cervezas, cócteles, ron, singani...) y una
// forma distinta de pedir: solo, con un amigo o con todo su grupo. Sirve para
// demostrar que el algoritmo reconoce a cada cliente y le sugiere lo suyo.
//
// Uso (desde euphoria-backend):
//   node prisma/clientes-prueba.js            crea lo que falte (no duplica)
//   node prisma/clientes-prueba.js --resumen  solo muestra el perfil de cada cliente
//   node prisma/clientes-prueba.js --probar   revisa la base destino sin escribir nada
//   node prisma/clientes-prueba.js --borrar   quita a los 10 clientes y sus pedidos
// La base es la de URL_BASE_DATOS (por defecto la del .env del backend). En
// producción se corre desde GitHub Actions (flujo "Clientes de prueba"), que toma la
// conexión del secreto del repositorio y respalda la base antes de escribir.
//
// Tablas que toca: usuario (10 filas), comanda (2000) y detalle_comanda (~5000).
// Todo lo identifica el correo @prueba.euphoria.bo.

const path = require('path')
const BACK = path.resolve(__dirname, '..')
require(path.join(BACK, 'node_modules/dotenv')).config({ path: path.join(BACK, '.env') })
const { PrismaClient } = require(path.join(BACK, 'node_modules/@prisma/client'))
const bcrypt = require(path.join(BACK, 'node_modules/bcryptjs'))

const prisma = new PrismaClient()
const DOMINIO = '@prueba.euphoria.bo'
const PEDIDOS = 200
const CLAVE = 'demo1234'

// ---- Azar reproducible (misma semilla = mismos datos en local y en producción) ----
let semilla = 20260928
function azar() {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296
  return semilla / 4294967296
}
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1))
function elegirPeso(pesos) {
  const total = Object.values(pesos).reduce((s, v) => s + v, 0)
  let r = azar() * total
  for (const [k, v] of Object.entries(pesos)) { r -= v; if (r <= 0) return Number(k) }
  return Number(Object.keys(pesos).pop())
}
const mezclar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// ---- Gustos (id_producto: peso). Los id son los del catálogo del sistema ----
const G = {
  // Solo productos que existen en local y en producción (Stella Artois y Elixir no están en prod)
  cerveza:    { 76: 30, 4: 22, 1: 16, 6: 10, 5: 8, 3: 6, 13: 3 },
  coctel:     { 9: 28, 70: 20, 71: 16, 69: 10, 66: 8, 67: 6, 72: 5 },
  ron:        { 11: 34, 12: 20, 39: 8 },
  ronMezcla:  { 55: 14, 82: 8 },
  singani:    { 41: 26, 40: 10, 64: 18 },
  singMezcla: { 58: 12, 57: 6 },
  whisky:     { 10: 30, 35: 16, 34: 10 },
  whiskyAgua: { 74: 12, 82: 10 },
  vodka:      { 15: 28, 37: 10, 68: 8 },
  energia:    { 2: 14, 60: 8 },
  gin:        { 43: 24, 42: 14, 67: 18 },
  tonica:     { 59: 14 },
  tequila:    { 51: 18, 52: 10, 69: 10 },
  shots:      { 47: 9, 48: 8, 49: 6, 50: 5 },
  sinAlcohol: { 55: 22, 73: 18, 2: 14, 74: 10, 83: 8, 57: 8 },
  snack:      { 14: 12 },
  pucho:      { 79: 6, 80: 4 },
  amigaCoctel:{ 9: 10, 71: 8 },
  amigoBirra: { 5: 12, 76: 9 },
  espumante:  { 53: 5, 54: 4 },
  jager:      { 50: 10, 49: 6 },
  agua:       { 73: 3 },
}
const unir = (...ps) => ps.reduce((acc, p) => { for (const [k, v] of Object.entries(p)) acc[k] = (acc[k] || 0) + v; return acc }, {})

// modo: 'solo' (siempre su gusto), 'amigo' (a veces lo acompaña alguien con otro
// gusto), 'grupo' (cada noche llega un grupo distinto y cada ronda la pide alguien)
const CLIENTES = [
  { nombres: 'Diego', apellidos: 'Mamani Quispe', usuario: 'diego.cervezas', modo: 'solo', rondas: [2, 3], gusto: unir(G.cerveza, { 14: 2 }) },
  { nombres: 'Valeria', apellidos: 'Rojas Salazar', usuario: 'valeria.cocteles', modo: 'solo', rondas: [2, 3], gusto: unir(G.coctel, G.agua) },
  { nombres: 'Jorge', apellidos: 'Quispe Huanca', usuario: 'jorge.ron', modo: 'amigo', rondas: [3, 4], gusto: unir(G.ron, G.ronMezcla), amigo: G.amigoBirra },
  { nombres: 'Andrea', apellidos: 'Flores Camacho', usuario: 'andrea.singani', modo: 'amigo', rondas: [3, 4], gusto: unir(G.singani, G.singMezcla), amigo: G.amigaCoctel },
  { nombres: 'Ricardo', apellidos: 'Vargas Pinto', usuario: 'ricardo.whisky', modo: 'solo', rondas: [2, 3], gusto: unir(G.whisky, G.whiskyAgua, G.pucho) },
  { nombres: 'Camila', apellidos: 'Gutierrez Ayala', usuario: 'camila.vodka', modo: 'amigo', rondas: [3, 4], gusto: unir(G.vodka, G.energia), amigo: G.jager },
  { nombres: 'Fernando', apellidos: 'Choque Mendez', usuario: 'fernando.gin', modo: 'amigo', rondas: [3, 4], gusto: unir(G.gin, G.tonica), amigo: G.espumante },
  { nombres: 'Paola', apellidos: 'Mendoza Rivera', usuario: 'paola.tequila', modo: 'grupo', rondas: [4, 6], gusto: G.tequila,
    amigos: [G.shots, G.amigoBirra, G.pucho, G.snack, G.jager] },
  { nombres: 'Luis', apellidos: 'Fernandez Torrez', usuario: 'luis.grupo', modo: 'grupo', rondas: [4, 6], gusto: null,
    amigos: [G.cerveza, G.amigoBirra, unir(G.ron, G.ronMezcla), unir(G.singani, G.singMezcla), unir(G.whisky, G.whiskyAgua), unir(G.vodka, G.energia), G.coctel] },
  { nombres: 'Sofia', apellidos: 'Castro Aguilar', usuario: 'sofia.sinalcohol', modo: 'solo', rondas: [2, 3], gusto: unir(G.sinAlcohol, G.snack) },
]

// Una canasta = 3, 4 o 5 productos (unidades). Si sale dos veces lo mismo se junta en
// una línea con cantidad 2, como lo anota el mesero.
function canasta(pesos) {
  const n = elegirPeso({ 3: 40, 4: 35, 5: 25 })
  const lineas = new Map()
  for (let i = 0; i < n; i++) {
    const pid = elegirPeso(pesos)
    lineas.set(pid, (lineas.get(pid) || 0) + 1)
  }
  return [...lineas.entries()]
}

// Pedidos de una noche según cómo pide el cliente
function pesosDeLaRonda(c, grupoDeHoy, conAmigo) {
  if (c.modo === 'solo') return c.gusto
  if (c.modo === 'amigo') return conAmigo ? unir(c.gusto, c.amigo) : c.gusto
  // grupo: la mitad de las rondas las pide él (si tiene gusto propio) y el resto
  // alguno de los que vinieron esa noche
  if (c.gusto && azar() < 0.5) return c.gusto
  return grupoDeHoy[Math.floor(azar() * grupoDeHoy.length)]
}

// Noches de viernes y sábado (a veces jueves) del último año, en hora de Bolivia
function noches() {
  const lista = []
  const d = new Date(Date.UTC(2025, 9, 2))
  const fin = new Date(Date.UTC(2026, 8, 26))
  for (; d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    const dia = d.getUTCDay()
    if (dia === 5 || dia === 6 || (dia === 4 && azar() < 0.3)) lista.push(new Date(d))
  }
  return lista
}

function planificar(c) {
  const pedidos = []
  const disponibles = mezclar(noches())
  let i = 0
  while (pedidos.length < PEDIDOS) {
    const noche = disponibles[i++ % disponibles.length]
    const rondas = Math.min(entre(c.rondas[0], c.rondas[1]), PEDIDOS - pedidos.length)
    const conAmigo = azar() < 0.65
    const grupoDeHoy = c.amigos ? mezclar([...c.amigos]).slice(0, entre(2, c.amigos.length)) : []
    // llegada entre las 22:00 y las 00:30; cada ronda 25 a 70 minutos después
    let minuto = 22 * 60 + entre(0, 150)
    for (let r = 0; r < rondas; r++) {
      const f = new Date(noche.getTime() + minuto * 60000)
      pedidos.push({ fecha: f, lineas: canasta(pesosDeLaRonda(c, grupoDeHoy, conAmigo)) })
      minuto += entre(25, 70)
    }
  }
  return pedidos.sort((a, b) => a.fecha - b.fecha)
}

// Nombre de cada producto que usan los gustos. Los pedidos se arman con el id del
// catálogo local, pero en otra base (producción) el mismo producto puede tener otro
// id: por eso se busca por el nombre.
const NOMBRES = {
  1: 'Cerveza Corona de 330 ml (x1)', 2: 'RedBull Energy de 330 ml (x1)', 3: 'Cerveza Huari de 330 ml (x1)',
  4: 'Cerveza Huari de 620 ml (x1)', 5: 'Cerveza Paceña de 330 ml (x1)', 6: 'Cerveza Paceña de 440 ml (x1)',
  9: 'Coctel Mojito (x1)', 10: 'Whisky Jhony Walker', 11: 'Ron 37 Lenguas', 12: 'Ron Abuelo Añejo',
  13: 'Cerveza Corona SixPack (x6)', 14: 'Snack de papas dritas Chips', 15: 'Vodka Stark',
  34: 'Whisky Chivas Regal 12 años', 35: 'Whisky Ballantines Finest', 37: 'Stoli Vodka', 39: 'Ron Havana Reserva',
  40: 'Singani Don Lucho de Oro', 41: 'Singani Casa Real Etiqueta Negra', 42: 'Gin Beefeater Pink', 43: 'Gin Beefeater Dry',
  47: 'Ronda de Meister 6 shots', 48: 'Ronda de Meister 4 shots', 49: 'Shot de Jägermeister', 50: 'Jägermeister con energizante',
  51: 'Tequila Olmeca Reposado', 52: 'Tequila Olmeca Chocolate', 53: 'Espumante Maria de Codorniu Brut Rosado',
  54: 'Espumante Maria de Codorniu Brut Blanco', 55: 'Coca Cola', 57: 'Sprite', 58: 'Schweppes Ginger Ale',
  59: 'Schweppes Agua Tónica', 60: 'Monster', 61: 'Elixir', 64: 'Chuflay (Singani + Ginger Ale)', 66: 'Destornillador',
  67: 'Gin Tonic', 68: 'Vodka Tonic', 69: 'Tequila Sunrise', 70: 'Caipirinha', 71: 'Piña Colada', 72: 'Fernet con Coca',
  73: 'Agua sin gas de 500 ml (x1)', 74: 'Agua con gas de 500 ml (x1)', 76: 'Cerveza Paceña de 620 ml (x1)',
  77: 'Cerveza Stella Artois de 330 ml (x1)', 79: 'Cigarrillos Marlboro (cajetilla)', 80: 'Cigarrillos Lucky Strike (cajetilla)',
  82: 'Cubo de Hielo', 83: 'Pepsi',
}
const normal = (t) => String(t || '').trim().toLowerCase()

// Productos y meseros de la base destino. Falla antes de escribir si falta algo.
async function preparar() {
  const productos = await prisma.producto.findMany({ select: { id_producto: true, precio_base: true, nombre_producto: true } })
  const porNombre = new Map(productos.map(p => [normal(p.nombre_producto), p]))
  const usados = [...new Set(Object.values(G).flatMap(Object.keys).map(Number))]
  const destino = new Map()
  const faltan = []
  for (const id of usados) {
    const p = NOMBRES[id] && porNombre.get(normal(NOMBRES[id]))
    if (p) destino.set(id, { id: p.id_producto, precio: Number(p.precio_base) })
    else faltan.push(NOMBRES[id] || `id ${id}`)
  }
  if (faltan.length) throw new Error(`Faltan productos en el catálogo: ${faltan.join(', ')}`)
  const meseros = (await prisma.usuario.findMany({ where: { rol: { nombre_rol: 'Mesero' } }, select: { id_usuario: true } })).map(m => m.id_usuario)
  if (!meseros.length) throw new Error('No hay meseros para registrar los pedidos')
  const rolCliente = await prisma.rol.findFirst({ where: { nombre_rol: 'Cliente' } })
  if (!rolCliente) throw new Error('No existe el rol Cliente')
  const distintos = usados.filter(id => destino.get(id).id !== id).length
  return { destino, meseros, rolCliente, usados: usados.length, distintos }
}

// Solo revisa (no escribe): catálogo, meseros y si ya existen los clientes
async function probar() {
  const { meseros, usados, distintos } = await preparar()
  console.log(`Catálogo OK: ${usados} productos encontrados por nombre (${distintos} con otro id que en local)`)
  console.log(`Meseros: ${meseros.length}`)
  const ya = await prisma.usuario.count({ where: { correo: { endsWith: DOMINIO } } })
  console.log(`Clientes de prueba que ya existen: ${ya}`)
}

async function crear() {
  const { destino, meseros, rolCliente } = await preparar()
  const hash = await bcrypt.hash(CLAVE, 10)

  for (const c of CLIENTES) {
    const correo = `${c.usuario}${DOMINIO}`
    // Se planifica siempre y el azar se consume en el mismo orden que en local
    // (mesero y forma de pago por pedido): así los datos salen iguales en ambas bases.
    const planes = planificar(c).map(p => ({
      ...p,
      mesero: meseros[Math.floor(azar() * meseros.length)],
      pago: azar() < 0.5 ? 'Efectivo' : 'Transferencia QR',
    }))
    let u = await prisma.usuario.findUnique({ where: { correo } })
    if (!u) {
      u = await prisma.usuario.create({
        data: { nombres: c.nombres, apellidos: c.apellidos, correo, password_hash: hash, estado_cuenta: 'activo', correo_verificado: true, id_rol: rolCliente.id_rol },
      })
    }
    const ya = await prisma.comanda.count({ where: { id_cliente: u.id_usuario } })
    if (ya >= PEDIDOS) { console.log(`${c.nombres}: ya tiene ${ya} pedidos`); continue }
    const nuevos = planes.slice(ya)

    // Por lote: un INSERT de comandas y otro de detalles (por internet, uno por uno tardaba demasiado)
    await prisma.$transaction(async (tx) => {
      await tx.comanda.createMany({
        data: nuevos.map(p => ({
          id_cliente: u.id_usuario, id_mesero: p.mesero, estado_despacho: 'Completada',
          fecha_registro: p.fecha, metodo_pago: p.pago, origen: 'mesero',
        })),
      })
      const ids = (await tx.comanda.findMany({
        where: { id_cliente: u.id_usuario }, orderBy: { id_comanda: 'asc' }, select: { id_comanda: true },
      })).map(x => x.id_comanda).slice(-nuevos.length)
      if (ids.length !== nuevos.length) throw new Error(`${c.nombres}: no cuadran los pedidos creados`)
      await tx.detalle_comanda.createMany({
        data: nuevos.flatMap((p, i) => p.lineas.map(([pid, cant]) => {
          const d = destino.get(pid)
          return { id_comanda: ids[i], id_producto: d.id, cantidad: cant, precio_cobrado: d.precio, subtotal: d.precio * cant }
        })),
      })
    }, { timeout: 120000 })
    console.log(`${c.nombres} ${c.apellidos} (${correo}): ${nuevos.length} pedidos creados`)
  }
}

async function resumen() {
  for (const c of CLIENTES) {
    const u = await prisma.usuario.findUnique({ where: { correo: `${c.usuario}${DOMINIO}` } })
    if (!u) { console.log(`${c.nombres}: no existe`); continue }
    const filas = await prisma.$queryRawUnsafe(`
      SELECT cat.nombre_categoria cat, p.nombre_producto prod, COUNT(*) n
      FROM detalle_comanda d JOIN comanda c ON c.id_comanda = d.id_comanda
      JOIN producto p ON p.id_producto = d.id_producto JOIN categoria cat ON cat.id_categoria = p.id_categoria
      WHERE c.id_cliente = ${u.id_usuario} GROUP BY cat.nombre_categoria, p.nombre_producto ORDER BY n DESC`)
    const total = filas.reduce((s, f) => s + Number(f.n), 0)
    const porCat = {}
    for (const f of filas) porCat[f.cat] = (porCat[f.cat] || 0) + Number(f.n)
    const pedidos = await prisma.comanda.count({ where: { id_cliente: u.id_usuario } })
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v / total * 100)}%`).join(', ')
    const top = filas.slice(0, 3).map(f => `${f.prod} (${f.n})`).join(', ')
    console.log(`#${u.id_usuario} ${c.nombres} [${c.modo}] ${pedidos} pedidos · ${cats}\n    más pedidos: ${top}`)
  }
}

async function borrar() {
  const us = await prisma.usuario.findMany({ where: { correo: { endsWith: DOMINIO } }, select: { id_usuario: true } })
  const ids = us.map(u => u.id_usuario)
  if (!ids.length) { console.log('No hay clientes de prueba'); return }
  const coms = (await prisma.comanda.findMany({ where: { id_cliente: { in: ids } }, select: { id_comanda: true } })).map(c => c.id_comanda)
  await prisma.detalle_comanda.deleteMany({ where: { id_comanda: { in: coms } } })
  await prisma.comanda.deleteMany({ where: { id_comanda: { in: coms } } })
  await prisma.usuario.deleteMany({ where: { id_usuario: { in: ids } } })
  console.log(`Quitados ${ids.length} clientes y ${coms.length} pedidos`)
}

const arg = process.argv[2]
;(arg === '--borrar' ? borrar() : arg === '--resumen' ? resumen() : arg === '--probar' ? probar() : crear().then(resumen))
  .catch(e => { console.error(e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
