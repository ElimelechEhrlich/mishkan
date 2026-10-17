import type { ReactElement } from 'react';

type SegmentedOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly count?: number | undefined;
};

type SegmentedProps<Value extends string> = {
  readonly options: readonly SegmentedOption<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  /** Smaller, to sit in one row with another control. */
  readonly compact?: boolean;
};

/** A choice between a few options, the chosen one raised on a gray track. */
export function Segmented<Value extends string>({
  options,
  value,
  onChange,
  compact = false,
}: SegmentedProps<Value>): ReactElement {
  return (
    <div role="tablist" className="flex gap-0.5 rounded-xl bg-line/80 p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              onChange(option.value);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 transition ${
              compact ? 'min-h-8 text-xs' : 'min-h-9 text-[13px]'
            } ${
              selected
                ? 'bg-surface font-semibold text-ink shadow-raised'
                : 'font-medium text-muted'
            }`}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className="text-xs font-medium opacity-60">{String(option.count)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
