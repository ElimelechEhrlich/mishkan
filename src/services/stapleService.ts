import { supabase } from '../lib/supabase';
import type { ShoppingStaple, StapleDetail, StapleMerge } from '../types/domain';

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

/** A group of names the smart check found to be one product, and that product in plain words. */
export type SameProduct = { readonly names: readonly string[]; readonly why: string };

/** A step the smart check says as it goes, to show the parent what it is doing. */
export type SmartCheckStep =
  | { readonly kind: 'read'; readonly count: number }
  | { readonly kind: 'known'; readonly merged: number; readonly apart: number }
  | { readonly kind: 'asking'; readonly count: number }
  | { readonly kind: 'busy'; readonly attempt: number }
  | { readonly kind: 'fallback' }
  | { readonly kind: 'quota' }
  | { readonly kind: 'generic'; readonly name: string; readonly generic: string }
  | { readonly kind: 'grouped'; readonly products: number; readonly groups: number };

function numberOf(line: object, key: string): number {
  const value: unknown = Reflect.get(line, key);
  return typeof value === 'number' ? value : 0;
}

function textOf(line: object, key: string): string {
  const value: unknown = Reflect.get(line, key);
  return typeof value === 'string' ? value : '';
}

/** A line of the check's answer as a step; null for one that is not a step. */
function toStep(line: object): SmartCheckStep | null {
  switch (Reflect.get(line, 'step')) {
    case 'read':
      return { kind: 'read', count: numberOf(line, 'count') };
    case 'known':
      return { kind: 'known', merged: numberOf(line, 'merged'), apart: numberOf(line, 'apart') };
    case 'asking':
      return { kind: 'asking', count: numberOf(line, 'count') };
    case 'busy':
      return { kind: 'busy', attempt: numberOf(line, 'attempt') };
    case 'fallback':
      return { kind: 'fallback' };
    case 'quota':
      return { kind: 'quota' };
    case 'generic':
      return { kind: 'generic', name: textOf(line, 'name'), generic: textOf(line, 'generic') };
    case 'grouped':
      return {
        kind: 'grouped',
        products: numberOf(line, 'products'),
        groups: numberOf(line, 'groups'),
      };
    default:
      return null;
  }
}

function toGroups(groups: readonly unknown[]): SameProduct[] {
  return groups.flatMap((group: unknown): SameProduct[] => {
    if (typeof group !== 'object' || group === null) {
      return [];
    }
    const names: unknown = Reflect.get(group, 'names');
    const why: unknown = Reflect.get(group, 'why');
    return Array.isArray(names)
      ? [
          {
            names: names.filter((name: unknown): name is string => typeof name === 'string'),
            why: typeof why === 'string' ? why : '',
          },
        ]
      : [];
  });
}

/**
 * Asks the assistant which names on the fixed list are one product ("פיירי" and "נוזל
 * כלים"); each group is names as they are on the list, with the product they all are. What it
 * does is told as it goes, step by step, through `onStep`.
 */
export async function findSameProducts(
  onStep: (step: SmartCheckStep) => void,
): Promise<SameProduct[]> {
  const { data, error } = await supabase.auth.getSession();
  if (error !== null) {
    throw new Error(error.message);
  }
  if (data.session === null) {
    throw new Error('not signed in');
  }
  const response = await fetch(
    `${String(import.meta.env.VITE_SUPABASE_URL)}/functions/v1/assistant`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: String(import.meta.env.VITE_SUPABASE_ANON_KEY),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'similar_staples', stream: true }),
    },
  );
  const reader = response.body?.getReader();
  if (reader === undefined) {
    throw new Error(`request failed (${String(response.status)})`);
  }
  const decoder = new TextDecoder();
  let buffer = '';
  // Filled by the lines as they come.
  const answer: { groups: SameProduct[] | null; failed: string | null } = {
    groups: null,
    failed: null,
  };
  // One JSON line per step, then the groups or what went wrong.
  function take(text: string): void {
    if (text.trim() === '') {
      return;
    }
    const line: unknown = JSON.parse(text);
    if (typeof line !== 'object' || line === null) {
      return;
    }
    const found: unknown = Reflect.get(line, 'groups');
    const said: unknown = Reflect.get(line, 'error');
    if (Array.isArray(found)) {
      answer.groups = toGroups(found);
    } else if (typeof said === 'string') {
      answer.failed = said;
    } else {
      const step = toStep(line);
      if (step !== null) {
        onStep(step);
      }
    }
  }
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(take);
  }
  take(buffer);
  if (answer.failed !== null) {
    throw new Error(answer.failed);
  }
  if (answer.groups === null || !response.ok) {
    throw new Error(`no answer (${String(response.status)})`);
  }
  return answer.groups;
}

/** The details used for each name of the fixed list, by its key, the most used first. */
export async function listStapleDetails(): Promise<Map<string, StapleDetail[]>> {
  const { data, error } = await supabase
    .from('shopping_staple_details')
    .select('*')
    .order('times', { ascending: false })
    .order('last_used_at', { ascending: false });
  if (error !== null) {
    throw new Error(error.message);
  }
  const byName = new Map<string, StapleDetail[]>();
  for (const row of data) {
    byName.set(row.staple_key, [...(byName.get(row.staple_key) ?? []), row]);
  }
  return byName;
}
