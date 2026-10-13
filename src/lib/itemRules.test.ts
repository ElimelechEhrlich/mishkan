import { describe, expect, it } from 'vitest';
import {
  activeSectionOf,
  addDays,
  agendaOf,
  missingFields,
  seriesStarts,
  snoozeUntil,
  splitBySection,
} from './itemRules';
import type { Item } from '../types/domain';

const today = '2026-10-11';

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

describe('activeSectionOf', () => {
  it('splits by how soon an item is due', () => {
    expect(activeSectionOf(null, today)).toBe('undated');
    expect(activeSectionOf('2026-10-10', today)).toBe('overdue');
    expect(activeSectionOf(today, today)).toBe('today');
    expect(activeSectionOf('2026-10-12', today)).toBe('thisWeek');
    expect(activeSectionOf('2026-10-18', today)).toBe('thisWeek');
    expect(activeSectionOf('2026-10-19', today)).toBe('upcoming');
  });

  it('puts what is urgent in a group of its own, unless it is already late', () => {
    expect(activeSectionOf(null, today, true)).toBe('urgent');
    expect(activeSectionOf('2026-10-19', today, true)).toBe('urgent');
    expect(activeSectionOf('2026-10-10', today, true)).toBe('overdue');
  });

  it('groups entries in the same way', () => {
    const groups = splitBySection(
      [
        { dueDate: '2026-10-01', urgent: false },
        { dueDate: '2026-10-15', urgent: false },
        { dueDate: null, urgent: false },
      ],
      today,
    );
    expect(groups.overdue).toHaveLength(1);
    expect(groups.thisWeek).toHaveLength(1);
    expect(groups.undated).toHaveLength(1);
    expect(groups.today).toHaveLength(0);
  });
});

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays(today, -11)).toBe('2026-09-30');
  });
});

describe('missingFields', () => {
  it('asks tasks for a domain and a time, notes for a domain only', () => {
    expect(missingFields(item({ domain_id: null, time_mode: null }))).toEqual(['domain', 'time']);
    expect(missingFields(item({ kind: 'note', time_mode: null }))).toEqual([]);
    expect(missingFields(item({ kind: 'note', domain_id: null }))).toEqual(['domain']);
  });
});

describe('seriesStarts', () => {
  it('makes one appointment when it does not repeat', () => {
    expect(seriesStarts('2026-10-12T09:30', 'none', 5)).toEqual(['2026-10-12T09:30']);
  });

  it('repeats weekly and every two weeks', () => {
    expect(seriesStarts('2026-10-12T09:30', 'weekly', 3)).toEqual([
      '2026-10-12T09:30',
      '2026-10-19T09:30',
      '2026-10-26T09:30',
    ]);
    expect(seriesStarts('2026-12-28T16:00', 'biweekly', 2)).toEqual([
      '2026-12-28T16:00',
      '2027-01-11T16:00',
    ]);
  });

  it('keeps the day of the month, or the last day of a shorter month', () => {
    expect(seriesStarts('2027-01-31T08:00', 'monthly', 3)).toEqual([
      '2027-01-31T08:00',
      '2027-02-28T08:00',
      '2027-03-31T08:00',
    ]);
  });

  it('keeps the count within bounds', () => {
    expect(seriesStarts('2026-10-12T09:30', 'weekly', 0)).toHaveLength(1);
    expect(seriesStarts('2026-10-12T09:30', 'weekly', 500)).toHaveLength(104);
  });
});

describe('agendaOf', () => {
  it('holds what is late and what is due today, with an hour first', () => {
    const rows = [
      item({ id: 'late', due_date: '2026-10-09' }),
      item({ id: 'today', created_at: '2026-10-01' }),
      item({ id: 'meeting', kind: 'appointment', starts_at: '2026-10-11T09:00:00Z' }),
      item({ id: 'tomorrow', due_date: '2026-10-12' }),
      item({ id: 'note', kind: 'note' }),
      item({ id: 'waiting', time_mode: 'waiting' }),
    ];
    const agenda = agendaOf(rows, [], today);
    expect(agenda.overdue.map((entry) => entry.item.id)).toEqual(['late']);
    expect(agenda.today.map((entry) => entry.item.id)).toEqual(['meeting', 'today']);
  });

  it('dates a goal by its earliest open step', () => {
    const goal = item({ id: 'goal', kind: 'goal', due_date: null, time_mode: 'scheduled' });
    const step = item({ id: 'step', parent_id: 'goal', due_date: today });
    expect(agendaOf([goal, step], [step], today).today.map((entry) => entry.item.id)).toEqual([
      'goal',
    ]);
  });
});

describe('steps of a goal that is not active', () => {
  it('lists a step due today on its own when its goal is on the shelf', () => {
    const goal = item({ id: 'shelf', kind: 'goal', due_date: null, time_mode: 'someday' });
    const step = item({ id: 'step', parent_id: 'shelf', due_date: today });
    const agenda = agendaOf([goal, step], [step], today);
    expect(agenda.today.map((entry) => entry.item.id)).toEqual(['step']);
  });
});

describe('urgent items', () => {
  it('lists an urgent task, and a goal with an urgent step, as urgent', () => {
    const urgent = item({ id: 'urgent', time_mode: 'urgent', due_date: null });
    const goal = item({ id: 'goal', kind: 'goal', due_date: null, time_mode: 'anytime' });
    const step = item({ id: 'step', parent_id: 'goal', due_date: null, time_mode: 'urgent' });
    const plain = item({ id: 'plain', time_mode: 'anytime', due_date: null });
    const agenda = agendaOf([urgent, goal, step, plain], [step], today);
    expect(agenda.urgent.map((entry) => entry.item.id).sort()).toEqual(['goal', 'urgent']);
    expect(agenda.today).toHaveLength(0);
  });
});

describe('snoozeUntil', () => {
  const now = new Date(2026, 9, 11, 22, 50);

  it('puts a reminder off by a while', () => {
    expect(new Date(snoozeUntil('minutes10', now)).getTime() - now.getTime()).toBe(600_000);
    expect(new Date(snoozeUntil('hours3', now)).getTime() - now.getTime()).toBe(10_800_000);
  });

  it('puts it off to nine tomorrow morning', () => {
    const next = new Date(snoozeUntil('tomorrow', now));
    expect([next.getDate(), next.getHours(), next.getMinutes()]).toEqual([12, 9, 0]);
  });
});
