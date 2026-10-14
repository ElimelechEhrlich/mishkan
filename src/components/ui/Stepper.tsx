import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from './Icon';

type StepperProps = {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  /** What to show instead of the number, such as "at the time itself" for zero. */
  readonly display?: string | undefined;
};

/** A number set by − and +. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  display,
}: StepperProps): ReactElement {
  const button =
    'flex size-9 items-center justify-center rounded-full bg-surface text-primary shadow-card transition active:scale-95 disabled:opacity-30';
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label={labels.picker.less}
        disabled={value <= min}
        onClick={() => {
          onChange(Math.max(min, value - 1));
        }}
        className={button}
      >
        <Icon name="minus" className="size-4" />
      </button>
      <span className="min-w-12 px-1 text-center text-[15px] font-semibold text-ink tabular-nums">
        {display ?? String(value)}
      </span>
      <button
        type="button"
        aria-label={labels.picker.more}
        disabled={value >= max}
        onClick={() => {
          onChange(Math.min(max, value + 1));
        }}
        className={button}
      >
        <Icon name="plus" className="size-4" />
      </button>
    </div>
  );
}
