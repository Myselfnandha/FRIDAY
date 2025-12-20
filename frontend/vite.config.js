import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
