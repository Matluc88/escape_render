import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  
  // 🔧 Proxy per sviluppo: simula il comportamento di produzione (Nginx)
  // Tutte le chiamate /api vengono redirette al backend Docker su localhost:8001
  server: {
    port: 5173, // Porta fissa per Vite (evita cambio porta casuale)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] ${req.method} ${req.url} → ${options.target}${req.url.replace('/api', '')}`)
          })
        }
      }
    }
  },
  
  resolve: {
    alias: {
      'mqtt': path.resolve(__dirname, 'node_modules/mqtt/dist/mqtt.esm.js')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
