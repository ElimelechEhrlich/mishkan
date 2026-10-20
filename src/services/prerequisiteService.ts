import { supabase } from '../lib/supabase';
import type { Prerequisite } from '../types/domain';

export async function listPrerequisites(itemId: string): Promise<Prerequisite[]> {
  const { data, error } = await supabase
    .from('prerequisites')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** A free-text condition that a parent ticks by hand. */
export async function addCondition(itemId: string, description: string): Promise<void> {
  const { error } = await supabase.from('prerequisites').insert({ item_id: itemId, description });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** A condition that is met on its own when the other item is done. */
export async function addDependency(itemId: string, dependsOnItemId: string): Promise<void> {
  const { error } = await supabase
    .from('prerequisites')
    .insert({ item_id: itemId, depends_on_item_id: dependsOnItemId });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function setConditionMet(prerequisiteId: string, isMet: boolean): Promise<void> {
  const { error } = await supabase
    .from('prerequisites')
    .update({ is_met: isMet })
    .eq('id', prerequisiteId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function removePrerequisite(prerequisiteId: string): Promise<void> {
  const { error } = await supabase.from('prerequisites').delete().eq('id', prerequisiteId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** The conditions of these items not met yet, oldest first: free text, or an item to wait for. */
export async function listOpenPrerequisites(itemIds: readonly string[]): Promise<Prerequisite[]> {
  if (itemIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('prerequisites')
    .select('*')
    .in('item_id', itemIds)
    .eq('is_met', false)
    .order('created_at');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}
