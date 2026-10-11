import { useMemo } from 'react';
import { withoutNestedSteps } from '../lib/itemRules';
import { countByEntity } from '../lib/lookups';
import type { Item } from '../types/domain';

export type EntityCounts = {
  /** Open rows per entity id. */
  readonly counts: ReadonlyMap<string, number>;
  /** Open rows of every entity together. */
  readonly total: number;
};

/** How many open rows each entity holds, for the entity chips. */
export function useEntityCounts(
  items: readonly Item[],
  domainEntities: ReadonlyMap<string, string>,
): EntityCounts {
  return useMemo(() => {
    const counts = countByEntity(withoutNestedSteps(items), domainEntities);
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    return { counts, total };
  }, [items, domainEntities]);
}
