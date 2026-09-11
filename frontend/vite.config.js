import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import demoMock from './vite.demo-mock.js'

export default defineConfig({
  plugins: [react(), demoMock()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})