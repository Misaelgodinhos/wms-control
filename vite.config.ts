import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset paths keep the app working when hosted under /wms-control/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
})
