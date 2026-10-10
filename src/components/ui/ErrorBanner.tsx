import type { ReactElement } from 'react';

type ErrorBannerProps = {
  readonly message: string | null;
};

export function ErrorBanner({ message }: ErrorBannerProps): ReactElement | null {
  if (message === null) {
    return null;
  }
  return (
    <p role="alert" dir="auto" className="border border-alert bg-surface px-3 py-2 text-sm text-alert">
      {message}
    </p>
  );
}
