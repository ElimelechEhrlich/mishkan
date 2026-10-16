import { supabase } from '../lib/supabase';

/** The ids of the items the parent put in their Google Calendar. */
export async function listCalendarItemIds(): Promise<string[]> {
  const { data, error } = await supabase.from('calendar_items').select('item_id');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data.map((row) => row.item_id);
}

/** Puts an item in the parent's Google Calendar, or takes it out. */
export async function setInCalendar(itemId: string, on: boolean): Promise<void> {
  const { error } = on
    ? await supabase.from('calendar_items').upsert({ item_id: itemId }, { ignoreDuplicates: true })
    : await supabase.from('calendar_items').delete().eq('item_id', itemId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** The address Google Calendar subscribes to, with the parent's secret code. */
function feedUrl(token: string): string {
  return `${String(import.meta.env.VITE_SUPABASE_URL)}/functions/v1/calendar?t=${token}`;
}

/** The parent's private calendar link, made the first time it is asked for. */
export async function getCalendarLink(): Promise<string> {
  const { data, error } = await supabase.rpc('calendar_link');
  if (error !== null) {
    throw new Error(error.message);
  }
  return feedUrl(data);
}

/** A new link in place of the old one, which stops working. */
export async function renewCalendarLink(): Promise<string> {
  const { data, error } = await supabase.rpc('renew_calendar_link');
  if (error !== null) {
    throw new Error(error.message);
  }
  return feedUrl(data);
}
