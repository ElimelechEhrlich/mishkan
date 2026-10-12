import { useSyncExternalStore } from 'react';

/**
 * While the entity carousel turns, whether "everything" has gone up to the header; null at
 * rest, when the chosen entity decides. Kept apart from the household's shared state, so it
 * changing in the middle of a turn redraws only the carousel and the header button, never
 * the whole page, and no frame of the motion is held up.
 */
let everythingUp: boolean | null = null;
const listeners = new Set<() => void>();

export function setEverythingUp(up: boolean | null): void {
  if (everythingUp === up) {
    return;
  }
  everythingUp = up;
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useEverythingUp(): boolean | null {
  return useSyncExternalStore(subscribe, () => everythingUp);
}
