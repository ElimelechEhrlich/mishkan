import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from './Icon';
import { TextField } from './TextField';

type AddRowProps = {
  /** Shown as the placeholder of the field. */
  readonly label: string;
  readonly onAdd: (text: string) => void;
};

/** One line for adding a named thing: a step, a condition, a child, a domain. */
export function AddRow({ label, onAdd }: AddRowProps): ReactElement {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (trimmed === '') {
      return;
    }
    onAdd(trimmed);
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <TextField label={label} value={text} onChange={setText} compact />
      <button
        type="submit"
        aria-label={labels.actions.add}
        disabled={trimmed === ''}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition active:scale-95 disabled:bg-line disabled:text-faint"
      >
        <Icon name="plus" />
      </button>
    </form>
  );
}
