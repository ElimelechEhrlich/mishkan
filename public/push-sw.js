// Loaded into the service worker that vite-plugin-pwa generates (workbox importScripts).
// Shows reminders that arrive by web push, and opens the item when one is tapped. A
// reminder of an item has two buttons: open it, or choose when to be reminded again.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'משכן', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: { url: data.url || '/', itemId: data.itemId || null },
      ...(data.itemId
        ? {
            actions: [
              { action: 'open', title: 'פתח' },
              { action: 'snooze', title: 'הזכר שוב' },
            ],
          }
        : {}),
      // A newer notice of the same kind (such as the evening nudge) replaces the older one.
      ...(data.tag ? { tag: data.tag, renotify: true } : {}),
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  // "Remind me again" opens the item with the choice of how long to wait.
  const url =
    event.action === 'snooze' && data.itemId ? `/item/${data.itemId}?snooze=1` : data.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
