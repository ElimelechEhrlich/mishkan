import { useEffect, useRef, useState } from 'react';
import { toMessage } from '../lib/errors';
import { todayIso } from '../lib/itemRules';
import { occasionSeries } from '../lib/occasions';
import { syncOccasion } from '../services/profileService';
import type { EntityWithDomains } from '../types/domain';

/**
 * Keeps each Hebrew birthday and the Hebrew wedding anniversary as an item that repeats every
 * Hebrew year, a week before the date.
 * Runs whenever the dates change, then calls `onSynced` so the new reminders show.
 * Returns the error of the last run, if any.
 */
export function useOccasionReminders(
  entities: readonly EntityWithDomains[],
  onSynced: () => void,
): string | null {
  const [error, setError] = useState<string | null>(null);
  const lastRun = useRef('');

  useEffect(() => {
    const reminders = occasionSeries(entities, todayIso());
    const signature = reminders
      .map((series) => `${series.prefix}|${series.title}|${series.dates.join(',')}`)
      .join('\n');
    if (reminders.length === 0 || signature === lastRun.current) {
      return;
    }
    lastRun.current = signature;
    void (async (): Promise<void> => {
      try {
        await Promise.all(reminders.map((series) => syncOccasion(series)));
        setError(null);
        onSynced();
      } catch (caught: unknown) {
        setError(toMessage(caught));
      }
    })();
  }, [entities, onSynced]);

  return error;
}
