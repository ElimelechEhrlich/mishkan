import { useCallback, useEffect, useMemo, useState } from 'react';
import { toMessage } from '../lib/errors';
import {
  completeItem,
  createItem,
  listOpenItems,
  subscribeToItems,
  updateItem,
} from '../services/itemService';
import type { Item, ItemUpdate, NewItem } from '../types/domain';

type ItemsState = {
  readonly items: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
};

type UseItems = {
  /** Open items that are fully assigned. */
  readonly assigned: readonly Item[];
  /** Open items still missing a domain, a member or a time. */
  readonly incomplete: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly addItem: (newItem: NewItem) => Promise<boolean>;
  readonly updateItem: (itemId: string, changes: ItemUpdate) => void;
  readonly completeItem: (itemId: string) => void;
};

export function useItems(): UseItems {
  const [state, setState] = useState<ItemsState>({ items: [], loading: true, error: null });

  const reload = useCallback(async (): Promise<void> => {
    try {
      const items = await listOpenItems();
      setState({ items, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, []);

  useEffect(() => {
    void reload();
    return subscribeToItems(() => {
      void reload();
    });
  }, [reload]);

  /** Runs a change, then reloads. A failure is reported in `error`, never swallowed. */
  const run = useCallback(
    async (change: () => Promise<void>): Promise<boolean> => {
      try {
        await change();
        await reload();
        return true;
      } catch (error: unknown) {
        setState((previous) => ({ ...previous, error: toMessage(error) }));
        return false;
      }
    },
    [reload],
  );

  const handleAdd = useCallback(
    (newItem: NewItem): Promise<boolean> => run(() => createItem(newItem)),
    [run],
  );

  const handleUpdate = useCallback(
    (itemId: string, changes: ItemUpdate): void => {
      void run(() => updateItem(itemId, changes));
    },
    [run],
  );

  const handleComplete = useCallback(
    (itemId: string): void => {
      void run(() => completeItem(itemId));
    },
    [run],
  );

  const assigned = useMemo(() => state.items.filter((item) => item.is_complete), [state.items]);
  const incomplete = useMemo(() => state.items.filter((item) => !item.is_complete), [state.items]);

  return {
    assigned,
    incomplete,
    loading: state.loading,
    error: state.error,
    addItem: handleAdd,
    updateItem: handleUpdate,
    completeItem: handleComplete,
  };
}
