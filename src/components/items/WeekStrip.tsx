import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { weekdayLabel } from '../../lib/todayBrief';
import type { WeekDay } from '../../lib/todayBrief';

type WeekStripProps = {
  readonly days: readonly WeekDay[];
};

/** Things a day's card names; the rest are counted. */
const shownPerDay = 3;

/**
 * The coming week as a row of day cards, swiped sideways: each day with its first things by
 * hour, each a link, and a quiet "free" on a day with nothing.
 */
export function WeekStrip({ days }: WeekStripProps): ReactElement | null {
  if (days.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.today.week}</h2>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {days.map((day) => {
          const more = day.things.length - shownPerDay;
          return (
            <li
              key={day.date}
              className={`flex w-40 shrink-0 snap-start flex-col gap-1.5 rounded-2xl p-3 ${
                day.things.length === 0 ? 'bg-surface/50' : 'bg-surface shadow-card'
              }`}
            >
              <span className="text-[13px] font-bold text-muted">{weekdayLabel(day.date)}</span>
              {day.things.length === 0 ? (
                <span className="text-[13px] text-faint">{labels.today.free}</span>
              ) : (
                day.things.slice(0, shownPerDay).map((thing) => (
                  <Link
                    key={thing.id}
                    to={`/item/${thing.id}`}
                    className="flex min-w-0 items-baseline gap-1.5 text-[14px] leading-5 active:opacity-60"
                  >
                    {thing.time !== null && (
                      <span className="shrink-0 text-[12px] text-primary tabular-nums">
                        {thing.time}
                      </span>
                    )}
                    <span className="truncate">{thing.title}</span>
                  </Link>
                ))
              )}
              {more > 0 && (
                <span className="text-[12px] text-muted">{labels.today.more(more)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
