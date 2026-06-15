import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    watch: {
      // Polling is required on Windows + Docker volume mounts to prevent
      // endless HMR reloads caused by Docker's file-event noise
      usePolling: true,
      interval: 1000,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
