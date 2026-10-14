import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatPickedDate, todayIso } from '../../lib/itemRules';
import type { Item, ItemRepeat, RepeatDraft, TimeChoice, TimeMode } from '../../types/domain';
import { Button } from '../ui/Button';
import { ChoiceGrid } from '../ui/ChoiceGrid';
import { DateField } from '../ui/DateField';
import { SettingRow } from '../ui/SettingRow';
import { SettingsCard } from '../ui/SettingsCard';
import { TimeField } from '../ui/TimeField';
import { RepeatEditor } from './RepeatEditor';

/** What changing a series takes; without it "repeating" is not offered. */
export type RepeatControls = {
  /** The item's series, or settings kept from before; null when it never repeated. */
  readonly repeat: ItemRepeat | null;
  /** How many of its occurrences have gone by. */
  readonly gone: number;
  readonly onSave: (draft: RepeatDraft) => void;
  readonly onStop: () => void;
  readonly onResume: (end: Pick<RepeatDraft, 'endKind' | 'endCount' | 'endUntil'>) => void;
};

type TimePickerProps = {
  /** The item being edited, so its current choice is highlighted. */
  readonly item: Item;
  readonly onPick: (choice: TimeChoice) => void;
  readonly repeat?: RepeatControls | undefined;
  /** For a step of a goal with a date: the latest day it can have. */
  readonly limit?: string | null | undefined;
  /** For a goal: its open steps that end after a day, and how many repeat with no end. */
  readonly goalSteps?:
    | {
        readonly after: (day: string) => readonly Item[];
        readonly openEnded: number;
      }
    | undefined;
};

/** Urgent has no date but shows with today's, everywhere today's are shown. */
const undatedModes = ['urgent', 'anytime', 'waiting', 'someday'] as const;

/**
 * When an item is due. The kind of time is the main choice; each opens below it, with what it
 * means and its settings, and applies only on save, so a choice can be changed before then.
 */
export function TimePicker({
  item,
  onPick,
  repeat,
  limit = null,
  goalSteps,
}: TimePickerProps): ReactElement {
  // A goal's date is a target for all its steps, and a goal does not repeat.
  const isGoal = item.kind === 'goal';
  const canRepeat = item.kind === 'task' && repeat !== undefined;
  // A date or a rhythm already chosen opens with its settings shown.
  const [panel, setPanel] = useState<TimeMode | null>(
    item.time_mode === 'scheduled' || (item.time_mode === 'recurring' && canRepeat)
      ? item.time_mode
      : null,
  );
  const [date, setDate] = useState(item.due_date ?? todayIso());
  // An hour is optional, and only on a task.
  const [hour, setHour] = useState(item.due_time?.slice(0, 5) ?? '');

  const modes: readonly TimeMode[] = [
    'scheduled',
    ...(canRepeat ? ['recurring' as const] : []),
    ...undatedModes,
  ];
  const chosen = panel ?? item.time_mode;
  const tooLate = limit !== null && date > limit;
  // A goal can not move before its steps; steps that repeat with no end will end on its date.
  const lateSteps = goalSteps === undefined || date === '' ? [] : goalSteps.after(date);
  const hadDate = item.time_mode === 'scheduled' && item.due_date !== null;

  return (
    <div className="flex flex-col gap-3">
      <ChoiceGrid
        options={modes.map((mode) => ({
          value: mode,
          label: mode === 'scheduled' && isGoal ? labels.goals.targetDate : labels.timeMode[mode],
        }))}
        value={chosen}
        onChange={(mode) => {
          setPanel(panel === mode ? null : mode);
        }}
      />

      {panel !== null && panel !== 'scheduled' && panel !== 'recurring' && (
        <SettingsCard
          actions={
            <>
              <Button
                onClick={() => {
                  onPick({
                    time_mode: panel,
                    due_date: null,
                    due_time: null,
                    recurrence_rule: null,
                  });
                  setPanel(null);
                }}
              >
                {labels.actions.save}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPanel(null);
                }}
              >
                {labels.actions.cancel}
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-muted">{labels.timeModeHint[panel]}</p>
        </SettingsCard>
      )}

      {panel === 'scheduled' && (
        <SettingsCard
          summary={
            date === ''
              ? undefined
              : [formatPickedDate(date), ...(hour === '' ? [] : [hour])].join(labels.item.separator)
          }
          actions={
            <>
              <Button
                disabled={date === '' || tooLate || lateSteps.length > 0}
                onClick={() => {
                  onPick({
                    time_mode: 'scheduled',
                    due_date: date,
                    due_time: !isGoal && hour !== '' ? hour : null,
                    recurrence_rule: null,
                  });
                  setPanel(null);
                }}
              >
                {labels.actions.save}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPanel(null);
                }}
              >
                {labels.actions.cancel}
              </Button>
            </>
          }
        >
          <SettingRow label={isGoal ? labels.goals.targetDate : labels.fields.dueDate}>
            <DateField
              label={labels.picker.pickDate}
              value={date}
              max={limit ?? undefined}
              shortcuts
              onChange={setDate}
            />
          </SettingRow>
          {limit !== null && (
            <p className={`text-[13px] ${tooLate ? 'text-alert' : 'text-muted'}`}>
              {labels.goals.byTarget(formatPickedDate(limit))}
            </p>
          )}
          {lateSteps.length > 0 && (
            <p className="text-[13px] text-alert">
              {labels.goals.fixFirst(lateSteps.map((step) => step.title).join(', '))}
            </p>
          )}
          {lateSteps.length === 0 &&
            !hadDate &&
            goalSteps !== undefined &&
            goalSteps.openEnded > 0 && (
              <p className="text-[13px] text-muted">
                {labels.goals.endOnTarget(goalSteps.openEnded)}
              </p>
            )}
          {!isGoal && (
            <SettingRow label={labels.fields.dueTime}>
              <TimeField label={labels.picker.pickHour} optional value={hour} onChange={setHour} />
            </SettingRow>
          )}
        </SettingsCard>
      )}

      {panel === 'recurring' && repeat !== undefined && (
        <RepeatEditor
          item={item}
          limit={limit}
          repeat={repeat.repeat}
          gone={repeat.gone}
          onSave={(draft) => {
            repeat.onSave(draft);
            setPanel(null);
          }}
          onCancel={() => {
            setPanel(null);
          }}
          onStop={() => {
            repeat.onStop();
            setPanel(null);
          }}
          onResume={(end) => {
            repeat.onResume(end);
            setPanel(null);
          }}
        />
      )}
    </div>
  );
}
