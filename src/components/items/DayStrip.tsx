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

/** The concave corner where the chosen day meets the card under it: the card's color, less a circle. */
const flare = 'pointer-events-none absolute bottom-0 size-2.5';
const flareLeft =
  'bg-[radial-gradient(circle_at_0_0,transparent_10px,var(--color-primary)_10.5px)]';
const flareRight =
  'bg-[radial-gradient(circle_at_100%_0,transparent_10px,var(--color-primary)_10.5px)]';

/**
 * This week as a row of days, Sunday to Saturday, like a calendar's, a dot for each day that
 * holds something (up to three). The chosen one is a tab of the card under it: the card's color,
 * open at the bottom, its corners curving out into the card. A tap shows that day below.
 */
export function DayStrip({ days, selected, onSelect }: DayStripProps): ReactElement {
  return (
    <div
      role="tablist"
      aria-label={labels.today.days}
      className="flex items-end justify-between gap-0.5 px-7"
    >
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
            // Only the press moves; the colors change at once, with the corners into the band.
            className={`relative flex w-10 flex-col items-center ${
              chosen
                ? 'rounded-t-xl bg-primary pt-1 pb-2.5 text-white'
                : past
                  ? 'mb-1.5 rounded-xl py-1 text-faint'
                  : 'mb-1.5 rounded-xl bg-surface py-1 text-ink shadow-card transition-transform active:scale-95'
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
            {chosen && (
              <>
                <span aria-hidden="true" className={`${flare} -left-2.5 ${flareLeft}`} />
                <span aria-hidden="true" className={`${flare} -right-2.5 ${flareRight}`} />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
