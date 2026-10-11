import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { CategoryGroup } from '../../hooks/useShopping';
import type { Item, ShoppingCategory } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { MissingItemRow } from './MissingItemRow';

type ShoppingSectionProps = {
  readonly title: string;
  readonly groups: readonly CategoryGroup[];
  readonly entityNames: ReadonlyMap<string, string>;
  readonly onBuy: (item: Item) => void;
  readonly onStartRun: (category: ShoppingCategory) => void;
};

/** The shared or the private part of the list, by category, each with a button to go shopping. */
export function ShoppingSection({
  title,
  groups,
  entityNames,
  onBuy,
  onStartRun,
}: ShoppingSectionProps): ReactElement | null {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{title}</h2>
      {groups.map((group) => (
        <div key={group.category} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <h3 className="flex items-baseline gap-1.5">
              <span className="font-display text-base font-semibold">
                {labels.shoppingCategory[group.category]}
              </span>
              <span className="text-xs font-medium text-faint">{String(group.items.length)}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                onStartRun(group.category);
              }}
              className="flex min-h-8 items-center gap-1 rounded-full bg-primary-soft px-3 text-[13px] font-semibold text-primary transition active:scale-95"
            >
              <Icon name="cart" className="size-3.5" />
              {labels.actions.startRun}
            </button>
          </div>
          <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
            {group.items.map((item) => (
              <MissingItemRow
                key={item.id}
                item={item}
                entityName={item.domain_id === null ? undefined : entityNames.get(item.domain_id)}
                onToggle={onBuy}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
