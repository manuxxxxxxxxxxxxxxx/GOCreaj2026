import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // .nip.io: permite abrir el dev server como http://<ip-lan>.nip.io:5173 (Google no
    // acepta una IP cruda como "Authorized JavaScript origin"), aunque Google además exige
    // https salvo en localhost, así que el login solo funciona vía el túnel de abajo.
    // .trycloudflare.com / .ngrok-free.dev / .ngrok-free.app: hosts de túneles (cloudflared / ngrok)
    // que dan https real sin certificado autofirmado.
    allowedHosts: ['.nip.io', '.trycloudflare.com', '.ngrok-free.dev', '.ngrok-free.app'],
    headers: {
      // Por defecto el navegador puede aislar la pestaña (COOP) y bloquear el postMessage
      // que el popup de Google usa para devolver la sesión iniciada -- "same-origin-allow-popups"
      // mantiene el aislamiento pero permite esa comunicación con popups que nosotros abrimos.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
