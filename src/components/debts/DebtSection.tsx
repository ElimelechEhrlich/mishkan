import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { remainingOf } from '../../lib/debts';
import { formatMoney } from '../../lib/format';
import type { Debt, Item } from '../../types/domain';
import { DebtRow } from './DebtRow';

type DebtSectionProps = {
  readonly title: string;
  readonly debts: readonly Debt[];
  readonly tone: 'primary' | 'alert';
  readonly onClose: (item: Item) => void;
};

/** A group of open debts (important, or those that can wait), with what is left of them. */
export function DebtSection({
  title,
  debts,
  tone,
  onClose,
}: DebtSectionProps): ReactElement | null {
  if (debts.length === 0) {
    return null;
  }
  const total = debts.reduce((sum, debt) => sum + remainingOf(debt.details, debt.paid), 0);

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-xs font-bold tracking-wide text-muted">{title}</h2>
        <span
          className={`text-xs font-semibold tabular-nums ${tone === 'alert' ? 'text-alert' : 'text-primary'}`}
        >
          {labels.debts.total} {formatMoney(total)}
        </span>
      </div>
      <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {debts.map((debt) => (
          <DebtRow key={debt.item.id} debt={debt} onClose={onClose} />
        ))}
      </ul>
    </section>
  );
}
