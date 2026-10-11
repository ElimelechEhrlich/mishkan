import type { ReactElement, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { labels } from '../../constants/labels';
import { BottomNav } from './BottomNav';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type PageShellProps = {
  readonly title: string;
  /** A quiet line under the title, such as today's date. */
  readonly subtitle?: string | undefined;
  readonly incompleteCount: number;
  readonly children: ReactNode;
  /** Inner pages show a back button instead of the header links. */
  readonly inner?: boolean;
};

const headerLinkClass =
  'flex size-10 items-center justify-center rounded-full text-muted transition active:bg-line';

export function PageShell({
  title,
  subtitle,
  incompleteCount,
  children,
  inner = false,
}: PageShellProps): ReactElement {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 bg-paper/90 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur">
        {inner && (
          <IconButton
            icon="back"
            label={labels.actions.back}
            onClick={() => {
              void navigate(-1);
            }}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1
            className={`truncate font-display font-bold ${inner ? 'text-2xl' : 'text-[32px] leading-10'}`}
          >
            {title}
          </h1>
          {subtitle !== undefined && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {!inner && (
          <Link to="/done" aria-label={labels.actions.showDone} className={headerLinkClass}>
            <Icon name="done" className="size-6" />
          </Link>
        )}
        {!inner && (
          <Link to="/settings" aria-label={labels.actions.settings} className={headerLinkClass}>
            <Icon name="settings" className="size-6" />
          </Link>
        )}
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-1 pb-44">{children}</main>
      <BottomNav incompleteCount={incompleteCount} />
    </div>
  );
}
