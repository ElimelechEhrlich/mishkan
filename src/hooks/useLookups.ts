import { useMemo } from 'react';
import { buildLookups } from '../lib/lookups';
import type { Lookups } from '../lib/lookups';
import type { EntityWithDomains, Member } from '../types/domain';
import { useItemData } from './useItemData';

export function useLookups(
  entities: readonly EntityWithDomains[],
  members: readonly Member[],
): Lookups {
  const data = useItemData();
  return useMemo(
    () => buildLookups(entities, members, data.byItem),
    [entities, members, data.byItem],
  );
}
