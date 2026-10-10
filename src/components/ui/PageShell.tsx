import type { ReactElement, ReactNode } from 'react';
import { BottomNav } from './BottomNav';

type PageShellProps = {
  readonly title: string;
  readonly incompleteCount: number;
  readonly actions: ReactNode;
  readonly children: ReactNode;
};

export function PageShell({
  title,
  incompleteCount,
  actions,
  children,
}: PageShellProps): ReactElement {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-ink px-4 py-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions}
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-40">{children}</main>
      <BottomNav incompleteCount={incompleteCount} />
    </div>
  );
}
