import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const requestedBasePath = process.env.VITE_APP_BASE_PATH ?? process.env.VITE_BASE_PATH ?? '/'
const basePath =
  requestedBasePath === '' || requestedBasePath === '/'
    ? '/'
    : `${requestedBasePath.replace(/\/+$/, '')}/`

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
})
