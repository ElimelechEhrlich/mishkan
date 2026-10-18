import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { weekdayLabel } from '../../lib/todayBrief';
import type { WeekDay } from '../../lib/todayBrief';
import { Card } from '../ui/Card';

type WeekStripProps = {
  readonly days: readonly WeekDay[];
};

/** The coming week in short: a line for each day that holds something, each thing a link. */
export function WeekStrip({ days }: WeekStripProps): ReactElement | null {
  if (days.length === 0) {
    return null;
  }
  return (
    <Card title={labels.today.week}>
      <ul className="flex flex-col gap-2.5">
        {days.map((day) => (
          <li key={day.date} className="flex gap-3 text-[14px] leading-6">
            <span className="w-20 shrink-0 font-semibold text-muted">{weekdayLabel(day.date)}</span>
            <span className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1">
              {day.things.map((thing) => (
                <Link
                  key={thing.id}
                  to={`/item/${thing.id}`}
                  className="inline-flex items-baseline gap-1.5 active:opacity-60"
                >
                  {thing.title}
                  {thing.time !== null && (
                    <span className="text-[13px] text-muted tabular-nums">{thing.time}</span>
                  )}
                </Link>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
