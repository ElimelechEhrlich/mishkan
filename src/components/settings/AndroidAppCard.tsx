import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useLatestApk } from '../../hooks/useLatestApk';
import { apkFileName, apkUrl, installedApkVersion } from '../../lib/install';
import { Icon } from '../ui/Icon';

/**
 * The Android app, always in the settings: its newest version (and the one on this phone,
 * inside the app) and a download of it, under a name of its own so the newest is opened.
 */
export function AndroidAppCard(): ReactElement {
  const latest = useLatestApk();
  const installed = installedApkVersion();
  const version = labels.install.version(latest, installed);
  return (
    <section className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon name="download" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">{labels.install.appTitle}</span>
        {version !== '' && <span className="text-[13px] text-muted">{version}</span>}
        <span className="text-[12px] leading-5 text-faint">{labels.install.appHint}</span>
      </span>
      <a
        href={apkUrl(latest)}
        download={apkFileName(latest)}
        className="flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3.5 text-[14px] font-semibold text-primary transition active:scale-[0.97]"
      >
        {labels.install.download}
      </a>
    </section>
  );
}
