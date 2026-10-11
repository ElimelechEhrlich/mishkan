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
};

export function Segmented<Value extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<Value>): ReactElement {
  return (
    <div role="tablist" className="flex gap-1 rounded-full bg-line/60 p-1">
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
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition ${
              selected ? 'bg-surface font-bold text-ink shadow-card' : 'text-muted'
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
