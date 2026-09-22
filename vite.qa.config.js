// Fixture-only visual QA. No backend proxy and no access to real workspace records.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
export default defineConfig(({ command }) => {
  if (command !== 'serve')
    throw new Error('Fixture preview is development-only. Build the real app with npm run build.')
  return {
    cacheDir: 'node_modules/.vite-qa',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'fixture-entry',
        transformIndexHtml: (html) => html.replace('/src/main.jsx', '/tests/preview.jsx'),
      },
    ],
    optimizeDeps: { entries: ['tests/preview.html'] },
    resolve: {
      alias: [
        {
          find: /^.*\/lib\/api(?:\.js)?$/,
          replacement: fileURLToPath(new URL('./tests/preview-api.js', import.meta.url)),
        },
        {
          find: /^.*\/AuthContext(?:\.jsx)?$/,
          replacement: fileURLToPath(new URL('./tests/preview-auth.jsx', import.meta.url)),
        },
      ],
    },
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
  }
})
