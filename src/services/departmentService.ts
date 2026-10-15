import { supabase } from '../lib/supabase';
import type { ItemDepartment, ShoppingDepartment } from '../types/domain';

/** The household's departments, in the order the shop is walked. */
export async function listDepartments(): Promise<ShoppingDepartment[]> {
  const { data, error } = await supabase
    .from('shopping_departments')
    .select('*')
    .order('position')
    .order('id');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** The departments chosen for items, by their names. */
export async function listItemDepartments(): Promise<ItemDepartment[]> {
  const { data, error } = await supabase.from('shopping_item_departments').select('*');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** `household_id` is filled in by the database; a new department goes last. */
export async function addDepartment(name: string): Promise<void> {
  const { error } = await supabase.from('shopping_departments').insert({ name });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function renameDepartment(departmentId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_departments')
    .update({ name })
    .eq('id', departmentId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Its items go to "other", and what was chosen for them is forgotten. */
export async function deleteDepartment(departmentId: string): Promise<void> {
  const { error } = await supabase.from('shopping_departments').delete().eq('id', departmentId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Every department, in its new order, in one step. */
export async function orderDepartments(departmentIds: readonly string[]): Promise<void> {
  const { error } = await supabase.rpc('order_shopping_departments', {
    p_ids: [...departmentIds],
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Keeps the department chosen for an item's name; null goes back to the built-in one. */
export async function chooseItemDepartment(
  titleKey: string,
  departmentId: string | null,
): Promise<void> {
  const { error } =
    departmentId === null
      ? await supabase.from('shopping_item_departments').delete().eq('title_key', titleKey)
      : await supabase
          .from('shopping_item_departments')
          .upsert(
            { title_key: titleKey, department_id: departmentId },
            { onConflict: 'household_id,title_key' },
          );
  if (error !== null) {
    throw new Error(error.message);
  }
}
