import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import {
  defaultDraft,
  describeReminder,
  draftOf,
  isWaiting,
  reminderRules,
  wasSent,
} from '../../lib/reminders';
import type { Item, ItemReminder, ReminderDraft } from '../../types/domain';
import { Button } from '../ui/Button';
import { ReminderForm } from './ReminderForm';

type ReminderListProps = {
  readonly item: Item;
  readonly reminders: readonly ItemReminder[];
  /** The parents the item's reminders can go to. */
  readonly people: readonly ReminderPerson[];
  readonly onAdd: (draft: ReminderDraft) => void;
  readonly onUpdate: (reminderId: string, draft: ReminderDraft) => void;
  readonly onRemove: (reminderId: string) => void;
};

/** An item's reminders: each one in words, a tap to change it, and a way to add another. */
export function ReminderList({
  item,
  reminders,
  people,
  onAdd,
  onUpdate,
  onRemove,
}: ReminderListProps): ReactElement {
  // The reminder open for changes, 'new' for one being added, or none.
  const [editing, setEditing] = useState<string | null>(null);
  const rules = reminderRules(item);
  const anyWaiting = reminders.some(isWaiting);

  function recipients(memberIds: readonly string[] | null): string | null {
    if (memberIds === null) {
      return null;
    }
    const names = people
      .filter((person) => memberIds.includes(person.id))
      .map((person) => person.name);
    return names.length === 0 ? null : `${labels.push.toPrefix}${names.join(', ')}`;
  }

  return (
    <div className="flex flex-col gap-2">
      {reminders.length === 0 && editing === null && (
        <p className="text-sm text-muted">{labels.push.noReminder}</p>
      )}
      {reminders.length > 0 && (
        <ul className="flex flex-col gap-2">
          {reminders.map((reminder) =>
            editing === reminder.id ? (
              <li key={reminder.id}>
                <ReminderForm
                  item={item}
                  initial={draftOf(reminder)}
                  rules={rules}
                  people={people}
                  onSave={(draft) => {
                    onUpdate(reminder.id, draft);
                    setEditing(null);
                  }}
                  onCancel={() => {
                    setEditing(null);
                  }}
                  onRemove={() => {
                    onRemove(reminder.id);
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={reminder.id}>
                <button
                  type="button"
                  aria-label={labels.reminders.edit}
                  onClick={() => {
                    setEditing(reminder.id);
                  }}
                  className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl bg-paper px-3 py-2.5 text-start transition active:scale-[0.99]"
                >
                  <span
                    className={`text-[15px] font-medium ${wasSent(reminder) ? 'text-muted' : 'text-ink'}`}
                  >
                    {describeReminder(draftOf(reminder))}
                  </span>
                  {recipients(reminder.member_ids) !== null && (
                    <span className="text-[13px] text-muted">
                      {recipients(reminder.member_ids)}
                    </span>
                  )}
                  {isWaiting(reminder) && (
                    <span className="rounded-md bg-alert-soft px-1.5 text-xs font-semibold text-alert">
                      {labels.reminders.waiting}
                    </span>
                  )}
                  {wasSent(reminder) && (
                    <span className="text-xs text-muted">{labels.reminders.sent}</span>
                  )}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      {anyWaiting && <p className="text-[13px] text-alert">{labels.reminders.waitingHint}</p>}
      {editing === 'new' ? (
        <ReminderForm
          item={item}
          initial={defaultDraft(item, new Date())}
          rules={rules}
          people={people}
          onSave={(draft) => {
            onAdd(draft);
            setEditing(null);
          }}
          onCancel={() => {
            setEditing(null);
          }}
        />
      ) : (
        <Button
          variant="soft"
          onClick={() => {
            setEditing('new');
          }}
        >
          {labels.reminders.add}
        </Button>
      )}
      <p className="text-[13px] text-muted">{labels.push.reminderHint}</p>
    </div>
  );
}
