import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { CategoryGroup } from '../../hooks/useShopping';
import type { Item, ShoppingCategory } from '../../types/domain';
import { Card } from '../ui/Card';
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
    <Card title={title}>
      {groups.map((group) => (
        <div key={group.category} className="flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">
              {labels.shoppingCategory[group.category]}
              <span className="ms-2 text-sm font-medium text-muted">
                {String(group.items.length)}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => {
                onStartRun(group.category);
              }}
              className="min-h-10 rounded-full bg-primary-soft px-3.5 text-sm font-medium text-primary transition active:scale-95"
            >
              {labels.actions.startRun}
            </button>
          </div>
          <ul className="flex flex-col divide-y divide-line">
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
    </Card>
  );
}
