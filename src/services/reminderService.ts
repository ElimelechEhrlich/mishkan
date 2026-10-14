import { supabase } from '../lib/supabase';
import { allPages } from './pages';
import type { ItemReminder, ReminderDraft } from '../types/domain';

/** Every reminder on the items the parent can see, oldest first. */
export async function listReminders(): Promise<ItemReminder[]> {
  return allPages((from, to) =>
    supabase
      .from('item_reminders')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id')
      .range(from, to),
  );
}

/** The columns a parent sets; when it rings and whether it was sent are kept by the server. */
function toColumns(draft: ReminderDraft): {
  rule: ReminderDraft['rule'];
  at: string | null;
  minutes_before: number | null;
  days_before: number | null;
  at_time: string | null;
  every: number | null;
  unit: ReminderDraft['unit'];
  until: string | null;
  member_ids: string[] | null;
} {
  return {
    rule: draft.rule,
    at: draft.at,
    minutes_before: draft.minutes_before,
    days_before: draft.days_before,
    at_time: draft.at_time,
    every: draft.every,
    unit: draft.unit,
    until: draft.until,
    member_ids: draft.member_ids === null ? null : [...draft.member_ids],
  };
}

export async function addReminder(itemId: string, draft: ReminderDraft): Promise<void> {
  // Not read back: the row is written without asking for it again.
  const { error } = await supabase
    .from('item_reminders')
    .insert({ item_id: itemId, ...toColumns(draft) });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function updateReminder(reminderId: string, draft: ReminderDraft): Promise<void> {
  const { error } = await supabase
    .from('item_reminders')
    .update(toColumns(draft))
    .eq('id', reminderId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const { error } = await supabase.from('item_reminders').delete().eq('id', reminderId);
  if (error !== null) {
    throw new Error(error.message);
  }
}
