import type {
  ActiveSection,
  AppointmentRepeat,
  Item,
  ItemUpdate,
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
export function quickTimeChoice(quick: QuickTime, today: string, hour = ''): TimeChoice {
  if (quick === 'today' || quick === 'tomorrow') {
    return {
      time_mode: 'scheduled',
      due_date: quick === 'today' ? today : addDays(today, 1),
      due_time: hour === '' ? null : hour,
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

const pickedDateFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** A chosen day as a field shows it: "יום ד׳, 14 באוק׳". */
export function formatPickedDate(isoDate: string): string {
  return pickedDateFormat.format(fromIsoDate(isoDate));
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
 * The next occurrence after a recurring item is done. It keeps its own rhythm: the next
 * step after its due date, skipping any that already passed, so a Tuesday chore done late
 * on Thursday is next due on Tuesday. With no due date, it counts from today.
 */
export function nextDueDate(current: string | null, recurrence: Recurrence, today: string): string {
  const step = (date: string): string => {
    if (recurrence === 'daily') {
      return addDays(date, 1);
    }
    if (recurrence === 'weekly') {
      return addDays(date, 7);
    }
    // Monthly keeps the day, or the last day of a shorter month (the 31st → the 30th).
    const start = fromIsoDate(date);
    const target = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(start.getDate(), lastDay));
    return toIsoDate(target);
  };
  let next = step(current ?? today);
  // Bounded, for an item left undone for years.
  for (let guard = 0; next <= today && guard < 1000; guard += 1) {
    next = step(next);
  }
  return next;
}

/**
 * Whether the kind runs on time of its own. A date or rhythm left on another kind by a
 * conversion is kept, hidden, for converting back, and is not shown or used.
 */
export function hasOwnTime(item: Item): boolean {
  return (
    item.kind === 'task' ||
    item.kind === 'goal' ||
    item.kind === 'appointment' ||
    // A tracker or a missing item has a time only while it repeats.
    ((item.kind === 'tracker' || item.kind === 'missing_item') && item.time_mode === 'recurring')
  );
}

/** Which time tab shows this item. Notes, debts and shopping have no time and their own pages. */
export function segmentOf(item: Item): OpenSegment | null {
  // A repeating tracker or missing item is listed by its occurrences, like a task.
  if ((item.kind === 'tracker' || item.kind === 'missing_item') && item.time_mode === 'recurring') {
    return 'active';
  }
  if (
    item.kind === 'debt' ||
    item.kind === 'note' ||
    item.kind === 'tracker' ||
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

/**
 * Overdue, urgent, today, from tomorrow to a week from today, later, or with no date.
 * Something urgent ("דחוף") stands in a group of its own, beside today's, unless it is
 * already late.
 */
export function activeSectionOf(
  dueDate: string | null,
  today: string,
  urgent = false,
): ActiveSection {
  if (dueDate !== null && dueDate < today) {
    return 'overdue';
  }
  if (urgent) {
    return 'urgent';
  }
  if (dueDate === today) {
    return 'today';
  }
  if (dueDate === null) {
    return 'undated';
  }
  return dueDate <= addDays(today, comingWeekDays) ? 'thisWeek' : 'upcoming';
}

/** The groups of the active tab, in the order they are shown. */
export const activeSections = [
  'overdue',
  'urgent',
  'today',
  'ended',
  'thisWeek',
  'upcoming',
  'undated',
  'passed',
] as const satisfies readonly ActiveSection[];

/** Active entries split by how soon they are due. */
export function splitBySection<
  T extends {
    readonly item: Pick<Item, 'kind' | 'time_mode'>;
    readonly dueDate: string | null;
    readonly urgent: boolean;
    readonly target: string | null;
  },
>(entries: readonly T[], today: string): Record<ActiveSection, T[]> {
  const groups: Record<ActiveSection, T[]> = {
    overdue: [],
    urgent: [],
    today: [],
    ended: [],
    thisWeek: [],
    upcoming: [],
    undated: [],
    passed: [],
  };
  for (const entry of entries) {
    groups[sectionOfEntry(entry, today)].push(entry);
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

/**
 * Which time tab a step goes to inside a goal that waits or is on the shelf: with a date
 * of its own, or urgent, it is to be done on its own and goes by its own time; without
 * one it rests with its goal.
 */
export function segmentWithin(item: Item, byId: ReadonlyMap<string, Item>): OpenSegment | null {
  const own = segmentOf(item);
  if (
    own !== 'active' ||
    item.parent_id === null ||
    item.due_date !== null ||
    item.time_mode === 'urgent'
  ) {
    return own;
  }
  const parent = byId.get(item.parent_id);
  const parentSegment = parent === undefined ? null : segmentOf(parent);
  return parentSegment === 'waiting' || parentSegment === 'someday' ? parentSegment : own;
}

/**
 * The rows of one time tab, out of `items` (every open item, so a step finds its goal),
 * those that `include` keeps. A step goes inside its goal or issue when that is in the
 * same rows, and stands as a row of its own when it is not, so nothing due is missed.
 */
export function rowsOfSegment(
  items: readonly Item[],
  segment: OpenSegment,
  include: (item: Item) => boolean = () => true,
): Item[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return withoutNestedSteps(
    items.filter((item) => include(item) && segmentWithin(item, byId) === segment),
  );
}

/** One row of a list: an item, and for a goal or issue its steps (done ones included). */
export type ListEntry = {
  readonly item: Item;
  readonly steps: readonly Item[];
  /**
   * When it is next due, for sorting and sections: the earliest of the item and its open
   * steps; for a goal, its earliest open step, or its target date when no step has a date.
   */
  readonly dueDate: string | null;
  /** Marked urgent ("דחוף"), itself or one of its open steps. */
  readonly urgent: boolean;
  /** A goal's target date ("עד"): when all its steps are to be done. Once past, it is late. */
  readonly target: string | null;
  /** The goal or issue of a step that stands as a row of its own, so the row can say so. */
  readonly parent: Item | null;
  /**
   * In a list by time, the steps shown inside this goal or issue here: those of this group
   * only, each step in the group of its own time. Undefined shows every open step.
   */
  readonly shown?: readonly Item[];
  /** The goal or issue stands here only as the heading of some of its steps. */
  readonly heading?: boolean;
};

function earliest(dates: readonly (string | null)[]): string | null {
  return dates.reduce<string | null>(
    (first, date) => (date !== null && (first === null || date < first) ? date : first),
    null,
  );
}

/** Where a step stands by its own time: its group, and its day in the groups that span days. */
function stepPlace(
  step: Item,
  today: string,
): { readonly section: ActiveSection; readonly key: string } {
  const section = sectionOfEntry(
    { item: step, dueDate: step.due_date, urgent: step.time_mode === 'urgent', target: null },
    today,
  );
  const spansDays = section === 'thisWeek' || section === 'upcoming' || section === 'passed';
  return { section, key: spansDays ? `${section}:${step.due_date ?? ''}` : section };
}

/**
 * For a list by time: each step in the group of its own time, under its goal or issue as a
 * heading, and steps of the same group under one heading. What has no date of its own stays
 * inside the goal, which stands by its target date (or with no date). A step that stands on
 * its own, of a goal that waits or is on the shelf, gets its goal as a heading too.
 */
export function byStepPlace(entries: readonly ListEntry[], today: string): ListEntry[] {
  const result: ListEntry[] = [];
  const headings = new Map<string, { goal: Item; steps: Item[] }>();
  const addToHeading = (goal: Item, step: Item): void => {
    const key = `${goal.id}|${stepPlace(step, today).key}`;
    const heading = headings.get(key);
    if (heading === undefined) {
      headings.set(key, { goal, steps: [step] });
    } else {
      heading.steps.push(step);
    }
  };
  for (const entry of entries) {
    if (entry.parent !== null) {
      addToHeading(entry.parent, entry.item);
      continue;
    }
    const open = entry.steps.filter((step) => step.status === 'open');
    if (!isContainer(entry.item) || open.length === 0) {
      result.push(entry);
      continue;
    }
    // An urgent goal stands among the urgent, holding its urgent steps (made so with it).
    const goalUrgent = entry.item.kind === 'goal' && entry.item.time_mode === 'urgent';
    const staysInside = (step: Item): boolean => {
      const section = stepPlace(step, today).section;
      return section === 'undated' || (goalUrgent && section === 'urgent');
    };
    const resting = open.filter(staysInside);
    for (const step of open) {
      if (!staysInside(step)) {
        addToHeading(entry.item, step);
      }
    }
    // The goal itself, with what has no date, by its target; left out when its steps say it all.
    if (resting.length > 0 || entry.target !== null || goalUrgent) {
      result.push({
        ...entry,
        shown: resting,
        dueDate: entry.target,
        urgent: goalUrgent,
      });
    }
  }
  for (const { goal, steps } of headings.values()) {
    result.push({
      item: goal,
      steps: [],
      shown: steps,
      dueDate: earliest(steps.map((step) => step.due_date)),
      urgent: steps.some((step) => step.time_mode === 'urgent'),
      target: null,
      parent: null,
      heading: true,
    });
  }
  return result;
}

/**
 * Rows for a list. `parentsFrom` holds the items a step's goal or issue is looked up in,
 * where a step may stand on its own.
 */
export function toListEntries(
  items: readonly Item[],
  allSteps: readonly Item[],
  parentsFrom: readonly Item[] = [],
): ListEntry[] {
  const parents = new Map(parentsFrom.filter(isContainer).map((item) => [item.id, item]));
  return items.map((item) => {
    // Questions of an issue are not steps; they are listed on the issue's page.
    const steps = isContainer(item)
      ? allSteps.filter((step) => step.parent_id === item.id && step.kind === 'task')
      : [];
    const openSteps = steps.filter((step) => step.status === 'open');
    const stepsDue = earliest(openSteps.map((step) => step.due_date));
    // A goal's own date is its target; an issue's, if one is left from a conversion, is not used.
    const target = item.kind === 'goal' ? item.due_date : null;
    const dueDate =
      item.kind === 'goal'
        ? (stepsDue ?? target)
        : item.kind === 'issue'
          ? stepsDue
          : earliest([hasOwnTime(item) ? item.due_date : null, stepsDue]);
    const urgent = [...(hasOwnTime(item) ? [item] : []), ...openSteps].some(
      (entry) => entry.time_mode === 'urgent',
    );
    const parent = item.parent_id === null ? null : (parents.get(item.parent_id) ?? null);
    return { item, steps, dueDate, urgent, target, parent };
  });
}

/**
 * Where an entry stands among the active groups. A goal is for today on its target day,
 * and late once that day has passed.
 */
export function sectionOfEntry(
  entry: {
    readonly item: Pick<Item, 'kind' | 'time_mode'>;
    readonly dueDate: string | null;
    readonly urgent: boolean;
    readonly target: string | null;
  },
  today: string,
): ActiveSection {
  // A repeating task whose occurrences have run out waits to be marked done itself.
  if (
    (entry.item.kind === 'task' ||
      entry.item.kind === 'appointment' ||
      entry.item.kind === 'tracker' ||
      entry.item.kind === 'missing_item') &&
    entry.item.time_mode === 'recurring' &&
    entry.dueDate === null &&
    !entry.urgent
  ) {
    return 'ended';
  }
  // An appointment whose day has passed is not late: it either happened or needs a new date.
  if (entry.item.kind === 'appointment' && entry.dueDate !== null && entry.dueDate < today) {
    return 'passed';
  }
  if (entry.target !== null && entry.target < today) {
    return 'overdue';
  }
  const section = activeSectionOf(entry.dueDate, today, entry.urgent);
  // On its target day a goal is for today, even when its steps are dated later.
  if (
    entry.target === today &&
    (section === 'thisWeek' || section === 'upcoming' || section === 'undated')
  ) {
    return 'today';
  }
  return section;
}

/**
 * For one list of mixed rows, such as a domain's: late first, then urgent, then by how
 * soon they are due, as the sections of the time lists run.
 */
export function compareBySection(today: string): (a: ListEntry, b: ListEntry) => number {
  return (a, b) =>
    activeSections.indexOf(sectionOfEntry(a, today)) -
      activeSections.indexOf(sectionOfEntry(b, today)) || compareEntries(a, b);
}

/** Newest first by when they were done. */
export function byDoneTime<T extends Item>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
}

/** A missing item already in a shopping run is shown inside the run, not again on its own. */
export function isInRun(item: Item): boolean {
  return item.kind === 'missing_item' && item.run_id !== null;
}

/** The hour an item is set for on its day (HH:MM): an appointment's start, or a task's hour. */
export function clockOf(item: Item): string | null {
  if (item.starts_at !== null) {
    return toLocalDateTime(item.starts_at).slice(11, 16);
  }
  return item.due_time === null ? null : item.due_time.slice(0, 5);
}

/**
 * By due date (undated last), then on the same day those with an hour first, by hour, then
 * newest first.
 */
export function compareEntries(a: ListEntry, b: ListEntry): number {
  if (a.dueDate !== null && b.dueDate !== null && a.dueDate !== b.dueDate) {
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  // An hour counts only when the row is dated by the item itself, not by one of its steps.
  const aClock = a.dueDate !== null && a.dueDate === a.item.due_date ? clockOf(a.item) : null;
  const bClock = b.dueDate !== null && b.dueDate === b.item.due_date ? clockOf(b.item) : null;
  if (aClock !== null && bClock !== null && aClock !== bClock) {
    return aClock < bClock ? -1 : 1;
  }
  if (aClock !== null && bClock === null && a.dueDate === b.dueDate) {
    return -1;
  }
  if (aClock === null && bClock !== null && a.dueDate === b.dueDate) {
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

/** The rhythm a new appointment series repeats by; null for a single appointment. */
export function appointmentRhythm(
  repeat: AppointmentRepeat,
): { readonly every: number; readonly unit: 'week' | 'month' } | null {
  switch (repeat) {
    case 'weekly':
      return { every: 1, unit: 'week' };
    case 'biweekly':
      return { every: 2, unit: 'week' };
    case 'monthly':
      return { every: 1, unit: 'month' };
    case 'none':
      return null;
  }
}

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
  /** Marked urgent, with no date or a later one. */
  readonly urgent: readonly ListEntry[];
  readonly today: readonly ListEntry[];
  /** Appointments whose day has passed and were not marked as held; not counted as late. */
  readonly passed: readonly ListEntry[];
  /** Repeating tasks with no occurrence left, waiting to be marked done themselves. */
  readonly ended: readonly ListEntry[];
};

/** The kinds that run on time: tasks, goals, issues by their steps, appointments, and what repeats. */
function runsOnTime(item: Item): boolean {
  return (
    item.kind === 'issue' ||
    item.kind === 'appointment' ||
    item.kind === 'task' ||
    item.kind === 'goal' ||
    // A repeating tracker or missing item shows on the days of its occurrences.
    ((item.kind === 'tracker' || item.kind === 'missing_item') && item.time_mode === 'recurring')
  );
}

/** The rows of one time tab, of every kind that runs on time, as list entries. */
function entriesOf(
  assigned: readonly Item[],
  steps: readonly Item[],
  segment: OpenSegment,
  today: string,
): ListEntry[] {
  // A step goes inside its goal only when the goal itself is listed; the step of a goal
  // that waits or is on the shelf is listed on its own, so nothing due is missed.
  const entries = toListEntries(rowsOfSegment(assigned, segment, runsOnTime), steps, assigned);
  return segment === 'active' ? byStepPlace(entries, today) : entries;
}

function inOrder(entries: readonly ListEntry[]): ListEntry[] {
  return [...entries].sort(compareEntries);
}

/**
 * Today's list, the same reckoning as the main page's "late" and "today": active tasks and
 * goals (a goal by its earliest open step), issues by their steps, and appointments. Each
 * group is in time order, the ones with an hour first.
 */
export function agendaOf(assigned: readonly Item[], steps: readonly Item[], today: string): Agenda {
  const sections = splitBySection(entriesOf(assigned, steps, 'active', today), today);
  return {
    overdue: inOrder(sections.overdue),
    urgent: inOrder(sections.urgent),
    today: inOrder(sections.today),
    passed: inOrder(sections.passed),
    ended: inOrder(sections.ended),
  };
}

/** Everything that runs on time, from what is late to what is on the shelf. */
export type Timeline = Agenda & {
  readonly tomorrow: readonly ListEntry[];
  /** From the day after tomorrow to a week from today. */
  readonly thisWeek: readonly ListEntry[];
  readonly upcoming: readonly ListEntry[];
  readonly undated: readonly ListEntry[];
  readonly waiting: readonly ListEntry[];
  readonly someday: readonly ListEntry[];
};

/**
 * Today's list and on to every other time: tomorrow, the coming week, later, with no date,
 * waiting and on the shelf, of the same kinds and in the same order as today's.
 */
export function timelineOf(
  assigned: readonly Item[],
  steps: readonly Item[],
  today: string,
): Timeline {
  const sections = splitBySection(entriesOf(assigned, steps, 'active', today), today);
  const tomorrow = addDays(today, 1);
  return {
    ...agendaOf(assigned, steps, today),
    tomorrow: inOrder(sections.thisWeek.filter((entry) => entry.dueDate === tomorrow)),
    thisWeek: inOrder(sections.thisWeek.filter((entry) => entry.dueDate !== tomorrow)),
    upcoming: inOrder(sections.upcoming),
    undated: inOrder(sections.undated),
    waiting: inOrder(entriesOf(assigned, steps, 'waiting', today)),
    someday: inOrder(entriesOf(assigned, steps, 'someday', today)),
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

/**
 * Items with the changes still being saved laid over them, so a change shows the moment it is
 * made, and a list loaded meanwhile (from the server, before the save) does not undo it.
 */
export function withPending(
  items: readonly Item[],
  pending: ReadonlyMap<string, ItemUpdate>,
): Item[] {
  if (pending.size === 0) {
    return [...items];
  }
  return items.map((item) => {
    const changes = pending.get(item.id);
    return changes === undefined ? item : { ...item, ...changes };
  });
}
