import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import { fromLocalDateTime, toLocalDateTime } from '../../lib/itemRules';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';

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

  const everyone = chosen === null;
  const reachesNoOne = (
    everyone ? people : people.filter((person) => chosen.includes(person.id))
  ).every((person) => !person.hasPush);

  function toggle(personId: string): void {
    const current = chosen ?? [];
    const next = current.includes(personId)
      ? current.filter((id) => id !== personId)
      : [...current, personId];
    setChosen(next.length === 0 ? null : next);
  }

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
        <div className="flex flex-wrap gap-1.5">
          <Chip
            label={labels.push.everyone}
            selected={everyone}
            onClick={() => {
              setChosen(null);
            }}
          />
          {people.map((person) => (
            <Chip
              key={person.id}
              label={person.name}
              note={person.hasPush ? undefined : labels.push.noDevice}
              selected={!everyone && chosen.includes(person.id)}
              onClick={() => {
                toggle(person.id);
              }}
            />
          ))}
        </div>
        <p className={`text-[13px] ${reachesNoOne ? 'text-alert' : 'text-muted'}`}>
          {reachesNoOne ? labels.push.reachesNoOne : labels.push.reminderHint}
        </p>
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
