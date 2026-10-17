import { labels } from '../constants/labels';
import type { Item, OpenSegment } from '../types/domain';
import { addDays, formatClock, formatDueDate, hasOwnTime } from './itemRules';
import { rhythmOfRule, rhythmText } from './recurrence';

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
  // Time left on a kind that has none of its own, after a conversion, is not shown.
  if (item.time_mode === null || !hasOwnTime(item)) {
    return null;
  }
  if (item.kind === 'appointment' && item.starts_at !== null && item.due_date !== null) {
    return `${dateText(item.due_date, today)} ${formatClock(item.starts_at)}`;
  }
  if (item.due_date !== null) {
    // A goal's date is its target: when all its steps are to be done.
    if (item.kind === 'goal') {
      return `${labels.goals.by} ${dateText(item.due_date, today)}`;
    }
    const hour = item.due_time?.slice(0, 5);
    return hour === undefined
      ? dateText(item.due_date, today)
      : `${dateText(item.due_date, today)} ${hour}`;
  }
  // A repeating series with no occurrence left waits to be marked done itself.
  return item.time_mode === 'recurring' ? labels.repeat.ended : labels.timeMode[item.time_mode];
}

/** Like `timeText`, with the rhythm of a recurring item added. */
export function fullTimeText(item: Item, today: string): string | null {
  const time = timeText(item, today);
  const rhythm = item.time_mode === 'recurring' ? rhythmOfRule(item.recurrence_rule) : null;
  if (time === null || rhythm === null) {
    return time;
  }
  return `${rhythmText(rhythm.every, rhythm.unit)}${labels.item.separator}${time}`;
}

const timeOrder = ['active', 'waiting', 'someday'] as const satisfies readonly OpenSegment[];

/** "9 active · 2 waiting", leaving out the empty groups; "nothing open" when all are empty. */
export function timeGroupsSummary(counts: Readonly<Record<OpenSegment, number>>): string {
  const parts = timeOrder
    .filter((segment) => counts[segment] > 0)
    .map((segment) => `${String(counts[segment])} ${labels.segment[segment]}`);
  return parts.length === 0 ? labels.overview.nothingOpen : parts.join(labels.item.separator);
}

/** The value of a note that is one value (the gate's code), shown wherever the item is; else null. */
export function noteValue(item: Item): string | null {
  return item.kind === 'note' && item.is_value && item.answer !== null && item.answer.trim() !== ''
    ? item.answer
    : null;
}
