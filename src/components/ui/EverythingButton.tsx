import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { everythingFlight } from '../../lib/flight';
import { useEverythingUp } from '../../hooks/useEverythingUp';
import type { EverythingShortcut } from '../../hooks/useEverythingShortcut';
import { Icon } from './Icon';

type EverythingButtonProps = {
  readonly shortcut: EverythingShortcut;
};

/**
 * "Everything" in the header, once the carousel is past it: tapping it goes straight back.
 * While the carousel turns it comes and goes with the turn, redrawing only itself.
 */
export function EverythingButton({ shortcut }: EverythingButtonProps): ReactElement | null {
  const up = useEverythingUp() ?? shortcut.away;
  if (!up) {
    return null;
  }
  return (
    <button
      type="button"
      aria-label={labels.scope.toEverything}
      onClick={shortcut.go}
      data-flight={everythingFlight}
      className="me-1 block rounded-full active:opacity-80"
    >
      <span className="block rounded-full bg-surface p-0.5 shadow-raised">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="home" className="size-5" />
        </span>
      </span>
    </button>
  );
}
