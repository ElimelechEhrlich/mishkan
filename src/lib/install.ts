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

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
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

function isVersionFile(value: unknown): value is { readonly version: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'number'
  );
}

/** Asks the site for the newest version of the Android app, and keeps it. */
export async function fetchLatestApk(): Promise<number | null> {
  const response = await fetch('/apk-version.json', { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  const body: unknown = await response.json();
  if (!isVersionFile(body)) {
    return null;
  }
  store(latestApkKey, String(body.version));
  return body.version;
}

/** Whether the Android app on this phone is older than the newest one. */
export function apkUpdateDue(latest: number | null): boolean {
  const installed = installedApkVersion();
  return installed !== null && latest !== null && latest > installed;
}
