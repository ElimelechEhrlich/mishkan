import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toMessage } from '../lib/errors';
import { shoppingCategories } from '../lib/itemRules';
import {
  createMissingItem,
  createShoppingRun,
  listBoughtRunItems,
} from '../services/shoppingService';
import type {
  EntityWithDomains,
  Item,
  NewMissingItem,
  ShoppingCategory,
  ShoppingRun,
} from '../types/domain';
import type { UseItems } from './useItems';

export type CategoryGroup = {
  readonly category: ShoppingCategory;
  readonly items: readonly Item[];
};

/** An entity and its shopping domain, for choosing whom a missing item is for. */
export type ShoppingTarget = {
  readonly entity: EntityWithDomains;
  readonly domainId: string;
};

export type UseShopping = {
  /** Missing items of shared entities that are not in a run, by category. */
  readonly shared: readonly CategoryGroup[];
  /** Missing items of the parent's personal entity that are not in a run, by category. */
  readonly personal: readonly CategoryGroup[];
  readonly runs: readonly ShoppingRun[];
  readonly targets: readonly ShoppingTarget[];
  /** Shopping domain id to the name of its entity, for showing whom an item is for. The home is left out. */
  readonly entityNames: ReadonlyMap<string, string>;
  readonly error: string | null;
  readonly addMissingItem: (newItem: NewMissingItem) => Promise<boolean>;
  /** Marks a missing item bought, or puts a bought one back. */
  readonly toggleBought: (item: Item) => void;
  /** Gathers a category into a new run and opens the run's page. */
  readonly startRun: (category: ShoppingCategory, isPrivate: boolean) => void;
};

function byCategory(items: readonly Item[]): CategoryGroup[] {
  return shoppingCategories
    .map((category) => ({
      category,
      items: items.filter((item) => item.shopping_category === category),
    }))
    .filter((group) => group.items.length > 0);
}

/** The shopping list, open runs, and the actions on them. A run is finished with `items.completeItem`. */
export function useShopping(
  items: UseItems,
  entities: readonly EntityWithDomains[],
): UseShopping {
  const navigate = useNavigate();
  const [bought, setBought] = useState<readonly Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { reload, completeItem, reopenItem } = items;

  const openItems = items.items;
  /** Changes when an item is bought or returned, so bought run items are refetched then. */
  const shoppingKey = openItems
    .filter((item) => item.kind === 'missing_item' || item.kind === 'shopping_run')
    .map((item) => `${item.id}:${item.run_id ?? ''}`)
    .join(',');

  useEffect(() => {
    let active = true;
    listBoughtRunItems()
      .then((fetched) => {
        if (active) {
          setBought(fetched);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(toMessage(caught));
        }
      });
    return (): void => {
      active = false;
    };
  }, [shoppingKey]);

  const view = useMemo(() => {
    const personalDomains = new Set(
      entities
        .filter((entity) => entity.kind === 'personal')
        .flatMap((entity) => entity.domains.map((domain) => domain.id)),
    );
    const listed = openItems.filter(
      (item) => item.kind === 'missing_item' && item.run_id === null,
    );
    const isPersonal = (item: Item): boolean =>
      item.domain_id !== null && personalDomains.has(item.domain_id);

    const runs = openItems
      .filter((item) => item.kind === 'shopping_run')
      .map((run) => ({
        run,
        items: [...openItems, ...bought].filter((item) => item.run_id === run.id),
      }));

    const targets: ShoppingTarget[] = [];
    const entityNames = new Map<string, string>();
    for (const entity of entities) {
      const shoppingDomain = entity.domains.find((domain) => domain.role === 'shopping');
      if (shoppingDomain !== undefined) {
        targets.push({ entity, domainId: shoppingDomain.id });
        if (entity.kind !== 'home') {
          entityNames.set(shoppingDomain.id, entity.name);
        }
      }
    }
    // The home comes first: it is where most missing items belong.
    targets.sort((a, b) => Number(b.entity.kind === 'home') - Number(a.entity.kind === 'home'));

    return {
      shared: byCategory(listed.filter((item) => !isPersonal(item))),
      personal: byCategory(listed.filter(isPersonal)),
      runs,
      targets,
      entityNames,
    };
  }, [openItems, bought, entities]);

  const addMissingItem = useCallback(
    async (newItem: NewMissingItem): Promise<boolean> => {
      try {
        await createMissingItem(newItem);
        reload();
        setError(null);
        return true;
      } catch (caught: unknown) {
        setError(toMessage(caught));
        return false;
      }
    },
    [reload],
  );

  const startRun = useCallback(
    (category: ShoppingCategory, isPrivate: boolean): void => {
      createShoppingRun(category, isPrivate)
        .then((runId) => {
          reload();
          setError(null);
          void navigate(`/shopping/run/${runId}`);
        })
        .catch((caught: unknown) => {
          setError(toMessage(caught));
        });
    },
    [reload, navigate],
  );

  const toggleBought = useCallback(
    (item: Item): void => {
      if (item.status === 'open') {
        completeItem(item);
      } else {
        reopenItem(item.id);
      }
    },
    [completeItem, reopenItem],
  );

  return { ...view, error, addMissingItem, toggleBought, startRun };
}
