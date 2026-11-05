import { supabase } from '../lib/supabase';
import type { ShoppingStaple, StapleMerge } from '../types/domain';

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
export async function mergeStaples(
  keepId: string,
  dropId: string,
  how: 'manual' | 'smart',
): Promise<void> {
  const { error } = await supabase.rpc('merge_staples', {
    p_keep_id: keepId,
    p_drop_id: dropId,
    p_how: how,
  });
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

/** What was merged on the fixed list, the latest first. */
export async function listMerges(): Promise<StapleMerge[]> {
  const { data, error } = await supabase
    .from('shopping_staple_merges')
    .select('*')
    .order('merged_at', { ascending: false });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** Undoes a merge: the name comes back with its count, and the two are not suggested again. */
export async function unmergeStaple(mergeId: string): Promise<void> {
  const { error } = await supabase.rpc('unmerge_staple', { p_merge_id: mergeId });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Asks the assistant which names on the fixed list are the same product in other words
 * ("פיירי" and "נוזל כלים"); each group is names as they are on the list.
 */
export async function findSameProducts(): Promise<string[][]> {
  const answer: { readonly data: unknown; readonly error: unknown } =
    await supabase.functions.invoke('assistant', { body: { action: 'similar_staples' } });
  if (answer.error !== null) {
    // The function says what went wrong (such as the day's quota) on the error's response.
    const context: unknown =
      typeof answer.error === 'object' ? Reflect.get(answer.error, 'context') : undefined;
    let said: unknown = null;
    if (context instanceof Response) {
      try {
        const body: unknown = await context.json();
        said = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : null;
      } catch {
        said = null;
      }
    }
    throw new Error(
      typeof said === 'string' && said !== ''
        ? said
        : answer.error instanceof Error
          ? answer.error.message
          : 'request failed',
    );
  }
  const groups: unknown =
    typeof answer.data === 'object' && answer.data !== null
      ? Reflect.get(answer.data, 'groups')
      : null;
  if (!Array.isArray(groups)) {
    throw new Error('no answer');
  }
  return groups.flatMap((group: unknown) =>
    Array.isArray(group)
      ? [group.filter((name: unknown): name is string => typeof name === 'string')]
      : [],
  );
}
