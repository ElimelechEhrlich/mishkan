import { useState } from 'react';

export type ScopeState = {
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly setScope: (entityId: string | null) => void;
  /** The domain name, such as בריאות, every tab is narrowed to, or null for all of them. */
  readonly topic: string | null;
  readonly setTopic: (topic: string | null) => void;
};

/**
 * The chosen entity and topic. They hold while moving between tabs and are not kept:
 * opening the app again starts on everything, with no filter.
 */
export function useScopeState(): ScopeState {
  const [scopeId, setScope] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  return { scopeId, setScope, topic, setTopic };
}
