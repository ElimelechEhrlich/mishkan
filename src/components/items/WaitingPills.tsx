import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { WaitingOnYou } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

type WaitingPillsProps = {
  readonly waiting: WaitingOnYou;
  readonly incompleteCount: number;
  /** An item waits for "עוד רלוונטי?" in the tab with no date. */
  readonly toReview: boolean;
};

/**
 * What waits on the parents, in a line of small pills: open questions, goals that may be
 * reached, what is left to complete, and an item to look at again. Nothing shows when nothing
 * waits.
 */
export function WaitingPills({
  waiting,
  incompleteCount,
  toReview,
}: WaitingPillsProps): ReactElement | null {
  const [question] = waiting.questions;
  const [goal] = waiting.reachedGoals;
  const pills: {
    key: string;
    to: string;
    icon: IconName;
    text: string;
    color: string;
    /** It opens the other tab of this page, which an arrow says. */
    arrow?: boolean;
  }[] = [
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
    ...(toReview
      ? [
          {
            key: 'review',
            to: '/home?tab=loose',
            icon: 'repeat' as const,
            color: 'bg-primary-soft text-primary',
            text: labels.today.stillRelevant,
            arrow: true,
          },
        ]
      : []),
  ];
  if (pills.length === 0) {
    return null;
  }
  return (
    <section className="flex items-center gap-2 overflow-x-auto rounded-2xl bg-surface/70 py-1.5 ps-3 pe-1.5 shadow-card ring-1 ring-line [scrollbar-width:none]">
      <h2 className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-ink">
        <Icon name="bell" className="size-4 text-primary" />
        {labels.today.waiting}
      </h2>
      <span className="h-5 w-px shrink-0 bg-line" />
      <div className="flex gap-1.5">
        {pills.map((pill) => (
          <Link
            key={pill.key}
            to={pill.to}
            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-paper ps-1 pe-3 text-[13px] font-medium whitespace-nowrap transition active:scale-[0.97]"
          >
            <span className={`flex size-6 items-center justify-center rounded-full ${pill.color}`}>
              <Icon name={pill.icon} className="size-4" />
            </span>
            {pill.text}
            {pill.arrow === true && <Icon name="forward" className="-ms-1 size-4 text-primary" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
