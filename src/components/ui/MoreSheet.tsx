import type { ReactElement } from 'react';
import { NavLink } from 'react-router';
import { labels } from '../../constants/labels';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/** The pages under "עוד", in the order the bar once had them. */
export const morePages: readonly {
  readonly to: string;
  readonly label: string;
  readonly icon: IconName;
}[] = [
  { to: '/tasks', label: labels.nav.open, icon: 'list' },
  { to: '/appointments', label: labels.nav.appointments, icon: 'calendar' },
  { to: '/goals', label: labels.nav.goals, icon: 'target' },
  { to: '/notes', label: labels.nav.notes, icon: 'note' },
  { to: '/debts', label: labels.nav.debts, icon: 'wallet' },
];

type MoreSheetProps = {
  readonly onClose: () => void;
};

/** The rest of the pages, large, in a sheet from the bottom; a tap goes there and closes it. */
export function MoreSheet({ onClose }: MoreSheetProps): ReactElement {
  return (
    <div
      className="fixed inset-0 z-20 flex animate-fade-in flex-col justify-end bg-ink/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <nav
        className="rounded-t-3xl bg-surface px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-float"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line" />
        <div className="grid grid-cols-3 gap-2">
          {morePages.map((page) => (
            <NavLink
              key={page.to}
              to={page.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl text-[14px] font-medium transition active:scale-[0.97] ${
                  isActive ? 'bg-primary-soft text-primary' : 'bg-paper text-ink'
                }`
              }
            >
              <Icon name={page.icon} className="size-6.5 text-primary" />
              {page.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
