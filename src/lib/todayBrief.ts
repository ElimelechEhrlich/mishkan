import { goalProgress } from './goals';
import { addDays, formatClock } from './itemRules';
import type { ListEntry, Timeline } from './itemRules';
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

function hourOf(item: Item): string | null {
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
 * The six days after today, each with what is due on it, in the timeline's order (by hour).
 * Days with nothing are left out.
 */
export function weekAhead(timeline: Timeline, today: string): WeekDay[] {
  const entries = [...timeline.tomorrow, ...timeline.thisWeek];
  const days: WeekDay[] = [];
  for (let offset = 1; offset <= 6; offset += 1) {
    const date = addDays(today, offset);
    const things = entries
      .filter((entry) => entry.dueDate === date)
      .flatMap((entry) => thingsOf(entry, date));
    if (things.length > 0) {
      days.push({
        date,
        things: [...things].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')),
      });
    }
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
