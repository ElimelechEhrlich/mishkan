import type { ReactElement } from 'react';
import { NavLink } from 'react-router';
import { labels } from '../../constants/labels';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type BottomNavProps = {
  readonly incompleteCount: number;
};

type NavItem = {
  readonly to: string;
  readonly label: string;
  readonly icon: IconName;
};

const navItems: readonly NavItem[] = [
  { to: '/', label: labels.nav.home, icon: 'home' },
  { to: '/tasks', label: labels.nav.open, icon: 'list' },
  { to: '/goals', label: labels.nav.goals, icon: 'target' },
  { to: '/notes', label: labels.nav.notes, icon: 'note' },
  { to: '/shopping', label: labels.nav.shopping, icon: 'cart' },
  { to: '/debts', label: labels.nav.debts, icon: 'wallet' },
  { to: '/incomplete', label: labels.nav.incomplete, icon: 'alert' },
];

export function BottomNav({ incompleteCount }: BottomNavProps): ReactElement {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto grid max-w-xl grid-cols-7">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px]"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`relative flex items-center justify-center transition-colors ${
                    isActive ? 'text-primary' : 'text-faint'
                  }`}
                >
                  <Icon name={item.icon} className="size-6" />
                  {item.to === '/incomplete' && incompleteCount > 0 && (
                    <span className="absolute -top-1.5 -end-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-alert px-1 text-[10px] font-bold text-white">
                      {String(incompleteCount)}
                    </span>
                  )}
                </span>
                <span className={isActive ? 'font-semibold text-primary' : 'font-medium text-muted'}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
