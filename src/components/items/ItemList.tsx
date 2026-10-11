import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { activeSectionOf, compareEntries, todayIso } from '../../lib/itemRules';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { ActiveSection, Item } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';
import { EntryRow } from './EntryRow';

type ItemListProps = {
  readonly entries: readonly ListEntry[];
  readonly lookups: Lookups;
  /** Splits the list into overdue, today, upcoming and undated. */
  readonly grouped: boolean;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
};

const sections = ['overdue', 'today', 'upcoming', 'undated'] as const satisfies readonly ActiveSection[];

/** Items, with goals and issues that have steps shown as one row holding their steps. */
export function ItemList({
  entries,
  lookups,
  grouped,
  loading,
  onComplete,
}: ItemListProps): ReactElement {
  const today = todayIso();

  if (entries.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.status.emptySegment} />;
  }

  const sorted = [...entries].sort(compareEntries);

  if (!grouped) {
    return (
      <ul className="flex flex-col gap-2">
        {sorted.map((entry) => (
          <EntryRow
            key={`${entry.item.id}-${entry.item.due_date ?? ''}`}
            entry={entry}
            lookups={lookups}
            today={today}
            onComplete={onComplete}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => {
        const rows = sorted.filter((entry) => activeSectionOf(entry.dueDate, today) === section);
        if (rows.length === 0) {
          return null;
        }
        const overdue = section === 'overdue';
        return (
          <section key={section} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 px-1">
              <span className={`text-[13px] font-bold tracking-wide ${overdue ? 'text-alert' : 'text-muted'}`}>
                {labels.section[section]}
              </span>
              <span
                className={`rounded-full px-2 text-xs leading-5 font-bold ${
                  overdue ? 'bg-alert-soft text-alert' : 'bg-line/70 text-muted'
                }`}
              >
                {String(rows.length)}
              </span>
              <span className="h-px flex-1 bg-line" />
            </h2>
            <ul className="flex flex-col gap-2">
              {rows.map((entry) => (
                <EntryRow
                  key={`${entry.item.id}-${entry.item.due_date ?? ''}`}
                  entry={entry}
                  lookups={lookups}
                  today={today}
                  onComplete={onComplete}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
