import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const forAndroid = process.env.CAP_BUILD === '1';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [
    VitePWA({
      disable: forAndroid,
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Rota AWS · Estudos',
        short_name: 'Rota AWS',
        description: 'Estudos para a certificação AWS Solutions Architect Associate (SAA-C03): ciclo, pomodoro, aulas, questões e revisão.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e1117',
        theme_color: '#0e1117',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        globIgnores: ['aulas/**'],
        navigateFallbackDenylist: [/^\/aulas\//],
        runtimeCaching: [
          { urlPattern: /\/aulas\//, handler: 'NetworkFirst', options: { cacheName: 'aulas', networkTimeoutSeconds: 5 } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: 'CacheFirst', options: { cacheName: 'fontes', expiration: { maxEntries: 20 } } },
        ],
      },
    }),
  ],
});
