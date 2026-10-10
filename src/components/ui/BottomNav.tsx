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

function linkClass({ isActive }: { readonly isActive: boolean }): string {
  const tone = isActive ? 'text-primary' : 'text-muted';
  return `relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${tone}`;
}

export function BottomNav({ incompleteCount }: BottomNavProps): ReactElement {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <span className="relative">
              <Icon name={item.icon} className="size-6" />
              {item.to === '/incomplete' && incompleteCount > 0 && (
                <span className="absolute -end-3 -top-2 flex min-w-5 items-center justify-center rounded-full bg-alert px-1 text-[11px] leading-5 font-bold text-white">
                  {String(incompleteCount)}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
