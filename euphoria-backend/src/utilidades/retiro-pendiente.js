// EUPHORIA — Bloqueo de gasto mientras hay un RETIRO de saldo pendiente.
// Cuando el cliente pide retirar su saldo, el cajero le va a entregar ese dinero.
// Si entre medio el cliente sigue pagando pedidos o reservas, el monto a devolver
// ya no coincide con lo que queda en la billetera (se vio un caso: solicitó 8670
// y al momento de pagar solo quedaban 3527). Por eso, con una solicitud pendiente
// no se puede pagar ni reservar: o espera al cajero, o cancela la solicitud.
const prisma = require('../config/base-de-datos')

async function bloqueoPorRetiroPendiente(id_usuario) {
  const pendiente = await prisma.solicitud_retiro.findFirst({
    where: { id_cliente: id_usuario, estado: 'pendiente' },
    select: { id_solicitud: true, saldo_al_solicitar: true, fecha: true },
  })
  if (!pendiente) return null
  return {
    error: 'Tienes una solicitud de retiro de saldo pendiente. Mientras el cajero la atiende no puedes pagar ni reservar; si prefieres seguir usando tu saldo, cancela la solicitud desde tu billetera.',
    retiro_pendiente: true,
    id_solicitud: pendiente.id_solicitud,
  }
}

module.exports = { bloqueoPorRetiroPendiente }
