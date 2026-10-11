import { useMemo } from 'react';
import { toListEntries } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Item } from '../types/domain';

/** Notes as list rows; they have no time, so they are listed newest first. */
export function useNotes(notes: readonly Item[]): readonly ListEntry[] {
  return useMemo(() => toListEntries(notes, []), [notes]);
}
