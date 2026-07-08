// ============================================================
// EUPHORIA — Configuración del premio por perfil completo
// ============================================================
// El % de descuento y el TOPE en Bs viven en la tabla `configuracion`
// para que el ADMIN los cambie desde el panel sin tocar código.
//   premio_perfil_pct  → porcentaje de descuento (0-90), por defecto 10
//   premio_perfil_max  → tope en Bs del descuento, por defecto 50
const prisma = require('../config/base-de-datos')

const DEFECTO = { premio_perfil_pct: '10', premio_perfil_max: '50' }

async function leerConfigPremio() {
  const filas = await prisma.configuracion.findMany({
    where: { clave: { in: Object.keys(DEFECTO) } },
  })
  const cfg = { ...DEFECTO }
  filas.forEach(f => { cfg[f.clave] = f.valor })
  const pct = Math.min(Math.max(parseFloat(cfg.premio_perfil_pct) || 10, 0), 90)
  const max = Math.max(parseFloat(cfg.premio_perfil_max) || 50, 0)
  return { pct, max }
}

module.exports = { leerConfigPremio }
