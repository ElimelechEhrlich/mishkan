import type { ReactElement } from 'react';
import { NavLink } from 'react-router';
import { labels } from '../../constants/labels';

type BottomNavProps = {
  readonly incompleteCount: number;
};

function linkClass({ isActive }: { readonly isActive: boolean }): string {
  const tone = isActive ? 'bg-ink text-paper' : 'bg-surface text-ink';
  return `flex min-h-14 items-center justify-center gap-2 text-sm font-medium ${tone}`;
}

export function BottomNav({ incompleteCount }: BottomNavProps): ReactElement {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-2 border-t border-ink pb-[env(safe-area-inset-bottom)]">
      <NavLink to="/" end className={linkClass}>
        {labels.pages.open}
      </NavLink>
      <NavLink to="/incomplete" className={linkClass}>
        {labels.pages.incomplete}
        {incompleteCount > 0 && (
          <span className="bg-alert px-2 py-0.5 text-xs text-paper">{String(incompleteCount)}</span>
        )}
      </NavLink>
    </nav>
  );
}
