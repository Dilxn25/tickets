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
// Flujo: primero se IDENTIFICA EL BANCO por su léxico (deteccion) y recién
// después se validan los campos SEGÚN LA PLANTILLA DE ESE BANCO — cada banco
// imprime campos distintos (Yape no tiene motivo/referencia; BNB/BCP/BISA/
// Unión sí). Si un banco puntúa en detección NO se cae a la genérica: se
// reporta exactamente qué campo falló en ESE banco. Solo cuando NINGÚN banco
// registrado puntúa se usa la validación GENÉRICA (analizarComprobanteFlexible)
// con los campos preestablecidos (destino/monto/N° de transacción).
//
// Un comprobante es válido si:
//   1. El monto extraído DE SU ETIQUETA coincide con el esperado
//   2. Se extrae el número de transacción del campo propio del banco
//   3. La fecha del comprobante es la de hoy (la genérica no valida fecha:
//      no conoce el formato en que su banco la imprime)
//   4. El pago fue A NUESTRA CUENTA: el motivo/referencia dice
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
    montoRespaldo: /\bmonto\b[^0-9]{0,8}bs\.?\s*([\d.,]+)/i,
    transaccion: /n[uú]mero\s+de\s+transacci[oó]n\s*:?\s*(\d{8,20})/i,
    fecha: /fecha\s*y\s*hora\s*:?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i,
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
    fecha: /fecha\s+de\s+la\s+transacci[oó]n\s*:?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i,
    motivo: /referencia\s*:?\s*(.{2,45}?)\s*fecha\s+de/i,
    destinatario: /nombre\s+del\s+destinatario\s*:?\s*(.{4,50}?)\s+banco\s+destino/i,
  },
  {
    banco: 'UNION',
    nombre: 'Banco Unión',
    // El comprobante de la app de Banco Unión NO imprime la palabra "Unión":
    // se reconoce por su estructura -> encabezado "COMPROBANTE DE PAGO",
    // el importe como "Pagó Bs. 20.00" y el campo propio "Transacción N°:".
    deteccion: [/comprobante\s+de\s+pago/i, /pag[oó]\s+bs/i, /transacci[oó]n\s+n[e°ºo]/i, /\bbanco\s+uni[oó]n\b/i],
    monto: /pag[oó]\s+bs\.?\s*([\d.,]+)/i,
    // El OCR parte el N° en dos ("...2566 03799"): se capturan dígitos con
    // espacios internos y el análisis los junta (transaccionId sin espacios).
    transaccion: /transacci[oó]n\s+n?[e°ºo]?\s*:?\s*(\d[\d\s]{6,30}\d)/i,
    fecha: /comprobante\s+de\s+pago\s+(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i,
    motivo: /referencia\s*:?\s*(.{2,45}?)(?:\s{2,}|$)/i,
    // "Pagó Bs. 20.00 A: NOMBRE  BANCO ..." -> el nombre va entre el monto y el banco.
    destinatario: /pag[oó]\s+bs\.?\s*[\d.,]+\s*a\s*:?\s*(.{4,50}?)\s+banco\s+/i,
  },
  {
    banco: 'BISA',
    nombre: 'Banco BISA',
    // El encabezado con el logo no siempre lo lee el OCR: la estructura
    // CI/NIT + "N° Transaccion" (sin "de" en medio) identifica al BISA.
    deteccion: [/\bbisa\b/i, /pago\s*qr\s*realizado/i, /ci\s*\/\s*nit/i],
    monto: /monto\s*:?\s*bs\.?\s*([\d.,]+)/i,
    transaccion: /n[°º0oa]?\s*\.?\s*transacci[oó]n\s*:?\s*(\d{8,15})/i,
    fecha: /fecha\s*y\s*hora\s*:?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i,
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
  {
    banco: 'GANADERO',
    nombre: 'Banco Ganadero',
    // Comprobante "Pago QR" del Banco Ganadero (distinto al de Yasta): encabezado
    // "BANCO GANADERO" + "¡Pago QR exitoso!" (el "¡" lo lee como "i").
    deteccion: [/banco\s+ganadero/i, /pago\s*qr\s*exitoso/i],
    // El OCR NO lee el "Bs" (va en verde, otra fuente): el monto es el número
    // grande justo debajo de "Pago QR exitoso" -> se ancla a esa palabra.
    monto: /exitoso[!¡\s]*(?:bs\.?\s*)?([\d.,]+)/i,
    montoRespaldo: /\bbs\.?\s*([\d.,]+)/i,
    transaccion: /nro\.?\s*:?\s*(\d{6,20})/i,
    // "4 de Mayo, 2026 a las 08:47"  (mes en palabra, con "de" antes)
    fechaTexto: /(\d{1,2})\s+de\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*,?\s+(?:de\s+)?(\d{4})/i,
    motivo: /(?:motivo|glosa|referencia)\s*:?\s*(.{2,45}?)(?:\s{2,}|$)/i,
    // El destinatario real es la CUENTA DE DESTINO (no el comercio del encabezado).
    destinatario: /cuenta\s+de\s+destino\s*:?\s*(.{4,50}?)\s+banco\s+/i,
  },
]

// Titular por defecto de la cuenta receptora (respaldo si la clave
// 'ocr_titular_destino' no existe en la tabla configuracion).
const TITULAR_POR_DEFECTO = 'Dilan Rafael Arauco Paniagua'

// Evalúa TODOS los campos de una plantilla por separado (sin cortar en el
// primer fallo) para poder reportar exactamente qué falló en ESE banco.
// campos.X: true = extraído y válido, false = falló, null = el banco no lo tiene.
function evaluarPlantilla(p, texto, montoEsperado, hoy, titulares) {
  const r = {
    campos: { monto: false, transaccion: false, fecha: false, destino: false },
    monto: null, transaccionId: null, destinatario: '', fechaLeida: null, motivoEuphoria: false,
  }

  // Monto anclado a la etiqueta del banco (nunca "el número aparece en alguna
  // parte"), con tolerancia de centavo por el OCR.
  let m = texto.match(p.monto)
  if (!m && p.montoRespaldo) m = texto.match(p.montoRespaldo)
  if (m) r.monto = parsearMonto(m[1])
  r.campos.monto = r.monto !== null && Math.abs(r.monto - montoEsperado) <= 0.01

  // Número de transacción del campo propio del banco. Algunos (Unión) llegan con
  // el N° partido por el OCR ("...2566 03799"): se quitan los espacios internos.
  // Un N° REAL siempre tiene DÍGITOS: si lo capturado no tiene (ej. "CONSUMO"
  // tomado de "Referencia: Consumo Euphoria"), no es un N° de transacción.
  const t = texto.match(p.transaccion)
  if (t) {
    const tok = t[1].replace(/\s+/g, '').toUpperCase()
    if (/\d/.test(tok)) { r.transaccionId = tok; r.campos.transaccion = true }
  }

  // Fecha del comprobante: debe ser de hoy (numérica o en palabras según el banco)
  if (p.fecha) {
    const f = texto.match(p.fecha)
    if (f) {
      r.fechaLeida = `${f[1]}/${f[2]}/${f[3]}`
      r.campos.fecha = esFechaHoy(f[1], f[2], f[3], hoy)
    }
  } else if (p.fechaTexto) {
    const f = texto.match(p.fechaTexto)
    if (f) {
      const mesNum = MESES_ABREV[f[2].toLowerCase().slice(0, 3)]
      r.fechaLeida = `${String(f[1]).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}/${f[3]}`
      r.campos.fecha = mesNum ? esFechaHoy(f[1], mesNum, f[3], hoy) : false
    }
  }

  // Destino: el pago debe ser A NUESTRA CUENTA. Pasa si el motivo/referencia
  // dice "Consumo Euphoria" o si el destinatario es el titular configurado.
  // En bancos SIN motivo (Yape) solo cuenta el destinatario. Sin esto,
  // cualquiera subía el comprobante de un pago a otra cuenta.
  const motivoTexto = p.motivo ? (texto.match(p.motivo)?.[1] || '') : ''
  r.destinatario = (p.destinatario ? (texto.match(p.destinatario)?.[1] || '') : '').trim()
  r.motivoEuphoria = contieneConsumoEuphoria(motivoTexto)
  r.campos.destino = (!p.motivo && !p.destinatario)
    ? null
    : (r.motivoEuphoria || titulares.some(tt => coincideTitular(r.destinatario, tt)))

  return r
}

// Mensaje del PRIMER campo fallido, en el mismo orden en que el cliente ve
// los pasos (monto → transacción → fecha → destino).
function describirFallo(p, ev, montoEsperado, hoy) {
  if (ev.campos.monto === false) {
    return ev.monto === null
      ? `No pudimos leer el monto del comprobante ${p.nombre}. Sube una captura nítida.`
      : `El monto del comprobante ${p.nombre} es Bs. ${ev.monto.toFixed(2)} y no coincide con el monto ingresado (Bs. ${Number(montoEsperado).toFixed(2)}).`
  }
  if (ev.campos.transaccion === false) {
    return `No pudimos leer el número de transacción del comprobante ${p.nombre}. Sube la captura original completa, sin recortes.`
  }
  if (ev.campos.fecha === false) {
    if (!ev.fechaLeida) return `No pudimos leer la fecha del comprobante ${p.nombre}. Sube la captura completa donde se vea la fecha de la operación.`
    const dd = String(hoy.getDate()).padStart(2, '0')
    const mm = String(hoy.getMonth() + 1).padStart(2, '0')
    return `El comprobante ${p.nombre} tiene fecha ${ev.fechaLeida}: solo se aceptan transferencias de hoy (${dd}/${mm}/${hoy.getFullYear()}).`
  }
  const conMotivo = !!p.motivo
  return ev.destinatario
    ? `El comprobante ${p.nombre} muestra un pago a "${ev.destinatario}", que no es la cuenta de Euphoria.${conMotivo ? " Si pagaste a nuestra cuenta, pon 'Consumo Euphoria' en el motivo/glosa de la transferencia." : ''}`
    : `No pudimos verificar que el pago fue a la cuenta de Euphoria.${conMotivo ? " Pon 'Consumo Euphoria' en el motivo/glosa de la transferencia y sube la captura completa." : ' Sube la captura completa donde se vea el destinatario.'}`
}

/**
 * Analiza el texto OCR de un comprobante: IDENTIFICA EL BANCO primero y valida
 * los campos según la plantilla de ESE banco. Si ningún banco registrado
 * puntúa, delega en la validación genérica (analizarComprobanteFlexible).
 * No consulta la BD (la unicidad se valida en la ruta).
 *
 * @param {string} textoOCR  texto plano del OCR (con espacios normalizados)
 * @param {number} montoEsperado
 * @param {Date}   [hoy]      inyectable para pruebas
 * @param {object} [opciones] { titular: 'Nombre Del Titular|Otro Alias' }
 * @returns {{ok: boolean, banco: string|null, nombreBanco: string,
 *            campos: {monto: boolean|null, transaccion: boolean|null,
 *                     fecha: boolean|null, destino: boolean|null},
 *            monto?: number, transaccionId?: string, destinatario?: string,
 *            sinMotivo: boolean, validadoPor?: string, error?: string}}
 */
function analizarComprobante(textoOCR, montoEsperado, hoy = new Date(), opciones = {}) {
  const titulares = String(opciones.titular || TITULAR_POR_DEFECTO)
    .split('|').map(t => t.trim()).filter(Boolean)
  const texto = String(textoOCR || '').replace(/\s+/g, ' ')

  // 1. IDENTIFICAR EL BANCO emisor: candidatos por léxico, el de más puntos gana
  const candidatas = PLANTILLAS
    .map(p => ({ p, puntos: p.deteccion.filter(rx => rx.test(texto)).length }))
    .filter(c => c.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)

  // Banco NO registrado: validación GENÉRICA con campos preestablecidos, sin
  // exigirle las etiquetas de una plantilla que no le corresponde.
  if (!candidatas.length) return analizarComprobanteFlexible(textoOCR, montoEsperado, opciones)

  // 2. Banco identificado: validar los campos SEGÚN SU plantilla. Si varios
  //    bancos puntúan (léxico compartido, ej. "Banco Ganadero" como destino),
  //    gana el primero cuyos campos validan completos; si ninguno, se reportan
  //    los fallos del más probable. NUNCA se cae a la genérica: el cliente
  //    debe ver exactamente qué falló en SU banco.
  const evaluadas = candidatas.map(({ p }) => ({ p, ev: evaluarPlantilla(p, texto, montoEsperado, hoy, titulares) }))
  const esValida = ({ ev }) => Object.values(ev.campos).every(v => v !== false)
  const { p, ev } = evaluadas.find(esValida) || evaluadas[0]

  const resultado = {
    ok: Object.values(ev.campos).every(v => v !== false),
    banco: p.banco,
    nombreBanco: p.nombre,
    campos: ev.campos,
    monto: ev.monto ?? undefined,
    transaccionId: ev.transaccionId || undefined,
    destinatario: ev.destinatario || undefined,
    sinMotivo: !p.motivo, // el front etiqueta 'destino' como "Destinatario correcto" en bancos sin motivo (Yape)
  }
  if (resultado.ok) resultado.validadoPor = ev.motivoEuphoria ? 'motivo' : 'destinatario'
  else resultado.error = describirFallo(p, ev, montoEsperado, hoy)
  return resultado
}

// ---- VALIDACIÓN GENÉRICA para bancos NO registrados (banco: null) -----------
// Robusta al ruido del OCR de fotos: no exige la plantilla de ningún banco,
// valida los campos preestablecidos buscándolos en TODO el texto (tolerando
// que el OCR lea las etiquetas un poco distinto):
//   1. Destino: referencia "Consumo Euphoria" O destinatario = titular configurado
//   2. El MONTO ingresado aparece junto a "Bs"/"monto"/"suma"
//   3. Un N° de transacción CON DÍGITOS (la unicidad se valida en la ruta)
// No valida fecha (no conoce el formato del banco): campos.fecha = null y ese
// paso se omite en el front. Devuelve la MISMA forma que analizarComprobante.

// ¿Aparece el monto esperado, ligado a una etiqueta de importe (no a una cuenta/fecha)?
function montoAparece(texto, montoEsperado) {
  const rx = /(?:bs\.?|monto|importe|suma\s+de|total(?:\s+pagado)?)\s*:?\s*(?:bs\.?)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi
  let m
  while ((m = rx.exec(texto)) !== null) {
    const v = parsearMonto(m[1])
    if (v !== null && Math.abs(v - montoEsperado) <= 0.01) return true
  }
  return false
}

// Extrae un N° de transacción (con dígitos): primero cerca de su etiqueta, si no,
// el token alfanumérico más largo con varios dígitos.
function extraerTransaccion(texto) {
  const rxEtiq = /(?:n[°ºo.]{0,3}\s*(?:de\s+)?(?:transacci[oó]n|operaci[oó]n|[oó]rden)|bancarizaci[oó]n|comprobante\s*n[°ºo.]{0,3})\s*:?\s*#?\s*([a-z0-9-]{6,25})/gi
  let m
  while ((m = rxEtiq.exec(texto)) !== null) {
    const tok = m[1].toUpperCase()
    if (/\d/.test(tok)) return tok
  }
  // Orden inverso "Transacción N°: 12345 67890" (Banco Unión), con el N° partido
  // por el OCR: se juntan los dígitos quitando los espacios internos.
  const mTrail = texto.match(/transacci[oó]n\s+n?[e°ºo]?\s*:?\s*(\d[\d\s]{5,30}\d)/i)
  if (mTrail) {
    const tok = mTrail[1].replace(/\s+/g, '').toUpperCase()
    if (/\d/.test(tok)) return tok
  }
  const tokens = (texto.match(/[a-z0-9-]{8,25}/gi) || [])
    .map(t => t.toUpperCase())
    .filter(t => (t.match(/\d/g) || []).length >= 4)
    .sort((a, b) => b.length - a.length)
  return tokens[0] || null
}

function analizarComprobanteFlexible(textoOCR, montoEsperado, opciones = {}) {
  const titulares = String(opciones.titular || TITULAR_POR_DEFECTO)
    .split('|').map(t => t.trim()).filter(Boolean)
  const texto = String(textoOCR || '').replace(/\s+/g, ' ')

  // Cada campo se evalúa por separado para mostrarle al cliente qué falló.
  const tieneReferencia = contieneConsumoEuphoria(texto)
  const destinatarioOk = titulares.some(t => coincideTitular(texto, t))
  const montoOk = montoAparece(texto, montoEsperado)
  const transaccionId = extraerTransaccion(texto)

  const campos = {
    monto: montoOk,
    transaccion: !!transaccionId,
    fecha: null, // la genérica no valida fecha (no conoce el formato del banco)
    destino: tieneReferencia || destinatarioOk,
  }
  const resultado = {
    ok: Object.values(campos).every(v => v !== false),
    banco: null,
    nombreBanco: 'tu banco',
    campos,
    monto: montoOk ? Number(montoEsperado) : undefined,
    transaccionId: transaccionId || undefined,
    sinMotivo: false, // la genérica sí acepta motivo/glosa ("Consumo Euphoria")
  }
  if (resultado.ok) {
    resultado.validadoPor = tieneReferencia ? 'referencia' : 'destinatario'
    return resultado
  }
  // Mensaje del PRIMER campo fallido, en el mismo orden de los pasos del cliente.
  if (!montoOk) resultado.error = `El monto no coincide: no encontramos Bs ${Number(montoEsperado).toFixed(2)} en el comprobante.`
  else if (!transaccionId) resultado.error = 'No pudimos leer el N° de transacción. Toma la foto completa y nítida.'
  else resultado.error = 'El pago no es a la cuenta de Euphoria (no vimos "Consumo Euphoria" ni el titular). Sube la captura completa y nítida.'
  return resultado
}

module.exports = { analizarComprobante, analizarComprobanteFlexible, parsearMonto, coincideTitular, contieneConsumoEuphoria, TITULAR_POR_DEFECTO }
