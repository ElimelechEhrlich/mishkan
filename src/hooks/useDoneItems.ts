import { useCallback, useEffect, useState } from 'react';
import { hasRowLists, readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { byDoneTime } from '../lib/itemRules';
import { listDoneItems, listRecurringDone, reopenItem } from '../services/itemService';
import type { Item, ItemKind } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

/** How many are shown at first, and how many more each "load more" brings. */
const doneStep = 100;

type DoneLists = {
  /** Items closed for good. */
  readonly closed: readonly Item[];
  /** Each time a recurring task (which stays open) was done. */
  readonly repeated: readonly Item[];
};

type DoneState = DoneLists & {
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseDoneItems = {
  readonly items: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
  /** Whether older ones are left to show. */
  readonly hasMore: boolean;
  readonly loadMore: () => void;
  readonly reopen: (itemId: string) => void;
};

function isDoneLists(value: unknown): value is DoneLists {
  return hasRowLists(value, ['closed', 'repeated']);
}

/**
 * The most recently closed items, only of one kind when `kind` is given, and a way to bring
 * one back. What was shown last time appears at once; the closed items and the times a
 * recurring task was done are fetched side by side, each shown as soon as it arrives.
 */
export function useDoneItems(kind: ItemKind | null = null): UseDoneItems {
  const { member } = useHouseholdContext();
  const cacheKey = `done.${member.id}.${kind ?? 'all'}`;
  const withRepeats = kind === null || kind === 'task';
  const [limit, setLimit] = useState(doneStep);
  const [state, setState] = useState<DoneState>(() => {
    const cached = readCache(cacheKey, isDoneLists);
    return cached === null
      ? { closed: [], repeated: [], loading: true, error: null }
      : { ...cached, loading: false, error: null };
  });

  const load = useCallback((): void => {
    const fail = (error: unknown): void => {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    };
    const save = (next: DoneState): DoneState => {
      if (limit === doneStep) {
        writeCache(cacheKey, { closed: next.closed, repeated: next.repeated });
      }
      return next;
    };
    // One more than shown is asked for, to know for sure whether there is more.
    listDoneItems(limit + 1, kind)
      .then((closed) => {
        setState((previous) => save({ ...previous, closed, loading: false, error: null }));
      })
      .catch(fail);
    if (withRepeats) {
      listRecurringDone({ limit: limit + 1 })
        .then((repeated) => {
          setState((previous) => save({ ...previous, repeated }));
        })
        .catch(fail);
    }
  }, [cacheKey, kind, limit, withRepeats]);

  useEffect(() => {
    load();
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

  const loadMore = useCallback((): void => {
    setLimit((current) => current + doneStep);
  }, []);

  const all = byDoneTime([...state.closed, ...state.repeated]);
  return {
    items: all.slice(0, limit),
    loading: state.loading,
    error: state.error,
    // Only when something older is really left to show.
    hasMore: all.length > limit,
    loadMore,
    reopen,
  };
}
