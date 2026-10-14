/**
 * Tells every screen holding a list of items that one was just changed in this app, so a
 * list opened while the change was still being saved (going back from an item's page right
 * away) shows it too, without waiting for the server to report it.
 */
const listeners = new Set<() => void>();

/** Tells every list but `own`, the one that made the change and reloads by itself. */
export function announceItemsChanged(own?: () => void): void {
  listeners.forEach((listener) => {
    if (listener !== own) {
      listener();
    }
  });
}

export function onItemsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const returnListeners = new Set<() => void>();

/** Called when the app comes back to the foreground, or a new day begins. */
export function onAppReturn(listener: () => void): () => void {
  returnListeners.add(listener);
  return () => {
    returnListeners.delete(listener);
  };
}

function refreshEverything(): void {
  announceItemsChanged();
  returnListeners.forEach((listener) => {
    listener();
  });
}

/**
 * Keeps what is shown current without a manual refresh: everything is fetched again when the
 * app comes back to the foreground (what the other parent changed meanwhile, in any part of
 * the app), and at midnight, so yesterday's "today" becomes late on time.
 */
export function refreshOnReturnAndAtMidnight(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshEverything();
    }
  });
  const scheduleMidnight = (): void => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    window.setTimeout(() => {
      refreshEverything();
      scheduleMidnight();
    }, midnight.getTime() - now.getTime());
  };
  scheduleMidnight();
}
