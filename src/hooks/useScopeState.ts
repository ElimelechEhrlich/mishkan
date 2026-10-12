import { useState } from 'react';
import type { HomeView, ListView } from '../types/domain';

export type ScopeState = {
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly setScope: (entityId: string | null) => void;
  /** The domain name, such as בריאות, every tab is narrowed to, or null for all of them. */
  readonly topic: string | null;
  readonly setTopic: (topic: string | null) => void;
  /** How the main page arranges what is open: by kind, or by domain. */
  readonly homeView: HomeView;
  readonly setHomeView: (view: HomeView) => void;
  /** How the tabs of a kind arrange their list: by time, or by domain. */
  readonly listView: ListView;
  readonly setListView: (view: ListView) => void;
};

/**
 * The chosen entity and topic, and how the main page and the tabs are arranged. They hold
 * while moving between tabs and are not kept: opening the app again starts on everything,
 * by kind on the main page and by time in the tabs.
 */
export function useScopeState(): ScopeState {
  const [scopeId, setScope] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [homeView, setHomeView] = useState<HomeView>('kind');
  const [listView, setListView] = useState<ListView>('time');
  return {
    scopeId,
    setScope,
    topic,
    setTopic,
    homeView,
    setHomeView,
    listView,
    setListView,
  };
}
