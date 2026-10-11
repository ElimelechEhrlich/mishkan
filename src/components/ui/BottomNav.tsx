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
  { to: '/', label: labels.nav.open, icon: 'list' },
  { to: '/goals', label: labels.nav.goals, icon: 'target' },
  { to: '/debts', label: labels.nav.debts, icon: 'wallet' },
  { to: '/incomplete', label: labels.nav.incomplete, icon: 'alert' },
];

export function BottomNav({ incompleteCount }: BottomNavProps): ReactElement {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto grid max-w-[34rem] grid-cols-4 rounded-[28px] bg-surface/90 px-1 shadow-nav backdrop-blur-md">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex min-h-[68px] flex-col items-center justify-center gap-0.5 text-xs"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`relative flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-primary-soft text-primary' : 'text-muted'
                  }`}
                >
                  <Icon name={item.icon} className="size-6" />
                  {item.to === '/incomplete' && incompleteCount > 0 && (
                    <span className="absolute -top-1 end-1 flex min-w-5 items-center justify-center rounded-full bg-alert px-1 text-[11px] leading-5 font-bold text-white">
                      {String(incompleteCount)}
                    </span>
                  )}
                </span>
                <span className={isActive ? 'font-bold text-primary' : 'font-medium text-muted'}>
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
