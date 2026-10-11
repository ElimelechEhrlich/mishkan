import { useId } from 'react';
import type { ReactElement } from 'react';

type TextFieldProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: 'text' | 'email' | 'password' | 'date' | 'number';
  readonly direction?: 'rtl' | 'ltr';
  readonly autoFocus?: boolean;
  readonly autoComplete?: string;
  /** Shows the label inside the field instead of above it. */
  readonly compact?: boolean;
};

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  direction = 'rtl',
  autoFocus = false,
  autoComplete = 'off',
  compact = false,
}: TextFieldProps): ReactElement {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className={compact ? 'sr-only' : 'text-sm font-medium text-muted'}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        dir={direction}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={compact ? label : undefined}
        inputMode={type === 'number' ? 'decimal' : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-base placeholder:text-muted/70 transition focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
      />
    </div>
  );
}
