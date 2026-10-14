import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from './Icon';
import { PickerInput } from './PickerInput';

type TimeFieldProps = {
  /** The chosen hour (HH:MM), or '' for none. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label: string;
  /** Whether no hour is a choice: then a × clears it, and "no hour" shows while empty. */
  readonly optional?: boolean;
};

/** An hour, chosen with the phone's own clock: a tap anywhere on the field opens it. */
export function TimeField({
  value,
  onChange,
  label,
  optional = false,
}: TimeFieldProps): ReactElement {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <PickerInput type="time" value={value} onChange={onChange} label={label}>
        <Icon name="clock" className="size-4.5 shrink-0 text-primary" />
        <span dir="ltr" className={value === '' ? 'text-faint' : 'text-ink tabular-nums'}>
          {value === '' ? (optional ? labels.picker.noHour : label) : value}
        </span>
      </PickerInput>
      {optional && value !== '' && (
        <button
          type="button"
          aria-label={labels.picker.clear}
          onClick={() => {
            onChange('');
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-95"
        >
          <Icon name="close" className="size-4" />
        </button>
      )}
    </div>
  );
}
