import type { ReactElement } from 'react';
import type { OpenSegment } from '../../types/domain';
import { Chip } from '../ui/Chip';

type SegmentChipsProps = {
  readonly options: readonly {
    readonly value: OpenSegment;
    readonly label: string;
    readonly count: number;
  }[];
  readonly value: OpenSegment;
  readonly onChange: (segment: OpenSegment) => void;
};

/** The time groups (active, waiting, someday) as a light row of chips, under a row of tabs. */
export function SegmentChips({ options, value, onChange }: SegmentChipsProps): ReactElement {
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
