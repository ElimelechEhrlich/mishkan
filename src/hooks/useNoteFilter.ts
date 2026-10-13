import { useMemo, useState } from 'react';
import { labels } from '../constants/labels';
import type { Item } from '../types/domain';

export type NoteFilter = 'all' | 'notes' | 'values';

export type UseNoteFilter = {
  readonly filter: NoteFilter;
  readonly setFilter: (filter: NoteFilter) => void;
  /** The choices with how many of each there are; empty while there are no values at all. */
  readonly options: readonly {
    readonly value: NoteFilter;
    readonly label: string;
    readonly count: number;
  }[];
  readonly filtered: readonly Item[];
};

/** Narrows the notes tab to plain notes or to values ("נתונים"), or shows both. */
export function useNoteFilter(notes: readonly Item[]): UseNoteFilter {
  const [filter, setFilter] = useState<NoteFilter>('all');
  return useMemo(() => {
    const values = notes.filter((note) => note.is_value);
    const plain = notes.filter((note) => !note.is_value);
    const options =
      values.length === 0
        ? []
        : [
            { value: 'all' as const, label: labels.data.filterAll, count: notes.length },
            { value: 'notes' as const, label: labels.data.filterNotes, count: plain.length },
            { value: 'values' as const, label: labels.data.filterValues, count: values.length },
          ];
    // With no values, the choice has no meaning and everything shows.
    const filtered =
      values.length === 0 || filter === 'all' ? notes : filter === 'values' ? values : plain;
    return { filter, setFilter, options, filtered };
  }, [notes, filter]);
}
