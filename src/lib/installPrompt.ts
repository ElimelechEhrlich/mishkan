/**
 * The browser's own offer to install the site as an app (Chrome on Android and computers), kept
 * from when the page opens, so a button can show it when the parent asks.
 */
let offer: Event | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/** Starts keeping the offer; called once, as the app opens. */
export function listenForInstallOffer(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Kept for the button, rather than the browser's own bar.
    event.preventDefault();
    offer = event;
    tell();
  });
  window.addEventListener('appinstalled', () => {
    offer = null;
    tell();
  });
}

/** Whether the browser offers to install the app now. */
export function installOffered(): boolean {
  return offer !== null;
}

export function onInstallOfferChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shows the browser's offer to install; it is used once. */
export function showInstallOffer(): void {
  const prompt: unknown = offer === null ? null : Reflect.get(offer, 'prompt');
  if (offer !== null && typeof prompt === 'function') {
    Reflect.apply(prompt, offer, []);
    offer = null;
    tell();
  }
}
