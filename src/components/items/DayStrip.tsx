import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { dayChip } from '../../lib/todayBrief';

type DayStripProps = {
  /** This week's days, Sunday to Saturday, each with how many things it holds; the days
   * already gone are shown, faint, and cannot be chosen. */
  readonly days: readonly {
    readonly date: string;
    readonly count: number;
    readonly past: boolean;
  }[];
  readonly selected: string;
  readonly onSelect: (date: string) => void;
};

/**
 * This week as a row of days, Sunday to Saturday, like a calendar's: the chosen one filled, a dot for each
 * day that holds something (up to three). A tap shows that day below.
 */
export function DayStrip({ days, selected, onSelect }: DayStripProps): ReactElement {
  return (
    <div role="tablist" aria-label={labels.today.days} className="flex justify-between gap-1">
      {days.map(({ date, count, past }) => {
        const chip = dayChip(date);
        const chosen = date === selected;
        return (
          <button
            key={date}
            type="button"
            role="tab"
            aria-selected={chosen}
            disabled={past}
            onClick={() => {
              onSelect(date);
            }}
            className={`flex w-10 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition active:scale-95 ${
              chosen
                ? 'bg-primary text-white shadow-card'
                : past
                  ? 'bg-surface/30 text-faint'
                  : 'bg-surface/70 text-ink'
            }`}
          >
            <span className={`text-[11px] font-medium ${chosen ? 'text-white/80' : 'text-muted'}`}>
              {chip.weekday}
            </span>
            <span className="font-display text-[17px] leading-5 font-bold">{chip.day}</span>
            <span className="flex h-1.5 items-center gap-0.5">
              {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                <span
                  key={index}
                  className={`size-1 rounded-full ${chosen ? 'bg-white' : 'bg-primary'}`}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
