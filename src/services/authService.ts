import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error !== null) {
    throw new Error(error.message);
  }
  return data.session;
}

/** Auth errors carry their code (such as `invalid_credentials`) so the app can word them. */
export class AuthFailure extends Error {
  readonly code: string | undefined;

  constructor(message: string, code: string | undefined) {
    super(message);
    this.code = code;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error !== null) {
    throw new AuthFailure(error.message, error.code);
  }
}

/**
 * Opens an account. Resolves to true when the parent is signed in at once, or false
 * when Supabase first sends an email to confirm the address; its link leads to `redirectTo`.
 */
export async function signUp(
  email: string,
  password: string,
  redirectTo: string,
): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error !== null) {
    throw new AuthFailure(error.message, error.code);
  }
  return data.session !== null;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error !== null) {
    throw new Error(error.message);
  }
}

export function onSessionChange(
  listener: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session);
  });
  return (): void => {
    data.subscription.unsubscribe();
  };
}
