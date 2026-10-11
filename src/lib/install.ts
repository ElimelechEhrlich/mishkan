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
