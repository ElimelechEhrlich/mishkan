import { useEffect, useMemo, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listDebtDetails } from '../services/debtService';
import type { Debt, DebtDetails, Item } from '../types/domain';

type DebtsState = {
  readonly details: readonly DebtDetails[];
  readonly error: string | null;
};

export type UseDebts = {
  readonly owedToUs: readonly Debt[];
  readonly weOwe: readonly Debt[];
  /** The details of every visible item that is or was a debt, by item id. */
  readonly detailsByItem: ReadonlyMap<string, DebtDetails>;
  readonly error: string | null;
};

/** Open debts, built from the open items of kind `debt` and their details. */
export function useDebts(items: readonly Item[]): UseDebts {
  const [state, setState] = useState<DebtsState>({ details: [], error: null });

  const debtItems = useMemo(() => items.filter((item) => item.kind === 'debt'), [items]);
  /** Changes only when the set of open debts changes, so details are not refetched on every render. */
  const debtKey = debtItems.map((item) => item.id).join(',');

  useEffect(() => {
    let active = true;
    listDebtDetails()
      .then((details) => {
        if (active) {
          setState({ details, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState((previous) => ({ ...previous, error: toMessage(error) }));
        }
      });
    return (): void => {
      active = false;
    };
  }, [debtKey]);

  const detailsByItem = useMemo(
    () => new Map(state.details.map((details) => [details.item_id, details])),
    [state.details],
  );

  const debts = useMemo(() => {
    const result: Debt[] = [];
    for (const item of debtItems) {
      const details = detailsByItem.get(item.id);
      if (details !== undefined) {
        result.push({ item, details });
      }
    }
    return result;
  }, [debtItems, detailsByItem]);

  return {
    owedToUs: debts.filter((debt) => debt.details.direction === 'owed_to_us'),
    weOwe: debts.filter((debt) => debt.details.direction === 'we_owe'),
    detailsByItem,
    error: state.error,
  };
}
