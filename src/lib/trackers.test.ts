import { describe, expect, it } from 'vitest';
import { entryNumber, newestFirst, trackerLine, trackerTotals } from './trackers';
import type { TrackerEntry } from '../types/domain';

function entry(value: string, on_date: string, created_at = `${on_date}T10:00:00Z`): TrackerEntry {
  return { id: `${value}-${on_date}`, item_id: 't', value, on_date, note: null, created_at };
}

describe('entryNumber', () => {
  it('reads numbers written the usual ways', () => {
    expect(entryNumber('3,000')).toBe(3000);
    expect(entryNumber('₪ 1,500.5')).toBe(1500.5);
    expect(entryNumber('18.4')).toBe(18.4);
  });

  it('leaves text alone', () => {
    expect(entryNumber('הלך יפה')).toBeNull();
    expect(entryNumber('3 קומות')).toBeNull();
  });
});

describe('trackerTotals', () => {
  const entries = [
    entry('3,000', '2026-10-01'),
    entry('1500', '2026-10-10'),
    entry('בלי תשלום החודש', '2026-09-01'),
  ];

  it('adds up only the numbers, and knows the newest', () => {
    const totals = trackerTotals(entries);
    expect(totals.sum).toBe(4500);
    expect(totals.latest).toBe('1500');
    expect(totals.previous).toBe('3,000');
    expect(totals.count).toBe(3);
  });

  it('puts the one added last first on the same day', () => {
    const same = [
      entry('a', '2026-10-01', '2026-10-01T08:00:00Z'),
      entry('b', '2026-10-01', '2026-10-01T09:00:00Z'),
    ];
    expect(newestFirst(same).map((e) => e.value)).toEqual(['b', 'a']);
  });
});

describe('trackerLine', () => {
  const entries = [entry('3,000', '2026-10-01'), entry('1500', '2026-10-10')];

  it('sums up as chosen, with the unit', () => {
    expect(trackerLine('sum', '₪', entries)?.value).toBe('4,500 ₪');
    expect(trackerLine('latest', 'ק״ג', entries)?.value).toBe('1,500 ק״ג');
    expect(trackerLine('none', '₪', entries)).toBeNull();
  });

  it('says nothing without entries', () => {
    expect(trackerLine('sum', null, [])).toBeNull();
  });
});

describe('entryNumber with units and marks', () => {
  it('reads amounts written with units, signs and direction marks', () => {
    expect(entryNumber('72.5 ק"ג')).toBe(72.5);
    expect(entryNumber('3,000 ש״ח')).toBe(3000);
    expect(entryNumber('+500')).toBe(500);
    expect(entryNumber('\u2212500')).toBe(-500);
    expect(entryNumber('\u200f3,000')).toBe(3000);
    expect(entryNumber('1,200')).toBe(1200);
    expect(entryNumber('לא מספר')).toBeNull();
  });
});
