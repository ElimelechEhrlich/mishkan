import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toMessage } from '../lib/errors';
import { snoozeUntil } from '../lib/itemRules';
import type { SnoozeChoice } from '../lib/itemRules';
import { snoozeReminder } from '../services/pushService';
import { useHouseholdContext } from './useRouteContext';

export type SnoozeRequest = {
  /** Whether the page was opened from "remind me again" on a notification (?snooze=1). */
  readonly open: boolean;
  readonly close: () => void;
  /** Puts the item's reminder off for this parent alone, then closes the choice. */
  readonly choose: (itemId: string, choice: SnoozeChoice) => void;
  readonly error: string | null;
};

export function useSnoozeRequest(): SnoozeRequest {
  const { member } = useHouseholdContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const close = (): void => {
    setSearchParams({}, { replace: true });
  };
  return {
    open: searchParams.get('snooze') === '1',
    close,
    choose: (itemId, choice): void => {
      setError(null);
      close();
      snoozeReminder(itemId, member.id, snoozeUntil(choice, new Date())).catch(
        (caught: unknown) => {
          setError(toMessage(caught));
        },
      );
    },
    error,
  };
}
