import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import type { UseItems } from './useItems';

export type UseAddStaples = {
  readonly saving: boolean;
  /** Adds the names to the home's "סופר" shopping list, then goes back to the list. */
  readonly add: (titles: readonly string[]) => void;
};

/** Adding what was ticked on the fixed list to the shopping list. */
export function useAddStaples(items: UseItems, homeDomainId: string | null): UseAddStaples {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const { addMissingItem } = items;
  const add = useCallback(
    (titles: readonly string[]): void => {
      if (homeDomainId === null || titles.length === 0) {
        return;
      }
      setSaving(true);
      void addMissingItem({ titles: [...titles], category: 'food', domainId: homeDomainId }).then(
        (added) => {
          setSaving(false);
          if (added) {
            void navigate('/shopping');
          }
        },
      );
    },
    [addMissingItem, homeDomainId, navigate],
  );
  return { saving: saving || homeDomainId === null, add };
}
