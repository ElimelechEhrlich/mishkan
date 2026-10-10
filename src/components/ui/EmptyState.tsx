import type { ReactElement } from 'react';

type EmptyStateProps = {
  readonly text: string;
};

export function EmptyState({ text }: EmptyStateProps): ReactElement {
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-muted">
      {text}
    </p>
  );
}
