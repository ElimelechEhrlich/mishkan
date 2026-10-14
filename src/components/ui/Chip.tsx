import type { ReactElement } from 'react';
import { Icon } from './Icon';

type ChipProps = {
  readonly label: string;
  readonly selected: boolean;
  readonly onClick: () => void;
  /** Small secondary text, such as the private mark. */
  readonly note?: string | undefined;
  /** Background class of a small color dot shown before the label. */
  readonly dotClass?: string | undefined;
  readonly disabled?: boolean;
  /** Shows a small × while selected, saying a tap lets the choice go. */
  readonly clearable?: boolean;
  /** For a value inside a setting: chosen is marked by an outline, not filled. */
  readonly outline?: boolean;
};

export function Chip({
  label,
  selected,
  onClick,
  note,
  dotClass,
  disabled = false,
  clearable = false,
  outline = false,
}: ChipProps): ReactElement {
  const tone = outline
    ? selected
      ? 'bg-surface text-primary font-semibold ring-1 ring-primary'
      : 'bg-surface text-muted shadow-card'
    : selected
      ? 'bg-primary text-white'
      : 'bg-surface text-ink shadow-card';
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap transition active:scale-[0.97] disabled:opacity-40 ${tone}`}
    >
      {dotClass !== undefined && <span className={`size-1.5 rounded-full ${dotClass}`} />}
      {label}
      {note !== undefined && <span className="text-[11px] opacity-60">{note}</span>}
      {clearable && selected && <Icon name="close" className="-me-1 size-3.5 opacity-80" />}
    </button>
  );
}
