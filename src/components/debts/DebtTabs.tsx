import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import type { DebtDirection } from '../../types/domain';

type DebtTabsProps = {
  /** What is left of each way's debts. */
  readonly totals: Readonly<Record<DebtDirection, number>>;
  readonly selected: DebtDirection;
  readonly onSelect: (direction: DebtDirection) => void;
};

const order = [
  { direction: 'we_owe', tone: 'text-alert', ring: 'ring-alert/30', soft: 'bg-alert-soft/70' },
  {
    direction: 'owed_to_us',
    tone: 'text-primary',
    ring: 'ring-primary/30',
    soft: 'bg-primary-soft',
  },
] as const;

/**
 * The two ways a debt goes, as two totals to choose between: what the household owes, first,
 * and what is owed to it. The chosen one stands out, and its debts show below.
 */
export function DebtTabs({ totals, selected, onSelect }: DebtTabsProps): ReactElement {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-2">
      {order.map((tab) => {
        const chosen = tab.direction === selected;
        return (
          <button
            key={tab.direction}
            type="button"
            role="tab"
            aria-selected={chosen}
            onClick={() => {
              onSelect(tab.direction);
            }}
            className={`flex flex-col items-start rounded-2xl px-3.5 py-3 transition active:scale-[0.98] ${
              chosen ? `bg-surface shadow-card ring-2 ${tab.ring}` : tab.soft
            }`}
          >
            <span
              className={`font-display text-[22px] leading-8 font-bold tabular-nums ${tab.tone}`}
            >
              {formatMoney(totals[tab.direction])}
            </span>
            <span className={`text-xs font-medium ${chosen ? 'text-ink' : 'text-muted'}`}>
              {labels.debtDirection[tab.direction]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
