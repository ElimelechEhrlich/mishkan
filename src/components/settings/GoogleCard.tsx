import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useGoogleLink } from '../../hooks/useGoogleCalendar';
import { ConfirmButton } from '../ui/ConfirmButton';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Icon } from '../ui/Icon';
import { ListRow } from '../ui/ListRow';

/** "4.11, 20:49": when the calendar was last sent to. */
function shortWhen(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The household's Google Calendar: one row to connect the household's account, and once
 * connected, how the last send went and a way to disconnect.
 */
export function GoogleCard(): ReactElement {
  const google = useGoogleLink();
  const { status } = google;
  const revoked = status?.lastError === 'revoked';

  const subtitle =
    status === null
      ? labels.google.connectHint
      : revoked
        ? labels.google.revoked
        : status.lastError !== null
          ? labels.google.failed(status.lastError)
          : !status.ready || status.lastSyncAt === null
            ? labels.google.preparing
            : labels.google.lastSync(shortWhen(status.lastSyncAt));

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.google.title}</h2>
      <ErrorBanner message={google.error} />
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {status === null || revoked ? (
          <ListRow
            icon="calendar"
            iconClass="bg-primary text-white"
            title={status === null ? labels.google.connect : labels.google.reconnect}
            subtitle={google.busy ? labels.status.loading : subtitle}
            onClick={() => {
              if (!google.busy) {
                google.connect();
              }
            }}
            trailing={<Icon name="forward" className="size-4 text-faint" />}
          />
        ) : (
          <>
            <ListRow
              icon="calendar"
              iconClass="bg-primary-soft text-primary"
              title={labels.google.connected}
              subtitle={subtitle}
            />
            <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
              <p className="text-[13px] text-muted">{labels.google.disconnectHint}</p>
              <div className="self-start">
                <ConfirmButton
                  label={labels.google.disconnect}
                  confirmLabel={labels.google.confirmDisconnect}
                  onConfirm={google.disconnect}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
