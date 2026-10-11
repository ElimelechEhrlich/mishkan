import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

type OverviewCardProps = {
  readonly icon: IconName;
  readonly title: string;
  /** One line under the title, readable while the card is folded. */
  readonly summary: string;
  /** The page with everything of this kind. */
  readonly to: string;
  readonly linkLabel: string;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
};

/** One kind on the main page: a header that folds and unfolds, a short body, and a way to its tab. */
export function OverviewCard({
  icon,
  title,
  summary,
  to,
  linkLabel,
  defaultOpen = false,
  children,
}: OverviewCardProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-start active:bg-paper"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
          <Icon name={icon} className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-base font-semibold">{title}</span>
          <span className="truncate text-xs text-muted">{summary}</span>
        </span>
        <Icon
          name="down"
          className={`size-4 text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="flex animate-fade-in flex-col border-t border-line">
          {children}
          <Link
            to={to}
            className="flex items-center justify-between border-t border-line px-3.5 py-2.5 text-[13px] font-semibold text-primary active:bg-paper"
          >
            {linkLabel}
            <Icon name="forward" className="size-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
