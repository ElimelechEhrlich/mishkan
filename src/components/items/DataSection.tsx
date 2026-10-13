import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { ItemData } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';
import { DataRow } from './DataRow';

type RowKind = 'line' | 'pair';

type DataSectionProps = {
  readonly rows: readonly ItemData[];
  /** A line of text has no name (null). */
  readonly onAdd: (label: string | null, value: string) => void;
  readonly onUpdate: (dataId: string, changes: { label?: string | null; value?: string }) => void;
  readonly onRemove: (dataId: string) => void;
  readonly onMove: (row: ItemData, step: -1 | 1) => void;
};

const rowKinds = [
  { value: 'line', label: labels.data.line },
  { value: 'pair', label: labels.data.pair },
] as const;

/**
 * The rows of a note or an issue, in the order added: lines of text and named values, and
 * a way to add either.
 */
export function DataSection({
  rows,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: DataSectionProps): ReactElement {
  const [kind, setKind] = useState<RowKind>('line');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const name = label.trim();
  const text = value.trim();
  const ready = kind === 'line' ? text !== '' : name !== '';

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!ready) {
      return;
    }
    onAdd(kind === 'line' ? null : name, text);
    setLabel('');
    setValue('');
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && <p className="text-sm text-muted">{labels.data.none}</p>}
      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((row, index) => (
            <DataRow
              key={row.id}
              row={row}
              onUpdate={(changes) => {
                onUpdate(row.id, changes);
              }}
              onRemove={() => {
                onRemove(row.id);
              }}
              onMoveUp={
                index === 0
                  ? undefined
                  : (): void => {
                      onMove(row, -1);
                    }
              }
              onMoveDown={
                index === rows.length - 1
                  ? undefined
                  : (): void => {
                      onMove(row, 1);
                    }
              }
            />
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Segmented options={rowKinds} value={kind} onChange={setKind} />
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {kind === 'pair' && (
              <TextField label={labels.data.name} value={label} onChange={setLabel} compact />
            )}
            <TextField
              label={kind === 'line' ? labels.data.lineText : labels.data.value}
              value={value}
              onChange={setValue}
              compact
            />
          </div>
          <button
            type="submit"
            aria-label={labels.data.add}
            disabled={!ready}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition active:scale-95 disabled:opacity-40"
          >
            <Icon name="plus" className="size-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
