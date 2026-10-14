import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toMessage } from '../lib/errors';
import { labels } from '../constants/labels';
import { formatClock, snoozeUntil } from '../lib/itemRules';
import type { SnoozeChoice } from '../lib/itemRules';
import { cancelSnooze, snoozeReminder } from '../services/pushService';
import { useHouseholdContext } from './useRouteContext';
import { offerUndo } from './useUndoOffer';

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
      const remindAt = snoozeUntil(choice, new Date());
      snoozeReminder(itemId, member.id, remindAt)
        .then(() => {
          // Says when it will ring, with a way to take it back.
          const when =
            choice === 'tomorrow'
              ? labels.snooze.tomorrow
              : `${labels.snooze.at}${formatClock(remindAt)}`;
          offerUndo(`${labels.snooze.confirm} ${when}`, () => {
            cancelSnooze(itemId, member.id).catch((caught: unknown) => {
              setError(toMessage(caught));
            });
          });
        })
        .catch((caught: unknown) => {
          setError(toMessage(caught));
        });
    },
    error,
  };
}
