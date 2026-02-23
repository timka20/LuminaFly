import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 27483,
    allowedHosts: ['luminafly.timka20.ru'],
    proxy: {
      '/api': {
        target: 'https://api.luminafly.timka20.ru',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})