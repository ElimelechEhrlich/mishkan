import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { paymentsLeft } from '../../lib/debts';
import { formatMoney } from '../../lib/format';

type PlanSummaryProps = {
  readonly monthly: number;
  /** What is left to pay. */
  readonly left: number;
  readonly amount: number;
  /** The whole sum to repay with interest, or null. */
  readonly repayTotal: number | null;
};

/** How many payments a plan has left and the last one, and with interest, what it comes to. */
export function PlanSummary({ monthly, left, amount, repayTotal }: PlanSummaryProps): ReactElement {
  const count = paymentsLeft(left, monthly);
  const last = Math.round((left - (count - 1) * monthly) * 100) / 100;
  return (
    <div className="flex flex-col gap-0.5 text-[13px] text-muted">
      <span>
        {labels.debts.paymentsLeft(count, formatMoney(count === 1 ? last : monthly))}
        {last !== monthly && count > 1 && `, ${labels.debts.lastPayment(formatMoney(last))}`}
      </span>
      {repayTotal !== null && repayTotal > amount && (
        <span>
          {labels.debts.repaySummary(formatMoney(repayTotal), formatMoney(repayTotal - amount))}
        </span>
      )}
    </div>
  );
}
