import type { ReactElement } from 'react';

type StatusScreenProps = {
  readonly text: string;
  readonly isError?: boolean;
};

export function StatusScreen({ text, isError = false }: StatusScreenProps): ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <p className={isError ? 'text-alert' : 'text-muted'} role={isError ? 'alert' : 'status'}>
        {text}
      </p>
    </div>
  );
}
