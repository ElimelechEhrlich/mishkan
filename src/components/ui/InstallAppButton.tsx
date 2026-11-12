import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useApkInstall } from '../../hooks/useApkInstall';
import { useLatestApk } from '../../hooks/useLatestApk';
import { apkFileName, apkUrl } from '../../lib/install';
import { Icon } from './Icon';

/** On Android, downloads the app to install; elsewhere, and inside the app, shows nothing. */
export function InstallAppButton(): ReactElement | null {
  const offer = useApkInstall();
  const latest = useLatestApk();
  if (!offer) {
    return null;
  }
  return (
    <a
      href={apkUrl(latest)}
      download={apkFileName(latest)}
      className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card active:bg-paper"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <Icon name="download" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">{labels.install.title}</span>
        <span className="text-[13px] leading-5 text-muted">{labels.install.hint}</span>
      </span>
    </a>
  );
}
