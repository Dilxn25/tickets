<template>
  <Teleport to="body">
    <!-- Pila de toasts -->
    <div class="notif-pila" role="status" aria-live="polite">
      <transition-group name="notif">
        <div
          v-for="t in notif.toasts"
          :key="t.id"
          class="notif-toast"
          :class="'notif-' + t.tipo"
          @click="notif.descartar(t.id)"
        >
          <span class="notif-icono" v-html="iconoTipo(t.tipo)" />
          <div class="notif-cuerpo">
            <p v-if="t.titulo" class="notif-titulo">{{ t.titulo }}</p>
            <p class="notif-msg">{{ t.mensaje }}</p>
          </div>
          <button class="notif-cerrar" aria-label="Cerrar" @click.stop="notif.descartar(t.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </transition-group>
    </div>

    <!-- Diálogo (confirmación / entrada) -->
    <transition name="dlg-fade">
      <div v-if="d" class="dlg-fondo" @click.self="cancelar">
        <div class="dlg" :class="'dlg-' + d.variante" role="dialog" aria-modal="true">
          <div class="dlg-icono" :class="'dlg-icono-' + d.variante" v-html="iconoDialogo(d.variante)" />
          <h3 v-if="d.titulo" class="dlg-titulo">{{ d.titulo }}</h3>
          <p v-if="d.mensaje" class="dlg-msg">{{ d.mensaje }}</p>

          <form v-if="d.modo === 'input'" class="dlg-form" @submit.prevent="aceptarInput">
            <label v-if="d.etiqueta" class="dlg-etiqueta">{{ d.etiqueta }}</label>
            <div class="dlg-campo-wrap">
              <span v-if="d.prefijo" class="dlg-prefijo">{{ d.prefijo }}</span>
              <input
                ref="inputRef"
                v-model="valor"
                :type="d.tipoInput"
                :placeholder="d.placeholder"
                class="dlg-campo"
                :class="{ 'con-prefijo': d.prefijo }"
                step="0.01"
                @input="errorLocal = ''"
              />
            </div>
            <p v-if="errorLocal" class="dlg-error">{{ errorLocal }}</p>
          </form>

          <div class="dlg-acciones">
            <button class="btn btn-secundario" @click="cancelar">{{ d.textoCancelar }}</button>
            <button
              class="btn"
              :class="d.variante === 'peligro' ? 'btn-peligro' : 'btn-primario'"
              @click="d.modo === 'input' ? aceptarInput() : notif.responderDialogo(true)"
            >{{ d.textoConfirmar }}</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useNotificaciones } from '@/tiendas/tienda-notificaciones.js'

const notif = useNotificaciones()
const d = computed(() => notif.dialogo)

const valor = ref('')
const errorLocal = ref('')
const inputRef = ref(null)

// Al abrirse un diálogo de entrada, precargar valor y enfocar el campo.
watch(d, async (nuevo) => {
  if (nuevo && nuevo.modo === 'input') {
    valor.value = nuevo.valorInicial ?? ''
    errorLocal.value = ''
    await nextTick()
    inputRef.value?.focus?.()
  }
})

function cancelar() {
  notif.responderDialogo(d.value?.modo === 'input' ? null : false)
}

function aceptarInput() {
  if (d.value?.validar) {
    const err = d.value.validar(valor.value)
    if (err) { errorLocal.value = err; return }
  }
  notif.responderDialogo(valor.value)
}

function iconoTipo(tipo) {
  const map = {
    exito:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>',
    error:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    advertencia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  }
  return map[tipo] || map.info
}
function iconoDialogo(variante) {
  if (variante === 'peligro') return iconoTipo('error')
  if (variante === 'advertencia') return iconoTipo('advertencia')
  return iconoTipo('info')
}
</script>

<style scoped>
/* ── Toasts ────────────────────────────────────────────────────────────── */
.notif-pila {
  position: fixed;
  top: 18px; right: 18px;
  z-index: 100000;
  display: flex; flex-direction: column; gap: 10px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}
.notif-toast {
  pointer-events: auto;
  display: flex; align-items: flex-start; gap: 11px;
  padding: 13px 14px;
  border-radius: var(--radio-lg, 14px);
  background: var(--fondo-tarjeta, #17141f);
  border: 1px solid var(--borde-sutil);
  border-left: 3px solid var(--c, #a855f7);
  box-shadow: 0 14px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05);
  backdrop-filter: blur(12px);
  cursor: pointer;
}
.notif-exito       { --c: #22c55e; }
.notif-error       { --c: #ef4444; }
.notif-advertencia { --c: #f59e0b; }
.notif-info        { --c: #a855f7; }

.notif-icono { flex-shrink: 0; width: 20px; height: 20px; color: var(--c); margin-top: 1px; }
.notif-icono :deep(svg) { width: 20px; height: 20px; }
.notif-cuerpo { flex: 1; min-width: 0; }
.notif-titulo { font-weight: 700; font-size: .86rem; color: var(--texto-principal); margin: 0 0 2px; }
.notif-msg { font-size: .84rem; line-height: 1.4; color: var(--texto-secundario); margin: 0; word-break: break-word; }
.notif-cerrar {
  flex-shrink: 0; background: none; border: none; cursor: pointer; padding: 0;
  width: 20px; height: 20px; color: var(--texto-desactivado);
  display: flex; align-items: center; justify-content: center;
  transition: color .15s ease;
}
.notif-cerrar:hover { color: var(--texto-principal); }
.notif-cerrar svg { width: 15px; height: 15px; }

.notif-enter-active { transition: transform .32s var(--ease-suave, cubic-bezier(.22,1,.36,1)), opacity .32s ease; }
.notif-leave-active { transition: transform .28s ease, opacity .28s ease; position: relative; }
.notif-enter-from { transform: translateX(120%); opacity: 0; }
.notif-leave-to   { transform: translateX(120%); opacity: 0; }

/* ── Diálogo ───────────────────────────────────────────────────────────── */
.dlg-fondo {
  position: fixed; inset: 0; z-index: 100001;
  background: rgba(0,0,0,.62); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; padding: 1.25rem;
}
.dlg {
  width: 100%; max-width: 400px;
  background: var(--fondo-tarjeta, #17141f);
  border: 1px solid var(--borde-sutil);
  border-radius: var(--radio-xl, 18px);
  padding: 1.6rem 1.5rem 1.35rem;
  text-align: center;
  box-shadow: 0 24px 70px rgba(0,0,0,.6);
}
.dlg-peligro     { border-top: 3px solid #ef4444; }
.dlg-advertencia { border-top: 3px solid #f59e0b; }
.dlg-normal      { border-top: 3px solid var(--morado-brillante, #a855f7); }

.dlg-icono {
  width: 50px; height: 50px; margin: 0 auto .9rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.dlg-icono :deep(svg) { width: 26px; height: 26px; }
.dlg-icono-peligro     { background: rgba(239,68,68,.14);  color: #ef4444; }
.dlg-icono-advertencia { background: rgba(245,158,11,.15); color: #f59e0b; }
.dlg-icono-normal      { background: rgba(168,85,247,.15); color: var(--morado-brillante, #a855f7); }

.dlg-titulo { font-size: 1.15rem; font-weight: 700; color: var(--texto-principal); margin: 0 0 .45rem; letter-spacing: -.01em; }
.dlg-msg { font-size: .9rem; line-height: 1.5; color: var(--texto-secundario); margin: 0 0 1.1rem; }

.dlg-form { text-align: left; margin-bottom: 1.1rem; }
.dlg-etiqueta { display: block; font-size: .8rem; font-weight: 600; color: var(--texto-secundario); margin-bottom: 6px; }
.dlg-campo-wrap { position: relative; display: flex; align-items: center; }
.dlg-prefijo { position: absolute; left: 12px; font-size: .9rem; font-weight: 600; color: var(--texto-secundario); pointer-events: none; }
.dlg-campo {
  width: 100%; padding: 11px 13px; min-height: 44px;
  background: var(--fondo-tarjeta-alt, rgba(255,255,255,.03));
  border: 1px solid var(--borde-sutil); border-radius: var(--radio-md, 10px);
  color: var(--texto-principal); font-family: inherit; font-size: .92rem;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.dlg-campo.con-prefijo { padding-left: 34px; }
.dlg-campo:focus { outline: none; border-color: var(--morado-brillante, #a855f7); box-shadow: 0 0 0 3px rgba(168,85,247,.22); }
.dlg-error { margin: 8px 0 0; font-size: .82rem; color: #f59e0b; font-weight: 600; }

.dlg-acciones { display: flex; gap: .7rem; }
.dlg-acciones .btn { flex: 1; }

.dlg-fade-enter-active, .dlg-fade-leave-active { transition: opacity .2s ease; }
.dlg-fade-enter-active .dlg, .dlg-fade-leave-active .dlg { transition: transform .24s var(--ease-suave, cubic-bezier(.22,1,.36,1)), opacity .24s ease; }
.dlg-fade-enter-from, .dlg-fade-leave-to { opacity: 0; }
.dlg-fade-enter-from .dlg, .dlg-fade-leave-to .dlg { transform: translateY(12px) scale(.97); opacity: 0; }

@media (max-width: 560px) {
  .notif-pila {
    top: auto;
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    right: 12px; left: 12px; width: auto;
  }
  .notif-toast { padding: 12px 13px; }
  .notif-titulo { font-size: .85rem; }
  .notif-msg { font-size: .82rem; }
  .notif-enter-from, .notif-leave-to { transform: translateY(140%); }
}
@media (prefers-reduced-motion: reduce) {
  .notif-enter-active, .notif-leave-active,
  .dlg-fade-enter-active, .dlg-fade-leave-active,
  .dlg-fade-enter-active .dlg, .dlg-fade-leave-active .dlg { transition: none; }
}
</style>
