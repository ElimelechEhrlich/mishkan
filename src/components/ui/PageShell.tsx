import type { ReactElement, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { labels } from '../../constants/labels';
import { BottomNav } from './BottomNav';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type PageShellProps = {
  readonly title: string;
  /** A quiet line: above the title on main pages (such as today's date), below it on inner ones. */
  readonly subtitle?: string | undefined;
  readonly incompleteCount: number;
  readonly children: ReactNode;
  /** Inner pages show a back button instead of the header links. */
  readonly inner?: boolean;
  /** Replaces the title on an inner page that draws its own heading. */
  readonly heading?: ReactNode;
};

const headerLinkClass =
  'flex size-10 items-center justify-center rounded-xl text-muted transition active:bg-line';

export function PageShell({
  title,
  subtitle,
  incompleteCount,
  children,
  inner = false,
  heading,
}: PageShellProps): ReactElement {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 bg-paper/85 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur-md">
        {inner ? (
          <div className="flex flex-col gap-1">
            <div className="-ms-2 flex items-center">
              <IconButton
                icon="back"
                label={labels.actions.back}
                onClick={() => {
                  void navigate(-1);
                }}
              />
            </div>
            {heading ?? (
              <div className="flex flex-col">
                <h1 className="truncate font-display text-2xl leading-8 font-bold tracking-tight">
                  {title}
                </h1>
                {subtitle !== undefined && <p className="text-sm text-muted">{subtitle}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-1">
            <div className="flex min-w-0 flex-1 flex-col">
              {subtitle !== undefined && (
                <p className="text-[13px] font-medium text-muted">{subtitle}</p>
              )}
              <h1 className="truncate font-display text-[30px] leading-9 font-bold tracking-tight">
                {title}
              </h1>
            </div>
            <Link
              to="/incomplete"
              aria-label={labels.nav.incomplete}
              className={`relative ${headerLinkClass}`}
            >
              <Icon name="alert" className="size-5.5" />
              {incompleteCount > 0 && (
                <span className="absolute top-0.5 end-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-paper bg-alert px-1 text-[10px] font-bold text-white">
                  {String(incompleteCount)}
                </span>
              )}
            </Link>
            <Link to="/done" aria-label={labels.actions.showDone} className={headerLinkClass}>
              <Icon name="done" className="size-5.5" />
            </Link>
            <Link to="/settings" aria-label={labels.actions.settings} className={headerLinkClass}>
              <Icon name="settings" className="size-5.5" />
            </Link>
          </div>
        )}
      </header>
      <main className="flex flex-1 animate-fade-in flex-col gap-4 px-4 pt-1 pb-40">{children}</main>
      <BottomNav />
    </div>
  );
}
