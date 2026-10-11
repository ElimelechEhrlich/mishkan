import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker and keeps the installed app current:
 * it checks for a new version at launch and every time the app comes back
 * to the foreground, and reloads itself once a new version has taken over.
 */
export function registerAppUpdates(): void {
  registerSW({
    immediate: true,
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
}
