import { defineStore } from 'pinia'
import { ref } from 'vue'

// Sistema central de avisos de Euphoria. Reemplaza a alert()/confirm()/prompt()
// con UI propia y elegante. Expone:
//   - notificar/exito/error/advertencia/info  -> toasts autodescartables
//   - confirmar(opts)  -> Promise<boolean>     (reemplaza confirm)
//   - solicitar(opts)  -> Promise<valor|null>  (reemplaza prompt, con validación)
let contador = 0

export const useNotificaciones = defineStore('notificaciones', () => {
  const toasts  = ref([])
  const dialogo = ref(null)

  function notificar(mensaje, tipo = 'info', opciones = {}) {
    const id = ++contador
    const duracion = opciones.duracion ?? 4000
    toasts.value.push({ id, mensaje, tipo, titulo: opciones.titulo || '' })
    if (duracion > 0) setTimeout(() => descartar(id), duracion)
    return id
  }
  const exito       = (m, o) => notificar(m, 'exito', o)
  const error       = (m, o) => notificar(m, 'error', o)
  const advertencia = (m, o) => notificar(m, 'advertencia', o)
  const info        = (m, o) => notificar(m, 'info', o)

  function descartar(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  // Modal de confirmación (sí/no). Devuelve Promise<boolean>.
  function confirmar(opciones = {}) {
    return new Promise(resolver => {
      dialogo.value = {
        modo: 'confirm',
        titulo:         opciones.titulo || '¿Confirmar acción?',
        mensaje:        opciones.mensaje || '',
        variante:       opciones.variante || (opciones.peligro ? 'peligro' : 'normal'),
        textoConfirmar: opciones.textoConfirmar || 'Confirmar',
        textoCancelar:  opciones.textoCancelar || 'Cancelar',
        resolver,
      }
    })
  }

  // Modal con un campo de entrada (reemplaza prompt). Devuelve Promise<valor|null>.
  // opciones.validar(valor) puede devolver un string de error para bloquear el envío.
  function solicitar(opciones = {}) {
    return new Promise(resolver => {
      dialogo.value = {
        modo: 'input',
        titulo:         opciones.titulo || '',
        mensaje:        opciones.mensaje || '',
        variante:       opciones.variante || 'advertencia',
        etiqueta:       opciones.etiqueta || '',
        placeholder:    opciones.placeholder || '',
        tipoInput:      opciones.tipoInput || 'text',
        prefijo:        opciones.prefijo || '',
        valorInicial:   opciones.valorInicial ?? '',
        textoConfirmar: opciones.textoConfirmar || 'Aplicar',
        textoCancelar:  opciones.textoCancelar || 'Cancelar',
        validar:        opciones.validar || null,
        resolver,
      }
    })
  }

  // Resuelve el diálogo activo y lo cierra. valor = boolean (confirm) o valor/null (input).
  function responderDialogo(valor) {
    if (!dialogo.value) return
    const resolver = dialogo.value.resolver
    dialogo.value = null
    resolver(valor)
  }

  return {
    toasts, dialogo,
    notificar, exito, error, advertencia, info, descartar,
    confirmar, solicitar, responderDialogo,
  }
})
