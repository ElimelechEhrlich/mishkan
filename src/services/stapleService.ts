import { supabase } from '../lib/supabase';
import type { ShoppingStaple } from '../types/domain';

/** The fixed shopping list, the most added first. */
export async function listStaples(): Promise<ShoppingStaple[]> {
  const { data, error } = await supabase
    .from('shopping_staples')
    .select('*')
    .order('times', { ascending: false })
    .order('title');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function renameStaple(
  stapleId: string,
  title: string,
  titleKey: string,
): Promise<void> {
  const { error } = await supabase
    .from('shopping_staples')
    .update({ title, title_key: titleKey })
    .eq('id', stapleId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Takes a name off the fixed list; it comes back if it is added to the shopping list again. */
export async function deleteStaple(stapleId: string): Promise<void> {
  const { error } = await supabase.from('shopping_staples').delete().eq('id', stapleId);
  if (error !== null) {
    throw new Error(error.message);
  }
}
