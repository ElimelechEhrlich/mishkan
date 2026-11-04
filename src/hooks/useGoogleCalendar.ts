import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { toMessage } from '../lib/errors';
import {
  connectGoogle,
  disconnectGoogle,
  getGoogleStatus,
  googleConsentUrl,
  listGoogleChoices,
  listSyncedItemIds,
  setGoogleChoice,
  syncGoogle,
} from '../services/googleService';
import type { GoogleStatus } from '../services/googleService';

/**
 * The household's Google Calendar: its connection and what was chosen for items, loaded once
 * and shared by every screen, so each item's switch does not load it again.
 */
type Store = {
  readonly loaded: boolean;
  readonly status: GoogleStatus | null;
  readonly choices: ReadonlyMap<string, boolean>;
  /** The items that have events in the calendar now. */
  readonly synced: ReadonlySet<string>;
};

let store: Store = { loaded: false, status: null, choices: new Map(), synced: new Set() };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Store): void {
  store = next;
  listeners.forEach((listener) => {
    listener();
  });
}

function load(): Promise<void> {
  loading = Promise.all([getGoogleStatus(), listGoogleChoices(), listSyncedItemIds()])
    .then(([status, choices, synced]) => {
      publish({ loaded: true, status, choices, synced });
    })
    .catch(() => {
      // Without it, nothing shows as connected; the next screen tries again.
      loading = null;
    });
  return loading;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (loading === null) {
    void load();
  }
  return (): void => {
    listeners.delete(listener);
  };
}

function snapshot(): Store {
  return store;
}

function useStore(): Store {
  return useSyncExternalStore(subscribe, snapshot);
}

/** The code the consent page must return with, kept on this device until it does. */
const stateKey = 'mishkan.googleState';

export type UseGoogleLink = {
  readonly loaded: boolean;
  readonly status: GoogleStatus | null;
  readonly busy: boolean;
  readonly error: string | null;
  /** Goes to Google's consent page; it returns to /google-calendar. */
  readonly connect: () => void;
  readonly disconnect: () => void;
};

/** The household's connection to Google Calendar, from the settings. */
export function useGoogleLink(): UseGoogleLink {
  const { loaded, status } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fresh look each time the settings open: the last send and its error.
  useEffect(() => {
    void load();
  }, []);

  const connect = useCallback((): void => {
    const state = crypto.randomUUID();
    try {
      window.localStorage.setItem(stateKey, state);
    } catch {
      // Private mode: the return is checked without it.
    }
    setBusy(true);
    setError(null);
    googleConsentUrl(state)
      .then((url) => {
        window.location.assign(url);
      })
      .catch((caught: unknown) => {
        setBusy(false);
        setError(toMessage(caught));
      });
  }, []);

  const disconnect = useCallback((): void => {
    setBusy(true);
    setError(null);
    disconnectGoogle()
      .then(load)
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      })
      .finally(() => {
        setBusy(false);
      });
  }, []);

  return { loaded, status, busy, error, connect, disconnect };
}

export type GoogleReturn = 'working' | 'done' | 'refused' | 'failed';

/**
 * The page Google returns to: hands the code to the server, which connects the household.
 * The answer must carry the code this device sent; Google says when the parent refused.
 */
export function useGoogleReturn(search: string): {
  readonly result: GoogleReturn;
  readonly error: string | null;
} {
  const [result, setResult] = useState<GoogleReturn>('working');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get('code');
    let sent: string | null = null;
    try {
      sent = window.localStorage.getItem(stateKey);
      window.localStorage.removeItem(stateKey);
    } catch {
      sent = null;
    }
    if (code === null) {
      setResult(params.get('error') === 'access_denied' ? 'refused' : 'failed');
      return;
    }
    // A return that is not the answer to this device's request is not taken.
    if (sent !== null && params.get('state') !== sent) {
      setResult('failed');
      return;
    }
    let current = true;
    connectGoogle(code)
      .then(load)
      .then(() => {
        if (current) {
          setResult('done');
        }
      })
      .catch((caught: unknown) => {
        if (current) {
          setError(toMessage(caught));
          setResult('failed');
        }
      });
    return (): void => {
      current = false;
    };
  }, [search]);

  return { result, error };
}

export type UseGoogleChoice = {
  /** The household is connected: the switch is shown. */
  readonly connected: boolean;
  /** What was chosen: in, out, or nothing (as the item's kind says). */
  readonly choice: boolean | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly set: (included: boolean | null) => void;
};

/** One item's place in Google Calendar; every screen shows the change at once. */
export function useGoogleChoice(itemId: string): UseGoogleChoice {
  const { status, choices } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [itemId]);

  const set = useCallback(
    (included: boolean | null): void => {
      const before = store;
      const next = new Map(store.choices);
      if (included === null) {
        next.delete(itemId);
      } else {
        next.set(itemId, included);
      }
      publish({ ...store, choices: next });
      setBusy(true);
      setError(null);
      setGoogleChoice(itemId, included)
        .then(() => {
          // Sent now, in the background, rather than at the next minute; if that fails, the
          // minute sends it.
          void syncGoogle()
            .then(load)
            .catch(() => undefined);
        })
        .catch((caught: unknown) => {
          publish(before);
          setError(toMessage(caught));
        })
        .finally(() => {
          setBusy(false);
        });
    },
    [itemId],
  );

  return {
    connected: status !== null,
    choice: choices.get(itemId) ?? null,
    busy,
    error,
    set,
  };
}

/** Whether the household is connected to Google Calendar. */
export function useGoogleConnected(): boolean {
  return useStore().status !== null;
}

/** Whether an item has events in the household's Google Calendar now. */
export function useInGoogle(itemId: string): boolean {
  return useStore().synced.has(itemId);
}
