<template>
  <!-- Clientes de mis mesas que ya entraron con algo pagado esperando: el mesero se
       acerca, les pregunta y confirma por ellos (o el cliente lo hace desde su app). -->
  <section v-if="lista.length" class="pc">
    <header class="pc-cab">
      <span class="pc-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </span>
      <b>Acércate a preguntar</b>
      <span class="pc-n">{{ lista.length }}</span>
    </header>

    <article v-for="c in lista" :key="c.id_entrada" class="pc-cli" :class="{ nuevo: nuevos.has(c.id_entrada) }">
      <div class="pc-quien">
        <span class="pc-mesa">{{ c.mesa || 'Mesa' }}</span>
        <span class="pc-nombre">{{ c.cliente }}</span>
        <span v-if="c.es_vip" class="pc-vip">VIP</span>
      </div>

      <div v-for="p in c.pedidos" :key="p.id_comanda" class="pc-pedido">
        <p class="pc-items">
          <span v-if="p.es_cortesia" class="pc-tag">Cortesía</span>
          {{ p.items.map(i => `${i.cantidad}× ${i.nombre}`).join(' · ') }}
        </p>
        <div class="pc-acciones">
          <button type="button" class="pc-btn principal" :disabled="procesando === p.id_comanda" @click="$emit('confirmar', p, 'llevar')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M6 12v7M18 12v7"></path></svg>
            Lo llevo a la mesa
          </button>
          <button type="button" class="pc-btn" :disabled="procesando === p.id_comanda" @click="$emit('confirmar', p, 'barra')">
            Recoge en barra
          </button>
        </div>
      </div>

      <p v-if="c.cortesia_pendiente" class="pc-cortesia">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line></svg>
        Tiene un combo de cortesía sin elegir: que lo elija en su app, en Mis reservas.
      </p>
    </article>
  </section>
</template>

<script setup>
defineProps({
  lista: { type: Array, default: () => [] },
  procesando: { type: [Number, null], default: null },
  nuevos: { type: Set, default: () => new Set() },
})
defineEmits(['confirmar'])
</script>

<style scoped>
.pc {
  margin-bottom: 12px; padding: 12px; border-radius: var(--radio-md);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(236, 72, 153, 0.08));
  border: 1px solid rgba(245, 158, 11, 0.45);
}
.pc-cab { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--texto-principal); }
.pc-ico { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: rgba(245, 158, 11, 0.2); color: #f59e0b; flex: none; }
.pc-cab b { font-size: 0.92rem; flex: 1; }
.pc-n { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; display: grid; place-items: center; font-size: 0.75rem; font-weight: 800; background: #f59e0b; color: #1a1033; }
.pc-cli { padding: 10px; border-radius: 12px; background: var(--fondo-tarjeta); border: 1px solid var(--borde-sutil); }
.pc-cli + .pc-cli { margin-top: 8px; }
.pc-cli.nuevo { animation: pcNuevo 1.1s ease-in-out 4; }
@keyframes pcNuevo { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } 50% { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.35); } }
.pc-quien { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.pc-mesa { min-width: 40px; height: 28px; padding: 0 8px; border-radius: 8px; display: grid; place-items: center; font-weight: 800; font-size: 0.85rem; color: #fff; background: var(--gradiente-marca); flex: none; }
.pc-nombre { font-weight: 700; font-size: 0.9rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-vip { font-size: 0.64rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.pc-pedido { padding: 8px 0; border-top: 1px dashed var(--borde-sutil); }
.pc-items { margin: 0 0 8px; font-size: 0.82rem; color: var(--texto-secundario); line-height: 1.4; }
.pc-tag { display: inline-block; font-size: 0.64rem; font-weight: 800; padding: 1px 6px; margin-right: 4px; border-radius: 6px; background: rgba(34, 197, 94, 0.16); color: var(--color-exito); }
.pc-acciones { display: flex; gap: 6px; flex-wrap: wrap; }
.pc-btn {
  flex: 1; min-width: 120px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 10px; cursor: pointer;
  border-radius: 10px; font-weight: 700; font-size: 0.8rem; background: transparent; color: var(--texto-principal); border: 1px solid var(--borde-activo);
}
.pc-btn.principal { background: var(--gradiente-marca); border-color: transparent; color: #fff; }
.pc-btn:disabled { opacity: 0.6; cursor: wait; }
.pc-cortesia { display: flex; align-items: flex-start; gap: 6px; margin: 6px 0 0; font-size: 0.78rem; color: var(--color-exito); }
.pc-cortesia svg { flex: none; margin-top: 2px; }
</style>
