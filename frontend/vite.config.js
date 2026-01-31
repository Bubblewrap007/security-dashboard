import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'https://security-dashboard-production.up.railway.app',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
