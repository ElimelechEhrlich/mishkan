import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { WaitingOnYou } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

type WaitingPillsProps = {
  readonly waiting: WaitingOnYou;
  readonly incompleteCount: number;
};

/**
 * What waits on the parents, in a line of small pills: open questions, goals that may be
 * reached, and what is left to complete. Nothing shows when nothing waits.
 */
export function WaitingPills({ waiting, incompleteCount }: WaitingPillsProps): ReactElement | null {
  const [question] = waiting.questions;
  const [goal] = waiting.reachedGoals;
  const pills: { key: string; to: string; icon: IconName; text: string; color: string }[] = [
    ...(question === undefined
      ? []
      : [
          {
            key: 'questions',
            // One question opens its issue; several, the issues.
            to:
              waiting.questions.length === 1 && question.parent_id !== null
                ? `/item/${question.parent_id}`
                : '/goals?tab=issues',
            icon: 'help' as const,
            color: 'bg-gold/15 text-gold',
            text: labels.today.questions(waiting.questions.length),
          },
        ]),
    ...(goal === undefined
      ? []
      : [
          {
            key: 'goals',
            to: waiting.reachedGoals.length === 1 ? `/item/${goal.id}` : '/goals',
            icon: 'target' as const,
            color: 'bg-entity-2/15 text-entity-2',
            text: labels.today.reachedShort(waiting.reachedGoals.length),
          },
        ]),
    ...(incompleteCount === 0
      ? []
      : [
          {
            key: 'incomplete',
            to: '/incomplete',
            icon: 'alert' as const,
            color: 'bg-alert-soft text-alert',
            text: labels.today.incompleteShort(incompleteCount),
          },
        ]),
  ];
  if (pills.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.today.waiting}</h2>
      <div className="flex flex-wrap gap-2">
        {pills.map((pill) => (
          <Link
            key={pill.key}
            to={pill.to}
            className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface ps-1.5 pe-3.5 text-[13px] font-medium shadow-card transition active:scale-[0.97]"
          >
            <span
              className={`flex size-6.5 items-center justify-center rounded-full ${pill.color}`}
            >
              <Icon name={pill.icon} className="size-4" />
            </span>
            {pill.text}
          </Link>
        ))}
      </div>
    </section>
  );
}
