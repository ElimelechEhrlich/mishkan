import { useEffect } from 'react';
import { currentSubscription, notificationPermission, pushSupported } from '../lib/push';
import { saveSubscription } from '../services/pushService';

/**
 * Once a parent of a household is signed in, saves this device's notification subscription
 * again if notifications are on. The browser renews a subscription now and then; saved only
 * from settings, the new one would be missed and reminders silently lost.
 */
export function useKeepPushSubscription(memberId: string | null): void {
  useEffect(() => {
    if (memberId === null || !pushSupported() || notificationPermission() !== 'granted') {
      return;
    }
    // Quiet by design: settings shows any trouble when notifications are turned on there.
    currentSubscription()
      .then((device) => (device === null ? undefined : saveSubscription(device)))
      .catch(() => undefined);
  }, [memberId]);
}
