import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasRowLists, readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { announceItemsChanged, onItemsChanged } from '../lib/itemChanges';
import { isWaiting } from '../lib/reminders';
import {
  addReminder,
  deleteReminder,
  listReminders,
  updateReminder,
} from '../services/reminderService';
import type { ItemReminder, ReminderDraft } from '../types/domain';
import { labels } from '../constants/labels';
import { useHouseholdContext } from './useRouteContext';
import { offerUndo } from './useUndoOffer';

export type UseItemReminders = {
  /** The reminders of every item the parent can see, by item id, in the order added. */
  readonly byItem: ReadonlyMap<string, readonly ItemReminder[]>;
  /** Items with a reminder that waits for a date or an hour the item does not have now. */
  readonly waitingItemIds: ReadonlySet<string>;
  readonly add: (itemId: string, draft: ReminderDraft) => void;
  readonly update: (reminderId: string, draft: ReminderDraft) => void;
  readonly remove: (reminderId: string) => void;
  readonly error: string | null;
};

function isReminderSnapshot(value: unknown): value is { readonly rows: ItemReminder[] } {
  return hasRowLists(value, ['rows']);
}

/** Items' reminders, loaded once and kept in step with every change in the app. */
export function useItemReminders(): UseItemReminders {
  const { member } = useHouseholdContext();
  const cacheKey = `reminders.${member.id}`;
  const [rows, setRows] = useState<readonly ItemReminder[]>(
    () => readCache(cacheKey, isReminderSnapshot)?.rows ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const fresh = await listReminders();
      setRows(fresh);
      setError(null);
      writeCache(cacheKey, { rows: fresh });
    } catch (caught: unknown) {
      setError(toMessage(caught));
    }
  }, [cacheKey]);

  // A moved date or hour changes when relative reminders ring, so any change reloads them.
  useEffect(() => {
    void load();
    return onItemsChanged(() => {
      void load();
    });
  }, [load]);

  /** Runs a change, then has every list in the app, this one among them, reload. */
  const run = useCallback(
    (change: () => Promise<void>): void => {
      change()
        .then(() => {
          announceItemsChanged();
        })
        .catch((caught: unknown) => {
          setError(toMessage(caught));
          // What was shown at once goes back to what is saved.
          void load();
        });
    },
    [load],
  );

  const byItem = useMemo(() => {
    const map = new Map<string, ItemReminder[]>();
    for (const row of rows) {
      const list = map.get(row.item_id);
      if (list === undefined) {
        map.set(row.item_id, [row]);
      } else {
        list.push(row);
      }
    }
    return map;
  }, [rows]);

  const waitingItemIds = useMemo(
    () => new Set(rows.filter(isWaiting).map((row) => row.item_id)),
    [rows],
  );

  return {
    byItem,
    waitingItemIds,
    // Added at once, with a moment to take it back.
    add: (itemId, draft): void => {
      run(async () => {
        const id = await addReminder(itemId, draft);
        offerUndo(labels.reminders.added, () => {
          run(() => deleteReminder(id));
        });
      });
    },
    update: (reminderId, draft): void => {
      run(() => updateReminder(reminderId, draft));
    },
    remove: (reminderId): void => {
      setRows((current) => current.filter((row) => row.id !== reminderId));
      run(() => deleteReminder(reminderId));
    },
    error,
  };
}
