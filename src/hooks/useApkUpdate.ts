import { useSyncExternalStore } from 'react';
import { apkUpdateDue, knownLatestApk, onLatestApkChange } from '../lib/install';

function updateDue(): boolean {
  return apkUpdateDue(knownLatestApk());
}

/**
 * Whether the Android app on this phone is out of date. The newest version is asked for when
 * the app opens; this follows it, and the download of an update, so the offer and the dot
 * change at once.
 */
export function useApkUpdate(): boolean {
  return useSyncExternalStore(onLatestApkChange, updateDue);
}
