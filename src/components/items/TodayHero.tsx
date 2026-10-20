import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { NextUp } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';

type TodayHeroProps = {
  readonly greeting: string;
  readonly name: string;
  /** The day, such as "יום שני, 19 באוקטובר", and its Hebrew date. */
  readonly date: string;
  readonly hebrewDate: string;
  readonly next: NextUp | null;
  /** Under the date: the strip of the coming days. */
  readonly children?: ReactNode;
  /** At the bottom of the card: what waits on the parents. */
  readonly footer?: ReactNode;
};

/**
 * The top of the app's first page: a greeting by the hour, the day in both calendars, the next
 * thing with an hour and how long until it (nothing, when there is none), and what waits.
 */
export function TodayHero({
  greeting,
  name,
  date,
  hebrewDate,
  next,
  children,
  footer,
}: TodayHeroProps): ReactElement {
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-gradient-to-bl from-primary-soft via-primary-soft/70 to-cream p-3.5 shadow-card">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-[22px] leading-7 font-bold">
          {greeting}, {name}
        </h2>
        <p className="text-[13px] text-muted">
          {date}
          {labels.item.separator}
          {hebrewDate}
        </p>
      </div>
      {children}
      {next !== null && (
        <Link
          to={`/item/${next.id}`}
          className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 shadow-card transition active:scale-[0.98]"
        >
          <span className="flex flex-col items-center rounded-xl bg-primary-soft px-2.5 py-0.5 text-primary">
            <span className="text-[11px] leading-4 font-semibold">{labels.today.nextUp}</span>
            <span className="font-display text-[16px] leading-5 font-bold tabular-nums">
              {next.time}
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-semibold">{next.title}</span>
            <span className="text-[13px] text-primary">{labels.today.until(next.minutes)}</span>
          </span>
          <Icon name="forward" className="size-4 shrink-0 text-faint" />
        </Link>
      )}
      {footer}
    </section>
  );
}
