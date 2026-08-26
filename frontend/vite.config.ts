import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Manga-dl1.png', 'favicon.svg'],
      manifest: {
        name: 'manga-dl',
        short_name: 'manga-dl',
        description: 'Read and download manga from 50+ sources — offline, free.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'Manga-dl1.png', sizes: '192x192', type: 'image/png' },
          { src: 'Manga-dl1.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Manga page images served via the backend image-proxy endpoint
            urlPattern: /\/manga\/image-proxy(\?|$)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'manga-images',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // DRM-descrambled images (comixto etc.)
            urlPattern: /\/manga\/descramble-proxy(\?|$)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'manga-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Downloaded chapter images from backend library
            urlPattern: /\/library\/image\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'library-images',
              expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            // API metadata calls (manga detail, library list, sources, users)
            urlPattern: /\/(manga|library|users|sources|downloads)\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
})
