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
  /** Open goals and issues. */
  readonly goals: readonly Item[];
  /** Open appointments that are fully assigned. */
  readonly appointments: readonly Item[];
  /** Open notes. */
  readonly notes: readonly Item[];
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
    const domainIds =
      scope === undefined ? null : new Set(scope.domains.map((domain) => domain.id));
    const inScope = (item: Item): boolean =>
      domainIds === null || (item.domain_id !== null && domainIds.has(item.domain_id));
    const scopedItems = items.items.filter(inScope);
    return {
      scope,
      items: scopedItems,
      assigned: items.assigned.filter(inScope),
      incomplete: items.incomplete.filter(inScope),
      steps: items.steps.filter(inScope),
      goals: scopedItems.filter((item) => item.kind === 'goal' || item.kind === 'issue'),
      notes: scopedItems.filter((item) => item.kind === 'note'),
      appointments: items.assigned.filter((item) => inScope(item) && item.kind === 'appointment'),
      inScope,
    };
  }, [scope, items.items, items.assigned, items.incomplete, items.steps]);
}
