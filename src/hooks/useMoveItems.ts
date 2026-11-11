import { useCallback, useState } from 'react';
import { labels } from '../constants/labels';
import { toMessage } from '../lib/errors';
import { announceItemsChanged } from '../lib/itemChanges';
import { todayIso } from '../lib/itemRules';
import { moveTargetText } from '../lib/itemText';
import { moveBack, moveChange } from '../lib/todayBrief';
import type { MoveChange, MoveTarget } from '../lib/todayBrief';
import { updateItem } from '../services/itemService';
import { moveOccurrence } from '../services/repeatService';
import type { Item, ItemUpdate } from '../types/domain';
import type { UseItems } from './useItems';
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

/** What a move changes on the item itself, to show at once. */
function shownChanges(change: MoveChange): ItemUpdate {
  return change.kind === 'occurrence'
    ? { due_date: change.day, due_time: change.time }
    : change.changes;
}

/**
 * Moving several items at once: to today, on to tomorrow, or to urgent; and back. The items
 * move on the screen at once, while the move is saved.
 */
export function useMoveItems(lists: Pick<UseItems, 'preview'>): UseMoveItems {
  const { preview } = lists;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = useCallback(
    (items: readonly Item[], target: MoveTarget): void => {
      if (items.length === 0) {
        return;
      }
      const today = todayIso();
      setBusy(true);
      setError(null);
      const moves = items.map((item) => ({ item, change: moveChange(item, target, today) }));
      const settle = preview(
        new Map(moves.map(({ item, change }) => [item.id, shownChanges(change)])),
      );
      Promise.all(moves.map(({ item, change }) => apply(item, change)))
        .then(() => {
          settle();
          announceItemsChanged();
          offerUndo(labels.move.done(items.length, moveTargetText(target, today)), () => {
            const back = items.map((item) => ({ item, change: moveBack(item) }));
            const settleBack = preview(
              new Map(back.map(({ item, change }) => [item.id, shownChanges(change)])),
            );
            void Promise.all(back.map(({ item, change }) => apply(item, change)))
              .then(() => {
                settleBack();
                announceItemsChanged();
              })
              .catch((caught: unknown) => {
                settleBack();
                setError(toMessage(caught));
              });
          });
        })
        .catch((caught: unknown) => {
          settle();
          setError(toMessage(caught));
          announceItemsChanged();
        })
        .finally(() => {
          setBusy(false);
        });
    },
    [preview],
  );

  return { move, busy, error };
}
