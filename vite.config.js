import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Important for Netlify/GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    host: true,
    port: 3000
  }
});