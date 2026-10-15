import { useEffect, useRef } from 'react';

/** A finger that moved less than this, in pixels, has not chosen a way yet. */
const slop = 10;
/** Sideways only when it moves this many times more across than up or down. */
const across = 1.5;
/** How far, in pixels, or how fast and how far, the finger must go to change the page. */
const distance = 70;
const flickSpeed = 0.5;
const flickDistance = 30;
/** Touches this close to a side of the screen belong to the phone's own back gesture. */
const edge = 20;

type Step = 1 | -1;

export type PageSwipe = {
  /** Whether there is a page to go to that way. */
  readonly canGo: (step: Step) => boolean;
  readonly onGo: (step: Step) => void;
};

/** Whether the touch is on something that takes a sideways finger itself, or on no page. */
function ownsTouch(target: EventTarget | null): boolean {
  if (!(target instanceof Element) || target.closest('main') === null) {
    return true;
  }
  if (
    target.closest(
      '[data-no-page-swipe], [role="dialog"], input, textarea, select, [contenteditable="true"]',
    ) !== null
  ) {
    return true;
  }
  // A row that scrolls sideways (the domains, the tabs) keeps its own swipe.
  for (let node: Element | null = target; node !== null; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowX;
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollWidth > node.clientWidth + 1) {
      return true;
    }
  }
  return false;
}

/**
 * Swiping the page sideways, anywhere on it, goes to the next or previous page; up and down
 * stays scrolling. The page follows the finger a little as it goes, and springs back. Not
 * while a sheet is open (the page behind it is held still), and not on what swipes itself.
 */
export function usePageSwipe(swipe: PageSwipe): void {
  const latest = useRef(swipe);
  latest.current = swipe;

  useEffect(() => {
    let start: { readonly x: number; readonly y: number; readonly at: number } | null = null;
    let sideways: boolean | null = null;
    let dx = 0;

    const page = (): HTMLElement | null => document.querySelector('main');
    const springBack = (): void => {
      const main = page();
      if (main === null || main.style.transform === '') {
        return;
      }
      main.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
      main.style.transform = '';
      main.style.opacity = '';
      window.setTimeout(() => {
        main.style.transition = '';
      }, 200);
    };
    const reset = (): void => {
      start = null;
      sideways = null;
      dx = 0;
      springBack();
    };

    const onStart = (event: TouchEvent): void => {
      const finger = event.touches[0];
      if (
        event.touches.length !== 1 ||
        finger === undefined ||
        finger.clientX < edge ||
        finger.clientX > window.innerWidth - edge ||
        // A sheet holds the page behind it still.
        document.documentElement.style.overflow === 'hidden' ||
        ownsTouch(event.target)
      ) {
        start = null;
        return;
      }
      start = { x: finger.clientX, y: finger.clientY, at: event.timeStamp };
      sideways = null;
      dx = 0;
    };

    const onMove = (event: TouchEvent): void => {
      const finger = event.touches[0];
      if (start === null || finger === undefined) {
        return;
      }
      dx = finger.clientX - start.x;
      const dy = finger.clientY - start.y;
      if (sideways === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < slop) {
          return;
        }
        sideways = Math.abs(dx) > Math.abs(dy) * across;
        if (!sideways) {
          start = null;
          return;
        }
      }
      const main = page();
      if (main !== null) {
        // Toward a page that is not there, it barely moves.
        const pull = latest.current.canGo(dx > 0 ? 1 : -1) ? 0.35 : 0.1;
        main.style.transition = '';
        main.style.transform = `translateX(${String(dx * pull)}px)`;
        main.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.3));
      }
    };

    const onEnd = (event: TouchEvent): void => {
      if (start !== null && sideways === true) {
        const step: Step = dx > 0 ? 1 : -1;
        const speed = Math.abs(dx) / Math.max(1, event.timeStamp - start.at);
        const far = Math.abs(dx) > distance || (speed > flickSpeed && Math.abs(dx) > flickDistance);
        if (far && latest.current.canGo(step)) {
          latest.current.onGo(step);
        }
      }
      reset();
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', reset, { passive: true });
    return (): void => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
      reset();
    };
  }, []);
}
