import type { ReactElement } from 'react';

type Choice<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  /** A short line under the label, saying what the choice means. */
  readonly hint?: string | undefined;
};

type ChoiceGridProps<Value extends string> = {
  readonly options: readonly Choice<Value>[];
  /** The chosen option, or null while none is. */
  readonly value: Value | null;
  readonly onChange: (value: Value) => void;
  readonly columns?: 2 | 3;
};

/**
 * The main choice of a field (its first level), such as the kind of time: equal tiles, the
 * chosen one filled. The settings a choice opens never use this look.
 */
export function ChoiceGrid<Value extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: ChoiceGridProps<Value>): ReactElement {
  return (
    <div
      role="radiogroup"
      className={`grid gap-1.5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(option.value);
            }}
            className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center transition active:scale-[0.98] ${
              selected ? 'bg-primary text-white' : 'bg-surface text-ink shadow-card'
            }`}
          >
            <span className="text-[14px] leading-tight font-semibold">{option.label}</span>
            {option.hint !== undefined && (
              <span
                className={`mt-0.5 text-[11px] leading-tight ${selected ? 'text-white/80' : 'text-muted'}`}
              >
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
