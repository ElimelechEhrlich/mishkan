import { describe, expect, it } from 'vitest';
import { activeSectionOf, addDays, missingFields, splitBySection } from './itemRules';
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
