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
  /**
   * Whether the header draws its own copy once docked: only where the browser cannot tie the
   * motion to the scroll, and the carousel's picture is handed over instead of held there.
   */
  readonly copy: boolean;
};

const resting: ScopeDock = { progress: 0, entity: undefined, tone: undefined, copy: false };
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

/** How far the picture has gone into the header now, read once (not followed). */
export function scopeDockProgress(): number {
  return dock.progress;
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

/**
 * Whether the entity's picture has gone up into the header. Changes only when it crosses
 * half way, so the header is redrawn twice per scroll at most, not on every frame.
 */
export function useDocked(): boolean {
  return useSyncExternalStore(subscribe, () => dock.progress >= 0.5);
}
