import { useCallback } from 'react';
import { useLocation } from 'react-router';
import { inShopApp, shopPathOf } from '../lib/shopApp';

/**
 * Paths for links of the shopping pages: under /shop when opened as the shopping app, so
 * moving between them stays inside it; as they are in the whole app.
 */
export function useShopPath(): (path: string) => string {
  const { pathname } = useLocation();
  const inShop = inShopApp(pathname);
  return useCallback((path: string) => shopPathOf(path, inShop), [inShop]);
}

/** Whether the page is open as the shopping app. */
export function useInShopApp(): boolean {
  return inShopApp(useLocation().pathname);
}
