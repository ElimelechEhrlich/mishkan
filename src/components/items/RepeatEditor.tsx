import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { addDays, formatDueDate, todayIso } from '../../lib/itemRules';
import { repeatSummary, startingRepeat } from '../../lib/recurrence';
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
};

const endKinds = ['never', 'count', 'until'] as const satisfies readonly RepeatEnd[];

/** How a task repeats: every how often, at what hour, from when, until when. */
export function RepeatEditor({
  item,
  repeat,
  gone,
  onSave,
  onCancel,
  onStop,
  onResume,
}: RepeatEditorProps): ReactElement {
  const today = todayIso();
  const original = startingRepeat(item, repeat);
  const [draft, setDraft] = useState<RepeatDraft>(original);
  // When the end changes kind it is set anew: how many times from today.
  const [freshCount, setFreshCount] = useState(5);

  const series = repeat !== null && item.time_mode === 'recurring';
  const stopped = series && repeat.stopped_on !== null;
  const ended = series && item.due_date === null;
  // The occurrence already due and still to be marked counts as gone by.
  const dueNow = series && item.due_date !== null && item.due_date <= today ? 1 : 0;
  const sameEnd = series && draft.endKind === original.endKind;

  function set(changes: Partial<RepeatDraft>): void {
    setDraft((current) => ({ ...current, ...changes }));
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
      endUntil: kind === 'until' ? (draft.endUntil ?? addDays(today, 30)) : null,
    });
  }

  const total = draft.endCount ?? gone + freshCount;
  const leastTotal = Math.max(1, gone + dueNow);
  const valid =
    draft.startsOn !== '' &&
    (draft.endKind !== 'count' || total >= leastTotal) &&
    (draft.endKind !== 'until' || (draft.endUntil !== null && draft.endUntil >= today));
  const end = { endKind: draft.endKind, endCount: draft.endCount, endUntil: draft.endUntil };
  const canResume =
    draft.endKind !== 'count' || (draft.endCount !== null && draft.endCount > gone);

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
        <SettingRow label={labels.repeat.every}>
          <Stepper
            value={draft.every}
            min={1}
            onChange={(every) => {
              set({ every });
            }}
          />
          <OptionGroup
            label={labels.repeat.every}
            options={repeatUnits.map((unit) => ({
              value: unit,
              label: labels.reminders.unitNames[unit],
            }))}
            value={draft.unit}
            onChange={(unit) => {
              set({ unit });
            }}
          />
        </SettingRow>

        <SettingRow label={labels.repeat.hour}>
          <TimeField
            label={labels.repeat.hour}
            optional
            value={draft.atTime ?? ''}
            onChange={(hour) => {
              set({ atTime: hour === '' ? null : hour });
            }}
          />
        </SettingRow>

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
          label={labels.repeat.end}
          note={
            draft.endKind === 'count' && sameEnd
              ? labels.repeat.progress(gone, Math.max(0, total - gone))
              : undefined
          }
        >
          <OptionGroup
            label={labels.repeat.end}
            options={endKinds.map((kind) => ({
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
                onChange={(endUntil) => {
                  set({ endUntil: endUntil === '' ? null : endUntil });
                }}
              />
            </div>
          )}
        </SettingRow>
      </SettingsCard>

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
    </div>
  );
}
