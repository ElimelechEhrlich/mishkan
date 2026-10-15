import { describe, expect, it } from 'vitest';
import {
  dayAfter,
  endText,
  historyCounts,
  repeatSummary,
  rhythmOfRule,
  rhythmText,
  stepFrom,
  isRhythmDay,
  countsPeriods,
  periodsEnd,
  periodsOf,
  nextSlot,
  upcomingSlots,
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
  const days = (slots: readonly { readonly day: string }[]): string[] =>
    slots.map((slot) => slot.day);

  it('runs on with no end', () => {
    expect(days(upcomingSlots(repeat({}), { day: '2026-10-14', time: null }, 0, 3))).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
  });

  it('stops at a number of times, counting what went by', () => {
    expect(
      days(
        upcomingSlots(
          repeat({ end_kind: 'count', end_count: 5 }),
          { day: '2026-10-14', time: null },
          3,
          9,
        ),
      ),
    ).toEqual(['2026-10-14', '2026-10-15']);
  });

  it('stops at a last day and at "stop repeating"', () => {
    const current = { day: '2026-10-14', time: null };
    expect(
      days(upcomingSlots(repeat({ end_kind: 'until', end_until: '2026-10-15' }), current, 0, 9)),
    ).toEqual(['2026-10-14', '2026-10-15']);
    expect(days(upcomingSlots(repeat({ stopped_on: '2026-10-14' }), current, 0, 9))).toEqual([
      '2026-10-14',
    ]);
  });

  it('none when the series has ended', () => {
    expect(upcomingSlots(repeat({}), null, 0, 3)).toEqual([]);
  });

  it('several hours a day, each an occurrence', () => {
    const daily = repeat({ times: ['08:00:00', '14:00:00', '20:00:00'] });
    expect(upcomingSlots(daily, { day: '2026-10-14', time: '14:00' }, 0, 4)).toEqual([
      { day: '2026-10-14', time: '14:00' },
      { day: '2026-10-14', time: '20:00' },
      { day: '2026-10-15', time: '08:00' },
      { day: '2026-10-15', time: '14:00' },
    ]);
  });

  it('chosen days of the week, every other week', () => {
    // 2026-10-14 is a Wednesday; its week starts on Sunday the 11th.
    const twoWeeks = repeat({ unit: 'week', every: 2, weekdays: [0, 3] });
    expect(isRhythmDay(twoWeeks, '2026-10-18')).toBe(false);
    expect(isRhythmDay(twoWeeks, '2026-10-25')).toBe(true);
    expect(nextSlot(twoWeeks, { day: '2026-10-14', time: null }, 0)).toEqual({
      day: '2026-10-25',
      time: null,
    });
    expect(nextSlot(twoWeeks, { day: '2026-10-25', time: null }, 0)).toEqual({
      day: '2026-10-28',
      time: null,
    });
  });

  it('a moved occurrence: the rhythm goes on from where it was planned', () => {
    const moved = repeat({ planned_date: '2026-10-14' });
    expect(days(upcomingSlots(moved, { day: '2026-10-16', time: null }, 0, 3))).toEqual([
      '2026-10-16',
      '2026-10-15',
      '2026-10-16',
    ]);
  });
});

describe('a Hebrew date every year', () => {
  const yearly = repeat({
    unit: 'year',
    hebrew: true,
    starts_on: '2026-10-20',
    dates: ['2027-10-09', '2026-10-20', '2028-10-27'],
  });

  it('falls only on the days it was given, in order', () => {
    expect(isRhythmDay(yearly, '2027-10-20')).toBe(false);
    expect(isRhythmDay(yearly, '2027-10-09')).toBe(true);
    expect(upcomingSlots(yearly, { day: '2026-10-20', time: null }, 0, 10)).toEqual([
      { day: '2026-10-20', time: null },
      { day: '2027-10-09', time: null },
      { day: '2028-10-27', time: null },
    ]);
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
        times: ['08:00'],
        weekdays: [],
        fromKind: 'schedule',
        trackerCloses: false,
        endKind: 'count',
        endCount: 7,
        endUntil: null,
      }),
    ).toBe('כל 3 חודשים · ב־08:00 · 7 פעמים');
  });

  it('counts the history, leaving out what is zero', () => {
    expect(historyCounts([occurrence('done'), occurrence('done'), occurrence('missed')])).toBe(
      'בוצע 2 · הוחמץ 1',
    );
  });
});

describe('the rule kept for older versions', () => {
  it('reads the rhythm back', () => {
    expect(rhythmOfRule('FREQ=WEEKLY')).toEqual({ every: 1, unit: 'week' });
    expect(rhythmOfRule('FREQ=MONTHLY;INTERVAL=3')).toEqual({ every: 3, unit: 'month' });
    expect(rhythmOfRule('nonsense')).toBeNull();
    expect(rhythmOfRule(null)).toBeNull();
  });
});

describe('an end in days rather than times', () => {
  it('ends ten days of twice a day on the tenth day', () => {
    expect(periodsEnd('2026-10-15', 1, 'day', 10)).toBe('2026-10-24');
    expect(periodsEnd('2026-10-15', 1, 'week', 2)).toBe('2026-10-28');
    expect(periodsEnd('2026-01-31', 1, 'month', 1)).toBe('2026-02-27');
  });

  it('reads the days back from the last day, and only then', () => {
    const base = {
      startsOn: '2026-10-15',
      every: 1,
      unit: 'day' as const,
      endKind: 'until' as const,
    };
    expect(periodsOf({ ...base, endUntil: '2026-10-24' })).toBe(10);
    expect(periodsOf({ ...base, every: 2, endUntil: '2026-11-03' })).toBe(10);
    expect(periodsOf({ ...base, unit: 'week', endUntil: '2026-10-30' })).toBeNull();
  });

  it('is offered with several hours a day, or set weekdays', () => {
    expect(countsPeriods({ times: ['08:00', '20:00'], weekdays: [], unit: 'day' })).toBe(true);
    expect(countsPeriods({ times: ['08:00'], weekdays: [2, 4], unit: 'week' })).toBe(true);
    expect(countsPeriods({ times: ['08:00'], weekdays: [], unit: 'day' })).toBe(false);
  });
});
