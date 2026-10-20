import { useState } from 'react';
import type { ReactElement } from 'react';
import { NavLink, useLocation } from 'react-router';
import { labels } from '../../constants/labels';
import type { IconName } from './Icon';
import { MoreSheet, morePages } from './MoreSheet';
import { NavCell } from './NavCell';

type NavItem = {
  readonly to: string;
  readonly label: string;
  readonly icon: IconName;
};

const navItems: readonly NavItem[] = [
  { to: '/home', label: labels.nav.start, icon: 'home' },
  { to: '/', label: labels.nav.home, icon: 'grid' },
  { to: '/shopping', label: labels.nav.shopping, icon: 'cart' },
];

const cell =
  'm-1 flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px]';

/**
 * The bar at the bottom: home, main, shopping, and "עוד" for the other pages. On one of those,
 * "עוד" shows its name and sign.
 */
export function BottomNav(): ReactElement {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const current = morePages.find((page) => pathname.startsWith(page.to));
  return (
    <>
      {moreOpen && (
        <MoreSheet
          onClose={() => {
            setMoreOpen(false);
          }}
        />
      )}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={cell}>
              {({ isActive }) => <NavCell icon={item.icon} label={item.label} active={isActive} />}
            </NavLink>
          ))}
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => {
              setMoreOpen(!moreOpen);
            }}
            className={`${cell} transition active:scale-[0.97]`}
          >
            <NavCell
              icon={current?.icon ?? 'more'}
              label={current?.label ?? labels.nav.more}
              active={moreOpen || current !== undefined}
            />
          </button>
        </div>
      </nav>
    </>
  );
}
