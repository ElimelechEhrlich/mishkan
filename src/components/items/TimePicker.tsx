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
};

/** Urgent has no date but shows with today's, everywhere today's are shown. */
const undatedModes = ['urgent', 'anytime', 'waiting', 'someday'] as const;

/**
 * When an item is due. The kind of time is the main choice; each opens below it, with what it
 * means and its settings, and applies only on save, so a choice can be changed before then.
 */
export function TimePicker({ item, onPick, repeat }: TimePickerProps): ReactElement {
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
                disabled={date === ''}
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
            <DateField label={labels.picker.pickDate} value={date} shortcuts onChange={setDate} />
          </SettingRow>
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
