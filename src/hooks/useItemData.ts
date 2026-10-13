import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasRowLists, readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { announceItemsChanged, onItemsChanged } from '../lib/itemChanges';
import {
  addItemData,
  deleteItemData,
  listItemData,
  swapItemData,
  updateItemData,
} from '../services/itemDataService';
import type { ItemData } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

export type UseItemData = {
  /** The named values of every item the parent can see, by item id, in the order added. */
  readonly byItem: ReadonlyMap<string, readonly ItemData[]>;
  readonly add: (itemId: string, label: string | null, value: string) => void;
  readonly update: (dataId: string, changes: { label?: string | null; value?: string }) => void;
  readonly remove: (dataId: string) => void;
  /** Moves a row one place up (-1) or down (1) among its item's rows. */
  readonly move: (row: ItemData, step: -1 | 1) => void;
  readonly error: string | null;
};

function isDataSnapshot(value: unknown): value is { readonly rows: ItemData[] } {
  return hasRowLists(value, ['rows']);
}

/** The named values kept on items ("נתונים"), loaded once and kept in step with changes. */
export function useItemData(): UseItemData {
  const { member } = useHouseholdContext();
  const cacheKey = `itemData.${member.id}`;
  const [rows, setRows] = useState<readonly ItemData[]>(
    () => readCache(cacheKey, isDataSnapshot)?.rows ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const fresh = await listItemData();
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

  /** Runs a change, then has every list in the app, this one among them, reload. */
  const run = useCallback((change: () => Promise<void>): void => {
    change()
      .then(() => {
        announceItemsChanged();
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      });
  }, []);

  const byItem = useMemo(() => {
    const map = new Map<string, ItemData[]>();
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
    add: (itemId, label, value): void => {
      run(() => addItemData(itemId, label, value));
    },
    update: (dataId, changes): void => {
      run(() => updateItemData(dataId, changes));
    },
    remove: (dataId): void => {
      run(() => deleteItemData(dataId));
    },
    move: (row, step): void => {
      const siblings = byItem.get(row.item_id) ?? [];
      const other = siblings[siblings.findIndex((candidate) => candidate.id === row.id) + step];
      if (other !== undefined) {
        run(() => swapItemData(row, other));
      }
    },
    error,
  };
}
