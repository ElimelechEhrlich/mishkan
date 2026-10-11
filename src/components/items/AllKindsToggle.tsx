import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';

type AllKindsToggleProps = {
  readonly on: boolean;
  readonly onToggle: () => void;
};

/** Switches the tasks tab to show every kind that runs on time, and back. */
export function AllKindsToggle({ on, onToggle }: AllKindsToggleProps): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`mb-1.5 flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold transition active:scale-95 ${
        on ? 'bg-primary text-white' : 'bg-surface text-muted shadow-card'
      }`}
    >
      {labels.allKinds.toggle}
    </button>
  );
}
