import { useMemo } from 'react';
import { buildLookups } from '../lib/lookups';
import type { Lookups } from '../lib/lookups';
import type { EntityWithDomains, Member } from '../types/domain';
import { repeatTimes } from '../lib/recurrence';
import { useItemData } from './useItemData';
import { useRepeats } from './useRepeats';
import { useTrackerEntries } from './useTrackerEntries';

export function useLookups(
  entities: readonly EntityWithDomains[],
  members: readonly Member[],
): Lookups {
  const data = useItemData();
  const entries = useTrackerEntries();
  const repeats = useRepeats();
  return useMemo(() => {
    const dayTimes = new Map<string, readonly string[]>();
    for (const [itemId, repeat] of repeats.byItem) {
      const times = repeatTimes(repeat);
      if (times.length > 1) {
        dayTimes.set(itemId, times);
      }
    }
    return buildLookups(
      entities,
      members,
      data.byItem,
      entries.byItem,
      dayTimes,
      repeats.byItem,
      repeats.counts,
    );
  }, [entities, members, data.byItem, entries.byItem, repeats.byItem, repeats.counts]);
}
