import { supabase } from '../lib/supabase';
import { allPages } from './pages';
import type { ItemData } from '../types/domain';

/** Every row on the items the parent can see, in their order. */
export async function listItemData(): Promise<ItemData[]> {
  return allPages((from, to) =>
    supabase
      .from('item_data')
      .select('*')
      .order('position', { ascending: true })
      .order('id')
      .range(from, to),
  );
}

export async function addItemData(
  itemId: string,
  label: string | null,
  value: string,
): Promise<void> {
  const { error } = await supabase.from('item_data').insert({ item_id: itemId, label, value });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function updateItemData(
  dataId: string,
  changes: { readonly label?: string | null; readonly value?: string },
): Promise<void> {
  const { error } = await supabase.from('item_data').update(changes).eq('id', dataId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteItemData(dataId: string): Promise<void> {
  const { error } = await supabase.from('item_data').delete().eq('id', dataId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Moves a row one place up (-1) or down (1) among its item's rows. Done in one step on the
 * server by the order saved there, so quick taps cannot leave two rows in the same place.
 */
export async function moveItemData(rowId: string, step: -1 | 1): Promise<void> {
  const { error } = await supabase.rpc('move_item_data', { p_row_id: rowId, p_step: step });
  if (error !== null) {
    throw new Error(error.message);
  }
}
