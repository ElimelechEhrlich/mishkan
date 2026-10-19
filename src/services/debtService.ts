import { supabase } from '../lib/supabase';
import { allPages } from './pages';
import type { DebtChanges, DebtDetails, NewDebt } from '../types/domain';
import { deleteItem } from './itemService';

export async function listDebtDetails(): Promise<DebtDetails[]> {
  return allPages((from, to) =>
    supabase.from('debt_details').select('*').order('item_id').range(from, to),
  );
}

/**
 * A debt is an item of kind `debt` plus one row of details.
 * If the details cannot be saved, the item is removed so no half debt is left behind.
 */
export async function createDebt(newDebt: NewDebt): Promise<void> {
  const created = await supabase
    .from('items')
    .insert({
      title: newDebt.counterparty,
      kind: 'debt',
      domain_id: newDebt.domainId,
      entity_id: newDebt.entityId ?? null,
    })
    .select('id')
    .single();
  if (created.error !== null) {
    throw new Error(created.error.message);
  }
  const itemId = created.data.id;
  const { error } = await supabase.from('debt_details').insert({
    item_id: itemId,
    amount: newDebt.amount,
    counterparty: newDebt.counterparty,
    direction: newDebt.direction,
  });
  if (error !== null) {
    await deleteItem(itemId);
    throw new Error(error.message);
  }
}

/** Changes a debt's details. */
export async function updateDebtDetails(itemId: string, changes: DebtChanges): Promise<void> {
  const { error } = await supabase.from('debt_details').update(changes).eq('item_id', itemId);
  if (error !== null) {
    throw new Error(error.message);
  }
}
