import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { remainingOf } from '../../lib/debts';
import { formatMoney } from '../../lib/format';
import type { Debt, Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';

type DebtRowProps = {
  readonly debt: Debt;
  readonly onClose: (item: Item) => void;
};

/** "10.11" for a payment day. */
function shortDay(isoDate: string): string {
  return `${String(Number(isoDate.slice(8, 10)))}.${String(Number(isoDate.slice(5, 7)))}`;
}

/**
 * One debt in the list: who, what is left (and of how much, once something was paid, with a
 * thin bar), and its monthly plan with the next payment day.
 */
export function DebtRow({ debt, onClose }: DebtRowProps): ReactElement {
  const { item, details, paid } = debt;
  const left = remainingOf(details, paid);
  const plan =
    details.monthly_amount !== null && details.monthly_day !== null
      ? labels.debts.perMonth(formatMoney(details.monthly_amount), details.monthly_day)
      : null;
  return (
    <li className="group flex gap-3 ps-3.5">
      <span className="w-5.5 shrink-0 pt-3">
        <CheckButton
          checked={false}
          label={labels.actions.closeDebt}
          onClick={() => {
            onClose(item);
          }}
        />
      </span>
      <Link
        to={`/item/${item.id}`}
        className="flex min-w-0 flex-1 flex-col gap-1 border-t border-line py-3 pe-3.5 group-first:border-t-0 active:opacity-70"
      >
        <span className="flex items-baseline gap-2">
          {/* The item's title, which is the one edited on its page. */}
          <span className="min-w-0 flex-1 text-[14px] font-medium break-words">{item.title}</span>
          <span className="font-display text-base font-semibold tabular-nums">
            {formatMoney(left)}
          </span>
        </span>
        {(paid > 0 || plan !== null) && (
          <span className="flex items-center gap-2 text-[12px] text-muted">
            <span className="min-w-0 flex-1 truncate">
              {plan}
              {plan !== null && item.due_date !== null && labels.item.separator}
              {item.due_date !== null && labels.debts.nextPayment(shortDay(item.due_date))}
            </span>
            {paid > 0 && (
              <span className="shrink-0 tabular-nums">
                {labels.debts.of(formatMoney(details.amount))}
              </span>
            )}
          </span>
        )}
        {paid > 0 && (
          <span className="h-1 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${String(Math.min(100, (paid / details.amount) * 100))}%` }}
            />
          </span>
        )}
      </Link>
    </li>
  );
}
