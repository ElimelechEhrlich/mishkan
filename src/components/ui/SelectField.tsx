import { useId } from 'react';
import type { ReactElement } from 'react';

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

type SelectFieldProps = {
  readonly label: string;
  /** The empty string selects the placeholder. */
  readonly value: string;
  readonly placeholder: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (value: string) => void;
};

export function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: SelectFieldProps): ReactElement {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base transition focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
