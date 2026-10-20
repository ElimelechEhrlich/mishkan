import type { ReactElement } from 'react';

type FocusTileProps = {
  readonly label: string;
  readonly count: number;
  readonly selected: boolean;
  /** Its color: red for late, gold for urgent, green for today; calm for what has no date. */
  readonly tone: 'alert' | 'gold' | 'primary' | 'calm';
  readonly onSelect: () => void;
};

const tones = {
  alert: { soft: 'bg-alert-soft/80', ring: 'ring-alert/30', text: 'text-alert' },
  gold: { soft: 'bg-gold/10', ring: 'ring-gold/35', text: 'text-gold' },
  primary: { soft: 'bg-surface/60', ring: 'ring-primary/30', text: 'text-primary' },
  calm: { soft: 'bg-cream', ring: 'ring-gold/25', text: 'text-ink' },
} as const;

/** One of the first page's groups, as a number to tap; the chosen one stands out. */
export function FocusTile({
  label,
  count,
  selected,
  tone,
  onSelect,
}: FocusTileProps): ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl px-1 transition active:scale-[0.97] ${
        selected ? `bg-surface shadow-card ring-2 ${tones[tone].ring}` : tones[tone].soft
      }`}
    >
      <span
        className={`font-display text-xl leading-6 font-bold ${
          count === 0 ? 'text-faint' : tones[tone].text
        }`}
      >
        {String(count)}
      </span>
      <span className={`text-[13px] font-medium ${selected ? 'text-ink' : 'text-muted'}`}>
        {label}
      </span>
    </button>
  );
}
