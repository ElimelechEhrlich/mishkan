import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { IconButton } from './IconButton';
import { TextField } from './TextField';

type InlineEditProps = {
  readonly value: string;
  readonly onSave: (value: string) => void;
  readonly textClass?: string;
};

/** A name that turns into a field when its pencil is tapped. */
export function InlineEdit({
  value,
  onSave,
  textClass = 'font-medium',
}: InlineEditProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className={`min-w-0 truncate ${textClass}`}>{value}</span>
        <IconButton
          icon="edit"
          label={labels.actions.edit}
          onClick={() => {
            setDraft(value);
          }}
        />
      </div>
    );
  }

  const trimmed = draft.trim();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (trimmed !== '' && trimmed !== value) {
      onSave(trimmed);
    }
    setDraft(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-1">
      <TextField label={labels.actions.edit} value={draft} onChange={setDraft} compact autoFocus />
      <IconButton
        icon="close"
        label={labels.actions.close}
        onClick={() => {
          setDraft(null);
        }}
      />
      <button
        type="submit"
        aria-label={labels.actions.save}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-primary"
      >
        <span className="text-sm font-bold">{labels.actions.save}</span>
      </button>
    </form>
  );
}
