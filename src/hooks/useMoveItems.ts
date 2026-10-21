import { useCallback, useState } from 'react';
import { labels } from '../constants/labels';
import { toMessage } from '../lib/errors';
import { announceItemsChanged } from '../lib/itemChanges';
import { todayIso } from '../lib/itemRules';
import { moveBack, moveChange } from '../lib/todayBrief';
import type { MoveChange, MoveTarget } from '../lib/todayBrief';
import { updateItem } from '../services/itemService';
import { moveOccurrence } from '../services/repeatService';
import type { Item } from '../types/domain';
import { offerUndo } from './useUndoOffer';

export type UseMoveItems = {
  /** Moves the items chosen on the home page, and offers to take it back. */
  readonly move: (items: readonly Item[], target: MoveTarget) => void;
  readonly busy: boolean;
  readonly error: string | null;
};

function apply(item: Item, change: MoveChange): Promise<void> {
  return change.kind === 'occurrence'
    ? moveOccurrence(item.id, change.day, change.time)
    : updateItem(item.id, change.changes);
}

/** Moving several items at once: to today, on to tomorrow, or to urgent; and back. */
export function useMoveItems(): UseMoveItems {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = useCallback((items: readonly Item[], target: MoveTarget): void => {
    if (items.length === 0) {
      return;
    }
    const today = todayIso();
    setBusy(true);
    setError(null);
    Promise.all(items.map((item) => apply(item, moveChange(item, target, today))))
      .then(() => {
        announceItemsChanged();
        offerUndo(labels.move.done(items.length, target), () => {
          void Promise.all(items.map((item) => apply(item, moveBack(item))))
            .then(() => {
              announceItemsChanged();
            })
            .catch((caught: unknown) => {
              setError(toMessage(caught));
            });
        });
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
        announceItemsChanged();
      })
      .finally(() => {
        setBusy(false);
      });
  }, []);

  return { move, busy, error };
}
