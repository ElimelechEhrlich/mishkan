import { describe, expect, it } from 'vitest';
import {
  interestOf,
  monthNeeds,
  monthlyForCount,
  paymentsLeft,
  planMonths,
  planResult,
  planStartFrom,
  remainingOf,
  spitzerMonthly,
} from './debts';

describe('debts', () => {
  it('leaves what is owed less what was paid, never below nothing', () => {
    expect(remainingOf({ amount: 1000, repay_total: null }, 300)).toBe(700);
    expect(remainingOf({ amount: 1000, repay_total: null }, 1100)).toBe(0);
    expect(remainingOf({ amount: 99.9, repay_total: null }, 33.3)).toBe(66.6);
  });

  it('counts a loan by the whole sum to repay, interest included', () => {
    expect(remainingOf({ amount: 50000, repay_total: 54760 }, 1521)).toBe(53239);
    expect(interestOf({ amount: 50000, repay_total: 54760 })).toBe(4760);
    expect(interestOf({ amount: 1000, repay_total: null })).toBe(0);
  });

  it('splits what is left into a number of payments, the last one a little less', () => {
    expect(monthlyForCount(10000, 3)).toBe(3333.34);
    expect(monthlyForCount(3000, 3)).toBe(1000);
    expect(paymentsLeft(10000, 3333.34)).toBe(3);
    expect(paymentsLeft(2500, 1000)).toBe(3);
    expect(paymentsLeft(2000, 1000)).toBe(2);
  });

  it('works out a monthly payment from the interest', () => {
    expect(spitzerMonthly(50000, 6, 36)).toBe(1521.1);
    expect(spitzerMonthly(1200, 0, 12)).toBe(100);
  });

  it('asks of a month only the rest of its sum, and never more than is left', () => {
    const payments = [{ for_month: '2026-08-01', amount: 800, skipped: false }];
    expect(monthNeeds(1000, payments, '2026-08-01', 5000)).toBe(200);
    expect(monthNeeds(1000, payments, '2026-09-01', 500)).toBe(500);
    expect(monthNeeds(1000, payments, '2026-09-01', 5000)).toBe(1000);
  });

  it('starts a plan this month while its day is ahead, or next month', () => {
    expect(planStartFrom(20, '2026-10-19')).toBe('2026-10-20');
    expect(planStartFrom(19, '2026-10-19')).toBe('2026-10-19');
    expect(planStartFrom(10, '2026-10-19')).toBe('2026-11-10');
    expect(planStartFrom(5, '2026-12-19')).toBe('2027-01-05');
  });

  it('lists the months of a plan up to the one due: paid, skipped, part paid or late', () => {
    const months = planMonths(
      { monthly_amount: 1000, monthly_day: 10, plan_starts: '2026-07-10' },
      [
        { for_month: '2026-07-01', amount: 1000, skipped: false },
        { for_month: '2026-08-01', amount: 0, skipped: true },
        { for_month: '2026-09-01', amount: 400, skipped: false },
      ],
      '2026-10-19',
      '2026-09-10',
    );
    expect(months).toEqual([
      { month: '2026-07-01', day: '2026-07-10', state: 'paid', paid: 1000, late: false },
      { month: '2026-08-01', day: '2026-08-10', state: 'skipped', paid: 0, late: false },
      { month: '2026-09-01', day: '2026-09-10', state: 'open', paid: 400, late: true },
    ]);
  });
});

describe('planResult', () => {
  const debt = { amount: 50000, repay_total: null, monthly_amount: null };

  it('splits what is left of the amount by a number of payments', () => {
    expect(planResult({ by: 'count', count: 3, interest: false }, debt, 40000)).toEqual({
      monthly: 3333.34,
      repayTotal: null,
    });
  });

  it('adds the interest to what is owed', () => {
    expect(
      planResult({ by: 'count', count: 36, interest: true, monthly: 0, yearlyPercent: 6 }, debt, 0),
    ).toEqual({ monthly: 1521.1, repayTotal: 54759.6 });
    expect(
      planResult(
        { by: 'count', count: 10, interest: true, monthly: 5200, yearlyPercent: null },
        debt,
        0,
      ),
    ).toEqual({ monthly: 5200, repayTotal: 52000 });
  });

  it('keeps the interest for the payments left when the monthly sum changes', () => {
    const loan = { amount: 50000, repay_total: 52000, monthly_amount: 5200 };
    expect(planResult({ by: 'month', monthly: 5500 }, loan, 10400)).toEqual({
      monthly: 5500,
      repayTotal: 54400,
    });
    expect(planResult({ by: 'month', monthly: 700 }, debt, 0)).toEqual({
      monthly: 700,
      repayTotal: null,
    });
  });
});
