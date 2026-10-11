import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Icon } from '../ui/Icon';

type EntityGroupProps = {
  readonly title: string;
  readonly count: number;
  /** The entity rows, then any row for adding one. */
  readonly children: ReactNode;
};

/** A group of entities of one sort in settings, under a heading that folds it. */
export function EntityGroup({ title, count, children }: EntityGroupProps): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <section className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex min-h-7 items-center gap-1.5 px-1 text-start"
      >
        <h2 className="text-xs font-bold tracking-wide text-muted">{title}</h2>
        <span className="rounded-full bg-line px-1.5 text-[11px] font-semibold text-muted">
          {String(count)}
        </span>
        <span className="flex-1" />
        <Icon
          name="down"
          className={`size-4 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="animate-fade-in overflow-hidden rounded-2xl bg-surface shadow-card">
          {children}
        </ul>
      )}
    </section>
  );
}
