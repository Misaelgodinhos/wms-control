import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site is hosted under /wms-control/.
export default defineConfig({
  base: '/wms-control/',
  plugins: [react()],
})
