import { useEffect, useSyncExternalStore } from 'react';
import { fetchLatestApk, knownLatestApk, onLatestApkChange } from '../lib/install';

/**
 * The newest version of the Android app: as known, and asked of the site again when a screen
 * that offers it opens, also in the browser.
 */
export function useLatestApk(): number | null {
  useEffect(() => {
    fetchLatestApk().catch(() => undefined);
  }, []);
  return useSyncExternalStore(onLatestApkChange, knownLatestApk);
}
