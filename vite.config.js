import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{js,jsx}'],
  },
  build: {
    // Mermaid's rare diagram renderers are lazy-loaded and can be large after
    // minification; keep warnings for chunks that exceed the known graph modules.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('/node_modules/katex/')) {
            return 'vendor-katex'
          }

          if (id.includes('/node_modules/highlight.js/')) {
            return 'vendor-highlight'
          }

          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'vendor-react'
          }

          return undefined
        },
      },
    },
  },
  base: '/prompty/', // GitHub Pages 部署路径，如果仓库名不同需要修改
})
