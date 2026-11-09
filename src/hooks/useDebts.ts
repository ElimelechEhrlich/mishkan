import { useEffect, useMemo, useState } from 'react';
import { readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { onItemsChanged } from '../lib/itemChanges';
import { remainingOf } from '../lib/debts';
import { listDebtPaid } from '../services/debtPaymentService';
import { listDebtDetails } from '../services/debtService';
import type { Debt, DebtDetails, DebtDirection, Item } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

/** The debts as loaded last time, kept on the device to show at once. */
type Snapshot = {
  readonly details: DebtDetails[];
  /** How much was paid of each debt, as pairs (a map does not keep in storage). */
  readonly paid: [string, number][];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSnapshot(value: unknown): value is Snapshot {
  return (
    isObject(value) &&
    Array.isArray(value['details']) &&
    value['details'].every((row: unknown) => isObject(row) && typeof row['item_id'] === 'string') &&
    Array.isArray(value['paid']) &&
    value['paid'].every(
      (pair: unknown) =>
        Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'number',
    )
  );
}

type DebtsState = {
  readonly details: readonly DebtDetails[];
  /** How much was paid of each debt, by item id. */
  readonly paid: ReadonlyMap<string, number>;
  readonly error: string | null;
};

export type UseDebts = {
  readonly owedToUs: readonly Debt[];
  readonly weOwe: readonly Debt[];
  /** What is left of each way's debts. */
  readonly totals: Readonly<Record<DebtDirection, number>>;
  /** The way shown: what the household owes, at first. */
  readonly direction: DebtDirection;
  readonly setDirection: (direction: DebtDirection) => void;
  /** The details of every visible item that is or was a debt, by item id. */
  readonly detailsByItem: ReadonlyMap<string, DebtDetails>;
  readonly error: string | null;
};

/** Open debts, built from the open items of kind `debt` and their details. */
export function useDebts(items: readonly Item[]): UseDebts {
  const { member } = useHouseholdContext();
  const cacheKey = `debts.${member.id}`;
  const [direction, setDirection] = useState<DebtDirection>('we_owe');
  // What was loaded last time shows at once; the fresh copy replaces it when it arrives.
  const [state, setState] = useState<DebtsState>(() => {
    const cached = readCache(cacheKey, isSnapshot);
    return {
      details: cached?.details ?? [],
      paid: new Map(cached?.paid ?? []),
      error: null,
    };
  });

  const debtItems = useMemo(() => items.filter((item) => item.kind === 'debt'), [items]);
  /** Changes only when the set of open debts changes, so details are not refetched on every render. */
  const debtKey = debtItems.map((item) => item.id).join(',');

  useEffect(() => {
    let active = true;
    const fetchDetails = (): void => {
      Promise.all([listDebtDetails(), listDebtPaid()])
        .then(([details, paid]) => {
          if (active) {
            setState({ details, paid, error: null });
            writeCache(cacheKey, { details, paid: [...paid] });
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState((previous) => ({ ...previous, error: toMessage(error) }));
          }
        });
    };
    fetchDetails();
    // A debt changed in this app (such as from its page) is fetched again.
    const stop = onItemsChanged(fetchDetails);
    return (): void => {
      active = false;
      stop();
    };
  }, [debtKey, cacheKey]);

  const detailsByItem = useMemo(
    () => new Map(state.details.map((details) => [details.item_id, details])),
    [state.details],
  );

  const debts = useMemo(() => {
    const result: Debt[] = [];
    for (const item of debtItems) {
      const details = detailsByItem.get(item.id);
      if (details !== undefined) {
        result.push({ item, details, paid: state.paid.get(item.id) ?? 0 });
      }
    }
    return result;
  }, [debtItems, detailsByItem, state.paid]);

  const owedToUs = debts.filter((debt) => debt.details.direction === 'owed_to_us');
  const weOwe = debts.filter((debt) => debt.details.direction === 'we_owe');
  const left = (list: readonly Debt[]): number =>
    list.reduce((sum, debt) => sum + remainingOf(debt.details, debt.paid), 0);
  return {
    owedToUs,
    weOwe,
    totals: { owed_to_us: left(owedToUs), we_owe: left(weOwe) },
    direction,
    setDirection,
    detailsByItem,
    error: state.error,
  };
}
