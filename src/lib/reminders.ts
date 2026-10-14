import { labels } from '../constants/labels';
import type { Item, ItemReminder, ReminderDraft, ReminderRule, RepeatUnit } from '../types/domain';
import {
  addDays,
  formatDueDate,
  formatReminder,
  fromLocalDateTime,
  toIsoDate,
  toLocalDateTime,
} from './itemRules';

/** The units a reminder counts in. */
export type AmountUnit = 'minute' | 'hour' | 'day' | 'week' | RepeatUnit;

const minutesIn = { minute: 1, hour: 60, day: 1440, week: 10080 } as const;

/** Units for "before the hour", largest first. */
export const beforeUnits = ['minute', 'hour', 'day', 'week'] as const;
/** Units for "days before, at an hour". */
export const dayUnits = ['day', 'week'] as const;
/** Units for a repeating reminder. */
export const repeatUnits = [
  'day',
  'week',
  'month',
  'year',
] as const satisfies readonly RepeatUnit[];

/** "a day", "two days", "3 days", as Hebrew says them. */
export function amountText(amount: number, unit: AmountUnit): string {
  const [one, two, many] = labels.reminders.units[unit];
  if (amount === 1) {
    return one;
  }
  if (amount === 2) {
    return two;
  }
  return `${String(amount)} ${many}`;
}

/** A number of minutes in the largest unit that holds it whole: 1440 is one day. */
export function splitMinutes(minutes: number): {
  readonly amount: number;
  readonly unit: (typeof beforeUnits)[number];
} {
  for (const unit of ['week', 'day', 'hour'] as const) {
    if (minutes > 0 && minutes % minutesIn[unit] === 0) {
      return { amount: minutes / minutesIn[unit], unit };
    }
  }
  return { amount: minutes, unit: 'minute' };
}

export function toMinutes(amount: number, unit: (typeof beforeUnits)[number]): number {
  return amount * minutesIn[unit];
}

/** A number of days in weeks when it is whole weeks. */
export function splitDays(days: number): {
  readonly amount: number;
  readonly unit: (typeof dayUnits)[number];
} {
  return days > 0 && days % 7 === 0
    ? { amount: days / 7, unit: 'week' }
    : { amount: days, unit: 'day' };
}

/** The day an item's relative reminders count from, as the server counts it; null without one. */
export function reminderDay(item: Item): string | null {
  if (item.kind === 'appointment') {
    return item.starts_at === null ? null : item.due_date;
  }
  const dated =
    ((item.kind === 'task' || item.kind === 'goal') &&
      (item.time_mode === 'scheduled' || item.time_mode === 'recurring')) ||
    ((item.kind === 'tracker' || item.kind === 'missing_item') && item.time_mode === 'recurring');
  return dated ? item.due_date : null;
}

/** The hour (HH:MM) an item's "before" reminders count from; null without one. */
export function reminderHour(item: Item): string | null {
  if (reminderDay(item) === null) {
    return null;
  }
  if (item.kind === 'appointment') {
    return item.starts_at === null ? null : toLocalDateTime(item.starts_at).slice(11, 16);
  }
  return item.due_time === null ? null : item.due_time.slice(0, 5);
}

/**
 * The kinds of reminder an item can have, the first being the default: relative to its hour
 * and date when it has them, a set time when it does not repeat, and repeating when it has no
 * date at all.
 */
export function reminderRules(item: Item): ReminderRule[] {
  if (reminderDay(item) === null) {
    return ['at', 'repeat'];
  }
  return [
    ...(reminderHour(item) === null ? [] : ['before' as const]),
    'day',
    ...(item.time_mode === 'recurring' ? [] : ['at' as const]),
  ];
}

function atHour(isoDate: string, hour: string): string {
  return fromLocalDateTime(`${isoDate}T${hour}`);
}

/** The next whole hour from now. */
function nextWholeHour(now: Date): string {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.toISOString();
}

const blank = {
  at: null,
  minutes_before: null,
  days_before: null,
  at_time: null,
  every: null,
  unit: null,
  until: null,
  member_ids: null,
} as const;

/** A new reminder of a kind, set to what is most likely wanted. */
export function newDraft(rule: ReminderRule, item: Item, now: Date): ReminderDraft {
  const today = toIsoDate(now);
  const day = reminderDay(item);
  switch (rule) {
    case 'before':
      return { ...blank, rule, minutes_before: 0 };
    case 'day':
      return { ...blank, rule, days_before: 0, at_time: '09:00' };
    case 'at':
      // On the item's day, at its hour or at nine; without a day, within the coming hour.
      return {
        ...blank,
        rule,
        at: day === null ? nextWholeHour(now) : atHour(day, reminderHour(item) ?? '09:00'),
      };
    case 'repeat': {
      const firstDay = now.getHours() < 9 ? today : addDays(today, 1);
      return { ...blank, rule, at: atHour(firstDay, '09:00'), every: 1, unit: 'day' };
    }
  }
}

/**
 * The first reminder an item is offered: at its hour when it has one, at nine on its day when
 * it has only a day, and today when it has neither.
 */
export function defaultDraft(item: Item, now: Date): ReminderDraft {
  const [rule = 'at'] = reminderRules(item);
  return newDraft(rule, item, now);
}

export function draftOf(reminder: ItemReminder): ReminderDraft {
  return {
    rule: reminder.rule,
    at: reminder.at,
    minutes_before: reminder.minutes_before,
    days_before: reminder.days_before,
    at_time: reminder.at_time === null ? null : reminder.at_time.slice(0, 5),
    every: reminder.every,
    unit: reminder.unit,
    until: reminder.until,
    member_ids: reminder.member_ids,
  };
}

/** A reminder in words: "an hour before", "a day before at 20:00", "every week at 09:00". */
export function describeReminder(draft: ReminderDraft): string {
  const at = labels.reminders.at;
  switch (draft.rule) {
    case 'before': {
      const minutes = draft.minutes_before ?? 0;
      if (minutes === 0) {
        return labels.reminders.atTheTime;
      }
      const { amount, unit } = splitMinutes(minutes);
      return `${amountText(amount, unit)} ${labels.reminders.before}`;
    }
    case 'day': {
      const hour = `${at}${(draft.at_time ?? '').slice(0, 5)}`;
      const days = draft.days_before ?? 0;
      if (days === 0) {
        return `${labels.reminders.onTheDay} ${hour}`;
      }
      const { amount, unit } = splitDays(days);
      return `${amountText(amount, unit)} ${labels.reminders.before} ${hour}`;
    }
    case 'at':
      return draft.at === null ? '' : formatReminder(draft.at);
    case 'repeat': {
      const hour = draft.at === null ? '' : ` ${at}${toLocalDateTime(draft.at).slice(11, 16)}`;
      const rhythm = `${labels.reminders.every} ${amountText(draft.every ?? 1, draft.unit ?? 'day')}${hour}`;
      return draft.until === null
        ? rhythm
        : `${rhythm}${labels.item.separator}${labels.reminders.untilPrefix} ${formatDueDate(draft.until)}`;
    }
  }
}

/** A reminder that counts from the item's date or hour, which the item does not have now. */
export function isWaiting(reminder: ItemReminder): boolean {
  return (reminder.rule === 'before' || reminder.rule === 'day') && reminder.due_at === null;
}

/** A reminder at a set time that has already rung. */
export function wasSent(reminder: ItemReminder): boolean {
  return (
    reminder.rule === 'at' &&
    reminder.sent_for !== null &&
    reminder.due_at !== null &&
    new Date(reminder.sent_for).getTime() === new Date(reminder.due_at).getTime()
  );
}

/** Whether a draft can be saved: every number it needs is set and sensible. */
export function isCompleteDraft(draft: ReminderDraft): boolean {
  switch (draft.rule) {
    case 'before':
      return draft.minutes_before !== null && draft.minutes_before >= 0;
    case 'day':
      return draft.days_before !== null && draft.days_before >= 0 && draft.at_time !== null;
    case 'at':
      return draft.at !== null;
    case 'repeat':
      return (
        draft.at !== null &&
        draft.every !== null &&
        draft.every >= 1 &&
        draft.unit !== null &&
        (draft.until === null || draft.until >= toIsoDate(new Date(draft.at)))
      );
  }
}
