import type { ReactElement } from 'react';
import { Icon } from './Icon';

type EmptyStateProps = {
  readonly text: string;
};

export function EmptyState({ text }: EmptyStateProps): ReactElement {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center text-sm text-muted">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface text-faint shadow-card">
        <Icon name="inbox" className="size-6" />
      </span>
      <p>{text}</p>
    </div>
  );
}
