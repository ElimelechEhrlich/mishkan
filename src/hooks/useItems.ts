import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasRowLists, readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import {
  completeItem,
  convertItem,
  createItem,
  createQuestion,
  deleteItem,
  listOpenItems,
  listSteps,
  reopenItem,
  subscribeToItems,
  updateItem,
} from '../services/itemService';
import { createDebt } from '../services/debtService';
import { createMissingItem } from '../services/shoppingService';
import type {
  Conversion,
  Item,
  ItemUpdate,
  NewDebt,
  NewItem,
  NewMissingItem,
} from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

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
  /** Open items still missing a domain or a time, that the current parent has to complete. */
  readonly incomplete: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
  readonly addItem: (newItem: NewItem) => Promise<boolean>;
  readonly addMissingItem: (newItem: NewMissingItem) => Promise<boolean>;
  readonly addDebt: (newDebt: NewDebt) => Promise<boolean>;
  readonly addQuestion: (issueId: string, title: string) => void;
  readonly updateItem: (itemId: string, changes: ItemUpdate) => void;
  readonly convertItem: (itemId: string, conversion: Conversion) => Promise<boolean>;
  readonly completeItem: (item: Item) => void;
  readonly reopenItem: (itemId: string) => void;
  readonly deleteItem: (itemId: string) => Promise<boolean>;
};

function isItemsSnapshot(
  value: unknown,
): value is { readonly items: Item[]; readonly steps: Item[] } {
  return hasRowLists(value, ['items', 'steps']);
}

export function useItems(): UseItems {
  const { member } = useHouseholdContext();
  const cacheKey = `items.${member.id}`;
  // What was loaded last time shows at once; the fresh copy replaces it when it arrives.
  const [state, setState] = useState<ItemsState>(() => {
    const cached = readCache(cacheKey, isItemsSnapshot);
    return cached === null
      ? { items: [], steps: [], loading: true, error: null }
      : { ...cached, loading: false, error: null };
  });

  const load = useCallback(async (): Promise<void> => {
    try {
      const [items, steps] = await Promise.all([listOpenItems(), listSteps()]);
      setState({ items, steps, loading: false, error: null });
      writeCache(cacheKey, { items, steps });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, [cacheKey]);

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

  const handleAddMissing = useCallback(
    (newItem: NewMissingItem): Promise<boolean> => run(() => createMissingItem(newItem)),
    [run],
  );

  const handleAddDebt = useCallback(
    (newDebt: NewDebt): Promise<boolean> => run(() => createDebt(newDebt)),
    [run],
  );

  const handleAddQuestion = useCallback(
    (issueId: string, title: string): void => {
      void run(() => createQuestion(issueId, title));
    },
    [run],
  );

  const handleConvert = useCallback(
    (itemId: string, conversion: Conversion): Promise<boolean> =>
      run(() => convertItem(itemId, conversion)),
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
  const incomplete = useMemo(
    () => state.items.filter((item) => !item.is_complete && item.review_by === member.id),
    [state.items, member.id],
  );

  return {
    items: state.items,
    steps: state.steps,
    assigned,
    incomplete,
    loading: state.loading,
    error: state.error,
    reload,
    addItem: handleAdd,
    addMissingItem: handleAddMissing,
    addDebt: handleAddDebt,
    addQuestion: handleAddQuestion,
    updateItem: handleUpdate,
    convertItem: handleConvert,
    completeItem: handleComplete,
    reopenItem: handleReopen,
    deleteItem: handleDelete,
  };
}
