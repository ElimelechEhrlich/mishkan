import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { navModeAfter } from '../lib/navMode';
import type { NavMode } from '../lib/navMode';

const storageKey = 'mishkan.navMode';

function readMode(): NavMode {
  try {
    return window.sessionStorage.getItem(storageKey) === 'main' ? 'main' : 'home';
  } catch {
    return 'home';
  }
}

/** The bar for this page: set by the tab last opened, kept while the app stays open. */
export function useNavMode(): NavMode {
  const { pathname } = useLocation();
  const mode = useMemo(() => navModeAfter(pathname, readMode()), [pathname]);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, mode);
    } catch {
      // Private mode: the bar follows the tabs alone.
    }
  }, [mode]);
  return mode;
}
