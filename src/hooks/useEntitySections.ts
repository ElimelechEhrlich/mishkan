import { useMemo } from 'react';
import { isInRun, toListEntries, withoutNestedSteps } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Domain, EntityWithDomains, Item } from '../types/domain';

export type DomainSection = {
  readonly domain: Domain;
  readonly entries: readonly ListEntry[];
};

/**
 * Each domain of an entity with its open items, empty ones included so they can be added to.
 * With a topic chosen, only the domain of that name.
 */
export function useEntitySections(
  entity: EntityWithDomains | undefined,
  items: readonly Item[],
  steps: readonly Item[],
  topic: string | null,
): readonly DomainSection[] {
  return useMemo(() => {
    if (entity === undefined) {
      return [];
    }
    const rows = withoutNestedSteps(items).filter(
      (item) => item.kind !== 'question' && !isInRun(item),
    );
    return entity.domains
      .filter((domain) => topic === null || domain.name.trim() === topic)
      .map((domain) => ({
        domain,
        entries: toListEntries(
          rows.filter((item) => item.domain_id === domain.id),
          steps,
          items,
        ),
      }));
  }, [entity, items, steps, topic]);
}
