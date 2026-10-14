import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toMessage } from '../lib/errors';
import { shoppingCategories, todayIso } from '../lib/itemRules';
import { shoppingTargets } from '../lib/lookups';
import { createShoppingRun, listBoughtRunItems } from '../services/shoppingService';
import type {
  EntityWithDomains,
  Item,
  ShoppingCategory,
  ShoppingRun,
  ShoppingTarget,
} from '../types/domain';
import type { UseItems } from './useItems';

export type CategoryGroup = {
  readonly category: ShoppingCategory;
  readonly items: readonly Item[];
};

export type UseShopping = {
  /** Missing items of shared entities that are not in a run, by category. */
  readonly shared: readonly CategoryGroup[];
  /** Missing items of the parent's personal entity that are not in a run, by category. */
  readonly personal: readonly CategoryGroup[];
  readonly runs: readonly ShoppingRun[];
  /** Other items that sit in a shopping domain, so they can be made missing items. */
  readonly misplaced: readonly Item[];
  readonly targets: readonly ShoppingTarget[];
  /** Shopping domain id to the name of its entity, for showing whom an item is for. The home is left out. */
  readonly entityNames: ReadonlyMap<string, string>;
  readonly error: string | null;
  /** Converts an item filed in a shopping domain to a missing item. */
  readonly makeMissing: (item: Item) => void;
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

/**
 * The shopping list, open runs, and the actions on them. Missing items are added with
 * `items.addMissingItem`, and a run is finished with `items.completeItem`.
 */
export function useShopping(
  items: UseItems,
  entities: readonly EntityWithDomains[],
  /** The entity the tabs are narrowed to: only its items and runs that hold them are shown. */
  scope?: EntityWithDomains,
): UseShopping {
  const navigate = useNavigate();
  const [bought, setBought] = useState<readonly Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { reload, completeItem, reopenItem, convertItem } = items;

  const openItems = items.items;
  /** Changes when an item is bought or returned, so bought run items are refetched then. */
  const shoppingKey = openItems
    .filter((item) => item.kind === 'missing_item' || item.kind === 'shopping_run')
    .map((item) => `${item.id}:${item.run_id ?? ''}`)
    .join(',');
  /** The runs still open, whose bought items show their progress. */
  const runKey = openItems
    .filter((item) => item.kind === 'shopping_run')
    .map((item) => item.id)
    .join(',');

  useEffect(() => {
    let active = true;
    listBoughtRunItems(runKey === '' ? [] : runKey.split(','))
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
  }, [shoppingKey, runKey]);

  const view = useMemo(() => {
    const personalDomains = new Set(
      entities
        .filter((entity) => entity.kind === 'personal')
        .flatMap((entity) => entity.domains.map((domain) => domain.id)),
    );
    const scopeDomains =
      scope === undefined ? null : new Set(scope.domains.map((domain) => domain.id));
    const inScope = (item: Item): boolean =>
      scopeDomains === null || (item.domain_id !== null && scopeDomains.has(item.domain_id));
    const shoppingDomains = new Set(
      entities.flatMap((entity) =>
        entity.domains.filter((domain) => domain.role === 'shopping').map((domain) => domain.id),
      ),
    );
    const misplaced = openItems.filter(
      (item) =>
        item.is_complete &&
        item.domain_id !== null &&
        shoppingDomains.has(item.domain_id) &&
        item.parent_id === null &&
        item.kind !== 'missing_item' &&
        item.kind !== 'shopping_run' &&
        inScope(item),
    );
    // A missing item that repeats is on the list from the day of its occurrence.
    const today = todayIso();
    const listed = openItems.filter(
      (item) =>
        item.kind === 'missing_item' &&
        item.run_id === null &&
        inScope(item) &&
        !(item.time_mode === 'recurring' && (item.due_date === null || item.due_date > today)),
    );
    const isPersonal = (item: Item): boolean =>
      item.domain_id !== null && personalDomains.has(item.domain_id);

    const runs = openItems
      .filter((item) => item.kind === 'shopping_run')
      .map((run) => ({
        run,
        items: [...openItems, ...bought].filter((item) => item.run_id === run.id),
      }))
      .filter((run) => scopeDomains === null || run.items.some(inScope));

    // The chosen entity comes first, so new missing items are for it unless changed.
    const targets = shoppingTargets(entities).sort(
      (a, b) => Number(b.entity.id === scope?.id) - Number(a.entity.id === scope?.id),
    );
    const entityNames = new Map(
      targets
        .filter((target) => target.entity.kind !== 'home')
        .map((target) => [target.domainId, target.entity.name]),
    );

    return {
      shared: byCategory(listed.filter((item) => !isPersonal(item))),
      personal: byCategory(listed.filter(isPersonal)),
      runs,
      misplaced,
      targets,
      entityNames,
    };
  }, [openItems, bought, entities, scope]);

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

  const makeMissing = useCallback(
    (item: Item): void => {
      void convertItem(item.id, {
        kind: 'missing_item',
        detachSteps: false,
        category: null,
        debt: null,
      });
    },
    [convertItem],
  );

  return { ...view, error, makeMissing, toggleBought, startRun };
}
