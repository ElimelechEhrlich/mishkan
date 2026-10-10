import type { Item, MissingField } from '../types/domain';

/**
 * Same rule as the generated `is_complete` column in the schema:
 * notes and debts need a domain; everything else needs domain, member and time.
 */
export function missingFields(item: Item): MissingField[] {
  const missing: MissingField[] = [];
  if (item.domain_id === null) {
    missing.push('domain');
  }
  if (item.kind === 'note' || item.kind === 'debt') {
    return missing;
  }
  if (item.member_id === null) {
    missing.push('member');
  }
  if (item.time_mode === null) {
    missing.push('time');
  }
  return missing;
}

/** Today's local date as YYYY-MM-DD, comparable with `items.due_date`. */
export function todayIso(now: Date = new Date()): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isOverdue(item: Item, today: string): boolean {
  return item.time_mode === 'scheduled' && item.due_date !== null && item.due_date < today;
}

const dueDateFormat = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });

export function formatDueDate(isoDate: string): string {
  return dueDateFormat.format(new Date(`${isoDate}T00:00:00`));
}
