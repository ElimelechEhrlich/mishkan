import { describe, expect, it } from 'vitest';
import { goalProgress, goalTarget, isLateStep, lastDay, noEnd, stepsAfter } from './goals';
import type { Item, ItemRepeat, OccurrenceCount } from '../types/domain';

const today = '2026-10-14';

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
    due_date: today,
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

function repeat(overrides: Partial<ItemRepeat>): ItemRepeat {
  return {
    item_id: 'i',
    every: 1,
    unit: 'day',
    starts_on: '2026-10-14',
    at_time: null,
    end_kind: 'never',
    end_count: null,
    end_until: null,
    stopped_on: null,
    missed_from: '2026-10-14',
    updated_at: '',
    times: [],
    weekdays: [],
    from_kind: 'schedule',
    planned_date: null,
    planned_time: null,
    tracker_closes: false,
    dates: [],
    hebrew: false,
    ...overrides,
  };
}

const goal = item({ id: 'g', kind: 'goal', due_date: '2026-11-01' });
const plain = item({ id: 's1', parent_id: 'g', due_date: '2026-10-20' });
const weekly = item({ id: 's2', parent_id: 'g', time_mode: 'recurring', due_date: today });
const counts = new Map<string, OccurrenceCount>([['s2', { item_id: 's2', done: 2, gone: 3 }]]);

describe('a goal and its steps', () => {
  it('has a date only when scheduled', () => {
    expect(goalTarget(goal)).toBe('2026-11-01');
    expect(goalTarget({ ...goal, time_mode: 'anytime' })).toBeNull();
  });

  it('knows the last day of a step, or that it has none', () => {
    expect(lastDay(plain, undefined, undefined)).toBe('2026-10-20');
    const never = repeat({ item_id: 's2', unit: 'week' });
    expect(lastDay(weekly, never, undefined)).toBe(noEnd);
    // Five times in all, three gone: today and one more week.
    const five = repeat({ item_id: 's2', unit: 'week', end_kind: 'count', end_count: 5 });
    expect(lastDay(weekly, five, counts.get('s2'))).toBe('2026-10-21');
  });

  it('finds the steps that end after a date, and the late ones', () => {
    const repeats = new Map([['s2', repeat({ item_id: 's2', unit: 'week' })]]);
    expect(stepsAfter([plain, weekly], '2026-10-18', repeats, counts, false)).toHaveLength(2);
    // One with no end will be made to end on the date.
    expect(stepsAfter([plain, weekly], '2026-10-18', repeats, counts, true)).toEqual([plain]);
    expect(isLateStep({ ...plain, due_date: '2026-11-02' }, goal, undefined, undefined)).toBe(true);
    expect(isLateStep(plain, goal, undefined, undefined)).toBe(false);
  });

  it('counts the occurrences of a repeating step in its progress', () => {
    const five = repeat({ item_id: 's2', unit: 'week', end_kind: 'count', end_count: 5 });
    const progress = goalProgress(
      [{ ...plain, status: 'done' }, weekly],
      new Map([['s2', five]]),
      counts,
    );
    expect(progress).toEqual({ done: 3, total: 6, allDone: false });
  });

  it('does not wait for a step that repeats with no end', () => {
    const progress = goalProgress(
      [{ ...plain, status: 'done' }, weekly],
      new Map([['s2', repeat({ item_id: 's2', unit: 'week' })]]),
      counts,
    );
    expect(progress.allDone).toBe(true);
  });
});
