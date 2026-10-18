import { useCallback, useState } from 'react';
import { toMessage } from '../lib/errors';
import { setSummaryTimes } from '../services/householdService';
import { useHouseholdContext } from './useRouteContext';

type Which = 'morning' | 'evening';

/** The hour a summary comes at when turned on, as the database sets it at first. */
const usualHour = { morning: '08:00', evening: '21:00' } as const;

export type UseSummaryTimes = {
  /** The hour of each summary (HH:MM), or null when it is off. */
  readonly morning: string | null;
  readonly evening: string | null;
  readonly error: string | null;
  /** Sets a summary's hour, or turns it off with null; shown at once, taken back if it fails. */
  readonly set: (which: Which, hour: string | null) => void;
  /** Turns a summary on or off; on, it comes at its usual hour. */
  readonly toggle: (which: Which) => void;
};

function hourOf(value: string | null | undefined): string | null {
  return value === null || value === undefined ? null : value.slice(0, 5);
}

/** The signed-in parent's morning and evening summaries. */
export function useSummaryTimes(): UseSummaryTimes {
  const { member } = useHouseholdContext();
  const [times, setTimes] = useState({
    morning: hourOf(member.morning_at),
    evening: hourOf(member.evening_at),
  });
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    (which: Which, hour: string | null): void => {
      const before = times;
      setTimes({ ...times, [which]: hour });
      setError(null);
      setSummaryTimes(
        member.id,
        which === 'morning' ? { morning_at: hour } : { evening_at: hour },
      ).catch((caught: unknown) => {
        setTimes(before);
        setError(toMessage(caught));
      });
    },
    [member.id, times],
  );

  const toggle = useCallback(
    (which: Which): void => {
      set(which, times[which] === null ? usualHour[which] : null);
    },
    [set, times],
  );

  return { morning: times.morning, evening: times.evening, error, set, toggle };
}
