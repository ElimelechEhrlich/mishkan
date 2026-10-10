import { supabase } from '../lib/supabase';
import type { Item, ItemUpdate, NewItem } from '../types/domain';

export async function listOpenItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** `household_id` and `created_by` are filled in by the database. */
export async function createItem(newItem: NewItem): Promise<void> {
  const { error } = await supabase.from('items').insert({
    title: newItem.title,
    domain_id: newItem.domainId,
    member_id: newItem.memberId,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function updateItem(itemId: string, changes: ItemUpdate): Promise<void> {
  const { error } = await supabase.from('items').update(changes).eq('id', itemId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function completeItem(itemId: string): Promise<void> {
  await updateItem(itemId, { status: 'done' });
}

/** Calls `onChange` whenever any visible item changes. Returns the unsubscribe function. */
export function subscribeToItems(onChange: () => void): () => void {
  const channel = supabase
    .channel(`items-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
      onChange();
    })
    .subscribe();
  return (): void => {
    void supabase.removeChannel(channel);
  };
}
