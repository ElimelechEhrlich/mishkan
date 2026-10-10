import { nextDueDate, recurrenceOf, todayIso } from '../lib/itemRules';
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

/** Every step of a goal or an issue, done ones included, so progress can be shown. */
export async function listSteps(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .not('parent_id', 'is', null)
    .order('created_at');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** `household_id` and `created_by` are filled in by the database. */
export async function createItem(newItem: NewItem): Promise<void> {
  const { error } = await supabase.from('items').insert({
    title: newItem.title,
    kind: newItem.kind,
    domain_id: newItem.domainId,
    member_id: newItem.memberId,
    parent_id: newItem.parentId,
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

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * A recurring item stays open: the completion is logged and the due date moves
 * to the next occurrence. Anything else is closed.
 */
export async function completeItem(item: Item): Promise<void> {
  const recurrence = recurrenceOf(item.recurrence_rule);
  if (item.time_mode !== 'recurring' || recurrence === null) {
    await updateItem(item.id, { status: 'done' });
    return;
  }
  const { error } = await supabase.from('completions').insert({ item_id: item.id });
  if (error !== null) {
    throw new Error(error.message);
  }
  await updateItem(item.id, { due_date: nextDueDate(item.due_date, recurrence, todayIso()) });
}

export async function reopenItem(itemId: string): Promise<void> {
  await updateItem(itemId, { status: 'open' });
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
