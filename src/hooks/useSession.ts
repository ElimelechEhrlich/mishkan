import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { getSession, onSessionChange, signIn, signOut } from '../services/authService';

type SessionState = {
  readonly session: Session | null;
  readonly loading: boolean;
  readonly busy: boolean;
  readonly error: string | null;
};

type UseSession = SessionState & {
  readonly signIn: (email: string, password: string) => void;
  readonly signOut: () => void;
};

const initialState: SessionState = { session: null, loading: true, busy: false, error: null };

export function useSession(): UseSession {
  const [state, setState] = useState<SessionState>(initialState);

  useEffect(() => {
    let active = true;
    getSession()
      .then((session) => {
        if (active) {
          setState((previous) => ({ ...previous, session, loading: false }));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
        }
      });
    const unsubscribe = onSessionChange((session) => {
      setState((previous) => ({ ...previous, session, loading: false }));
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
        setState((previous) => ({ ...previous, busy: false, error: toMessage(error) }));
      });
  }, []);

  const handleSignOut = useCallback((): void => {
    signOut().catch((error: unknown) => {
      setState((previous) => ({ ...previous, error: toMessage(error) }));
    });
  }, []);

  return { ...state, signIn: handleSignIn, signOut: handleSignOut };
}
