import { useMemo } from 'react';
import { buildLookups } from '../lib/lookups';
import type { Lookups } from '../lib/lookups';
import type { EntityWithDomains, Member } from '../types/domain';

export function useLookups(
  entities: readonly EntityWithDomains[],
  members: readonly Member[],
): Lookups {
  return useMemo(() => buildLookups(entities, members), [entities, members]);
}
