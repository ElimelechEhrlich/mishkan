import { describe, expect, it } from 'vitest';
import { activeSectionOf, addDays, missingFields, seriesStarts, splitBySection } from './itemRules';
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

  it('groups entries in the same way', () => {
    const groups = splitBySection(
      [{ dueDate: '2026-10-01' }, { dueDate: '2026-10-15' }, { dueDate: null }],
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
