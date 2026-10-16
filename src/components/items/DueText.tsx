import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { timeText } from '../../lib/itemText';
import { hasOwnTime, isOverdue } from '../../lib/itemRules';
import type { Item } from '../../types/domain';
import { CalendarBadge } from './CalendarBadge';

type DueTextProps = {
  readonly item: Item;
  readonly today: string;
  /** The hours of each day of a repeating item, when it has several. */
  readonly dayTimes?: readonly string[] | undefined;
};

/**
 * When an item is due, at the end of its row: red when late, green for today.
 * Items without a date show nothing here, as their tab or section already says so; only
 * urgent ones are marked. What is in the parent's Google Calendar has its mark before the time.
 */
export function DueText({ item, today, dayTimes }: DueTextProps): ReactElement | null {
  // Urgent with no date: said outright, since it sits with today's.
  if (item.due_date === null && item.time_mode === 'urgent' && hasOwnTime(item)) {
    return (
      <span className="shrink-0 rounded-md bg-alert-soft px-1.5 text-xs font-semibold whitespace-nowrap text-alert">
        {labels.timeMode.urgent}
      </span>
    );
  }
  const time = item.due_date === null ? null : timeText(item, today);
  if (time === null) {
    return null;
  }
  const overdue = isOverdue(item, today);
  const dueToday = item.due_date === today;
  const tone = overdue ? 'text-alert' : dueToday ? 'text-primary' : 'text-muted';
  // Several hours a day: the ones after the current occurrence today are said as well.
  const current = item.due_time?.slice(0, 5);
  const later =
    dueToday && current !== undefined ? (dayTimes ?? []).filter((hour) => hour > current) : [];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold whitespace-nowrap ${tone}`}
    >
      <CalendarBadge itemId={item.id} />
      {time}
      {later.length > 0 && (
        <span className="font-normal text-muted">
          {labels.item.separator}
          {labels.occurrence.alsoToday(later.join(', '))}
        </span>
      )}
    </span>
  );
}
