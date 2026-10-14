import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { onItemsChanged } from '../lib/itemChanges';
import { listItemOccurrences } from '../services/repeatService';
import type { Occurrence } from '../types/domain';

export type UseItemOccurrences = {
  /** The item's occurrences that were marked or missed, newest first. */
  readonly occurrences: readonly Occurrence[];
  readonly error: string | null;
};

/** One item's history of occurrences, kept in step with every change. */
export function useItemOccurrences(itemId: string | null): UseItemOccurrences {
  const [occurrences, setOccurrences] = useState<readonly Occurrence[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (itemId === null) {
      setOccurrences([]);
      return;
    }
    try {
      setOccurrences(await listItemOccurrences(itemId));
      setError(null);
    } catch (caught: unknown) {
      setError(toMessage(caught));
    }
  }, [itemId]);

  useEffect(() => {
    void load();
    return onItemsChanged(() => {
      void load();
    });
  }, [load]);

  return { occurrences, error };
}
