import type { ReactElement } from 'react';

type Option<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly disabled?: boolean;
};

type OptionGroupProps<Value extends string> = {
  readonly options: readonly Option<Value>[];
  readonly value: Value | null;
  readonly onChange: (value: Value) => void;
  /** Read aloud for the group. */
  readonly label: string;
};

/**
 * A value inside a setting (its third level), such as a unit: joined options in one frame,
 * the chosen one marked by its outline and color, never filled like a main choice.
 */
export function OptionGroup<Value extends string>({
  options,
  value,
  onChange,
  label,
}: OptionGroupProps<Value>): ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap rounded-lg border border-line bg-surface p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => {
              onChange(option.value);
            }}
            className={`min-h-8 rounded-md border px-3 text-[13px] transition disabled:opacity-35 ${
              selected
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent font-medium text-muted'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
