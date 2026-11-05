// Validación de comprobantes ASÍNCRONA: el backend responde al instante con
// un id y el análisis corre en segundo plano (en Render el OCR tarda minutos
// y el proxy cortaba la petición a los ~100s — por eso "la imagen no es
// clara" aunque el comprobante estuviera perfecto). Aquí se hace polling
// cada 2.5s hasta el resultado.
//
// Devuelve el resultado {valido:true, pasos, url_comprobante, ...} o LANZA
// {error, pasos} si no validó — el mismo contrato que tenía la llamada
// síncrona, para no tocar a los consumidores.
import clienteHttp from '@/servicios-api/cliente-http.js'

const CADA_MS = 2500
const TOPE_MS = 5 * 60 * 1000 // tope duro: 5 minutos

export async function validarComprobanteAsync(formData, onEtapa) {
  const inicio = await clienteHttp.post('/comandas/validar-comprobante', formData)
  // Compatibilidad: si algún día vuelve síncrono, respetarlo
  if (inicio && inicio.pendiente !== true && inicio.valido !== undefined) {
    if (!inicio.valido) throw inicio
    return inicio
  }
  const id = inicio?.id_analisis
  if (!id) throw { error: 'No se pudo iniciar el análisis. Intenta de nuevo.' }

  const t0 = Date.now()
  while (Date.now() - t0 < TOPE_MS) {
    await new Promise(r => setTimeout(r, CADA_MS))
    let est
    try {
      est = await clienteHttp.get(`/comandas/validar-comprobante/${id}/estado`)
    } catch {
      continue // un tropiezo de red no cancela el análisis
    }
    if (est?.pendiente) {
      if (onEtapa && est.etapa) onEtapa(est.etapa)
      continue
    }
    if (est?.valido === false) throw est
    // El id viaja con el resultado: la recarga se pide con él, no con un monto.
    return { ...est, id_analisis: id }
  }
  throw { error: 'El análisis está tardando demasiado. Vuelve a intentar en un momento.' }
}
