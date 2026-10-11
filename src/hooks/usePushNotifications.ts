import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import {
  currentSubscription,
  notificationPermission,
  pushSupported,
  subscribeDevice,
  unsubscribeDevice,
} from '../lib/push';
import { deleteSubscription, saveSubscription } from '../services/pushService';

/** Whether reminders reach this device. */
export type PushStatus = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on';

export type UsePushNotifications = {
  readonly status: PushStatus;
  readonly busy: boolean;
  readonly error: string | null;
  readonly enable: () => void;
  readonly disable: () => void;
};

/** Turning reminders on this device on and off. */
export function usePushNotifications(): UsePushNotifications {
  const [status, setStatus] = useState<PushStatus>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setStatus('unsupported');
      return;
    }
    let active = true;
    currentSubscription()
      .then(async (device) => {
        if (device !== null) {
          // Saved again in case the device moved to this account or the row was removed.
          await saveSubscription(device);
        }
        if (active) {
          setStatus(
            device !== null ? 'on' : notificationPermission() === 'denied' ? 'blocked' : 'off',
          );
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setStatus('off');
          setError(toMessage(caught));
        }
      });
    return (): void => {
      active = false;
    };
  }, []);

  const enable = useCallback((): void => {
    setBusy(true);
    setError(null);
    subscribeDevice()
      .then(async (device) => {
        if (device === null) {
          setStatus(notificationPermission() === 'denied' ? 'blocked' : 'off');
          return;
        }
        await saveSubscription(device);
        setStatus('on');
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      })
      .finally(() => {
        setBusy(false);
      });
  }, []);

  const disable = useCallback((): void => {
    setBusy(true);
    setError(null);
    unsubscribeDevice()
      .then(async (endpoint) => {
        if (endpoint !== null) {
          await deleteSubscription(endpoint);
        }
        setStatus('off');
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      })
      .finally(() => {
        setBusy(false);
      });
  }, []);

  return { status, busy, error, enable, disable };
}
