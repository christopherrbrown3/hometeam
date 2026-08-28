import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const requestedBasePath = process.env.VITE_APP_BASE_PATH ?? process.env.VITE_BASE_PATH ?? '/'
const basePath =
  requestedBasePath === '' || requestedBasePath === '/'
    ? '/'
    : `${requestedBasePath.replace(/\/+$/, '')}/`

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      filename: 'service-worker.ts',
      includeAssets: [
        'apple-touch-icon.png',
        'favicon.svg',
        'icons/app-icon.svg',
        'icons/maskable-icon.svg',
        'manifest.webmanifest',
      ],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: false,
      registerType: 'prompt',
      srcDir: 'src/features/pwa',
      strategies: 'injectManifest',
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
