import { useId } from 'react';
import type { ReactElement } from 'react';

type TextFieldProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: 'text' | 'email' | 'password' | 'date';
  readonly direction?: 'rtl' | 'ltr';
  readonly autoFocus?: boolean;
  readonly autoComplete?: string;
};

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  direction = 'rtl',
  autoFocus = false,
  autoComplete = 'off',
}: TextFieldProps): ReactElement {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        dir={direction}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="min-h-12 w-full border border-ink bg-surface px-3 py-2 text-base"
      />
    </div>
  );
}
