import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { toListEntries } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { ItemList } from '../items/ItemList';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';

type GoalListProps = {
  /** Every open item; goals and issues are picked out here. */
  readonly items: readonly Item[];
  readonly steps: readonly Item[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
};

/** Open goals, then open issues, each holding its steps. */
export function GoalList({
  items,
  steps,
  lookups,
  loading,
  onComplete,
}: GoalListProps): ReactElement {
  const goals = toListEntries(
    items.filter((item) => item.kind === 'goal'),
    steps.filter((step) => step.kind === 'task'),
  );
  const issues = toListEntries(
    items.filter((item) => item.kind === 'issue'),
    steps.filter((step) => step.kind === 'task'),
  );

  if (goals.length === 0 && issues.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.status.noGoals} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {[
        { title: labels.goals.goals, entries: goals },
        { title: labels.goals.issues, entries: issues },
      ]
        .filter((group) => group.entries.length > 0)
        .map((group) => (
          <section key={group.title} className="flex flex-col gap-1.5">
            <h2 className="flex items-center gap-1.5 px-1 text-xs font-bold tracking-wide text-muted">
              {group.title}
              <span className="font-medium text-faint">{String(group.entries.length)}</span>
            </h2>
            <ItemList
              entries={group.entries}
              lookups={lookups}
              grouped={false}
              loading={false}
              onComplete={onComplete}
            />
          </section>
        ))}
    </div>
  );
}
