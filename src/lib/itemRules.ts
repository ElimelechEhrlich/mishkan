import type {
  ActiveSection,
  AppointmentRepeat,
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
  // An issue has no time of its own; its steps carry the dates.
  if (item.kind === 'issue') {
    return 'active';
  }
  if (item.time_mode === 'waiting') {
    return 'waiting';
  }
  if (item.time_mode === 'someday') {
    return 'someday';
  }
  return 'active';
}

/** How many days after today count as the coming week. */
const comingWeekDays = 7;

/** Overdue, today, from tomorrow to a week from today, later, or with no date. */
export function activeSectionOf(dueDate: string | null, today: string): ActiveSection {
  if (dueDate === null) {
    return 'undated';
  }
  if (dueDate < today) {
    return 'overdue';
  }
  if (dueDate === today) {
    return 'today';
  }
  return dueDate <= addDays(today, comingWeekDays) ? 'thisWeek' : 'upcoming';
}

/** The groups of the active tab, in the order they are shown. */
export const activeSections = [
  'overdue',
  'today',
  'thisWeek',
  'upcoming',
  'undated',
] as const satisfies readonly ActiveSection[];

/** Active entries split by how soon they are due. */
export function splitBySection<T extends { readonly dueDate: string | null }>(
  entries: readonly T[],
  today: string,
): Record<ActiveSection, T[]> {
  const groups: Record<ActiveSection, T[]> = {
    overdue: [],
    today: [],
    thisWeek: [],
    upcoming: [],
    undated: [],
  };
  for (const entry of entries) {
    groups[activeSectionOf(entry.dueDate, today)].push(entry);
  }
  return groups;
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
    // An issue's own date, if one is left from a conversion, is not used: only its steps count.
    const dated = item.kind === 'issue' ? [] : [item];
    const dueDates = [...dated, ...steps.filter((step) => step.status === 'open')]
      .map((entry) => entry.due_date)
      .filter((date) => date !== null);
    const dueDate = dueDates.reduce<string | null>(
      (earliest, date) => (earliest === null || date < earliest ? date : earliest),
      null,
    );
    return { item, steps, dueDate };
  });
}

/** By due date (undated last), then by start time on the same day, then newest first. */
export function compareEntries(a: ListEntry, b: ListEntry): number {
  if (a.dueDate !== null && b.dueDate !== null && a.dueDate !== b.dueDate) {
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  const aStarts = a.item.starts_at;
  const bStarts = b.item.starts_at;
  if (aStarts !== null && bStarts !== null && aStarts !== bStarts) {
    return aStarts < bStarts ? -1 : 1;
  }
  if (aStarts !== null && bStarts === null && a.dueDate === b.dueDate) {
    return -1;
  }
  if (aStarts === null && bStarts !== null && a.dueDate === b.dueDate) {
    return 1;
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

const fullDateFormat = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** A date with its year, such as a birth date. */
export function formatFullDate(isoDate: string): string {
  return fullDateFormat.format(fromIsoDate(isoDate));
}

/** A stored timestamp as the value of a datetime-local field, in local time. */
export function toLocalDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${toIsoDate(date)}T${time}`;
}

/** The value of a datetime-local field (local time) as a timestamp to store. */
export function fromLocalDateTime(value: string): string {
  return new Date(value).toISOString();
}

const reminderFormat = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** A reminder time as people read it: day, month and time. */
export function formatReminder(timestamp: string): string {
  return reminderFormat.format(new Date(timestamp));
}

const clockFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });

/** The local time of a timestamp, such as 09:30. */
export function formatClock(timestamp: string): string {
  return clockFormat.format(new Date(timestamp));
}

/** How many appointments a series may hold, as the database allows. */
export const maxAppointments = 104;

export const appointmentRepeats = [
  'none',
  'weekly',
  'biweekly',
  'monthly',
] as const satisfies readonly AppointmentRepeat[];

/**
 * The local start times of a series, from the first one (YYYY-MM-DDTHH:mm), as
 * datetime-local values. A monthly series keeps the day of the month, or the
 * last day of a shorter month.
 */
export function seriesStarts(first: string, repeat: AppointmentRepeat, count: number): string[] {
  const [datePart = '', timePart = ''] = first.split('T');
  const total = repeat === 'none' ? 1 : Math.min(Math.max(Math.trunc(count), 1), maxAppointments);
  const starts: string[] = [];
  for (let index = 0; index < total; index += 1) {
    starts.push(`${seriesDate(datePart, repeat, index)}T${timePart}`);
  }
  return starts;
}

function seriesDate(firstDate: string, repeat: AppointmentRepeat, index: number): string {
  if (repeat === 'weekly') {
    return addDays(firstDate, 7 * index);
  }
  if (repeat === 'biweekly') {
    return addDays(firstDate, 14 * index);
  }
  if (repeat === 'monthly') {
    const start = fromIsoDate(firstDate);
    const target = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(start.getDate(), lastDay));
    return toIsoDate(target);
  }
  return firstDate;
}

/** What is for today across the whole home: what is late, and what is due today. */
export type Agenda = {
  readonly overdue: readonly ListEntry[];
  readonly today: readonly ListEntry[];
};

/**
 * Today's list, the same reckoning as the main page's "late" and "today": active tasks and
 * goals (a goal by its earliest open step), issues by their steps, and appointments. Each
 * group is in time order, the ones with an hour first.
 */
export function agendaOf(assigned: readonly Item[], steps: readonly Item[], today: string): Agenda {
  const rows = withoutNestedSteps(assigned).filter(
    (item) =>
      item.kind === 'issue' ||
      item.kind === 'appointment' ||
      ((item.kind === 'task' || item.kind === 'goal') && segmentOf(item) === 'active'),
  );
  const sections = splitBySection(toListEntries(rows, steps), today);
  return {
    overdue: [...sections.overdue].sort(compareEntries),
    today: [...sections.today].sort(compareEntries),
  };
}

/** How long a reminder can be put off from its notification. */
export const snoozeChoices = ['minutes10', 'minutes30', 'hour1', 'hours3', 'tomorrow'] as const;
export type SnoozeChoice = (typeof snoozeChoices)[number];

const snoozeMinutes: Record<Exclude<SnoozeChoice, 'tomorrow'>, number> = {
  minutes10: 10,
  minutes30: 30,
  hour1: 60,
  hours3: 180,
};

/** When a reminder put off by `choice` rings again: in a while, or tomorrow at nine. */
export function snoozeUntil(choice: SnoozeChoice, now: Date): string {
  if (choice === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  return new Date(now.getTime() + snoozeMinutes[choice] * 60_000).toISOString();
}
