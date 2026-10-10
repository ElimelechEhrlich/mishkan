import type { ReactElement, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { labels } from '../../constants/labels';
import { BottomNav } from './BottomNav';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type PageShellProps = {
  readonly title: string;
  readonly incompleteCount: number;
  readonly children: ReactNode;
  /** Inner pages show a back button instead of the settings link. */
  readonly inner?: boolean;
};

export function PageShell({
  title,
  incompleteCount,
  children,
  inner = false,
}: PageShellProps): ReactElement {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center gap-2 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-2">
        {inner && (
          <IconButton
            icon="back"
            label={labels.actions.back}
            onClick={() => {
              void navigate(-1);
            }}
          />
        )}
        <h1 className="min-w-0 flex-1 truncate font-display text-3xl font-bold">{title}</h1>
        {!inner && (
          <Link
            to="/settings"
            aria-label={labels.actions.settings}
            className="flex size-10 items-center justify-center rounded-full text-muted"
          >
            <Icon name="settings" className="size-6" />
          </Link>
        )}
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-44">{children}</main>
      <BottomNav incompleteCount={incompleteCount} />
    </div>
  );
}
