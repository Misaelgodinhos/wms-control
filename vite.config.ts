import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project-site URL: https://misaelgodinhos.github.io/wms-control/
export default defineConfig({
  base: '/wms-control/',
  plugins: [react()],
})
