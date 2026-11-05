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

/** The pairs of names marked "not the same product", by `pairKey`. */
export async function listApart(): Promise<Set<string>> {
  const { data, error } = await supabase.from('shopping_staple_apart').select('pair_key');
  if (error !== null) {
    throw new Error(error.message);
  }
  return new Set(data.map((row) => row.pair_key));
}

/** Two names are one product: the kept one takes the other's count and its open items. */
export async function mergeStaples(keepId: string, dropId: string): Promise<void> {
  const { error } = await supabase.rpc('merge_staples', { p_keep_id: keepId, p_drop_id: dropId });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Two names are not the same product: they are not asked about again. */
export async function markApart(pairKey: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_staple_apart')
    .upsert({ pair_key: pairKey }, { ignoreDuplicates: true });
  if (error !== null) {
    throw new Error(error.message);
  }
}
