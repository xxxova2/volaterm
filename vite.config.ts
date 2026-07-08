import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.VITE_PORT) || 3000,
    proxy: {
      '/api': process.env.API_TARGET || 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
