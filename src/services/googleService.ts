import { supabase } from '../lib/supabase';

/** The household's connection to its Google account, as the app may see it. */
export type GoogleStatus = {
  readonly connectedAt: string;
  /** The "משכן" calendar is made in the account. */
  readonly ready: boolean;
  readonly lastSyncAt: string | null;
  readonly lastError: string | null;
};

/** The household's connection, or null when it is not connected. */
export async function getGoogleStatus(): Promise<GoogleStatus | null> {
  const { data, error } = await supabase.rpc('google_link_status');
  if (error !== null) {
    throw new Error(error.message);
  }
  const row = data[0];
  return row === undefined
    ? null
    : {
        connectedAt: row.connected_at,
        ready: row.ready,
        lastSyncAt: row.last_sync_at,
        lastError: row.last_error,
      };
}

async function callGoogle(body: Record<string, string>): Promise<unknown> {
  const answer: { readonly data: unknown; readonly error: unknown } =
    await supabase.functions.invoke('google-calendar', { body });
  const { data, error } = answer;
  if (error !== null) {
    throw new Error(error instanceof Error ? error.message : 'request failed');
  }
  return data;
}

/** The address of Google's consent page, which returns to the app with `state`. */
export async function googleConsentUrl(state: string): Promise<string> {
  const data = await callGoogle({ action: 'start', state });
  const url: unknown = typeof data === 'object' && data !== null ? Reflect.get(data, 'url') : null;
  if (typeof url !== 'string') {
    throw new Error('no address');
  }
  return url;
}

/** Connects the household with the code Google returned. */
export async function connectGoogle(code: string): Promise<void> {
  await callGoogle({ action: 'connect', code });
}

/** Stops sending to Google; the calendar and its events stay in the account. */
export async function disconnectGoogle(): Promise<void> {
  await callGoogle({ action: 'disconnect' });
}

/** Sends what changed now, rather than at the next minute. */
export async function syncGoogle(): Promise<void> {
  await callGoogle({ action: 'sync' });
}

/** What was chosen for items: in (true) or out (false), by item id. */
export async function listGoogleChoices(): Promise<Map<string, boolean>> {
  const { data, error } = await supabase.from('google_choices').select('item_id, included');
  if (error !== null) {
    throw new Error(error.message);
  }
  return new Map(data.map((row) => [row.item_id, row.included]));
}

/** Chooses for an item: in, out, or as its kind says (null). */
export async function setGoogleChoice(itemId: string, included: boolean | null): Promise<void> {
  const { error } =
    included === null
      ? await supabase.from('google_choices').delete().eq('item_id', itemId)
      : await supabase
          .from('google_choices')
          .upsert({ item_id: itemId, included, chosen_at: new Date().toISOString() });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** The items that have events in the household's calendar now. */
export async function listSyncedItemIds(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('google_synced_items');
  if (error !== null) {
    throw new Error(error.message);
  }
  return new Set(data);
}
