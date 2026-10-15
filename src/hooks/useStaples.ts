import { useCallback, useEffect, useState } from 'react';
import { titleKey } from '../lib/departments';
import { toMessage } from '../lib/errors';
import { onItemsChanged } from '../lib/itemChanges';
import { deleteStaple, listStaples, renameStaple } from '../services/stapleService';
import type { ShoppingStaple } from '../types/domain';

export type UseStaples = {
  /** The fixed shopping list, the most added first. */
  readonly staples: readonly ShoppingStaple[];
  readonly loaded: boolean;
  readonly rename: (stapleId: string, title: string) => void;
  readonly remove: (stapleId: string) => void;
  readonly error: string | null;
};

/** The fixed shopping list; it grows by itself as items are added, so it reloads with them. */
export function useStaples(): UseStaples {
  const [staples, setStaples] = useState<readonly ShoppingStaple[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setStaples(await listStaples());
      setError(null);
    } catch (caught: unknown) {
      setError(toMessage(caught));
    }
  }, []);

  useEffect(() => {
    void load();
    return onItemsChanged(() => {
      void load();
    });
  }, [load]);

  const run = useCallback(
    (change: () => Promise<void>): void => {
      change()
        .then(() => load())
        .catch((caught: unknown) => {
          setError(toMessage(caught));
        });
    },
    [load],
  );

  return {
    staples: staples ?? [],
    loaded: staples !== null,
    rename: (stapleId, title): void => {
      run(() => renameStaple(stapleId, title, titleKey(title)));
    },
    remove: (stapleId): void => {
      setStaples((current) => current?.filter((staple) => staple.id !== stapleId) ?? null);
      run(() => deleteStaple(stapleId));
    },
    error,
  };
}
