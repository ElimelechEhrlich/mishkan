import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toMessage } from '../lib/errors';
import { getItem } from '../services/itemService';
import type { DebtDetails, Item } from '../types/domain';
import { useDebts } from './useDebts';
import { useItems } from './useItems';
import type { UseItems } from './useItems';

export type UseItemPage = {
  readonly items: UseItems;
  /** The item named in the URL, or null when it is not visible or still loading. */
  readonly item: Item | null;
  /** The steps of the item, when it is a goal or an issue. */
  readonly steps: readonly Item[];
  readonly debt: DebtDetails | null;
  /** Set when a closed item could not be loaded. */
  readonly error: string | null;
  readonly addStep: (parent: Item, title: string) => void;
  readonly deleteAndLeave: (itemId: string) => void;
};

/** Everything the item page needs about the item in its URL. */
export function useItemPage(): UseItemPage {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const items = useItems();
  const debts = useDebts(items.items, items.reload);

  // Done steps are not in the open list, so the step list is searched as well.
  const listed =
    items.items.find((candidate) => candidate.id === itemId) ??
    items.steps.find((candidate) => candidate.id === itemId) ??
    null;

  // A closed item is in neither list, so it is fetched on its own.
  // `items.items` is a dependency so the copy is refreshed after every change.
  const [closed, setClosed] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const needsFetch = listed === null && !items.loading && itemId !== undefined;
  const openItems = items.items;
  useEffect(() => {
    if (!needsFetch) {
      return;
    }
    let active = true;
    getItem(itemId)
      .then((fetched) => {
        if (active) {
          setClosed(fetched);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(toMessage(caught));
        }
      });
    return (): void => {
      active = false;
    };
  }, [needsFetch, itemId, openItems]);

  const item = listed ?? (closed?.id === itemId ? closed : null);

  const steps = item === null ? [] : items.steps.filter((step) => step.parent_id === item.id);
  const debt =
    [...debts.owedToUs, ...debts.weOwe].find((candidate) => candidate.item.id === itemId)
      ?.details ?? null;

  const { addItem, deleteItem } = items;

  const addStep = useCallback(
    (parent: Item, title: string): void => {
      void addItem({
        title,
        kind: 'task',
        domainId: parent.domain_id,
        memberId: null,
        parentId: parent.id,
      });
    },
    [addItem],
  );

  const deleteAndLeave = useCallback(
    (targetId: string): void => {
      void deleteItem(targetId).then((deleted) => {
        if (deleted) {
          void navigate(-1);
        }
      });
    },
    [deleteItem, navigate],
  );

  return { items, item, steps, debt, error, addStep, deleteAndLeave };
}
