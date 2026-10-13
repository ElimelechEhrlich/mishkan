import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { ItemData } from '../../types/domain';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { CopyButton } from '../ui/CopyButton';
import { IconButton } from '../ui/IconButton';
import { MoveButtons } from '../ui/MoveButtons';
import { TextField } from '../ui/TextField';

type DataRowProps = {
  readonly row: ItemData;
  readonly onUpdate: (changes: { label?: string | null; value?: string }) => void;
  readonly onRemove: () => void;
  /** Moves the row one place up or down; undefined where it cannot go further. */
  readonly onMoveUp: (() => void) | undefined;
  readonly onMoveDown: (() => void) | undefined;
};

/**
 * One row of a note or an issue: a line of text, or a named value with a button to copy
 * the value. Either can be changed or removed.
 */
export function DataRow({
  row,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: DataRowProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label ?? '');
  const [value, setValue] = useState(row.value);
  const isLine = row.label === null;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const name = label.trim();
    const text = value.trim();
    // A line needs its text, a value its name.
    if (isLine ? text === '' : name === '') {
      return;
    }
    if (isLine ? text !== row.value : name !== row.label || text !== row.value) {
      onUpdate(isLine ? { value: text } : { label: name, value: text });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-2.5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {!isLine && (
            <TextField label={labels.data.name} value={label} onChange={setLabel} compact />
          )}
          <TextField
            label={isLine ? labels.data.lineText : labels.data.value}
            value={value}
            onChange={setValue}
            compact
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <ConfirmIconButton
                label={labels.data.remove}
                confirmLabel={labels.actions.confirmDelete}
                onConfirm={onRemove}
              />
              {/* Where order matters, such as in a recipe, a row can be moved. */}
              {(onMoveUp !== undefined || onMoveDown !== undefined) && (
                <MoveButtons onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
              )}
            </div>
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
      {isLine ? (
        <span className="min-w-0 flex-1 text-[15px] break-words">{row.value}</span>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted">{row.label}</span>
          <span className="text-[15px] font-semibold break-words">{row.value}</span>
        </div>
      )}
      {!isLine && row.value !== '' && <CopyButton text={row.value} />}
      <IconButton
        icon="edit"
        label={labels.data.edit}
        onClick={() => {
          setLabel(row.label ?? '');
          setValue(row.value);
          setEditing(true);
        }}
      />
    </li>
  );
}
