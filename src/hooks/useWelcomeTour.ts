import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';

/** A new name for each new version of the tour, so everyone sees what changed once. */
const storageKey = 'mishkan.tourSeen.v2';

function seenBefore(): boolean {
  try {
    return window.localStorage.getItem(storageKey) === 'yes';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(storageKey, 'yes');
  } catch {
    // Storage can be blocked (private mode); the tour may then show again next time.
  }
}

export type UseWelcomeTour = {
  readonly open: boolean;
  readonly close: () => void;
};

/**
 * The short tour shown the first time the app opens on a device, and again when
 * asked for from settings (the address then carries `?tour=1`).
 */
export function useWelcomeTour(): UseWelcomeTour {
  const [searchParams, setSearchParams] = useSearchParams();
  const [seen, setSeen] = useState(seenBefore);
  const asked = searchParams.get('tour') === '1';

  const close = useCallback((): void => {
    markSeen();
    setSeen(true);
    if (asked) {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete('tour');
          return next;
        },
        { replace: true },
      );
    }
  }, [asked, setSearchParams]);

  return { open: !seen || asked, close };
}
