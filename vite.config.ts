import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    strictPort: true,
    allowedHosts: true,
    hmr: false
  },
  build: {
    chunkSizeWarningLimit: 2000
  }
});
