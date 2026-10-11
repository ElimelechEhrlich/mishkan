import type {
  ActiveSection,
  Item,
  MissingField,
  OpenSegment,
  QuickTime,
  Recurrence,
  ShoppingCategory,
  TimeChoice,
} from '../types/domain';

/** The categories of a missing item, in the order the shopping list shows them. */
export const shoppingCategories = [
  'urgent',
  'food',
  'clothing',
  'planned',
] as const satisfies readonly ShoppingCategory[];

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

/** The time a quick choice in the add sheet stands for. */
export function quickTimeChoice(quick: QuickTime, today: string): TimeChoice {
  if (quick === 'today' || quick === 'tomorrow') {
    return {
      time_mode: 'scheduled',
      due_date: quick === 'today' ? today : addDays(today, 1),
      recurrence_rule: null,
    };
  }
  return { time_mode: quick, due_date: null, recurrence_rule: null };
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

/** Which time tab shows this item. Notes, debts and shopping have no time and their own pages. */
export function segmentOf(item: Item): OpenSegment | null {
  if (
    item.kind === 'debt' ||
    item.kind === 'note' ||
    item.kind === 'missing_item' ||
    item.kind === 'shopping_run' ||
    item.kind === 'question'
  ) {
    return null;
  }
  if (item.time_mode === 'waiting') {
    return 'waiting';
  }
  if (item.time_mode === 'someday') {
    return 'someday';
  }
  return 'active';
}

export function activeSectionOf(dueDate: string | null, today: string): ActiveSection {
  if (dueDate === null) {
    return 'undated';
  }
  if (dueDate < today) {
    return 'overdue';
  }
  return dueDate === today ? 'today' : 'upcoming';
}

export function isContainer(item: Item): boolean {
  return item.kind === 'goal' || item.kind === 'issue';
}

/**
 * Open steps whose goal or issue is itself in `items` are shown inside it,
 * so they are taken out of the list.
 */
export function withoutNestedSteps(items: readonly Item[]): Item[] {
  const containerIds = new Set(items.filter(isContainer).map((item) => item.id));
  return items.filter((item) => item.parent_id === null || !containerIds.has(item.parent_id));
}

/** One row of a list: an item, and for a goal or issue its steps (done ones included). */
export type ListEntry = {
  readonly item: Item;
  readonly steps: readonly Item[];
  /** The earliest due date of the item and its open steps, for sorting and sections. */
  readonly dueDate: string | null;
};

export function toListEntries(items: readonly Item[], allSteps: readonly Item[]): ListEntry[] {
  return items.map((item) => {
    // Questions of an issue are not steps; they are listed on the issue's page.
    const steps = isContainer(item)
      ? allSteps.filter((step) => step.parent_id === item.id && step.kind === 'task')
      : [];
    const dueDates = [item, ...steps.filter((step) => step.status === 'open')]
      .map((entry) => entry.due_date)
      .filter((date) => date !== null);
    const dueDate = dueDates.reduce<string | null>(
      (earliest, date) => (earliest === null || date < earliest ? date : earliest),
      null,
    );
    return { item, steps, dueDate };
  });
}

/** By due date (undated last), then newest first. */
export function compareEntries(a: ListEntry, b: ListEntry): number {
  if (a.dueDate !== null && b.dueDate !== null && a.dueDate !== b.dueDate) {
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  if (a.dueDate === null && b.dueDate !== null) {
    return 1;
  }
  if (a.dueDate !== null && b.dueDate === null) {
    return -1;
  }
  return a.item.created_at < b.item.created_at ? 1 : -1;
}

export function isOverdue(item: Item, today: string): boolean {
  return item.status === 'open' && item.due_date !== null && item.due_date < today;
}
