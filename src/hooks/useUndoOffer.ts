import { useSyncExternalStore } from 'react';

/** A change just made that can still be taken back, for a few seconds. */
export type UndoOffer = {
  readonly id: number;
  readonly text: string;
  readonly undo: () => void;
};

/** How long the offer to take a change back stays on screen. */
const offerMs = 5000;

let current: UndoOffer | null = null;
let nextId = 1;
let timer: number | undefined;
const listeners = new Set<() => void>();

function publish(offer: UndoOffer | null): void {
  current = offer;
  listeners.forEach((listener) => {
    listener();
  });
}

/** Shows "undo" for a change just made; a newer change replaces an older offer. */
export function offerUndo(text: string, undo: () => void): void {
  window.clearTimeout(timer);
  const offer = { id: nextId, text, undo };
  nextId += 1;
  publish(offer);
  timer = window.setTimeout(() => {
    if (current?.id === offer.id) {
      publish(null);
    }
  }, offerMs);
}

/** Takes the offered change back, once, and hides the offer. */
export function takeUndo(): void {
  const offer = current;
  window.clearTimeout(timer);
  publish(null);
  offer?.undo();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The change that can be taken back right now, if any. Kept apart from page state, as one. */
export function useUndoOffer(): UndoOffer | null {
  return useSyncExternalStore(subscribe, () => current);
}
