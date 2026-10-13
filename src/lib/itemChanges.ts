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
