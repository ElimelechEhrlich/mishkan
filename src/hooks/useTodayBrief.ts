import { useMemo } from 'react';
import { todayIso } from '../lib/itemRules';
import type { Timeline } from '../lib/itemRules';
import type { Lookups } from '../lib/lookups';
import { waitingOnYou, weekAhead } from '../lib/todayBrief';
import type { WaitingOnYou, WeekDay } from '../lib/todayBrief';
import type { Item } from '../types/domain';

export type TodayBrief = {
  readonly waiting: WaitingOnYou;
  readonly week: readonly WeekDay[];
};

/** Around today's list: what waits on the parents, and the coming week in short. */
export function useTodayBrief(
  items: readonly Item[],
  steps: readonly Item[],
  lookups: Lookups,
  timeline: Timeline,
): TodayBrief {
  const waiting = useMemo(
    () => waitingOnYou(items, steps, lookups.repeats, lookups.occurrenceCounts),
    [items, steps, lookups.repeats, lookups.occurrenceCounts],
  );
  const week = useMemo(() => weekAhead(timeline, todayIso()), [timeline]);
  return { waiting, week };
}
