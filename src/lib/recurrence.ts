import { labels } from '../constants/labels';
import type { Item, ItemRepeat, Occurrence, RepeatDraft, RepeatUnit } from '../types/domain';
import { addDays, formatDueDate, recurrenceOf, todayIso, toLocalDateTime } from './itemRules';
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

/** One occurrence: its day, and its hour (HH:MM) or null for the whole day. */
export type Slot = { readonly day: string; readonly time: string | null };

function weekdayOf(isoDate: string): number {
  const [year, month, day] = parts(isoDate);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function daysBetweenIso(from: string, to: string): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** The hours of a series (HH:MM), earliest first; empty for the whole day. */
export function repeatTimes(repeat: ItemRepeat): string[] {
  const times =
    repeat.times.length > 0 ? repeat.times : repeat.at_time === null ? [] : [repeat.at_time];
  return [...new Set(times.map((time) => time.slice(0, 5)))].sort();
}

/** Whether a day is one of the series' days. The same rule as repeat_is_day() on the server. */
export function isRhythmDay(repeat: ItemRepeat, day: string): boolean {
  if (day < repeat.starts_on) {
    return false;
  }
  if (repeat.dates.length > 0) {
    return repeat.dates.includes(day);
  }
  if (repeat.unit === 'week' && repeat.weekdays.length > 0) {
    const weekStart = stepFrom(repeat.starts_on, -weekdayOf(repeat.starts_on), 'day', 1);
    return (
      repeat.weekdays.includes(weekdayOf(day)) &&
      Math.floor(daysBetweenIso(weekStart, day) / 7) % repeat.every === 0
    );
  }
  return dayAfter(repeat.starts_on, repeat.every, repeat.unit, day, true) === day;
}

/** The first day of the series after a day. */
export function nextRhythmDay(repeat: ItemRepeat, day: string): string | null {
  if (repeat.dates.length > 0) {
    return [...repeat.dates].sort().find((date) => date > day && date >= repeat.starts_on) ?? null;
  }
  if (repeat.unit === 'week' && repeat.weekdays.length > 0) {
    for (let step = 1; step <= 7 * repeat.every * 2 + 7; step += 1) {
      const candidate = stepFrom(day, step, 'day', 1);
      if (candidate >= repeat.starts_on && isRhythmDay(repeat, candidate)) {
        return candidate;
      }
    }
    return null;
  }
  return dayAfter(repeat.starts_on, repeat.every, repeat.unit, day, false);
}

function allows(repeat: ItemRepeat, day: string, marked: number): boolean {
  return (
    (repeat.end_kind !== 'count' || repeat.end_count === null || marked < repeat.end_count) &&
    (repeat.end_kind !== 'until' || repeat.end_until === null || day <= repeat.end_until) &&
    (repeat.stopped_on === null || day <= repeat.stopped_on)
  );
}

/** The occurrence after one, by the rhythm. The same rule as repeat_next_slot() on the server. */
export function nextSlot(repeat: ItemRepeat, after: Slot, marked: number): Slot | null {
  const times = repeatTimes(repeat);
  if (isRhythmDay(repeat, after.day) && after.time !== null) {
    const later = times.find((time) => after.time !== null && time > after.time);
    if (later !== undefined) {
      return allows(repeat, after.day, marked) ? { day: after.day, time: later } : null;
    }
  }
  const day = nextRhythmDay(repeat, after.day);
  if (day === null || !allows(repeat, day, marked)) {
    return null;
  }
  return { day, time: times[0] ?? null };
}

/**
 * The occurrences ahead of an item, from its current one: up to `limit`, stopping where its
 * series ends (a number of times, a last day, or "stop repeating"). One moved goes on from
 * where it was planned.
 */
export function upcomingSlots(
  repeat: ItemRepeat,
  current: Slot | null,
  marked: number,
  limit: number,
): Slot[] {
  if (current === null || !allows(repeat, current.day, marked)) {
    return [];
  }
  const slots: Slot[] = [current];
  let base: Slot =
    repeat.planned_date === null
      ? current
      : { day: repeat.planned_date, time: repeat.planned_time?.slice(0, 5) ?? null };
  while (slots.length < limit) {
    const next = nextSlot(repeat, base, marked + slots.length);
    if (next === null) {
      break;
    }
    slots.push(next);
    base = next;
  }
  return slots;
}

/** The days of the week, Sunday first, as a short name each. */
export const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;

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

/** A day so many days, weeks, months or years on (a month's end kept within the month). */
function addUnits(day: string, amount: number, unit: RepeatUnit): string {
  if (unit === 'day' || unit === 'week') {
    return addDays(day, unit === 'week' ? amount * 7 : amount);
  }
  const months = unit === 'year' ? amount * 12 : amount;
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date, last));
  return target.toISOString().slice(0, 10);
}

/**
 * The last day of so many days (or weeks, months, years) of a rhythm from its first day: ten
 * days of an antibiotic twice a day end on the tenth day, whatever the number of times.
 */
export function periodsEnd(
  startsOn: string,
  every: number,
  unit: RepeatUnit,
  periods: number,
): string {
  return addDays(addUnits(startsOn, periods * every, unit), -1);
}

/** How many days (weeks, …) a series ending on its last day runs, when it ends on one. */
export function periodsOf(
  draft: Pick<RepeatDraft, 'startsOn' | 'every' | 'unit' | 'endKind' | 'endUntil'>,
): number | null {
  if (draft.endKind !== 'until' || draft.endUntil === null) {
    return null;
  }
  for (let periods = 1; periods <= 500; periods += 1) {
    const end = periodsEnd(draft.startsOn, draft.every, draft.unit, periods);
    if (end === draft.endUntil) {
      return periods;
    }
    if (end > draft.endUntil) {
      return null;
    }
  }
  return null;
}

/** Whether a rhythm has more than one time in a period, so its end is better counted in days. */
export function countsPeriods(draft: Pick<RepeatDraft, 'times' | 'weekdays' | 'unit'>): boolean {
  return draft.times.length > 1 || (draft.unit === 'week' && draft.weekdays.length > 0);
}

/** The sentence at the head of the repeat settings: "every 3 months · at 08:00 · 7 times". */
export function repeatSummary(draft: RepeatDraft, endWords?: string): string {
  const days =
    draft.unit === 'week' && draft.weekdays.length > 0
      ? [draft.weekdays.map((day) => labels.repeat.weekdayShort[day] ?? '').join(', ')]
      : [];
  const times = draft.times.length === 0 ? [] : [`${labels.reminders.at}${draft.times.join(', ')}`];
  const from = draft.fromKind === 'completion' ? [labels.repeat.fromKind.completion] : [];
  return [
    rhythmText(draft.every, draft.unit),
    ...days,
    ...times,
    ...from,
    endWords ?? endText(draft),
  ].join(labels.item.separator);
}

export function draftOfRepeat(repeat: ItemRepeat): RepeatDraft {
  return {
    every: repeat.every,
    unit: repeat.unit,
    startsOn: repeat.starts_on,
    times: repeatTimes(repeat),
    weekdays: [...repeat.weekdays].sort(),
    fromKind: repeat.from_kind,
    trackerCloses: repeat.tracker_closes,
    endKind: repeat.end_kind,
    endCount: repeat.end_count,
    endUntil: repeat.end_until,
    hebrew:
      repeat.hebrew_month === null || repeat.hebrew_day === null
        ? null
        : {
            month: repeat.hebrew_month,
            day: repeat.hebrew_day,
            leapAdar: repeat.hebrew_leap_adar ?? 'Adar II',
          },
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
    times: startingTimes(item),
    weekdays: [],
    fromKind: 'schedule',
    trackerCloses: false,
    endKind: 'never',
    endCount: null,
    endUntil: null,
  };
}

/** The hour a new series starts with: the item's own, an appointment's start. */
function startingTimes(item: Item): string[] {
  if (item.kind === 'appointment' && item.starts_at !== null) {
    return [toLocalDateTime(item.starts_at).slice(11, 16)];
  }
  return item.due_time === null ? [] : [item.due_time.slice(0, 5)];
}

/** An item's current occurrence. */
export function currentSlot(item: Item): Slot | null {
  if (item.due_date === null) {
    return null;
  }
  const time =
    item.kind === 'appointment' && item.starts_at !== null
      ? toLocalDateTime(item.starts_at).slice(11, 16)
      : (item.due_time?.slice(0, 5) ?? null);
  return { day: item.due_date, time };
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
