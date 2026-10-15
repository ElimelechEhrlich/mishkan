import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UsePushNotifications } from '../../hooks/usePushNotifications';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Icon } from '../ui/Icon';

/** Turns reminders on this device on or off. */
type NotificationsCardProps = {
  /** Shared with the first steps above, so turning it on shows in both. */
  readonly push: UsePushNotifications;
};

export function NotificationsCard({ push }: NotificationsCardProps): ReactElement {
  const on = push.status === 'on';
  const note =
    push.status === 'blocked'
      ? labels.push.blocked
      : push.status === 'unsupported'
        ? labels.push.unsupported
        : labels.push.hint;

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.push.title}</h2>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${
              on ? 'bg-primary text-white' : 'bg-line text-muted'
            }`}
          >
            <Icon name="bell" className="size-5" />
          </span>
          <span className="flex-1 text-[15px] font-medium">
            {on ? labels.push.on : labels.push.off}
          </span>
          {(push.status === 'on' || push.status === 'off') && (
            <Button
              variant={on ? 'ghost' : 'primary'}
              disabled={push.busy}
              onClick={on ? push.disable : push.enable}
            >
              {on ? labels.push.disable : labels.push.enable}
            </Button>
          )}
        </div>
        <p className="text-[13px] leading-5 text-muted">{note}</p>
        <ErrorBanner message={push.error} />
      </div>
    </section>
  );
}
