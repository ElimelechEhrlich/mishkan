/**
 * Which bar is at the bottom: home's (home and main only), or main's, organized by entity and
 * domain, with every tab. The tabs set it; any other page (an item, search, settings) keeps the
 * one it was opened from.
 */
export type NavMode = 'home' | 'main';

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
  if (pathname === '/home') {
    return 'home';
  }
  if (mainTabs.some((tab) => (tab === '/' ? pathname === '/' : pathname.startsWith(tab)))) {
    return 'main';
  }
  return previous;
}
