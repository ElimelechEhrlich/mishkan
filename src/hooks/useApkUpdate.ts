import { useEffect, useState } from 'react';
import { apkUpdateDue, fetchLatestApk, knownLatestApk } from '../lib/install';

/**
 * Whether the Android app on this phone is out of date: what was last learned shows at once,
 * and the site is asked again for the newest version.
 */
export function useApkUpdate(): boolean {
  const [latest, setLatest] = useState(knownLatestApk);

  useEffect(() => {
    let active = true;
    fetchLatestApk()
      .then((version) => {
        if (active && version !== null) {
          setLatest(version);
        }
      })
      .catch(() => {
        // Offline: what was known before stands, and it is asked again next time.
      });
    return (): void => {
      active = false;
    };
  }, []);

  return apkUpdateDue(latest);
}
