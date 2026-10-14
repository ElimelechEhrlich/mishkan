import { supabase } from '../lib/supabase';
import { allPages, inGroups } from './pages';
import type { Item, NewMissingItem, ShoppingCategory } from '../types/domain';

/** `household_id` and `created_by` are filled in by the database. */
export async function createMissingItem(newItem: NewMissingItem): Promise<void> {
  const { error } = await supabase.from('items').insert({
    title: newItem.title,
    kind: 'missing_item',
    domain_id: newItem.domainId,
    shopping_category: newItem.category,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Bought items that are still inside a run. Open items are already in the open list;
 * these are needed to show a run's progress and to let an item be unticked.
 */
export async function listBoughtRunItems(runIds: readonly string[]): Promise<Item[]> {
  // Only of the runs still open: a finished run's items are history, kept in "done".
  const groups = await Promise.all(
    inGroups(runIds).map((ids) =>
      allPages((from, to) =>
        supabase
          .from('items')
          .select('*')
          .eq('kind', 'missing_item')
          .eq('status', 'done')
          .in('run_id', ids)
          .order('completed_at')
          .order('id')
          .range(from, to),
      ),
    ),
  );
  return groups.flat();
}

/**
 * Gathers the open missing items of one category into a new run, either from every
 * shared entity or from the parent's personal entity only. Returns the run's id.
 */
export async function createShoppingRun(
  category: ShoppingCategory,
  isPrivate: boolean,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_shopping_run', {
    p_category: category,
    p_private: isPrivate,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}
