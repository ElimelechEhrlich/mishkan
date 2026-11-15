import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { shopBase } from '../../lib/shopApp';
import { Icon } from '../ui/Icon';

/**
 * The shopping app in the settings: what it is, and a way to it. It opens as a whole page (not
 * inside this one), so the browser offers it with its own name and icon to install.
 */
export function ShopAppCard(): ReactElement {
  return (
    <section className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-gold">
        <Icon name="cart" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">{labels.install.shopTitle}</span>
        <span className="text-[12px] leading-5 text-muted">{labels.install.shopHint}</span>
      </span>
      <a
        href={shopBase}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-9 shrink-0 items-center rounded-full bg-primary-soft px-3.5 text-[14px] font-semibold text-primary transition active:scale-[0.97]"
      >
        {labels.install.shopOpen}
      </a>
    </section>
  );
}
