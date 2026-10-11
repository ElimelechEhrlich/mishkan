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
  const tone = selected ? 'bg-primary text-white' : 'bg-surface text-ink shadow-card';
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition active:scale-[0.97] disabled:opacity-40 ${tone}`}
    >
      {dotClass !== undefined && <span className={`size-1.5 rounded-full ${dotClass}`} />}
      {label}
      {note !== undefined && <span className="text-[11px] opacity-60">{note}</span>}
    </button>
  );
}
