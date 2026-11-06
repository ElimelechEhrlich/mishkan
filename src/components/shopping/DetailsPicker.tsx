import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useStapleDetails } from '../../hooks/useStapleDetails';
import { Chip } from '../ui/Chip';
import { InlineAddChip } from '../ui/InlineAddChip';

type DetailsPickerProps = {
  /** The item's name, whose details used before are offered. */
  readonly title: string;
  readonly details: string | null;
  /** The detail chosen; null takes it off. */
  readonly onSave: (details: string | null) => void;
};

/**
 * An item's brand, kind or size, as on the fixed list: one of those used before with its name,
 * or one written anew, which joins them; choosing another does not remove any.
 */
export function DetailsPicker({ title, details, onSave }: DetailsPickerProps): ReactElement {
  const { used, error } = useStapleDetails(title);
  const [written, setWritten] = useState<readonly string[]>([]);
  const choices = [
    ...new Set([...used.slice(0, 8), ...written, ...(details === null ? [] : [details])]),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {choices.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={details === value}
            onClick={() => {
              onSave(details === value ? null : value);
            }}
          />
        ))}
        <InlineAddChip
          label={labels.shopping.otherDetails}
          placeholder={labels.shopping.detailsHint}
          onAdd={async (value) => {
            const text = value.trim().slice(0, 60);
            if (text !== '') {
              setWritten((current) => (current.includes(text) ? current : [...current, text]));
              onSave(text);
            }
            await Promise.resolve();
          }}
        />
      </div>
      {error !== null && <p className="text-[13px] text-alert">{error}</p>}
    </div>
  );
}
