import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker and keeps the installed app current. It checks for a new
 * version at launch and every time the app comes back to the foreground. A new version
 * waits until the app goes to the background (another app, a locked screen), and only then
 * takes over and reloads, so nothing a parent is typing is lost mid-way.
 */
export function registerAppUpdates(): void {
  let waiting = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      waiting = true;
    },
    onRegisteredSW(_scriptUrl, registration) {
      if (registration === undefined) {
        return;
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update();
        }
      });
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (waiting && document.visibilityState === 'hidden') {
      waiting = false;
      void updateSW(true);
    }
  });
}
