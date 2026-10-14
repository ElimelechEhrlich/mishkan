import { describe, expect, it } from 'vitest';
import { conversionChanges, conversionTargets, needsAppointmentTime } from './conversions';
import type { Item, ItemRepeat } from '../types/domain';

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

describe('conversions', () => {
  it('converts an appointment only to a task, and a task also to an appointment', () => {
    expect(conversionTargets('appointment')).toEqual(['task']);
    expect(conversionTargets('task')).toContain('appointment');
    expect(conversionTargets('note')).not.toContain('appointment');
  });

  it('asks for an hour only when the task has none', () => {
    expect(needsAppointmentTime(item({ due_time: null }), 'appointment')).toBe(true);
    expect(needsAppointmentTime(item({ due_time: '10:00:00' }), 'appointment')).toBe(false);
  });

  it('says what changes', () => {
    const weekly = item({ time_mode: 'recurring', due_date: '2026-10-20' });
    const series = repeat({ unit: 'week', times: ['09:00:00', '18:00:00'] });
    expect(conversionChanges(weekly, 'goal', series, [])).toEqual(['תאריך היעד: יום ג׳, 20 באוק׳']);
    expect(conversionChanges(item({}), 'note', null, [])).toEqual(['הזמן נשמר בצד']);
    expect(conversionChanges(weekly, 'appointment', series, [])).toEqual([
      'החזרה נשארת',
      'בתור נשארת שעה אחת',
    ]);
  });
});
