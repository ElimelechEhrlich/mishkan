import { useEffect, useLayoutEffect } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';
import { scopeDockProgress } from './useScopeDock';

type Kept = { readonly y: number; readonly midDock: boolean };

/** Where each page in the history was left, by its history entry. */
const kept = new Map<string, Kept>();

/** How many frames a restore waits for the page to grow tall enough. */
const restoreFrames = 30;

/**
 * Scrolls like a phone app: a new page opens at its top, and going back returns to where the
 * page was left. A page left while its entity's picture was on its way into the header comes
 * back at its top, so the picture is never seen stuck half way.
 */
export function useScrollMemory(): void {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    let frame = 0;
    const save = (): void => {
      frame = 0;
      const progress = scopeDockProgress();
      kept.set(location.key, { y: window.scrollY, midDock: progress > 0 && progress < 1 });
    };
    const follow = (): void => {
      if (frame === 0) {
        frame = requestAnimationFrame(save);
      }
    };
    window.addEventListener('scroll', follow, { passive: true });
    return (): void => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', follow);
    };
  }, [location.key]);

  useLayoutEffect(() => {
    const left = navigationType === NavigationType.Pop ? kept.get(location.key) : undefined;
    const target = left === undefined || left.midDock ? 0 : left.y;
    window.scrollTo(0, target);
    if (target === 0) {
      return;
    }
    // The page may still be filling in; wait until it is tall enough to scroll there.
    let tries = 0;
    let frame = 0;
    const settle = (): void => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, room));
      tries += 1;
      if (room < target && tries < restoreFrames) {
        frame = requestAnimationFrame(settle);
      }
    };
    frame = requestAnimationFrame(settle);
    return (): void => {
      cancelAnimationFrame(frame);
    };
  }, [location.key, navigationType]);
}
