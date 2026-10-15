import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useApkUpdate } from '../../hooks/useApkUpdate';
import { apkPath, markApkUpdating } from '../../lib/install';
import { Icon } from '../ui/Icon';

/**
 * At the head of the settings, while the Android app on this phone is older than the newest:
 * one tap downloads the new one, which installs over it.
 */
export function ApkUpdateCard(): ReactElement | null {
  const due = useApkUpdate();
  if (!due) {
    return null;
  }
  return (
    <a
      href={apkPath}
      download="mishkan.apk"
      onClick={markApkUpdating}
      className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5 active:opacity-80"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <Icon name="download" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold text-ink">{labels.install.updateTitle}</span>
        <span className="text-[13px] leading-5 text-muted">{labels.install.updateHint}</span>
      </span>
      <span className="shrink-0 text-[14px] font-semibold text-primary">
        {labels.install.update}
      </span>
    </a>
  );
}
