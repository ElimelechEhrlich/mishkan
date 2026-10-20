import { goalProgress } from './goals';
import { addDays, formatClock } from './itemRules';
import type { Agenda, ListEntry, Timeline } from './itemRules';
import type { Item, ItemRepeat, OccurrenceCount } from '../types/domain';

/** What waits on the parents rather than on a date. */
export type WaitingOnYou = {
  /** Questions of issues that have no answer yet. */
  readonly questions: readonly Item[];
  /** Open goals whose steps are all done, which may have been reached. */
  readonly reachedGoals: readonly Item[];
};

export function waitingOnYou(
  items: readonly Item[],
  steps: readonly Item[],
  repeats: ReadonlyMap<string, ItemRepeat>,
  counts: ReadonlyMap<string, OccurrenceCount>,
): WaitingOnYou {
  const questions = items.filter(
    (item) =>
      item.kind === 'question' &&
      item.status === 'open' &&
      (item.answer === null || item.answer.trim() === ''),
  );
  const reachedGoals = items.filter((item) => {
    if (item.kind !== 'goal' || item.status !== 'open') {
      return false;
    }
    const own = steps.filter((step) => step.parent_id === item.id && step.kind === 'task');
    return own.length > 0 && goalProgress(own, repeats, counts).allDone;
  });
  return { questions, reachedGoals };
}

/** One thing on a day of the coming week. */
export type WeekThing = {
  readonly id: string;
  readonly title: string;
  /** Its hour, such as 16:30, when it has one. */
  readonly time: string | null;
};

export type WeekDay = {
  readonly date: string;
  readonly things: readonly WeekThing[];
};

/** An item's hour today: an appointment's start, or its own hour. */
export function hourOf(item: Item): string | null {
  if (item.kind === 'appointment' && item.starts_at !== null) {
    return formatClock(item.starts_at);
  }
  return item.due_time === null ? null : item.due_time.slice(0, 5);
}

/**
 * What a row stands for on a day: its own item, or, when it stands as the heading of steps,
 * those of its steps that fall on that day.
 */
function thingsOf(entry: ListEntry, date: string): WeekThing[] {
  const own = (item: Item): WeekThing => ({ id: item.id, title: item.title, time: hourOf(item) });
  if (entry.heading === true && entry.shown !== undefined) {
    return entry.shown.filter((step) => (step.due_date ?? entry.dueDate) === date).map(own);
  }
  return [own(entry.item)];
}

/**
 * The six days after today, each with what is due on it, by hour; a day with nothing has an
 * empty list.
 */
export function weekAhead(timeline: Timeline, today: string): WeekDay[] {
  const entries = [...timeline.tomorrow, ...timeline.thisWeek];
  const days: WeekDay[] = [];
  for (let offset = 1; offset <= 6; offset += 1) {
    const date = addDays(today, offset);
    const things = entries
      .filter((entry) => entry.dueDate === date)
      .flatMap((entry) => thingsOf(entry, date));
    days.push({
      date,
      things: [...things].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')),
    });
  }
  return days;
}

const weekdayFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
});

/** A day of the coming week as a short label, such as "יום ה׳, 15.10". */
export function weekdayLabel(isoDate: string): string {
  return weekdayFormat.format(new Date(`${isoDate}T12:00:00`));
}

/** Which part of the day it is, for the greeting. */
export type DayPart = 'morning' | 'noon' | 'evening' | 'night';

export function dayPartOf(hour: number): DayPart {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'noon';
  }
  if (hour >= 17 && hour < 21) {
    return 'evening';
  }
  return 'night';
}

/** The next thing today that has an hour, and how many minutes until it. */
export type NextUp = {
  readonly id: string;
  readonly title: string;
  readonly time: string;
  readonly minutes: number;
};

/** What has begun this many minutes ago still counts as now. */
const stillNow = 10;

/** Of what is due today (and urgent), the next thing with an hour, from a little before now. */
export function nextUp(agenda: Agenda, now: Date): NextUp | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let best: NextUp | null = null;
  for (const entry of [...agenda.urgent, ...agenda.today]) {
    const things =
      entry.heading === true && entry.shown !== undefined
        ? entry.shown.map((step) => ({ id: step.id, title: step.title, time: hourOf(step) }))
        : [{ id: entry.item.id, title: entry.item.title, time: hourOf(entry.item) }];
    for (const thing of things) {
      if (thing.time === null) {
        continue;
      }
      const [hours = 0, minutes = 0] = thing.time.split(':').map(Number);
      const until = hours * 60 + minutes - nowMinutes;
      if (until >= -stillNow && (best === null || until < best.minutes)) {
        best = { id: thing.id, title: thing.title, time: thing.time, minutes: until };
      }
    }
  }
  return best;
}

/** One short line on the first page: an item, and the goal or issue it is a step of. */
export type FocusRow = {
  readonly item: Item;
  readonly parentTitle: string | null;
};

/**
 * A group of today's page as short lines: a step under its goal's name rather than inside it,
 * and a goal or issue on its own only when no step of it is listed.
 */
export function focusRows(entries: readonly ListEntry[]): FocusRow[] {
  return entries.flatMap((entry): FocusRow[] => {
    const shown = entry.shown ?? [];
    if (
      shown.length > 0 &&
      (entry.heading === true || entry.item.kind === 'goal' || entry.item.kind === 'issue')
    ) {
      return shown.map((step) => ({ item: step, parentTitle: entry.item.title }));
    }
    if (entry.heading === true) {
      return [];
    }
    return [{ item: entry.item, parentTitle: entry.parent?.title ?? null }];
  });
}

/** The groups the first page chooses between. */
export type FocusGroup = 'overdue' | 'urgent' | 'today';

/** Each group's rows: late (and appointments to ask about), urgent, and today's. */
export function focusGroups(agenda: Agenda): Record<FocusGroup, FocusRow[]> {
  return {
    overdue: focusRows([...agenda.overdue, ...agenda.passed]),
    urgent: focusRows(agenda.urgent),
    today: focusRows([...agenda.today, ...agenda.ended]),
  };
}

/** The group shown first: today's, or else the first that holds anything. */
export function firstFocus(groups: Record<FocusGroup, readonly FocusRow[]>): FocusGroup {
  const order: readonly FocusGroup[] = ['today', 'urgent', 'overdue'];
  return order.find((group) => groups[group].length > 0) ?? 'today';
}

/** What a short line shows at its end: its hour, or for what is late the day it was due. */
export function focusMeta(item: Item, group: FocusGroup): string | null {
  const hour = hourOf(item);
  if (hour !== null) {
    return hour;
  }
  if (group === 'overdue' && item.due_date !== null) {
    return `${String(Number(item.due_date.slice(8, 10)))}.${String(Number(item.due_date.slice(5, 7)))}`;
  }
  return null;
}

const narrowWeekday = new Intl.DateTimeFormat('he-IL', { weekday: 'narrow' });

/** A day as the strip of days shows it: its weekday letter and its day of the month. */
export function dayChip(isoDate: string): { readonly weekday: string; readonly day: string } {
  return {
    weekday: narrowWeekday.format(new Date(`${isoDate}T12:00:00`)),
    day: String(Number(isoDate.slice(8, 10))),
  };
}

/** The days of this week, Sunday to Saturday, as the strip of days shows them. */
export function thisWeek(today: string): string[] {
  const weekday = new Date(`${today}T12:00:00`).getDay();
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - weekday));
}

/** The groups of the home page's second card: with no date, waiting, and on the shelf. */
export type LooseGroup = 'undated' | 'waiting' | 'someday';

/** When an item was last looked at: by "עוד רלוונטי?", or else when it was added. */
function lookedAt(item: Item): string {
  return item.reviewed_at ?? item.created_at;
}

/** Items with no date, waiting, and on the shelf, as short lines, the longest untouched first. */
export function looseGroups(timeline: Pick<Timeline, LooseGroup>): Record<LooseGroup, FocusRow[]> {
  const sorted = (entries: readonly ListEntry[]): FocusRow[] =>
    focusRows(entries).sort((a, b) => lookedAt(a.item).localeCompare(lookedAt(b.item)));
  return {
    undated: sorted(timeline.undated),
    waiting: sorted(timeline.waiting),
    someday: sorted(timeline.someday),
  };
}

/** Whole days from a timestamp to now. */
export function daysSince(timestamp: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(timestamp).getTime()) / 86_400_000));
}

/** How long an item must rest, from when it was added or last looked at, before it is asked about. */
export const reviewAfterDays = 7;

/** The item "עוד רלוונטי?" asks about, and where it stands. */
export type StillRelevant = { readonly row: FocusRow; readonly group: 'undated' | 'someday' };

/**
 * The one item to ask "עוד רלוונטי?" about: of the tasks and goals with no date or on the shelf,
 * the one longest not looked at, once a week has passed since. Those put aside for today are
 * left out.
 */
export function stillRelevant(
  groups: Pick<Record<LooseGroup, readonly FocusRow[]>, 'undated' | 'someday'>,
  now: Date,
  putAside: ReadonlySet<string>,
): StillRelevant | null {
  const candidates = (['undated', 'someday'] as const).flatMap((group) =>
    groups[group]
      .filter(
        (row) =>
          (row.item.kind === 'task' || row.item.kind === 'goal') &&
          !putAside.has(row.item.id) &&
          daysSince(lookedAt(row.item), now) >= reviewAfterDays,
      )
      .map((row) => ({ row, group })),
  );
  const [first] = candidates.sort((a, b) =>
    lookedAt(a.row.item).localeCompare(lookedAt(b.row.item)),
  );
  return first ?? null;
}
