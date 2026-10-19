import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { weekdayLabel } from '../../lib/todayBrief';
import type { WeekDay } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';

type DayListProps = {
  readonly day: WeekDay;
  readonly onBack: () => void;
};

/** One of the coming days on the first page: what it holds, by hour, each a link. */
export function DayList({ day, onBack }: DayListProps): ReactElement {
  return (
    <section className="flex flex-col gap-1 rounded-2xl bg-surface px-3.5 py-2 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold">{weekdayLabel(day.date)}</h2>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
        >
          <Icon name="back" className="size-4" />
          {labels.today.backToToday}
        </button>
      </div>
      {day.things.length === 0 ? (
        <p className="py-3 text-center text-[14px] text-muted">{labels.today.dayEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {day.things.map((thing) => (
            <li key={thing.id}>
              <Link
                to={`/item/${thing.id}`}
                className="flex min-h-11 items-center gap-3 active:opacity-60"
              >
                <span className="w-11 shrink-0 text-[13px] text-primary tabular-nums">
                  {thing.time ?? ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px]">{thing.title}</span>
                <Icon name="forward" className="size-4 shrink-0 text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
