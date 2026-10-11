import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { fromLocalDateTime, toLocalDateTime } from '../../lib/itemRules';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

type ReminderPickerProps = {
  /** The reminder time as stored (ISO), or null. */
  readonly remindAt: string | null;
  /** The item's due date; a new reminder starts at nine that morning. */
  readonly dueDate: string | null;
  readonly onChange: (remindAt: string | null) => void;
};

/** A date and time when a notification about the item goes out. */
export function ReminderPicker({
  remindAt,
  dueDate,
  onChange,
}: ReminderPickerProps): ReactElement {
  const [draft, setDraft] = useState(
    remindAt !== null ? toLocalDateTime(remindAt) : dueDate !== null ? `${dueDate}T09:00` : '',
  );

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label={labels.push.reminder}
        type="datetime-local"
        direction="ltr"
        value={draft}
        onChange={setDraft}
        compact
      />
      <p className="text-[13px] text-muted">{labels.push.reminderHint}</p>
      <div className="flex gap-2">
        <Button
          disabled={draft === ''}
          onClick={() => {
            onChange(fromLocalDateTime(draft));
          }}
        >
          {labels.actions.save}
        </Button>
        {remindAt !== null && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft('');
              onChange(null);
            }}
          >
            {labels.push.clearReminder}
          </Button>
        )}
      </div>
    </div>
  );
}
