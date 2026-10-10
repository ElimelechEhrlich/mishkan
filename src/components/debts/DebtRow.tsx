import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import type { Debt, Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';

type DebtRowProps = {
  readonly debt: Debt;
  readonly onClose: (item: Item) => void;
};

export function DebtRow({ debt, onClose }: DebtRowProps): ReactElement {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <CheckButton
        checked={false}
        label={labels.actions.closeDebt}
        onClick={() => {
          onClose(debt.item);
        }}
      />
      <Link to={`/item/${debt.item.id}`} className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="min-w-0 flex-1 font-medium break-words">{debt.details.counterparty}</span>
        <span className="font-display text-lg font-bold">{formatMoney(debt.details.amount)}</span>
      </Link>
    </li>
  );
}
