import type { ReactElement } from 'react';
import { NavLink } from 'react-router';
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
export function BottomNav(): ReactElement {
  const mode = useNavMode();
  if (mode === 'home') {
    // Home's bar is low: one rounded switch between home and main, its sign beside its name.
    return (
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center border-t border-line bg-surface/95 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-md">
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
