import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { PropertyRow } from '../ui/PropertyRow';
import { TextField } from '../ui/TextField';

type TextPropertyRowProps = {
  readonly label: string;
  readonly value: string | null;
  readonly open: boolean;
  readonly onToggle: () => void;
  /** Called with null when the field is emptied. */
  readonly onSave: (value: string | null) => void;
  readonly direction?: 'rtl' | 'ltr';
};

/** A short text on a profile, such as an ID number, edited where it is shown. */
export function TextPropertyRow({
  label,
  value,
  open,
  onToggle,
  onSave,
  direction = 'rtl',
}: TextPropertyRowProps): ReactElement {
  const [draft, setDraft] = useState(value ?? '');
  const trimmed = draft.trim();

  return (
    <PropertyRow
      label={label}
      value={value ?? labels.profile.notSet}
      missing={value === null}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex items-center gap-2">
        <TextField label={label} value={draft} onChange={setDraft} direction={direction} compact />
        <Button
          disabled={trimmed === (value ?? '')}
          onClick={() => {
            onSave(trimmed === '' ? null : trimmed);
          }}
        >
          {labels.actions.save}
        </Button>
      </div>
    </PropertyRow>
  );
}
