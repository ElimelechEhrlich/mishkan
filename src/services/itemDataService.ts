import { supabase } from '../lib/supabase';
import type { ItemData } from '../types/domain';

/** Every named value on the items the parent can see, in the order they were added. */
export async function listItemData(): Promise<ItemData[]> {
  const { data, error } = await supabase
    .from('item_data')
    .select('*')
    .order('created_at', { ascending: true });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function addItemData(itemId: string, label: string, value: string): Promise<void> {
  const { error } = await supabase.from('item_data').insert({ item_id: itemId, label, value });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function updateItemData(
  dataId: string,
  changes: { readonly label?: string; readonly value?: string },
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
