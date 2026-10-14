import { supabase } from '../lib/supabase';
import { allPages } from './pages';
import type { ItemRepeat, Occurrence, OccurrenceStatus, RepeatDraft } from '../types/domain';

/** How every item the parent can see repeats, including settings kept while another time is chosen. */
export async function listRepeats(): Promise<ItemRepeat[]> {
  return allPages((from, to) =>
    supabase.from('item_repeats').select('*').order('item_id').range(from, to),
  );
}

/** Every occurrence of an item, newest first. */
export async function listItemOccurrences(itemId: string): Promise<Occurrence[]> {
  return allPages((from, to) =>
    supabase
      .from('occurrences')
      .select('*')
      .eq('item_id', itemId)
      .order('on_date', { ascending: false })
      .order('id')
      .range(from, to),
  );
}

/** Occurrences marked or missed, newest first: since a moment, or up to a number. */
export async function listOccurrences(range: {
  readonly since?: string;
  readonly limit?: number;
}): Promise<Occurrence[]> {
  const base = supabase
    .from('occurrences')
    .select('*')
    .neq('status', 'closed_with_parent')
    .order('done_at', { ascending: false });
  const { data, error } = await (range.since === undefined
    ? base.limit(range.limit ?? 100)
    : base.gte('done_at', range.since));
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function setRepeat(itemId: string, draft: RepeatDraft): Promise<void> {
  const { error } = await supabase.rpc('set_repeat', {
    p_item_id: itemId,
    p_every: draft.every,
    p_unit: draft.unit,
    p_starts_on: draft.startsOn,
    p_at_time: draft.atTime,
    p_end_kind: draft.endKind,
    p_end_count: draft.endKind === 'count' ? draft.endCount : null,
    p_end_until: draft.endKind === 'until' ? draft.endUntil : null,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function stopRepeat(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('stop_repeat', { p_item_id: itemId });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function resumeRepeat(
  itemId: string,
  end: Pick<RepeatDraft, 'endKind' | 'endCount' | 'endUntil'>,
): Promise<void> {
  const { error } = await supabase.rpc('resume_repeat', {
    p_item_id: itemId,
    p_end_kind: end.endKind,
    p_end_count: end.endKind === 'count' ? end.endCount : null,
    p_end_until: end.endKind === 'until' ? end.endUntil : null,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Marks the current occurrence; returns it, so marking it can be taken back. */
export async function markOccurrence(
  itemId: string,
  status: Extract<OccurrenceStatus, 'done' | 'skipped'>,
): Promise<string> {
  const { data, error } = await supabase.rpc('mark_occurrence', {
    p_item_id: itemId,
    p_status: status,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function unmarkOccurrence(occurrenceId: string): Promise<void> {
  const { error } = await supabase.rpc('unmark_occurrence', { p_occurrence_id: occurrenceId });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Closes a repeating item itself; its occurrences stop. */
export async function closeItem(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('close_item', { p_item_id: itemId });
  if (error !== null) {
    throw new Error(error.message);
  }
}
