import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version waits, and src/lib/pwa.ts applies it when the app is not in use.
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg'],
      // Adds the handlers that show reminders sent by web push.
      workbox: {
        importScripts: ['push-sw.js'],
        // The Android app and its link file are real files, not pages of the app.
        navigateFallbackDenylist: [/\.apk$/, /^\/\.well-known\//],
      },
      manifest: {
        name: 'משכן',
        short_name: 'משכן',
        description: 'כל ענייני הבית במקום אחד: משימות, יעדים, קניות, חובות, פתקים ותזכורות, משותף לשני ההורים.',
        id: '/',
        scope: '/',
        orientation: 'portrait',
        categories: ['productivity', 'lifestyle'],
        display_override: ['standalone', 'minimal-ui'],
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        start_url: '/',
        background_color: '#f6f1e7',
        theme_color: '#f6f1e7',
        // Long-pressing the app's icon (Android takes four at most); each can be dragged to the
        // home screen on its own.
        shortcuts: [
          { name: 'רשימת קניות', url: '/?new=shopping', icons: [{ src: 'icons/shortcut-shopping.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'פריט חדש', url: '/?new=1', icons: [{ src: 'icons/shortcut-new.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'שיחה', url: '/assistant', icons: [{ src: 'icons/shortcut-chat.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'היום', url: '/today', icons: [{ src: 'icons/shortcut-today.png', sizes: '192x192', type: 'image/png' }] },
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
