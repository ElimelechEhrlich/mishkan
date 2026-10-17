import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasRowLists, readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { announceItemsChanged, onItemsChanged } from '../lib/itemChanges';
import {
  addTrackerEntry,
  deleteTrackerEntry,
  listTrackerEntries,
  updateTrackerEntry,
} from '../services/trackerService';
import type { TrackerEntry } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

export type EntryChanges = { on_date?: string; value?: string; note?: string | null };

export type UseTrackerEntries = {
  /** The entries of every tracker the parent can see, by tracker id. */
  readonly byItem: ReadonlyMap<string, readonly TrackerEntry[]>;
  readonly add: (itemId: string, onDate: string, value: string, note: string | null) => void;
  readonly update: (entryId: string, changes: EntryChanges) => void;
  readonly remove: (entryId: string) => void;
  readonly error: string | null;
};

function isEntriesSnapshot(value: unknown): value is { readonly rows: TrackerEntry[] } {
  return hasRowLists(value, ['rows']);
}

/** The entries of trackers ("מעקב"), loaded once and kept in step with changes. */
export function useTrackerEntries(): UseTrackerEntries {
  const { member } = useHouseholdContext();
  const cacheKey = `trackerEntries.${member.id}`;
  const [rows, setRows] = useState<readonly TrackerEntry[]>(
    () => readCache(cacheKey, isEntriesSnapshot)?.rows ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const fresh = await listTrackerEntries();
      setRows(fresh);
      setError(null);
      writeCache(cacheKey, { rows: fresh });
    } catch (caught: unknown) {
      setError(toMessage(caught));
    }
  }, [cacheKey]);

  useEffect(() => {
    void load();
    return onItemsChanged(() => {
      void load();
    });
  }, [load]);

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
    const map = new Map<string, TrackerEntry[]>();
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

  return {
    byItem,
    add: (itemId, onDate, value, note): void => {
      run(() => addTrackerEntry({ itemId, onDate, value, note }));
    },
    // Shown at once; the save follows.
    update: (entryId, changes): void => {
      setRows((current) =>
        current.map((row) => (row.id === entryId ? { ...row, ...changes } : row)),
      );
      run(() => updateTrackerEntry(entryId, changes));
    },
    remove: (entryId): void => {
      setRows((current) => current.filter((row) => row.id !== entryId));
      run(() => deleteTrackerEntry(entryId));
    },
    error,
  };
}
