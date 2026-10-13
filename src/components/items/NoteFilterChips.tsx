import type { ReactElement } from 'react';
import type { NoteFilter } from '../../hooks/useNoteFilter';
import { Chip } from '../ui/Chip';

type NoteFilterChipsProps = {
  readonly options: readonly {
    readonly value: NoteFilter;
    readonly label: string;
    readonly count: number;
  }[];
  readonly value: NoteFilter;
  readonly onChange: (filter: NoteFilter) => void;
};

/** All, plain notes, values or trackers, as a light row of chips over the notes. */
export function NoteFilterChips({ options, value, onChange }: NoteFilterChipsProps): ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          note={option.count > 0 ? String(option.count) : undefined}
          selected={option.value === value}
          onClick={() => {
            onChange(option.value);
          }}
        />
      ))}
    </div>
  );
}
