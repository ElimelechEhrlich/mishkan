import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useCalendarLink } from '../../hooks/useCalendarLink';
import { useCopyText } from '../../hooks/useCopyText';
import { Button } from '../ui/Button';
import { ConfirmButton } from '../ui/ConfirmButton';
import { ErrorBanner } from '../ui/ErrorBanner';

/** The parent's own Google Calendar link, and how to add it to the calendar once. */
export function CalendarCard(): ReactElement {
  const calendar = useCalendarLink();
  const { copied, copy } = useCopyText();

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.calendar.title}</h2>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-[13px] leading-5 text-muted">{labels.calendar.hint}</p>
        {calendar.link === null ? (
          <Button disabled={calendar.busy} onClick={calendar.show}>
            {labels.calendar.show}
          </Button>
        ) : (
          <>
            <ol className="flex list-decimal flex-col gap-1 ps-5 text-[14px] leading-6">
              {labels.calendar.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p
              dir="ltr"
              className="rounded-xl bg-paper px-3 py-2 font-mono text-[11px] break-all text-muted select-all"
            >
              {calendar.link}
            </p>
            <Button
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
          </>
        )}
        <ErrorBanner message={calendar.error} />
      </div>
    </section>
  );
}
