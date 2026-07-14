// ============================================================
// BANCO DE PRUEBAS ESTRICTO DEL OCR (temporal, se borra al final)
// Genera variantes degradadas de las 7 muestras reales (simulan fotos de
// fiesta: borrosa, oscura, con brillo, rotada, lejana, comprimida) y mide
// si el análisis identifica banco + monto + N° de transacción en cada una.
// Uso:  node _test_ocr_matriz.js [robusto]
//   (sin args = análisis de UNA pasada como hoy; 'robusto' = multi-pasada)
// ============================================================
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const Tesseract = require('tesseract.js')
const ocr = require('../src/utilidades/ocr-comprobantes')

const DIR = 'C:/Users/arauc/Desktop/Tickets/recursos/generados/muestras-ocr/'
const OUT = path.join(__dirname, 'variantes')
const MODO_ROBUSTO = process.argv[2] === 'robusto'

const CASOS = [
  { f: 'ComprobanteBancoBCP.png',      banco: 'BCP',      monto: 50,  hoy: '2026-06-15', tit: 'Yolanda Paniagua Vargas' },
  { f: 'ComprobanteBancoBNB.jpeg',     banco: 'BNB',      monto: 245, hoy: '2026-05-16', tit: '' },
  { f: 'ComprobanteBancoBisa.jpeg',    banco: 'BISA',     monto: 300, hoy: '2026-06-13', tit: 'Maria Isabel Vargas' },
  { f: 'ComprobanteBancoUnion.jpeg',   banco: 'UNION',    monto: 20,  hoy: '2026-07-12', tit: 'Arauco Paniagua Dilan Rafael' },
  { f: 'ComprobanteBancoYape.jpeg',    banco: 'YAPE',     monto: 100, hoy: '2026-06-09', tit: 'Candelaria Cañez Ajhuacho' },
  { f: 'ComprobanteBancoYasta.jpeg',   banco: 'YASTA',    monto: 11,  hoy: '2026-05-26', tit: '' },
  { f: 'ComprobanteBancoGanadero.jpeg',banco: 'GANADERO', monto: 200, hoy: '2026-05-04', tit: 'Erick Poveda Severich' },
]

// Variantes que simulan las condiciones reales de una foto en la disco
const VARIANTES = [
  { n: 'original', fx: img => img },
  { n: 'borrosa',  fx: img => img.blur(1.3) },
  { n: 'oscura',   fx: img => img.modulate({ brightness: 0.55 }) },
  { n: 'brillosa', fx: img => img.modulate({ brightness: 1.4, saturation: 0.8 }) },
  { n: 'rotada',   fx: img => img.rotate(2.5, { background: '#ffffff' }) },
  { n: 'lejana',   fx: img => img.metadata ? img : img },  // se maneja aparte (necesita metadata)
  { n: 'jpeg35',   fx: img => img.jpeg({ quality: 35 }) },
]

async function generarVariante(rutaSrc, variante, rutaDst) {
  if (variante.n === 'lejana') {
    const meta = await sharp(rutaSrc).metadata()
    await sharp(rutaSrc).resize({ width: Math.round(meta.width * 0.55) }).jpeg({ quality: 88 }).toFile(rutaDst)
    return
  }
  let img = sharp(rutaSrc)
  img = variante.fx(img)
  await img.jpeg({ quality: variante.n === 'jpeg35' ? 35 : 90 }).toFile(rutaDst)
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)
  const worker = await Tesseract.createWorker('spa+eng')

  console.log(`\nMODO: ${MODO_ROBUSTO ? 'ROBUSTO (multi-pasada)' : 'simple (una pasada, como hoy)'}\n`)
  const filas = []
  let total = 0, pasan = 0

  for (const c of CASOS) {
    const celdas = []
    for (const v of VARIANTES) {
      const dst = path.join(OUT, `${c.banco}-${v.n}.jpg`)
      if (!fs.existsSync(dst)) await generarVariante(DIR + c.f, v, dst)
      const hoy = new Date(c.hoy + 'T12:00:00')
      const opciones = { titular: c.tit || 'Dilan Rafael Arauco Paniagua' }

      let r
      if (MODO_ROBUSTO && ocr.analizarComprobanteRobusto) {
        r = await ocr.analizarComprobanteRobusto(fs.readFileSync(dst), c.monto, worker, hoy, opciones)
      } else {
        const { data } = await worker.recognize(dst)
        r = ocr.analizarComprobante(data.text, c.monto, hoy, opciones)
      }
      total++
      // ESTRICTO: banco correcto + monto + transacción extraídos
      const okBanco = r.banco === c.banco
      const okCampos = r.campos ? (r.campos.monto === true && r.campos.transaccion === true) : r.ok
      const pasa = okBanco && okCampos
      if (pasa) pasan++
      celdas.push(pasa ? ' OK ' : (okBanco ? 'camp' : (r.banco ? 'banc' : ' -- ')))
    }
    filas.push(`${c.banco.padEnd(9)} | ${celdas.join(' | ')}`)
  }

  console.log(`BANCO     | ${VARIANTES.map(v => v.n.padEnd(4).slice(0, 8)).join(' | ')}`)
  console.log('-'.repeat(80))
  filas.forEach(f => console.log(f))
  console.log('-'.repeat(80))
  console.log(`RESULTADO: ${pasan}/${total} (${Math.round(pasan / total * 100)}%)  [OK=pasa · camp=banco sí/campos no · banc=banco equivocado · --=no identifica]`)
  await worker.terminate()
}

main().catch(e => { console.error('ERR', e); process.exit(1) })
