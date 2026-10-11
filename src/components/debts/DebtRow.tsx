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
    <li className="group flex gap-3 ps-3.5">
      <span className="w-5.5 shrink-0 pt-3">
        <CheckButton
          checked={false}
          label={labels.actions.closeDebt}
          onClick={() => {
            onClose(debt.item);
          }}
        />
      </span>
      <Link
        to={`/item/${debt.item.id}`}
        className="flex min-w-0 flex-1 items-baseline gap-2 border-t border-line py-3 pe-3.5 group-first:border-t-0 active:opacity-70"
      >
        <span className="min-w-0 flex-1 text-[15px] font-medium break-words">
          {debt.details.counterparty}
        </span>
        <span className="font-display text-base font-semibold tabular-nums">
          {formatMoney(debt.details.amount)}
        </span>
      </Link>
    </li>
  );
}
