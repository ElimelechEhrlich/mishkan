import { useCallback, useState } from 'react';

const scopeKey = 'mishkan.scope';
const topicKey = 'mishkan.topic';

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Storage can be blocked (private mode); the choice then lasts only while the app is open.
  }
}

export type ScopeState = {
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly setScope: (entityId: string | null) => void;
  /** The domain name, such as בריאות, every tab is narrowed to, or null for all of them. */
  readonly topic: string | null;
  readonly setTopic: (topic: string | null) => void;
};

/** The chosen entity and topic, kept on this device so the app opens on them again. */
export function useScopeState(): ScopeState {
  const [scopeId, setScopeId] = useState<string | null>(() => readStored(scopeKey));
  const [topic, setTopicState] = useState<string | null>(() => readStored(topicKey));

  const setScope = useCallback((entityId: string | null): void => {
    setScopeId(entityId);
    writeStored(scopeKey, entityId);
  }, []);

  const setTopic = useCallback((next: string | null): void => {
    setTopicState(next);
    writeStored(topicKey, next);
  }, []);

  return { scopeId, setScope, topic, setTopic };
}
