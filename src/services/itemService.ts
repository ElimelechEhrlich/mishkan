import { appointmentRhythm, fromLocalDateTime, seriesStarts } from '../lib/itemRules';
import { supabase } from '../lib/supabase';
import { allPages, inGroups } from './pages';
import { closeItem, listOccurrences, markOccurrence, unmarkOccurrence } from './repeatService';
import type {
  Conversion,
  DoneItem,
  Item,
  ItemKind,
  ItemUpdate,
  NewAppointment,
  NewItem,
} from '../types/domain';

export async function listOpenItems(): Promise<Item[]> {
  return allPages((from, to) =>
    supabase
      .from('items')
      .select('*')
      .eq('status', 'open')
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, to),
  );
}

/**
 * The steps, questions and trackers of the given goals and issues, done ones included, so
 * progress can be shown. Only those asked for: the lists need the open goals' and issues',
 * and a closed one's are fetched when its page is opened. Steps hidden by a conversion of
 * their parent are left out.
 */
export async function listSteps(parentIds: readonly string[]): Promise<Item[]> {
  const groups = await Promise.all(
    inGroups(parentIds).map((ids) =>
      allPages((from, to) =>
        supabase
          .from('items')
          .select('*')
          .in('parent_id', ids)
          .eq('hidden', false)
          .order('created_at')
          .order('id')
          .range(from, to),
      ),
    ),
  );
  return groups.flat().sort((a, b) => a.created_at.localeCompare(b.created_at));
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

/**
 * Each time a repeating task fell due and was marked (or missed), as a done copy of the task
 * stamped with when and by whom; the task itself stays open. Newest first, since a moment or
 * up to a count.
 */
export async function listRecurringDone(range: {
  readonly since?: string;
  readonly limit?: number;
}): Promise<DoneItem[]> {
  const occurrences = await listOccurrences(range);
  const ids = [...new Set(occurrences.map((occurrence) => occurrence.item_id))];
  if (ids.length === 0) {
    return [];
  }
  const items: Item[] = [];
  for (const group of inGroups(ids)) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('id', group)
      .eq('hidden', false);
    if (error !== null) {
      throw new Error(error.message);
    }
    items.push(...data);
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  return occurrences.flatMap((occurrence) => {
    const item = byId.get(occurrence.item_id);
    return item === undefined
      ? []
      : [
          {
            ...item,
            status: 'done' as const,
            completed_at: occurrence.done_at,
            completed_by: occurrence.done_by,
            occurrence,
          },
        ];
  });
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
    entity_id: newItem.entityId ?? null,
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
  // A series is one appointment that repeats; each time can be moved or skipped on its own.
  const rhythm = appointmentRhythm(appointment.repeat);
  if (rhythm !== null && appointment.count > 1) {
    const { error } = await supabase.rpc('create_repeating_appointment', {
      p_title: appointment.title,
      p_domain_id: appointment.domainId,
      p_starts: fromLocalDateTime(appointment.startsAt),
      p_place_kind: appointment.placeKind,
      p_place: appointment.place,
      p_meeting_url: appointment.meetingUrl,
      p_with_whom: appointment.withWhom,
      p_entity_id: appointment.entityId ?? null,
      p_every: rhythm.every,
      p_unit: rhythm.unit,
      p_count: appointment.count,
    });
    if (error !== null) {
      throw new Error(error.message);
    }
    return 1;
  }
  const starts = seriesStarts(appointment.startsAt, appointment.repeat, appointment.count);
  const { data, error } = await supabase.rpc('create_appointments', {
    p_title: appointment.title,
    p_domain_id: appointment.domainId,
    p_starts: starts.map(fromLocalDateTime),
    p_place_kind: appointment.placeKind,
    p_place: appointment.place,
    p_meeting_url: appointment.meetingUrl,
    p_with_whom: appointment.withWhom,
    p_entity_id: appointment.entityId ?? null,
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
    ...(conversion.startsAt === null
      ? {}
      : { p_starts_at: fromLocalDateTime(conversion.startsAt) }),
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

/** The kinds that repeat by occurrences. */
const repeatingKinds: ReadonlySet<Item['kind']> = new Set([
  'task',
  'appointment',
  'tracker',
  'missing_item',
]);

/**
 * Marks an item done. A repeating task stays open: its current occurrence is marked and it
 * moves on to the next one (the reminders, which count from its date, move with it). One
 * whose occurrences have run out is closed. Returns the occurrence marked, to take it back.
 */
export async function completeItem(item: Item): Promise<string | null> {
  if (item.time_mode === 'recurring' && repeatingKinds.has(item.kind)) {
    if (item.due_date !== null) {
      return markOccurrence(item.id, 'done');
    }
    await closeItem(item.id);
    return null;
  }
  await updateItem(item.id, { status: 'done' });
  return null;
}

/**
 * Takes back marking `item` done, given as it was before: the occurrence marked is unmarked,
 * anything else is open again.
 */
export async function undoComplete(item: Item, occurrenceId: string | null): Promise<void> {
  if (occurrenceId !== null) {
    await unmarkOccurrence(occurrenceId);
    return;
  }
  await reopenItem(item.id);
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
