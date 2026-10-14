import { labels } from '../constants/labels';
import type { Item, ItemRepeat, Occurrence, RepeatDraft, RepeatUnit } from '../types/domain';
import { formatDueDate, recurrenceOf, todayIso } from './itemRules';
import { amountText } from './reminders';

function parts(isoDate: string): [number, number, number] {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return [year, month, day];
}

function iso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The day `count` steps after a first day. Months and years count from the first day, so a
 * rhythm on the 31st falls on the last day of a short month and on the 31st again after it.
 * The same rule as repeat_day_after() on the server.
 */
export function stepFrom(starts: string, every: number, unit: RepeatUnit, count: number): string {
  const [year, month, day] = parts(starts);
  if (unit === 'day' || unit === 'week') {
    const days = every * count * (unit === 'week' ? 7 : 1);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const months = every * count * (unit === 'year' ? 12 : 1);
  const total = month - 1 + months;
  const targetYear = year + Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  return iso(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** The first day of the rhythm after `after` (or on it, when `inclusive`). */
export function dayAfter(
  starts: string,
  every: number,
  unit: RepeatUnit,
  after: string,
  inclusive: boolean,
): string {
  for (let count = 0; count < 100000; count += 1) {
    const day = stepFrom(starts, every, unit, count);
    if (day > after || (inclusive && day === after)) {
      return day;
    }
  }
  return starts;
}

/**
 * The occurrences ahead of an item, from its current one: up to `limit` days, stopping where
 * its series ends (a number of times, a last day, or "stop repeating").
 */
export function upcomingDays(
  repeat: ItemRepeat,
  currentDay: string | null,
  marked: number,
  limit: number,
): string[] {
  const days: string[] = [];
  let day = currentDay;
  let used = marked;
  while (day !== null && days.length < limit) {
    if (repeat.end_kind === 'until' && repeat.end_until !== null && day > repeat.end_until) {
      break;
    }
    if (repeat.stopped_on !== null && day > repeat.stopped_on) {
      break;
    }
    if (repeat.end_kind === 'count' && repeat.end_count !== null && used >= repeat.end_count) {
      break;
    }
    days.push(day);
    used += 1;
    day = dayAfter(repeat.starts_on, repeat.every, repeat.unit, day, false);
  }
  return days;
}

const ruleUnits: Readonly<Record<string, RepeatUnit>> = {
  DAILY: 'day',
  WEEKLY: 'week',
  MONTHLY: 'month',
  YEARLY: 'year',
};

/** The rhythm kept on an item for older versions of the app: "FREQ=MONTHLY;INTERVAL=3". */
export function rhythmOfRule(
  rule: string | null,
): { readonly every: number; readonly unit: RepeatUnit } | null {
  const match = rule === null ? null : /^FREQ=([A-Z]+)(?:;INTERVAL=(\d+))?$/.exec(rule);
  const unit = match?.[1] === undefined ? undefined : ruleUnits[match[1]];
  if (match === null || unit === undefined) {
    return null;
  }
  return { every: match[2] === undefined ? 1 : Number(match[2]), unit };
}

/** "every day", "every 3 months". */
export function rhythmText(every: number, unit: RepeatUnit): string {
  return `${labels.reminders.every} ${amountText(every, unit)}`;
}

/** How a series ends, in words: "no end", "7 times", "until 20 Nov". */
export function endText(draft: Pick<RepeatDraft, 'endKind' | 'endCount' | 'endUntil'>): string {
  if (draft.endKind === 'count' && draft.endCount !== null) {
    return labels.repeat.times(draft.endCount);
  }
  if (draft.endKind === 'until' && draft.endUntil !== null) {
    return `${labels.reminders.untilPrefix} ${formatDueDate(draft.endUntil)}`;
  }
  return labels.repeat.noEnd;
}

/** The sentence at the head of the repeat settings: "every 3 months · at 08:00 · 7 times". */
export function repeatSummary(draft: RepeatDraft): string {
  return [
    rhythmText(draft.every, draft.unit),
    ...(draft.atTime === null ? [] : [`${labels.reminders.at}${draft.atTime}`]),
    endText(draft),
  ].join(labels.item.separator);
}

export function draftOfRepeat(repeat: ItemRepeat): RepeatDraft {
  return {
    every: repeat.every,
    unit: repeat.unit,
    startsOn: repeat.starts_on,
    atTime: repeat.at_time === null ? null : repeat.at_time.slice(0, 5),
    endKind: repeat.end_kind,
    endCount: repeat.end_count,
    endUntil: repeat.end_until,
  };
}

/**
 * The settings a repeat starts from: the item's own when it has them (kept even while another
 * time was chosen), else every week from the item's date or today, at its hour, with no end.
 */
export function startingRepeat(item: Item, repeat: ItemRepeat | null): RepeatDraft {
  if (repeat !== null) {
    return draftOfRepeat(repeat);
  }
  const old = recurrenceOf(item.recurrence_rule);
  return {
    every: 1,
    unit: old === 'daily' ? 'day' : old === 'monthly' ? 'month' : 'week',
    startsOn: item.due_date ?? todayIso(),
    atTime: item.due_time === null ? null : item.due_time.slice(0, 5),
    endKind: 'never',
    endCount: null,
    endUntil: null,
  };
}

/** Whether a series has no occurrence left: it ended, or was stopped with nothing due. */
export function hasEnded(item: Item): boolean {
  return item.time_mode === 'recurring' && item.due_date === null;
}

/** How many of a series' occurrences have gone by (marked or missed). */
export function goneBy(occurrences: readonly Occurrence[]): number {
  return occurrences.filter((occurrence) => occurrence.status !== 'closed_with_parent').length;
}

/** "Done 11 · skipped 1 · missed 2", leaving out what is zero. */
export function historyCounts(occurrences: readonly Occurrence[]): string {
  const count = (status: Occurrence['status']): number =>
    occurrences.filter((occurrence) => occurrence.status === status).length;
  return (['done', 'skipped', 'missed'] as const)
    .filter((status) => count(status) > 0)
    .map((status) => `${labels.occurrence[status]} ${String(count(status))}`)
    .join(labels.item.separator);
}
