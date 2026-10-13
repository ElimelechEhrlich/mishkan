import {
  fromLocalDateTime,
  nextDueDate,
  recurrenceOf,
  seriesStarts,
  todayIso,
} from '../lib/itemRules';
import { supabase } from '../lib/supabase';
import type {
  Conversion,
  Item,
  ItemKind,
  ItemUpdate,
  NewAppointment,
  NewItem,
} from '../types/domain';

export async function listOpenItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'open')
    .eq('hidden', false)
    .order('created_at', { ascending: false });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Every step and question of a goal or an issue, done ones included, so progress can be shown.
 * Steps hidden by a conversion of their parent are left out.
 */
export async function listSteps(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .not('parent_id', 'is', null)
    .eq('hidden', false)
    .order('created_at');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** The most recently closed items, newest first; only of one kind when `kind` is given. */
export async function listDoneItems(limit: number, kind: ItemKind | null): Promise<Item[]> {
  const query = supabase.from('items').select('*').eq('status', 'done').eq('hidden', false);
  const { data, error } = await (kind === null ? query : query.eq('kind', kind))
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** Items closed since a moment, newest first, such as for a summary of the week. */
export async function listDoneSince(since: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'done')
    .eq('hidden', false)
    .gte('completed_at', since)
    .order('completed_at', { ascending: false });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** One item in any status, or null when it does not exist or is not visible. */
export async function getItem(itemId: string): Promise<Item | null> {
  const { data, error } = await supabase.from('items').select('*').eq('id', itemId).maybeSingle();
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
    parent_id: newItem.parentId,
    ...(newItem.time ?? {}),
    // A note that is one value keeps it as its answer.
    ...(newItem.value === undefined ? {} : { is_value: true, answer: newItem.value }),
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * One appointment, or a series of separate ones that share a series id. The database
 * sets the day each is listed on and its reminders. Returns how many were made.
 */
export async function createAppointments(appointment: NewAppointment): Promise<number> {
  const starts = seriesStarts(appointment.startsAt, appointment.repeat, appointment.count);
  const { data, error } = await supabase.rpc('create_appointments', {
    p_title: appointment.title,
    p_domain_id: appointment.domainId,
    p_starts: starts.map(fromLocalDateTime),
    p_place_kind: appointment.placeKind,
    p_place: appointment.place,
    p_meeting_url: appointment.meetingUrl,
    p_with_whom: appointment.withWhom,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** A question of an issue; its answer is filled in later. */
export async function createQuestion(issueId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .insert({ title, kind: 'question', parent_id: issueId });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Converts an item to another kind. Nothing is deleted: fields the new kind does not use
 * are kept and come back if it is converted back. The item then waits in
 * "needs completion" of the current parent if the new kind lacks something.
 */
export async function convertItem(itemId: string, conversion: Conversion): Promise<void> {
  const { error } = await supabase.rpc('convert_item', {
    p_item_id: itemId,
    p_kind: conversion.kind,
    p_detach_steps: conversion.detachSteps,
    ...(conversion.category === null ? {} : { p_category: conversion.category }),
    ...(conversion.debt === null
      ? {}
      : {
          p_amount: conversion.debt.amount,
          p_counterparty: conversion.debt.counterparty,
          p_direction: conversion.debt.direction,
        }),
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
