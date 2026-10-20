import { labels } from '../constants/labels';
import { addDays, formatDueDate } from './itemRules';
import type { Item, ShoppingCategory } from '../types/domain';

/** When going out shopping is, short, for the chip beside its list. */
export function tripWhen(trip: Pick<Item, 'time_mode' | 'due_date'>, today: string): string {
  if (trip.due_date !== null) {
    if (trip.due_date <= today) {
      return labels.shopping.tripWhen.today;
    }
    return trip.due_date === addDays(today, 1)
      ? labels.shopping.tripWhen.tomorrow
      : formatDueDate(trip.due_date);
  }
  return trip.time_mode === 'urgent'
    ? labels.shopping.tripWhen.urgent
    : labels.shopping.tripWhen.none;
}

/** The open going out shopping of each list, the soonest first when there are two. */
export function tripsByList(trips: readonly Item[]): ReadonlyMap<ShoppingCategory, Item> {
  const found = new Map<ShoppingCategory, Item>();
  const sorted = [...trips].sort((a, b) =>
    (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
  );
  for (const trip of sorted) {
    if (trip.shopping_trip !== null && !found.has(trip.shopping_trip)) {
      found.set(trip.shopping_trip, trip);
    }
  }
  return found;
}
