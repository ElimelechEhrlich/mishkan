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
  const [panel, setPanel] = useState<Panel>(null);
  const [date, setDate] = useState(item.due_date ?? todayIso());
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
          label={labels.timeMode.scheduled}
          selected={panel === 'scheduled' || (panel === null && item.time_mode === 'scheduled')}
          onClick={() => {
            togglePanel('scheduled');
          }}
        />
        <Chip
          label={labels.timeMode.recurring}
          selected={panel === 'recurring' || (panel === null && item.time_mode === 'recurring')}
          onClick={() => {
            togglePanel('recurring');
          }}
        />
        {undatedModes.map((mode) => (
          <Chip
            key={mode}
            label={labels.timeMode[mode]}
            selected={panel === null && item.time_mode === mode}
            onClick={() => {
              setPanel(null);
              onPick({ time_mode: mode, due_date: null, recurrence_rule: null });
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
        <div className="flex items-end gap-2">
          <TextField
            label={panel === 'recurring' ? labels.fields.startDate : labels.fields.dueDate}
            type="date"
            value={date}
            onChange={setDate}
          />
          <Button
            disabled={date === ''}
            onClick={() => {
              onPick({
                time_mode: panel,
                due_date: date,
                recurrence_rule: panel === 'recurring' ? recurrenceRule(recurrence) : null,
              });
              setPanel(null);
            }}
          >
            {labels.actions.confirm}
          </Button>
        </div>
      )}
    </div>
  );
}
