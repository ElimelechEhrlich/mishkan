import { describe, expect, it } from 'vitest';
import {
  amountText,
  defaultDraft,
  describeReminder,
  isCompleteDraft,
  isWaiting,
  newDraft,
  reminderDay,
  reminderHour,
  reminderPresets,
  reminderRules,
  splitDays,
  splitMinutes,
  toMinutes,
  wasSent,
} from './reminders';
import { toLocalDateTime } from './itemRules';
import type { Item, ItemReminder, ReminderDraft } from '../types/domain';

function item(overrides: Partial<Item>): Item {
  return {
    id: 'i',
    household_id: 'h',
    title: 'x',
    notes: null,
    kind: 'task',
    domain_id: 'd',
    parent_id: null,
    time_mode: 'scheduled',
    due_date: '2026-10-20',
    due_time: null,
    remind_at: null,
    recurrence_rule: null,
    status: 'open',
    created_by: 'm',
    completed_by: null,
    review_by: null,
    previous_domain_label: null,
    shopping_category: null,
    run_id: null,
    hidden: false,
    answer: null,
    created_at: '',
    completed_at: null,
    is_complete: true,
    closed_with_parent: false,
    auto_key: null,
    reminder_sent_at: null,
    remind_member_ids: null,
    starts_at: null,
    place_kind: null,
    place: null,
    meeting_url: null,
    with_whom: null,
    series_id: null,
    in_main: false,
    is_value: false,
    entity_id: null,
    tracker_unit: null,
    tracker_summary: 'sum',
    ...overrides,
  };
}

function reminder(overrides: Partial<ItemReminder>): ItemReminder {
  return {
    id: 'r',
    item_id: 'i',
    rule: 'before',
    at: null,
    minutes_before: 60,
    days_before: null,
    at_time: null,
    every: null,
    unit: null,
    until: null,
    member_ids: null,
    due_at: '2026-10-20T13:00:00+00:00',
    sent_for: null,
    sent_at: null,
    legacy: false,
    created_at: '',
    ...overrides,
  };
}

const blank: ReminderDraft = {
  rule: 'before',
  at: null,
  minutes_before: null,
  days_before: null,
  at_time: null,
  every: null,
  unit: null,
  until: null,
  member_ids: null,
};

describe('amounts', () => {
  it('says one, two and many as Hebrew does', () => {
    expect(amountText(1, 'day')).toBe('יום');
    expect(amountText(2, 'day')).toBe('יומיים');
    expect(amountText(3, 'month')).toBe('3 חודשים');
    expect(amountText(2, 'hour')).toBe('שעתיים');
  });

  it('splits minutes into the largest whole unit', () => {
    expect(splitMinutes(0)).toEqual({ amount: 0, unit: 'minute' });
    expect(splitMinutes(90)).toEqual({ amount: 90, unit: 'minute' });
    expect(splitMinutes(120)).toEqual({ amount: 2, unit: 'hour' });
    expect(splitMinutes(1440)).toEqual({ amount: 1, unit: 'day' });
    expect(splitMinutes(20160)).toEqual({ amount: 2, unit: 'week' });
    expect(toMinutes(3, 'hour')).toBe(180);
    expect(splitDays(14)).toEqual({ amount: 2, unit: 'week' });
    expect(splitDays(3)).toEqual({ amount: 3, unit: 'day' });
  });
});

describe('what an item counts its reminders from', () => {
  it('a task with a date, and an hour when it has one', () => {
    expect(reminderDay(item({}))).toBe('2026-10-20');
    expect(reminderHour(item({}))).toBeNull();
    expect(reminderHour(item({ due_time: '16:30:00' }))).toBe('16:30');
  });

  it('nothing for an undated task, an issue or a note', () => {
    expect(reminderDay(item({ time_mode: 'anytime', due_date: null }))).toBeNull();
    expect(reminderDay(item({ kind: 'issue' }))).toBeNull();
    expect(reminderDay(item({ kind: 'note', time_mode: null }))).toBeNull();
    // A date left hidden on a kind without time of its own is not used.
    expect(reminderDay(item({ kind: 'debt' }))).toBeNull();
  });

  it("an appointment's start", () => {
    const starts = new Date(2026, 9, 20, 16, 0).toISOString();
    const appointment = item({ kind: 'appointment', starts_at: starts });
    expect(reminderDay(appointment)).toBe('2026-10-20');
    expect(reminderHour(appointment)).toBe('16:00');
  });
});

describe('which reminders an item is offered, the first being the default', () => {
  it('before the hour first when the item has an hour', () => {
    expect(reminderRules(item({ due_time: '16:00:00' }))).toEqual(['before', 'day', 'at']);
  });

  it('on the day when it has only a date', () => {
    expect(reminderRules(item({}))).toEqual(['day', 'at']);
  });

  it('no set time on a repeating task: it would ring once only', () => {
    expect(reminderRules(item({ time_mode: 'recurring', recurrence_rule: 'FREQ=DAILY' }))).toEqual([
      'day',
    ]);
  });

  it('a set time or a repeating one without a date', () => {
    expect(reminderRules(item({ time_mode: 'anytime', due_date: null }))).toEqual(['at', 'repeat']);
    expect(reminderRules(item({ kind: 'debt', time_mode: null, due_date: null }))).toEqual([
      'at',
      'repeat',
    ]);
  });
});

describe('the first reminder', () => {
  const now = new Date(2026, 9, 14, 10, 20);

  it('at the hour itself when the item has one', () => {
    expect(defaultDraft(item({ due_time: '16:00:00' }), now)).toMatchObject({
      rule: 'before',
      minutes_before: 0,
    });
  });

  it("at nine on the item's day when it has only a date", () => {
    expect(defaultDraft(item({}), now)).toMatchObject({
      rule: 'day',
      days_before: 0,
      at_time: '09:00',
    });
  });

  it('today, within the coming hour, when the item has no date', () => {
    const draft = defaultDraft(item({ time_mode: 'anytime', due_date: null }), now);
    expect(draft.rule).toBe('at');
    expect(draft.at === null ? null : toLocalDateTime(draft.at)).toBe('2026-10-14T11:00');
  });

  it("a set time starts on the item's day, at its hour or at nine", () => {
    const draft = newDraft('at', item({}), now);
    expect(draft.at === null ? null : toLocalDateTime(draft.at)).toBe('2026-10-20T09:00');
  });

  it('a repeating one starts at nine, tomorrow once nine has passed', () => {
    const draft = newDraft('repeat', item({ time_mode: 'anytime', due_date: null }), now);
    expect(draft.at === null ? null : toLocalDateTime(draft.at)).toBe('2026-10-15T09:00');
    expect(draft).toMatchObject({ every: 1, unit: 'day', until: null });
  });
});

describe('a reminder in words', () => {
  it('relative to the hour', () => {
    expect(describeReminder({ ...blank, minutes_before: 0 })).toBe('בזמן עצמו');
    expect(describeReminder({ ...blank, minutes_before: 60 })).toBe('שעה לפני');
    expect(describeReminder({ ...blank, minutes_before: 30 })).toBe('30 דקות לפני');
    expect(describeReminder({ ...blank, minutes_before: 2880 })).toBe('יומיים לפני');
  });

  it('relative to the day, at an hour', () => {
    expect(describeReminder({ ...blank, rule: 'day', days_before: 0, at_time: '08:00' })).toBe(
      'ביום עצמו ב־08:00',
    );
    expect(describeReminder({ ...blank, rule: 'day', days_before: 1, at_time: '20:00' })).toBe(
      'יום לפני ב־20:00',
    );
    expect(describeReminder({ ...blank, rule: 'day', days_before: 7, at_time: '09:00' })).toBe(
      'שבוע לפני ב־09:00',
    );
  });

  it('again and again', () => {
    const at = new Date(2026, 9, 15, 9, 0).toISOString();
    expect(describeReminder({ ...blank, rule: 'repeat', at, every: 3, unit: 'month' })).toBe(
      'כל 3 חודשים ב־09:00',
    );
    expect(describeReminder({ ...blank, rule: 'repeat', at, every: 1, unit: 'week' })).toBe(
      'כל שבוע ב־09:00',
    );
  });
});

describe('state of a reminder', () => {
  it('waits when it counts from a time the item does not have', () => {
    expect(isWaiting(reminder({ due_at: null }))).toBe(true);
    expect(isWaiting(reminder({ rule: 'day', due_at: null }))).toBe(true);
    expect(isWaiting(reminder({}))).toBe(false);
    // A repeating one that is over is not waiting for anything.
    expect(isWaiting(reminder({ rule: 'repeat', due_at: null }))).toBe(false);
  });

  it('a set time that rang is sent', () => {
    const due = '2026-10-20T13:00:00+00:00';
    expect(wasSent(reminder({ rule: 'at', at: due, due_at: due, sent_for: due }))).toBe(true);
    expect(wasSent(reminder({ rule: 'at', at: due, due_at: due }))).toBe(false);
  });

  it('can be saved only when complete', () => {
    expect(isCompleteDraft({ ...blank, minutes_before: 0 })).toBe(true);
    expect(isCompleteDraft({ ...blank })).toBe(false);
    expect(isCompleteDraft({ ...blank, rule: 'day', days_before: 1, at_time: null })).toBe(false);
    const at = new Date(2026, 9, 15, 9, 0).toISOString();
    expect(
      isCompleteDraft({ ...blank, rule: 'repeat', at, every: 1, unit: 'day', until: '2026-10-14' }),
    ).toBe(false);
    expect(
      isCompleteDraft({ ...blank, rule: 'repeat', at, every: 0, unit: 'day', until: null }),
    ).toBe(false);
  });
});

describe('reminders in one tap', () => {
  const now = new Date('2026-10-14T10:00:00+03:00');

  it('offers times before the hour, leaving out one the item has', () => {
    const timed = item({ due_date: '2026-10-20', due_time: '16:00:00' });
    const labelsOf = (existing: readonly ReminderDraft[]): string[] =>
      reminderPresets(timed, existing, now).map((preset) => preset.label);
    expect(labelsOf([])).toEqual(['בזמן', '10 דק׳ לפני', 'שעה לפני', 'יום לפני']);
    expect(labelsOf([newDraft('before', timed, now)])).not.toContain('בזמן');
  });

  it('offers the day for a date with no hour, and soon for no date', () => {
    expect(
      reminderPresets(item({ due_date: '2026-10-20', due_time: null }), [], now).map(
        (preset) => preset.label,
      ),
    ).toEqual(['ביום, ב־09:00', 'יום לפני']);
    expect(
      reminderPresets(item({ time_mode: 'anytime', due_date: null }), [], now).map(
        (preset) => preset.label,
      ),
    ).toEqual(['בעוד שעה', 'מחר ב־09:00', 'כל יום']);
  });
});
