import { useEffect, useRef, useState } from 'react';
import { toMessage } from '../lib/errors';
import { todayIso } from '../lib/itemRules';
import { occasionReminders } from '../lib/occasions';
import { syncAutoReminder } from '../services/profileService';
import type { EntityWithDomains } from '../types/domain';

/**
 * Keeps a reminder a week before each Hebrew birthday and the Hebrew wedding anniversary.
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
    const reminders = occasionReminders(entities, todayIso());
    const signature = reminders.map((reminder) => `${reminder.key}|${reminder.title}`).join('\n');
    if (reminders.length === 0 || signature === lastRun.current) {
      return;
    }
    lastRun.current = signature;
    void (async (): Promise<void> => {
      try {
        await Promise.all(reminders.map((reminder) => syncAutoReminder(reminder)));
        setError(null);
        onSynced();
      } catch (caught: unknown) {
        setError(toMessage(caught));
      }
    })();
  }, [entities, onSynced]);

  return error;
}
