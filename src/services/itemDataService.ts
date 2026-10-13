import { supabase } from '../lib/supabase';
import type { ItemData } from '../types/domain';

/** Every row on the items the parent can see, in their order. */
export async function listItemData(): Promise<ItemData[]> {
  const { data, error } = await supabase
    .from('item_data')
    .select('*')
    .order('position', { ascending: true });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
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

/** Swaps where two rows of an item stand, moving one past the other. */
export async function swapItemData(first: ItemData, second: ItemData): Promise<void> {
  const [a, b] = await Promise.all([
    supabase.from('item_data').update({ position: second.position }).eq('id', first.id),
    supabase.from('item_data').update({ position: first.position }).eq('id', second.id),
  ]);
  const error = a.error ?? b.error;
  if (error !== null) {
    throw new Error(error.message);
  }
}
