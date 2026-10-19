import { describe, expect, it } from 'vitest';
import { planMonths, planStartFrom, remainingOf } from './debts';

describe('debts', () => {
  it('leaves the amount less what was paid, never below nothing', () => {
    expect(remainingOf({ amount: 1000 }, 300)).toBe(700);
    expect(remainingOf({ amount: 1000 }, 1100)).toBe(0);
    expect(remainingOf({ amount: 99.9 }, 33.3)).toBe(66.6);
  });

  it('starts a plan this month while its day is ahead, or next month', () => {
    expect(planStartFrom(20, '2026-10-19')).toBe('2026-10-20');
    expect(planStartFrom(19, '2026-10-19')).toBe('2026-10-19');
    expect(planStartFrom(10, '2026-10-19')).toBe('2026-11-10');
    expect(planStartFrom(5, '2026-12-19')).toBe('2027-01-05');
  });

  it('lists the months of a plan up to the one due, paid or late', () => {
    const months = planMonths(
      { monthly_day: 10, plan_starts: '2026-08-10' },
      [{ for_month: '2026-08-01' }],
      '2026-10-19',
      '2026-09-10',
    );
    expect(months).toEqual([
      { month: '2026-08-01', day: '2026-08-10', paid: true, late: false },
      { month: '2026-09-01', day: '2026-09-10', paid: false, late: true },
    ]);
  });
});
