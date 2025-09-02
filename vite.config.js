import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // --- THIS IS THE CRITICAL ADDITION ---
      input: 'src/content.jsx',
      // --- END OF ADDITION ---
      output: {
        entryFileNames: `assets/content.js`,
        chunkFileNames: `assets/content-chunk.js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
    outDir: 'dist',
  },
})