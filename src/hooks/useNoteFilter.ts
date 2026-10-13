import { useMemo, useState } from 'react';
import { labels } from '../constants/labels';
import type { Item } from '../types/domain';

export type NoteFilter = 'all' | 'notes' | 'values' | 'trackers';

export type UseNoteFilter = {
  readonly filter: NoteFilter;
  readonly setFilter: (filter: NoteFilter) => void;
  /** The choices with how many of each there are; empty while there are only plain notes. */
  readonly options: readonly {
    readonly value: NoteFilter;
    readonly label: string;
    readonly count: number;
  }[];
  readonly filtered: readonly Item[];
};

/** Narrows the notes tab to plain notes, values ("נתונים") or trackers, or shows them all. */
export function useNoteFilter(notes: readonly Item[]): UseNoteFilter {
  const [filter, setFilter] = useState<NoteFilter>('all');
  return useMemo(() => {
    const trackers = notes.filter((note) => note.kind === 'tracker');
    const values = notes.filter((note) => note.kind !== 'tracker' && note.is_value);
    const plain = notes.filter((note) => note.kind !== 'tracker' && !note.is_value);
    const groups = { notes: plain, values, trackers };
    // With only plain notes, the choice has no meaning and everything shows.
    const hasChoice = values.length > 0 || trackers.length > 0;
    const options = hasChoice
      ? [
          { value: 'all' as const, label: labels.data.filterAll, count: notes.length },
          { value: 'notes' as const, label: labels.data.filterNotes, count: plain.length },
          ...(values.length > 0
            ? [{ value: 'values' as const, label: labels.data.filterValues, count: values.length }]
            : []),
          ...(trackers.length > 0
            ? [{ value: 'trackers' as const, label: labels.tracker.title, count: trackers.length }]
            : []),
        ]
      : [];
    const filtered = !hasChoice || filter === 'all' ? notes : groups[filter];
    return { filter, setFilter, options, filtered };
  }, [notes, filter]);
}
