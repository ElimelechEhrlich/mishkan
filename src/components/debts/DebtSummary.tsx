import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import type { Debt } from '../../types/domain';

type DebtSummaryProps = {
  readonly owedToUs: readonly Debt[];
  readonly weOwe: readonly Debt[];
};

function total(debts: readonly Debt[]): number {
  return debts.reduce((sum, debt) => sum + debt.details.amount, 0);
}

/** The two totals side by side: what is owed to the household, and what it owes. */
export function DebtSummary({ owedToUs, weOwe }: DebtSummaryProps): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1 rounded-2xl bg-primary-soft p-4">
        <span className="text-[13px] font-bold text-primary">{labels.debtDirection.owed_to_us}</span>
        <span className="font-display text-2xl font-bold text-primary">
          {formatMoney(total(owedToUs))}
        </span>
      </div>
      <div className="flex flex-col gap-1 rounded-2xl bg-alert-soft p-4">
        <span className="text-[13px] font-bold text-alert">{labels.debtDirection.we_owe}</span>
        <span className="font-display text-2xl font-bold text-alert">
          {formatMoney(total(weOwe))}
        </span>
      </div>
    </div>
  );
}
