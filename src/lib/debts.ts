import { addDays } from './itemRules';
import type { DebtDetails, DebtPayment } from '../types/domain';

type Owed = Pick<DebtDetails, 'amount' | 'repay_total'>;

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** What a debt comes to: its amount, or, for a loan with interest, the whole sum to repay. */
export function owedOf(details: Owed): number {
  return details.repay_total ?? details.amount;
}

/** What is left of a debt: what is owed less what was paid, never below nothing. */
export function remainingOf(details: Owed, paid: number): number {
  return Math.max(0, cents(owedOf(details) - paid));
}

/** The interest on a loan: what is repaid beyond its amount. */
export function interestOf(details: Owed): number {
  return Math.max(0, cents(owedOf(details) - details.amount));
}

/** The monthly sum that pays what is left in so many payments, the last one a little less. */
export function monthlyForCount(left: number, count: number): number {
  return Math.ceil((left * 100) / count - 1e-6) / 100;
}

/**
 * The monthly payment of a loan with interest, paid off in equal payments (שפיצר): the amount
 * lent, the yearly interest in percent, and how many months.
 */
export function spitzerMonthly(principal: number, yearlyPercent: number, count: number): number {
  const rate = yearlyPercent / 100 / 12;
  if (rate === 0) {
    return monthlyForCount(principal, count);
  }
  return cents((principal * rate) / (1 - (1 + rate) ** -count));
}

/** How many payments of the monthly sum are left, the last one perhaps smaller. */
export function paymentsLeft(left: number, monthly: number): number {
  return Math.ceil(cents(left / monthly) - 1e-6);
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

type MonthPayment = Pick<DebtPayment, 'for_month' | 'amount' | 'skipped'>;

/** What was paid for a month of the plan. */
export function paidForMonth(payments: readonly MonthPayment[], month: string): number {
  return cents(
    payments
      .filter((payment) => payment.for_month === month)
      .reduce((sum, payment) => sum + payment.amount, 0),
  );
}

/** What a month still needs: the rest of its sum, never more than is left of the debt. */
export function monthNeeds(
  monthly: number,
  payments: readonly MonthPayment[],
  month: string,
  left: number,
): number {
  return Math.max(0, Math.min(cents(monthly - paidForMonth(payments, month)), left));
}

/** One month of a plan, as its page lists it. */
export type PlanMonth = {
  readonly month: string;
  /** Its payment day. */
  readonly day: string;
  /** Paid up to the monthly sum, let go without paying, or still open. */
  readonly state: 'paid' | 'skipped' | 'open';
  /** What was paid for it so far. */
  readonly paid: number;
  /** Its day has passed and it is still open. */
  readonly late: boolean;
};

/**
 * The months of a plan from its start: those gone by, and the one that is due now. A month is
 * paid once the payments made for it come to the monthly sum.
 */
export function planMonths(
  details: Pick<DebtDetails, 'monthly_amount' | 'monthly_day' | 'plan_starts'>,
  payments: readonly MonthPayment[],
  today: string,
  /** The month now due (the debt's date), when the plan still runs. */
  dueDate: string | null,
): PlanMonth[] {
  if (
    details.plan_starts === null ||
    details.monthly_day === null ||
    details.monthly_amount === null
  ) {
    return [];
  }
  const day = details.monthly_day;
  const monthly = details.monthly_amount;
  const lastMonth = monthStart(dueDate ?? today);
  const months: PlanMonth[] = [];
  for (
    let month = monthStart(details.plan_starts);
    month <= lastMonth && months.length < 60;
    month = nextMonth(month)
  ) {
    const paid = paidForMonth(payments, month);
    const skipped = payments.some((payment) => payment.for_month === month && payment.skipped);
    const state = skipped ? 'skipped' : paid >= monthly ? 'paid' : 'open';
    const date = planDay(month, day);
    months.push({ month, day: date, state, paid, late: state === 'open' && date < today });
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

/** A plan as its form sets it: by a sum each month, or by a number of payments. */
export type PlanDraft =
  | { readonly by: 'month'; readonly monthly: number }
  | { readonly by: 'count'; readonly count: number; readonly interest: false }
  | {
      readonly by: 'count';
      readonly count: number;
      readonly interest: true;
      /** The monthly payment the bank names, used when no yearly interest is given. */
      readonly monthly: number;
      /** The yearly interest in percent, to work the monthly payment out from; null if not given. */
      readonly yearlyPercent: number | null;
    };

/** What a plan saves: its monthly sum, and the whole sum to repay when there is interest. */
export type PlanResult = { readonly monthly: number; readonly repayTotal: number | null };

/**
 * Works out a plan for what is left of a debt. By number of payments, what is left of its
 * amount is split, or, with interest, the whole sum to repay is the payments yet to come on top
 * of what was paid. A new sum each month keeps the interest, if there is, for the payments left.
 */
export function planResult(
  draft: PlanDraft,
  details: Pick<DebtDetails, 'amount' | 'repay_total' | 'monthly_amount'>,
  paid: number,
): PlanResult | null {
  const principalLeft = Math.max(0, cents(details.amount - paid));
  if (draft.by === 'month') {
    if (!(draft.monthly > 0)) {
      return null;
    }
    const left = remainingOf(details, paid);
    const repayTotal =
      details.repay_total === null || details.monthly_amount === null
        ? details.repay_total
        : cents(paid + paymentsLeft(left, details.monthly_amount) * draft.monthly);
    return { monthly: draft.monthly, repayTotal };
  }
  if (!Number.isInteger(draft.count) || draft.count < 1 || principalLeft === 0) {
    return null;
  }
  if (!draft.interest) {
    return { monthly: monthlyForCount(principalLeft, draft.count), repayTotal: null };
  }
  const monthly =
    draft.yearlyPercent === null
      ? draft.monthly
      : spitzerMonthly(principalLeft, draft.yearlyPercent, draft.count);
  return monthly > 0 ? { monthly, repayTotal: cents(paid + draft.count * monthly) } : null;
}
