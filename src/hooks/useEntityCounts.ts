import { useMemo } from 'react';
import { withoutNestedSteps } from '../lib/itemRules';
import { countByEntity } from '../lib/lookups';
import type { Item } from '../types/domain';

/** How many open rows each entity holds, for the entity cards. */
export function useEntityCounts(
  items: readonly Item[],
  domainEntities: ReadonlyMap<string, string>,
): ReadonlyMap<string, number> {
  return useMemo(
    () => countByEntity(withoutNestedSteps(items), domainEntities),
    [items, domainEntities],
  );
}
