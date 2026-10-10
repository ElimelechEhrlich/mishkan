import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { Item, ItemUpdate } from '../../types/domain';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import { TextField } from '../ui/TextField';

type ItemTextFormProps = {
  readonly item: Item;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
};

/** Title and notes. Saved together, only when something changed. */
export function ItemTextForm({ item, onUpdate }: ItemTextFormProps): ReactElement {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');

  const trimmedTitle = title.trim();
  const trimmedNotes = notes.trim();
  const changed = trimmedTitle !== item.title || trimmedNotes !== (item.notes ?? '');

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    onUpdate(item.id, {
      title: trimmedTitle,
      notes: trimmedNotes === '' ? null : trimmedNotes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <TextField label={labels.fields.title} value={title} onChange={setTitle} />
      <TextArea label={labels.fields.notes} value={notes} onChange={setNotes} />
      {changed && (
        <Button type="submit" disabled={trimmedTitle === ''}>
          {labels.actions.save}
        </Button>
      )}
    </form>
  );
}
