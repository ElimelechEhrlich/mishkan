import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { addDays, formatPickedDate, todayIso } from '../../lib/itemRules';
import { Icon } from './Icon';
import { PickerInput } from './PickerInput';

type DateFieldProps = {
  /** The chosen day (YYYY-MM-DD), or '' for none. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Read aloud, and shown while no day is chosen. */
  readonly label: string;
  /** The earliest day that can be chosen. */
  readonly min?: string | undefined;
  /** The latest day that can be chosen. */
  readonly max?: string | undefined;
  /** Offers today, tomorrow and in a week as one tap each. */
  readonly shortcuts?: boolean;
};

/**
 * A day, chosen with the phone's own calendar: a tap anywhere on the field opens it. It does
 * not look like a field to type in, since nothing is typed.
 */
export function DateField({
  value,
  onChange,
  label,
  min,
  max,
  shortcuts = false,
}: DateFieldProps): ReactElement {
  const today = todayIso();
  const quick = [
    { day: today, text: labels.picker.today },
    { day: addDays(today, 1), text: labels.picker.tomorrow },
    { day: addDays(today, 7), text: labels.picker.inWeek },
  ].filter(
    (choice) =>
      (min === undefined || choice.day >= min) && (max === undefined || choice.day <= max),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <PickerInput type="date" value={value} onChange={onChange} label={label} min={min} max={max}>
        <Icon name="calendar" className="size-4.5 shrink-0 text-primary" />
        <span className={value === '' ? 'text-faint' : 'text-ink'}>
          {value === '' ? label : formatPickedDate(value)}
        </span>
      </PickerInput>
      {shortcuts && (
        <div className="flex flex-wrap gap-1.5">
          {quick.map((choice) => (
            <button
              key={choice.day}
              type="button"
              onClick={() => {
                onChange(choice.day);
              }}
              className={`min-h-7 rounded-full px-2.5 text-[12px] font-medium transition active:scale-95 ${
                value === choice.day ? 'text-primary underline' : 'text-muted'
              }`}
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
