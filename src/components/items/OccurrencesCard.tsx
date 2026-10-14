import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatPickedDate } from '../../lib/itemRules';
import { currentSlot, goneBy, historyCounts, upcomingSlots } from '../../lib/recurrence';
import type { Slot } from '../../lib/recurrence';
import type { Item, ItemRepeat, Occurrence } from '../../types/domain';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { SettingRow } from '../ui/SettingRow';
import { SettingsCard } from '../ui/SettingsCard';
import { TimeField } from '../ui/TimeField';

type OccurrencesCardProps = {
  readonly item: Item;
  readonly repeat: ItemRepeat;
  /** Its occurrences that were marked or missed, newest first. */
  readonly occurrences: readonly Occurrence[];
  readonly onSkip: () => void;
  /** Marks the current occurrence done, where the item has no button of its own for it. */
  readonly onDone?: (() => void) | undefined;
  /** Moves the current occurrence to another day and hour; the rhythm goes on. */
  readonly onMove: (day: string, time: string | null) => void;
  readonly onUnmark: (occurrenceId: string) => void;
  /** Marks the item itself done, ending its series. */
  readonly onClose: () => void;
};

const historyShown = 10;

function dayText(day: string, hour: string | null): string {
  return hour === null ? formatPickedDate(day) : `${formatPickedDate(day)} ${hour.slice(0, 5)}`;
}

function slotText(slot: Slot): string {
  return dayText(slot.day, slot.time);
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
  onDone,
  onMove,
  onUnmark,
  onClose,
}: OccurrencesCardProps): ReactElement {
  const [closing, setClosing] = useState(false);
  const [moving, setMoving] = useState<Slot | null>(null);
  const gone = goneBy(occurrences);
  const ahead = upcomingSlots(repeat, currentSlot(item), gone, 200);
  const [current, ...coming] = ahead;
  const moved = repeat.planned_date !== null;
  const left = repeat.end_kind === 'never' && repeat.stopped_on === null ? null : ahead.length;
  const counts = historyCounts(occurrences);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <h2 className="text-xs font-bold tracking-wide text-muted">{labels.occurrence.title}</h2>

      {current === undefined ? (
        <p className="text-sm text-muted">{labels.occurrence.noneLeft}</p>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl bg-paper px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-muted">
                {labels.occurrence.current}
                {moved ? `${labels.item.separator}${labels.occurrence.moved}` : ''}
              </span>
              <span className="text-[15px] font-semibold text-ink">{slotText(current)}</span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {onDone !== undefined && (
                <Button variant="soft" onClick={onDone}>
                  {labels.occurrence.markDone}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setMoving(moving === null ? current : null);
                }}
              >
                {labels.occurrence.move}
              </Button>
              <Button variant="ghost" onClick={onSkip}>
                {labels.occurrence.skip}
              </Button>
            </div>
          </div>
          {moving !== null && (
            <SettingsCard
              actions={
                <>
                  <Button
                    disabled={
                      moving.day === '' || (item.kind === 'appointment' && moving.time === null)
                    }
                    onClick={() => {
                      onMove(moving.day, moving.time);
                      setMoving(null);
                    }}
                  >
                    {labels.actions.save}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMoving(null);
                    }}
                  >
                    {labels.actions.cancel}
                  </Button>
                </>
              }
            >
              <SettingRow label={labels.reminders.date} note={labels.occurrence.moveHint}>
                <DateField
                  label={labels.picker.pickDate}
                  value={moving.day}
                  shortcuts
                  onChange={(day) => {
                    setMoving({ ...moving, day });
                  }}
                />
              </SettingRow>
              <SettingRow label={labels.repeat.hour}>
                <TimeField
                  label={labels.picker.pickHour}
                  optional={item.kind !== 'appointment'}
                  value={moving.time ?? ''}
                  onChange={(time) => {
                    setMoving({ ...moving, time: time === '' ? null : time });
                  }}
                />
              </SettingRow>
            </SettingsCard>
          )}
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
            {coming.slice(0, 3).map((slot) => (
              <li key={`${slot.day}-${slot.time ?? ''}`}>{slotText(slot)}</li>
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
