import type { ReactElement } from 'react';
import { Icon } from './Icon';

type EmptyStateProps = {
  readonly text: string;
};

export function EmptyState({ text }: EmptyStateProps): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-muted">
      <span className="flex size-14 items-center justify-center rounded-full bg-line/60">
        <Icon name="inbox" className="size-7" />
      </span>
      <p>{text}</p>
    </div>
  );
}
