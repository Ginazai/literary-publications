import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react()], server: { proxy: { '/wf': {
    target: env.VITE_WF_DEV_TARGET || 'http://localhost:8080', changeOrigin: true,
    rewrite: p => p.replace(/^\/wf/, '/api') } } } }
})
