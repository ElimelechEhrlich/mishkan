import { useEffect, useMemo, useState } from 'react';
import { todayIso } from '../lib/itemRules';
import type { Agenda, Timeline } from '../lib/itemRules';
import type { Lookups } from '../lib/lookups';
import { dayPartOf, nextUp, waitingOnYou, weekAhead } from '../lib/todayBrief';
import type { DayPart, NextUp, WaitingOnYou, WeekDay } from '../lib/todayBrief';
import type { Item } from '../types/domain';

export type TodayBrief = {
  readonly waiting: WaitingOnYou;
  readonly week: readonly WeekDay[];
  /** The part of the day, for the greeting. */
  readonly dayPart: DayPart;
  /** The next thing with an hour today. */
  readonly next: NextUp | null;
};

/** How often the page looks at the clock again, for the greeting and the next thing. */
const tickMs = 60_000;

/**
 * Around today's list: the greeting and the next thing (looked at again every minute), what
 * waits on the parents, and the coming week in short.
 */
export function useTodayBrief(
  items: readonly Item[],
  steps: readonly Item[],
  lookups: Lookups,
  timeline: Timeline,
  agenda: Agenda,
): TodayBrief {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, tickMs);
    return (): void => {
      window.clearInterval(timer);
    };
  }, []);

  const waiting = useMemo(
    () => waitingOnYou(items, steps, lookups.repeats, lookups.occurrenceCounts),
    [items, steps, lookups.repeats, lookups.occurrenceCounts],
  );
  const week = useMemo(() => weekAhead(timeline, todayIso()), [timeline]);
  const next = useMemo(() => nextUp(agenda, now), [agenda, now]);
  return { waiting, week, dayPart: dayPartOf(now.getHours()), next };
}
