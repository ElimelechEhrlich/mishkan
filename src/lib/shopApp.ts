import { labels } from '../constants/labels';

/**
 * The shopping app: the same site, installed on its own as "קניות" from /shop, with the shopping
 * pages only. Its pages live under /shop, so moving between them stays inside its own app.
 */
export const shopBase = '/shop';

/** Whether a page is of the shopping app. */
export function inShopApp(pathname: string): boolean {
  return pathname === shopBase || pathname.startsWith(`${shopBase}/`);
}

/**
 * A path of the app as the shopping app has it: the shopping pages and an item's page under
 * /shop; anything else as it is (it opens the whole app).
 */
export function shopPathOf(path: string, inShop: boolean): string {
  if (!inShop) {
    return path;
  }
  if (path === '/shopping' || path.startsWith('/shopping?') || path.startsWith('/shopping/')) {
    return `${shopBase}${path.slice('/shopping'.length)}`;
  }
  if (path.startsWith('/item/')) {
    return `${shopBase}${path}`;
  }
  return path;
}

/**
 * Opened as the shopping app: the page offers the shopping app's own manifest (its name, icon
 * and start), so installing it from here adds an icon of its own.
 */
export function offerShopApp(): void {
  if (!inShopApp(window.location.pathname)) {
    return;
  }
  document.title = labels.install.shopAppName;
  const link = document.querySelector('link[rel="manifest"]');
  if (link instanceof HTMLLinkElement) {
    link.href = '/shop.webmanifest';
  } else {
    const added = document.createElement('link');
    added.rel = 'manifest';
    added.href = '/shop.webmanifest';
    document.head.appendChild(added);
  }
}
