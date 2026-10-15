import { registerSW } from 'virtual:pwa-register';

/** How long after opening a new version may still take over at once. */
const launchWindowMs = 15000;

/** Whether a field is being written in. */
function typing(): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
}

/**
 * Registers the service worker and keeps the installed app current. It checks for a new
 * version at launch and every time the app comes back to the foreground. A new version
 * found in the first seconds after the app opens (or is refreshed) takes over at once, before
 * anything is typed. One found later waits until the app goes to the background (another app,
 * a locked screen), and only then takes over and reloads, so nothing a parent is typing is
 * lost mid-way.
 */
export function registerAppUpdates(): void {
  const openedAt = Date.now();
  let waiting = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (Date.now() - openedAt < launchWindowMs && !typing()) {
        void updateSW(true);
        return;
      }
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
