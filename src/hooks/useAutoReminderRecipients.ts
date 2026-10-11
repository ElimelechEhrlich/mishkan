import { useCallback, useState } from 'react';
import { toMessage } from '../lib/errors';
import { setAutoReminderRecipients } from '../services/pushService';
import type { Household } from '../types/domain';

export type UseAutoReminderRecipients = {
  /** The parents chosen; null for everyone. */
  readonly memberIds: readonly string[] | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly choose: (memberIds: readonly string[] | null) => void;
};

/** Who gets the automatic birthday and anniversary reminders of the household. */
export function useAutoReminderRecipients(household: Household): UseAutoReminderRecipients {
  const [memberIds, setMemberIds] = useState<readonly string[] | null>(
    household.auto_remind_member_ids,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = useCallback(
    (next: readonly string[] | null): void => {
      const previous = memberIds;
      setMemberIds(next);
      setBusy(true);
      setError(null);
      setAutoReminderRecipients(next)
        .catch((caught: unknown) => {
          setMemberIds(previous);
          setError(toMessage(caught));
        })
        .finally(() => {
          setBusy(false);
        });
    },
    [memberIds],
  );

  return { memberIds, busy, error, choose };
}
