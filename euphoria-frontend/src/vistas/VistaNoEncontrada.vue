<template>
  <div class="vista-error fade-in">
    <div class="error-contenido">
      <div class="error-icono">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <h1 class="error-titulo">Acceso Denegado o Ruta No Encontrada</h1>
      <p class="error-descripcion">
        No tienes permisos para ver esta página o la ruta que introdujiste no existe en el sistema.
      </p>
      <button class="btn-regresar" @click="regresarAlMenu">
        Volver a mi menú principal
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTiendaAutenticacion } from '@/tiendas/tienda-autenticacion.js'

const router = useRouter()
const tienda = useTiendaAutenticacion()

function regresarAlMenu() {
  if (tienda.estaAutenticado) {
    router.push(`/${tienda.rolRuta}`)
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
.vista-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--fondo-app);
  padding: 1rem;
}
.error-contenido {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde-sutil);
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.error-icono {
  width: 64px;
  height: 64px;
  color: var(--color-error);
  margin: 0 auto 1.5rem auto;
}
.error-titulo {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--texto-principal);
  margin-bottom: 1rem;
  line-height: 1.3;
}
.error-descripcion {
  font-size: 0.95rem;
  color: var(--texto-secundario);
  margin-bottom: 2rem;
  line-height: 1.6;
}
.btn-regresar {
  background: var(--morado-brillante);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(155, 89, 182, 0.4);
}
.btn-regresar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(155, 89, 182, 0.6);
}
.btn-regresar:active {
  transform: translateY(0);
}
</style>
