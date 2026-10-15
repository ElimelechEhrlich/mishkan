/** Where the Android app (a TWA wrapping this site) is served from, once it is built. */
export const apkPath = '/mishkan.apk';

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/** Whether the app is already open as an installed app rather than in a browser tab. */
export function isInstalledApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    document.referrer.startsWith('android-app://')
  );
}

/**
 * Whether the APK is on the server. Missing files fall back to the app's page,
 * so only an answer that is not HTML counts.
 */
export async function apkAvailable(): Promise<boolean> {
  const response = await fetch(apkPath, { method: 'HEAD', cache: 'no-store' });
  const type = response.headers.get('content-type') ?? '';
  return response.ok && !type.includes('text/html');
}

const apkVersionKey = 'mishkan.apkVersion';
const inApkKey = 'mishkan.inApk';
const latestApkKey = 'mishkan.apkLatest';
/** The version downloaded from the update offer, until the app is next opened from its icon. */
const updatingToKey = 'mishkan.apkUpdatingTo';

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function forget(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Blocked storage: nothing was kept to forget.
  }
}

function store(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Blocked storage: the app is not recognised, and no update is offered.
  }
}

/**
 * Notes, on opening, that the site runs inside the Android app, and which version of it: the
 * app opens the site with `?apk=N` (an app from before that opens it without, as version 1).
 */
export function rememberApkLaunch(): void {
  const version = new URLSearchParams(window.location.search).get('apk');
  if (version !== null && /^\d+$/.test(version)) {
    store(apkVersionKey, version);
    store(inApkKey, 'yes');
    // Opened from the icon, the app tells its own version: an update that did not install
    // is offered again.
    forget(updatingToKey);
  } else if (document.referrer.startsWith('android-app://app.vercel.mishkan.twa')) {
    store(inApkKey, 'yes');
  }
}

/** The version of the Android app on this phone; null when the site is not opened from it. */
export function installedApkVersion(): number | null {
  if (readStored(inApkKey) !== 'yes') {
    return null;
  }
  return Number(readStored(apkVersionKey) ?? '1');
}

/** The newest version of the Android app, as last learned from the site. */
export function knownLatestApk(): number | null {
  const latest = readStored(latestApkKey);
  return latest === null ? null : Number(latest);
}

const latestListeners = new Set<() => void>();

/** Follows what is known of the newest version, so the settings button's dot updates at once. */
export function onLatestApkChange(listener: () => void): () => void {
  latestListeners.add(listener);
  return () => {
    latestListeners.delete(listener);
  };
}

function isVersionFile(value: unknown): value is { readonly version: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'number'
  );
}

/**
 * Asks the site for the newest version of the Android app, and keeps it. Asked when the app
 * opens, so the dot and the offer are there before the settings are.
 */
export async function fetchLatestApk(): Promise<number | null> {
  const response = await fetch('/apk-version.json', { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  const body: unknown = await response.json();
  if (!isVersionFile(body)) {
    return null;
  }
  if (knownLatestApk() !== body.version) {
    store(latestApkKey, String(body.version));
    latestListeners.forEach((listener) => {
      listener();
    });
  }
  return body.version;
}

/** Whether the Android app on this phone is older than the newest one. */
export function apkUpdateDue(latest: number | null): boolean {
  const installed = installedApkVersion();
  const updatingTo = Number(readStored(updatingToKey) ?? '0');
  return installed !== null && latest !== null && latest > Math.max(installed, updatingTo);
}

/**
 * The update was downloaded: the offer and the dot go away at once. Android's "open" after
 * installing returns to the page that was open, so the app's new version is only told when it
 * is next opened from its icon; if it did not install, the offer comes back then.
 */
export function markApkUpdating(): void {
  const latest = knownLatestApk();
  if (latest !== null) {
    store(updatingToKey, String(latest));
    latestListeners.forEach((listener) => {
      listener();
    });
  }
}
