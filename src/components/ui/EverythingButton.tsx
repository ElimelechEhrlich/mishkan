import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { everythingFlight } from '../../lib/flight';
import { entityTone } from '../../lib/lookups';
import { useEverythingUp } from '../../hooks/useEverythingUp';
import type { EverythingShortcut } from '../../hooks/useEverythingShortcut';
import { useScopeDock } from '../../hooks/useScopeDock';
import { ScopeAvatar } from '../entities/ScopeAvatar';
import { Icon } from './Icon';

type EverythingButtonProps = {
  readonly shortcut: EverythingShortcut;
};

/** How large the carousel's picture (104 pixels) is once docked in the header (44). */
export const dockedScale = 44 / 104;

/**
 * The place in the header next to the title. Once the carousel is past "everything", it
 * holds "everything", and tapping it goes straight back. As the page scrolls down the chosen
 * entity's picture comes up into this place, and "everything" gives way until the page is
 * back at the top; tapping the docked picture scrolls back up.
 */
export function EverythingButton({ shortcut }: EverythingButtonProps): ReactElement | null {
  const up = useEverythingUp() ?? shortcut.away;
  const dock = useScopeDock();
  if (!up && dock.progress === 0) {
    return null;
  }

  // Docked and held by the carousel itself: the place is kept free for it.
  if (dock.progress >= 1 && !dock.copy) {
    return <span aria-hidden className="me-1 block size-11 shrink-0" />;
  }

  if (dock.progress >= 1) {
    return (
      <button
        type="button"
        aria-label={labels.scope.backToTop}
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="relative me-1 block size-11 shrink-0 rounded-full active:opacity-80"
      >
        <span
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ scale: String(dockedScale) }}
        >
          <ScopeAvatar entity={dock.entity} tone={dock.tone ?? entityTone(0)} raised />
        </span>
      </button>
    );
  }

  // While the picture comes up, "everything" fades out of its way.
  const shown = up ? Math.max(0, 1 - dock.progress * 2) : 0;
  return (
    <button
      type="button"
      aria-label={labels.scope.toEverything}
      onClick={shortcut.go}
      data-flight={shown === 1 ? everythingFlight : undefined}
      disabled={shown === 0}
      className="me-1 block size-11 shrink-0 rounded-full active:opacity-80"
      style={{ opacity: shown }}
    >
      <span className="block rounded-full bg-surface p-0.5 shadow-raised">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="home" className="size-5" />
        </span>
      </span>
    </button>
  );
}
