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
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'hometeam-invite-preview.png'],
      manifest: {
        name: 'HomeTeam',
        short_name: 'HomeTeam',
        description: 'Shared household tasks, without the back-and-forth.',
        theme_color: '#00753a',
        background_color: '#082415',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: basePath,
        scope: basePath,
        id: basePath,
        categories: ['productivity', 'lifestyle'],
        icons: [
          {
            src: `${basePath}pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${basePath}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `${basePath}pwa-maskable-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: `${basePath}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
