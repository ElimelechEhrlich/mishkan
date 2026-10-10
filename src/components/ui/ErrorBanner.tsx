import type { ReactElement } from 'react';

type ErrorBannerProps = {
  readonly message: string | null;
};

export function ErrorBanner({ message }: ErrorBannerProps): ReactElement | null {
  if (message === null) {
    return null;
  }
  return (
    <p role="alert" dir="auto" className="rounded-xl bg-alert-soft px-3.5 py-2.5 text-sm text-alert">
      {message}
    </p>
  );
}
