import { useCallback, useState } from 'react';

export type UseMovePick = {
  /** Whether the list is choosing what to move. */
  readonly picking: boolean;
  readonly picked: ReadonlySet<string>;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: (itemId: string) => void;
  /** Chooses these, or none. */
  readonly setAll: (itemIds: readonly string[]) => void;
};

/** Choosing items of a list to move them together; nothing is chosen at first. */
export function useMovePick(): UseMovePick {
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const start = useCallback((): void => {
    setPicked(new Set());
    setPicking(true);
  }, []);
  const stop = useCallback((): void => {
    setPicking(false);
    setPicked(new Set());
  }, []);
  const toggle = useCallback((itemId: string): void => {
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(itemId)) {
        next.add(itemId);
      }
      return next;
    });
  }, []);
  const setAll = useCallback((itemIds: readonly string[]): void => {
    setPicked(new Set(itemIds));
  }, []);
  return { picking, picked, start, stop, toggle, setAll };
}
