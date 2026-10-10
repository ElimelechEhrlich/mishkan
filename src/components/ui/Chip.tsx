import type { ReactElement } from 'react';

type ChipProps = {
  readonly label: string;
  readonly selected: boolean;
  readonly onClick: () => void;
  /** Small secondary text, such as the private mark. */
  readonly note?: string | undefined;
  /** Background class of a small color dot shown before the label. */
  readonly dotClass?: string | undefined;
  readonly disabled?: boolean;
};

export function Chip({
  label,
  selected,
  onClick,
  note,
  dotClass,
  disabled = false,
}: ChipProps): ReactElement {
  const tone = selected
    ? 'border-primary bg-primary text-white'
    : 'border-line bg-surface text-ink';
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-1 text-sm font-medium transition active:scale-[0.97] disabled:opacity-40 ${tone}`}
    >
      {dotClass !== undefined && <span className={`size-2 rounded-full ${dotClass}`} />}
      {label}
      {note !== undefined && <span className="text-xs opacity-70">{note}</span>}
    </button>
  );
}
