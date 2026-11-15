import { inShopApp } from './shopApp';

/**
 * Which bar is at the bottom: home's (home and main only), main's, organized by entity and
 * domain, with every tab, or the shopping app's. The tabs set it; any other page (an item, search, settings) keeps the
 * one it was opened from.
 */
export type NavMode = 'home' | 'main' | 'shop';

export const mainTabs = [
  '/',
  '/tasks',
  '/appointments',
  '/goals',
  '/notes',
  '/shopping',
  '/debts',
] as const;

export function navModeAfter(pathname: string, previous: NavMode): NavMode {
  // The shopping app has its own bar, on every page of it.
  if (inShopApp(pathname)) {
    return 'shop';
  }
  if (pathname === '/home') {
    return 'home';
  }
  if (mainTabs.some((tab) => (tab === '/' ? pathname === '/' : pathname.startsWith(tab)))) {
    return 'main';
  }
  return previous;
}
