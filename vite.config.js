import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
});