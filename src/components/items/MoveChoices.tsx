import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { MoveTarget } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';

type MoveChoicesProps = {
  /** The days and times this list offers, in order. */
  readonly options: readonly Exclude<MoveTarget, { readonly day: string }>[];
  /** The earliest day that can be chosen (today). */
  readonly today: string;
  readonly onChoose: (target: MoveTarget) => void;
  readonly onClose: () => void;
};

const chipClass =
  'inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-[13px] font-semibold text-primary shadow-card transition active:scale-[0.97]';

/**
 * The move button open: where to move the items, a day or a time with no date, or any day
 * chosen. Choosing one starts picking the items.
 */
export function MoveChoices({ options, today, onChoose, onClose }: MoveChoicesProps): ReactElement {
  return (
    <div className="my-1.5 flex animate-fade-in flex-col gap-2 rounded-2xl bg-primary-soft p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon name="calendar" className="size-3.5 text-primary" />
        <span className="flex-1 text-[13px] font-semibold text-primary">{labels.move.open}</span>
        <button
          type="button"
          aria-label={labels.move.cancel}
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full text-primary transition active:scale-90"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              onChoose(option);
            }}
            className={chipClass}
          >
            {labels.move.to[option]}
          </button>
        ))}
        {/* Any day: the device's own date picker. */}
        <label className={`relative ${chipClass}`}>
          {labels.move.chooseDay}
          <input
            type="date"
            min={today}
            aria-label={labels.move.chooseDay}
            onChange={(event) => {
              if (event.target.value !== '') {
                onChoose({ day: event.target.value });
              }
            }}
            className="absolute inset-0 opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
