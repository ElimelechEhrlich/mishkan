import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useCalendarLink } from '../../hooks/useCalendarLink';
import { useCopyText } from '../../hooks/useCopyText';
import { Button } from '../ui/Button';
import { ConfirmButton } from '../ui/ConfirmButton';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Icon } from '../ui/Icon';
import { ListRow } from '../ui/ListRow';

/**
 * Google Calendar: one row that adds the parent's calendar, and folded under it the way to
 * add it by hand in the browser, with the link to copy and to replace.
 */
export function CalendarCard(): ReactElement {
  const calendar = useCalendarLink();
  const { copied, copy } = useCopyText();
  const [manual, setManual] = useState(false);

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.calendar.title}</h2>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {calendar.addUrl === null ? (
          <ListRow
            icon="calendar"
            iconClass="bg-primary text-white"
            title={labels.calendar.add}
            subtitle={calendar.busy ? labels.status.loading : labels.calendar.hint}
          />
        ) : (
          <a
            href={calendar.addUrl}
            target="_blank"
            rel="noreferrer"
            className="block active:bg-paper"
          >
            <ListRow
              icon="calendar"
              iconClass="bg-primary text-white"
              title={labels.calendar.add}
              subtitle={labels.calendar.hint}
              trailing={<Icon name="forward" className="size-4 text-faint" />}
            />
          </a>
        )}
        <div className="border-t border-line">
          <ListRow
            icon="help"
            iconClass="bg-line text-muted"
            title={labels.calendar.manualTitle}
            onClick={() => {
              setManual(!manual);
            }}
            trailing={
              <Icon
                name="down"
                className={`size-4 text-faint transition-transform ${manual ? 'rotate-180' : ''}`}
              />
            }
          />
          {manual && calendar.link !== null && (
            <div className="flex flex-col gap-3 px-4 pb-4">
              <ol className="flex list-decimal flex-col gap-1 ps-5 text-[14px] leading-6">
                {labels.calendar.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Button
                variant="soft"
                onClick={() => {
                  if (calendar.link !== null) {
                    copy(calendar.link);
                  }
                }}
              >
                {copied ? labels.calendar.copied : labels.calendar.copy}
              </Button>
              <p className="text-[12px] leading-5 text-muted">{labels.calendar.private}</p>
              <div className="self-center">
                <ConfirmButton
                  label={labels.calendar.renew}
                  confirmLabel={labels.calendar.confirmRenew}
                  icon="repeat"
                  onConfirm={calendar.renew}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <ErrorBanner message={calendar.error} />
    </section>
  );
}
