import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      // Adds the handlers that show reminders sent by web push.
      workbox: { importScripts: ['push-sw.js'] },
      manifest: {
        name: 'משכן',
        short_name: 'משכן',
        description: 'ניהול הבית והמשימות',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        start_url: '/',
        background_color: '#f6f1e7',
        theme_color: '#f6f1e7',
        shortcuts: [
          { name: 'פריט חדש', url: '/?new=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'להשלמה', url: '/incomplete', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'יעדים', url: '/goals', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'חובות', url: '/debts', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
