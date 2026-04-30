import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  resolve: {
    alias: { '@': '/src' },
  },
  optimizeDeps: {
    include: ['tweetnacl', 'tweetnacl-util', 'otplib', 'qrcode'],
    esbuildOptions: {
      target: 'es2020',
      define: { global: 'globalThis' },
    },
  },
  build: { target: 'es2020' },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/api':       { target: 'http://localhost:3001' },
    },
  },
})
