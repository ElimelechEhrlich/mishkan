import type { ReactElement } from 'react';
import { Icon } from './Icon';

type ErrorBannerProps = {
  readonly message: string | null;
};

export function ErrorBanner({ message }: ErrorBannerProps): ReactElement | null {
  if (message === null) {
    return null;
  }
  return (
    <p
      role="alert"
      dir="auto"
      className="flex items-start gap-2 rounded-xl bg-alert-soft px-3.5 py-2.5 text-[13px] leading-5 text-alert"
    >
      <Icon name="alert" className="mt-0.5 size-4" />
      {message}
    </p>
  );
}
