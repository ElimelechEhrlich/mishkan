import type { Session } from '@supabase/supabase-js';
import { authStorageKey, supabase } from '../lib/supabase';

/** Who is signed in, as far as the app needs to know. */
export type SignedIn = { readonly userId: string; readonly email: string | null };

export function signedInOf(session: Session | null): SignedIn | null {
  return session === null ? null : { userId: session.user.id, email: session.user.email ?? null };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The sign-in kept on this device, read at once without the network, so the app can open from
 * what it already has while the server confirms it (renewing it can take seconds on a phone).
 */
export function storedSignIn(): SignedIn | null {
  try {
    const stored = window.localStorage.getItem(authStorageKey);
    const value: unknown = stored === null ? null : JSON.parse(stored);
    if (!isObject(value) || typeof value['refresh_token'] !== 'string') {
      return null;
    }
    const user = value['user'];
    if (!isObject(user) || typeof user['id'] !== 'string') {
      return null;
    }
    const email = user['email'];
    return { userId: user['id'], email: typeof email === 'string' ? email : null };
  } catch {
    return null;
  }
}

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

export function onSessionChange(listener: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session);
  });
  return (): void => {
    data.subscription.unsubscribe();
  };
}
