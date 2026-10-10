import { useMemo } from 'react';
import { buildLookups } from '../lib/lookups';
import type { Lookups } from '../lib/lookups';
import type { AreaWithDomains, Member } from '../types/domain';

export function useLookups(
  areas: readonly AreaWithDomains[],
  members: readonly Member[],
): Lookups {
  return useMemo(() => buildLookups(areas, members), [areas, members]);
}
