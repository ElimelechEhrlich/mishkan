import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { ItemList } from '../items/ItemList';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';

type GoalListProps = {
  /** The goals and issues of the chosen time tab, each with its steps. */
  readonly entries: readonly ListEntry[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
};

/** Goals, then issues, each holding its steps. */
export function GoalList({ entries, lookups, loading, onComplete }: GoalListProps): ReactElement {
  const goals = entries.filter((entry) => entry.item.kind === 'goal');
  const issues = entries.filter((entry) => entry.item.kind === 'issue');

  if (goals.length === 0 && issues.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.status.noGoals} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {[
        { title: labels.goals.goals, list: goals },
        { title: labels.goals.issues, list: issues },
      ]
        .filter((group) => group.list.length > 0)
        .map((group) => (
          <section key={group.title} className="flex flex-col gap-1.5">
            <h2 className="flex items-center gap-1.5 px-1 text-xs font-bold tracking-wide text-muted">
              {group.title}
              <span className="font-medium text-faint">{String(group.list.length)}</span>
            </h2>
            <ItemList
              entries={group.list}
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
