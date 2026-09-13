import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks only to this server; /api and /auth are
// proxied to the backend so cookies and the magic-link Origin check see one
// origin (http://localhost:5173 = APP_BASE_URL in the backend's .env).
const backend = process.env.BACKEND_URL ?? 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': backend,
      '/auth': backend,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
