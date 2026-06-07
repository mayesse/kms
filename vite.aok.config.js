import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist-aok',
    rollupOptions: {
      input: 'aok-index.html',
    },
  },
  plugins: [react()],
})
