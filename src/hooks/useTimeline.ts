import { useMemo } from 'react';
import { timelineOf, todayIso } from '../lib/itemRules';
import type { Timeline } from '../lib/itemRules';
import type { Item } from '../types/domain';

/** Everything that runs on time across the whole home, from what is late to the shelf. */
export function useTimeline(assigned: readonly Item[], steps: readonly Item[]): Timeline {
  return useMemo(() => timelineOf(assigned, steps, todayIso()), [assigned, steps]);
}
