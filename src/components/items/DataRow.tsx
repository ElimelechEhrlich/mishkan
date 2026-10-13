import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { ItemData } from '../../types/domain';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { CopyButton } from '../ui/CopyButton';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';

type DataRowProps = {
  readonly row: ItemData;
  readonly onUpdate: (changes: { label?: string; value?: string }) => void;
  readonly onRemove: () => void;
};

/** One named value: its name and value, a button to copy the value, and ways to change it. */
export function DataRow({ row, onUpdate, onRemove }: DataRowProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const [value, setValue] = useState(row.value);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const name = label.trim();
    if (name === '') {
      return;
    }
    if (name !== row.label || value !== row.value) {
      onUpdate({ label: name, value });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-2.5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <TextField label={labels.data.name} value={label} onChange={setLabel} compact />
          <TextField label={labels.data.value} value={value} onChange={setValue} compact />
          <div className="flex items-center justify-between">
            <ConfirmIconButton
              label={labels.data.remove}
              confirmLabel={labels.actions.confirmDelete}
              onConfirm={onRemove}
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white active:opacity-80"
            >
              {labels.data.save}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted">{row.label}</span>
        <span className="text-[15px] font-semibold break-words">{row.value}</span>
      </div>
      {row.value !== '' && <CopyButton text={row.value} />}
      <IconButton
        icon="edit"
        label={labels.data.edit}
        onClick={() => {
          setLabel(row.label);
          setValue(row.value);
          setEditing(true);
        }}
      />
    </li>
  );
}
