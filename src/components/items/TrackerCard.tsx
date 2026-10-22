import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { todayIso } from '../../lib/itemRules';
import { entryNumber, newestFirst, trackerLine, trackerTotals, withUnit } from '../../lib/trackers';
import type { EntryChanges } from '../../hooks/useTrackerEntries';
import type { Item, ItemUpdate, TrackerEntry, TrackerSummary } from '../../types/domain';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { HebrewDateToggle } from '../ui/HebrewDateToggle';
import { TextField } from '../ui/TextField';
import { TrackerEntryRow } from './TrackerEntryRow';

type TrackerCardProps = {
  readonly item: Item;
  readonly entries: readonly TrackerEntry[];
  readonly onUpdateItem: (changes: ItemUpdate) => void;
  readonly onAdd: (onDate: string, value: string, note: string | null) => void;
  readonly onUpdateEntry: (entryId: string, changes: EntryChanges) => void;
  readonly onRemoveEntry: (entryId: string) => void;
};

const modes = [
  { value: 'sum', label: labels.tracker.modes.sum },
  { value: 'latest', label: labels.tracker.modes.latest },
  { value: 'none', label: labels.tracker.modes.none },
] as const satisfies readonly { value: TrackerSummary; label: string }[];

/**
 * A tracker on its page: its summing up as chosen (the total, the latest, or none) and its
 * unit, its entries newest first, and a line for adding the next one.
 */
export function TrackerCard({
  item,
  entries,
  onUpdateItem,
  onAdd,
  onUpdateEntry,
  onRemoveEntry,
}: TrackerCardProps): ReactElement {
  const [onDate, setOnDate] = useState(todayIso());
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [unit, setUnit] = useState(item.tracker_unit ?? '');
  const line = trackerLine(item.tracker_summary, item.tracker_unit, entries);
  const totals = trackerTotals(entries);
  const previous =
    item.tracker_summary === 'latest' && totals.previous !== null
      ? withUnit(entryNumber(totals.previous) ?? totals.previous, item.tracker_unit)
      : null;

  function handleAdd(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (value.trim() === '' || onDate === '') {
      return;
    }
    onAdd(onDate, value.trim(), note.trim() === '' ? null : note.trim());
    setValue('');
    setNote('');
  }

  function saveUnit(): void {
    const next = unit.trim() === '' ? null : unit.trim();
    if (next !== item.tracker_unit) {
      onUpdateItem({ tracker_unit: next });
    }
  }

  return (
    <>
      <Card title={labels.tracker.summary}>
        <div className="flex flex-col gap-3">
          {line !== null && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-muted">
                {line.label === 'sum' ? labels.tracker.sumLabel : labels.tracker.latestLabel}
              </span>
              <span className="font-display text-2xl font-bold">{line.value}</span>
              {previous !== null && (
                <span className="text-xs text-muted">
                  ({labels.tracker.previous}: {previous})
                </span>
              )}
            </div>
          )}
          <Segmented
            options={modes}
            value={item.tracker_summary}
            onChange={(summary) => {
              onUpdateItem({ tracker_summary: summary });
            }}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveUnit();
            }}
            onBlur={saveUnit}
          >
            <TextField label={labels.tracker.unit} value={unit} onChange={setUnit} compact />
          </form>
        </div>
      </Card>

      <Card
        title={`${labels.tracker.entries}${entries.length > 0 ? ` · ${String(entries.length)}` : ''}`}
      >
        <div className="flex flex-col gap-3">
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <TextField
              label={labels.tracker.date}
              type="date"
              value={onDate}
              onChange={setOnDate}
            />
            <HebrewDateToggle value={onDate} onPick={setOnDate} />
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <TextField label={labels.tracker.value} value={value} onChange={setValue} compact />
                <TextField label={labels.tracker.note} value={note} onChange={setNote} compact />
              </div>
              <button
                type="submit"
                aria-label={labels.tracker.add}
                disabled={value.trim() === ''}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition active:scale-95 disabled:opacity-40"
              >
                <Icon name="plus" className="size-5" />
              </button>
            </div>
          </form>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">{labels.tracker.none}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line border-t border-line">
              {newestFirst(entries).map((entry) => (
                <TrackerEntryRow
                  key={entry.id}
                  entry={entry}
                  unit={item.tracker_unit}
                  onUpdate={(changes) => {
                    onUpdateEntry(entry.id, changes);
                  }}
                  onRemove={() => {
                    onRemoveEntry(entry.id);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
