import { useEffect, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router';

type EntityStripLinkProps = {
  readonly to: string;
  readonly label: string;
  readonly toneClass: string;
  readonly current: boolean;
  readonly count: number;
  /** Moving between entity pages replaces the history entry, so "back" returns to the main page. */
  readonly replace: boolean;
  readonly children: ReactNode;
};

/** One icon of the entity strip, kept in view while it is the open one. */
export function EntityStripLink({
  to,
  label,
  toneClass,
  current,
  count,
  replace,
  children,
}: EntityStripLinkProps): ReactElement {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (current) {
      ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [current]);

  return (
    <Link
      ref={ref}
      to={to}
      replace={replace}
      aria-current={current ? 'page' : undefined}
      className="group flex w-16 shrink-0 flex-col items-center gap-1.5"
    >
      <span
        className={`relative flex size-13 items-center justify-center rounded-2xl font-display text-xl font-bold text-white shadow-card transition duration-300 group-active:scale-90 ${toneClass} ${
          current ? 'scale-110 ring-3 ring-primary ring-offset-2 ring-offset-paper' : 'opacity-85'
        }`}
      >
        {children}
        {count > 0 && (
          <span className="absolute -end-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-surface px-1 text-[11px] leading-5 font-bold text-ink shadow-card">
            {String(count)}
          </span>
        )}
      </span>
      <span
        className={`w-full truncate text-center text-xs transition-colors ${
          current ? 'font-bold text-ink' : 'text-muted'
        }`}
      >
        {label}
      </span>
      <span
        className={`h-1 rounded-full bg-primary transition-all duration-300 ${current ? 'w-5' : 'w-0'}`}
      />
    </Link>
  );
}
