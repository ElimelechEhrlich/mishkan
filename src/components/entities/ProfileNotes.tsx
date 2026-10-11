import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';

type ProfileNotesProps = {
  readonly notes: string | null;
  readonly onSave: (notes: string | null) => void;
};

/** Free notes on a profile, saved on request. */
export function ProfileNotes({ notes, onSave }: ProfileNotesProps): ReactElement {
  const [draft, setDraft] = useState(notes ?? '');
  const trimmed = draft.trim();
  const changed = trimmed !== (notes ?? '');

  return (
    <div className="flex flex-col gap-2 py-3">
      <TextArea label={labels.profile.notes} value={draft} onChange={setDraft} />
      {changed && (
        <div className="flex">
          <Button
            onClick={() => {
              onSave(trimmed === '' ? null : trimmed);
            }}
          >
            {labels.actions.save}
          </Button>
        </div>
      )}
    </div>
  );
}
