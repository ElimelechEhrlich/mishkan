import { useSyncExternalStore } from 'react';
import { apkUpdateDue, knownLatestApk, onLatestApkChange } from '../lib/install';

/**
 * Whether the Android app on this phone is out of date. The newest version is asked for when
 * the app opens; this follows it, so the offer and the dot show at once.
 */
export function useApkUpdate(): boolean {
  const latest = useSyncExternalStore(onLatestApkChange, knownLatestApk);
  return apkUpdateDue(latest);
}
