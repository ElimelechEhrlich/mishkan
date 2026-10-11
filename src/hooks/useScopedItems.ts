import { useMemo } from 'react';
import type { EntityWithDomains, Item } from '../types/domain';
import type { UseItems } from './useItems';
import { useHouseholdContext } from './useRouteContext';

export type ScopedItems = {
  /** The chosen entity, or undefined when everything is shown. */
  readonly scope: EntityWithDomains | undefined;
  readonly items: readonly Item[];
  readonly assigned: readonly Item[];
  readonly incomplete: readonly Item[];
  readonly steps: readonly Item[];
  /** Whether an item belongs to the chosen entity; always true when everything is shown. */
  readonly inScope: (item: Item) => boolean;
};

/** The open items narrowed to the entity chosen for all tabs, or all of them. */
export function useScopedItems(
  items: UseItems,
  entities: readonly EntityWithDomains[],
): ScopedItems {
  const { scopeId } = useHouseholdContext();
  const scope = entities.find((entity) => entity.id === scopeId);

  return useMemo(() => {
    if (scope === undefined) {
      return {
        scope,
        items: items.items,
        assigned: items.assigned,
        incomplete: items.incomplete,
        steps: items.steps,
        inScope: (): boolean => true,
      };
    }
    const domainIds = new Set(scope.domains.map((domain) => domain.id));
    const inScope = (item: Item): boolean =>
      item.domain_id !== null && domainIds.has(item.domain_id);
    return {
      scope,
      items: items.items.filter(inScope),
      assigned: items.assigned.filter(inScope),
      incomplete: items.incomplete.filter(inScope),
      steps: items.steps.filter(inScope),
      inScope,
    };
  }, [scope, items.items, items.assigned, items.incomplete, items.steps]);
}
