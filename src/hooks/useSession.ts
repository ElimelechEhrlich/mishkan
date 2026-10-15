import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { labels } from '../constants/labels';
import { clearCache } from '../lib/cache';
import { releaseDevice } from '../lib/push';
import {
  AuthFailure,
  getSession,
  onSessionChange,
  signIn,
  signedInOf,
  signOut,
  signUp,
  storedSignIn,
} from '../services/authService';
import type { SignedIn } from '../services/authService';
import { deleteSubscription } from '../services/pushService';

type SessionState = {
  readonly session: SignedIn | null;
  readonly loading: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  /** Set after signing up when the address still has to be confirmed by email. */
  readonly confirmationSentTo: string | null;
};

type UseSession = SessionState & {
  readonly signIn: (email: string, password: string) => void;
  /** `redirectTo` is where the confirmation link in the email leads. */
  readonly signUp: (email: string, password: string, redirectTo: string) => void;
  readonly signOut: () => void;
};

/** Known auth errors in the app's words; anything else as it came. */
function authMessage(error: unknown): string {
  if (error instanceof AuthFailure && error.code !== undefined) {
    const known: Readonly<Record<string, string>> = labels.authErrors;
    return known[error.code] ?? error.message;
  }
  return toMessage(error);
}

/** A sign-in kept on the device opens the app at once; the server confirms it after. */
function initialState(): SessionState {
  const stored = storedSignIn();
  return {
    session: stored,
    loading: stored === null,
    busy: false,
    error: null,
    confirmationSentTo: null,
  };
}

export function useSession(): UseSession {
  const [state, setState] = useState<SessionState>(initialState);

  useEffect(() => {
    let active = true;
    getSession()
      .then((session) => {
        if (active) {
          setState((previous) => ({ ...previous, session: signedInOf(session), loading: false }));
        }
      })
      .catch((error: unknown) => {
        // Offline with a sign-in kept on the device, the app goes on with what it has.
        if (active) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: previous.session === null ? toMessage(error) : null,
          }));
        }
      });
    const unsubscribe = onSessionChange((session) => {
      setState((previous) => ({ ...previous, session: signedInOf(session), loading: false }));
    });
    return (): void => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback((email: string, password: string): void => {
    setState((previous) => ({ ...previous, busy: true, error: null }));
    signIn(email, password)
      .then(() => {
        setState((previous) => ({ ...previous, busy: false }));
      })
      .catch((error: unknown) => {
        setState((previous) => ({
          ...previous,
          busy: false,
          error: authMessage(error),
        }));
      });
  }, []);

  const handleSignUp = useCallback((email: string, password: string, redirectTo: string): void => {
    setState((previous) => ({ ...previous, busy: true, error: null }));
    signUp(email, password, redirectTo)
      .then((signedIn) => {
        setState((previous) => ({
          ...previous,
          busy: false,
          confirmationSentTo: signedIn ? null : email,
        }));
      })
      .catch((error: unknown) => {
        setState((previous) => ({
          ...previous,
          busy: false,
          error: authMessage(error),
        }));
      });
  }, []);

  const handleSignOut = useCallback((): void => {
    // Another person may sign in on this device next; nothing of this household stays on it,
    // and this parent's reminders stop coming to it. The device is released while still
    // signed in, so its row can be removed; a failure there does not keep anyone signed in.
    clearCache();
    releaseDevice()
      .then((endpoint) => (endpoint === null ? undefined : deleteSubscription(endpoint)))
      .catch((error: unknown) => {
        setState((previous) => ({ ...previous, error: toMessage(error) }));
      })
      .then(signOut)
      .catch((error: unknown) => {
        setState((previous) => ({ ...previous, error: toMessage(error) }));
      });
  }, []);

  return {
    ...state,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
}
