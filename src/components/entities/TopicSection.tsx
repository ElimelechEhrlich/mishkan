import { useState } from 'react';
import type { ReactElement } from 'react';
import { compareBySection, todayIso } from '../../lib/itemRules';
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
  /** When given, a "+" in the header adds an item to this domain. */
  readonly onAdd?: (() => void) | undefined;
  readonly addLabel?: string | undefined;
  /** Leaves out the domain of each row, when the card is already one entity's domain. */
  readonly hideDomain?: boolean;
};

/** One topic as a card that folds: its name and count, and when open, the items of every entity. */
export function TopicSection({
  topic,
  entries,
  lookups,
  onComplete,
  defaultOpen,
  onAdd,
  addLabel,
  hideDomain = false,
}: TopicSectionProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const today = todayIso();

  return (
    <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
          className="flex flex-1 items-center gap-2 py-3.5 ps-4 pe-2 text-start active:bg-paper"
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
        {onAdd !== undefined && (
          <button
            type="button"
            aria-label={addLabel}
            onClick={onAdd}
            className="me-3 flex size-8 items-center justify-center rounded-lg bg-paper text-muted transition active:scale-90"
          >
            <Icon name="plus" className="size-4" />
          </button>
        )}
      </div>
      {open && (
        <ul className="animate-fade-in border-t border-line">
          {[...entries].sort(compareBySection(today)).map((entry) => (
            <EntryRow
              key={entry.item.id}
              entry={entry}
              lookups={lookups}
              today={today}
              onComplete={onComplete}
              hideDomain={hideDomain}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
