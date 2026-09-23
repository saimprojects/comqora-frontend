import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  if (process.env.VERCEL && loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL) {
    throw new Error(
      'Keep VITE_API_URL empty on Vercel; vercel.json provides the same-origin Railway proxy.',
    )
  }
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: { entries: ['index.html'] },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/sitemap': {
          target: 'http://127.0.0.1:8000',
          rewrite: (path) => `/api/public${path}`,
        },
        '/api': 'http://127.0.0.1:8000',
        '/admin': 'http://127.0.0.1:8000',
        '/static': 'http://127.0.0.1:8000',
      },
    },
  }
})
