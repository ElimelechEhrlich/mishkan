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
  'inline-flex min-h-8 items-center rounded-full px-3 text-[12px] font-semibold transition active:scale-[0.97]';

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
    <section className="flex flex-col gap-1.5 rounded-2xl bg-gradient-to-bl from-primary-soft via-primary-soft/60 to-surface p-3 shadow-card">
      <div className="flex items-center gap-1.5 text-[12px]">
        <span className="flex size-5.5 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="repeat" className="size-3.5" />
        </span>
        <span className="font-semibold text-primary">{labels.today.stillRelevant}</span>
        <span className="min-w-0 flex-1 truncate text-muted">
          {labels.item.separator}
          {group === 'someday' ? labels.today.onShelfSince(age) : labels.today.noDateSince(age)}
        </span>
        <button
          type="button"
          onClick={() => {
            onPutAside(item.id);
          }}
          className="min-h-7 rounded-full px-1.5 font-medium text-muted transition active:scale-[0.97]"
        >
          {labels.today.notNow}
        </button>
      </div>
      <Link to={`/item/${item.id}`} className="flex flex-col active:opacity-60">
        <span className="text-[15px] leading-snug font-semibold break-words">{item.title}</span>
        {row.parentTitle !== null && (
          <span className="text-[12px] break-words text-muted">{row.parentTitle}</span>
        )}
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
              choice === answers[0] ? 'bg-primary text-white' : 'bg-surface text-ink shadow-card'
            }`}
          >
            {labels.today.review[choice]}
          </button>
        ))}
        {group === 'undated' && (
          <Link to={`/item/${item.id}`} className={`${chip} bg-surface text-ink shadow-card`}>
            {labels.today.review.date}
          </Link>
        )}
      </div>
    </section>
  );
}
