import { describe, expect, it } from 'vitest';
import {
  activeSectionOf,
  addDays,
  agendaOf,
  compareEntries,
  missingFields,
  seriesStarts,
  snoozeUntil,
  isAfterTarget,
  nextDueDate,
  rowsOfSegment,
  sectionOfEntry,
  splitBySection,
  toListEntries,
} from './itemRules';
import { timeText } from './itemText';
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
        { item: { kind: 'task' }, dueDate: '2026-10-01', urgent: false, target: null },
        { item: { kind: 'task' }, dueDate: '2026-10-15', urgent: false, target: null },
        { item: { kind: 'task' }, dueDate: null, urgent: false, target: null },
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

describe('goal target dates', () => {
  it('goes by its earliest open step, is for today on its target day, and late after', () => {
    const goal = item({ id: 'g', kind: 'goal', due_date: '2026-10-11' });
    const step = item({ id: 's', parent_id: 'g', due_date: '2026-10-15' });
    const [entry] = toListEntries([goal], [step]);
    expect(entry?.dueDate).toBe('2026-10-15');
    expect(entry === undefined ? null : sectionOfEntry(entry, '2026-10-09')).toBe('thisWeek');
    expect(entry === undefined ? null : sectionOfEntry(entry, today)).toBe('today');
    expect(entry === undefined ? null : sectionOfEntry(entry, '2026-10-12')).toBe('overdue');
  });

  it('goes by its target when no step has a date', () => {
    const goal = item({ id: 'g', kind: 'goal', due_date: '2026-10-20' });
    const [entry] = toListEntries([goal], []);
    expect(entry?.dueDate).toBe('2026-10-20');
  });

  it('marks a step dated after the target', () => {
    const goal = item({ id: 'g', kind: 'goal', due_date: '2026-10-12' });
    expect(isAfterTarget(item({ due_date: '2026-10-13' }), goal)).toBe(true);
    expect(isAfterTarget(item({ due_date: '2026-10-12' }), goal)).toBe(false);
  });
});

describe('steps standing on their own', () => {
  const shelf = item({ id: 'shelf', kind: 'goal', due_date: null, time_mode: 'someday' });
  const dated = item({ id: 'dated', parent_id: 'shelf', due_date: '2026-10-12' });
  const undated = item({ id: 'undated', parent_id: 'shelf', due_date: null, time_mode: 'anytime' });
  const all = [shelf, dated, undated];

  it('lists a dated step of a shelved goal among the active, with its goal named', () => {
    const rows = rowsOfSegment(all, 'active');
    expect(rows.map((row) => row.id)).toEqual(['dated']);
    expect(toListEntries(rows, [], all)[0]?.parent?.id).toBe('shelf');
  });

  it('keeps an undated step inside its shelved goal', () => {
    expect(rowsOfSegment(all, 'someday').map((row) => row.id)).toEqual(['shelf']);
  });
});

describe('nextDueDate', () => {
  it('keeps its rhythm when done late', () => {
    // A Tuesday chore (2026-10-06) done on Thursday 2026-10-15 is next due Tuesday the 20th.
    expect(nextDueDate('2026-10-06', 'weekly', '2026-10-15')).toBe('2026-10-20');
    expect(nextDueDate('2026-10-10', 'daily', '2026-10-15')).toBe('2026-10-16');
    expect(nextDueDate(null, 'weekly', '2026-10-15')).toBe('2026-10-22');
  });

  it('keeps a monthly day, or the last day of a shorter month', () => {
    expect(nextDueDate('2027-01-31', 'monthly', '2027-01-01')).toBe('2027-02-28');
    expect(nextDueDate('2027-03-15', 'monthly', '2027-03-01')).toBe('2027-04-15');
  });
});

describe('time left by a conversion', () => {
  it('is not used for a kind without time of its own', () => {
    const note = item({ id: 'n', kind: 'note', due_date: '2026-10-01', time_mode: 'urgent' });
    const [entry] = toListEntries([note], []);
    expect(entry?.dueDate).toBeNull();
    expect(entry?.urgent).toBe(false);
  });
});

describe('appointments that passed', () => {
  it('are asked about rather than counted as late', () => {
    const past = item({ id: 'p', kind: 'appointment', due_date: '2026-10-09' });
    const agenda = agendaOf([past], [], today);
    expect(agenda.overdue).toHaveLength(0);
    expect(agenda.passed.map((entry) => entry.item.id)).toEqual(['p']);
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

describe('an hour on a task', () => {
  it('is shown after its day', () => {
    expect(timeText(item({ due_time: '16:30:00' }), today)).toBe('היום 16:30');
    expect(timeText(item({}), today)).toBe('היום');
  });

  it('orders the day: with an hour first, by hour, appointments among them', () => {
    const late = item({ id: 'late', due_time: '18:00:00', created_at: '3' });
    const early = item({ id: 'early', due_time: '08:15:00', created_at: '2' });
    const plain = item({ id: 'plain', created_at: '9' });
    const appointment = item({
      id: 'appointment',
      kind: 'appointment',
      starts_at: new Date(2026, 9, 11, 12, 0).toISOString(),
      created_at: '1',
    });
    const sorted = toListEntries([plain, late, appointment, early], [])
      .sort(compareEntries)
      .map((entry) => entry.item.id);
    expect(sorted).toEqual(['early', 'appointment', 'late', 'plain']);
  });
});
