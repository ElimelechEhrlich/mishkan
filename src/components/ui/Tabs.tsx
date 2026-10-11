import type { ReactElement } from 'react';

type TabOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly count?: number | undefined;
};

type TabsProps<Value extends string> = {
  readonly options: readonly TabOption<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
};

/** A row of tabs over a hairline, the selected one underlined. */
export function Tabs<Value extends string>({
  options,
  value,
  onChange,
}: TabsProps<Value>): ReactElement {
  return (
    <div role="tablist" className="-mx-4 flex gap-5 overflow-x-auto border-b border-line px-4 [scrollbar-width:none]">
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
            className={`relative flex min-h-11 shrink-0 items-center gap-1 text-sm transition-colors ${
              selected ? 'font-semibold text-ink' : 'font-medium text-muted'
            }`}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className="text-xs font-medium text-faint">{String(option.count)}</span>
            )}
            <span
              className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary transition-opacity ${
                selected ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
