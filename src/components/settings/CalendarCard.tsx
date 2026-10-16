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
            {calendar.addUrl !== null && (
              <a
                href={calendar.addUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-semibold text-white transition active:scale-[0.98]"
              >
                {labels.calendar.add}
              </a>
            )}
            <p className="text-[13px] leading-5 text-muted">{labels.calendar.addHint}</p>
            <p
              dir="ltr"
              className="rounded-xl bg-paper px-3 py-2 font-mono text-[11px] break-all text-muted select-all"
            >
              {calendar.link}
            </p>
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
            <p className="text-[12px] leading-5 text-muted">{labels.calendar.manual}</p>
            <p className="text-[12px] leading-5 text-muted">{labels.calendar.private}</p>
            <div className="self-center">
              <ConfirmButton
                label={labels.calendar.renew}
                confirmLabel={labels.calendar.confirmRenew}
                icon="repeat"
                onConfirm={calendar.renew}
              />
            </div>
            <p className="text-center text-[12px] leading-5 text-muted">
              {labels.calendar.renewNote}
            </p>
          </>
        )}
        <ErrorBanner message={calendar.error} />
      </div>
    </section>
  );
}
