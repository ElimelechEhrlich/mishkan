import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
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
  const item =
    items.items.find((candidate) => candidate.id === itemId) ??
    items.steps.find((candidate) => candidate.id === itemId) ??
    null;

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

  return { items, item, steps, debt, addStep, deleteAndLeave };
}
