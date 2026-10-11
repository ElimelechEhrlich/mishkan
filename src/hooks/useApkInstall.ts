import { useEffect, useState } from 'react';
import { apkAvailable, isAndroid, isInstalledApp } from '../lib/install';

/**
 * Whether to offer the Android app: on an Android phone, in the browser (not inside
 * the installed app), and only once the APK is on the server.
 */
export function useApkInstall(): boolean {
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    if (!isAndroid() || isInstalledApp()) {
      return;
    }
    let active = true;
    apkAvailable()
      .then((available) => {
        if (active) {
          setOffer(available);
        }
      })
      .catch(() => {
        // Offline or blocked: the offer simply does not show; nothing else depends on it.
        if (active) {
          setOffer(false);
        }
      });
    return (): void => {
      active = false;
    };
  }, []);

  return offer;
}
