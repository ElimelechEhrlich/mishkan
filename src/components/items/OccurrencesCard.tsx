import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatPickedDate } from '../../lib/itemRules';
import { goneBy, historyCounts, upcomingDays } from '../../lib/recurrence';
import type { Item, ItemRepeat, Occurrence } from '../../types/domain';
import { Button } from '../ui/Button';

type OccurrencesCardProps = {
  readonly item: Item;
  readonly repeat: ItemRepeat;
  /** Its occurrences that were marked or missed, newest first. */
  readonly occurrences: readonly Occurrence[];
  readonly onSkip: () => void;
  readonly onUnmark: (occurrenceId: string) => void;
  /** Marks the item itself done, ending its series. */
  readonly onClose: () => void;
};

const historyShown = 10;

function dayText(day: string, hour: string | null): string {
  return hour === null ? formatPickedDate(day) : `${formatPickedDate(day)} ${hour.slice(0, 5)}`;
}

/**
 * A repeating task's occurrences: the current one to skip, the ones coming, what was marked
 * before (each can be taken back), and closing the item itself.
 */
export function OccurrencesCard({
  item,
  repeat,
  occurrences,
  onSkip,
  onUnmark,
  onClose,
}: OccurrencesCardProps): ReactElement {
  const [closing, setClosing] = useState(false);
  const gone = goneBy(occurrences);
  const ahead = upcomingDays(repeat, item.due_date, gone, 200);
  const [current, ...coming] = ahead;
  const left = repeat.end_kind === 'never' && repeat.stopped_on === null ? null : ahead.length;
  const counts = historyCounts(occurrences);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <h2 className="text-xs font-bold tracking-wide text-muted">{labels.occurrence.title}</h2>

      {current === undefined ? (
        <p className="text-sm text-muted">{labels.occurrence.noneLeft}</p>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2.5">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted">{labels.occurrence.current}</span>
            <span className="text-[15px] font-semibold text-ink">
              {dayText(current, item.due_time)}
            </span>
          </div>
          <Button variant="ghost" onClick={onSkip}>
            {labels.occurrence.skip}
          </Button>
        </div>
      )}

      {(left !== null || counts !== '') && (
        <p className="text-[13px] text-muted">
          {[
            ...(left !== null ? [labels.repeat.progress(gone, left)] : []),
            ...(counts === '' ? [] : [counts]),
          ].join(labels.item.separator)}
        </p>
      )}

      {coming.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-wide text-muted">
            {labels.occurrence.upcoming}
          </span>
          <ul className="flex flex-col gap-0.5 text-sm text-ink">
            {coming.slice(0, 3).map((day) => (
              <li key={day}>{dayText(day, repeat.at_time)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold tracking-wide text-muted">
          {labels.occurrence.history}
        </span>
        {occurrences.length === 0 ? (
          <p className="text-sm text-muted">{labels.occurrence.noHistory}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {occurrences.slice(0, historyShown).map((occurrence) => (
              <li key={occurrence.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 text-sm text-ink">
                  {dayText(occurrence.on_date, occurrence.at_time)}
                </span>
                <span
                  className={`rounded-[5px] px-1.5 text-[11px] font-semibold ${
                    occurrence.status === 'missed'
                      ? 'bg-alert-soft text-alert'
                      : occurrence.status === 'done'
                        ? 'bg-primary-soft text-primary'
                        : 'bg-line/70 text-muted'
                  }`}
                >
                  {labels.occurrence[occurrence.status]}
                </span>
                {(occurrence.status === 'done' || occurrence.status === 'skipped') && (
                  <button
                    type="button"
                    onClick={() => {
                      onUnmark(occurrence.id);
                    }}
                    className="min-h-8 shrink-0 px-1.5 text-[12px] font-medium text-muted underline"
                  >
                    {labels.occurrence.unmark}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <Button
          variant={closing ? 'danger' : 'ghost'}
          onClick={() => {
            // With occurrences still ahead, a second tap confirms ending the series.
            if (current === undefined || closing) {
              onClose();
              setClosing(false);
            } else {
              setClosing(true);
            }
          }}
        >
          {labels.occurrence.closeItem}
        </Button>
        <p className={`text-[13px] ${closing ? 'text-alert' : 'text-muted'}`}>
          {closing
            ? left === null
              ? labels.occurrence.closeOpenEnded
              : labels.occurrence.closeConfirm(left)
            : labels.occurrence.closeHint}
        </p>
      </div>
    </section>
  );
}
