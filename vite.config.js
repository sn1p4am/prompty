import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/prompty/', // GitHub Pages 部署路径，如果仓库名不同需要修改
})
