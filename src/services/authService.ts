import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error !== null) {
    throw new Error(error.message);
  }
  return data.session;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error !== null) {
    throw new Error(error.message);
  }
}

export function onSessionChange(listener: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session);
  });
  return (): void => {
    data.subscription.unsubscribe();
  };
}
