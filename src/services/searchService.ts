import { supabase } from '../lib/supabase';
import type { Item } from '../types/domain';

/** How many items a search returns at most. */
const itemLimit = 40;

/** A value on an entity's profile list that matched a search. */
export type ListValueHit = {
  readonly entityId: string;
  readonly listTitle: string;
  readonly value: string;
};

/** Characters that have a meaning in a PostgREST filter are dropped from the term. */
function cleanTerm(term: string): string {
  return term.replace(/[,()%*\\]/g, ' ').trim();
}

/** Items of any status whose title, notes or answer contain the term; open ones first. */
export async function searchItems(term: string): Promise<Item[]> {
  const clean = cleanTerm(term);
  if (clean === '') {
    return [];
  }
  const pattern = `%${clean}%`;
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('hidden', false)
    .or(`title.ilike.${pattern},notes.ilike.${pattern},answer.ilike.${pattern}`)
    .order('status')
    .order('created_at', { ascending: false })
    .limit(itemLimit);
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** Values on profile lists, such as a hobby, that contain the term. */
export async function searchListValues(term: string): Promise<ListValueHit[]> {
  const clean = cleanTerm(term);
  if (clean === '') {
    return [];
  }
  const values = await supabase
    .from('entity_list_values')
    .select('*')
    .ilike('value', `%${clean}%`)
    .limit(itemLimit);
  if (values.error !== null) {
    throw new Error(values.error.message);
  }
  const listIds = [...new Set(values.data.map((value) => value.list_id))];
  if (listIds.length === 0) {
    return [];
  }
  const lists = await supabase.from('entity_lists').select('*').in('id', listIds);
  if (lists.error !== null) {
    throw new Error(lists.error.message);
  }
  const listsById = new Map(lists.data.map((list) => [list.id, list]));
  return values.data.flatMap((value) => {
    const list = listsById.get(value.list_id);
    return list === undefined
      ? []
      : [{ entityId: list.entity_id, listTitle: list.title, value: value.value }];
  });
}
