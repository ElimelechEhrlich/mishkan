import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import type { Debt, Item } from '../../types/domain';
import { Card } from '../ui/Card';
import { DebtRow } from './DebtRow';

type DebtSectionProps = {
  readonly title: string;
  readonly debts: readonly Debt[];
  readonly tone: 'primary' | 'alert';
  readonly onClose: (item: Item) => void;
};

/** The open debts in one direction, with their total. */
export function DebtSection({ title, debts, tone, onClose }: DebtSectionProps): ReactElement | null {
  if (debts.length === 0) {
    return null;
  }
  const total = debts.reduce((sum, debt) => sum + debt.details.amount, 0);

  return (
    <Card
      title={title}
      aside={
        <span className={`text-sm font-medium ${tone === 'alert' ? 'text-alert' : 'text-primary'}`}>
          {labels.debts.total} {formatMoney(total)}
        </span>
      }
    >
      <ul className="flex flex-col divide-y divide-line">
        {debts.map((debt) => (
          <DebtRow key={debt.item.id} debt={debt} onClose={onClose} />
        ))}
      </ul>
    </Card>
  );
}
