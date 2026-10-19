import type { ReactElement } from 'react';

type FocusTileProps = {
  readonly label: string;
  readonly count: number;
  readonly selected: boolean;
  /** Its color: red for late, gold for urgent, green for today. */
  readonly tone: 'alert' | 'gold' | 'primary';
  readonly onSelect: () => void;
};

const tones = {
  alert: { soft: 'bg-alert-soft/80', ring: 'ring-alert/30', text: 'text-alert' },
  gold: { soft: 'bg-gold/10', ring: 'ring-gold/35', text: 'text-gold' },
  primary: { soft: 'bg-primary-soft', ring: 'ring-primary/30', text: 'text-primary' },
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
      className={`flex flex-1 flex-col items-center rounded-2xl py-2 transition active:scale-[0.97] ${
        selected ? `bg-surface shadow-card ring-2 ${tones[tone].ring}` : tones[tone].soft
      }`}
    >
      <span
        className={`font-display text-2xl leading-7 font-bold ${
          count === 0 ? 'text-faint' : tones[tone].text
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
