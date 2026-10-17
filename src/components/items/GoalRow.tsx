import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { goalProgress, isLateStep } from '../../lib/goals';
import { segmentOf } from '../../lib/itemRules';
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
  /** The steps to show inside, in a list by time: those of this group. Else every open one. */
  readonly shown?: readonly Item[] | undefined;
  /** Only a small heading over some of its steps, without the progress. */
  readonly heading?: boolean;
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
  shown: shownHere,
  heading = false,
}: GoalRowProps): ReactElement {
  const tone = goal.domain_id === null ? undefined : lookups.domainTones.get(goal.domain_id);
  const open = steps.filter((step) => step.status === 'open');
  // A goal that waits or is on the shelf keeps only its undated steps inside it; a step with a
  // date, or urgent, stands on its own among the active, so it is not shown twice.
  const resting = segmentOf(goal) === 'waiting' || segmentOf(goal) === 'someday';
  const shown =
    shownHere ??
    (resting ? open.filter((step) => step.due_date === null && step.time_mode !== 'urgent') : open);
  // Under a heading, when its steps here are due: the soonest of them, at the end of its line.
  const firstShown = [...shown].sort(
    (a, b) =>
      (a.due_date ?? '9').localeCompare(b.due_date ?? '9') ||
      (a.due_time ?? '99').localeCompare(b.due_time ?? '99'),
  )[0];
  // Counted by occurrences: a repeating step counts each of its times.
  const counted = goalProgress(steps, lookups.repeats, lookups.occurrenceCounts);
  const percent = counted.total === 0 ? 0 : Math.round((counted.done / counted.total) * 100);
  const progress = `${String(counted.done)} ${labels.goals.progressOf} ${String(counted.total)}`;

  return (
    <li className="group flex gap-3 ps-3.5">
      <span className={`w-5.5 shrink-0 ${heading ? 'pt-2' : 'pt-2.5'}`}>
        <Icon
          name={goal.kind === 'issue' ? 'alert' : 'target'}
          className={`${heading ? 'size-4' : 'size-5.5'} ${tone?.text ?? 'text-muted'}`}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 border-t border-line py-2 pe-3.5 group-first:border-t-0">
        {heading ? (
          <Link to={`/item/${goal.id}`} className="flex items-start gap-3 active:opacity-70">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13px] leading-snug font-semibold break-words text-muted">
                {goal.title}
              </span>
              <ItemMeta item={goal} lookups={lookups} today={today} hideDomain={hideDomain} />
            </span>
            {firstShown !== undefined && (
              <span className="pt-0.5">
                <DueText item={firstShown} today={today} />
              </span>
            )}
          </Link>
        ) : (
          <>
            <Link to={`/item/${goal.id}`} className="flex items-start gap-3 active:opacity-70">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14px] leading-snug font-semibold break-words">
                  {goal.title}
                </span>
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
          </>
        )}
        {shown.length > 0 && (
          <ul className="flex flex-col gap-2 pt-0.5">
            {shown.map((step) => (
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
                  {isLateStep(
                    step,
                    goal,
                    lookups.repeats.get(step.id),
                    lookups.occurrenceCounts.get(step.id),
                  ) && (
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
