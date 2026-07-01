// ============================================
// Configuración de Base de Datos (Singleton)
// ============================================
const { PrismaClient } = require('@prisma/client')

const prisma = global.prisma || new PrismaClient({
  log: process.env.ENTORNO === 'desarrollo'
    ? ['query', 'error', 'warn']
    : ['error'],
})

if (process.env.ENTORNO === 'desarrollo') {
  global.prisma = prisma
}

module.exports = prisma