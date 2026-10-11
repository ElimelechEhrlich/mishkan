import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import { fromLocalDateTime, toLocalDateTime } from '../../lib/itemRules';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { RecipientChips } from './RecipientChips';

export type ReminderChoice = {
  readonly remindAt: string | null;
  /** The parents it is for; null for everyone who can see the item. */
  readonly memberIds: readonly string[] | null;
};

type ReminderPickerProps = {
  /** The reminder time as stored (ISO), or null. */
  readonly remindAt: string | null;
  readonly memberIds: readonly string[] | null;
  /** The item's due date; a new reminder starts at nine that morning. */
  readonly dueDate: string | null;
  readonly people: readonly ReminderPerson[];
  readonly onChange: (choice: ReminderChoice) => void;
};

/** When a notification about the item goes out, and to whom. */
export function ReminderPicker({
  remindAt,
  memberIds,
  dueDate,
  people,
  onChange,
}: ReminderPickerProps): ReactElement {
  const [draft, setDraft] = useState(
    remindAt !== null ? toLocalDateTime(remindAt) : dueDate !== null ? `${dueDate}T09:00` : '',
  );
  const [chosen, setChosen] = useState<readonly string[] | null>(memberIds);

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
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-wide text-muted">{labels.push.forWhom}</span>
        <RecipientChips people={people} value={chosen} onChange={setChosen} />
        <p className="text-[13px] text-muted">{labels.push.reminderHint}</p>
      </div>
      <div className="flex gap-2">
        <Button
          disabled={draft === ''}
          onClick={() => {
            onChange({ remindAt: fromLocalDateTime(draft), memberIds: chosen });
          }}
        >
          {labels.actions.save}
        </Button>
        {remindAt !== null && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft('');
              setChosen(null);
              onChange({ remindAt: null, memberIds: null });
            }}
          >
            {labels.push.clearReminder}
          </Button>
        )}
      </div>
    </div>
  );
}
