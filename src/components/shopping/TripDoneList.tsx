import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';

type TripDoneListProps = {
  /** Going out shopping whose list had a run finish while it was open. */
  readonly trips: readonly Item[];
  readonly onClose: (trip: Item) => void;
  /** Leaves it open, and stops asking. */
  readonly onKeep: (trip: Item) => void;
};

/** "הסבב הסתיים": going out shopping is not closed by itself; here it is asked about. */
export function TripDoneList({ trips, onClose, onKeep }: TripDoneListProps): ReactElement | null {
  if (trips.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
        {labels.shopping.tripDoneTitle}
      </h2>
      <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {trips.map((trip) => (
          <li
            key={trip.id}
            className="flex flex-col gap-2 border-t border-line px-3.5 py-3 first:border-t-0"
          >
            <Link to={`/item/${trip.id}`} className="flex items-center gap-2 active:opacity-60">
              <Icon name="cart" className="size-5 shrink-0 text-primary" />
              <span className="text-[15px] font-medium break-words">
                {labels.shopping.tripDoneQuestion(trip.title)}
              </span>
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose(trip);
                }}
                className="min-h-9 rounded-full bg-primary px-4 text-[13px] font-semibold text-white transition active:scale-95"
              >
                {labels.shopping.tripClose}
              </button>
              <button
                type="button"
                onClick={() => {
                  onKeep(trip);
                }}
                className="min-h-9 rounded-full bg-paper px-4 text-[13px] font-medium text-ink transition active:scale-95"
              >
                {labels.shopping.tripKeep}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
