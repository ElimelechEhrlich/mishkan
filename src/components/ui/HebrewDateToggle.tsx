import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatHebrewDate } from '../../lib/hebrewDate';
import { HebrewDatePicker } from './HebrewDatePicker';
import { Icon } from './Icon';

type HebrewDateToggleProps = {
  /** The chosen day (YYYY-MM-DD), or '' for none. */
  readonly value: string;
  readonly onPick: (isoDate: string) => void;
};

/**
 * Under a date field: the chosen day's Hebrew date, and a way to choose the day by a Hebrew
 * date instead, which the field then holds as its civil day.
 */
export function HebrewDateToggle({ value, onPick }: HebrewDateToggleProps): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-2 px-0.5">
        {value !== '' && (
          <span className="text-[13px] text-muted">{formatHebrewDate(value, true)}</span>
        )}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
          className="inline-flex min-h-7 items-center gap-1 rounded-full px-1.5 text-[12px] font-semibold text-primary transition active:scale-95"
        >
          <Icon name="calendar" className="size-3.5" />
          {labels.picker.hebrew}
        </button>
      </div>
      {open && (
        <HebrewDatePicker
          value={value}
          onPick={(isoDate) => {
            onPick(isoDate);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
