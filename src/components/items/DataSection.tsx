import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { ItemData } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { TextField } from '../ui/TextField';
import { DataRow } from './DataRow';

type DataSectionProps = {
  readonly rows: readonly ItemData[];
  readonly onAdd: (label: string, value: string) => void;
  readonly onUpdate: (dataId: string, changes: { label?: string; value?: string }) => void;
  readonly onRemove: (dataId: string) => void;
};

/** The named values of an item ("נתונים"), and a line for adding another. */
export function DataSection({ rows, onAdd, onUpdate, onRemove }: DataSectionProps): ReactElement {
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const name = label.trim();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (name === '') {
      return;
    }
    onAdd(name, value.trim());
    setLabel('');
    setValue('');
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && <p className="text-sm text-muted">{labels.data.none}</p>}
      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((row) => (
            <DataRow
              key={row.id}
              row={row}
              onUpdate={(changes) => {
                onUpdate(row.id, changes);
              }}
              onRemove={() => {
                onRemove(row.id);
              }}
            />
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <TextField label={labels.data.name} value={label} onChange={setLabel} compact />
          <TextField label={labels.data.value} value={value} onChange={setValue} compact />
        </div>
        <button
          type="submit"
          aria-label={labels.data.add}
          disabled={name === ''}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition active:scale-95 disabled:opacity-40"
        >
          <Icon name="plus" className="size-5" />
        </button>
      </form>
    </div>
  );
}
