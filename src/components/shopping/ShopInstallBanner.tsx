import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useInstallOffer } from '../../hooks/useInstallOffer';
import { Icon } from '../ui/Icon';

/**
 * At the head of the shopping app opened in the browser: installs it as an app of its own,
 * when the browser offers to. Nothing once it is installed, or where it cannot be.
 */
export function ShopInstallBanner(): ReactElement | null {
  const offer = useInstallOffer();
  if (!offer.offered) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={offer.install}
      className="flex items-center gap-3 rounded-2xl bg-cream p-3 text-start shadow-card transition active:scale-[0.99]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-gold">
        <Icon name="download" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">{labels.install.shopInstall}</span>
        <span className="text-[13px] text-muted">{labels.install.shopInstallHint}</span>
      </span>
      <span className="shrink-0 text-[14px] font-semibold text-primary">
        {labels.install.install}
      </span>
    </button>
  );
}
