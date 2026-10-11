import { useCallback, useState } from 'react';

const storageKey = 'mishkan.scope';

function readStored(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStored(entityId: string | null): void {
  try {
    if (entityId === null) {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, entityId);
    }
  } catch {
    // Storage can be blocked (private mode); the choice then lasts only while the app is open.
  }
}

export type ScopeState = {
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly setScope: (entityId: string | null) => void;
};

/** The chosen entity, kept on this device so the app opens on it again. */
export function useScopeState(): ScopeState {
  const [scopeId, setScopeId] = useState<string | null>(readStored);

  const setScope = useCallback((entityId: string | null): void => {
    setScopeId(entityId);
    writeStored(entityId);
  }, []);

  return { scopeId, setScope };
}
