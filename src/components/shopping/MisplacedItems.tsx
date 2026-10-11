import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';

type MisplacedItemsProps = {
  readonly items: readonly Item[];
  readonly entityNames: ReadonlyMap<string, string>;
  /** Converts an item to a missing item, so it joins the shopping list. */
  readonly onMakeMissing: (item: Item) => void;
};

/** Items that were filed in a shopping domain as another kind, with a way to put them on the list. */
export function MisplacedItems({
  items,
  entityNames,
  onMakeMissing,
}: MisplacedItemsProps): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
        {labels.shopping.misplacedTitle}
      </h2>
      <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {items.map((item) => {
          const entityName = item.domain_id === null ? undefined : entityNames.get(item.domain_id);
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0"
            >
              <Link to={`/item/${item.id}`} className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-medium break-words">{item.title}</span>
                <span className="text-xs text-muted">
                  {labels.kind[item.kind]}
                  {entityName === undefined ? '' : `${labels.item.separator}${entityName}`}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  onMakeMissing(item);
                }}
                className="min-h-8 shrink-0 rounded-full bg-primary-soft px-3 text-[13px] font-semibold text-primary transition active:scale-95"
              >
                {labels.shopping.makeMissing}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
