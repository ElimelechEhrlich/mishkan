import type { ReactElement, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { labels } from '../../constants/labels';
import type { EverythingShortcut } from '../../hooks/useEverythingShortcut';
import { BottomNav } from './BottomNav';
import { EverythingButton } from './EverythingButton';
import { Icon } from './Icon';
import { useDocked } from '../../hooks/useScopeDock';
import { hasAppHistory } from '../../lib/appHistory';
import { IconButton } from './IconButton';
import { UndoToast } from './UndoToast';

type PageShellProps = {
  readonly title: string;
  /** A shorter title, such as the bottom bar's name, for when the entity's picture docks. */
  readonly shortTitle?: string | undefined;
  /** A quiet line: above the title on main pages (such as today's date), below it on inner ones. */
  readonly subtitle?: string | undefined;
  readonly incompleteCount: number;
  /** What is late or due today, across the whole home; marked on the header's today link. */
  readonly todayCount: number;
  readonly children: ReactNode;
  /** Inner pages show a back button instead of the header links. */
  readonly inner?: boolean;
  /** Replaces the title on an inner page that draws its own heading. */
  readonly heading?: ReactNode;
  /** Leaves out the bottom bar, so a page typed into keeps the space above the keyboard. */
  readonly hideNav?: boolean;
  /** When given, a button in the header goes straight back to everything, once it is away. */
  readonly toEverything?: EverythingShortcut | undefined;
};

/** The red count on a header link, such as what waits for today. */
const countBadgeClass =
  'absolute top-0.5 end-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-paper bg-alert px-1 text-[10px] font-bold text-white';

const headerLinkClass =
  'flex size-10 items-center justify-center rounded-xl text-muted transition active:bg-line';

export function PageShell({
  title,
  shortTitle,
  subtitle,
  incompleteCount,
  todayCount,
  children,
  inner = false,
  heading,
  hideNav = false,
  toEverything,
}: PageShellProps): ReactElement {
  const navigate = useNavigate();
  // Once the entity's picture sits in the header there is less room: the title takes its
  // short form and a smaller size, and the line above it steps aside, so nothing is cut.
  const docked = useDocked();
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
                  // Opened straight from a notification or a link, there is nothing in the app
                  // to go back to: the main screen is shown instead of leaving the app.
                  void (hasAppHistory() ? navigate(-1) : navigate('/', { replace: true }));
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
                <p
                  className={`truncate text-[13px] font-medium text-muted transition-opacity duration-200 ${
                    docked ? 'opacity-0' : ''
                  }`}
                >
                  {subtitle}
                </p>
              )}
              <h1
                className={`truncate font-display leading-9 font-bold tracking-tight transition-[font-size] duration-200 ${
                  docked ? 'text-[24px]' : 'text-[30px]'
                }`}
              >
                {docked ? (shortTitle ?? title) : title}
              </h1>
            </div>
            {toEverything !== undefined && <EverythingButton shortcut={toEverything} />}
            <Link
              to="/today"
              aria-label={labels.pages.today}
              className={`relative ${headerLinkClass}`}
              data-dock-anchor
            >
              <Icon name="calendar" className="size-5.5" />
              {todayCount > 0 && <span className={countBadgeClass}>{String(todayCount)}</span>}
            </Link>
            <Link to="/search" aria-label={labels.pages.search} className={headerLinkClass}>
              <Icon name="search" className="size-5.5" />
            </Link>
            <Link
              to="/incomplete"
              aria-label={labels.nav.incomplete}
              className={`relative ${headerLinkClass}`}
            >
              <Icon name="alert" className="size-5.5" />
              {incompleteCount > 0 && (
                <span className={countBadgeClass}>{String(incompleteCount)}</span>
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
      <main
        className={`flex flex-1 animate-fade-in flex-col gap-4 px-4 pt-1 ${hideNav ? 'pb-8' : 'pb-40'}`}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
      <UndoToast />
    </div>
  );
}
