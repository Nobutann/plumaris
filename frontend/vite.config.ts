import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // No Docker em Windows/macOS o container não recebe eventos de arquivo; o polling mantém o recarregamento automático.
    watch: process.env.VITE_WATCH_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8080',
    },
  },
})
