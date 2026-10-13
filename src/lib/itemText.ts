import { labels } from '../constants/labels';
import type { Item, OpenSegment } from '../types/domain';
import { addDays, formatClock, formatDueDate, recurrenceOf } from './itemRules';

function dateText(dueDate: string, today: string): string {
  if (dueDate === today) {
    return labels.item.today;
  }
  if (dueDate === addDays(today, 1)) {
    return labels.item.tomorrow;
  }
  return formatDueDate(dueDate);
}

/** When an item is due, in words: a date, "today", or the name of its time mode. */
export function timeText(item: Item, today: string): string | null {
  if (item.time_mode === null) {
    return null;
  }
  if (item.kind === 'appointment' && item.starts_at !== null && item.due_date !== null) {
    return `${dateText(item.due_date, today)} ${formatClock(item.starts_at)}`;
  }
  if (item.due_date !== null) {
    // A goal's date is its target: when all its steps are to be done.
    return item.kind === 'goal'
      ? `${labels.goals.by} ${dateText(item.due_date, today)}`
      : dateText(item.due_date, today);
  }
  return labels.timeMode[item.time_mode];
}

/** Like `timeText`, with the rhythm of a recurring item added. */
export function fullTimeText(item: Item, today: string): string | null {
  const time = timeText(item, today);
  const recurrence = recurrenceOf(item.recurrence_rule);
  if (time === null || recurrence === null) {
    return time;
  }
  return `${labels.recurrence[recurrence]}${labels.item.separator}${time}`;
}

const timeOrder = ['active', 'waiting', 'someday'] as const satisfies readonly OpenSegment[];

/** "9 active · 2 waiting", leaving out the empty groups; "nothing open" when all are empty. */
export function timeGroupsSummary(counts: Readonly<Record<OpenSegment, number>>): string {
  const parts = timeOrder
    .filter((segment) => counts[segment] > 0)
    .map((segment) => `${String(counts[segment])} ${labels.segment[segment]}`);
  return parts.length === 0 ? labels.overview.nothingOpen : parts.join(labels.item.separator);
}
