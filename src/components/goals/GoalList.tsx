import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { todayIso } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';
import { GoalCard } from './GoalCard';

type GoalListProps = {
  /** Every open item; goals and issues are picked out here. */
  readonly items: readonly Item[];
  readonly steps: readonly Item[];
  readonly lookups: Lookups;
  readonly loading: boolean;
};

export function GoalList({ items, steps, lookups, loading }: GoalListProps): ReactElement {
  const goals = items.filter((item) => item.kind === 'goal' || item.kind === 'issue');
  const today = todayIso();

  if (goals.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.status.noGoals} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          steps={steps.filter((step) => step.parent_id === goal.id)}
          lookups={lookups}
          today={today}
        />
      ))}
    </ul>
  );
}
