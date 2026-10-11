import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { activeSectionOf, activeSections, compareEntries, todayIso } from '../../lib/itemRules';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';
import { EntryRow } from './EntryRow';

type ItemListProps = {
  readonly entries: readonly ListEntry[];
  readonly lookups: Lookups;
  /** Splits the list into overdue, today, the coming week, later and undated. */
  readonly grouped: boolean;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** Leaves out the domain of each row, on a page that already groups by it. */
  readonly hideDomain?: boolean;
  /** Shown when there is nothing to list. */
  readonly emptyText?: string;
};

const sections = activeSections;

const cardClass = 'overflow-hidden rounded-2xl bg-surface shadow-card';

/** Items in one card, with goals and issues that have steps shown as one row holding their steps. */
export function ItemList({
  entries,
  lookups,
  grouped,
  loading,
  onComplete,
  hideDomain = false,
  emptyText = labels.status.emptySegment,
}: ItemListProps): ReactElement {
  const today = todayIso();

  if (entries.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={emptyText} />;
  }

  const sorted = [...entries].sort(compareEntries);

  function rows(list: readonly ListEntry[]): ReactElement {
    return (
      <ul className={cardClass}>
        {list.map((entry) => (
          <EntryRow
            key={`${entry.item.id}-${entry.item.due_date ?? ''}`}
            entry={entry}
            lookups={lookups}
            today={today}
            onComplete={onComplete}
            hideDomain={hideDomain}
          />
        ))}
      </ul>
    );
  }

  if (!grouped) {
    return rows(sorted);
  }

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => {
        const inSection = sorted.filter(
          (entry) => activeSectionOf(entry.dueDate, today) === section,
        );
        if (inSection.length === 0) {
          return null;
        }
        return (
          <section key={section} className="flex flex-col gap-1.5">
            <h2
              className={`flex items-center gap-1.5 px-1 text-xs font-bold tracking-wide ${
                section === 'overdue' ? 'text-alert' : 'text-muted'
              }`}
            >
              {labels.section[section]}
              <span className="font-medium text-faint">{String(inSection.length)}</span>
            </h2>
            {rows(inSection)}
          </section>
        );
      })}
    </div>
  );
}
