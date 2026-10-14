import type { ReactElement, ReactNode } from 'react';

type PickerInputProps = {
  readonly type: 'date' | 'time';
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label: string;
  readonly min?: string | undefined;
  /** What the field shows: an icon and the chosen value in words. */
  readonly children: ReactNode;
};

/**
 * The look of a date or time field over the browser's own input, which covers it unseen: a
 * tap anywhere lands on the input and opens the phone's picker.
 */
export function PickerInput({
  type,
  value,
  onChange,
  label,
  min,
  children,
}: PickerInputProps): ReactElement {
  return (
    <label className="relative flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl bg-surface px-3.5 text-[15px] shadow-card transition active:scale-[0.99]">
      {children}
      <input
        type={type}
        aria-label={label}
        value={value}
        min={min}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onClick={(event) => {
          // Desktop browsers open the picker only from its icon; this opens it from anywhere.
          try {
            event.currentTarget.showPicker();
          } catch {
            // Not allowed here (or not supported): the phone opens it on its own.
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
