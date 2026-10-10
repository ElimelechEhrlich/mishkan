import type { ReactElement } from 'react';

type ChipProps = {
  readonly label: string;
  readonly selected: boolean;
  readonly onClick: () => void;
  /** Small secondary text, such as the private mark. */
  readonly note?: string | undefined;
};

export function Chip({ label, selected, onClick, note }: ChipProps): ReactElement {
  const tone = selected ? 'border-ink bg-ink text-paper' : 'border-soft bg-surface text-ink';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-10 border px-3 py-1 text-sm ${tone}`}
    >
      {label}
      {note !== undefined && <span className="ms-2 text-xs opacity-70">{note}</span>}
    </button>
  );
}
