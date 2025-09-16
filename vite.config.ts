// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Hinweis: Der Proxy unten erlaubt im DEV (npm run dev) Abrufe von
// https://thehiddenveggies.com/... über /proxy/... (CORS umgehen).

export default defineConfig({
  base: '/rezept-pwa/', // wichtig für GitHub Pages
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Rezept PWA',
        short_name: 'Rezepte',
        description: 'Progressive Web App zur Rezeptverwaltung',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/rezept-pwa/',
        scope: '/rezept-pwa/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        screenshots: [
          { src: '/screenshot.png', sizes: '1200x630', type: 'image/png', form_factor: 'wide' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      devOptions: { enabled: true, suppressWarnings: true }
    })
  ],
  server: {
    proxy: {
      // Nur für DEV. Ruft https://thehiddenveggies.com/<pfad> ab.
      '/proxy': {
        target: 'https://thehiddenveggies.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, '')
      }
    }
  }
})
