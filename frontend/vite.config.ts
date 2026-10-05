import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  preview: {
    port: 443,
    host: true,
    allowedHosts: true,
  },
})
