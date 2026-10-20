import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { ReviewAnswer } from '../../hooks/useLooseItems';
import { daysSince } from '../../lib/todayBrief';
import type { StillRelevant } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';

type StillRelevantCardProps = {
  readonly relevant: StillRelevant;
  readonly onAnswer: (item: Item, answer: ReviewAnswer) => void;
  readonly onPutAside: (itemId: string) => void;
};

const chip =
  'inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition active:scale-[0.97]';

/**
 * "עוד רלוונטי?": the one item with no date or on the shelf longest not looked at, and what to
 * do with it. A date is set on its page; "לא עכשיו" leaves it for tomorrow.
 */
export function StillRelevantCard({
  relevant,
  onAnswer,
  onPutAside,
}: StillRelevantCardProps): ReactElement {
  const { row, group } = relevant;
  const { item } = row;
  const age = labels.today.age(daysSince(item.created_at, new Date()));
  const answers: readonly ReviewAnswer[] =
    group === 'someday' ? ['back', 'keep', 'close'] : ['today', 'keep', 'shelf'];

  return (
    <section className="flex flex-col gap-2.5 rounded-2xl bg-cream p-3.5 shadow-card">
      <div className="flex items-center gap-2">
        <Icon name="repeat" className="size-4 text-gold" />
        <span className="flex-1 text-[13px] font-semibold text-gold">
          {labels.today.stillRelevant}
        </span>
        <button
          type="button"
          onClick={() => {
            onPutAside(item.id);
          }}
          className="min-h-8 rounded-full px-2 text-[12px] font-medium text-muted transition active:scale-[0.97]"
        >
          {labels.today.notNow}
        </button>
      </div>
      <Link to={`/item/${item.id}`} className="flex flex-col gap-0.5 active:opacity-60">
        <span className="text-[16px] font-semibold">{item.title}</span>
        <span className="text-[12px] text-muted">
          {group === 'someday' ? labels.today.onShelfSince(age) : labels.today.noDateSince(age)}
          {row.parentTitle !== null && `${labels.item.separator}${row.parentTitle}`}
        </span>
      </Link>
      <div className="flex flex-wrap gap-1.5">
        {answers.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => {
              onAnswer(item, choice);
            }}
            className={`${chip} ${
              choice === answers[0] ? 'bg-primary-soft text-primary' : 'bg-surface text-ink'
            }`}
          >
            {labels.today.review[choice]}
          </button>
        ))}
        {group === 'undated' && (
          <Link to={`/item/${item.id}`} className={`${chip} bg-surface text-ink`}>
            {labels.today.review.date}
          </Link>
        )}
      </div>
    </section>
  );
}
