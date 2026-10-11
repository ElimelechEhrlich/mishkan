/**
 * The browser side of web push: whether this device can get notifications, and turning
 * its subscription on and off. The public key pairs with the private key the
 * send-reminders edge function signs with; it is public by design.
 */
const vapidPublicKey =
  'BBHcZzsUCkp4SB-tqiWJ_USCf85lwFuAysNnpQ1Anlk3xl1VNDO1ITUhp_9ASmeJfP3NhJ3hvVwCe81cqhMgV3M';

export type DeviceSubscription = {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
};

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission {
  return Notification.permission;
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

function toDevice(subscription: PushSubscription): DeviceSubscription {
  const keys = subscription.toJSON().keys ?? {};
  const p256dh = keys['p256dh'];
  const auth = keys['auth'];
  if (p256dh === undefined || auth === undefined) {
    throw new Error('push subscription has no keys');
  }
  return { endpoint: subscription.endpoint, p256dh, auth };
}

/** This device's subscription, if notifications are on. */
export async function currentSubscription(): Promise<DeviceSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription === null ? null : toDevice(subscription);
}

/** Asks for permission if needed and subscribes this device. Null when permission is refused. */
export async function subscribeDevice(): Promise<DeviceSubscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(vapidPublicKey),
    }));
  return toDevice(subscription);
}

/** Turns this device's notifications off; returns the endpoint that was removed, if any. */
export async function unsubscribeDevice(): Promise<string | null> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription === null) {
    return null;
  }
  await subscription.unsubscribe();
  return subscription.endpoint;
}
