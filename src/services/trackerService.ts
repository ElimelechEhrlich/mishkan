import { supabase } from '../lib/supabase';
import { allPages } from './pages';
import type { TrackerEntry } from '../types/domain';

/** Every entry of the trackers the parent can see. */
export async function listTrackerEntries(): Promise<TrackerEntry[]> {
  return allPages((from, to) =>
    supabase.from('tracker_entries').select('*').order('id').range(from, to),
  );
}

export async function addTrackerEntry(entry: {
  readonly itemId: string;
  readonly onDate: string;
  readonly value: string;
  readonly note: string | null;
}): Promise<void> {
  const { error } = await supabase.from('tracker_entries').insert({
    item_id: entry.itemId,
    on_date: entry.onDate,
    value: entry.value,
    note: entry.note,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function updateTrackerEntry(
  entryId: string,
  changes: { readonly on_date?: string; readonly value?: string; readonly note?: string | null },
): Promise<void> {
  const { error } = await supabase.from('tracker_entries').update(changes).eq('id', entryId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteTrackerEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('tracker_entries').delete().eq('id', entryId);
  if (error !== null) {
    throw new Error(error.message);
  }
}
