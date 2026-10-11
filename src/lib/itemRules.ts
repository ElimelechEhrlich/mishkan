import type {
  ActiveSection,
  Item,
  MissingField,
  OpenSegment,
  Recurrence,
} from '../types/domain';

/** Tasks and goals need a time; the other kinds are complete with a domain alone. */
export function needsTime(item: Item): boolean {
  return item.kind === 'task' || item.kind === 'goal';
}

/**
 * Same rule as the generated `is_complete` column in the schema:
 * tasks and goals need a domain and a time; issues, notes and debts a domain only.
 */
export function missingFields(item: Item): MissingField[] {
  const missing: MissingField[] = [];
  if (item.domain_id === null) {
    missing.push('domain');
  }
  if (needsTime(item) && item.time_mode === null) {
    missing.push('time');
  }
  return missing;
}

/** A local date as YYYY-MM-DD, comparable with `items.due_date`. */
export function toIsoDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

function fromIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

export function addDays(isoDate: string, days: number): string {
  const date = fromIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

const dueDateFormat = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });

export function formatDueDate(isoDate: string): string {
  return dueDateFormat.format(fromIsoDate(isoDate));
}

const longDateFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Today, written out: weekday, day and month. */
export function formatToday(): string {
  return longDateFormat.format(new Date());
}

/** The local day of a timestamp such as `items.completed_at`. */
export function formatTimestampDate(timestamp: string): string {
  return dueDateFormat.format(new Date(timestamp));
}

const recurrenceRules = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
} as const satisfies Record<Recurrence, string>;

export const recurrences = ['daily', 'weekly', 'monthly'] as const satisfies readonly Recurrence[];

export function recurrenceRule(recurrence: Recurrence): string {
  return recurrenceRules[recurrence];
}

export function recurrenceOf(rule: string | null): Recurrence | null {
  return recurrences.find((recurrence) => recurrenceRules[recurrence] === rule) ?? null;
}

/**
 * The next occurrence after a recurring item is done.
 * Counted from today, or from the due date when it is still in the future.
 */
export function nextDueDate(current: string | null, recurrence: Recurrence, today: string): string {
  const base = current !== null && current > today ? current : today;
  if (recurrence === 'daily') {
    return addDays(base, 1);
  }
  if (recurrence === 'weekly') {
    return addDays(base, 7);
  }
  const date = fromIsoDate(base);
  date.setMonth(date.getMonth() + 1);
  return toIsoDate(date);
}

/** Which tab of the open-items page shows this item. Debts have their own page. */
export function segmentOf(item: Item): OpenSegment | null {
  if (item.kind === 'debt') {
    return null;
  }
  if (item.kind === 'note') {
    return 'notes';
  }
  if (item.time_mode === 'waiting') {
    return 'waiting';
  }
  if (item.time_mode === 'someday') {
    return 'someday';
  }
  return 'active';
}

export function activeSectionOf(item: Item, today: string): ActiveSection {
  if (item.due_date === null) {
    return 'undated';
  }
  if (item.due_date < today) {
    return 'overdue';
  }
  return item.due_date === today ? 'today' : 'upcoming';
}

export function isOverdue(item: Item, today: string): boolean {
  return item.status === 'open' && item.due_date !== null && item.due_date < today;
}

/** Open first, then by due date, then newest first. */
export function compareByDueDate(a: Item, b: Item): number {
  if (a.due_date !== null && b.due_date !== null && a.due_date !== b.due_date) {
    return a.due_date < b.due_date ? -1 : 1;
  }
  if (a.due_date === null && b.due_date !== null) {
    return 1;
  }
  if (a.due_date !== null && b.due_date === null) {
    return -1;
  }
  return a.created_at < b.created_at ? 1 : -1;
}
