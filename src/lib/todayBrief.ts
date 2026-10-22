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

/**
 * Items with no date, waiting, and on the shelf, as short lines, the longest untouched first.
 * An issue is not listed itself, only its steps: it may be kept as a record, like a note.
 */
export function looseGroups(timeline: Pick<Timeline, LooseGroup>): Record<LooseGroup, FocusRow[]> {
  const sorted = (entries: readonly ListEntry[]): FocusRow[] =>
    focusRows(entries)
      .filter((row) => row.item.kind !== 'issue')
      .sort((a, b) => lookedAt(a.item).localeCompare(lookedAt(b.item)));
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

/** The item "עוד רלוונטי?" asks about, and where it stands. */
export type StillRelevant = { readonly row: FocusRow; readonly group: 'undated' | 'someday' };

/**
 * The one item to ask "עוד רלוונטי?" about, there as long as any task or goal has no date or is
 * on the shelf. All of them take turns, a different one each day, the longest not looked at
 * first in line; an answer sends the item to the back, so another comes up. Those put aside for
 * today are left out.
 */
export function stillRelevant(
  groups: Pick<Record<LooseGroup, readonly FocusRow[]>, 'undated' | 'someday'>,
  today: string,
  putAside: ReadonlySet<string>,
): StillRelevant | null {
  const pool = (['undated', 'someday'] as const)
    .flatMap((group) =>
      groups[group]
        .filter(
          (row) =>
            (row.item.kind === 'task' || row.item.kind === 'goal') && !putAside.has(row.item.id),
        )
        .map((row) => ({ row, group })),
    )
    .sort((a, b) => lookedAt(a.row.item).localeCompare(lookedAt(b.row.item)));
  const day = Math.floor(Date.parse(`${today}T12:00:00Z`) / 86_400_000);
  return pool[day % Math.max(1, pool.length)] ?? null;
}

/** The groups of the home page's items with no time of their own, beside tasks and goals. */
export type OtherGroup = 'issues' | 'notes' | 'debts' | 'shopping' | 'trackers';

/**
 * Every open item that has no time of its own, by kind, the newest first: issues (kept as a
 * record or with steps), notes and values, debts, what is missing for shopping, and trackers
 * that do not repeat. A repeating tracker or missing item stands on its days instead.
 */
export function otherGroups(assigned: readonly Item[], today: string): Record<OtherGroup, Item[]> {
  const newest = (kept: (item: Item) => boolean): Item[] =>
    assigned.filter(kept).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    issues: newest((item) => item.kind === 'issue'),
    notes: newest((item) => item.kind === 'note'),
    debts: newest((item) => item.kind === 'debt'),
    shopping: newest(
      (item) =>
        item.kind === 'missing_item' &&
        item.run_id === null &&
        !(item.time_mode === 'recurring' && (item.due_date === null || item.due_date > today)),
    ),
    trackers: newest((item) => item.kind === 'tracker' && item.time_mode !== 'recurring'),
  };
}

/** Where the home page moves chosen items: to today, on to tomorrow or Sunday, or to urgent. */
export type MoveTarget = 'today' | 'tomorrow' | 'sunday' | 'urgent';

/** The next Sunday after a day. */
export function nextSunday(today: string): string {
  const weekday = new Date(`${today}T12:00:00`).getDay();
  return addDays(today, 7 - weekday);
}

/** Whether today's items can also be put off to Sunday: on Thursday and Friday. */
export function offersSunday(today: string): boolean {
  const weekday = new Date(`${today}T12:00:00`).getDay();
  return weekday === 4 || weekday === 5;
}

/**
 * Whether an item can be moved from the home page. An appointment keeps its hour, a debt with
 * a plan its payment day, and an issue its steps' dates; a repeating item moves its current
 * occurrence only, so it needs one.
 */
export function canMove(item: Item): boolean {
  if (item.kind !== 'task' && item.kind !== 'goal' && item.time_mode !== 'recurring') {
    return false;
  }
  return item.time_mode !== 'recurring' || item.due_date !== null;
}

/** What moving an item does: its current occurrence to a day, or its own time changed. */
export type MoveChange =
  | { readonly kind: 'occurrence'; readonly day: string; readonly time: string | null }
  | {
      readonly kind: 'update';
      readonly changes: Pick<Item, 'time_mode' | 'due_date' | 'due_time'>;
    };

/** How an item moves to today or tomorrow (keeping its hour), or to urgent (with no date). */
export function moveChange(item: Item, target: MoveTarget, today: string): MoveChange {
  if (target === 'urgent') {
    return { kind: 'update', changes: { time_mode: 'urgent', due_date: null, due_time: null } };
  }
  const day =
    target === 'today' ? today : target === 'sunday' ? nextSunday(today) : addDays(today, 1);
  if (item.time_mode === 'recurring') {
    return { kind: 'occurrence', day, time: item.due_time };
  }
  return {
    kind: 'update',
    changes: { time_mode: 'scheduled', due_date: day, due_time: item.due_time },
  };
}

/** What takes a move back: the occurrence to its day, or the item's own time as it was. */
export function moveBack(item: Item): MoveChange {
  return item.time_mode === 'recurring'
    ? { kind: 'occurrence', day: item.due_date ?? '', time: item.due_time }
    : {
        kind: 'update',
        changes: { time_mode: item.time_mode, due_date: item.due_date, due_time: item.due_time },
      };
}
