// ============================================================
// EUPHORIA — Análisis de comprobantes bancarios por plantilla
// ============================================================
// Reglas calibradas con comprobantes REALES de los bancos que
// aceptamos (set de calibración en generados/muestras-ocr/).
// El texto llega del OCR (Tesseract spa+eng), por lo que cada regla
// tolera el ruido típico observado en esas muestras:
//   - BCP:  "Del bafico" (banco), decimales pegados "Bs. 50.00"
//   - BNB:  el logo no se lee (sale "a TY"), se detecta por su léxico
//   - BISA: el encabezado gris "Pago QR realizado / banco bisa" NO se
//           lee — se reconoce por su estructura (CI/NIT + N° Transaccion)
//   - Yape: el monto en fuente gigante sale partido ("Bs1 00" = Bs 100)
//           y la fecha viene como "09 jun. 2026"
//
// Un comprobante solo es válido si:
//   1. Coincide con la plantilla de un banco soportado
//   2. El monto extraído DE SU ETIQUETA coincide con el esperado
//   3. Se extrae el número de transacción del campo propio del banco
//   4. La fecha del comprobante es la de hoy
//   5. El pago fue A NUESTRA CUENTA: el motivo/referencia dice
//      "Consumo Euphoria" o el destinatario es el titular configurado
//      (clave 'ocr_titular_destino' en la tabla configuracion). Sin esto,
//      cualquiera podía subir un comprobante de un pago a OTRA cuenta.
// (la unicidad del nro. de transacción se valida en la ruta contra la BD)

const MESES_ABREV = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
}

// Convierte lo capturado por la etiqueta de monto a número.
// Tolera espacios internos del OCR ("1 00" -> 100) y coma decimal.
function parsearMonto(bruto) {
  if (!bruto) return null
  let s = String(bruto).replace(/\s+/g, '')
  // "1.234,50" -> "1234.50" ; "1,234.50" -> "1234.50"
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else {
    s = s.replace(',', '.')
  }
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : null
}

function esFechaHoy(dd, mm, yyyy, hoy) {
  return (
    parseInt(dd, 10) === hoy.getDate() &&
    parseInt(mm, 10) === hoy.getMonth() + 1 &&
    parseInt(String(yyyy).length === 2 ? '20' + yyyy : yyyy, 10) === hoy.getFullYear()
  )
}

// Normaliza nombres para compararlos pese al ruido del OCR:
// minúsculas, sin acentos, solo letras y espacios.
function normalizarNombre(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// El destinatario extraído coincide con el titular si comparten al menos
// 2 palabras significativas (>=3 letras). Tolera que el OCR parta o
// deforme una palabra ("Cañez" -> "Ca Ez") sin aceptar nombres ajenos.
function coincideTitular(extraido, titular) {
  const palabrasTitular = normalizarNombre(titular).split(' ').filter(w => w.length >= 3)
  const textoExtraido = normalizarNombre(extraido)
  if (!palabrasTitular.length || !textoExtraido) return false
  const aciertos = palabrasTitular.filter(w => textoExtraido.includes(w)).length
  return aciertos >= Math.min(2, palabrasTitular.length)
}

// "Consumo Euphoria" con los errores típicos del OCR sobre 'euphoria'
function contieneConsumoEuphoria(texto) {
  const t = normalizarNombre(texto).replace(/\s/g, '')
  return /consumo.{0,3}(euphoria|euforia|eupboria|eupnoria|euph0ria)/.test(t) ||
    /(euphoria|euforia|eupboria|eupnoria)/.test(t)
}

// ---- Plantillas por banco -------------------------------------------------
// deteccion: al menos UNA debe aparecer para considerar el banco candidato.
// monto/transaccion/fecha: regex ancladas a las etiquetas reales del banco.
const PLANTILLAS = [
  {
    banco: 'BCP',
    nombre: 'Banco de Crédito BCP',
    deteccion: [/banco\s+de\s+cr[eé]dito/i, /\bbcp\b/i, /bm\s*qr/i, /enviado\s+por/i],
    monto: /monto\s*:?\s*bs\.?\s*([\d.,]+)/i,
    transaccion: /n[uú]mero\s+de\s+transacci[oó]n\s*:?\s*(\d{8,20})/i,
    fecha: /fecha\s*y\s*hora\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    motivo: /motivo\s*:?\s*(.{2,45}?)\s*de\s*la\s*cuenta/i,
    // El SEGUNDO "A nombre de" es el destinatario (el primero es el pagador);
    // "Ala cuenta"/"Del bafico" son lecturas reales del OCR sobre la muestra.
    destinatario: /a\s*la\s+cuenta\s*:?\s*[\d*\s]+a\s+nombre\s+de\s+(.{4,50}?)\s+del\s+ba/i,
  },
  {
    banco: 'BNB',
    nombre: 'Banco Nacional de Bolivia',
    deteccion: [/\bbnb\b/i, /comprobante\s+electr[oó]nico/i, /transferencia\s+interbancaria/i, /bancarizaci[oó]n/i],
    monto: /la\s+suma\s+de\s+bs\.?\s*:?\s*([\d.,]+)/i,
    transaccion: /bancarizaci[oó]n\s*:?\s*([a-z0-9]{6,15})/i,
    fecha: /fecha\s+de\s+la\s+transacci[oó]n\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    motivo: /referencia\s*:?\s*(.{2,45}?)\s*fecha\s+de/i,
    destinatario: /nombre\s+del\s+destinatario\s*:?\s*(.{4,50}?)\s+banco\s+destino/i,
  },
  {
    banco: 'BISA',
    nombre: 'Banco BISA',
    // El encabezado con el logo no siempre lo lee el OCR: la estructura
    // CI/NIT + "N° Transaccion" (sin "de" en medio) identifica al BISA.
    deteccion: [/\bbisa\b/i, /pago\s*qr\s*realizado/i, /ci\s*\/\s*nit/i],
    monto: /monto\s*:?\s*bs\.?\s*([\d.,]+)/i,
    transaccion: /n[°º0oa]?\s*\.?\s*transacci[oó]n\s*:?\s*(\d{8,15})/i,
    fecha: /fecha\s*y\s*hora\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    motivo: /motivo\s*:?\s*(.{2,45}?)\s*n[°º0oa]?\s*\.?\s*transacci/i,
    destinatario: /\bpara\s+(.{4,50}?)\s+ci\s*\/\s*nit/i,
  },
  {
    banco: 'YAPE',
    nombre: 'Yape',
    deteccion: [/yapeaste/i, /\byape\b/i],
    // La fuente gigante parte los dígitos ("Bs1 00"): se capturan dígitos
    // con espacios internos y parsearMonto() los junta.
    monto: /[¡i]?yapeaste[^0-9]{0,20}bs\.?\s*((?:\d[\d\s]{0,8}\d|\d)(?:[.,]\d{1,2})?)/i,
    montoRespaldo: /\bbs\.?\s*((?:\d[\d\s]{0,8}\d|\d)(?:[.,]\d{1,2})?)/i,
    transaccion: /nro\.?\s*de\s*transacci[oó]n\s*:?\s*(\d{6,15})/i,
    // "09 jun. 2026"
    fechaTexto: /(\d{1,2})\s*(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?\s*(?:de\s*)?(\d{4})/i,
    // Yape no tiene motivo: el destinatario es el nombre grande entre el
    // monto y la fecha ("Bs1 00 Candelaria Cañez Ajhuacho & 09 jun. 2026")
    destinatario: /bs\.?\s*[\d\s.,]+([a-záéíóúñ][a-záéíóúñ\s.]{4,50}?)\s*[^a-záéíóúñ\s]*\s*\d{1,2}\s*(?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)/i,
  },
  {
    banco: 'YASTA',
    nombre: 'Yasta (Banco Ganadero)',
    // Yasta/Ganadero: encabezado "Operación realizada exitosamente" y campo
    // propio "Número de órden". El logo suele leerse mal ("Vasta").
    deteccion: [/\byasta\b/i, /vasta/i, /operaci[oó]n\s+realizada\s+exitosamente/i, /n[uú]mero\s+de\s+[oó]rden/i],
    // El monto es el número grande con "Bs" (no lleva etiqueta "Monto:").
    monto: /\bbs\.?\s*([\d.,]+)/i,
    transaccion: /n[uú]mero\s+de\s+[oó]rden\s*:?\s*(\d{8,25})/i,
    // "26 de mayo de 2026, 09:49"
    fechaTexto: /(\d{1,2})\s+de\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?\s+(?:de\s*)?(\d{4})/i,
    motivo: /motivo\s*:?\s*(.{2,45}?)(?:\s{2,}|$)/i,
    // El destinatario está en "Cuenta destino ... | NOMBRE | ..." antes de "Cuenta origen"
    destinatario: /cuenta\s+destino\s*:?\s*(.{4,70}?)\s+cuenta\s+origen/i,
  },
]

// Plantilla GENÉRICA: acepta comprobantes de CUALQUIER banco con las mismas
// 5 validaciones, ancladas a las etiquetas más comunes de la banca boliviana.
// Se usa solo cuando ninguna plantilla específica reconoce el comprobante.
const PLANTILLA_GENERICA = {
  banco: 'OTRO',
  nombre: 'tu banco',
  deteccion: [/./],
  monto: /(?:monto|importe|total(?:\s+pagado)?|la\s+suma)\s*(?:de\s+bs\.?|\(bs\.?\))?\s*:?\s*(?:bs\.?)?\s*([\d.,]+)/i,
  transaccion: /(?:n[°ºo.]{0,2}\s*(?:de\s+)?(?:transacci[oó]n|operaci[oó]n)|referencia|bancarizaci[oó]n|comprobante\s*n[°ºo.]{0,2})\s*:?\s*#?\s*([a-z0-9-]{6,20})/i,
  fecha: /(?:fecha[^0-9]{0,25})?(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
  fechaTextoRespaldo: /(\d{1,2})\s*(?:de\s*)?(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?\s*(?:de\s*)?(\d{4})/i,
  motivo: /(?:motivo|glosa|concepto|referencia|detalle)\s*:?\s*(.{2,45}?)(?:\s{2,}|\s(?:n[°ºo]|fecha|de\s+la\s+cuenta|monto)|$)/i,
  destinatario: /(?:destinatario|beneficiario|para|a\s+nombre\s+de|a\s+favor\s+de)\s*:?\s*([a-záéíóúñ][a-záéíóúñ\s.]{4,50})/i,
}

// Titular por defecto de la cuenta receptora (respaldo si la clave
// 'ocr_titular_destino' no existe en la tabla configuracion).
const TITULAR_POR_DEFECTO = 'Dilan Rafael Arauco Paniagua'

/**
 * Analiza el texto OCR de un comprobante contra las plantillas de bancos
 * soportados. No consulta la BD (la unicidad se valida en la ruta).
 *
 * @param {string} textoOCR  texto plano del OCR (con espacios normalizados)
 * @param {number} montoEsperado
 * @param {Date}   [hoy]      inyectable para pruebas
 * @param {object} [opciones] { titular: 'Nombre Del Titular|Otro Alias' }
 * @returns {{ok: boolean, banco?: string, nombreBanco?: string, monto?: number,
 *            transaccionId?: string, destinatario?: string, error?: string}}
 */
function analizarComprobante(textoOCR, montoEsperado, hoy = new Date(), opciones = {}) {
  const titulares = String(opciones.titular || TITULAR_POR_DEFECTO)
    .split('|').map(t => t.trim()).filter(Boolean)
  const texto = String(textoOCR || '').replace(/\s+/g, ' ')

  // 1. Reconocer el banco emisor: candidatos por léxico, confirmados por estructura
  const candidatas = PLANTILLAS
    .map(p => ({ p, puntos: p.deteccion.filter(rx => rx.test(texto)).length }))
    .filter(c => c.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)

  // Cualquier banco es válido: si ninguna plantilla específica calza, se usa la
  // GENÉRICA (mismas 5 validaciones, con etiquetas comunes de la banca boliviana).
  candidatas.push({ p: PLANTILLA_GENERICA })

  // 2. Con la plantilla más probable que logre extraer sus campos, validar todo
  let ultimaFalla = null
  for (const { p } of candidatas) {
    // Monto anclado a la etiqueta del banco (nunca "el número aparece en alguna parte")
    let m = texto.match(p.monto)
    if (!m && p.montoRespaldo) m = texto.match(p.montoRespaldo)
    if (!m) { ultimaFalla = { p, campo: 'monto' }; continue }
    const monto = parsearMonto(m[1])

    // Número de transacción del campo propio del banco: obligatorio
    const t = texto.match(p.transaccion)
    if (!t) { ultimaFalla = { p, campo: 'transaccion' }; continue }
    const transaccionId = t[1].toUpperCase()

    // Fecha del comprobante: debe ser de hoy
    let fechaOk = false
    let fechaLeida = null
    if (p.fecha) {
      const f = texto.match(p.fecha)
      if (f) {
        fechaLeida = `${f[1]}/${f[2]}/${f[3]}`
        fechaOk = esFechaHoy(f[1], f[2], f[3], hoy)
      } else if (p.fechaTextoRespaldo) {
        // Genérica: algunos bancos escriben "07 de julio 2026"
        const ft = texto.match(p.fechaTextoRespaldo)
        if (ft) {
          const mesNum = MESES_ABREV[ft[2].toLowerCase().slice(0, 3)]
          fechaLeida = `${String(ft[1]).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}/${ft[3]}`
          fechaOk = mesNum ? esFechaHoy(ft[1], mesNum, ft[3], hoy) : false
        }
      }
    } else if (p.fechaTexto) {
      const f = texto.match(p.fechaTexto)
      if (f) {
        const mesNum = MESES_ABREV[f[2].toLowerCase().slice(0, 3)]
        fechaLeida = `${String(f[1]).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}/${f[3]}`
        fechaOk = mesNum ? esFechaHoy(f[1], mesNum, f[3], hoy) : false
      }
    }
    if (!fechaLeida) {
      return {
        ok: false, banco: p.banco,
        error: `No pudimos leer la fecha del comprobante ${p.nombre}. Sube la captura completa donde se vea la fecha de la operación.`,
      }
    }
    if (!fechaOk) {
      const dd = String(hoy.getDate()).padStart(2, '0')
      const mm = String(hoy.getMonth() + 1).padStart(2, '0')
      return {
        ok: false, banco: p.banco,
        error: `El comprobante ${p.nombre} tiene fecha ${fechaLeida}: solo se aceptan transferencias de hoy (${dd}/${mm}/${hoy.getFullYear()}).`,
      }
    }

    // Monto: comparación numérica exacta (tolerancia de centavo por el OCR)
    if (monto === null || Math.abs(monto - montoEsperado) > 0.01) {
      return {
        ok: false, banco: p.banco,
        error: monto === null
          ? `No pudimos leer el monto del comprobante ${p.nombre}. Sube una captura nítida.`
          : `El monto del comprobante ${p.nombre} es Bs. ${monto.toFixed(2)} y no coincide con el monto ingresado (Bs. ${montoEsperado.toFixed(2)}).`,
      }
    }

    // Destino: el pago debe ser A NUESTRA CUENTA. Pasa si el motivo/referencia
    // dice "Consumo Euphoria" o si el destinatario es el titular configurado.
    // Sin esto cualquiera subía el comprobante de un pago a otra cuenta.
    const motivoTexto = p.motivo ? (texto.match(p.motivo)?.[1] || '') : ''
    const destinatarioTexto = p.destinatario ? (texto.match(p.destinatario)?.[1] || '') : ''
    const motivoEuphoria = contieneConsumoEuphoria(motivoTexto)
    const destinatarioOk = titulares.some(t => coincideTitular(destinatarioTexto, t))

    if (!motivoEuphoria && !destinatarioOk) {
      const conMotivo = !!p.motivo
      return {
        ok: false, banco: p.banco, destinatario: destinatarioTexto || undefined,
        error: destinatarioTexto
          ? `El comprobante ${p.nombre} muestra un pago a "${destinatarioTexto.trim()}", que no es la cuenta de Euphoria.${conMotivo ? " Si pagaste a nuestra cuenta, pon 'Consumo Euphoria' en el motivo/glosa de la transferencia." : ''}`
          : `No pudimos verificar que el pago fue a la cuenta de Euphoria.${conMotivo ? " Pon 'Consumo Euphoria' en el motivo/glosa de la transferencia y sube la captura completa." : ' Sube la captura completa donde se vea el destinatario.'}`,
      }
    }

    return {
      ok: true, banco: p.banco, nombreBanco: p.nombre, monto, transaccionId,
      destinatario: destinatarioTexto.trim() || undefined,
      validadoPor: motivoEuphoria ? 'motivo' : 'destinatario',
    }
  }

  // Ningún candidato pudo extraer sus campos estructurales
  const p = ultimaFalla?.p
  return {
    ok: false,
    banco: p?.banco,
    error: p
      ? `El comprobante parece de ${p.nombre} pero no pudimos leer su ${ultimaFalla.campo === 'monto' ? 'monto' : 'número de transacción'}. Sube la captura original completa, sin recortes.`
      : 'El comprobante no pudo validarse. Sube la captura original completa y nítida.',
  }
}

module.exports = { analizarComprobante, parsearMonto, coincideTitular, contieneConsumoEuphoria, TITULAR_POR_DEFECTO }
