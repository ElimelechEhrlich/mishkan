import { addDays } from './itemRules';
import type { DebtDetails, DebtPayment } from '../types/domain';

/** What is left of a debt: its amount less what was paid, never below nothing. */
export function remainingOf(details: Pick<DebtDetails, 'amount'>, paid: number): number {
  return Math.max(0, Math.round((details.amount - paid) * 100) / 100);
}

function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 8)}01`;
}

function nextMonth(isoMonth: string): string {
  const year = Number(isoMonth.slice(0, 4));
  const month = Number(isoMonth.slice(5, 7));
  return month === 12
    ? `${String(year + 1)}-01-01`
    : `${String(year)}-${String(month + 1).padStart(2, '0')}-01`;
}

/** The day of the plan in a month. */
export function planDay(isoMonth: string, day: number): string {
  return addDays(monthStart(isoMonth), day - 1);
}

/** Where a new plan starts: on its day this month, or next month once that day has passed. */
export function planStartFrom(day: number, today: string): string {
  const thisMonth = planDay(today, day);
  return thisMonth >= today ? thisMonth : planDay(nextMonth(monthStart(today)), day);
}

/** One month of a plan, as its page lists it. */
export type PlanMonth = {
  readonly month: string;
  /** Its payment day. */
  readonly day: string;
  readonly paid: boolean;
  /** Its day has passed and it was not paid. */
  readonly late: boolean;
};

/**
 * The months of a plan from its start: those gone by, and the one that is due now. A month
 * counts as paid by a payment made for it.
 */
export function planMonths(
  details: Pick<DebtDetails, 'monthly_day' | 'plan_starts'>,
  payments: readonly Pick<DebtPayment, 'for_month'>[],
  today: string,
  /** The month now due (the debt's date), when the plan still runs. */
  dueDate: string | null,
): PlanMonth[] {
  if (details.plan_starts === null || details.monthly_day === null) {
    return [];
  }
  const paidMonths = new Set(payments.map((payment) => payment.for_month));
  const day = details.monthly_day;
  const lastMonth = monthStart(dueDate ?? today);
  const months: PlanMonth[] = [];
  for (
    let month = monthStart(details.plan_starts);
    month <= lastMonth && months.length < 60;
    month = nextMonth(month)
  ) {
    const paid = paidMonths.has(month);
    const date = planDay(month, day);
    months.push({ month, day: date, paid, late: !paid && date < today });
  }
  return months;
}

const monthFormat = new Intl.DateTimeFormat('he-IL', { month: 'short' });
const monthYearFormat = new Intl.DateTimeFormat('he-IL', { month: 'short', year: 'numeric' });

/** A month of a plan, short: "נוב׳", with its year when it is not this year's. */
export function monthLabel(isoMonth: string, today: string): string {
  const date = new Date(`${isoMonth.slice(0, 8)}15T12:00:00`);
  return (isoMonth.slice(0, 4) === today.slice(0, 4) ? monthFormat : monthYearFormat).format(date);
}
