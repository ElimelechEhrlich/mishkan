import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { recurrenceOf, recurrenceRule, recurrences, todayIso } from '../../lib/itemRules';
import type { Item, Recurrence, TimeChoice } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';

type TimePickerProps = {
  /** The item being edited, so its current choice is highlighted. */
  readonly item: Item;
  readonly onPick: (choice: TimeChoice) => void;
};

type Panel = 'scheduled' | 'recurring' | null;

/** Urgent has no date but shows with today's, everywhere today's are shown. */
const undatedModes = ['urgent', 'anytime', 'waiting', 'someday'] as const;

/** One tap for the undated modes; a date or a repeating rhythm asks for details first. */
export function TimePicker({ item, onPick }: TimePickerProps): ReactElement {
  // A goal's date is a target for all its steps, and a goal does not repeat.
  const isGoal = item.kind === 'goal';
  const [panel, setPanel] = useState<Panel>(null);
  const [date, setDate] = useState(item.due_date ?? todayIso());
  // An hour is optional, and only for a task's single date.
  const [hour, setHour] = useState(item.due_time?.slice(0, 5) ?? '');
  const withHour = panel === 'scheduled' && !isGoal;
  const [recurrence, setRecurrence] = useState<Recurrence>(
    recurrenceOf(item.recurrence_rule) ?? 'weekly',
  );

  function togglePanel(next: Exclude<Panel, null>): void {
    setPanel(panel === next ? null : next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Chip
          label={isGoal ? labels.goals.targetDate : labels.timeMode.scheduled}
          selected={panel === 'scheduled' || (panel === null && item.time_mode === 'scheduled')}
          onClick={() => {
            togglePanel('scheduled');
          }}
        />
        {!isGoal && (
          <Chip
            label={labels.timeMode.recurring}
            selected={panel === 'recurring' || (panel === null && item.time_mode === 'recurring')}
            onClick={() => {
              togglePanel('recurring');
            }}
          />
        )}
        {undatedModes.map((mode) => (
          <Chip
            key={mode}
            label={labels.timeMode[mode]}
            selected={panel === null && item.time_mode === mode}
            onClick={() => {
              setPanel(null);
              onPick({ time_mode: mode, due_date: null, due_time: null, recurrence_rule: null });
            }}
          />
        ))}
      </div>
      {panel === 'recurring' && (
        <div className="flex flex-wrap gap-2">
          {recurrences.map((option) => (
            <Chip
              key={option}
              label={labels.recurrence[option]}
              selected={option === recurrence}
              onClick={() => {
                setRecurrence(option);
              }}
            />
          ))}
        </div>
      )}
      {panel !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <TextField
              label={
                panel === 'recurring'
                  ? labels.fields.startDate
                  : isGoal
                    ? labels.goals.targetDate
                    : labels.fields.dueDate
              }
              type="date"
              value={date}
              onChange={setDate}
            />
            {withHour && (
              <TextField
                label={labels.fields.dueTime}
                type="time"
                direction="ltr"
                value={hour}
                onChange={setHour}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={date === ''}
              onClick={() => {
                onPick({
                  time_mode: panel,
                  due_date: date,
                  due_time: withHour && hour !== '' ? hour : null,
                  recurrence_rule: panel === 'recurring' ? recurrenceRule(recurrence) : null,
                });
                setPanel(null);
              }}
            >
              {labels.actions.confirm}
            </Button>
            {withHour && hour !== '' && (
              <Chip
                label={labels.fields.clearTime}
                selected={false}
                onClick={() => {
                  setHour('');
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
