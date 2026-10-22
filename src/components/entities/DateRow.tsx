import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { PropertyRow } from '../ui/PropertyRow';
import { HebrewDateToggle } from '../ui/HebrewDateToggle';
import { TextField } from '../ui/TextField';

type DateRowProps = {
  readonly label: string;
  /** The Gregorian date as YYYY-MM-DD, or null when not set. */
  readonly date: string | null;
  readonly afterSunset: boolean;
  /** Shown as the value: the date as people read it. */
  readonly display: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onSave: (date: string | null, afterSunset: boolean) => void;
};

/** A date on a profile, with whether it was after sunset, which moves the Hebrew date. */
export function DateRow({
  label,
  date,
  afterSunset,
  display,
  open,
  onToggle,
  onSave,
}: DateRowProps): ReactElement {
  const [draft, setDraft] = useState(date ?? '');
  const [sunset, setSunset] = useState(afterSunset);

  return (
    <PropertyRow
      label={label}
      value={date === null ? labels.profile.notSet : display}
      missing={date === null}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3">
        <TextField label={label} type="date" value={draft} onChange={setDraft} compact />
        <HebrewDateToggle value={draft} onPick={setDraft} />
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={sunset}
            onChange={(event) => {
              setSunset(event.target.checked);
            }}
            className="size-4.5 accent-primary"
          />
          {labels.profile.afterSunset}
        </label>
        <div className="flex gap-2">
          <Button
            disabled={draft === ''}
            onClick={() => {
              onSave(draft, sunset);
            }}
          >
            {labels.actions.save}
          </Button>
          {date !== null && (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft('');
                setSunset(false);
                onSave(null, false);
              }}
            >
              {labels.profile.clear}
            </Button>
          )}
        </div>
      </div>
    </PropertyRow>
  );
}
