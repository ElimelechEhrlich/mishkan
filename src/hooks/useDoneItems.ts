import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listDoneItems, reopenItem } from '../services/itemService';
import type { Item, ItemKind } from '../types/domain';

const doneLimit = 100;

type DoneState = {
  readonly items: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseDoneItems = DoneState & {
  readonly reopen: (itemId: string) => void;
};

/** The most recently closed items, only of one kind when `kind` is given, and a way to bring one back. */
export function useDoneItems(kind: ItemKind | null = null): UseDoneItems {
  const [state, setState] = useState<DoneState>({ items: [], loading: true, error: null });

  const load = useCallback(async (): Promise<void> => {
    try {
      const items = await listDoneItems(doneLimit, kind);
      setState({ items, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const reopen = useCallback(
    (itemId: string): void => {
      reopenItem(itemId)
        .then(load)
        .catch((error: unknown) => {
          setState((previous) => ({ ...previous, error: toMessage(error) }));
        });
    },
    [load],
  );

  return { ...state, reopen };
}
