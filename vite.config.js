import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Design storage backend (see /server). Proxying avoids needing CORS
      // config for local dev; production deploys would front both with a
      // real reverse proxy or set an absolute API base URL instead.
      '/api': 'http://localhost:3001',
      '/storage': 'http://localhost:3001',
    },
  },
})
