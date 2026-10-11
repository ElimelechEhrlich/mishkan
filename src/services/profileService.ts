import { supabase } from '../lib/supabase';
import type { EntityUpdate, ProfileList } from '../types/domain';

export async function updateEntityProfile(entityId: string, changes: EntityUpdate): Promise<void> {
  const { error } = await supabase.from('entities').update(changes).eq('id', entityId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** The lists on an entity's profile, in order, each with its values oldest first. */
export async function listProfileLists(entityId: string): Promise<ProfileList[]> {
  const lists = await supabase
    .from('entity_lists')
    .select('*')
    .eq('entity_id', entityId)
    .order('sort_order')
    .order('created_at');
  if (lists.error !== null) {
    throw new Error(lists.error.message);
  }
  const ids = lists.data.map((list) => list.id);
  if (ids.length === 0) {
    return [];
  }
  const values = await supabase
    .from('entity_list_values')
    .select('*')
    .in('list_id', ids)
    .order('created_at');
  if (values.error !== null) {
    throw new Error(values.error.message);
  }
  const allValues = values.data;
  return lists.data.map((list) => ({
    ...list,
    values: allValues.filter((value) => value.list_id === list.id),
  }));
}

/** The database copies the household from the entity. */
export async function createProfileList(
  entityId: string,
  title: string,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from('entity_lists')
    .insert({ entity_id: entityId, title, sort_order: sortOrder });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteProfileList(listId: string): Promise<void> {
  const { error } = await supabase.from('entity_lists').delete().eq('id', listId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function addListValue(listId: string, value: string): Promise<void> {
  const { error } = await supabase.from('entity_list_values').insert({ list_id: listId, value });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteListValue(valueId: string): Promise<void> {
  const { error } = await supabase.from('entity_list_values').delete().eq('id', valueId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

type AutoReminder = {
  /** Every reminder of the same occasion starts with it, such as `birthday:<entity>:`. */
  readonly prefix: string;
  /** The prefix and the date: a new date replaces the open reminder of an older one. */
  readonly key: string;
  readonly title: string;
  readonly domainId: string;
  readonly due: string;
};

/** Keeps one open reminder per occasion; one marked done is not added again. */
export async function syncAutoReminder(reminder: AutoReminder): Promise<void> {
  const { error } = await supabase.rpc('sync_auto_reminder', {
    p_prefix: reminder.prefix,
    p_key: reminder.key,
    p_title: reminder.title,
    p_domain_id: reminder.domainId,
    p_due: reminder.due,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}
