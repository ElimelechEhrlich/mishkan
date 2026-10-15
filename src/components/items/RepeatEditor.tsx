import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { addDays, formatDueDate, todayIso } from '../../lib/itemRules';
import { repeatSummary, startingRepeat, weekdays } from '../../lib/recurrence';
import { repeatUnits } from '../../lib/reminders';
import type { Item, ItemRepeat, RepeatDraft, RepeatEnd } from '../../types/domain';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { OptionGroup } from '../ui/OptionGroup';
import { SettingRow } from '../ui/SettingRow';
import { SettingsCard } from '../ui/SettingsCard';
import { Stepper } from '../ui/Stepper';
import { TimeField } from '../ui/TimeField';

type RepeatEditorProps = {
  readonly item: Item;
  /** The item's series, or its settings kept from before; null when it never repeated. */
  readonly repeat: ItemRepeat | null;
  /** How many occurrences have gone by (marked or missed). */
  readonly gone: number;
  readonly onSave: (draft: RepeatDraft) => void;
  readonly onCancel: () => void;
  readonly onStop: () => void;
  readonly onResume: (end: Pick<RepeatDraft, 'endKind' | 'endCount' | 'endUntil'>) => void;
  /** For a step of a goal with a date: the series ends by it, and can not go on with no end. */
  readonly limit?: string | null | undefined;
};

const endKinds = ['never', 'count', 'until'] as const satisfies readonly RepeatEnd[];

/** How an item repeats: every how often, on which days, at what hours, from when, until when. */
export function RepeatEditor({
  item,
  repeat,
  gone,
  onSave,
  onCancel,
  onStop,
  onResume,
  limit = null,
}: RepeatEditorProps): ReactElement {
  const today = todayIso();
  const starting = startingRepeat(item, repeat);
  // Within a goal's date it ends by that date, unless set otherwise.
  const original: RepeatDraft =
    limit !== null && starting.endKind === 'never'
      ? { ...starting, endKind: 'until', endCount: null, endUntil: limit }
      : starting;
  const [draft, setDraft] = useState<RepeatDraft>(original);
  // When the end changes kind it is set anew: how many times from today.
  const [freshCount, setFreshCount] = useState(5);
  // The common settings show; the rest open under "custom", already open when used.
  const [custom, setCustom] = useState(
    original.every > 1 ||
      original.weekdays.length > 0 ||
      original.fromKind === 'completion' ||
      (original.endKind !== 'never' && limit === null),
  );

  const series = repeat !== null && item.time_mode === 'recurring';
  const stopped = series && repeat.stopped_on !== null;
  const ended = series && item.due_date === null;
  // The occurrence already due and still to be marked counts as gone by.
  const dueNow = series && item.due_date !== null && item.due_date <= today ? 1 : 0;
  const sameEnd = series && draft.endKind === original.endKind;
  const isAppointment = item.kind === 'appointment';
  const canFromCompletion =
    draft.times.length <= 1 && (draft.unit !== 'week' || draft.weekdays.length === 0);

  function set(changes: Partial<RepeatDraft>): void {
    setDraft((current) => ({ ...current, ...changes }));
  }

  /** Several hours a day can not count from when it was done. */
  function setTimes(times: readonly string[]): void {
    const sorted = [...new Set(times)].sort();
    set({ times: sorted, ...(sorted.length > 1 ? { fromKind: 'schedule' as const } : {}) });
  }

  function chooseEnd(kind: RepeatEnd): void {
    if (series && kind === original.endKind) {
      // Back to the kind it had: its settings return as they were.
      set({ endKind: kind, endCount: original.endCount, endUntil: original.endUntil });
      return;
    }
    set({
      endKind: kind,
      endCount: kind === 'count' ? gone + freshCount : null,
      endUntil: kind === 'until' ? (draft.endUntil ?? limit ?? addDays(today, 30)) : null,
    });
  }

  const total = draft.endCount ?? gone + freshCount;
  const leastTotal = Math.max(1, gone + dueNow);
  const valid =
    draft.startsOn !== '' &&
    (!isAppointment || draft.times.length === 1) &&
    (draft.endKind !== 'count' || total >= leastTotal) &&
    (draft.endKind !== 'until' ||
      (draft.endUntil !== null &&
        draft.endUntil >= today &&
        (limit === null || draft.endUntil <= limit))) &&
    (limit === null || draft.endKind !== 'never');
  const end = { endKind: draft.endKind, endCount: draft.endCount, endUntil: draft.endUntil };
  const canResume =
    (draft.endKind !== 'count' || (draft.endCount !== null && draft.endCount > gone)) &&
    (limit === null || draft.endKind !== 'never');

  const stopControls = (
    <>
      {series && !stopped && !ended && (
        <div className="flex flex-col gap-1.5 px-1">
          <Button variant="quiet" onClick={onStop}>
            {labels.repeat.stop}
          </Button>
          <p className="text-[13px] text-muted">{labels.repeat.stopHint}</p>
        </div>
      )}
      {(stopped || ended) && (
        <div className="flex flex-col gap-1.5 px-1">
          <p className="text-[13px] font-semibold text-ink">
            {stopped && repeat.stopped_on !== null
              ? labels.repeat.stopped(formatDueDate(repeat.stopped_on))
              : labels.repeat.ended}
          </p>
          <Button
            variant="soft"
            disabled={!canResume}
            onClick={() => {
              onResume(end);
            }}
          >
            {labels.repeat.resume}
          </Button>
          <p className="text-[13px] text-muted">
            {canResume ? labels.repeat.resumeHint : labels.repeat.resumeNeedsMore}
          </p>
        </div>
      )}
    </>
  );

  // A Hebrew birthday or anniversary: its days come from the profile, so only stop and resume.
  if (repeat?.hebrew === true) {
    return (
      <div className="flex flex-col gap-3">
        <SettingsCard
          summary={labels.repeat.hebrewYear}
          actions={
            <Button variant="ghost" onClick={onCancel}>
              {labels.actions.close}
            </Button>
          }
        >
          <p className="text-[13px] text-muted">{labels.repeat.hebrewHint}</p>
        </SettingsCard>
        {stopControls}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SettingsCard
        summary={repeatSummary(draft)}
        actions={
          <>
            <Button
              disabled={!valid}
              onClick={() => {
                onSave(draft);
              }}
            >
              {labels.actions.save}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              {labels.actions.cancel}
            </Button>
          </>
        }
      >
        <SettingRow label={labels.repeat.everyShort}>
          {custom && (
            <Stepper
              value={draft.every}
              min={1}
              onChange={(every) => {
                set({ every });
              }}
            />
          )}
          <OptionGroup
            label={labels.repeat.every}
            options={repeatUnits.map((unit) => ({
              value: unit,
              label:
                custom && draft.every > 1
                  ? labels.reminders.unitNames[unit]
                  : labels.reminders.units[unit][0],
            }))}
            value={draft.unit}
            onChange={(unit) => {
              set({ unit });
            }}
          />
        </SettingRow>

        <SettingRow label={isAppointment ? labels.repeat.appointmentHour : labels.repeat.hours}>
          <div className="flex w-full flex-col gap-2">
            {(isAppointment && draft.times.length === 0 ? [''] : draft.times).map((time, index) => (
              <TimeField
                key={index}
                label={labels.picker.pickHour}
                optional={!isAppointment}
                value={time}
                onChange={(hour) => {
                  const times = [...draft.times];
                  if (hour === '') {
                    times.splice(index, 1);
                  } else {
                    times[index] = hour;
                  }
                  setTimes(times);
                }}
              />
            ))}
            {draft.times.length === 0 && !isAppointment && (
              <TimeField
                label={labels.picker.pickHour}
                optional
                value=""
                onChange={(hour) => {
                  setTimes(hour === '' ? [] : [hour]);
                }}
              />
            )}
            {!isAppointment && draft.times.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const last = draft.times[draft.times.length - 1] ?? '08:00';
                  const next = `${String(Math.min(23, Number(last.slice(0, 2)) + 4)).padStart(2, '0')}:${last.slice(3, 5)}`;
                  setTimes([...draft.times, next]);
                }}
                className="self-start px-1 text-[13px] font-semibold text-primary"
              >
                + {labels.repeat.addHour}
              </button>
            )}
          </div>
        </SettingRow>

        <button
          type="button"
          aria-expanded={custom}
          onClick={() => {
            setCustom(!custom);
          }}
          className="self-start px-1 text-[13px] font-semibold text-primary"
        >
          {custom ? labels.repeat.lessOptions : labels.repeat.custom}
        </button>
        {custom && (
          <>
            {draft.unit === 'week' && (
              <SettingRow
                label={labels.repeat.onDays}
                note={draft.weekdays.length === 0 ? labels.repeat.onDaysHint : undefined}
              >
                <div className="flex gap-1">
                  {weekdays.map((day) => {
                    const chosen = draft.weekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={chosen}
                        aria-label={labels.repeat.weekdayNames[day]}
                        onClick={() => {
                          set({
                            weekdays: chosen
                              ? draft.weekdays.filter((other) => other !== day)
                              : [...draft.weekdays, day].sort(),
                            fromKind: 'schedule',
                          });
                        }}
                        className={`flex size-9 items-center justify-center rounded-full border text-[13px] transition active:scale-95 ${
                          chosen
                            ? 'border-primary bg-surface font-semibold text-primary'
                            : 'border-line bg-surface text-muted'
                        }`}
                      >
                        {labels.repeat.weekdayShort[day]}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>
            )}

            <SettingRow label={labels.repeat.startsOn}>
              <DateField
                label={labels.repeat.startsOn}
                value={draft.startsOn}
                shortcuts
                onChange={(startsOn) => {
                  set({ startsOn });
                }}
              />
            </SettingRow>

            <SettingRow
              label={labels.repeat.fromKindTitle}
              note={
                canFromCompletion
                  ? draft.fromKind === 'completion'
                    ? labels.repeat.fromHint
                    : undefined
                  : labels.repeat.fromNeedsOne
              }
            >
              <OptionGroup
                label={labels.repeat.fromKindTitle}
                options={[
                  { value: 'schedule', label: labels.repeat.fromKind.schedule },
                  {
                    value: 'completion',
                    label: labels.repeat.fromKind.completion,
                    disabled: !canFromCompletion,
                  },
                ]}
                value={draft.fromKind}
                onChange={(fromKind) => {
                  set({ fromKind });
                }}
              />
            </SettingRow>

            {item.kind === 'tracker' && (
              <SettingRow label={labels.repeat.trackerCloses}>
                <OptionGroup
                  label={labels.repeat.trackerCloses}
                  options={[
                    { value: 'yes', label: labels.repeat.yes },
                    { value: 'no', label: labels.repeat.no },
                  ]}
                  value={draft.trackerCloses ? 'yes' : 'no'}
                  onChange={(answer) => {
                    set({ trackerCloses: answer === 'yes' });
                  }}
                />
              </SettingRow>
            )}

            <SettingRow
              label={labels.repeat.end}
              note={
                draft.endKind === 'count' && sameEnd
                  ? labels.repeat.progress(gone, Math.max(0, total - gone))
                  : undefined
              }
            >
              <OptionGroup
                label={labels.repeat.end}
                options={endKinds
                  .filter((kind) => limit === null || kind !== 'never')
                  .map((kind) => ({
                    value: kind,
                    label: labels.repeat.endKind[kind],
                  }))}
                value={draft.endKind}
                onChange={chooseEnd}
              />
              {draft.endKind === 'count' &&
                (sameEnd ? (
                  <Stepper
                    value={total}
                    min={leastTotal}
                    display={labels.repeat.times(total)}
                    onChange={(endCount) => {
                      set({ endCount });
                    }}
                  />
                ) : (
                  <div className="flex w-full flex-col gap-1">
                    <span className="text-[13px] text-muted">
                      {series ? labels.repeat.howManyFromToday : labels.repeat.howMany}
                    </span>
                    <Stepper
                      value={freshCount}
                      min={1}
                      display={labels.repeat.times(freshCount)}
                      onChange={(count) => {
                        setFreshCount(count);
                        set({ endCount: gone + count });
                      }}
                    />
                  </div>
                ))}
              {draft.endKind === 'until' && (
                <div className="w-full">
                  <DateField
                    label={labels.repeat.untilWhich}
                    value={draft.endUntil ?? ''}
                    min={today}
                    max={limit ?? undefined}
                    onChange={(endUntil) => {
                      set({ endUntil: endUntil === '' ? null : endUntil });
                    }}
                  />
                </div>
              )}
            </SettingRow>
          </>
        )}
      </SettingsCard>

      {stopControls}
    </div>
  );
}
