import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import { fileURLToPath } from 'url';

// Le renderer est chargé via file:// dans Electron : les chemins d'assets doivent être relatifs.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
    proxy: {
      '/api/boutica-cloud': {
        target: 'https://boutica-cloud.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/boutica-cloud/, ''),
        secure: false,
      },
    },
  },
});
