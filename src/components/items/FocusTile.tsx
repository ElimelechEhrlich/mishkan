import type { ReactElement } from 'react';

type FocusTileProps = {
  readonly label: string;
  readonly count: number;
  readonly selected: boolean;
  /** Late and urgent show their number in red. */
  readonly alert?: boolean;
  readonly onSelect: () => void;
};

/** One of the first page's groups, as a number to tap; the chosen one stands out. */
export function FocusTile({
  label,
  count,
  selected,
  alert = false,
  onSelect,
}: FocusTileProps): ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex flex-1 flex-col items-center rounded-2xl py-2 transition active:scale-[0.97] ${
        selected ? 'bg-surface shadow-card ring-1 ring-primary/25' : 'bg-surface/40'
      }`}
    >
      <span
        className={`font-display text-2xl leading-7 font-bold ${
          count === 0 ? 'text-faint' : alert ? 'text-alert' : 'text-ink'
        }`}
      >
        {String(count)}
      </span>
      <span className={`text-[12px] font-medium ${selected ? 'text-ink' : 'text-muted'}`}>
        {label}
      </span>
    </button>
  );
}
