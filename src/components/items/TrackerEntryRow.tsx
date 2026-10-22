import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { formatDueDate } from '../../lib/itemRules';
import { entryNumber, withUnit } from '../../lib/trackers';
import type { EntryChanges } from '../../hooks/useTrackerEntries';
import type { TrackerEntry } from '../../types/domain';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { IconButton } from '../ui/IconButton';
import { HebrewDateToggle } from '../ui/HebrewDateToggle';
import { TextField } from '../ui/TextField';

type TrackerEntryRowProps = {
  readonly entry: TrackerEntry;
  readonly unit: string | null;
  readonly onUpdate: (changes: EntryChanges) => void;
  readonly onRemove: () => void;
};

/** One entry of a tracker: its date, its value and its note, which can be changed. */
export function TrackerEntryRow({
  entry,
  unit,
  onUpdate,
  onRemove,
}: TrackerEntryRowProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [onDate, setOnDate] = useState(entry.on_date);
  const [value, setValue] = useState(entry.value);
  const [note, setNote] = useState(entry.note ?? '');

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (value.trim() === '' || onDate === '') {
      return;
    }
    onUpdate({
      on_date: onDate,
      value: value.trim(),
      note: note.trim() === '' ? null : note.trim(),
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-2.5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <TextField label={labels.tracker.date} type="date" value={onDate} onChange={setOnDate} />
          <HebrewDateToggle value={onDate} onPick={setOnDate} />
          <TextField label={labels.tracker.value} value={value} onChange={setValue} compact />
          <TextField label={labels.tracker.note} value={note} onChange={setNote} compact />
          <div className="flex items-center justify-between">
            <ConfirmIconButton
              label={labels.tracker.remove}
              confirmLabel={labels.actions.confirmDelete}
              onConfirm={onRemove}
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white active:opacity-80"
            >
              {labels.tracker.save}
            </button>
          </div>
        </form>
      </li>
    );
  }

  const number = entryNumber(entry.value);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-16 shrink-0 text-[13px] text-muted tabular-nums">
        {formatDueDate(entry.on_date)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold break-words">
          {number === null ? entry.value : withUnit(number, unit)}
        </span>
        {entry.note !== null && <span className="text-xs text-muted">{entry.note}</span>}
      </div>
      <IconButton
        icon="edit"
        label={labels.tracker.edit}
        onClick={() => {
          setOnDate(entry.on_date);
          setValue(entry.value);
          setNote(entry.note ?? '');
          setEditing(true);
        }}
      />
    </li>
  );
}
