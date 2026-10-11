import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { ItemMeta } from '../items/ItemMeta';

type GoalCardProps = {
  readonly goal: Item;
  /** The steps of this goal, done ones included. */
  readonly steps: readonly Item[];
  readonly lookups: Lookups;
  readonly today: string;
};

/** A goal or an issue with a progress bar built from its steps. */
export function GoalCard({ goal, steps, lookups, today }: GoalCardProps): ReactElement {
  const doneCount = steps.filter((step) => step.status === 'done').length;
  const percent = steps.length === 0 ? 0 : Math.round((doneCount / steps.length) * 100);

  return (
    <li>
      <Link
        to={`/item/${goal.id}`}
        className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card transition active:scale-[0.99]"
      >
        <span className="flex flex-col gap-1">
          <span className="text-[19px] leading-7 font-semibold break-words">{goal.title}</span>
          <ItemMeta item={goal} lookups={lookups} today={today} />
        </span>
        {steps.length === 0 ? (
          <span className="text-sm text-muted">{labels.goals.noSteps}</span>
        ) : (
          <span className="flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-primary transition-all"
                style={{ width: `${String(percent)}%` }}
              />
            </span>
            <span className="text-sm font-medium text-muted">
              {String(doneCount)} {labels.goals.progressOf} {String(steps.length)}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}
