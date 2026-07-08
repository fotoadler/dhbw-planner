/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Nur für die Web-Entwicklung: Rapla sendet keine CORS-Header, deshalb
    // proxied der Vite-Dev-Server Anfragen an /rapla/* zum echten Server.
    // In der nativen App (iOS/Android) läuft alles über CapacitorHttp — ohne Proxy.
    proxy: {
      '/rapla': {
        target: 'https://rapla.dhbw.de',
        changeOrigin: true,
        secure: true,
      },
      '/dualis': {
        target: 'https://dualis.dhbw.de',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/dualis/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
