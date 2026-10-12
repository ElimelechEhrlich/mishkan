import { useState } from 'react';
import type { ReactElement } from 'react';
import { compareEntries, todayIso } from '../../lib/itemRules';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { EntryRow } from '../items/EntryRow';
import { Icon } from '../ui/Icon';

type TopicSectionProps = {
  readonly topic: string;
  readonly entries: readonly ListEntry[];
  readonly lookups: Lookups;
  readonly onComplete: (item: Item) => void;
  readonly defaultOpen: boolean;
};

/** One topic as a card that folds: its name and count, and when open, the items of every entity. */
export function TopicSection({
  topic,
  entries,
  lookups,
  onComplete,
  defaultOpen,
}: TopicSectionProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const today = todayIso();

  return (
    <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex w-full items-center gap-2 px-4 py-3.5 text-start active:bg-paper"
      >
        <span className="flex-1 font-display text-base font-semibold">{topic}</span>
        <span className="rounded-full bg-line/80 px-2 text-xs leading-5 font-semibold text-muted">
          {String(entries.length)}
        </span>
        <Icon
          name="down"
          className={`size-4 text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="animate-fade-in border-t border-line">
          {[...entries].sort(compareEntries).map((entry) => (
            <EntryRow
              key={entry.item.id}
              entry={entry}
              lookups={lookups}
              today={today}
              onComplete={onComplete}
              hideDomain={false}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
