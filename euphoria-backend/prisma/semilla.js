// ============================================
// EUPHORIA — Semilla de Base de Datos
// Crea roles, categorías y usuarios base del sistema
// Ejecutar: npm run db:sembrar
// ============================================
const prisma = require('../src/config/base-de-datos')
const bcrypt = require('bcryptjs')

async function sembrar() {
  console.log('\n🌱 Iniciando carga de datos básicos...\n')

  try {
    // ─── 1. ROLES ───────────────────────────────────────────────────────────
    const nombresRoles = [
      'Administrador',  // id 1
      'Cajero',         // id 2
      'Mesero',         // id 3
      'Recepcionista',  // id 4
      'Bartender',      // id 5
      'Cliente',        // id 6
    ]

    console.log('📋 Creando roles...')
    for (const nombre_rol of nombresRoles) {
      await prisma.rol.upsert({
        where: { id_rol: nombresRoles.indexOf(nombre_rol) + 1 },
        update: {},
        create: { nombre_rol },
      })
    }

    // ─── 2. CATEGORÍAS ──────────────────────────────────────────────────────
    const categorias = ['Bebidas', 'Cócteles', 'Cervezas', 'Snacks', 'Combos', 'Sin Alcohol']

    console.log('🗂️  Creando categorías de productos...')
    for (const nombre_categoria of categorias) {
      const existe = await prisma.categoria.findFirst({ where: { nombre_categoria } })
      if (!existe) {
        await prisma.categoria.create({ data: { nombre_categoria } })
      }
    }

    // ─── 3. USUARIOS DEL SISTEMA ────────────────────────────────────────────
    console.log('\n👥 Creando usuarios del sistema...\n')

    // Lista de usuarios que siempre deben existir (igual que en las pruebas)
    const usuariosSistema = [
      {
        nombres: 'Admin',
        apellidos: 'Euphoria',
        correo: 'admin@euphoria.com',
        password: '123456',
        id_rol: 1, // Administrador
        etiqueta: 'Admin principal',
      },
      {
        nombres: 'Roberto',
        apellidos: 'Ramirez Perez',
        correo: 'rramirezp@euphoria.com',
        password: '123456',
        id_rol: 2, // Cajero
        etiqueta: 'Cajero de pruebas',
      },
      {
        nombres: 'Ana',
        apellidos: 'Cayog',
        correo: 'acayog@euphoria.com',
        password: '123456',
        id_rol: 3, // Mesero
        etiqueta: 'Mesero de pruebas',
      },
      {
        nombres: 'Carlos',
        apellidos: 'Recepcionista',
        correo: 'crecepcion@euphoria.com',
        password: '123456',
        id_rol: 4, // Recepcionista
        etiqueta: 'Recepcionista de pruebas',
      },
      {
        nombres: 'Luis',
        apellidos: 'Bartender',
        correo: 'lbartender@euphoria.com',
        password: '123456',
        id_rol: 5, // Bartender
        etiqueta: 'Bartender de pruebas',
      },
      {
        nombres: 'Dilan',
        apellidos: 'Cliente Demo',
        correo: 'docolibra444@gmail.com',
        password: '8777138',
        ci_carnet: '8777138',
        id_rol: 6, // Cliente
        etiqueta: 'Cliente de pruebas (con billetera)',
      },
    ]

    for (const u of usuariosSistema) {
      const existe = await prisma.usuario.findUnique({ where: { correo: u.correo } })
      if (!existe) {
        const password_hash = await bcrypt.hash(u.password, 12)
        await prisma.usuario.create({
          data: {
            nombres: u.nombres,
            apellidos: u.apellidos,
            correo: u.correo,
            password_hash,
            ci_carnet: u.ci_carnet || '',
            estado_cuenta: 'activo',
            id_rol: u.id_rol,
          },
        })
        console.log(`  ✅ ${u.etiqueta}: ${u.correo} / ${u.password}`)
      } else {
        console.log(`  ℹ️  Ya existe: ${u.correo}`)
      }
    }

    // ─── RESUMEN ────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════')
    console.log('🎉 Semilla completada exitosamente!')
    console.log('═══════════════════════════════════════')
    console.log('\n📋 Credenciales de acceso:\n')
    console.log('  ROL           | CORREO                        | PASSWORD')
    console.log('  ─────────────────────────────────────────────────────────')
    console.log('  Administrador | admin@euphoria.com             | 123456')
    console.log('  Cajero        | rramirezp@euphoria.com         | 123456')
    console.log('  Mesero        | acayog@euphoria.com            | 123456')
    console.log('  Recepcionista | crecepcion@euphoria.com        | 123456')
    console.log('  Bartender     | lbartender@euphoria.com        | 123456')
    console.log('  Cliente       | docolibra444@gmail.com         | 8777138')
    console.log('')

  } catch (error) {
    console.error('❌ Error en la semilla:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

sembrar()
