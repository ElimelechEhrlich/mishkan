import type { TrackerEntry, TrackerSummary } from '../types/domain';

/**
 * The number an entry's value stands for, such as 3000 for "3,000" or "₪3,000", or null
 * for a value that is not a number (a line of text).
 */
export function entryNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s₪$€]/g, '');
  if (cleaned === '' || !/^-?\d*\.?\d+$/.test(cleaned)) {
    return null;
  }
  return Number(cleaned);
}

/** Newest first: by date, and on the same day the one added last. */
export function newestFirst(entries: readonly TrackerEntry[]): TrackerEntry[] {
  return [...entries].sort((a, b) =>
    a.on_date === b.on_date
      ? b.created_at.localeCompare(a.created_at)
      : b.on_date.localeCompare(a.on_date),
  );
}

const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

/** A number with the tracker's unit beside it, such as "7,500 ₪". */
export function withUnit(value: number | string, unit: string | null): string {
  const shown = typeof value === 'number' ? numberFormat.format(value) : value;
  return unit === null || unit.trim() === '' ? shown : `${shown} ${unit.trim()}`;
}

export type TrackerTotals = {
  /** The total of the entries that are numbers. */
  readonly sum: number | null;
  /** The newest entry's value, and the one before it. */
  readonly latest: string | null;
  readonly previous: string | null;
  readonly count: number;
};

export function trackerTotals(entries: readonly TrackerEntry[]): TrackerTotals {
  const ordered = newestFirst(entries);
  const numbers = ordered.map((entry) => entryNumber(entry.value)).filter((n) => n !== null);
  return {
    sum: numbers.length === 0 ? null : numbers.reduce((total, n) => total + n, 0),
    latest: ordered[0]?.value ?? null,
    previous: ordered[1]?.value ?? null,
    count: ordered.length,
  };
}

/**
 * The one line that sums a tracker up, as it was chosen: the total of its numbers, its
 * latest value, or nothing. Null when there is nothing to say.
 */
export function trackerLine(
  summary: TrackerSummary,
  unit: string | null,
  entries: readonly TrackerEntry[],
): { readonly label: 'sum' | 'latest'; readonly value: string } | null {
  const totals = trackerTotals(entries);
  if (summary === 'sum' && totals.sum !== null) {
    return { label: 'sum', value: withUnit(totals.sum, unit) };
  }
  if (summary === 'latest' && totals.latest !== null) {
    const latest = entryNumber(totals.latest);
    return { label: 'latest', value: withUnit(latest ?? totals.latest, unit) };
  }
  return null;
}
