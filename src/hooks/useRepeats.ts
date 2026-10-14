import { useCallback, useEffect, useMemo, useState } from 'react';
import { labels } from '../constants/labels';
import { hasRowLists, readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { announceItemsChanged, onItemsChanged } from '../lib/itemChanges';
import {
  closeItem,
  listRepeats,
  markOccurrence,
  moveOccurrence,
  resumeRepeat,
  setRepeat,
  stopRepeat,
  unmarkOccurrence,
} from '../services/repeatService';
import type { ItemRepeat, RepeatDraft } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';
import { offerUndo } from './useUndoOffer';

export type UseRepeats = {
  /** How each item repeats, by item id; kept also while another time is chosen. */
  readonly byItem: ReadonlyMap<string, ItemRepeat>;
  readonly set: (itemId: string, draft: RepeatDraft) => void;
  readonly stop: (itemId: string) => void;
  readonly resume: (
    itemId: string,
    end: Pick<RepeatDraft, 'endKind' | 'endCount' | 'endUntil'>,
  ) => void;
  /** Skips the current occurrence, with a moment to take it back. */
  readonly skip: (itemId: string) => void;
  readonly unmark: (occurrenceId: string) => void;
  /** Marks the item itself done, ending its series. */
  readonly close: (itemId: string) => void;
  /** Moves the current occurrence; the rhythm goes on. */
  readonly move: (itemId: string, day: string, time: string | null) => void;
  readonly error: string | null;
};

function isRepeatSnapshot(value: unknown): value is { readonly rows: ItemRepeat[] } {
  return hasRowLists(value, ['rows']);
}

/** How items repeat, and every change to a series or its occurrences. */
export function useRepeats(): UseRepeats {
  const { member } = useHouseholdContext();
  const cacheKey = `repeats.${member.id}`;
  const [rows, setRows] = useState<readonly ItemRepeat[]>(
    () => readCache(cacheKey, isRepeatSnapshot)?.rows ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const fresh = await listRepeats();
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
  const run = useCallback((change: () => Promise<void>): Promise<boolean> => {
    return change()
      .then(() => {
        announceItemsChanged();
        return true;
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
        return false;
      });
  }, []);

  const byItem = useMemo(() => new Map(rows.map((row) => [row.item_id, row])), [rows]);

  return {
    byItem,
    set: (itemId, draft): void => {
      void run(() => setRepeat(itemId, draft));
    },
    stop: (itemId): void => {
      void run(() => stopRepeat(itemId));
    },
    resume: (itemId, end): void => {
      void run(() => resumeRepeat(itemId, end));
    },
    skip: (itemId): void => {
      let occurrenceId: string | null = null;
      void run(async () => {
        occurrenceId = await markOccurrence(itemId, 'skipped');
      }).then((done) => {
        const marked = occurrenceId;
        if (done && marked !== null) {
          offerUndo(labels.occurrence.skippedToast, () => {
            void run(() => unmarkOccurrence(marked));
          });
        }
      });
    },
    unmark: (occurrenceId): void => {
      void run(() => unmarkOccurrence(occurrenceId));
    },
    close: (itemId): void => {
      void run(() => closeItem(itemId));
    },
    move: (itemId, day, time): void => {
      void run(() => moveOccurrence(itemId, day, time));
    },
    error,
  };
}
