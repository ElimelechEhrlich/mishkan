import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { TimeChoice } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';

type TimePickerProps = {
  readonly onPick: (choice: TimeChoice) => void;
};

const undatedModes = ['anytime', 'waiting', 'someday'] as const;

/** One tap for the undated modes; "on a date" asks for the date first. */
export function TimePicker({ onPick }: TimePickerProps): ReactElement {
  const [pickingDate, setPickingDate] = useState(false);
  const [date, setDate] = useState('');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Chip
          label={labels.timeMode.scheduled}
          selected={pickingDate}
          onClick={() => {
            setPickingDate(!pickingDate);
          }}
        />
        {undatedModes.map((mode) => (
          <Chip
            key={mode}
            label={labels.timeMode[mode]}
            selected={false}
            onClick={() => {
              onPick({ time_mode: mode, due_date: null });
            }}
          />
        ))}
      </div>
      {pickingDate && (
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <TextField label={labels.fields.dueDate} type="date" value={date} onChange={setDate} />
          <Button
            disabled={date === ''}
            onClick={() => {
              onPick({ time_mode: 'scheduled', due_date: date });
            }}
          >
            {labels.actions.confirm}
          </Button>
        </div>
      )}
    </div>
  );
}
