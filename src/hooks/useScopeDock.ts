import { useSyncExternalStore } from 'react';
import type { EntityTone } from '../lib/lookups';
import type { EntityWithDomains } from '../types/domain';

/**
 * How far the chosen entity's picture has gone from the carousel into the header as the
 * page scrolls: 0 in its place, 1 docked in the header. Kept apart from the page's state,
 * so following the scroll redraws only the header, never the page.
 */
export type ScopeDock = {
  readonly progress: number;
  /** The entity in the picture, or undefined for everything. */
  readonly entity: EntityWithDomains | undefined;
  readonly tone: EntityTone | undefined;
};

const resting: ScopeDock = { progress: 0, entity: undefined, tone: undefined };
let dock: ScopeDock = resting;
const listeners = new Set<() => void>();

export function setScopeDock(next: ScopeDock): void {
  if (dock.progress === next.progress && dock.entity === next.entity && dock.tone === next.tone) {
    return;
  }
  dock = next;
  listeners.forEach((listener) => {
    listener();
  });
}

export function resetScopeDock(): void {
  setScopeDock(resting);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useScopeDock(): ScopeDock {
  return useSyncExternalStore(subscribe, () => dock);
}
