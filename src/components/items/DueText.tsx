import type { ReactElement } from 'react';
import { timeText } from '../../lib/itemText';
import { isOverdue } from '../../lib/itemRules';
import type { Item } from '../../types/domain';

type DueTextProps = {
  readonly item: Item;
  readonly today: string;
};

/**
 * When an item is due, at the end of its row: red when late, green for today.
 * Items without a date show nothing here; their tab or section already says so.
 */
export function DueText({ item, today }: DueTextProps): ReactElement | null {
  const time = item.due_date === null ? null : timeText(item, today);
  if (time === null) {
    return null;
  }
  const overdue = isOverdue(item, today);
  const dueToday = item.due_date === today;
  const tone = overdue ? 'text-alert' : dueToday ? 'text-primary' : 'text-muted';
  return <span className={`shrink-0 text-xs font-semibold whitespace-nowrap ${tone}`}>{time}</span>;
}
