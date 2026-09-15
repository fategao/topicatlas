import { defineConfig } from 'vite'
import { createVitePlugins, resolveBase } from './vite.plugins'

export default defineConfig({
  base: resolveBase(),
  plugins: createVitePlugins(),
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
