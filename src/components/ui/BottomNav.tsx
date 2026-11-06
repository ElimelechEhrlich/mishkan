import type { ReactElement } from 'react';
import { Link, NavLink } from 'react-router';
import { labels } from '../../constants/labels';
import { useNavMode } from '../../hooks/useNavMode';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { NavCell } from './NavCell';

type NavItem = {
  readonly to: string;
  readonly label: string;
  readonly icon: IconName;
};

const home: NavItem = { to: '/home', label: labels.nav.start, icon: 'home' };
const main: NavItem = { to: '/', label: labels.nav.home, icon: 'grid' };

const mainItems: readonly NavItem[] = [
  home,
  main,
  { to: '/tasks', label: labels.nav.open, icon: 'list' },
  { to: '/appointments', label: labels.nav.appointments, icon: 'calendar' },
  { to: '/goals', label: labels.nav.goals, icon: 'target' },
  { to: '/notes', label: labels.nav.notes, icon: 'note' },
  { to: '/shopping', label: labels.nav.shopping, icon: 'cart' },
  { to: '/debts', label: labels.nav.debts, icon: 'wallet' },
];

/**
 * The bar at the bottom. Home, which sees the whole house at once, has only home and main;
 * main and its tabs, organized by entity and domain, have every tab. Home stands first in both.
 */
type BottomNavProps = {
  /** How many are missing on the shopping list; given, home's bar has a way to it. */
  readonly shoppingCount?: number | undefined;
};

export function BottomNav({ shoppingCount }: BottomNavProps): ReactElement {
  const mode = useNavMode();
  if (mode === 'home') {
    // Home's bar is low: one rounded switch between home and main, its sign beside its name.
    return (
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-center border-t border-line bg-surface/95 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="flex gap-1 rounded-full bg-paper p-1 shadow-inner">
          {[home, main].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-9 items-center gap-1.5 rounded-full px-5 text-[13px] transition active:scale-[0.97] ${
                  isActive
                    ? 'bg-surface font-semibold text-primary shadow-card'
                    : 'font-medium text-muted'
                }`
              }
            >
              <Icon name={item.icon} className="size-4.5" />
              {item.label}
            </NavLink>
          ))}
        </div>
        {/* The shopping list, apart from the switch: a note stuck in the corner, with how many are missing. */}
        {shoppingCount !== undefined && (
          <Link
            to="/shopping"
            aria-label={labels.shopping.openList(shoppingCount)}
            className="absolute end-4 top-1/2 flex h-12 w-13 -translate-y-1/2 -rotate-6 flex-col items-center justify-center gap-0.5 bg-cream leading-none text-gold shadow-raised transition active:scale-95 active:rotate-0 [clip-path:polygon(0_0,100%_0,100%_74%,74%_100%,0_100%)]"
          >
            {/* The folded corner, where the note is cut. */}
            <span className="absolute right-0 bottom-0 size-3.5 bg-gold/45 [clip-path:polygon(0_0,100%_0,0_100%)]" />
            <span className="absolute inset-x-0 top-0 h-1.5 bg-gold/25" />
            <Icon name="cart" className="mt-1 size-4.5" />
            {shoppingCount > 0 && (
              <span className="font-display text-[17px] font-bold tabular-nums">
                {String(shoppingCount)}
              </span>
            )}
          </Link>
        )}
      </nav>
    );
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto grid max-w-xl grid-cols-8">
        {mainItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="m-1 flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] transition active:scale-[0.97]"
          >
            {({ isActive }) => <NavCell icon={item.icon} label={item.label} active={isActive} />}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
