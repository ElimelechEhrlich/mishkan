import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import { Chip } from '../ui/Chip';

type RecipientChipsProps = {
  readonly people: readonly ReminderPerson[];
  /** The parents chosen; null for everyone. */
  readonly value: readonly string[] | null;
  readonly onChange: (value: readonly string[] | null) => void;
  readonly disabled?: boolean;
};

/**
 * Whom a reminder goes to: everyone, or some of the parents. Parents without a device
 * that gets notifications are marked, and a warning shows when the choice reaches no one.
 */
export function RecipientChips({
  people,
  value,
  onChange,
  disabled = false,
}: RecipientChipsProps): ReactElement {
  const everyone = value === null;
  const chosen = everyone ? people : people.filter((person) => value.includes(person.id));
  const reachesNoOne = chosen.every((person) => !person.hasPush);

  function toggle(personId: string): void {
    const current = value ?? [];
    const next = current.includes(personId)
      ? current.filter((id) => id !== personId)
      : [...current, personId];
    onChange(next.length === 0 ? null : next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Chip
          label={labels.push.everyone}
          selected={everyone}
          outline
          disabled={disabled}
          onClick={() => {
            onChange(null);
          }}
        />
        {people.map((person) => (
          <Chip
            key={person.id}
            label={person.name}
            note={person.hasPush ? undefined : labels.push.noDevice}
            selected={!everyone && value.includes(person.id)}
            outline
            disabled={disabled}
            onClick={() => {
              toggle(person.id);
            }}
          />
        ))}
      </div>
      {reachesNoOne && <p className="text-[13px] text-alert">{labels.push.reachesNoOne}</p>}
    </div>
  );
}
