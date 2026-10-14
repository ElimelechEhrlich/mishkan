import { describe, expect, it } from 'vitest';
import {
  dayAfter,
  endText,
  historyCounts,
  repeatSummary,
  rhythmText,
  stepFrom,
  upcomingDays,
} from './recurrence';
import type { ItemRepeat, Occurrence } from '../types/domain';

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
    ...overrides,
  };
}

function occurrence(status: Occurrence['status']): Occurrence {
  return {
    id: status,
    item_id: 'i',
    on_date: '2026-10-14',
    at_time: null,
    status,
    done_by: null,
    done_at: '',
  };
}

describe('the rhythm', () => {
  it('steps by days, weeks, months and years', () => {
    expect(stepFrom('2026-10-14', 3, 'day', 2)).toBe('2026-10-20');
    expect(stepFrom('2026-10-14', 2, 'week', 1)).toBe('2026-10-28');
    expect(stepFrom('2026-10-14', 3, 'month', 1)).toBe('2027-01-14');
    expect(stepFrom('2024-02-29', 1, 'year', 1)).toBe('2025-02-28');
  });

  it('keeps the 31st after a short month, counting from the first day', () => {
    expect(stepFrom('2026-01-31', 1, 'month', 1)).toBe('2026-02-28');
    expect(stepFrom('2026-01-31', 1, 'month', 2)).toBe('2026-03-31');
  });

  it('finds the next day of the rhythm', () => {
    expect(dayAfter('2026-10-14', 1, 'week', '2026-10-14', false)).toBe('2026-10-21');
    expect(dayAfter('2026-10-14', 1, 'week', '2026-10-14', true)).toBe('2026-10-14');
    expect(dayAfter('2026-10-14', 3, 'month', '2026-12-01', true)).toBe('2027-01-14');
    expect(dayAfter('2026-10-14', 1, 'day', '2026-10-01', true)).toBe('2026-10-14');
  });
});

describe('the occurrences ahead', () => {
  it('runs on with no end', () => {
    expect(upcomingDays(repeat({}), '2026-10-14', 0, 3)).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
  });

  it('stops at a number of times, counting what went by', () => {
    expect(upcomingDays(repeat({ end_kind: 'count', end_count: 5 }), '2026-10-14', 3, 9)).toEqual([
      '2026-10-14',
      '2026-10-15',
    ]);
  });

  it('stops at a last day and at "stop repeating"', () => {
    expect(
      upcomingDays(repeat({ end_kind: 'until', end_until: '2026-10-15' }), '2026-10-14', 0, 9),
    ).toEqual(['2026-10-14', '2026-10-15']);
    expect(upcomingDays(repeat({ stopped_on: '2026-10-14' }), '2026-10-14', 0, 9)).toEqual([
      '2026-10-14',
    ]);
  });

  it('none when the series has ended', () => {
    expect(upcomingDays(repeat({}), null, 0, 3)).toEqual([]);
  });
});

describe('in words', () => {
  it('says the rhythm and the end', () => {
    expect(rhythmText(1, 'day')).toBe('כל יום');
    expect(rhythmText(2, 'week')).toBe('כל שבועיים');
    expect(rhythmText(3, 'month')).toBe('כל 3 חודשים');
    expect(endText({ endKind: 'count', endCount: 7, endUntil: null })).toBe('7 פעמים');
    expect(endText({ endKind: 'never', endCount: null, endUntil: null })).toBe('בלי סוף');
  });

  it('sums a series up', () => {
    expect(
      repeatSummary({
        every: 3,
        unit: 'month',
        startsOn: '2026-10-14',
        atTime: '08:00',
        endKind: 'count',
        endCount: 7,
        endUntil: null,
      }),
    ).toBe('כל 3 חודשים · ב־08:00 · 7 פעמים');
  });

  it('counts the history, leaving out what is zero', () => {
    expect(
      historyCounts([occurrence('done'), occurrence('done'), occurrence('missed')]),
    ).toBe('בוצע 2 · הוחמץ 1');
  });
});
