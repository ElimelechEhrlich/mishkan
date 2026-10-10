import { useCallback, useEffect, useMemo, useState } from 'react';
import { toMessage } from '../lib/errors';
import {
  completeItem,
  createItem,
  deleteItem,
  listOpenItems,
  listSteps,
  reopenItem,
  subscribeToItems,
  updateItem,
} from '../services/itemService';
import type { Item, ItemUpdate, NewItem } from '../types/domain';

type ItemsState = {
  readonly items: readonly Item[];
  readonly steps: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseItems = {
  /** Every open item the parent can see. */
  readonly items: readonly Item[];
  /** Every step of a goal or an issue, done ones included. */
  readonly steps: readonly Item[];
  /** Open items that are fully assigned. */
  readonly assigned: readonly Item[];
  /** Open items still missing a domain, a member or a time. */
  readonly incomplete: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
  readonly addItem: (newItem: NewItem) => Promise<boolean>;
  readonly updateItem: (itemId: string, changes: ItemUpdate) => void;
  readonly completeItem: (item: Item) => void;
  readonly reopenItem: (itemId: string) => void;
  readonly deleteItem: (itemId: string) => Promise<boolean>;
};

const initialState: ItemsState = { items: [], steps: [], loading: true, error: null };

export function useItems(): UseItems {
  const [state, setState] = useState<ItemsState>(initialState);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [items, steps] = await Promise.all([listOpenItems(), listSteps()]);
      setState({ items, steps, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, []);

  const reload = useCallback((): void => {
    void load();
  }, [load]);

  useEffect(() => {
    void load();
    return subscribeToItems(() => {
      void load();
    });
  }, [load]);

  /** Runs a change, then reloads. A failure is reported in `error`, never swallowed. */
  const run = useCallback(
    async (change: () => Promise<void>): Promise<boolean> => {
      try {
        await change();
        await load();
        return true;
      } catch (error: unknown) {
        setState((previous) => ({ ...previous, error: toMessage(error) }));
        return false;
      }
    },
    [load],
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
    (item: Item): void => {
      void run(() => completeItem(item));
    },
    [run],
  );

  const handleReopen = useCallback(
    (itemId: string): void => {
      void run(() => reopenItem(itemId));
    },
    [run],
  );

  const handleDelete = useCallback(
    (itemId: string): Promise<boolean> => run(() => deleteItem(itemId)),
    [run],
  );

  const assigned = useMemo(() => state.items.filter((item) => item.is_complete), [state.items]);
  const incomplete = useMemo(() => state.items.filter((item) => !item.is_complete), [state.items]);

  return {
    items: state.items,
    steps: state.steps,
    assigned,
    incomplete,
    loading: state.loading,
    error: state.error,
    reload,
    addItem: handleAdd,
    updateItem: handleUpdate,
    completeItem: handleComplete,
    reopenItem: handleReopen,
    deleteItem: handleDelete,
  };
}
