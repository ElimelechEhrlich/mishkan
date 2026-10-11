import type { ReactElement, ReactNode } from 'react';

type CardProps = {
  readonly children: ReactNode;
  readonly title?: string;
  /** Shown at the end of the title row. */
  readonly aside?: ReactNode;
};

export function Card({ children, title, aside }: CardProps): ReactElement {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      {title !== undefined && (
        <div className="flex min-h-5 items-center justify-between gap-2">
          <h2 className="text-[13px] font-bold tracking-wide text-muted">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
