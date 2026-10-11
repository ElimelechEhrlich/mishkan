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
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col rounded-xl bg-surface px-3.5 py-3 shadow-card">
        <span className="font-display text-[22px] leading-8 font-bold text-primary tabular-nums">
          {formatMoney(total(owedToUs))}
        </span>
        <span className="text-xs text-muted">{labels.debtDirection.owed_to_us}</span>
      </div>
      <div className="flex flex-col rounded-xl bg-surface px-3.5 py-3 shadow-card">
        <span className="font-display text-[22px] leading-8 font-bold text-alert tabular-nums">
          {formatMoney(total(weOwe))}
        </span>
        <span className="text-xs text-muted">{labels.debtDirection.we_owe}</span>
      </div>
    </div>
  );
}
