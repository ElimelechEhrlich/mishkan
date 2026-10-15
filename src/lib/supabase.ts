import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (url === undefined || url === '' || anonKey === undefined || anonKey === '') {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. See .env.example.');
}

/** Where the sign-in is kept on the device: Supabase's own default, named here so it can be read at launch. */
export const authStorageKey = `sb-${new URL(url).hostname.split('.')[0] ?? ''}-auth-token`;

export const supabase = createClient<Database>(url, anonKey, {
  auth: { storageKey: authStorageKey },
});
