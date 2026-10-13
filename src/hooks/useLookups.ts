import { useMemo } from 'react';
import { buildLookups } from '../lib/lookups';
import type { Lookups } from '../lib/lookups';
import type { EntityWithDomains, Member } from '../types/domain';
import { useItemData } from './useItemData';
import { useTrackerEntries } from './useTrackerEntries';

export function useLookups(
  entities: readonly EntityWithDomains[],
  members: readonly Member[],
): Lookups {
  const data = useItemData();
  const entries = useTrackerEntries();
  return useMemo(
    () => buildLookups(entities, members, data.byItem, entries.byItem),
    [entities, members, data.byItem, entries.byItem],
  );
}
