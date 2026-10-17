import { useState } from 'react';
import type { ReactElement } from 'react';
import { compareEntries, todayIso } from '../../lib/itemRules';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { EntryRow } from '../items/EntryRow';
import { Icon } from '../ui/Icon';

type TimeGroupProps = {
  readonly label: string;
  readonly entries: readonly ListEntry[];
  readonly lookups: Lookups;
  readonly onComplete: (item: Item) => void;
  readonly defaultOpen?: boolean;
  /** Overdue groups show their name in red. */
  readonly alert?: boolean;
};

/** One time group inside an overview card: a header that folds, and all of its rows. */
export function TimeGroup({
  label,
  entries,
  lookups,
  onComplete,
  defaultOpen = false,
  alert = false,
}: TimeGroupProps): ReactElement | null {
  const [open, setOpen] = useState(defaultOpen);

  if (entries.length === 0) {
    return null;
  }

  const today = todayIso();
  const shown = [...entries].sort(compareEntries);

  return (
    <div className="flex flex-col border-t border-line first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex items-center gap-2 bg-paper/50 px-3.5 py-2 text-start active:bg-paper"
      >
        <span
          className={`flex-1 text-xs font-bold tracking-wide ${alert ? 'text-alert' : 'text-muted'}`}
        >
          {label}
        </span>
        <span className="rounded-full bg-line/80 px-2 text-xs leading-5 font-semibold text-muted">
          {String(entries.length)}
        </span>
        <Icon
          name="down"
          className={`size-3.5 text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="animate-fade-in">
          {shown.map((entry) => (
            <EntryRow
              key={`${entry.item.id}-${entry.item.due_date ?? ''}-${entry.dueDate ?? ''}`}
              entry={entry}
              lookups={lookups}
              today={today}
              onComplete={onComplete}
              hideDomain={false}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
