import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { ItemMeta } from './ItemMeta';

type GoalRowProps = {
  readonly goal: Item;
  /** The steps of the goal, done ones included. */
  readonly steps: readonly Item[];
  readonly lookups: Lookups;
  readonly today: string;
  readonly onComplete: (item: Item) => void;
};

/**
 * A goal or issue that has steps, shown as itself with its open steps inside it,
 * instead of as one more task in the list.
 */
export function GoalRow({ goal, steps, lookups, today, onComplete }: GoalRowProps): ReactElement {
  const tone = goal.domain_id === null ? undefined : lookups.domainTones.get(goal.domain_id);
  const open = steps.filter((step) => step.status === 'open');
  const doneCount = steps.length - open.length;
  const percent = steps.length === 0 ? 0 : Math.round((doneCount / steps.length) * 100);

  return (
    <li className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface py-3.5 ps-5 pe-4 shadow-card">
      {tone !== undefined && (
        <span className={`absolute inset-y-3 start-1.5 w-1 rounded-full ${tone}`} />
      )}
      <Link to={`/item/${goal.id}`} className="flex flex-col gap-1">
        <span className="text-[17px] leading-6 font-semibold break-words">{goal.title}</span>
        <ItemMeta item={goal} lookups={lookups} today={today} hideTone />
      </Link>
      <span className="flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-primary transition-all"
            style={{ width: `${String(percent)}%` }}
          />
        </span>
        <span className="text-[13px] font-medium text-muted">
          {String(doneCount)} {labels.goals.progressOf} {String(steps.length)}
        </span>
      </span>
      {open.length > 0 && (
        <ul className="flex flex-col gap-2 border-s-2 border-line ps-3">
          {open.map((step) => (
            <li key={`${step.id}-${step.due_date ?? ''}`} className="flex items-center gap-3">
              <CheckButton
                checked={false}
                label={labels.actions.markDone}
                onClick={() => {
                  onComplete(step);
                }}
              />
              <Link to={`/item/${step.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="break-words">{step.title}</span>
                <ItemMeta item={step} lookups={lookups} today={today} hideTone hideDomain />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
