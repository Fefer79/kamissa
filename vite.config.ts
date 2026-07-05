import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

// Cible : Android d'entrée de gamme, Chrome ≤ 2 ans, offline strict (cadrage C2/C3).
export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "kamissa — l'école dans la poche",
        short_name: 'kamissa',
        description: 'Apprendre à lire, écrire et compter — sans connexion.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FDF8EF',
        theme_color: '#2E3D96',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Phase 0 : tout est précaché, y compris le contenu de démonstration.
        // Phase 1 : le contenu passera en téléchargement par module (cadrage §4, C7).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,opus,webm}'],
        runtimeCaching: [
          {
            urlPattern: /\/content\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kamissa-contenu',
              expiration: { maxEntries: 500 },
            },
          },
        ],
      },
    }),
  ],
})
