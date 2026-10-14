import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { timeText } from '../../lib/itemText';
import { hasOwnTime, isOverdue } from '../../lib/itemRules';
import type { Item } from '../../types/domain';

type DueTextProps = {
  readonly item: Item;
  readonly today: string;
};

/**
 * When an item is due, at the end of its row: red when late, green for today.
 * Items without a date show nothing here, as their tab or section already says so; only
 * urgent ones are marked.
 */
export function DueText({ item, today }: DueTextProps): ReactElement | null {
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
  return <span className={`shrink-0 text-xs font-semibold whitespace-nowrap ${tone}`}>{time}</span>;
}
