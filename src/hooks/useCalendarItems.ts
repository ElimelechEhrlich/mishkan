import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { toMessage } from '../lib/errors';
import { listCalendarItemIds, setInCalendar } from '../services/calendarService';

/**
 * What the parent put in their Google Calendar, loaded once and shared by every screen: each
 * row that shows an item asks it, so it is not loaded again for every row.
 */
let picked: ReadonlySet<string> = new Set();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: ReadonlySet<string>): void {
  picked = next;
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  loading ??= listCalendarItemIds()
    .then((ids) => {
      publish(new Set(ids));
    })
    .catch(() => {
      // Without the list, nothing shows as in the calendar; the next screen tries again.
      loading = null;
    });
  return (): void => {
    listeners.delete(listener);
  };
}

function snapshot(): ReadonlySet<string> {
  return picked;
}

/** Whether an item is in the parent's Google Calendar. */
export function useInCalendar(itemId: string): boolean {
  return useSyncExternalStore(subscribe, snapshot).has(itemId);
}

export type UseCalendarToggle = {
  readonly on: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly set: (on: boolean) => void;
};

/** Puts one item in the Google Calendar or takes it out; every row shows it at once. */
export function useCalendarToggle(itemId: string): UseCalendarToggle {
  const on = useInCalendar(itemId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [itemId]);

  const set = useCallback(
    (next: boolean): void => {
      const before = picked;
      const after = new Set(picked);
      if (next) {
        after.add(itemId);
      } else {
        after.delete(itemId);
      }
      publish(after);
      setBusy(true);
      setError(null);
      setInCalendar(itemId, next)
        .catch((caught: unknown) => {
          publish(before);
          setError(toMessage(caught));
        })
        .finally(() => {
          setBusy(false);
        });
    },
    [itemId],
  );

  return { on, busy, error, set };
}
