import { useCallback, useEffect, useState } from 'react';
import { titleKey } from '../lib/departments';
import { toMessage } from '../lib/errors';
import { onItemsChanged } from '../lib/itemChanges';
import {
  deleteStaple,
  findSameProducts,
  listApart,
  listMerges,
  listStaples,
  markApart,
  mergeStaples,
  renameStaple,
  unmergeStaple,
} from '../services/stapleService';
import type { ShoppingStaple, StapleMerge } from '../types/domain';

export type UseStaples = {
  /** The fixed shopping list, the most added first. */
  readonly staples: readonly ShoppingStaple[];
  readonly loaded: boolean;
  readonly rename: (stapleId: string, title: string) => void;
  readonly remove: (stapleId: string) => void;
  /** The pairs of names marked "not the same product", by `pairKey`. */
  readonly apart: ReadonlySet<string>;
  /** Two names are one product: the kept one stays, with both counts. */
  readonly merge: (keepId: string, dropId: string, how?: 'manual' | 'smart') => void;
  /** What was merged, the latest first. */
  readonly merges: readonly StapleMerge[];
  /** Undoes a merge: the name comes back with its count. */
  readonly unmerge: (mergeId: string) => void;
  /** The smart check's answer: groups of names that are one product; null before it ran. */
  readonly sameProducts: readonly (readonly string[])[] | null;
  readonly checking: boolean;
  /** Asks the assistant which names are one product in other words. */
  readonly checkSameProducts: () => void;
  /** Two names are not the same product. */
  readonly markApart: (pairKey: string) => void;
  readonly error: string | null;
};

/** The fixed shopping list; it grows by itself as items are added, so it reloads with them. */
export function useStaples(): UseStaples {
  const [staples, setStaples] = useState<readonly ShoppingStaple[] | null>(null);
  const [apart, setApart] = useState<ReadonlySet<string>>(new Set());
  const [merges, setMerges] = useState<readonly StapleMerge[]>([]);
  const [sameProducts, setSameProducts] = useState<readonly (readonly string[])[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [loaded, marked, merged] = await Promise.all([
        listStaples(),
        listApart(),
        listMerges(),
      ]);
      setStaples(loaded);
      setApart(marked);
      setMerges(merged);
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
    apart,
    merge: (keepId, dropId, how = 'manual'): void => {
      setStaples((current) => current?.filter((staple) => staple.id !== dropId) ?? null);
      run(() => mergeStaples(keepId, dropId, how));
    },
    merges,
    unmerge: (mergeId): void => {
      setMerges((current) => current.filter((merge) => merge.id !== mergeId));
      run(() => unmergeStaple(mergeId));
    },
    sameProducts,
    checking,
    checkSameProducts: (): void => {
      setChecking(true);
      setError(null);
      findSameProducts()
        .then(setSameProducts)
        .catch((caught: unknown) => {
          setError(toMessage(caught));
        })
        .finally(() => {
          setChecking(false);
        });
    },
    markApart: (pairKey): void => {
      setApart((current) => new Set(current).add(pairKey));
      run(() => markApart(pairKey));
    },
    error,
  };
}
