import { useState } from 'react';

/**
 * Which way content slides in when the chosen entity changes: toward one later in the
 * row of entities, or an earlier one. `index` is the place of the chosen one, -1 for none.
 */
export function useSlideDirection(index: number): 'next' | 'previous' {
  const [shown, setShown] = useState<{
    readonly index: number;
    readonly direction: 'next' | 'previous';
  }>({ index, direction: 'next' });
  if (index !== shown.index) {
    setShown({ index, direction: index > shown.index ? 'next' : 'previous' });
  }
  return shown.direction;
}
