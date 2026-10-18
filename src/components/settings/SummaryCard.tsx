import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseSummaryTimes } from '../../hooks/useSummaryTimes';
import { ErrorBanner } from '../ui/ErrorBanner';
import { TimeField } from '../ui/TimeField';

type SummaryCardProps = {
  readonly summaries: UseSummaryTimes;
  /** Whether notifications are on in this device, without which nothing arrives here. */
  readonly pushOn: boolean;
};

/** The morning and evening summaries: each on or off, and at what hour. */
export function SummaryCard({ summaries, pushOn }: SummaryCardProps): ReactElement {
  const rows = [
    { which: 'morning', label: labels.summaries.morning, hour: summaries.morning },
    { which: 'evening', label: labels.summaries.evening, hour: summaries.evening },
  ] as const;
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.summaries.title}</h2>
      <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4 shadow-card">
        {rows.map((row) => (
          <div key={row.which} className="flex min-h-12 items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={row.hour !== null}
              aria-label={row.label}
              onClick={() => {
                summaries.toggle(row.which);
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-start"
            >
              <span
                className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                  row.hour === null ? 'bg-line' : 'bg-primary'
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-surface shadow-card transition-all ${
                    row.hour === null ? 'start-0.5' : 'start-[1.125rem]'
                  }`}
                />
              </span>
              <span className="text-[15px] font-medium">{row.label}</span>
            </button>
            {row.hour !== null && (
              <div className="w-28 shrink-0">
                <TimeField
                  label={row.label}
                  value={row.hour}
                  onChange={(hour) => {
                    if (hour !== '') {
                      summaries.set(row.which, hour);
                    }
                  }}
                />
              </div>
            )}
          </div>
        ))}
        <p className="pt-1 text-[13px] leading-5 text-muted">
          {pushOn
            ? labels.summaries.hint
            : `${labels.summaries.hint} ${labels.summaries.needsPush}`}
        </p>
        <ErrorBanner message={summaries.error} />
      </div>
    </section>
  );
}
