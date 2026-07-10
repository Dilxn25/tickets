import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true, // Expone la red local para pruebas en móvil
    // Permite abrir la app desde túneles (localtunnel/ngrok) para probar en el celular
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true
      }
    }
  },
  // 'vite preview' sirve la build de producción (rápida y estable por túnel).
  preview: {
    host: true,
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:3000', ws: true }
    }
  }
})
