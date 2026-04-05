import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** PostCSS loads Tailwind via `postcss.config.mjs` (more reliable than @tailwindcss/vite on some Windows setups). */
export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: false,
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
})
