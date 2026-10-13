import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { isAfterTarget } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { Icon } from '../ui/Icon';
import { DueText } from './DueText';
import { ItemMeta } from './ItemMeta';

type GoalRowProps = {
  readonly goal: Item;
  /** The steps of the goal, done ones included. */
  readonly steps: readonly Item[];
  readonly lookups: Lookups;
  readonly today: string;
  readonly onComplete: (item: Item) => void;
  /** Leaves out the domain, on a page that already groups by it. */
  readonly hideDomain?: boolean;
};

/**
 * A goal or issue that has steps, shown as itself with its open steps inside it,
 * instead of as one more task in the list.
 */
export function GoalRow({
  goal,
  steps,
  lookups,
  today,
  onComplete,
  hideDomain = false,
}: GoalRowProps): ReactElement {
  const tone = goal.domain_id === null ? undefined : lookups.domainTones.get(goal.domain_id);
  const open = steps.filter((step) => step.status === 'open');
  const doneCount = steps.length - open.length;
  const percent = steps.length === 0 ? 0 : Math.round((doneCount / steps.length) * 100);
  const progress = `${String(doneCount)} ${labels.goals.progressOf} ${String(steps.length)}`;

  return (
    <li className="group flex gap-3 ps-3.5">
      <span className="w-5.5 shrink-0 pt-2.5">
        <Icon name="target" className={`size-5.5 ${tone?.text ?? 'text-muted'}`} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 border-t border-line py-2 pe-3.5 group-first:border-t-0">
        <Link to={`/item/${goal.id}`} className="flex items-start gap-3 active:opacity-70">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14px] leading-snug font-semibold break-words">{goal.title}</span>
            <ItemMeta
              item={goal}
              lookups={lookups}
              today={today}
              hideDomain={hideDomain}
              extra={progress}
            />
          </span>
          <span className="pt-0.5">
            <DueText item={goal} today={today} />
          </span>
        </Link>
        <span className="h-1 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-primary transition-all"
            style={{ width: `${String(percent)}%` }}
          />
        </span>
        {open.length > 0 && (
          <ul className="flex flex-col gap-2 pt-0.5">
            {open.map((step) => (
              <li key={`${step.id}-${step.due_date ?? ''}`} className="flex items-center gap-2.5">
                <CheckButton
                  checked={false}
                  small
                  label={labels.actions.markDone}
                  toneClass={tone?.border}
                  onClick={() => {
                    onComplete(step);
                  }}
                />
                <Link
                  to={`/item/${step.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm active:opacity-70"
                >
                  <span className="min-w-0 flex-1 break-words">{step.title}</span>
                  {isAfterTarget(step, goal) && (
                    <span className="text-[11px] font-semibold text-alert">
                      {labels.goals.afterTarget}
                    </span>
                  )}
                  <DueText item={step} today={today} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
