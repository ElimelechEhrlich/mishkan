import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { CategoryGroup } from '../../hooks/useShopping';
import { shoppingCategories, todayIso } from '../../lib/itemRules';
import { tripWhen } from '../../lib/shoppingTrips';
import type { Item, ShoppingCategory } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { MissingItemRow } from './MissingItemRow';

type ShoppingSectionProps = {
  readonly title: string;
  readonly groups: readonly CategoryGroup[];
  /** The open going out shopping of each list. */
  readonly trips: ReadonlyMap<ShoppingCategory, Item>;
  /** Only these lists are shown, when one is chosen; null for all. */
  readonly only: ShoppingCategory | null;
  readonly entityNames: ReadonlyMap<string, string>;
  readonly onBuy: (item: Item) => void;
  readonly onStartRun: (category: ShoppingCategory) => void;
  /** Opens the add sheet as going out shopping for a list; absent where it cannot be kept. */
  readonly onPlanTrip?: ((category: ShoppingCategory) => void) | undefined;
};

/**
 * The shared or the private part of the list, by category, each with a button to go shopping
 * now and the time it is planned for (or a button to plan it). A list with nothing missing
 * shows only while going out for it is planned.
 */
export function ShoppingSection({
  title,
  groups,
  trips,
  only,
  entityNames,
  onBuy,
  onStartRun,
  onPlanTrip,
}: ShoppingSectionProps): ReactElement | null {
  const today = todayIso();
  const lists = shoppingCategories
    .filter((category) => only === null || category === only)
    .map((category) => ({
      category,
      items: groups.find((group) => group.category === category)?.items ?? [],
      trip: trips.get(category),
    }))
    .filter((list) => list.items.length > 0 || list.trip !== undefined);
  if (lists.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{title}</h2>
      {lists.map((list) => (
        <div key={list.category} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-1">
            <h3 className="flex flex-1 items-baseline gap-1.5">
              <span className="font-display text-base font-semibold">
                {labels.shoppingCategory[list.category]}
              </span>
              {list.items.length > 0 && (
                <span className="text-xs font-medium text-faint">{String(list.items.length)}</span>
              )}
            </h3>
            {list.trip !== undefined ? (
              <Link
                to={`/item/${list.trip.id}`}
                className="flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-[13px] font-medium text-ink shadow-card transition active:scale-95"
              >
                <Icon name="calendar" className="size-3.5 text-primary" />
                {labels.shopping.tripChip(tripWhen(list.trip, today))}
              </Link>
            ) : (
              onPlanTrip !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    onPlanTrip(list.category);
                  }}
                  className="flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-muted transition active:scale-95"
                >
                  <Icon name="calendar" className="size-3.5" />
                  {labels.shopping.planTrip}
                </button>
              )
            )}
            {list.items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onStartRun(list.category);
                }}
                className="flex min-h-8 items-center gap-1 rounded-full bg-primary-soft px-3 text-[13px] font-semibold text-primary transition active:scale-95"
              >
                <Icon name="cart" className="size-3.5" />
                {labels.actions.startRun}
              </button>
            )}
          </div>
          {list.items.length > 0 && (
            <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
              {list.items.map((item) => (
                <MissingItemRow
                  key={item.id}
                  item={item}
                  entityName={item.domain_id === null ? undefined : entityNames.get(item.domain_id)}
                  onToggle={onBuy}
                />
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
