import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { announceItemsChanged, onItemsChanged } from '../lib/itemChanges';
import {
  addDebtPayment,
  listDebtPayments,
  payDebtMonth,
  removeDebtPayment,
} from '../services/debtPaymentService';
import type { DebtPayment } from '../types/domain';

export type UseDebtPayments = {
  readonly payments: readonly DebtPayment[];
  /** How much was paid in all. */
  readonly paid: number;
  readonly busy: boolean;
  readonly error: string | null;
  readonly add: (amount: number, paidOn: string, note: string | null) => void;
  readonly remove: (paymentId: string) => void;
  /** Records the month of the plan now due. */
  readonly payMonth: () => void;
};

/**
 * A debt's payments on its page. After each change the lists hear of it, since the debt's next
 * payment day may have moved.
 */
export function useDebtPayments(itemId: string): UseDebtPayments {
  const [payments, setPayments] = useState<readonly DebtPayment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((): void => {
    listDebtPayments(itemId)
      .then(setPayments)
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      });
  }, [itemId]);

  useEffect(() => {
    load();
    return onItemsChanged(load);
  }, [load]);

  const run = useCallback(
    (change: () => Promise<unknown>): void => {
      setBusy(true);
      setError(null);
      change()
        .then(() => {
          load();
          announceItemsChanged(load);
        })
        .catch((caught: unknown) => {
          setError(toMessage(caught));
        })
        .finally(() => {
          setBusy(false);
        });
    },
    [load],
  );

  return {
    payments,
    paid: payments.reduce((sum, payment) => sum + payment.amount, 0),
    busy,
    error,
    add: (amount, paidOn, note): void => {
      run(() => addDebtPayment(itemId, { amount, paidOn, note }));
    },
    remove: (paymentId): void => {
      run(() => removeDebtPayment(paymentId));
    },
    payMonth: (): void => {
      run(() => payDebtMonth(itemId));
    },
  };
}
