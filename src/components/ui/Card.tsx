import type { ReactElement, ReactNode } from 'react';

type CardProps = {
  readonly children: ReactNode;
  /** A small heading above the card. */
  readonly title?: string;
  /** Shown at the end of the heading row. */
  readonly aside?: ReactNode;
};

/** A white card; its title sits above it, like a section of a settings list. */
export function Card({ children, title, aside }: CardProps): ReactElement {
  return (
    <section className="flex flex-col gap-1.5">
      {title !== undefined && (
        <div className="flex min-h-5 items-center justify-between gap-2 px-1">
          <h2 className="text-xs font-bold tracking-wide text-muted">{title}</h2>
          {aside}
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">{children}</div>
    </section>
  );
}
