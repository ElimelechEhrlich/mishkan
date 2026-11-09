import { useCallback, useEffect, useState } from 'react';
import { titleKey } from '../lib/departments';
import { readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { onItemsChanged } from '../lib/itemChanges';
import {
  deleteStaple,
  findSameProducts,
  listApart,
  listMerges,
  listStapleDetails,
  listStaples,
  markApart,
  mergeStaples,
  renameStaple,
  unmergeStaple,
} from '../services/stapleService';
import type { SameProduct, SmartCheckStep } from '../services/stapleService';
import type { ShoppingStaple, StapleDetail, StapleMerge } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

export type { SmartCheckStep };

/** What the page shows at once, kept on the device: the lists as loaded last time. */
type Snapshot = {
  readonly staples: ShoppingStaple[];
  readonly apart: string[];
  readonly merges: StapleMerge[];
  /** The details by name key, as pairs (a map does not keep in storage). */
  readonly details: [string, StapleDetail[]][];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSnapshot(value: unknown): value is Snapshot {
  return (
    isObject(value) &&
    Array.isArray(value['staples']) &&
    value['staples'].every((row: unknown) => isObject(row) && typeof row['id'] === 'string') &&
    Array.isArray(value['apart']) &&
    value['apart'].every((key: unknown) => typeof key === 'string') &&
    Array.isArray(value['merges']) &&
    value['merges'].every((row: unknown) => isObject(row) && typeof row['id'] === 'string') &&
    Array.isArray(value['details']) &&
    value['details'].every(
      (pair: unknown) =>
        Array.isArray(pair) &&
        typeof pair[0] === 'string' &&
        Array.isArray(pair[1]) &&
        pair[1].every((row: unknown) => isObject(row) && typeof row['details'] === 'string'),
    )
  );
}

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
  /** The details used for each name (by `titleKey`), the most used first. */
  readonly details: ReadonlyMap<string, readonly StapleDetail[]>;
  /** What was merged, the latest first. */
  readonly merges: readonly StapleMerge[];
  /** Undoes a merge: the name comes back with its count. */
  readonly unmerge: (mergeId: string) => void;
  /** The smart check's answer: groups of names that are one product; null before it ran. */
  readonly sameProducts: readonly SameProduct[] | null;
  readonly checking: boolean;
  /** What the smart check did so far, as it said it, step by step. */
  readonly steps: readonly SmartCheckStep[];
  /** Asks the assistant which names are one product in other words. */
  readonly checkSameProducts: () => void;
  /** Two names are not the same product. */
  readonly markApart: (pairKey: string) => void;
  readonly error: string | null;
};

/** The fixed shopping list; it grows by itself as items are added, so it reloads with them. */
export function useStaples(): UseStaples {
  const { member } = useHouseholdContext();
  const cacheKey = `staples.${member.household_id}`;
  // What was loaded last time shows at once; the fresh lists replace it when they arrive.
  const [cached] = useState(() => readCache(cacheKey, isSnapshot));
  const [staples, setStaples] = useState<readonly ShoppingStaple[] | null>(cached?.staples ?? null);
  const [apart, setApart] = useState<ReadonlySet<string>>(new Set(cached?.apart ?? []));
  const [merges, setMerges] = useState<readonly StapleMerge[]>(cached?.merges ?? []);
  const [details, setDetails] = useState<ReadonlyMap<string, readonly StapleDetail[]>>(
    new Map(cached?.details ?? []),
  );
  const [sameProducts, setSameProducts] = useState<readonly SameProduct[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [steps, setSteps] = useState<readonly SmartCheckStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [loaded, marked, merged, used] = await Promise.all([
        listStaples(),
        listApart(),
        listMerges(),
        listStapleDetails(),
      ]);
      setStaples(loaded);
      setDetails(used);
      setApart(marked);
      setMerges(merged);
      setError(null);
      writeCache(cacheKey, {
        staples: loaded,
        apart: [...marked],
        merges: merged,
        details: [...used],
      });
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
    details,
    merges,
    unmerge: (mergeId): void => {
      setMerges((current) => current.filter((merge) => merge.id !== mergeId));
      run(() => unmergeStaple(mergeId));
    },
    sameProducts,
    checking,
    steps,
    checkSameProducts: (): void => {
      setChecking(true);
      setError(null);
      setSteps([]);
      findSameProducts((step) => {
        setSteps((current) => [...current, step]);
      })
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
