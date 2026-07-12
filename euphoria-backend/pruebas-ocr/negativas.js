// PRUEBAS NEGATIVAS: lo que DEBE rechazarse (la robustez no puede aflojar la seguridad)
const fs = require('fs')
const sharp = require('sharp')
const Tesseract = require('tesseract.js')
const ocr = require('./src/utilidades/ocr-comprobantes')

const DIR = 'C:/Users/arauc/Desktop/Tickets/generados/muestras-ocr/'
// titular REAL configurado en produccion
const TITULAR = 'Dilan Rafael Arauco Paniagua'
const CASOS = [
  // destinoEsperado con el titular real: BNB pasa por motivo "Consumo Euphoria",
  // UNION pasa porque el pago fue a Dilan; el resto son pagos A TERCEROS -> false
  { f: 'ComprobanteBancoBCP.png',      banco: 'BCP',      monto: 50,  hoy: '2026-06-15', destinoEsperado: false },
  { f: 'ComprobanteBancoBNB.jpeg',     banco: 'BNB',      monto: 245, hoy: '2026-05-16', destinoEsperado: true },
  { f: 'ComprobanteBancoBisa.jpeg',    banco: 'BISA',     monto: 300, hoy: '2026-06-13', destinoEsperado: false },
  { f: 'ComprobanteBancoUnion.jpeg',   banco: 'UNION',    monto: 20,  hoy: '2026-07-12', destinoEsperado: true },
  { f: 'ComprobanteBancoYape.jpeg',    banco: 'YAPE',     monto: 100, hoy: '2026-06-09', destinoEsperado: false },
  { f: 'ComprobanteBancoYasta.jpeg',   banco: 'YASTA',    monto: 11,  hoy: '2026-05-26', destinoEsperado: false },
  { f: 'ComprobanteBancoGanadero.jpeg',banco: 'GANADERO', monto: 200, hoy: '2026-05-04', destinoEsperado: false },
]

let fallos = 0
const check = (cond, msg) => { if (cond) console.log('  OK  ' + msg); else { fallos++; console.log('  FALLO  ' + msg) } }

async function main() {
  const worker = await Tesseract.createWorker('spa+eng')
  const op = { titular: TITULAR }

  for (const c of CASOS) {
    const buf = fs.readFileSync(DIR + c.f)
    const hoyOk = new Date(c.hoy + 'T12:00:00')

    // (a) MONTO EQUIVOCADO: el usuario dice otro monto -> debe fallar el monto
    const rA = await ocr.analizarComprobanteRobusto(buf, c.monto + 13.37, worker, hoyOk, op)
    check(rA.ok === false && rA.campos?.monto !== true, `${c.banco}: monto equivocado RECHAZADO (monto=${rA.campos?.monto})`)

    // (b) FECHA VIEJA: el comprobante no es de hoy -> debe fallar la fecha
    const rB = await ocr.analizarComprobanteRobusto(buf, c.monto, worker, new Date('2026-09-20T12:00:00'), op)
    check(rB.ok === false && rB.campos?.fecha !== true, `${c.banco}: fecha vieja RECHAZADA (fecha=${rB.campos?.fecha})`)

    // (c) DESTINO con el titular real: solo BNB (motivo) y UNION (pago a Dilan) pasan
    const rC = await ocr.analizarComprobanteRobusto(buf, c.monto, worker, hoyOk, op)
    check(rC.campos?.destino === c.destinoEsperado || (c.destinoEsperado === true && rC.ok),
      `${c.banco}: destino=${rC.campos?.destino} (esperado ${c.destinoEsperado}) ${rC.ok ? '[valido]' : '[rechazado]'}`)
  }

  // (d) IMAGEN BASURA (ruido): jamás debe validar
  const ruido = await sharp({ create: { width: 900, height: 1200, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } })
    .jpeg().toBuffer()
  const rD = await ocr.analizarComprobanteRobusto(ruido, 100, worker, new Date(), op)
  check(rD.ok === false, `imagen de ruido RECHAZADA (ok=${rD.ok}, banco=${rD.banco || '-'})`)

  await worker.terminate()
  console.log(fallos ? `\n${fallos} FALLOS DE SEGURIDAD` : '\nSEGURIDAD INTACTA: todo lo invalido se rechaza')
  process.exit(fallos ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
