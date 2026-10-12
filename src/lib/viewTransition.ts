import { flushSync } from 'react-dom';

/** The name shared by the "everything" circle in the carousel and in the header. */
export const everythingTransitionName = 'everything';

/**
 * Runs a state change as a view transition, so an element with the same transition name
 * flies from where it was to where it is now. Without support, or when the device asks
 * for less motion, the change simply happens.
 */
export function withViewTransition(update: () => void): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('startViewTransition' in document)) {
    update();
    return;
  }
  document.startViewTransition(() => {
    flushSync(update);
  });
}
